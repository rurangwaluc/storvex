const { requireMarket } = require("../../config/markets");

function digitsOnly(value) {
  return String(value || "").trim().replace(/[^\d]/g, "");
}

function normalizePhone({ countryCode, input }) {
  const market = requireMarket(countryCode);
  const digits = digitsOnly(input);
  if (!digits) return null;

  const callingDigits = digitsOnly(market.callingCode);
  const national = digits.startsWith(callingDigits)
    ? `0${digits.slice(callingDigits.length)}`
    : digits;

  if (national.length !== market.phone.nationalLength) return null;
  if (!market.phone.nationalPrefixes.some((prefix) => national.startsWith(prefix))) return null;

  return `${callingDigits}${national.slice(1)}`;
}

function isValidPhone({ countryCode, input }) {
  try {
    return Boolean(normalizePhone({ countryCode, input }));
  } catch {
    return false;
  }
}

function phoneExample(countryCode) {
  const market = requireMarket(countryCode);
  return `${market.phone.nationalPrefixes[0]}XXXXXXXX or ${market.callingCode}${market.phone.nationalPrefixes[0].slice(1)}XXXXXXXX`;
}

module.exports = { normalizePhone, isValidPhone, phoneExample };
