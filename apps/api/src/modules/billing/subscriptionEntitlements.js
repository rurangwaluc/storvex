const { getPlanSnapshot } = require("../../config/plans");

function isPlainObject(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function cloneObject(value) {
  return isPlainObject(value) ? { ...value } : null;
}

function getPlanEntitlements(planKey) {
  const snapshot = getPlanSnapshot(planKey);

  return cloneObject(snapshot?.entitlements) || {};
}

function buildEntitlementSnapshot(planOrSnapshot) {
  if (!planOrSnapshot) return {};

  const direct = cloneObject(planOrSnapshot.entitlements);
  if (direct) return direct;

  const planKey =
    planOrSnapshot.planKey ||
    planOrSnapshot.key ||
    null;

  return planKey ? getPlanEntitlements(planKey) : {};
}

function resolveSubscriptionEntitlements(subscription) {
  if (!subscription) return {};

  const purchased = cloneObject(subscription.entitlementSnapshot);

  if (purchased) {
    return purchased;
  }

  return getPlanEntitlements(subscription.planKey);
}

function serializeSubscriptionEntitlements(subscription) {
  const entitlements = resolveSubscriptionEntitlements(subscription);

  return {
    ...entitlements,

    marketplaceEnabled:
      entitlements.marketplaceEnabled !== false,

    marketplaceCommissionEnabled: false,
    sellerManagedDelivery: true,
    deliveryAreaLimit: null,
    marketplaceOrderLimit: null,

    imageStudioEnabled:
      entitlements.imageStudioEnabled !== false,

    imageStudioUsageDisplayedToSeller: false,
  };
}

module.exports = {
  buildEntitlementSnapshot,
  getPlanEntitlements,
  resolveSubscriptionEntitlements,
  serializeSubscriptionEntitlements,
};
