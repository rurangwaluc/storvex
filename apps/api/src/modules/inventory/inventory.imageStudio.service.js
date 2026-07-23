const crypto = require("crypto");
const sharp = require("sharp");

const prisma = require("../../config/database");
const {
  STORAGE_VISIBILITY,
  buildPrivateObjectLocation,
  deleteObject,
  downloadObject,
  isConfigured: isObjectStorageConfigured,
  uploadObject,
} = require("../../lib/storage/objectStorage");
const {
  serializeOwnerProductImage,
  serializeOwnerProductImages,
} = require("./inventory.productImageAccess.service");
const {
  standardizeSourceImage,
} = require("./inventory.productImageStandard.service");

const MAX_MARKETPLACE_IMAGES = 8;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function cleanString(value) {
  const result = String(value || "").trim();
  return result || null;
}

function createServiceError(message, {
  status = 400,
  code = "IMAGE_STUDIO_ERROR",
} = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function imageStudioEnabled() {
  return String(process.env.IMAGE_STUDIO_ENABLED || "")
    .trim()
    .toLowerCase() === "true";
}

function imageStudioProvider() {
  const configured =
    cleanString(
      process.env.IMAGE_STUDIO_PROVIDER,
    )
      ?.replace(/^["']|["']$/g, "")
      .trim()
      .toLowerCase() ||
    "standard";

  /*
   * These names all refer to Storvex's free local
   * Sharp preparation workflow. Keeping the aliases
   * prevents harmless environment naming differences
   * from disabling product-photo preparation.
   */
  if (
    [
      "standard",
      "sharp",
      "local",
      "free",
    ].includes(configured)
  ) {
    return "standard";
  }

  return configured;
}

function requireImageStudioEnabled() {
  if (!imageStudioEnabled()) {
    throw createServiceError(
      "Image Studio is not enabled",
      {
        status: 503,
        code: "IMAGE_STUDIO_DISABLED",
      },
    );
  }
}

function requireObjectStorage() {
  if (
    !isObjectStorageConfigured(
      STORAGE_VISIBILITY.PRIVATE,
    )
  ) {
    throw createServiceError(
      "Private object storage is not configured",
      {
        status: 503,
        code:
          "PRIVATE_OBJECT_STORAGE_NOT_CONFIGURED",
      },
    );
  }

  if (
    !isObjectStorageConfigured(
      STORAGE_VISIBILITY.PUBLIC,
    )
  ) {
    throw createServiceError(
      "Public product image storage is not configured",
      {
        status: 503,
        code:
          "PUBLIC_OBJECT_STORAGE_NOT_CONFIGURED",
      },
    );
  }
}

function requirePublicObjectStorage() {
  if (
    !isObjectStorageConfigured(
      STORAGE_VISIBILITY.PUBLIC,
    )
  ) {
    throw createServiceError(
      "Public product image storage is not configured",
      {
        status: 503,
        code:
          "PUBLIC_OBJECT_STORAGE_NOT_CONFIGURED",
      },
    );
  }
}

function buildStudioObjectKeys({
  tenantId,
  productId,
  runId,
}) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0");

  const base = [
    "product-images",
    tenantId,
    productId,
    "studio",
    String(year),
    month,
    runId,
  ].join("/");

  return {
    masterKey: `${base}-1600.webp`,
    thumbnailKey: `${base}-480.webp`,
  };
}

function validateDownloadedImage({
  body,
  contentType,
}) {
  const normalizedContentType = String(
    contentType || "",
  )
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (!ALLOWED_CONTENT_TYPES.has(normalizedContentType)) {
    throw createServiceError(
      "The source image format is not supported",
      {
        status: 422,
        code: "IMAGE_SOURCE_FORMAT_UNSUPPORTED",
      },
    );
  }

  const imageBody = Buffer.isBuffer(body)
    ? body
    : Buffer.from(body || []);

  if (!imageBody.length) {
    throw createServiceError(
      "The source image is empty",
      {
        status: 422,
        code: "IMAGE_SOURCE_EMPTY",
      },
    );
  }

  if (imageBody.length > MAX_SOURCE_BYTES) {
    throw createServiceError(
      "The source image is too large to process",
      {
        status: 413,
        code: "IMAGE_SOURCE_TOO_LARGE",
      },
    );
  }

  return {
    body: imageBody,
    contentType: normalizedContentType,
  };
}

async function downloadSourceImage(sourceImage) {
  const objectKey = cleanString(sourceImage?.key);

  if (objectKey) {
    try {
      const storedObject = await downloadObject(
        objectKey,
      );

      return validateDownloadedImage({
        body: storedObject.body,
        contentType: storedObject.contentType,
      });
    } catch (error) {
      console.error(
        "Image Studio direct object download failed:",
        error?.message || error,
      );

      throw createServiceError(
        "Could not read the source image from object storage",
        {
          status: Number(error?.status) || 502,
          code: "IMAGE_SOURCE_STORAGE_DOWNLOAD_FAILED",
        },
      );
    }
  }

  const sourceUrl = cleanString(sourceImage?.url);

  if (!sourceUrl) {
    throw createServiceError(
      "Source image location is missing",
      {
        status: 422,
        code: "IMAGE_SOURCE_LOCATION_MISSING",
      },
    );
  }

  let response;

  try {
    response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw createServiceError(
      "Could not download the source image",
      {
        status: 502,
        code: "IMAGE_SOURCE_DOWNLOAD_FAILED",
      },
    );
  }

  if (!response.ok) {
    throw createServiceError(
      `Could not download the source image: HTTP ${response.status}`,
      {
        status: 502,
        code: "IMAGE_SOURCE_DOWNLOAD_FAILED",
      },
    );
  }

  return validateDownloadedImage({
    body: Buffer.from(
      await response.arrayBuffer(),
    ),
    contentType:
      response.headers.get("content-type"),
  });
}

async function processWithProvider(source) {
  const provider = imageStudioProvider();

  if (provider !== "standard") {
    throw createServiceError(
      "The configured Image Studio provider is not supported",
      {
        status: 503,
        code: "IMAGE_STUDIO_PROVIDER_UNSUPPORTED",
      },
    );
  }

  const standardized =
    await standardizeSourceImage(
      source.body,
    );

  return {
    master: standardized.master,
    thumbnail: standardized.thumbnail,
    provider: "sharp",
  };
}

async function createMarketplaceBrandedImage({
  imageBody,
  logoBody,
}) {
  const source = Buffer.isBuffer(imageBody)
    ? imageBody
    : Buffer.from(imageBody || []);

  const logo = Buffer.isBuffer(logoBody)
    ? logoBody
    : Buffer.from(logoBody || []);

  if (!source.length) {
    throw createServiceError(
      "The prepared Marketplace photo is empty",
      {
        status: 422,
        code:
          "MARKETPLACE_IMAGE_EMPTY",
      },
    );
  }

  if (!logo.length) {
    return source;
  }

  const sourceMetadata =
    await sharp(source).metadata();

  const width =
    Number(sourceMetadata.width || 0);

  const height =
    Number(sourceMetadata.height || 0);

  if (!width || !height) {
    throw createServiceError(
      "The prepared Marketplace photo dimensions could not be read",
      {
        status: 422,
        code:
          "MARKETPLACE_IMAGE_DIMENSIONS_INVALID",
      },
    );
  }

  const maximumLogoWidth =
    Math.max(
      1,
      Math.round(width * 0.14),
    );

  const maximumLogoHeight =
    Math.max(
      1,
      Math.round(height * 0.10),
    );

  const edgeSpacing =
    Math.max(
      1,
      Math.round(
        Math.min(width, height) * 0.04,
      ),
    );

  const preparedLogo =
    await sharp(logo, {
      failOn: "error",
    })
      .ensureAlpha()
      .trim({
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0,
        },
        threshold: 10,
      })
      .resize({
        width: maximumLogoWidth,
        height: maximumLogoHeight,
        fit: "inside",
        position: "centre",
        withoutEnlargement: false,
      })
      .png()
      .toBuffer();

  const logoMetadata =
    await sharp(
      preparedLogo,
    ).metadata();

  const logoWidth =
    Number(logoMetadata.width || 0);

  const logoHeight =
    Number(logoMetadata.height || 0);

  if (!logoWidth || !logoHeight) {
    throw createServiceError(
      "The business logo could not be prepared",
      {
        status: 422,
        code:
          "MARKETPLACE_LOGO_INVALID",
      },
    );
  }

  return sharp(source)
    .composite([
      {
        input: preparedLogo,
        left: Math.max(
          0,
          width -
            logoWidth -
            edgeSpacing,
        ),
        top: Math.max(
          0,
          height -
            logoHeight -
            edgeSpacing,
        ),
      },
    ])
    .webp({
      lossless: true,
      alphaQuality: 100,
      effort: 5,
    })
    .toBuffer();
}

async function loadMarketplaceBusinessLogo(
  tenantId,
) {
  const tenant =
    await prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
      select: {
        logoKey: true,
      },
    });

  const logoKey =
    cleanString(
      tenant?.logoKey,
    );

  if (!logoKey) {
    return null;
  }

  try {
    const storedLogo =
      await downloadObject(
        logoKey,
        {
          visibility:
            STORAGE_VISIBILITY.PRIVATE,
        },
      );

    return storedLogo.body;
  } catch (error) {
    throw createServiceError(
      "The business logo could not be read. Upload the logo again in Business settings.",
      {
        status: 409,
        code:
          "MARKETPLACE_BUSINESS_LOGO_UNAVAILABLE",
      },
    );
  }
}

