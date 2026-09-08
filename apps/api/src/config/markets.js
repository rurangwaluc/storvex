const countries = require("world-countries");
const timezoneLookup = require("@photostructure/tz-lookup");

const {
  DEFAULT_CAPABILITIES,
  marketPolicy,
} = require("./markets/policies");

const {
  marketReferenceOverride,
} = require("./markets/referenceOverrides");

function normalizeCountryCode(value) {
  return String(value || "").trim().toUpperCase();
}

function africaCountries() {
  return countries.filter(
    (country) =>
      country.region === "Africa" &&
      country.independent === true &&
      country.status === "officially-assigned",
  );
}

function countryCurrencyCode(country) {
  const override = marketReferenceOverride(country.cca2);

  if (override?.currencyCode) {
    return override.currencyCode;
  }

  const currencyCodes = Object.keys(country.currencies || {});

  if (currencyCodes.length === 1) {
    return currencyCodes[0];
  }

  throw new Error(
    `Market ${country.cca2} requires an explicit currency override`,
  );
}

function countryCallingCode(country) {
  const root = String(country.idd?.root || "").trim();
  const suffixes = Array.isArray(country.idd?.suffixes)
    ? country.idd.suffixes
    : [];

  if (!root || suffixes.length !== 1) {
    throw new Error(
      `Market ${country.cca2} requires an explicit calling-code override`,
    );
  }

  return `${root}${suffixes[0]}`;
}

function provisionalTimezone(country) {
  const coordinates = Array.isArray(country.latlng)
    ? country.latlng
    : [];

  const latitude = Number(coordinates[0]);
  const longitude = Number(coordinates[1]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(
      `Market ${country.cca2} has no usable geographic coordinates`,
    );
  }

  return timezoneLookup(latitude, longitude);
}

function marketRequiresReviewedPaymentTimezone(capabilities) {
  return Boolean(
    capabilities.subscriptionPaymentsEnabled ||
      capabilities.marketplacePaymentsEnabled ||
      capabilities.sellerPayoutsEnabled,
  );
}

function defineMarket(country) {
  const countryCode = normalizeCountryCode(country.cca2);
  const policy = marketPolicy(countryCode);
  const override = marketReferenceOverride(countryCode);

  const capabilities = Object.freeze({
    ...DEFAULT_CAPABILITIES,
    ...(policy.capabilities || {}),
  });

  if (
    marketRequiresReviewedPaymentTimezone(capabilities) &&
    !policy.defaultTimezone
  ) {
    throw new Error(
      `Enabled Storvex market ${countryCode} requires a reviewed defaultTimezone`,
    );
  }

  const defaultTimezone =
    policy.defaultTimezone ||
    override?.defaultTimezone ||
    provisionalTimezone(country);

  const phonePolicy = policy.phone || {};

  return Object.freeze({
    countryCode,
    countryName:
      override?.countryName ||
      country.name?.common ||
      countryCode,

    defaultCurrencyCode: countryCurrencyCode(country),
    defaultTimezone,

    locale:
      override?.locale ||
      `en-${countryCode}`,

    callingCode:
      override?.callingCode ||
      countryCallingCode(country),

    phone: Object.freeze({
      nationalPrefixes: Object.freeze([
        ...(phonePolicy.nationalPrefixes || []),
      ]),
      nationalLength:
        Number.isInteger(phonePolicy.nationalLength)
          ? phonePolicy.nationalLength
          : null,
    }),

    location: Object.freeze({
      structuredFieldsEnabled: true,
      schema:
        policy.locationSchema ||
        override?.locationSchema ||
        "LOCALITY_ADDRESS",
    }),

    capabilities,
  });
}

function buildMarketRegistry() {
  const registry = {};

  for (const country of africaCountries()) {
    const market = defineMarket(country);
    registry[market.countryCode] = market;
  }

  return Object.freeze(registry);
}

const MARKET_REGISTRY = buildMarketRegistry();

function getMarket(countryCode) {
  return MARKET_REGISTRY[normalizeCountryCode(countryCode)] || null;
}

function requireMarket(countryCode) {
  const market = getMarket(countryCode);

  if (market) {
    return market;
  }

  const error = new Error("Unsupported country market");
  error.status = 400;
  error.code = "MARKET_UNSUPPORTED";
  throw error;
}

function requireOnboardingMarket(countryCode) {
  const market = requireMarket(countryCode);

  if (market.capabilities.onboardingEnabled) {
    return market;
  }

  const error = new Error(
    "Storvex registration is not yet available in this country",
  );
  error.status = 400;
  error.code = "MARKET_ONBOARDING_DISABLED";
  throw error;
}

function getDefaultCurrencyForMarket(countryCode) {
  return requireMarket(countryCode).defaultCurrencyCode;
}

function getDefaultTimezoneForMarket(countryCode) {
  return requireMarket(countryCode).defaultTimezone;
}

function tenantMarketDefaults(countryCode) {
  const market = requireMarket(countryCode);

  return {
    countryCode: market.countryCode,
    currencyCode: market.defaultCurrencyCode,
    timezone: market.defaultTimezone,
  };
}

function hasCapability(countryCode, capability) {
  return Boolean(
    getMarket(countryCode)?.capabilities?.[capability],
  );
}

function publicMarket(market) {
  return {
    countryCode: market.countryCode,
    countryName: market.countryName,
    currencyCode: market.defaultCurrencyCode,
    timezone: market.defaultTimezone,
    locale: market.locale,
    callingCode: market.callingCode,
    phoneNationalPrefixes: [...market.phone.nationalPrefixes],
    phoneNationalLength: market.phone.nationalLength,
    onboardingEnabled: market.capabilities.onboardingEnabled,
    subscriptionPaymentsEnabled:
      market.capabilities.subscriptionPaymentsEnabled,
  };
}

function listPublicMarkets() {
  return Object.values(MARKET_REGISTRY)
    .map(publicMarket)
    .sort((a, b) =>
      a.countryName.localeCompare(b.countryName),
    );
}

function listPublicOnboardingMarkets() {
  return Object.values(MARKET_REGISTRY)
    .filter(
      (market) =>
        market.capabilities.onboardingEnabled,
    )
    .map(publicMarket)
    .sort((a, b) =>
      a.countryName.localeCompare(b.countryName),
    );
}

module.exports = {
  MARKET_REGISTRY,
  getMarket,
  requireMarket,
  requireOnboardingMarket,
  getDefaultCurrencyForMarket,
  getDefaultTimezoneForMarket,
  tenantMarketDefaults,

  isOnboardingEnabled: (code) =>
    hasCapability(code, "onboardingEnabled"),

  isMarketplaceEnabled: (code) =>
    hasCapability(code, "marketplaceEnabled"),

  isSubscriptionPaymentsEnabled: (code) =>
    hasCapability(code, "subscriptionPaymentsEnabled"),

  listPublicMarkets,
  listPublicOnboardingMarkets,
  publicMarket,
};
