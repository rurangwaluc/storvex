const crypto = require("crypto");

const prisma = require("../../config/database");
const {
  STORAGE_VISIBILITY,
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
  removeProductBackground,
} = require("./inventory.productBackgroundRemoval.service");
const {
  standardizeRemovedBackground,
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
  return (
    cleanString(process.env.IMAGE_STUDIO_PROVIDER)?.toLowerCase() ||
    "standard"
  );
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

  const removedBackground =
    await removeProductBackground(source.body);

  const standardized =
    await standardizeRemovedBackground(
      removedBackground.body,
    );

  return {
    master: standardized.master,
    thumbnail: standardized.thumbnail,
    provider: removedBackground.provider,
  };
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
      altText: true,
      sortOrder: true,
      isPrimary: true,
      imageType: true,
      sourceImageId: true,
      isMarketplaceApproved: true,
      approvedAt: true,
      approvedById: true,
      studioVersion: true,
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

    const objectKeys = buildStudioObjectKeys({
      tenantId,
      productId,
      runId: run.id,
    });

    const [masterUpload, thumbnailUpload] =
      await Promise.all([
        uploadObject({
          key: objectKeys.masterKey,
          body: processed.master.body,
          contentType:
            processed.master.mimeType,
          visibility:
            STORAGE_VISIBILITY.PUBLIC,
        }),
        uploadObject({
          key: objectKeys.thumbnailKey,
          body: processed.thumbnail.body,
          contentType:
            processed.thumbnail.mimeType,
          visibility:
            STORAGE_VISIBILITY.PUBLIC,
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
              cleanString(image.key),
              cleanString(image.thumbnailKey),
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
                url: masterUpload.publicUrl,
                key: masterUpload.objectKey,
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
                  thumbnailUpload.publicUrl,
                thumbnailKey:
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
                url: masterUpload.publicUrl,
                key: masterUpload.objectKey,
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
                  thumbnailUpload.publicUrl,
                thumbnailKey:
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
              STORAGE_VISIBILITY.PUBLIC,
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
              STORAGE_VISIBILITY.PUBLIC,
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
      "Only cleaned images can be approved for the marketplace",
      {
        status: 409,
        code: "MARKETPLACE_IMAGE_MUST_BE_CLEANED",
      },
    );
  }

  if (!image.isMarketplaceApproved) {
    const approvedCount =
      await prisma.productImage.count({
        where: {
          tenantId,
          productId,
          isMarketplaceApproved: true,
        },
      });

    if (approvedCount >= MAX_MARKETPLACE_IMAGES) {
      throw createServiceError(
        `A product can have at most ${MAX_MARKETPLACE_IMAGES} approved marketplace images`,
        {
          status: 409,
          code: "MARKETPLACE_IMAGE_LIMIT_REACHED",
        },
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    if (image.sourceImageId) {
      await tx.productImage.updateMany({
        where: {
          tenantId,
          productId,
          imageType: "CLEANED",
          sourceImageId: image.sourceImageId,
          id: {
            not: image.id,
          },
        },
        data: {
          isMarketplaceApproved: false,
          approvedAt: null,
          approvedById: null,
        },
      });
    }

    const approvedImage =
      await tx.productImage.update({
        where: {
          id: image.id,
        },
        data: {
          isMarketplaceApproved: true,
          approvedAt: new Date(),
          approvedById: userId || null,
        },
      });

    await tx.productImageStudioRun.updateMany({
      where: {
        tenantId,
        productId,
        resultImageId: image.id,
      },
      data: {
        status: "READY",
      },
    });

    await writeProductAudit(tx, {
      tenantId,
      productId,
      productName: product.name,
      userId,
      branchId,
      metadata: {
        imageStudioImageApproved: true,
        sourceImageId: image.sourceImageId,
        resultImageId: image.id,
      },
    });

    return approvedImage;
  });
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
      "Only cleaned images can have marketplace approval",
      {
        status: 409,
        code: "MARKETPLACE_IMAGE_MUST_BE_CLEANED",
      },
    );
  }

  return prisma.$transaction(async (tx) => {
    const updatedImage =
      await tx.productImage.update({
        where: {
          id: image.id,
        },
        data: {
          isMarketplaceApproved: false,
          approvedAt: null,
          approvedById: null,
        },
      });

    await tx.productImageStudioRun.updateMany({
      where: {
        tenantId,
        productId,
        resultImageId: image.id,
        status: "READY",
      },
      data: {
        status: "REVIEW",
      },
    });

    await writeProductAudit(tx, {
      tenantId,
      productId,
      productName: product.name,
      userId,
      branchId,
      metadata: {
        imageStudioImageApprovalRemoved: true,
        resultImageId: image.id,
      },
    });

    return updatedImage;
  });
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
