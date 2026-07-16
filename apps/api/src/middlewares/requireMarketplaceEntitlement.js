function marketplaceEntitlements(req) {
  return (
    req.subscriptionMeta?.entitlements ||
    req.subscription?.entitlementSnapshot ||
    {}
  );
}

function requireMarketplaceEntitlement(req, res, next) {
  const entitlements = marketplaceEntitlements(req);

  if (entitlements.marketplaceEnabled === false) {
    return res.status(403).json({
      message: "Marketplace access is not included for this account.",
      code: "MARKETPLACE_NOT_INCLUDED",
    });
  }

  return next();
}

module.exports = {
  marketplaceEntitlements,
  requireMarketplaceEntitlement,
};
