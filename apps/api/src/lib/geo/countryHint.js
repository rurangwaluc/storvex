const geoip = require("geoip-lite");

const { getMarket } = require("../../config/markets");
const {
  getClientIp,
  normalizeClientIp,
} = require("../security/clientIp");

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeIp(value) {
  return normalizeClientIp(value) || "";
}

function requestIpForCountryHint(req, env = process.env) {
  return getClientIp(req, env);
}

function countryHintFromIp(ip) {
  const normalizedIp = normalizeIp(ip);

  if (!normalizedIp) {
    return null;
  }

  const result = geoip.lookup(normalizedIp);
  const countryCode = cleanString(result?.country).toUpperCase();

  if (!countryCode) {
    return null;
  }

  // A detected country is useful to Storvex only if it exists in
  // the market catalogue. It does not need onboardingEnabled=true;
  // the UI may still show a detected coming-soon market.
  const market = getMarket(countryCode);

  if (!market) {
    return null;
  }

  return {
    countryCode: market.countryCode,
  };
}

function requestCountryHint(req) {
  return countryHintFromIp(requestIpForCountryHint(req));
}

module.exports = {
  normalizeIp,
  requestIpForCountryHint,
  countryHintFromIp,
  requestCountryHint,
};
