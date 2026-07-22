const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");

const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");

const STORAGE_VISIBILITY = Object.freeze({
  PRIVATE: "private",
  PUBLIC: "public",
});

function getEnv(name) {
  return String(
    process.env[name] || "",
  ).trim();
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
  return String(value || "")
    .trim()
    .replace(/^\/+/, "");
}

function normalizeVisibility(value) {
  return String(value || "")
    .trim()
    .toLowerCase() === STORAGE_VISIBILITY.PUBLIC
    ? STORAGE_VISIBILITY.PUBLIC
    : STORAGE_VISIBILITY.PRIVATE;
}

function isLocalStorageEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    const hostname =
      url.hostname.toLowerCase();

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
  const value =
    getEnv(name).toLowerCase();

  if (
    ["true", "1", "yes", "on"].includes(
      value,
    )
  ) {
    return true;
  }

  if (
    ["false", "0", "no", "off"].includes(
      value,
    )
  ) {
    return false;
  }

  return null;
}

function getSharedStorageConfig() {
  const accountId =
    getEnv("R2_ACCOUNT_ID");

  const configuredEndpoint =
    firstEnv(
      "OBJECT_STORAGE_ENDPOINT",
    );

  const endpoint =
    configuredEndpoint ||
    (
      accountId
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : ""
    );

  const accessKeyId =
    firstEnv(
      "OBJECT_STORAGE_ACCESS_KEY_ID",
      "R2_ACCESS_KEY_ID",
    );

  const secretAccessKey =
    firstEnv(
      "OBJECT_STORAGE_SECRET_ACCESS_KEY",
      "R2_SECRET_ACCESS_KEY",
    );

  const region =
    firstEnv(
      "OBJECT_STORAGE_REGION",
      "R2_REGION",
    ) || "auto";

  const defaultSignedUrlTtlSeconds =
    Number(
      firstEnv(
        "OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS",
        "R2_SIGNED_URL_TTL_SECONDS",
      ) || 300,
    );

  const configuredForcePathStyle =
    getBooleanEnv(
      "OBJECT_STORAGE_FORCE_PATH_STYLE",
    );

  const forcePathStyle =
    configuredForcePathStyle ??
    (
      Boolean(configuredEndpoint) &&
      isLocalStorageEndpoint(
        configuredEndpoint,
      )
    );

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    region,
    defaultSignedUrlTtlSeconds:
      Number.isFinite(
        defaultSignedUrlTtlSeconds,
      ) &&
      defaultSignedUrlTtlSeconds > 0
        ? defaultSignedUrlTtlSeconds
        : 300,
    forcePathStyle,
  };
}

function getStorageConfig(
  visibility = STORAGE_VISIBILITY.PRIVATE,
) {
  const normalizedVisibility =
    normalizeVisibility(visibility);

  const shared =
    getSharedStorageConfig();

  if (
    normalizedVisibility ===
    STORAGE_VISIBILITY.PUBLIC
  ) {
    return {
      ...shared,
      visibility:
        STORAGE_VISIBILITY.PUBLIC,
      bucket:
        firstEnv(
          "OBJECT_STORAGE_PUBLIC_BUCKET",
          "R2_PUBLIC_BUCKET",
        ),
      publicBaseUrl:
        firstEnv(
          "OBJECT_STORAGE_PUBLIC_BASE_URL",
          "R2_PUBLIC_BASE_URL",
        ).replace(/\/+$/, ""),
    };
  }

  return {
    ...shared,
    visibility:
      STORAGE_VISIBILITY.PRIVATE,
    bucket:
      firstEnv(
        "OBJECT_STORAGE_PRIVATE_BUCKET",
        "OBJECT_STORAGE_BUCKET",
        "R2_PRIVATE_BUCKET",
        "R2_BUCKET",
      ),
    publicBaseUrl: "",
  };
}

function isConfigured(
  visibility = STORAGE_VISIBILITY.PRIVATE,
) {
  const config =
    getStorageConfig(visibility);

  const baseConfigured =
    Boolean(
      config.bucket &&
      config.endpoint &&
      config.accessKeyId &&
      config.secretAccessKey,
    );

  if (
    config.visibility ===
    STORAGE_VISIBILITY.PUBLIC
  ) {
    return Boolean(
      baseConfigured &&
      config.publicBaseUrl,
    );
  }

  return baseConfigured;
}

