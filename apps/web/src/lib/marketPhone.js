function digitsOnly(value) {
  return String(value || "").trim().replace(/[^\d]/g, "");
}

export function normalizeMarketPhone(value, market) {
  const digits = digitsOnly(value);
  const callingDigits = digitsOnly(market?.callingCode);
  const prefixes = Array.isArray(market?.phoneNationalPrefixes)
    ? market.phoneNationalPrefixes
    : [];
  const nationalLength = Number(market?.phoneNationalLength || 0);

  if (!digits || !callingDigits || !prefixes.length || !nationalLength) return "";

  const national = digits.startsWith(callingDigits)
    ? `0${digits.slice(callingDigits.length)}`
    : digits;

  if (national.length !== nationalLength) return "";
  if (!prefixes.some((prefix) => national.startsWith(prefix))) return "";

  return `${callingDigits}${national.slice(1)}`;
}

export function displayMarketPhone(value, market) {
  const digits = digitsOnly(value);
  const callingDigits = digitsOnly(market?.callingCode);
  if (callingDigits && digits.startsWith(callingDigits)) {
    return `0${digits.slice(callingDigits.length)}`;
  }
  return value || "";
}
