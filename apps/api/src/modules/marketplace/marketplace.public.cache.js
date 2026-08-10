const crypto = require("crypto");

const {
  cacheGet,
  cacheIncrement,
  cacheKey,
} = require("../../lib/cache/cache");

/*
 * One generation controls every anonymous/public Marketplace read.
 *
 * Product stock, publication state, images, seller visibility and
 * fulfilment settings can affect several public endpoints at once.
 * A shared generation keeps invalidation correct without deleting or
 * scanning Redis keys.
 */
const PUBLIC_MARKETPLACE_GENERATION_KEY =
  cacheKey(
    "marketplace",
    "public",
    "generation",
  );

function normalizedPublicQuery(query = {}) {
  return Object.entries(query || {})
    .filter(([, value]) =>
      value !== undefined &&
      value !== null,
    )
    .map(([key, value]) => [
      String(key),
      Array.isArray(value)
        ? value.map(String)
        : String(value),
    ])
    .sort(([left], [right]) =>
      left.localeCompare(right),
    );
}

function normalizedIdentity(identity = []) {
  const values = Array.isArray(identity)
    ? identity
    : [identity];

  return values.map((value) =>
    String(value ?? "").trim(),
  );
}

function publicMarketplaceCacheDigest({
  identity = [],
  query = {},
} = {}) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        identity:
          normalizedIdentity(identity),
        query:
          normalizedPublicQuery(query),
      }),
    )
    .digest("hex")
    .slice(0, 32);
}

async function getPublicMarketplaceGeneration() {
  const value = await cacheGet(
    PUBLIC_MARKETPLACE_GENERATION_KEY,
  );

  const generation = Number(value);

  return Number.isSafeInteger(generation) &&
    generation >= 0
    ? generation
    : 0;
}

async function publicMarketplaceCacheKey(
  resource,
  {
    identity = [],
    query = {},
  } = {},
) {
  const generation =
    await getPublicMarketplaceGeneration();

  return cacheKey(
    "marketplace",
    "public",
    resource,
    "v2",
    generation,
    publicMarketplaceCacheDigest({
      identity,
      query,
    }),
  );
}

async function invalidatePublicMarketplaceCache() {
  return cacheIncrement(
    PUBLIC_MARKETPLACE_GENERATION_KEY,
  );
}

/*
 * Backward-compatible aliases.
 *
 * Existing inventory, seller, Image Studio and Marketplace-order
 * mutation paths already call these product-named helpers. Keeping
 * the aliases means those paths now invalidate the complete public
 * Marketplace cache without requiring risky cross-module edits.
 */
const getPublicProductsGeneration =
  getPublicMarketplaceGeneration;

const invalidatePublicProductsCache =
  invalidatePublicMarketplaceCache;

const PUBLIC_PRODUCTS_GENERATION_KEY =
  PUBLIC_MARKETPLACE_GENERATION_KEY;

module.exports = {
  getPublicMarketplaceGeneration,
  invalidatePublicMarketplaceCache,
  publicMarketplaceCacheKey,
  publicMarketplaceCacheDigest,
  PUBLIC_MARKETPLACE_GENERATION_KEY,

  // Backward compatibility for existing mutation call sites.
  getPublicProductsGeneration,
  invalidatePublicProductsCache,
  PUBLIC_PRODUCTS_GENERATION_KEY,
};
