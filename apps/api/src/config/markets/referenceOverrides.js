const MARKET_REFERENCE_OVERRIDES = Object.freeze({
  LS: Object.freeze({
    currencyCode: "LSL",
  }),

  NA: Object.freeze({
    currencyCode: "NAD",
  }),

  SZ: Object.freeze({
    currencyCode: "SZL",
  }),

  ZW: Object.freeze({
    currencyCode: "ZWG",
  }),
});

function marketReferenceOverride(countryCode) {
  return (
    MARKET_REFERENCE_OVERRIDES[
      String(countryCode || "").trim().toUpperCase()
    ] || null
  );
}

module.exports = {
  MARKET_REFERENCE_OVERRIDES,
  marketReferenceOverride,
};
