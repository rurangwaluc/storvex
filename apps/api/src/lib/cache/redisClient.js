const { createClient } = require("redis");

let redisClient = null;
let connectionPromise = null;
let lastConnectionError = null;

function cleanString(value) {
  return String(value || "").trim();
}

function redisUrl() {
  return cleanString(process.env.REDIS_URL);
}

function redisConfigured() {
  return Boolean(redisUrl());
}

function createRedisClient() {
  const url = redisUrl();

  if (!url) {
    return null;
  }

  const client = createClient({
    url,
    socket: {
      connectTimeout: 5_000,
      reconnectStrategy(retries) {
        if (retries >= 8) {
          return new Error(
            "Redis reconnect limit reached",
          );
        }

        return Math.min(
          250 * 2 ** retries,
          5_000,
        );
      },
    },
  });

  client.on("error", (error) => {
    lastConnectionError = error;

    console.error(
      "Redis client error:",
      error?.message || error,
    );
  });

  client.on("ready", () => {
    lastConnectionError = null;
    console.log("Redis cache connected");
  });

  client.on("reconnecting", () => {
    console.warn(
      "Redis cache reconnecting",
    );
  });

  client.on("end", () => {
    console.warn(
      "Redis cache connection closed",
    );
  });

  return client;
}

function getRedisClient() {
  if (!redisConfigured()) {
    return null;
  }

  if (!redisClient) {
    redisClient = createRedisClient();
  }

  return redisClient;
}

async function connectRedis() {
  const client = getRedisClient();

  if (!client) {
    return {
      configured: false,
      connected: false,
      ready: false,
    };
  }

  if (client.isReady) {
    return {
      configured: true,
      connected: true,
      ready: true,
    };
  }

  if (!connectionPromise) {
    connectionPromise = (
      client.isOpen
        ? Promise.resolve()
        : client.connect()
    )
      .catch((error) => {
        lastConnectionError = error;

        console.error(
          "Redis cache unavailable; continuing without cache:",
          error?.message || error,
        );
      })
      .finally(() => {
        connectionPromise = null;
      });
  }

  await connectionPromise;

  return redisStatus();
}

async function disconnectRedis() {
  const client = redisClient;

  redisClient = null;
  connectionPromise = null;

  if (!client?.isOpen) {
    return;
  }

  try {
    await client.quit();
  } catch (error) {
    console.error(
      "Failed to close Redis cleanly:",
      error?.message || error,
    );

    client.destroy();
  }
}

function redisStatus() {
  const client = redisClient;

  return {
    configured: redisConfigured(),
    connected: Boolean(client?.isOpen),
    ready: Boolean(client?.isReady),
    error: lastConnectionError
      ? lastConnectionError.message
      : null,
  };
}

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  redisConfigured,
  redisStatus,
};
