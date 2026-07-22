const {
  STORAGE_VISIBILITY,
  signGetUrl,
} = require(
  "../../lib/storage/objectStorage",
);

const OWNER_IMAGE_URL_TTL_SECONDS = 300;

function cleanString(value) {
  const result =
    String(value || "").trim();

  return result || null;
}

function imageType(image) {
  return (
    cleanString(
      image?.imageType,
    )?.toUpperCase() ||
    "ORIGINAL"
  );
}

function withoutStorageKeys(image) {
  if (
    !image ||
    typeof image !== "object"
  ) {
    return image;
  }

  const {
    key,
    thumbnailKey,
    ...safeImage
  } = image;

  return safeImage;
}

async function serializeOwnerProductImage(
  image,
) {
  if (
    !image ||
    typeof image !== "object"
  ) {
    return image;
  }

  const safeImage =
    withoutStorageKeys(image);

  if (
    imageType(image) !== "ORIGINAL"
  ) {
    return safeImage;
  }

  const objectKey =
    cleanString(image.key);

  if (!objectKey) {
    return {
      ...safeImage,
      url: null,
      thumbnailUrl: null,
    };
  }

  const signedUrl =
    await signGetUrl(
      objectKey,
      OWNER_IMAGE_URL_TTL_SECONDS,
      {
        visibility:
          STORAGE_VISIBILITY.PRIVATE,
      },
    );

  return {
    ...safeImage,
    url: signedUrl,
    thumbnailUrl: null,
    signedUrlExpiresInSeconds:
      OWNER_IMAGE_URL_TTL_SECONDS,
  };
}

async function serializeOwnerProductImages(
  images,
) {
  return Promise.all(
    (
      Array.isArray(images)
        ? images
        : []
    ).map(
      serializeOwnerProductImage,
    ),
  );
}

async function serializeOwnerProduct(
  product,
) {
  if (
    !product ||
    typeof product !== "object"
  ) {
    return product;
  }

  if (
    !Array.isArray(product.images)
  ) {
    return product;
  }

  return {
    ...product,
    images:
      await serializeOwnerProductImages(
        product.images,
      ),
  };
}

module.exports = {
  OWNER_IMAGE_URL_TTL_SECONDS,
  serializeOwnerProduct,
  serializeOwnerProductImage,
  serializeOwnerProductImages,
};
