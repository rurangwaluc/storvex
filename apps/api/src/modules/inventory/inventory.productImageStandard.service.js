const sharp = require("sharp");

const MASTER_SIZE = 1600;
const THUMBNAIL_SIZE = 480;
const PRODUCT_MAX_SIZE = 1280;
const PRODUCT_THUMBNAIL_MAX_SIZE = 384;

const MASTER_QUALITY = 84;
const THUMBNAIL_QUALITY = 80;

const MIN_SOURCE_WIDTH = 600;
const MIN_SOURCE_HEIGHT = 600;
const MAX_SOURCE_PIXELS = 40_000_000;

const DEFAULT_BACKGROUND = "#f5f5f3";

function cleanString(value) {
  return String(value || "").trim();
}

function createImageError(
  message,
  {
    status = 422,
    code = "PRODUCT_IMAGE_PROCESSING_FAILED",
  } = {},
) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function configuredBackgroundColor() {
  const value = cleanString(
    process.env.PRODUCT_IMAGE_BACKGROUND_COLOR,
  );

  return /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : DEFAULT_BACKGROUND;
}

function sourcePipeline(body) {
  return sharp(body, {
    failOn: "error",
    limitInputPixels: MAX_SOURCE_PIXELS,
    sequentialRead: true,
  }).rotate();
}

async function inspectSourceImage(body) {
  if (!Buffer.isBuffer(body) || !body.length) {
    throw createImageError(
      "The product photo is empty.",
      {
        code: "PRODUCT_IMAGE_EMPTY",
      },
    );
  }

  let metadata;

  try {
    metadata = await sourcePipeline(body).metadata();
  } catch {
    throw createImageError(
      "This product photo could not be read. Upload a valid JPG, PNG, or WebP image.",
      {
        code: "PRODUCT_IMAGE_INVALID",
      },
    );
  }

  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);

  if (!width || !height) {
    throw createImageError(
      "The product photo dimensions could not be detected.",
      {
        code: "PRODUCT_IMAGE_DIMENSIONS_MISSING",
      },
    );
  }

  if (
    width < MIN_SOURCE_WIDTH ||
    height < MIN_SOURCE_HEIGHT
  ) {
    throw createImageError(
      `The product photo is too small. Upload an image at least ${MIN_SOURCE_WIDTH} × ${MIN_SOURCE_HEIGHT} pixels.`,
      {
        code: "PRODUCT_IMAGE_TOO_SMALL",
      },
    );
  }

  return {
    width,
    height,
    format: cleanString(metadata.format),
    hasAlpha: Boolean(metadata.hasAlpha),
    orientation: metadata.orientation || null,
  };
}

async function prepareProviderInput(body) {
  await inspectSourceImage(body);

  const output = await sourcePipeline(body)
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
      fastShrinkOnLoad: true,
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toBuffer();

  return {
    body: output,
    contentType: "image/png",
    sizeBytes: output.length,
  };
}

async function createCanvasImage({
  foreground,
  canvasSize,
  productMaxSize,
  quality,
}) {
  let preparedForeground;

  try {
    preparedForeground = await sharp(foreground, {
      failOn: "error",
      limitInputPixels: MAX_SOURCE_PIXELS,
      sequentialRead: true,
    })
      .rotate()
      .trim({
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0,
        },
        threshold: 8,
      })
      .resize({
        width: productMaxSize,
        height: productMaxSize,
        fit: "inside",
        withoutEnlargement: false,
        fastShrinkOnLoad: true,
      })
      .ensureAlpha()
      .png()
      .toBuffer();
  } catch {
    throw createImageError(
      "Storvex could not isolate the product clearly. Try another photo with the full product visible.",
      {
        code: "PRODUCT_FOREGROUND_INVALID",
      },
    );
  }

  const foregroundMetadata =
    await sharp(preparedForeground).metadata();

  const foregroundWidth =
    Number(foregroundMetadata.width || 0);

  const foregroundHeight =
    Number(foregroundMetadata.height || 0);

  if (!foregroundWidth || !foregroundHeight) {
    throw createImageError(
      "The prepared product has invalid dimensions.",
      {
        code: "PRODUCT_FOREGROUND_DIMENSIONS_INVALID",
      },
    );
  }

  const left = Math.max(
    0,
    Math.floor(
      (canvasSize - foregroundWidth) / 2,
    ),
  );

  const top = Math.max(
    0,
    Math.floor(
      (canvasSize - foregroundHeight) / 2,
    ),
  );

  const backgroundColor =
    configuredBackgroundColor();

  const buffer = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 3,
      background: backgroundColor,
    },
  })
    .composite([
      {
        input: preparedForeground,
        left,
        top,
      },
    ])
    .webp({
      quality,
      effort: 5,
      smartSubsample: true,
    })
    .toBuffer();

  return {
    body: buffer,
    width: canvasSize,
    height: canvasSize,
    sizeBytes: buffer.length,
    mimeType: "image/webp",
    backgroundColor,
  };
}