function createStorageNotConfiguredError(
  visibility,
) {
  const normalizedVisibility =
    normalizeVisibility(visibility);

  const error = new Error(
    normalizedVisibility ===
      STORAGE_VISIBILITY.PUBLIC
      ? "Public object storage is not configured"
      : "Private object storage is not configured",
  );

  error.status = 503;

  error.code =
    normalizedVisibility ===
      STORAGE_VISIBILITY.PUBLIC
      ? "PUBLIC_OBJECT_STORAGE_NOT_CONFIGURED"
      : "PRIVATE_OBJECT_STORAGE_NOT_CONFIGURED";

  return error;
}

function getClient(
  visibility = STORAGE_VISIBILITY.PRIVATE,
) {
  const config =
    getStorageConfig(visibility);

  if (!isConfigured(visibility)) {
    return null;
  }

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle:
      config.forcePathStyle,
    credentials: {
      accessKeyId:
        config.accessKeyId,
      secretAccessKey:
        config.secretAccessKey,
    },
  });
}

function requireClient(visibility) {
  const client =
    getClient(visibility);

  if (!client) {
    throw createStorageNotConfiguredError(
      visibility,
    );
  }

  return client;
}

function requireBucket(visibility) {
  const config =
    getStorageConfig(visibility);

  if (!config.bucket) {
    throw createStorageNotConfiguredError(
      visibility,
    );
  }

  return config.bucket;
}

function safeSignedUrlTtl(
  expiresInSeconds,
  visibility,
) {
  const requested =
    Number(expiresInSeconds);

  if (
    Number.isFinite(requested) &&
    requested > 0
  ) {
    return requested;
  }

  return getStorageConfig(
    visibility,
  ).defaultSignedUrlTtlSeconds;
}

function buildPublicUrl(key) {
  const storageKey =
    cleanStorageKey(key);

  const publicBaseUrl =
    getStorageConfig(
      STORAGE_VISIBILITY.PUBLIC,
    ).publicBaseUrl;

  if (
    !publicBaseUrl ||
    !storageKey
  ) {
    return null;
  }

  return `${publicBaseUrl}/${storageKey}`;
}

function buildPrivateObjectLocation(key) {
  const storageKey =
    cleanStorageKey(key);

  if (!storageKey) {
    return null;
  }

  return `private-object://${storageKey}`;
}

async function createPresignedUpload({
  key,
  contentType =
    "application/octet-stream",
  expiresInSeconds,
  visibility =
    STORAGE_VISIBILITY.PRIVATE,
}) {
  const normalizedVisibility =
    normalizeVisibility(visibility);

  const storageKey =
    cleanStorageKey(key);

  if (!storageKey) {
    throw new Error(
      "Object storage key is required",
    );
  }

  const client =
    requireClient(
      normalizedVisibility,
    );

  const bucket =
    requireBucket(
      normalizedVisibility,
    );

  const command =
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: contentType,
    });

  const uploadUrl =
    await getSignedUrl(
      client,
      command,
      {
        expiresIn:
          safeSignedUrlTtl(
            expiresInSeconds,
            normalizedVisibility,
          ),
      },
    );

  return {
    uploadUrl,
    publicUrl:
      normalizedVisibility ===
        STORAGE_VISIBILITY.PUBLIC
        ? buildPublicUrl(storageKey)
        : null,
    objectKey: storageKey,
    storageKey,
    visibility:
      normalizedVisibility,
    headers: {
      "Content-Type": contentType,
    },
  };
}

async function createPresignedImageUpload({
  key,
  contentType,
  expiresInSeconds = 900,
  visibility =
    STORAGE_VISIBILITY.PRIVATE,
}) {
  return createPresignedUpload({
    key,
    contentType,
    expiresInSeconds,
    visibility,
  });
}

