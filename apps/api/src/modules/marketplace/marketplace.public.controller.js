const {
  submitMarketplaceRequest,
} = require("./marketplace.request.service");

const {
  getTrackedMarketplaceOrder,
} = require("./marketplace.tracking.service");

const {
  recordMarketplaceAnalyticsEvent,
} = require("./marketplace.analytics.service");

const {
  listPublicStores,
  getPublicStore,
  getPublicProduct,
  listPublicProducts,
  getPublicMarketplaceCatalogue,
} = require("./marketplace.public.service");
const crypto = require("crypto");
const {
  cacheKey,
  cacheRemember,
} = require("../../lib/cache/cache");
const {
  getPublicProductsGeneration,
} = require("./marketplace.public.cache");

function positiveInteger(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) &&
    number > 0
    ? Math.floor(number)
    : fallback;
}

const PUBLIC_PRODUCTS_CACHE_TTL_SECONDS =
  positiveInteger(
    process.env
      .MARKETPLACE_PUBLIC_PRODUCTS_CACHE_TTL_SECONDS,
    30,
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

async function publicProductsCacheKey(query) {
  const generation =
    await getPublicProductsGeneration();

  const digest = crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        normalizedPublicQuery(query),
      ),
    )
    .digest("hex")
    .slice(0, 32);

  return cacheKey(
    "marketplace",
    "public",
    "products",
    "v1",
    generation,
    digest,
  );
}

function sendError(res, error, fallback) {
  console.error(fallback, error);

  return res.status(error.status || 500).json({
    message: error.message || fallback,
    code: error.code || null,
    details: error.details || null,
  });
}

async function listStores(req, res) {
  try {
    const result = await listPublicStores(req.query || {});
    return res.json(result);
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to load Marketplace stores",
    );
  }
}

async function getStore(req, res) {
  try {
    const result = await getPublicStore(
      req.params.storeSlug,
      req.query || {},
    );

    if (!result) {
      return res.status(404).json({
        message: "Marketplace store not found",
        code: "MARKETPLACE_STORE_NOT_FOUND",
      });
    }

    return res.json(result);
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to load Marketplace store",
    );
  }
}

async function getProduct(req, res) {
  try {
    const result = await getPublicProduct(
      req.params.storeSlug,
      req.params.productSlug,
    );

    if (!result) {
      return res.status(404).json({
        message: "Marketplace product not found",
        code: "MARKETPLACE_PRODUCT_NOT_FOUND",
      });
    }

    return res.json(result);
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to load Marketplace product",
    );
  }
}

async function listProducts(req, res) {
  try {
    const query = req.query || {};

    const { value, cache } =
      await cacheRemember(
        await publicProductsCacheKey(query),
        PUBLIC_PRODUCTS_CACHE_TTL_SECONDS,
        () => listPublicProducts(query),
      );

    res.set(
      "X-Storvex-Cache",
      cache,
    );

    return res.json(value);
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to load Marketplace products",
    );
  }
}

function getCatalogue(req, res) {
  try {
    return res.json(
      getPublicMarketplaceCatalogue(),
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to load Marketplace categories",
    );
  }
}

async function recordAnalyticsEvent(req, res) {
  try {
    const result =
      await recordMarketplaceAnalyticsEvent(
        req.body || {},
        {
          marketplaceCustomerId:
            req.marketplaceCustomer?.id ||
            null,
        },
      );

    return res.status(
      result.recorded ? 201 : 200,
    ).json(result);
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to record Marketplace activity",
    );
  }
}

async function trackRequest(req, res) {
  res.set({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });

  try {
    const order =
      await getTrackedMarketplaceOrder(
        req.params.trackingToken,
      );

    if (!order) {
      return res.status(404).json({
        message:
          "This order tracking link was not found.",
        code:
          "MARKETPLACE_ORDER_TRACKING_NOT_FOUND",
      });
    }

    return res.json({
      order,
    });
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to load order tracking",
    );
  }
}

async function createRequest(req, res) {
  try {
    const result =
      await submitMarketplaceRequest(
        req.body || {},
        {
          marketplaceCustomerId:
            req.marketplaceCustomer?.id ||
            null,
        },
      );

    return res
      .status(result.created ? 201 : 200)
      .json(result);
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to submit order request",
    );
  }
}

module.exports = {
  createRequest,
  recordAnalyticsEvent,
  trackRequest,
  listStores,
  getStore,
  getProduct,
  listProducts,
  getCatalogue,
};
