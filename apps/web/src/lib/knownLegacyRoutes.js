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

const RESERVED_MARKETPLACE_ROUTE_FAMILIES = new Set([
  "account",
  "cart",
  "categories",
  "category",
  "checkout",
  "offline",
  "orders",
  "shop",
  "stores",
]);

function normalizedRouteSegments(segments = []) {
  return Array.isArray(segments)
    ? segments.map((segment) => String(segment || "").trim()).filter(Boolean)
    : [];
}

export function isMarketplaceProductRoute(segments = []) {
  const parts = normalizedRouteSegments(segments);

  return Boolean(
    parts.length === 3 &&
    parts[0] === "marketplace" &&
    !RESERVED_MARKETPLACE_ROUTE_FAMILIES.has(parts[1]),
  );
}

export function isKnownLegacyRoute(segments = []) {
  const parts = normalizedRouteSegments(segments);
  const path = parts.join("/");

  if (EXACT_LEGACY_ROUTES.has(path)) return true;
  if (parts[0] === "app") return true;

  if (parts[0] !== "marketplace") return false;

  if (parts[1] === "orders") return parts.length === 3;
  if (parts[1] === "stores") return parts.length === 3;
  if (parts[1] === "category") return parts.length === 3;

  // Product existence is deliberately validated after hydration until Phase 4.
  return isMarketplaceProductRoute(parts);
}
