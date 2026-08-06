const EXACT_LEGACY_ROUTES = new Set([
  "",
  "pricing",
  "login",
  "signup",
  "verify-otp",
  "confirm-signup",
  "owner-payment",
  "forgot-password",
  "reset-password",
  "renew",
  "marketplace",
  "marketplace/shop",
  "marketplace/stores",
  "marketplace/account",
  "marketplace/account/sign-in",
  "marketplace/account/create",
  "marketplace/account/forgot-password",
  "marketplace/account/reset-password",
]);

export function isKnownLegacyRoute(segments = []) {
  const parts = Array.isArray(segments) ? segments.filter(Boolean) : [];
  const path = parts.join("/");

  if (EXACT_LEGACY_ROUTES.has(path)) return true;
  if (parts[0] === "app") return true;

  if (parts[0] !== "marketplace") return false;

  if (parts[1] === "orders") return parts.length === 3;
  if (parts[1] === "stores") return parts.length === 3;
  if (parts[1] === "category") return parts.length === 3;

  // Product existence is deliberately validated in Stage 3, not here.
  return parts.length === 3;
}
