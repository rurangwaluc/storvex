const geoip = require("geoip-lite");

const { getMarket } = require("../../config/markets");

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeIp(value) {
  const raw = cleanString(value);

  if (!raw) return "";

  // Railway may provide IPv4-mapped IPv6 values.
  if (raw.startsWith("::ffff:")) {
    return raw.slice(7);
  }

  return raw;
}

function requestIpForCountryHint(req) {
  // Railway documents X-Real-IP as the original client IP.
  // Do not trust browser-supplied country codes.
  const railwayIp = normalizeIp(req?.headers?.["x-real-ip"]);

  if (railwayIp) {
    return railwayIp;
  }

  // Useful for local/dev and other direct deployments.
  return normalizeIp(req?.socket?.remoteAddress || req?.ip);
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
