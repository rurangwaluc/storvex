const {
  cacheGet,
  cacheIncrement,
  cacheKey,
} = require("../../lib/cache/cache");

const PUBLIC_PRODUCTS_GENERATION_KEY =
  cacheKey(
    "marketplace",
    "public",
    "products",
    "generation",
  );

async function getPublicProductsGeneration() {
  const value = await cacheGet(
    PUBLIC_PRODUCTS_GENERATION_KEY,
  );

  const generation = Number(value);

  return Number.isSafeInteger(generation) &&
    generation >= 0
    ? generation
    : 0;
}

async function invalidatePublicProductsCache() {
  return cacheIncrement(
    PUBLIC_PRODUCTS_GENERATION_KEY,
  );
}

module.exports = {
  getPublicProductsGeneration,
  invalidatePublicProductsCache,
  PUBLIC_PRODUCTS_GENERATION_KEY,
};