async function ensureProduct({
  tenantId,
  productId,
}) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      tenantId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      marketplaceStatus: true,
    },
  });

  if (!product) {
    throw createServiceError(
      "Product not found",
      {
        status: 404,
        code: "PRODUCT_NOT_FOUND",
      },
    );
  }

  return product;
}

async function ensureImage({
  tenantId,
  productId,
  imageId,
}) {
  const image = await prisma.productImage.findFirst({
    where: {
      id: imageId,
      tenantId,
      productId,
    },
    select: {
      id: true,
      tenantId: true,
      productId: true,
      url: true,
      key: true,
      reviewKey: true,
      altText: true,
      sortOrder: true,
      isPrimary: true,
      imageType: true,
      sourceImageId: true,
      isMarketplaceApproved: true,
      approvedAt: true,
      approvedById: true,
      studioVersion: true,
      width: true,
      height: true,
      sizeBytes: true,
      mimeType: true,
      thumbnailUrl: true,
      thumbnailKey: true,
      reviewThumbnailKey: true,
      thumbnailWidth: true,
      thumbnailHeight: true,
      thumbnailSizeBytes: true,
      backgroundColor: true,
      processingProvider: true,
      processedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!image) {
    throw createServiceError(
      "Image not found",
      {
        status: 404,
        code: "PRODUCT_IMAGE_NOT_FOUND",
      },
    );
  }

  return image;
}

async function writeProductAudit(tx, {
  tenantId,
  productId,
  productName,
  userId,
  branchId,
  metadata,
}) {
  await tx.auditLog.create({
    data: {
      tenantId,
      userId: userId || null,
      branchId: branchId || null,
      entity: "PRODUCT",
      entityId: productId,
      action: "PRODUCT_UPDATED",
      metadata: {
        productName,
        ...metadata,
      },
    },
  });
}

async function getImageStudioState({
  tenantId,
  productId,
}) {
  requireImageStudioEnabled();

  const product = await ensureProduct({
    tenantId,
    productId,
  });

  const [images, runs, approvedCount] = await Promise.all([
    prisma.productImage.findMany({
      where: {
        tenantId,
        productId,
      },
      orderBy: [
        { isPrimary: "desc" },
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
      select: {
        id: true,
        url: true,
        key: true,
        altText: true,
        sortOrder: true,
        isPrimary: true,
        imageType: true,
        sourceImageId: true,
        isMarketplaceApproved: true,
        approvedAt: true,
        approvedById: true,
        studioVersion: true,
        width: true,
        height: true,
        sizeBytes: true,
        mimeType: true,
        thumbnailUrl: true,
        thumbnailKey: true,
        reviewKey: true,
        reviewThumbnailKey: true,
        thumbnailWidth: true,
        thumbnailHeight: true,
        thumbnailSizeBytes: true,
        backgroundColor: true,
        processingProvider: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.productImageStudioRun.findMany({
      where: {
        tenantId,
        productId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    }),
    prisma.productImage.count({
      where: {
        tenantId,
        productId,
        isMarketplaceApproved: true,
      },
    }),
  ]);

  return {
    enabled: true,
    provider: imageStudioProvider(),
    product,
    limits: {
      maximumApprovedMarketplaceImages:
        MAX_MARKETPLACE_IMAGES,
      approvedMarketplaceImages: approvedCount,
      remainingMarketplaceImageSlots:
        Math.max(
          0,
          MAX_MARKETPLACE_IMAGES - approvedCount,
        ),
    },
    images:
      await serializeOwnerProductImages(
        images,
      ),
    runs,
  };
}

async function cleanProductImage({
  tenantId,
  productId,
  imageId,
  userId,
  branchId,
}) {
  requireImageStudioEnabled();
  requireObjectStorage();

  const product = await ensureProduct({
    tenantId,
    productId,
  });

  const sourceImage = await ensureImage({
    tenantId,
    productId,
    imageId,
  });

  if (sourceImage.imageType !== "ORIGINAL") {
    throw createServiceError(
      "Only original product images can be cleaned",
      {
        status: 409,
        code: "IMAGE_STUDIO_SOURCE_MUST_BE_ORIGINAL",
      },
    );
  }

  const activeRun =
    await prisma.productImageStudioRun.findFirst({
      where: {
        tenantId,
        productId,
        sourceImageId: sourceImage.id,
        status: {
          in: [
            "PENDING",
            "PROCESSING",
          ],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

  if (activeRun) {
    throw createServiceError(
      "This image is already being cleaned",
      {
        status: 409,
        code: "IMAGE_STUDIO_RUN_ALREADY_ACTIVE",
      },
    );
  }

  const runId = crypto.randomUUID();

  const run =
    await prisma.productImageStudioRun.create({
      data: {
        id: runId,
        tenantId,
        productId,
        sourceImageId: sourceImage.id,
        status: "PENDING",
        requestedById: userId || null,
      },
    });

  let uploadedObjectKeys = [];
  let replacedObjectKeys = [];

  try {
    await prisma.productImageStudioRun.update({
      where: {
        id: run.id,
      },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
        failureCode: null,
        failureMessage: null,
      },
    });

    const source = await downloadSourceImage(
      sourceImage,
    );

    const processed = await processWithProvider(
      source,
    );

    const businessLogo =
      await loadMarketplaceBusinessLogo(
        tenantId,
      );

    const [
      brandedMasterBody,
      brandedThumbnailBody,
    ] = await Promise.all([
      createMarketplaceBrandedImage({
        imageBody:
          processed.master.body,
        logoBody:
          businessLogo,
      }),
      createMarketplaceBrandedImage({
        imageBody:
          processed.thumbnail.body,
        logoBody:
          businessLogo,
      }),
    ]);

    const objectKeys = buildStudioObjectKeys({
      tenantId,
      productId,
      runId: run.id,
    });

    const [masterUpload, thumbnailUpload] =
      await Promise.all([
        uploadObject({
          key: objectKeys.masterKey,
          body:
            brandedMasterBody,
          contentType:
            "image/webp",
          visibility:
            STORAGE_VISIBILITY.PRIVATE,
        }),
        uploadObject({
          key: objectKeys.thumbnailKey,
          body:
            brandedThumbnailBody,
          contentType:
            "image/webp",
          visibility:
            STORAGE_VISIBILITY.PRIVATE,
        }),
      ]);

    uploadedObjectKeys = [
      masterUpload.objectKey,
      thumbnailUpload.objectKey,
    ];

    const result =
      await prisma.$transaction(async (tx) => {
        const existingCleanedImages =
          await tx.productImage.findMany({
            where: {
              tenantId,
              productId,
              imageType: "CLEANED",
              sourceImageId: sourceImage.id,
            },
            orderBy: [
              {
                studioVersion: "desc",
              },
              {
                updatedAt: "desc",
              },
              {
                createdAt: "desc",
              },
            ],
          });

        const currentCleanedImage =
          existingCleanedImages[0] || null;

        const previousWasMain =
          existingCleanedImages.some(
            (image) => image.isPrimary,
          );

        replacedObjectKeys =
          existingCleanedImages
            .flatMap((image) => [
                cleanString(image.reviewKey),
                cleanString(
                  image.reviewThumbnailKey,
                ),
              ])
            .filter(
              (key) =>
                key &&
                key !== masterUpload.objectKey &&
                key !== thumbnailUpload.objectKey,
            );

        if (previousWasMain) {
          await tx.productImage.updateMany({
            where: {
              tenantId,
              productId,
            },
            data: {
              isPrimary: false,
            },
          });

          await tx.productImage.update({
            where: {
              id: sourceImage.id,
            },
            data: {
              isPrimary: true,
            },
          });
        }

        let cleanedImage;

        if (currentCleanedImage) {
          cleanedImage =
            await tx.productImage.update({
              where: {
                id: currentCleanedImage.id,
              },
              data: {
                url:
                    buildPrivateObjectLocation(
                      masterUpload.objectKey,
                    ),
                  key: null,
                  reviewKey:
                    masterUpload.objectKey,
                altText:
                  sourceImage.altText ||
                  `${product.name} product image`,
                isPrimary: false,
                isMarketplaceApproved: false,
                approvedAt: null,
                approvedById: null,
                studioVersion:
                  Number(
                    currentCleanedImage.studioVersion || 0,
                  ) + 1,
                width: processed.master.width,
                height: processed.master.height,
                sizeBytes:
                  processed.master.sizeBytes,
                mimeType:
                  processed.master.mimeType,
                thumbnailUrl:
                    buildPrivateObjectLocation(
                      thumbnailUpload.objectKey,
                    ),
                  thumbnailKey: null,
                  reviewThumbnailKey:
                    thumbnailUpload.objectKey,
                thumbnailWidth:
                  processed.thumbnail.width,
                thumbnailHeight:
                  processed.thumbnail.height,
                thumbnailSizeBytes:
                  processed.thumbnail.sizeBytes,
                backgroundColor:
                  processed.master.backgroundColor,
                processingProvider:
                  processed.provider,
                processedAt: new Date(),
              },
            });

          const duplicateIds =
            existingCleanedImages
              .slice(1)
              .map((image) => image.id);

          if (duplicateIds.length) {
            await tx.productImage.deleteMany({
              where: {
                id: {
                  in: duplicateIds,
                },
              },
            });
          }
        } else {
          const maximumSortOrder =
            await tx.productImage.aggregate({
              where: {
                tenantId,
                productId,
              },
              _max: {
                sortOrder: true,
              },
            });

          cleanedImage =
            await tx.productImage.create({
              data: {
                tenantId,
                productId,
                url:
                    buildPrivateObjectLocation(
                      masterUpload.objectKey,
                    ),
                  key: null,
                  reviewKey:
                    masterUpload.objectKey,
                altText:
                  sourceImage.altText ||
                  `${product.name} product image`,
                sortOrder:
                  Number(
                    maximumSortOrder._max.sortOrder || 0,
                  ) + 1,
                isPrimary: false,
                imageType: "CLEANED",
                sourceImageId: sourceImage.id,
                isMarketplaceApproved: false,
                approvedAt: null,
                approvedById: null,
                studioVersion: 1,
                width: processed.master.width,
                height: processed.master.height,
                sizeBytes:
                  processed.master.sizeBytes,
                mimeType:
                  processed.master.mimeType,
                thumbnailUrl:
                    buildPrivateObjectLocation(
                      thumbnailUpload.objectKey,
                    ),
                  thumbnailKey: null,
                  reviewThumbnailKey:
                    thumbnailUpload.objectKey,
                thumbnailWidth:
                  processed.thumbnail.width,
                thumbnailHeight:
                  processed.thumbnail.height,
                thumbnailSizeBytes:
                  processed.thumbnail.sizeBytes,
                backgroundColor:
                  processed.master.backgroundColor,
                processingProvider:
                  processed.provider,
                processedAt: new Date(),
              },
            });
        }

        const completedRun =
          await tx.productImageStudioRun.update({
            where: {
              id: run.id,
            },
            data: {
              resultImageId: cleanedImage.id,
              status: "REVIEW",
              completedAt: new Date(),
              failureCode: null,
              failureMessage: null,
            },
          });

        await writeProductAudit(tx, {
          tenantId,
          productId,
          productName: product.name,
          userId,
          branchId,
          metadata: {
            imageStudioRunCreated: true,
            imageStudioResultReplaced:
              Boolean(currentCleanedImage),
            imageStudioProvider: processed.provider,
            sourceImageId: sourceImage.id,
            resultImageId: cleanedImage.id,
            studioVersion:
              cleanedImage.studioVersion,
          },
        });

        return {
          run: completedRun,
          sourceImage,
          resultImage: cleanedImage,
        };
      });

    uploadedObjectKeys = [];

    for (const oldObjectKey of [
      ...new Set(replacedObjectKeys),
    ]) {
      try {
        await deleteObject(
          oldObjectKey,
          {
            visibility:
              STORAGE_VISIBILITY.PRIVATE,
          },
        );
      } catch (cleanupError) {
        console.error(
          "Image Studio replaced object cleanup failed:",
          oldObjectKey,
          cleanupError?.message || cleanupError,
        );
      }
    }

    return {
      ...result,
      sourceImage:
        await serializeOwnerProductImage(
          result.sourceImage,
        ),
      resultImage:
        await serializeOwnerProductImage(
          result.resultImage,
        ),
    };
  } catch (error) {
    for (const uploadedObjectKey of [
      ...new Set(uploadedObjectKeys),
    ]) {
      if (!uploadedObjectKey) continue;

      try {
        await deleteObject(
          uploadedObjectKey,
          {
            visibility:
              STORAGE_VISIBILITY.PRIVATE,
          },
        );
      } catch (cleanupError) {
        console.error(
          "Image Studio failed object cleanup:",
          uploadedObjectKey,
          cleanupError?.message || cleanupError,
        );
      }
    }

    try {
      await prisma.productImageStudioRun.update({
        where: {
          id: run.id,
        },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          failureCode:
            cleanString(error?.code) ||
            "IMAGE_STUDIO_PROCESSING_FAILED",
          failureMessage:
            cleanString(error?.message) ||
            "Image Studio processing failed",
        },
      });
    } catch (runError) {
      console.error(
        "Image Studio failed run update:",
        runError?.message || runError,
      );
    }

    throw error;
  }
}

async function approveProductImage({
  tenantId,
  productId,
  imageId,
  userId,
  branchId,
}) {
  requireImageStudioEnabled();
  requireObjectStorage();
  requirePublicObjectStorage();

  const product = await ensureProduct({
    tenantId,
    productId,
  });

  const image = await ensureImage({
    tenantId,
    productId,
    imageId,
  });

  if (image.imageType !== "CLEANED") {
    throw createServiceError(
      "Only prepared photos can be approved for the marketplace",
      {
        status: 409,
        code:
          "MARKETPLACE_IMAGE_MUST_BE_CLEANED",
      },
    );
  }

  if (image.isMarketplaceApproved) {
    return serializeOwnerProductImage(
      image,
    );
  }

  const approvedCount =
    await prisma.productImage.count({
      where: {
        tenantId,
        productId,
        isMarketplaceApproved: true,
      },
    });

  if (
    approvedCount >=
    MAX_MARKETPLACE_IMAGES
  ) {
    throw createServiceError(
      `A product can have at most ${MAX_MARKETPLACE_IMAGES} approved marketplace images`,
      {
        status: 409,
        code:
          "MARKETPLACE_IMAGE_LIMIT_REACHED",
      },
    );
  }

  const reviewKey =
    cleanString(image.reviewKey);

  const reviewThumbnailKey =
    cleanString(
      image.reviewThumbnailKey,
    );

  if (!reviewKey) {
    throw createServiceError(
      "This prepared photo is unavailable. Prepare the original photo again.",
      {
        status: 409,
        code:
          "PRODUCT_IMAGE_REVIEW_FILE_MISSING",
      },
    );
  }

  let privateMaster;
  let privateThumbnail = null;

  try {
    [
      privateMaster,
      privateThumbnail,
    ] = await Promise.all([
      downloadObject(
        reviewKey,
        {
          visibility:
            STORAGE_VISIBILITY.PRIVATE,
        },
      ),
      reviewThumbnailKey
        ? downloadObject(
            reviewThumbnailKey,
            {
              visibility:
                STORAGE_VISIBILITY.PRIVATE,
            },
          )
        : Promise.resolve(null),
    ]);
  } catch (error) {
    throw createServiceError(
      "This prepared photo is unavailable. Prepare the original photo again.",
      {
        status: 409,
        code:
          "PRODUCT_IMAGE_REVIEW_FILE_MISSING",
      },
    );
  }

  const uploadedPublicKeys = [];

  try {
    const publicMaster =
      await uploadObject({
        key: reviewKey,
        body:
          privateMaster.body,
        contentType:
          image.mimeType ||
          privateMaster.contentType ||
          "image/webp",
        visibility:
          STORAGE_VISIBILITY.PUBLIC,
      });

    uploadedPublicKeys.push(
      publicMaster.objectKey,
    );

    const publicThumbnail =
      privateThumbnail &&
      reviewThumbnailKey
        ? await uploadObject({
            key: reviewThumbnailKey,
            body:
              privateThumbnail.body,
            contentType:
              privateThumbnail.contentType ||
              "image/webp",
            visibility:
              STORAGE_VISIBILITY.PUBLIC,
          })
        : null;

    if (publicThumbnail?.objectKey) {
      uploadedPublicKeys.push(
        publicThumbnail.objectKey,
      );
    }

    const approvedImage =
      await prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.productImage.update({
              where: {
                id: image.id,
              },
              data: {
                url:
                  publicMaster.publicUrl,
                key:
                  publicMaster.objectKey,
                thumbnailUrl:
                  publicThumbnail?.publicUrl ||
                  publicMaster.publicUrl,
                thumbnailKey:
                  publicThumbnail?.objectKey ||
                  publicMaster.objectKey,
                isMarketplaceApproved:
                  true,
                approvedAt: new Date(),
                approvedById:
                  userId || null,
              },
            });

          await tx.productImageStudioRun.updateMany({
            where: {
              tenantId,
              productId,
              resultImageId:
                image.id,
            },
            data: {
              status: "READY",
            },
          });

          await writeProductAudit(tx, {
            tenantId,
            productId,
            productName:
              product.name,
            userId,
            branchId,
            metadata: {
              imageStudioImageApproved:
                true,
              sourceImageId:
                image.sourceImageId,
              resultImageId:
                image.id,
            },
          });

          return updated;
        },
      );

    return serializeOwnerProductImage(
      approvedImage,
    );
  } catch (error) {
    for (
      const publicKey
      of [...new Set(uploadedPublicKeys)]
    ) {
      try {
        await deleteObject(
          publicKey,
          {
            visibility:
              STORAGE_VISIBILITY.PUBLIC,
          },
        );
      } catch (cleanupError) {
        console.error(
          "Approved image cleanup failed:",
          publicKey,
          cleanupError?.message ||
            cleanupError,
        );
      }
    }

    throw error;
  }
}

async function removeProductImageApproval({
  tenantId,
  productId,
  imageId,
  userId,
  branchId,
}) {
  requireImageStudioEnabled();

  const product = await ensureProduct({
    tenantId,
    productId,
  });

  const image = await ensureImage({
    tenantId,
    productId,
    imageId,
  });

  if (image.imageType !== "CLEANED") {
    throw createServiceError(
      "Only prepared photos can have marketplace approval",
      {
        status: 409,
        code:
          "MARKETPLACE_IMAGE_MUST_BE_CLEANED",
      },
    );
  }

  if (!image.isMarketplaceApproved) {
    return serializeOwnerProductImage(
      image,
    );
  }

  const publicObjectKeys = [
    cleanString(image.key),
    cleanString(image.thumbnailKey),
  ].filter(Boolean);

  const reviewKey =
    cleanString(image.reviewKey);

  const reviewThumbnailKey =
    cleanString(
      image.reviewThumbnailKey,
    );

  const updatedImage =
    await prisma.$transaction(
      async (tx) => {
        const updated =
          await tx.productImage.update({
            where: {
              id: image.id,
            },
            data: {
              /*
               * ProductImage.url is required by the current schema.
               * For a legacy prepared image without a retained private
               * review file, store a private unavailable location.
               * The owner serializer returns url: null because reviewKey
               * remains empty, so this placeholder is never exposed.
               */
              url:
                buildPrivateObjectLocation(
                  reviewKey ||
                    `unavailable/product-images/${image.id}/master`,
                ),
              key: null,
              thumbnailUrl:
                buildPrivateObjectLocation(
                  reviewThumbnailKey ||
                    reviewKey ||
                    `unavailable/product-images/${image.id}/thumbnail`,
                ),
              thumbnailKey: null,
              isPrimary: false,
              isMarketplaceApproved:
                false,
              approvedAt: null,
              approvedById: null,
            },
          });

        if (image.isPrimary) {
          const sourceImage =
            image.sourceImageId
              ? await tx.productImage.findFirst({
                  where: {
                    id:
                      image.sourceImageId,
                    tenantId,
                    productId,
                  },
                  select: {
                    id: true,
                  },
                })
              : null;

          const fallbackImage =
            sourceImage ||
            await tx.productImage.findFirst({
              where: {
                tenantId,
                productId,
                id: {
                  not: image.id,
                },
              },
              orderBy: [
                {
                  sortOrder: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
              select: {
                id: true,
              },
            });

          if (fallbackImage) {
            await tx.productImage.update({
              where: {
                id: fallbackImage.id,
              },
              data: {
                isPrimary: true,
              },
            });
          }
        }

        await tx.productImageStudioRun.updateMany({
          where: {
            tenantId,
            productId,
            resultImageId:
              image.id,
            status: "READY",
          },
          data: {
            status: "REVIEW",
          },
        });

        await writeProductAudit(tx, {
          tenantId,
          productId,
          productName:
            product.name,
          userId,
          branchId,
          metadata: {
            imageStudioImageApprovalRemoved:
              true,
            resultImageId:
              image.id,
          },
        });

        return updated;
      },
    );

  for (
    const publicObjectKey
    of [...new Set(publicObjectKeys)]
  ) {
    try {
      await deleteObject(
        publicObjectKey,
        {
          visibility:
            STORAGE_VISIBILITY.PUBLIC,
        },
      );
    } catch (cleanupError) {
      console.error(
        "Public approved image cleanup failed:",
        publicObjectKey,
        cleanupError?.message ||
          cleanupError,
      );
    }
  }

  return serializeOwnerProductImage(
    updatedImage,
  );
}

async function useProductImageAsMain({
  tenantId,
  productId,
  imageId,
  userId,
  branchId,
}) {
  requireImageStudioEnabled();

  const product = await ensureProduct({
    tenantId,
    productId,
  });

  const image = await ensureImage({
    tenantId,
    productId,
    imageId,
  });

  if (image.imageType !== "CLEANED") {
    throw createServiceError(
      "Only a cleaned image can be selected from Image Studio",
      {
        status: 409,
        code: "MAIN_IMAGE_MUST_BE_CLEANED",
      },
    );
  }

  if (!image.isMarketplaceApproved) {
    throw createServiceError(
      "Approve the cleaned image before using it as the main image",
      {
        status: 409,
        code: "MAIN_IMAGE_MUST_BE_APPROVED",
      },
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.productImage.updateMany({
      where: {
        tenantId,
        productId,
      },
      data: {
        isPrimary: false,
      },
    });

    const mainImage =
      await tx.productImage.update({
        where: {
          id: image.id,
        },
        data: {
          isPrimary: true,
        },
      });

    await writeProductAudit(tx, {
      tenantId,
      productId,
      productName: product.name,
      userId,
      branchId,
      metadata: {
        imageStudioMainImageUpdated: true,
        resultImageId: image.id,
      },
    });

    return mainImage;
  });
}

module.exports = {
  MAX_MARKETPLACE_IMAGES,
  approveProductImage,
  cleanProductImage,
  getImageStudioState,
  removeProductImageApproval,
  useProductImageAsMain,
};
