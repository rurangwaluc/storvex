const MARKET_REGISTRY = Object.freeze({
  RW: Object.freeze({
    countryCode: "RW",
    countryName: "Rwanda",
    defaultCurrencyCode: "RWF",
    defaultTimezone: "Africa/Kigali",
    locale: "en-RW",
    callingCode: "+250",
    phone: Object.freeze({ nationalPrefixes: ["07"], nationalLength: 10 }),
    location: Object.freeze({ structuredFieldsEnabled: true, schema: "DISTRICT_SECTOR" }),
    capabilities: Object.freeze({
      onboardingEnabled: true,
      internalAppEnabled: true,
      marketplaceEnabled: true,
      subscriptionPaymentsEnabled: true,
      marketplacePaymentsEnabled: false,
      sellerPayoutsEnabled: false,
      seoEnabled: true,
    }),
  }),
  UG: Object.freeze({
    countryCode: "UG",
    countryName: "Uganda",
    defaultCurrencyCode: "UGX",
    defaultTimezone: "Africa/Kampala",
    locale: "en-UG",
    callingCode: "+256",
    phone: Object.freeze({ nationalPrefixes: ["07"], nationalLength: 10 }),
    location: Object.freeze({ structuredFieldsEnabled: true, schema: "LOCALITY_ADDRESS" }),
    capabilities: Object.freeze({
      onboardingEnabled: false,
      internalAppEnabled: false,
      marketplaceEnabled: false,
      subscriptionPaymentsEnabled: false,
      marketplacePaymentsEnabled: false,
      sellerPayoutsEnabled: false,
      seoEnabled: false,
    }),
  }),
  KE: Object.freeze({
    countryCode: "KE",
    countryName: "Kenya",
    defaultCurrencyCode: "KES",
    defaultTimezone: "Africa/Nairobi",
    locale: "en-KE",
    callingCode: "+254",
    phone: Object.freeze({ nationalPrefixes: ["07", "01"], nationalLength: 10 }),
    location: Object.freeze({ structuredFieldsEnabled: true, schema: "LOCALITY_ADDRESS" }),
    capabilities: Object.freeze({
      onboardingEnabled: false,
      internalAppEnabled: false,
      marketplaceEnabled: false,
      subscriptionPaymentsEnabled: false,
      marketplacePaymentsEnabled: false,
      sellerPayoutsEnabled: false,
      seoEnabled: false,
    }),
  }),
});

function normalizeCountryCode(value) {
  return String(value || "").trim().toUpperCase();
}

function getMarket(countryCode) {
  return MARKET_REGISTRY[normalizeCountryCode(countryCode)] || null;
}

function requireMarket(countryCode) {
  const market = getMarket(countryCode);
  if (market) return market;

  const error = new Error("Unsupported country market");
  error.status = 400;
  error.code = "MARKET_UNSUPPORTED";
  throw error;
}

function requireOnboardingMarket(countryCode) {
  const market = requireMarket(countryCode);
  if (market.capabilities.onboardingEnabled) return market;

  const error = new Error("Storvex registration is not yet available in this country");
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
  return Boolean(getMarket(countryCode)?.capabilities?.[capability]);
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
  };
}

function listPublicOnboardingMarkets() {
  return Object.values(MARKET_REGISTRY)
    .filter((market) => market.capabilities.onboardingEnabled)
    .map(publicMarket);
}

module.exports = {
  MARKET_REGISTRY,
  getMarket,
  requireMarket,
  requireOnboardingMarket,
  getDefaultCurrencyForMarket,
  getDefaultTimezoneForMarket,
  tenantMarketDefaults,
  isOnboardingEnabled: (code) => hasCapability(code, "onboardingEnabled"),
  isMarketplaceEnabled: (code) => hasCapability(code, "marketplaceEnabled"),
  isSubscriptionPaymentsEnabled: (code) => hasCapability(code, "subscriptionPaymentsEnabled"),
  listPublicOnboardingMarkets,
  publicMarket,
};
