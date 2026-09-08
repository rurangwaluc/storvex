const assert = require("node:assert/strict");
const test = require("node:test");

const {
  MARKET_REGISTRY,
  getMarket,
  listPublicMarkets,
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

test("contains the 54 configured African sovereign-state markets", () => {
  assert.equal(Object.keys(MARKET_REGISTRY).length, 54);

  assert.ok(getMarket("RW"));
  assert.ok(getMarket("UG"));
  assert.ok(getMarket("KE"));
  assert.ok(getMarket("TZ"));
  assert.ok(getMarket("GH"));
  assert.ok(getMarket("NG"));
  assert.ok(getMarket("ZA"));
  assert.ok(getMarket("EG"));
  assert.ok(getMarket("MA"));
  assert.ok(getMarket("ZW"));
});

test("resolves representative African market defaults", () => {
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

  assert.deepEqual(tenantMarketDefaults("TZ"), {
    countryCode: "TZ",
    currencyCode: "TZS",
    timezone: "Africa/Dar_es_Salaam",
  });

  assert.deepEqual(tenantMarketDefaults("GH"), {
    countryCode: "GH",
    currencyCode: "GHS",
    timezone: "Africa/Accra",
  });

  assert.deepEqual(tenantMarketDefaults("NG"), {
    countryCode: "NG",
    currencyCode: "NGN",
    timezone: "Africa/Lagos",
  });

  assert.deepEqual(tenantMarketDefaults("ZA"), {
    countryCode: "ZA",
    currencyCode: "ZAR",
    timezone: "Africa/Johannesburg",
  });

  assert.deepEqual(tenantMarketDefaults("ZW"), {
    countryCode: "ZW",
    currencyCode: "ZWG",
    timezone: "Africa/Harare",
  });
});

test("uses the expected calling codes for representative markets", () => {
  assert.equal(getMarket("RW").callingCode, "+250");
  assert.equal(getMarket("UG").callingCode, "+256");
  assert.equal(getMarket("KE").callingCode, "+254");
  assert.equal(getMarket("TZ").callingCode, "+255");
  assert.equal(getMarket("GH").callingCode, "+233");
  assert.equal(getMarket("NG").callingCode, "+234");
  assert.equal(getMarket("CD").callingCode, "+243");
  assert.equal(getMarket("ZA").callingCode, "+27");
});

test("public market catalogue exposes all configured markets alphabetically", () => {
  const markets = listPublicMarkets();

  assert.equal(markets.length, 54);
  assert.equal(markets[0].countryName, "Algeria");

  assert.ok(
    markets.every(
      (market) =>
        market.onboardingEnabled === true,
    ),
  );

  assert.ok(
    markets.some(
      (market) =>
        market.countryCode === "RW" &&
        market.subscriptionPaymentsEnabled === true,
    ),
  );

  assert.ok(
    markets.some(
      (market) =>
        market.countryCode === "NG" &&
        market.subscriptionPaymentsEnabled === false,
    ),
  );
});

test("all configured African markets are enabled for onboarding", () => {
  assert.equal(requireOnboardingMarket("RW").countryCode, "RW");
  assert.equal(requireOnboardingMarket("UG").countryCode, "UG");
  assert.equal(requireOnboardingMarket("NG").countryCode, "NG");

  assert.throws(() => requireMarket("US"), {
    code: "MARKET_UNSUPPORTED",
  });
});

test("normalizes configured strict mobile markets", () => {
  assert.equal(
    normalizePhone({
      countryCode: "RW",
      input: "0783 344 482",
    }),
    "250783344482",
  );

  assert.equal(
    normalizePhone({
      countryCode: "UG",
      input: "0772 123 456",
    }),
    "256772123456",
  );

  assert.equal(
    normalizePhone({
      countryCode: "KE",
      input: "0712 345 678",
    }),
    "254712345678",
  );

  assert.equal(
    normalizePhone({
      countryCode: "KE",
      input: "0112 345 678",
    }),
    "254112345678",
  );
});

test("does not interpret another market phone with Rwanda rules", () => {
  assert.equal(
    normalizePhone({
      countryCode: "RW",
      input: "0772123456",
    }),
    "250772123456",
  );

  assert.equal(
    normalizePhone({
      countryCode: "UG",
      input: "250772123456",
    }),
    null,
  );

  assert.equal(
    normalizePhone({
      countryCode: "UG",
      input: "123",
    }),
    null,
  );
});

test("server-derived tenant defaults ignore requested currency and timezone", () => {
  const request = {
    countryCode: "UG",
    currencyCode: "USD",
    timezone: "UTC",
  };

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

test("every configured African market has valid internal-app market defaults", () => {
  const entries = Object.values(MARKET_REGISTRY);

  assert.equal(entries.length, 54);

  for (const market of entries) {
    assert.match(
      market.countryCode,
      /^[A-Z]{2}$/,
      `${market.countryCode}: invalid country code`,
    );

    assert.match(
      market.defaultCurrencyCode,
      /^[A-Z]{3}$/,
      `${market.countryCode}: invalid currency code`,
    );

    assert.equal(
      market.capabilities.internalAppEnabled,
      true,
      `${market.countryCode}: internal app must be enabled`,
    );

    assert.equal(
      market.capabilities.onboardingEnabled,
      true,
      `${market.countryCode}: onboarding must be enabled`,
    );

    assert.equal(
      typeof market.defaultTimezone,
      "string",
      `${market.countryCode}: timezone must be a string`,
    );

    assert.ok(
      market.defaultTimezone.trim(),
      `${market.countryCode}: timezone must not be empty`,
    );

    assert.doesNotThrow(
      () =>
        new Intl.DateTimeFormat("en", {
          timeZone: market.defaultTimezone,
        }).format(new Date("2026-09-03T12:00:00Z")),
      `${market.countryCode}: invalid IANA timezone ${market.defaultTimezone}`,
    );

    assert.deepEqual(
      tenantMarketDefaults(market.countryCode),
      {
        countryCode: market.countryCode,
        currencyCode: market.defaultCurrencyCode,
        timezone: market.defaultTimezone,
      },
      `${market.countryCode}: tenant defaults do not match registry`,
    );
  }
});

test("public onboarding catalogue matches all 54 internal African markets", () => {
  const publicMarkets = listPublicMarkets();
  const registryCodes = Object.keys(MARKET_REGISTRY).sort();
  const publicCodes = publicMarkets
    .map((market) => market.countryCode)
    .sort();

  assert.equal(publicMarkets.length, 54);
  assert.deepEqual(publicCodes, registryCodes);

  for (const market of publicMarkets) {
    assert.equal(
      market.onboardingEnabled,
      true,
      `${market.countryCode}: public onboarding unexpectedly disabled`,
    );

    assert.match(
      market.currencyCode,
      /^[A-Z]{3}$/,
      `${market.countryCode}: invalid public currency`,
    );

    assert.doesNotThrow(
      () =>
        new Intl.DateTimeFormat("en", {
          timeZone: market.timezone,
        }).format(new Date("2026-09-03T12:00:00Z")),
      `${market.countryCode}: invalid public timezone ${market.timezone}`,
    );
  }
});
