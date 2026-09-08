const { requireMarket } = require("../markets");

const DEFAULT_CYCLE_KEY = "M1";

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function nonNegativeInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.round(parsed);
}

function envAmount(countryCode, planKey, fallback, legacyEnvName = null) {
  const marketEnvName =
    `${normalizeCode(countryCode)}_${normalizeCode(planKey)}_PRICE`;

  const marketValue = process.env[marketEnvName];

  if (marketValue != null && String(marketValue).trim() !== "") {
    return nonNegativeInteger(marketValue, fallback);
  }

  // Temporary backwards compatibility for the existing Rwanda deployment.
  if (
    countryCode === "RW" &&
    legacyEnvName &&
    process.env[legacyEnvName] != null &&
    String(process.env[legacyEnvName]).trim() !== ""
  ) {
    return nonNegativeInteger(process.env[legacyEnvName], fallback);
  }

  return fallback;
}

function freezePrices(prices) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(prices).map(([planKey, cycles]) => [
        planKey,
        Object.freeze({ ...cycles }),
      ]),
    ),
  );
}

/**
 * Storvex subscription pricing v1.
 *
 * Rules:
 * - Country decides the price book.
 * - Currency comes from the country market.
 * - No live FX conversion.
 * - No browser-selected currency.
 * - Every price below is an explicit approved local-market amount.
 * - Payment-provider availability remains separate from pricing availability.
 */
const APPROVED_PRICE_BOOK_INPUTS = Object.freeze({
  DZ: ["DZD", 900, 2200, 4000],
  AO: ["AOA", 7500, 18000, 32500],
  BJ: ["XOF", 5000, 12500, 22500],
  BW: ["BWP", 99, 249, 449],
  BF: ["XOF", 5000, 12500, 22500],
  BI: ["BIF", 20000, 50000, 90000],
  CV: ["CVE", 750, 1800, 3250],
  CM: ["XAF", 5000, 12500, 22500],
  CF: ["XAF", 4000, 10000, 18000],
  TD: ["XAF", 4000, 10000, 18000],
  KM: ["KMF", 3500, 8500, 15000],
  CD: ["CDF", 20000, 50000, 90000],
  CG: ["XAF", 5000, 12500, 22500],
  CI: ["XOF", 5000, 12500, 22500],
  DJ: ["DJF", 1250, 3000, 5500],
  EG: ["EGP", 299, 749, 1349],
  GQ: ["XAF", 5000, 12500, 22500],
  ER: ["ERN", 100, 250, 450],
  SZ: ["SZL", 129, 299, 549],
  ET: ["ETB", 1500, 3500, 6500],
  GA: ["XAF", 5000, 12500, 22500],
  GM: ["GMD", 500, 1200, 2200],
  GH: ["GHS", 99, 249, 449],
  GN: ["GNF", 60000, 150000, 270000],
  GW: ["XOF", 4000, 10000, 18000],
  KE: ["KES", 1500, 3500, 6500],
  LS: ["LSL", 129, 299, 549],
  LR: ["LRD", 1500, 3500, 6500],
  LY: ["LYD", 35, 85, 150],
  MG: ["MGA", 35000, 85000, 150000],
  MW: ["MWK", 12500, 30000, 55000],
  ML: ["XOF", 4000, 10000, 18000],
  MR: ["MRU", 275, 675, 1200],
  MU: ["MUR", 299, 749, 1349],
  MA: ["MAD", 79, 199, 349],
  MZ: ["MZN", 500, 1250, 2250],
  NA: ["NAD", 149, 349, 649],
  NE: ["XOF", 4000, 10000, 18000],
  NG: ["NGN", 7500, 17500, 32500],
  RW: ["RWF", 10000, 25000, 45000],
  ST: ["STN", 175, 425, 775],
  SN: ["XOF", 5000, 12500, 22500],
  SC: ["SCR", 99, 249, 449],
  SL: ["SLE", 175, 425, 775],
  SO: ["SOS", 4500, 11000, 20000],
  ZA: ["ZAR", 149, 349, 649],
  SS: ["SSP", 7500, 18000, 32500],
  SD: ["SDG", 4500, 11000, 20000],
  TZ: ["TZS", 25000, 60000, 110000],
  TG: ["XOF", 5000, 12500, 22500],
  TN: ["TND", 25, 60, 110],
  UG: ["UGX", 30000, 75000, 135000],
  ZM: ["ZMW", 199, 499, 899],
  ZW: ["ZWG", 199, 499, 899],
});

