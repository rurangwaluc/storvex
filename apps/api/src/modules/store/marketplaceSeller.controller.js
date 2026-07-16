const {
  getMarketplaceSellerProfile,
  getMarketplaceReadiness,
  updateMarketplaceSellerProfile,
} = require("./marketplaceSeller.service");

function tenantIdFromRequest(req) {
  return req.user?.tenantId || req.tenantId || null;
}

function sendError(res, error, fallback) {
  return res.status(error.status || 500).json({
    message: error.message || fallback,
    code: error.code || null,
    details: error.details || null,
  });
}

async function getMarketplaceProfile(req, res) {
  try {
    const tenantId = tenantIdFromRequest(req);
    const [{ tenant, profile }, readiness] = await Promise.all([
      getMarketplaceSellerProfile(tenantId),
      getMarketplaceReadiness(tenantId),
    ]);

    return res.json({
      profile,
      store: {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
        district: tenant.district,
        sector: tenant.sector,
        address: tenant.address,
        logoUrl: tenant.logoUrl,
      },
      readiness,
    });
  } catch (error) {
    console.error("getMarketplaceProfile error:", error);
    return sendError(
      res,
      error,
      "Failed to load Marketplace settings",
    );
  }
}

async function patchMarketplaceProfile(req, res) {
  try {
    const tenantId = tenantIdFromRequest(req);

    const profile = await updateMarketplaceSellerProfile(
      tenantId,
      req.body || {},
    );

    const readiness = await getMarketplaceReadiness(tenantId);

    return res.json({
      message: "Marketplace settings updated",
      profile,
      readiness,
    });
  } catch (error) {
    console.error("patchMarketplaceProfile error:", error);
    return sendError(
      res,
      error,
      "Failed to update Marketplace settings",
    );
  }
}

async function getMarketplaceProfileReadiness(req, res) {
  try {
    const readiness = await getMarketplaceReadiness(
      tenantIdFromRequest(req),
    );

    return res.json({ readiness });
  } catch (error) {
    console.error(
      "getMarketplaceProfileReadiness error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to load Marketplace readiness",
    );
  }
}

module.exports = {
  getMarketplaceProfile,
  patchMarketplaceProfile,
  getMarketplaceProfileReadiness,
};
