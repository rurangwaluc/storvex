const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getMarket,
  requireMarket,
  requireOnboardingMarket,
  tenantMarketDefaults,
} = require("../src/config/markets");
const {
  normalizePhone,
} = require("../src/lib/phone/marketPhone");
const {
  authoritativeBranchCountry,
} = require("../src/modules/branches/branches.service");

test("resolves Rwanda, Uganda and Kenya market defaults", () => {
  assert.deepEqual(tenantMarketDefaults("RW"), {
    countryCode: "RW",
    currencyCode: "RWF",
    timezone: "Africa/Kigali",
  });
  assert.deepEqual(tenantMarketDefaults("UG"), {
    countryCode: "UG",
    currencyCode: "UGX",
    timezone: "Africa/Kampala",
  });
  assert.deepEqual(tenantMarketDefaults("KE"), {
    countryCode: "KE",
    currencyCode: "KES",
    timezone: "Africa/Nairobi",
  });
  assert.equal(getMarket("RW").callingCode, "+250");
  assert.equal(getMarket("UG").callingCode, "+256");
  assert.equal(getMarket("KE").callingCode, "+254");
});

test("rejects unsupported and onboarding-disabled markets", () => {
  assert.throws(() => requireMarket("TZ"), { code: "MARKET_UNSUPPORTED" });
  assert.throws(() => requireOnboardingMarket("UG"), {
    code: "MARKET_ONBOARDING_DISABLED",
  });
  assert.equal(requireOnboardingMarket("RW").countryCode, "RW");
});

test("normalizes configured market mobile numbers", () => {
  assert.equal(normalizePhone({ countryCode: "RW", input: "0783 344 482" }), "250783344482");
  assert.equal(normalizePhone({ countryCode: "UG", input: "0772 123 456" }), "256772123456");
  assert.equal(normalizePhone({ countryCode: "KE", input: "0712 345 678" }), "254712345678");
  assert.equal(normalizePhone({ countryCode: "KE", input: "0112 345 678" }), "254112345678");
});

test("does not interpret another market phone with Rwanda rules", () => {
  assert.equal(normalizePhone({ countryCode: "RW", input: "0772123456" }), "250772123456");
  assert.equal(normalizePhone({ countryCode: "UG", input: "250772123456" }), null);
  assert.equal(normalizePhone({ countryCode: "UG", input: "123" }), null);
});

test("server-derived tenant defaults ignore requested currency and timezone", () => {
  const request = { countryCode: "UG", currencyCode: "USD", timezone: "UTC" };
  assert.deepEqual(tenantMarketDefaults(request.countryCode), {
    countryCode: "UG",
    currencyCode: "UGX",
    timezone: "Africa/Kampala",
  });
});

test("new and updated branch country always follows tenant country", () => {
  assert.equal(authoritativeBranchCountry("RW", "UG"), "RW");
  assert.equal(authoritativeBranchCountry("UG", "RW"), "UG");
});
