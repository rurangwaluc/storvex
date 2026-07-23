const assert = require("node:assert/strict");
const test = require("node:test");

const sharp = require("sharp");

const {
  inspectSourceImage,
  prepareProviderInput,
  standardizeRemovedBackground,
} = require(
  "../src/modules/inventory/inventory.productImageStandard.service",
);

async function createSource({
  width = 1200,
  height = 900,
} = {}) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#345678",
    },
  })
    .jpeg({
      quality: 90,
    })
    .toBuffer();
}

async function createTransparentProduct() {
  const product = await sharp({
    create: {
      width: 800,
      height: 1000,
      channels: 4,
      background: {
        r: 15,
        g: 80,
        b: 180,
        alpha: 1,
      },
    },
  })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: 1200,
      height: 1200,
      channels: 4,
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0,
      },
    },
  })
    .composite([
      {
        input: product,
        left: 200,
        top: 100,
      },
    ])
    .png()
    .toBuffer();
}

test(
  "inspects and prepares a valid product image",
  async () => {
    const source = await createSource();

    const metadata =
      await inspectSourceImage(source);

    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 900);

    const prepared =
      await prepareProviderInput(source);

    assert.equal(
      prepared.contentType,
      "image/png",
    );

    assert.ok(prepared.body.length > 0);
  },
);

test(
  "rejects product images below the minimum dimensions",
  async () => {
    const source = await createSource({
      width: 500,
      height: 500,
    });

    await assert.rejects(
      () => inspectSourceImage(source),
      (error) =>
        error.code ===
        "PRODUCT_IMAGE_TOO_SMALL",
    );
  },
);

test(
  "creates standardized master and thumbnail WebP files",
  async () => {
    const foreground =
      await createTransparentProduct();

    const result =
      await standardizeRemovedBackground(
        foreground,
      );

    const masterMetadata =
      await sharp(result.master.body).metadata();

    const thumbnailMetadata =
      await sharp(
        result.thumbnail.body,
      ).metadata();

    assert.equal(masterMetadata.format, "webp");
    assert.equal(masterMetadata.width, 1600);
    assert.equal(masterMetadata.height, 1600);

    assert.equal(
      thumbnailMetadata.format,
      "webp",
    );

    assert.equal(
      thumbnailMetadata.width,
      480,
    );

    assert.equal(
      thumbnailMetadata.height,
      480,
    );

    assert.ok(result.master.sizeBytes > 0);
    assert.ok(result.thumbnail.sizeBytes > 0);

    assert.equal(
      result.master.backgroundColor,
      "#f5f5f3",
    );
  },
);

test(
  "standardizes a real product photo without background removal",
  async () => {
    const source = await sharp({
      create: {
        width: 1400,
        height: 900,
        channels: 3,
        background: "#7a6248",
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 700,
              height: 500,
              channels: 3,
              background: "#1f4f91",
            },
          })
            .png()
            .toBuffer(),
          left: 350,
          top: 200,
        },
      ])
      .jpeg({
        quality: 90,
      })
      .toBuffer();

    const {
      standardizeSourceImage,
    } = require(
      "../src/modules/inventory/inventory.productImageStandard.service",
    );

    const result =
      await standardizeSourceImage(source);

    assert.equal(
      result.master.width,
      1600,
    );

    assert.equal(
      result.master.height,
      1600,
    );

    assert.equal(
      result.master.mimeType,
      "image/webp",
    );

    assert.equal(
      result.thumbnail.width,
      480,
    );

    assert.equal(
      result.thumbnail.height,
      480,
    );

    const masterMetadata =
      await sharp(
        result.master.body,
      ).metadata();

    const thumbnailMetadata =
      await sharp(
        result.thumbnail.body,
      ).metadata();

    assert.equal(
      masterMetadata.width,
      1600,
    );

    assert.equal(
      masterMetadata.height,
      1600,
    );

    assert.equal(
      masterMetadata.format,
      "webp",
    );

    assert.equal(
      thumbnailMetadata.width,
      480,
    );

    assert.equal(
      thumbnailMetadata.height,
      480,
    );

    assert.equal(
      thumbnailMetadata.format,
      "webp",
    );
  },
);
