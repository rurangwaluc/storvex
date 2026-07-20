const {
  submitMarketplaceRequest,
} = require("./marketplace.request.service");

const {
  getTrackedMarketplaceOrder,
} = require("./marketplace.tracking.service");

const {
  listPublicStores,
  getPublicStore,
  getPublicProduct,
  listPublicProducts,
} = require("./marketplace.public.service");

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
    const result = await listPublicProducts(req.query || {});
    return res.json(result);
  } catch (error) {
    return sendError(
      res,
      error,
      "Failed to load Marketplace products",
    );
  }
}


async function trackRequest(req, res) {
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
  trackRequest,
  listStores,
  getStore,
  getProduct,
  listProducts,
};
