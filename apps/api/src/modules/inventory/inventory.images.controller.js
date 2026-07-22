const crypto = require("crypto");
const path = require("path");

const prisma = require("../../config/database");
const {
  STORAGE_VISIBILITY,
  buildPrivateObjectLocation,
  isConfigured: isObjectStorageConfigured,
  uploadObject,
} = require("../../lib/storage/objectStorage");
const {
  serializeOwnerProductImage,
} = require("./inventory.productImageAccess.service");
const {
  inspectSourceImage,
} = require("./inventory.productImageStandard.service");

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function cleanString(value) {
  const result = String(value || "").trim();
  return result || "";
}

function getTenantId(req) {
  return req.user?.tenantId || null;
}

function safeFileStem(filename = "product") {
  const fileName = String(filename || "product");

  const base = path.basename(
    fileName,
    path.extname(fileName),
  );

  return (
    base
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "product"
  );
}

function safeImageExtension(
  filename = "",
  contentType = "",
) {
  const extension = path
    .extname(String(filename || ""))
    .toLowerCase();

  if (
    [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ].includes(extension)
  ) {
    return extension === ".jpeg"
      ? ".jpg"
      : extension;
  }

  if (contentType === "image/png") {
    return ".png";
  }

  if (contentType === "image/webp") {
    return ".webp";
  }

  return ".jpg";
}

function buildProductImageKey({
  tenantId,
  productId,
  filename,
  contentType,
}) {
  const now = new Date();
  const year = now.getUTCFullYear();

  const month = String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0");

  const uploadId = crypto.randomUUID();
  const stem = safeFileStem(filename);

  const extension = safeImageExtension(
    filename,
    contentType,
  );

  return [
    "product-images-private",
    tenantId,
    productId,
    year,
    month,
    `${uploadId}-${stem}${extension}`,
  ].join("/");
}

async function uploadProductImage(req, res) {
  const tenantId = getTenantId(req);

  if (!tenantId) {
    return res
      .status(401)
      .json({
        message: "Unauthorized",
      });
  }

  const productId = cleanString(
    req.params.id,
  );

  let uploadedObjectKey = null;

  try {
    const product =
      await prisma.product.findFirst({
        where: {
          id: productId,
          tenantId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (!product) {
      return res
        .status(404)
        .json({
          message: "Product not found",
        });
    }

    if (
      !isObjectStorageConfigured(
        STORAGE_VISIBILITY.PRIVATE,
      )
    ) {
      return res
        .status(503)
        .json({
          message:
            "Private object storage is not configured",
          code:
            "PRIVATE_OBJECT_STORAGE_NOT_CONFIGURED",
        });
    }

    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({
          message:
            "Product image file is required",
        });
    }

    if (
      !ALLOWED_IMAGE_TYPES.has(
        file.mimetype,
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            "Only JPG, PNG, and WEBP product images are allowed",
        });
    }

    if (
      !Buffer.isBuffer(file.buffer) ||
      !file.buffer.length
    ) {
      return res
        .status(400)
        .json({
          message:
            "Product image file is empty",
          code:
            "PRODUCT_IMAGE_EMPTY",
        });
    }

    if (
      file.size >
      MAX_IMAGE_SIZE_BYTES
    ) {
      return res
        .status(400)
        .json({
          message:
            "Product image must be 10MB or smaller",
        });
    }

    const sourceMetadata =
      await inspectSourceImage(
        file.buffer,
      );

    const objectKey =
      buildProductImageKey({
        tenantId,
        productId: product.id,
        filename: file.originalname,
        contentType: file.mimetype,
      });

    const uploaded =
      await uploadObject({
        key: objectKey,
        body: file.buffer,
        contentType: file.mimetype,
        visibility:
          STORAGE_VISIBILITY.PRIVATE,
      });

    uploadedObjectKey =
      uploaded.objectKey;

    const existingCount =
      await prisma.productImage.count({
        where: {
          tenantId,
          productId: product.id,
        },
      });

    const requestedPrimary =
      String(
        req.body?.isPrimary || "",
      ).toLowerCase() === "true" ||
      existingCount === 0;

    const requestedSortOrder =
      Number(req.body?.sortOrder);

    const sortOrder =
      Number.isFinite(
        requestedSortOrder,
      )
        ? requestedSortOrder
        : existingCount;

    const image =
      await prisma.$transaction(
        async (tx) => {
          if (requestedPrimary) {
            await tx.productImage.updateMany({
              where: {
                tenantId,
                productId:
                  product.id,
              },
              data: {
                isPrimary: false,
              },
            });
          }

          return tx.productImage.create({
            data: {
              tenantId,
              productId:
                product.id,
              url:
                buildPrivateObjectLocation(
                  uploaded.objectKey,
                ),
              key:
                uploaded.objectKey,
              altText:
                cleanString(
                  req.body?.altText,
                ) ||
                product.name ||
                "Product image",
              sortOrder,
              isPrimary:
                requestedPrimary,
              imageType:
                "ORIGINAL",
              width:
                sourceMetadata.width,
              height:
                sourceMetadata.height,
              sizeBytes:
                file.size,
              mimeType:
                file.mimetype,
            },
          });
        },
      );

    uploadedObjectKey = null;

    return res
      .status(201)
      .json({
        message:
          "Product image uploaded",
        image:
          await serializeOwnerProductImage(
            image,
          ),
      });
  } catch (error) {
    if (uploadedObjectKey) {
      try {
        const {
          deleteObject,
        } = require(
          "../../lib/storage/objectStorage",
        );

        await deleteObject(
          uploadedObjectKey,
          {
            visibility:
              STORAGE_VISIBILITY.PRIVATE,
          },
        );
      } catch (cleanupError) {
        console.error(
          "uploadProductImage object cleanup failed:",
          uploadedObjectKey,
          cleanupError?.message ||
            cleanupError,
        );
      }
    }

    console.error(
      "uploadProductImage error:",
      error,
    );

    return res
      .status(
        Number(error?.status) ||
          500,
      )
      .json({
        message:
          error?.message ||
          "Failed to upload product image",
        code:
          error?.code ||
          "PRODUCT_IMAGE_UPLOAD_FAILED",
      });
  }
}

module.exports = {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  uploadProductImage,
};
