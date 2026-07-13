const crypto = require("crypto");

const {
  createPresignedDownload,
  createPresignedUpload,
} = require("../../lib/storage/objectStorage");

function cleanString(value) {
  const cleaned = String(value || "").trim();
  return cleaned || "";
}

function safeFileName(value) {
  return (
    cleanString(value)
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "support-file"
  );
}

function buildSupportStorageKey({ tenantId, fileName }) {
  const businessId = cleanString(tenantId);

  if (!businessId) {
    throw new Error("tenantId is required");
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return [
    "support",
    businessId,
    year,
    month,
    `${crypto.randomUUID()}-${safeFileName(fileName)}`,
  ].join("/");
}

async function createSupportUploadUrl({
  tenantId,
  fileName,
  fileType,
}) {
  if (!cleanString(fileName)) {
    throw new Error("fileName is required");
  }

  if (!cleanString(fileType)) {
    throw new Error("fileType is required");
  }

  const storageKey = buildSupportStorageKey({
    tenantId,
    fileName,
  });

  const upload = await createPresignedUpload({
    key: storageKey,
    contentType: fileType,
  });

  return {
    uploadUrl: upload.uploadUrl,
    storageKey,
    fileUrl: upload.publicUrl,
  };
}

async function createSignedDownloadUrl(storageKey) {
  return createPresignedDownload({
    key: storageKey,
  });
}

module.exports = {
  buildSupportStorageKey,
  createSignedDownloadUrl,
  createSupportUploadUrl,
};
