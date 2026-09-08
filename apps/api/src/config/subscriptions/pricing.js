const {
  getTrialPlan,
  getPaidPlans,
  getPlanByKey,
  getPlanSnapshot,
  isTrialPlanKey,
  isEnterprisePlanKey,
} = require("../plans");

const {
  requireMarket,
} = require("../markets");

const {
  hasSubscriptionPriceBook,
  requireSubscriptionPriceBook,
  requireSubscriptionPlanPrice,
} = require("./priceBooks");

function resolvedPlanKey(plan) {
  return String(plan?.key || plan?.planKey || "")
    .trim()
    .toUpperCase();
}

function resolvedCycleKey(plan) {
  return String(plan?.cycleKey || "M1")
    .trim()
    .toUpperCase();
}

function freePlanForMarket(plan, countryCode) {
  const market = requireMarket(countryCode);

  return {
    ...plan,
    price: 0,
    currency: market.defaultCurrencyCode,
    countryCode: market.countryCode,
  };
}

function withMarketPricing(plan, countryCode) {
  if (!plan) return null;

  const planKey = resolvedPlanKey(plan);

  if (!planKey) {
    const error = new Error(
      "Subscription plan identity is missing",
    );

    error.status = 500;
    error.code = "SUBSCRIPTION_PLAN_IDENTITY_MISSING";

    throw error;
  }

  if (
    isTrialPlanKey(planKey) ||
    isEnterprisePlanKey(planKey)
  ) {
    return freePlanForMarket(plan, countryCode);
  }

  const cycleKey = resolvedCycleKey(plan);

  const price = requireSubscriptionPlanPrice({
    countryCode,
    planKey,
    cycleKey,
  });

  return {
    ...plan,
    price: price.amount,
    currency: price.currencyCode,
    countryCode: price.countryCode,
  };
}

function getTrialPlanForMarket(countryCode) {
  return freePlanForMarket(
    getTrialPlan(),
    countryCode,
  );
}

function getPaidPlansForMarket(countryCode) {
  requireSubscriptionPriceBook(countryCode);

  return getPaidPlans().map((plan) =>
    withMarketPricing(plan, countryCode),
  );
}

function getPlanForMarket(planKey, countryCode) {
  const plan = getPlanByKey(planKey);

  if (!plan) return null;

  return withMarketPricing(plan, countryCode);
}

function getPlanSnapshotForMarket(
  planKey,
  countryCode,
) {
  const snapshot = getPlanSnapshot(planKey);

  if (!snapshot) return null;

  return withMarketPricing(
    snapshot,
    countryCode,
  );
}

function getOnboardingCatalogueForMarket(
  countryCode,
) {
  const market = requireMarket(countryCode);
  const paidPricingAvailable =
    hasSubscriptionPriceBook(market.countryCode);

  return {
    countryCode: market.countryCode,
    currencyCode: market.defaultCurrencyCode,
    paidPricingAvailable,
    trial: getTrialPlanForMarket(
      market.countryCode,
    ),
    plans: paidPricingAvailable
      ? getPaidPlansForMarket(
          market.countryCode,
        )
      : [],
  };
}

function getSubscriptionCatalogueForMarket(
  countryCode,
) {
  const priceBook =
    requireSubscriptionPriceBook(countryCode);

  return {
    countryCode: priceBook.countryCode,
    currencyCode: priceBook.currencyCode,
    paidPricingAvailable: true,
    trial: getTrialPlanForMarket(
      priceBook.countryCode,
    ),
    plans: getPaidPlansForMarket(
      priceBook.countryCode,
    ),
  };
}

module.exports = {
  withMarketPricing,

  getTrialPlanForMarket,
  getPaidPlansForMarket,
  getPlanForMarket,
  getPlanSnapshotForMarket,

  getOnboardingCatalogueForMarket,
  getSubscriptionCatalogueForMarket,
};
