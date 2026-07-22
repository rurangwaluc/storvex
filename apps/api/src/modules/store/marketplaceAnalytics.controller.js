const {
  getMarketplaceAnalytics,
} = require("../marketplace/marketplace.analytics.service");

function tenantIdFromRequest(req) {
  return (
    req.user?.tenantId ||
    req.tenantId ||
    null
  );
}

function sendError(
  res,
  error,
  fallback,
) {
  return res
    .status(error.status || 500)
    .json({
      message:
        error.message || fallback,
      code:
        error.code || null,
      details:
        error.details || null,
    });
}

async function getMarketplaceAnalyticsController(
  req,
  res,
) {
  try {
    const analytics =
      await getMarketplaceAnalytics(
        tenantIdFromRequest(req),
        req.query || {},
      );

    return res.json({
      analytics,
    });
  } catch (error) {
    console.error(
      "getMarketplaceAnalytics error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to load Marketplace analytics",
    );
  }
}

module.exports = {
  getMarketplaceAnalytics:
    getMarketplaceAnalyticsController,
};
