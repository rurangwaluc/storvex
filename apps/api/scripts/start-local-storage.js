"use strict";

require("dotenv").config({
  path: require("node:path").resolve(
    __dirname,
    "../.env",
  ),
});

const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const S3rver = require("s3rver");

const {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  S3Client,
} = require("@aws-sdk/client-s3");

const ADDRESS = "127.0.0.1";
const PORT = 4569;
const ENDPOINT =
  `http://${ADDRESS}:${PORT}`;

const PRIVATE_BUCKET =
  process.env
    .OBJECT_STORAGE_PRIVATE_BUCKET ||
  process.env.R2_PRIVATE_BUCKET ||
  process.env.OBJECT_STORAGE_BUCKET ||
  process.env.R2_BUCKET ||
  "storvex-private";

const PUBLIC_BUCKET =
  process.env
    .OBJECT_STORAGE_PUBLIC_BUCKET ||
  process.env.R2_PUBLIC_BUCKET ||
  "storvex-public";

const storageDirectory =
  path.resolve(
    __dirname,
    "../.local/s3",
  );

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://100.115.92.202:3000",
];

function createClient() {
  return new S3Client({
    endpoint: ENDPOINT,
    region: "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: "S3RVER",
      secretAccessKey: "S3RVER",
    },
  });
}

function isPortOpen({
  host,
  port,
  timeoutMs = 1000,
}) {
  return new Promise((resolve) => {
    const socket =
      net.createConnection({
        host,
        port,
      });

    let settled = false;

    function finish(result) {
      if (settled) return;

      settled = true;
      socket.destroy();
      resolve(result);
    }

    socket.setTimeout(
      timeoutMs,
    );

    socket.once(
      "connect",
      () => finish(true),
    );

    socket.once(
      "timeout",
      () => finish(false),
    );

    socket.once(
      "error",
      () => finish(false),
    );
  });
}

function storageResponds() {
  return new Promise((resolve) => {
    const request =
      http.get(
        `${ENDPOINT}/`,
        (response) => {
          response.resume();

          resolve(
            response.statusCode >= 200 &&
              response.statusCode < 500,
          );
        },
      );

    request.setTimeout(
      2000,
      () => {
        request.destroy();
        resolve(false);
      },
    );

    request.once(
      "error",
      () => resolve(false),
    );
  });
}

async function ensureBucket(
  client,
  bucket,
) {
  try {
    await client.send(
      new HeadBucketCommand({
        Bucket: bucket,
      }),
    );

    console.log(
      `Bucket ready: ${bucket}`,
    );
  } catch {
    await client.send(
      new CreateBucketCommand({
        Bucket: bucket,
      }),
    );

    console.log(
      `Bucket created: ${bucket}`,
    );
  }
}

async function configureBucketCors(
  client,
  bucket,
) {
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins:
              allowedOrigins,
            AllowedMethods: [
              "GET",
              "HEAD",
              "PUT",
              "POST",
              "DELETE",
            ],
            AllowedHeaders: [
              "*",
            ],
            ExposeHeaders: [
              "ETag",
            ],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );

  console.log(
    `Browser uploads enabled: ${bucket}`,
  );
}

async function prepareStorage() {
  const client =
    createClient();

  try {
    await ensureBucket(
      client,
      PRIVATE_BUCKET,
    );

    await ensureBucket(
      client,
      PUBLIC_BUCKET,
    );

    await configureBucketCors(
      client,
      PRIVATE_BUCKET,
    );

    await configureBucketCors(
      client,
      PUBLIC_BUCKET,
    );
  } finally {
    client.destroy();
  }
}

function printReady({
  existing = false,
} = {}) {
  console.log("");

  console.log(
    existing
      ? "Local object storage is already running."
      : "Local object storage is ready.",
  );

  console.log(
    `Endpoint: ${ENDPOINT}`,
  );

  console.log(
    `Private bucket: ${PRIVATE_BUCKET}`,
  );

  console.log(
    `Public bucket: ${PUBLIC_BUCKET}`,
  );

  console.log(
    `Allowed browser origins: ${allowedOrigins.join(
      ", ",
    )}`,
  );

  console.log("");
}

async function main() {
  const portOpen =
    await isPortOpen({
      host: ADDRESS,
      port: PORT,
    });

  if (portOpen) {
    const healthy =
      await storageResponds();

    if (!healthy) {
      throw new Error(
        `Port ${PORT} is occupied by a process that does not respond like local object storage.`,
      );
    }

    await prepareStorage();

    printReady({
      existing: true,
    });

    console.log(
      "The existing storage process remains responsible for keeping the service available.",
    );

    return;
  }

  console.log(
    `Starting local object storage at ${ENDPOINT}`,
  );

  console.log(
    `Storage directory: ${storageDirectory}`,
  );

  const server =
    new S3rver({
      address: ADDRESS,
      port: PORT,
      directory:
        storageDirectory,
      resetOnClose: false,
      allowMismatchedSignatures:
        false,
      vhostBuckets: false,
      silent: false,
    });

  let stopping = false;

  async function stop(signal) {
    if (stopping) return;

    stopping = true;

    console.log(
      `\nStopping local object storage (${signal})...`,
    );

    try {
      await server.close();
    } catch (error) {
      console.error(
        "Failed to close local object storage cleanly:",
        error,
      );
    }

    process.exit(0);
  }

  process.once(
    "SIGINT",
    () => {
      void stop("SIGINT");
    },
  );

  process.once(
    "SIGTERM",
    () => {
      void stop("SIGTERM");
    },
  );

  process.once(
    "SIGHUP",
    () => {
      void stop("SIGHUP");
    },
  );

  await server.run();

  try {
    await prepareStorage();
  } catch (error) {
    await server.close();
    throw error;
  }

  printReady();

  console.log(
    "Keep this terminal open while using Storvex.",
  );
}

main().catch((error) => {
  console.error(
    "\nLocal storage startup failed:",
  );

  console.error(error);

  process.exit(1);
});
