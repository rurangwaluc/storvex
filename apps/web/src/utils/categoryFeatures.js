export const REPAIR_SUPPORTED_SHOP_TYPES = new Set([
  "ELECTRONICS",
  "SPARE_PARTS",
  "LIGHTING",
]);

export const REPAIR_UNSUPPORTED_SHOP_TYPES = new Set([
  "HARDWARE",
  "HOME_KITCHEN",
]);

export function normalizeShopType(value) {
  return String(value || "").trim().toUpperCase();
}

function readJsonStorage(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readJwtPayload(token) {
  if (!token || !token.includes(".")) return null;

  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = window.atob(normalized);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function pickShopType(source) {
  return (
    source?.shopType ||
    source?.storeType ||
    source?.businessType ||
    source?.category ||
    source?.tenantCategory ||
    source?.tenant?.shopType ||
    source?.tenant?.storeType ||
    source?.tenant?.businessType ||
    source?.tenant?.category ||
    source?.business?.shopType ||
    source?.business?.storeType ||
    source?.business?.businessType ||
    source?.business?.category ||
    source?.store?.shopType ||
    source?.store?.storeType ||
    source?.store?.businessType ||
    source?.store?.category
  );
}

export function getCurrentShopType() {
  const keys = [
    "storvexTenant",
    "tenant",
    "currentTenant",
    "activeTenant",
    "tenantProfile",
    "tenantUser",
    "storvexUser",
    "user",
    "storvex_business",
    "storvexBusiness",
    "business",
    "currentBusiness",
    "activeBusiness",
  ];

  for (const key of keys) {
    const parsed = readJsonStorage(key);
    const value = pickShopType(parsed);

    if (value) return normalizeShopType(value);
  }

  const tokenKeys = ["tenantToken", "token", "accessToken", "storvexToken"];

  for (const key of tokenKeys) {
    const payload = readJwtPayload(window.localStorage.getItem(key));
    const value = pickShopType(payload);

    if (value) return normalizeShopType(value);
  }

  return "";
}

export function supportsRepairs(shopType) {
  const normalized = normalizeShopType(shopType);

  if (!normalized) return true;
  if (REPAIR_UNSUPPORTED_SHOP_TYPES.has(normalized)) return false;

  return REPAIR_SUPPORTED_SHOP_TYPES.has(normalized);
}
