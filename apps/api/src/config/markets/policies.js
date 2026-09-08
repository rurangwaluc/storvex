const DEFAULT_CAPABILITIES = Object.freeze({
  onboardingEnabled: true,
  internalAppEnabled: true,
  marketplaceEnabled: false,
  subscriptionPaymentsEnabled: false,
  marketplacePaymentsEnabled: false,
  sellerPayoutsEnabled: false,
  seoEnabled: false,
});

const MARKET_POLICIES = Object.freeze({
  RW: Object.freeze({
    defaultTimezone: "Africa/Kigali",
    capabilities: Object.freeze({
      ...DEFAULT_CAPABILITIES,
      onboardingEnabled: true,
      internalAppEnabled: true,
      marketplaceEnabled: true,
      subscriptionPaymentsEnabled: true,
      seoEnabled: true,
    }),
    locationSchema: "DISTRICT_SECTOR",
    phone: Object.freeze({
      strict: true,
      nationalPrefixes: Object.freeze(["07"]),
      nationalLength: 10,
    }),
  }),

  UG: Object.freeze({
    defaultTimezone: "Africa/Kampala",
    capabilities: DEFAULT_CAPABILITIES,
    phone: Object.freeze({
      strict: true,
      nationalPrefixes: Object.freeze(["07"]),
      nationalLength: 10,
    }),
  }),

  KE: Object.freeze({
    defaultTimezone: "Africa/Nairobi",
    capabilities: DEFAULT_CAPABILITIES,
    phone: Object.freeze({
      strict: true,
      nationalPrefixes: Object.freeze(["07", "01"]),
      nationalLength: 10,
    }),
  }),
});

function marketPolicy(countryCode) {
  return (
    MARKET_POLICIES[String(countryCode || "").trim().toUpperCase()] ||
    Object.freeze({
      capabilities: DEFAULT_CAPABILITIES,
    })
  );
}

module.exports = {
  DEFAULT_CAPABILITIES,
  MARKET_POLICIES,
  marketPolicy,
};
