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
    reviewKey,
    reviewThumbnailKey,
    ...safeImage
  } = image;

  return safeImage;
}

async function signPrivateImage(
  objectKey,
) {
  const key = cleanString(objectKey);

  if (!key) {
    return null;
  }

  return signGetUrl(
    key,
    OWNER_IMAGE_URL_TTL_SECONDS,
    {
      visibility:
        STORAGE_VISIBILITY.PRIVATE,
    },
  );
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
    imageType(image) === "CLEANED"
  ) {
    /*
     * Approved prepared photos already point to their
     * public Marketplace copies.
     */
    if (image.isMarketplaceApproved) {
      return {
        ...safeImage,
        reviewFileAvailable:
          Boolean(
            cleanString(image.reviewKey),
          ),
      };
    }

    /*
     * Unapproved prepared photos remain private.
     * Only temporary signed URLs are returned to
     * the authenticated owner.
     */
    const reviewKey =
      cleanString(image.reviewKey);

    const reviewThumbnailKey =
      cleanString(
        image.reviewThumbnailKey,
      );

    if (!reviewKey) {
      return {
        ...safeImage,
        url: null,
        thumbnailUrl: null,
        reviewFileAvailable: false,
      };
    }

    const [
      signedUrl,
      signedThumbnailUrl,
    ] = await Promise.all([
      signPrivateImage(reviewKey),
      reviewThumbnailKey
        ? signPrivateImage(
            reviewThumbnailKey,
          )
        : Promise.resolve(null),
    ]);

    return {
      ...safeImage,
      url: signedUrl,
      thumbnailUrl:
        signedThumbnailUrl ||
        signedUrl,
      reviewFileAvailable: true,
      signedUrlExpiresInSeconds:
        OWNER_IMAGE_URL_TTL_SECONDS,
    };
  }

  /*
   * Original owner uploads are always private.
   */
  const objectKey =
    cleanString(image.key);

  if (!objectKey) {
    return {
      ...safeImage,
      url: null,
      thumbnailUrl: null,
      originalFileAvailable: false,
    };
  }

  const signedUrl =
    await signPrivateImage(
      objectKey,
    );

  return {
    ...safeImage,
    url: signedUrl,
    thumbnailUrl: null,
    originalFileAvailable: true,
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
