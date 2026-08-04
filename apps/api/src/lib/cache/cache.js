const {
  connectRedis,
  getRedisClient,
} = require("./redisClient");

const DEFAULT_TTL_SECONDS = 60;
const CACHE_PREFIX = "storvex";
const inFlightLoads = new Map();

function cleanKeyPart(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9:._-]/g, "");
}

function cacheKey(...parts) {
  const normalized = parts
    .flat()
    .map(cleanKeyPart)
    .filter(Boolean);

  return [
    CACHE_PREFIX,
    ...normalized,
  ].join(":");
}

function validTtlSeconds(value) {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return DEFAULT_TTL_SECONDS;
  }

  return Math.floor(parsed);
}

async function readyClient() {
  await connectRedis();

  const client = getRedisClient();

  return client?.isReady
    ? client
    : null;
}

async function cacheGet(key) {
  try {
    const client = await readyClient();

    if (!client) {
      return null;
    }

    const value = await client.get(key);

    if (value == null) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(
      "Redis cache read failed:",
      error?.message || error,
    );

    return null;
  }
}

async function cacheSet(
  key,
  value,
  ttlSeconds = DEFAULT_TTL_SECONDS,
) {
  try {
    const client = await readyClient();

    if (!client) {
      return false;
    }

    await client.set(
      key,
      JSON.stringify(value),
      {
        EX: validTtlSeconds(ttlSeconds),
      },
    );

    return true;
  } catch (error) {
    console.error(
      "Redis cache write failed:",
      error?.message || error,
    );

    return false;
  }
}

async function cacheDelete(...keys) {
  try {
    const normalizedKeys = keys
      .flat()
      .map((key) => String(key || "").trim())
      .filter(Boolean);

    if (!normalizedKeys.length) {
      return 0;
    }

    const client = await readyClient();

    if (!client) {
      return 0;
    }

    return client.del(normalizedKeys);
  } catch (error) {
    console.error(
      "Redis cache deletion failed:",
      error?.message || error,
    );

    return 0;
  }
}

async function cacheIncrement(key) {
  try {
    const client = await readyClient();

    if (!client) {
      return 0;
    }

    return client.incr(key);
  } catch (error) {
    console.error(
      "Redis cache increment failed:",
      error?.message || error,
    );

    return 0;
  }
}

async function cacheRemember(
  key,
  ttlSeconds,
  loader,
) {
  const normalizedKey =
    String(key || "").trim();

  if (!normalizedKey) {
    throw new TypeError(
      "cacheRemember requires a cache key",
    );
  }

  if (typeof loader !== "function") {
    throw new TypeError(
      "cacheRemember requires a loader function",
    );
  }

  const cached =
    await cacheGet(normalizedKey);

  if (cached !== null) {
    return {
      value: cached,
      cache: "HIT",
    };
  }

  const existingLoad =
    inFlightLoads.get(normalizedKey);

  if (existingLoad) {
    return existingLoad;
  }

  const loadPromise = (async () => {
    const value = await loader();

    await cacheSet(
      normalizedKey,
      value,
      ttlSeconds,
    );

    return {
      value,
      cache: "MISS",
    };
  })();

  inFlightLoads.set(
    normalizedKey,
    loadPromise,
  );

  try {
    return await loadPromise;
  } finally {
    if (
      inFlightLoads.get(normalizedKey) ===
      loadPromise
    ) {
      inFlightLoads.delete(
        normalizedKey,
      );
    }
  }
}

module.exports = {
  DEFAULT_TTL_SECONDS,
  cacheDelete,
  cacheGet,
  cacheIncrement,
  cacheKey,
  cacheRemember,
  cacheSet,
};
