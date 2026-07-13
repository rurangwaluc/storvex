const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

function getEnv(name) {
  return String(process.env[name] || "").trim();
}

function firstEnv(...names) {
  for (const name of names) {
    const value = getEnv(name);

    if (value) {
      return value;
    }
  }

  return "";
}

function cleanStorageKey(value) {
  return String(value || "").trim().replace(/^\/+/, "");
}

function isLocalStorageEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    const hostname = url.hostname.toLowerCase();

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

function getBooleanEnv(name) {
  const value = getEnv(name).toLowerCase();

  if (["true", "1", "yes", "on"].includes(value)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(value)) {
    return false;
  }

  return null;
}

function getStorageConfig() {
  const accountId = getEnv("R2_ACCOUNT_ID");

  const configuredEndpoint = firstEnv("OBJECT_STORAGE_ENDPOINT");
  const bucket = firstEnv("OBJECT_STORAGE_BUCKET", "R2_BUCKET");
  const endpoint =
    configuredEndpoint ||
    (accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : "");

  const accessKeyId = firstEnv(
    "OBJECT_STORAGE_ACCESS_KEY_ID",
    "R2_ACCESS_KEY_ID",
  );

  const secretAccessKey = firstEnv(
    "OBJECT_STORAGE_SECRET_ACCESS_KEY",
    "R2_SECRET_ACCESS_KEY",
  );

  const region =
    firstEnv("OBJECT_STORAGE_REGION", "R2_REGION") ||
    "auto";

  const publicBaseUrl = firstEnv(
    "OBJECT_STORAGE_PUBLIC_BASE_URL",
    "R2_PUBLIC_BASE_URL",
  ).replace(/\/+$/, "");

  const defaultSignedUrlTtlSeconds = Number(
    firstEnv(
      "OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS",
      "R2_SIGNED_URL_TTL_SECONDS",
    ) || 300,
  );

  const configuredForcePathStyle =
    getBooleanEnv("OBJECT_STORAGE_FORCE_PATH_STYLE");

  const forcePathStyle =
    configuredForcePathStyle ??
    (
      Boolean(configuredEndpoint) &&
      isLocalStorageEndpoint(configuredEndpoint)
    );

  return {
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
    region,
    publicBaseUrl,
    defaultSignedUrlTtlSeconds:
      Number.isFinite(defaultSignedUrlTtlSeconds) &&
      defaultSignedUrlTtlSeconds > 0
        ? defaultSignedUrlTtlSeconds
        : 300,
    forcePathStyle,
  };
}

function isConfigured() {
  const config = getStorageConfig();

  return Boolean(
    config.bucket &&
      config.endpoint &&
      config.accessKeyId &&
      config.secretAccessKey,
  );
}

function createStorageNotConfiguredError() {
  const error = new Error("Object storage is not configured");
  error.status = 503;
  error.code = "OBJECT_STORAGE_NOT_CONFIGURED";
  return error;
}

function getClient() {
  const config = getStorageConfig();

  if (!isConfigured()) {
    return null;
  }

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function requireClient() {
  const client = getClient();

  if (!client) {
    throw createStorageNotConfiguredError();
  }

  return client;
}

function requireBucket() {
  const bucket = getStorageConfig().bucket;

  if (!bucket) {
    throw createStorageNotConfiguredError();
  }

  return bucket;
}

function safeSignedUrlTtl(expiresInSeconds) {
  const requested = Number(expiresInSeconds);

  if (Number.isFinite(requested) && requested > 0) {
    return requested;
  }

  return getStorageConfig().defaultSignedUrlTtlSeconds;
}

function buildPublicUrl(key) {
  const storageKey = cleanStorageKey(key);
  const publicBaseUrl = getStorageConfig().publicBaseUrl;

  if (!publicBaseUrl || !storageKey) {
    return null;
  }

  return `${publicBaseUrl}/${storageKey}`;
}

async function createPresignedUpload({
  key,
  contentType = "application/octet-stream",
  expiresInSeconds,
}) {
  const storageKey = cleanStorageKey(key);

  if (!storageKey) {
    throw new Error("Object storage key is required");
  }

  const client = requireClient();
  const bucket = requireBucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: safeSignedUrlTtl(expiresInSeconds),
  });

  return {
    uploadUrl,
    publicUrl: buildPublicUrl(storageKey),
    objectKey: storageKey,
    storageKey,
    headers: {
      "Content-Type": contentType,
    },
  };
}

async function createPresignedImageUpload({
  key,
  contentType,
  expiresInSeconds = 900,
}) {
  return createPresignedUpload({
    key,
    contentType,
    expiresInSeconds,
  });
}

async function createPresignedDownload({
  key,
  expiresInSeconds,
}) {
  const storageKey = cleanStorageKey(key);

  if (!storageKey) {
    throw new Error("Object storage key is required");
  }

  const client = requireClient();
  const bucket = requireBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: storageKey,
  });

  return getSignedUrl(client, command, {
    expiresIn: safeSignedUrlTtl(expiresInSeconds),
  });
}

async function signGetUrl(key, expiresInSeconds) {
  if (!cleanStorageKey(key)) {
    return null;
  }

  return createPresignedDownload({
    key,
    expiresInSeconds,
  });
}

async function signPutUrl(
  key,
  contentType = "application/octet-stream",
  expiresInSeconds,
) {
  const upload = await createPresignedUpload({
    key,
    contentType,
    expiresInSeconds,
  });

  return upload.uploadUrl;
}

async function uploadObject({
  key,
  body,
  contentType = "application/octet-stream",
  cacheControl = "public, max-age=31536000, immutable",
}) {
  const storageKey = cleanStorageKey(key);

  if (!storageKey) {
    throw new Error("Object storage key is required");
  }

  const client = requireClient();
  const bucket = requireBucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
  });

  await client.send(command);

  return {
    publicUrl: buildPublicUrl(storageKey),
    objectKey: storageKey,
    storageKey,
  };
}

async function bodyToBuffer(body) {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks = [];

  for await (const chunk of body) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk),
    );
  }

  return Buffer.concat(chunks);
}

async function downloadObject(key) {
  const storageKey = cleanStorageKey(key);

  if (!storageKey) {
    throw new Error("Object storage key is required");
  }

  const client = requireClient();
  const bucket = requireBucket();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    }),
  );

  return {
    body: await bodyToBuffer(response.Body),
    contentType:
      String(
        response.ContentType ||
          "application/octet-stream",
      )
        .split(";")[0]
        .trim()
        .toLowerCase(),
    contentLength:
      Number(response.ContentLength || 0),
    objectKey: storageKey,
    storageKey,
  };
}

async function deleteObject(key) {
  const storageKey = cleanStorageKey(key);

  if (!storageKey) {
    return;
  }

  const client = requireClient();
  const bucket = requireBucket();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    }),
  );
}

module.exports = {
  buildPublicUrl,
  cleanStorageKey,
  createPresignedDownload,
  createPresignedImageUpload,
  createPresignedUpload,
  deleteObject,
  downloadObject,
  getClient,
  isConfigured,
  signGetUrl,
  signPutUrl,
  uploadObject,
};
