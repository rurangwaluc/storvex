const crypto = require("crypto");
const path = require("path");

const prisma = require("../../config/database");
const {
  createPresignedImageUpload,
  isConfigured: isObjectStorageConfigured,
  uploadObject,
} = require("../../lib/storage/objectStorage");

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function getTenantId(req) {
  return req.user?.tenantId || null;
}

function safeFileStem(filename = "product") {
  const base = path.basename(String(filename || "product"), path.extname(String(filename || "")));

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

function safeImageExtension(filename = "", contentType = "") {
  const ext = path.extname(String(filename || "")).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }

  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";

  return ".jpg";
}

function buildProductImageKey({ tenantId, productId, filename, contentType }) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const uploadId = crypto.randomUUID();
  const stem = safeFileStem(filename);
  const ext = safeImageExtension(filename, contentType);

  return [
    "product-images",
    tenantId,
    productId,
    year,
    month,
    `${uploadId}-${stem}${ext}`,
  ].join("/");
}

function normalizeUploadInput(body = {}) {
  const filename = cleanString(body.filename || body.fileName || body.name);
  const contentType = cleanString(body.contentType || body.fileType || body.type).toLowerCase();
  const sizeBytes = Number(body.sizeBytes || body.size || 0);

  if (!filename) {
    const err = new Error("Image filename is required");
    err.status = 400;
    throw err;
  }

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    const err = new Error("Only JPG, PNG, and WEBP product images are allowed");
    err.status = 400;
    throw err;
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    const err = new Error("Product image must be 5MB or smaller");
    err.status = 400;
    throw err;
  }

  return {
    filename,
    contentType,
    sizeBytes,
  };
}

async function createProductImageUploadUrl(req, res) {
  const tenantId = getTenantId(req);

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const productId = cleanString(req.params.id);

  try {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!isObjectStorageConfigured()) {
      return res.status(503).json({
        message: "Object storage is not configured",
        code: "OBJECT_STORAGE_NOT_CONFIGURED",
      });
    }

    const input = normalizeUploadInput(req.body || {});
    const objectKey = buildProductImageKey({
      tenantId,
      productId: product.id,
      filename: input.filename,
      contentType: input.contentType,
    });

    const upload = await createPresignedImageUpload({
      key: objectKey,
      contentType: input.contentType,
      expiresInSeconds: 900,
    });

    return res.status(201).json({
      message: "Product image upload URL created",
      upload: {
        uploadUrl: upload.uploadUrl,
        publicUrl: upload.publicUrl,
        url: upload.publicUrl,
        objectKey: upload.objectKey,
        key: upload.objectKey,
        headers: upload.headers,
        expiresInSeconds: 900,
      },
    });
  } catch (err) {
    console.error("createProductImageUploadUrl error:", err);

    return res.status(err.status || 500).json({
      message: err.message || "Failed to create product image upload URL",
    });
  }
}

async function uploadProductImage(req, res) {
  const tenantId = getTenantId(req);

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const productId = cleanString(req.params.id);

  try {
    const product = await prisma.product.findFirst({
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
      return res.status(404).json({ message: "Product not found" });
    }

    if (!isObjectStorageConfigured()) {
      return res.status(503).json({
        message: "Object storage is not configured",
        code: "OBJECT_STORAGE_NOT_CONFIGURED",
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Product image file is required" });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return res.status(400).json({
        message: "Only JPG, PNG, and WEBP product images are allowed",
      });
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return res.status(400).json({ message: "Product image must be 5MB or smaller" });
    }

    const objectKey = buildProductImageKey({
      tenantId,
      productId: product.id,
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const uploaded = await uploadObject({
      key: objectKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const existingCount = await prisma.productImage.count({
      where: {
        tenantId,
        productId: product.id,
      },
    });

    const requestedPrimary =
      String(req.body?.isPrimary || "").toLowerCase() === "true" || existingCount === 0;

    const image = await prisma.$transaction(async (tx) => {
      if (requestedPrimary) {
        await tx.productImage.updateMany({
          where: {
            tenantId,
            productId: product.id,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.productImage.create({
        data: {
          tenantId,
          productId: product.id,
          url: uploaded.publicUrl,
          key: uploaded.objectKey,
          altText: cleanString(req.body?.altText) || product.name || "Product image",
          sortOrder: Number(req.body?.sortOrder || existingCount),
          isPrimary: requestedPrimary,
        },
      });
    });

    return res.status(201).json({
      message: "Product image uploaded",
      image,
    });
  } catch (err) {
    console.error("uploadProductImage error:", err);

    return res.status(err.status || 500).json({
      message: err.message || "Failed to upload product image",
    });
  }
}

module.exports = {
  createProductImageUploadUrl,
  uploadProductImage,
};