async function createRealPhotoCanvas({
  source,
  canvasSize,
  quality,
}) {
  /*
   * Keep the complete product photo visible.
   *
   * A square cannot contain a rectangular photo without
   * either cropping the photo or leaving unused space.
   * Storvex fills that space with a softly blurred version
   * of the same uploaded photo, then places the complete
   * original photo above it.
   *
   * Nothing unrelated is generated and the product is
   * never stretched or cropped.
   */
  const background = await sourcePipeline(source)
    .resize({
      width: canvasSize,
      height: canvasSize,
      fit: "cover",
      position: "centre",
      withoutEnlargement: false,
    })
    .blur(Math.max(12, Math.round(canvasSize * 0.018)))
    .modulate({
      brightness: 0.82,
      saturation: 0.82,
    })
    .toBuffer();

  const foreground = await sourcePipeline(source)
    .ensureAlpha()
    .resize({
      width: canvasSize,
      height: canvasSize,
      fit: "contain",
      position: "centre",
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0,
      },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const buffer = await sharp(background)
    .composite([
      {
        input: foreground,
        left: 0,
        top: 0,
      },
    ])
    .webp({
      quality,
      effort: 5,
      smartSubsample: true,
    })
    .toBuffer();

  return {
    body: buffer,
    width: canvasSize,
    height: canvasSize,
    sizeBytes: buffer.length,
    mimeType: "image/webp",
    backgroundColor: null,
  };
}

async function standardizeSourceImage(source) {
  if (
    !Buffer.isBuffer(source) ||
    !source.length
  ) {
    throw createImageError(
      "The product photo is empty.",
      {
        code: "PRODUCT_IMAGE_EMPTY",
      },
    );
  }

  const [master, thumbnail] =
    await Promise.all([
      createRealPhotoCanvas({
        source,
        canvasSize: MASTER_SIZE,
        quality: MASTER_QUALITY,
      }),
      createRealPhotoCanvas({
        source,
        canvasSize: THUMBNAIL_SIZE,
        quality: THUMBNAIL_QUALITY,
      }),
    ]);

  return {
    master,
    thumbnail,
  };
}

async function standardizeRemovedBackground(
  foreground,
) {
  if (
    !Buffer.isBuffer(foreground) ||
    !foreground.length
  ) {
    throw createImageError(
      "The background-removal service returned an empty image.",
      {
        status: 502,
        code: "BACKGROUND_REMOVAL_EMPTY_RESULT",
      },
    );
  }

  const [master, thumbnail] =
    await Promise.all([
      createCanvasImage({
        foreground,
        canvasSize: MASTER_SIZE,
        productMaxSize: PRODUCT_MAX_SIZE,
        quality: MASTER_QUALITY,
      }),
      createCanvasImage({
        foreground,
        canvasSize: THUMBNAIL_SIZE,
        productMaxSize:
          PRODUCT_THUMBNAIL_MAX_SIZE,
        quality: THUMBNAIL_QUALITY,
      }),
    ]);

  return {
    master,
    thumbnail,
  };
}

module.exports = {
  DEFAULT_BACKGROUND,
  MASTER_QUALITY,
  MASTER_SIZE,
  MIN_SOURCE_HEIGHT,
  MIN_SOURCE_WIDTH,
  THUMBNAIL_QUALITY,
  THUMBNAIL_SIZE,
  configuredBackgroundColor,
  inspectSourceImage,
  prepareProviderInput,
  standardizeRemovedBackground,
  standardizeSourceImage,
};