async function createPresignedDownload({
  key,
  expiresInSeconds,
  visibility =
    STORAGE_VISIBILITY.PRIVATE,
}) {
  const normalizedVisibility =
    normalizeVisibility(visibility);

  const storageKey =
    cleanStorageKey(key);

  if (!storageKey) {
    throw new Error(
      "Object storage key is required",
    );
  }

  const client =
    requireClient(
      normalizedVisibility,
    );

  const bucket =
    requireBucket(
      normalizedVisibility,
    );

  const command =
    new GetObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    });

  return getSignedUrl(
    client,
    command,
    {
      expiresIn:
        safeSignedUrlTtl(
          expiresInSeconds,
          normalizedVisibility,
        ),
    },
  );
}

async function signGetUrl(
  key,
  expiresInSeconds,
  options = {},
) {
  if (!cleanStorageKey(key)) {
    return null;
  }

  return createPresignedDownload({
    key,
    expiresInSeconds,
    visibility:
      options.visibility ||
      STORAGE_VISIBILITY.PRIVATE,
  });
}

async function signPutUrl(
  key,
  contentType =
    "application/octet-stream",
  expiresInSeconds,
  options = {},
) {
  const upload =
    await createPresignedUpload({
      key,
      contentType,
      expiresInSeconds,
      visibility:
        options.visibility ||
        STORAGE_VISIBILITY.PRIVATE,
    });

  return upload.uploadUrl;
}

async function uploadObject({
  key,
  body,
  contentType =
    "application/octet-stream",
  cacheControl,
  visibility =
    STORAGE_VISIBILITY.PRIVATE,
}) {
  const normalizedVisibility =
    normalizeVisibility(visibility);

  const storageKey =
    cleanStorageKey(key);

  if (!storageKey) {
    throw new Error(
      "Object storage key is required",
    );
  }

  const client =
    requireClient(
      normalizedVisibility,
    );

  const bucket =
    requireBucket(
      normalizedVisibility,
    );

  const resolvedCacheControl =
    cacheControl ||
    (
      normalizedVisibility ===
        STORAGE_VISIBILITY.PUBLIC
        ? "public, max-age=31536000, immutable"
        : "private, no-store"
    );

  const command =
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
      CacheControl:
        resolvedCacheControl,
    });

  await client.send(command);

  return {
    publicUrl:
      normalizedVisibility ===
        STORAGE_VISIBILITY.PUBLIC
        ? buildPublicUrl(storageKey)
        : null,
    objectKey: storageKey,
    storageKey,
    visibility:
      normalizedVisibility,
  };
}

async function bodyToBuffer(body) {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (
    typeof body.transformToByteArray ===
    "function"
  ) {
    return Buffer.from(
      await body.transformToByteArray(),
    );
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

async function downloadObject(
  key,
  options = {},
) {
  const visibility =
    normalizeVisibility(
      options.visibility ||
      STORAGE_VISIBILITY.PRIVATE,
    );

  const storageKey =
    cleanStorageKey(key);

  if (!storageKey) {
    throw new Error(
      "Object storage key is required",
    );
  }

  const client =
    requireClient(visibility);

  const bucket =
    requireBucket(visibility);

  const response =
    await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: storageKey,
      }),
    );

  return {
    body:
      await bodyToBuffer(
        response.Body,
      ),
    contentType:
      String(
        response.ContentType ||
        "application/octet-stream",
      )
        .split(";")[0]
        .trim()
        .toLowerCase(),
    contentLength:
      Number(
        response.ContentLength || 0,
      ),
    objectKey: storageKey,
    storageKey,
    visibility,
  };
}

async function deleteObject(
  key,
  options = {},
) {
  const visibility =
    normalizeVisibility(
      options.visibility ||
      STORAGE_VISIBILITY.PRIVATE,
    );

  const storageKey =
    cleanStorageKey(key);

  if (!storageKey) {
    return;
  }

  const client =
    requireClient(visibility);

  const bucket =
    requireBucket(visibility);

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    }),
  );
}

module.exports = {
  STORAGE_VISIBILITY,
  buildPrivateObjectLocation,
  buildPublicUrl,
  cleanStorageKey,
  createPresignedDownload,
  createPresignedImageUpload,
  createPresignedUpload,
  deleteObject,
  downloadObject,
  getClient,
  getStorageConfig,
  isConfigured,
  signGetUrl,
  signPutUrl,
  uploadObject,
};