function buildPriceBook(countryCode, input) {
  const [
    currencyCode,
    starterPrice,
    growthPrice,
    businessPrice,
  ] = input;

  return Object.freeze({
    countryCode,
    currencyCode,

    prices: freezePrices({
      LAUNCH_STARTER: {
        [DEFAULT_CYCLE_KEY]: envAmount(
          countryCode,
          "LAUNCH_STARTER",
          starterPrice,
          countryCode === "RW" ? "LAUNCH_STARTER_PRICE" : null,
        ),
      },

      LAUNCH_GROWTH: {
        [DEFAULT_CYCLE_KEY]: envAmount(
          countryCode,
          "LAUNCH_GROWTH",
          growthPrice,
          countryCode === "RW" ? "LAUNCH_GROWTH_PRICE" : null,
        ),
      },

      LAUNCH_BUSINESS: {
        [DEFAULT_CYCLE_KEY]: envAmount(
          countryCode,
          "LAUNCH_BUSINESS",
          businessPrice,
          countryCode === "RW" ? "LAUNCH_BUSINESS_PRICE" : null,
        ),
      },
    }),
  });
}

const SUBSCRIPTION_PRICE_BOOKS = Object.freeze(
  Object.fromEntries(
    Object.entries(APPROVED_PRICE_BOOK_INPUTS).map(
      ([countryCode, input]) => [
        countryCode,
        buildPriceBook(countryCode, input),
      ],
    ),
  ),
);

function getSubscriptionPriceBook(countryCode) {
  const code = normalizeCode(countryCode);

  return SUBSCRIPTION_PRICE_BOOKS[code] || null;
}

function hasSubscriptionPriceBook(countryCode) {
  return Boolean(getSubscriptionPriceBook(countryCode));
}

function requireSubscriptionPriceBook(countryCode) {
  const market = requireMarket(countryCode);
  const priceBook = getSubscriptionPriceBook(market.countryCode);

  if (!priceBook) {
    const error = new Error(
      "Storvex subscription pricing is not configured for this country",
    );

    error.status = 400;
    error.code = "SUBSCRIPTION_PRICE_BOOK_NOT_CONFIGURED";
    error.countryCode = market.countryCode;

    throw error;
  }

  if (priceBook.countryCode !== market.countryCode) {
    throw new Error(
      `Subscription price book country mismatch for ${market.countryCode}`,
    );
  }

  if (priceBook.currencyCode !== market.defaultCurrencyCode) {
    throw new Error(
      `Subscription price book currency mismatch for ${market.countryCode}: ` +
        `${priceBook.currencyCode} != ${market.defaultCurrencyCode}`,
    );
  }

  return priceBook;
}

function getSubscriptionPlanPrice({
  countryCode,
  planKey,
  cycleKey = DEFAULT_CYCLE_KEY,
}) {
  const priceBook = requireSubscriptionPriceBook(countryCode);

  const normalizedPlanKey = normalizeCode(planKey);
  const normalizedCycleKey = normalizeCode(cycleKey);

  const amount =
    priceBook.prices?.[normalizedPlanKey]?.[normalizedCycleKey];

  if (!Number.isInteger(amount) || amount < 0) {
    return null;
  }

  return Object.freeze({
    countryCode: priceBook.countryCode,
    currencyCode: priceBook.currencyCode,
    amount,
    planKey: normalizedPlanKey,
    cycleKey: normalizedCycleKey,
  });
}

function requireSubscriptionPlanPrice({
  countryCode,
  planKey,
  cycleKey = DEFAULT_CYCLE_KEY,
}) {
  const price = getSubscriptionPlanPrice({
    countryCode,
    planKey,
    cycleKey,
  });

  if (price) {
    return price;
  }

  const error = new Error(
    "Storvex subscription pricing is not configured for this plan",
  );

  error.status = 400;
  error.code = "SUBSCRIPTION_PLAN_PRICE_NOT_CONFIGURED";
  error.countryCode = normalizeCode(countryCode);
  error.planKey = normalizeCode(planKey);
  error.cycleKey = normalizeCode(cycleKey);

  throw error;
}

function listSubscriptionPriceBooks() {
  return Object.values(SUBSCRIPTION_PRICE_BOOKS);
}

module.exports = {
  DEFAULT_CYCLE_KEY,
  SUBSCRIPTION_PRICE_BOOKS,

  getSubscriptionPriceBook,
  hasSubscriptionPriceBook,
  requireSubscriptionPriceBook,

  getSubscriptionPlanPrice,
  requireSubscriptionPlanPrice,

  listSubscriptionPriceBooks,
};
