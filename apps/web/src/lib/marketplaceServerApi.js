import { cache } from "react";

export const MARKETPLACE_SERVER_TIMEOUT_MS = 8_000;

export class MarketplaceServerApiError extends Error {
  constructor(message, { code, status, cause } = {}) {
    super(message, { cause });
    this.name = "MarketplaceServerApiError";
    this.code = code || "MARKETPLACE_UPSTREAM_ERROR";
    this.status = status || null;
  }
}

function apiBaseUrl() {
  const configured = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");

  if (!configured) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required for Marketplace server rendering");
  }

  return configured.toLowerCase().endsWith("/api") ? configured : `${configured}/api`;
}

export async function marketplaceFetch(path, { revalidate = 30 } = {}) {
  let response;

  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(MARKETPLACE_SERVER_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    throw new MarketplaceServerApiError(
      timedOut ? "Marketplace request timed out" : "Marketplace request failed",
      { code: timedOut ? "MARKETPLACE_UPSTREAM_TIMEOUT" : "MARKETPLACE_UPSTREAM_NETWORK_ERROR", cause: error },
    );
  }

  if (!response.ok) {
    throw new MarketplaceServerApiError(`Marketplace request failed with HTTP ${response.status}`, {
      code: "MARKETPLACE_UPSTREAM_HTTP_ERROR",
      status: response.status,
    });
  }

  try {
    return await response.json();
  } catch (error) {
    throw new MarketplaceServerApiError("Marketplace returned invalid JSON", {
      code: "MARKETPLACE_UPSTREAM_INVALID_DATA",
      cause: error,
    });
  }
}

export function validateMarketplaceCatalogue(catalogue) {
  if (!catalogue || !Array.isArray(catalogue.categories)) {
    throw new MarketplaceServerApiError("Marketplace catalogue response is malformed", {
      code: "MARKETPLACE_UPSTREAM_INVALID_DATA",
    });
  }

  return catalogue;
}

const PRIVATE_MARKETPLACE_PRODUCT_FIELDS = new Set([
  "id",
  "tenantId",
  "qtyOnHand",
  "qtyReserved",
  "costPrice",
  "margin",
  "sku",
  "supplier",
  "staff",
  "branchInventory",
  "location",
  "address",
  "internalNotes",
]);

function assertPublicMarketplaceProductPayload(value) {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach(assertPublicMarketplaceProductPayload);
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_MARKETPLACE_PRODUCT_FIELDS.has(key)) {
      throw new MarketplaceServerApiError("Marketplace product response contains private fields", {
        code: "MARKETPLACE_UPSTREAM_INVALID_DATA",
      });
    }

    assertPublicMarketplaceProductPayload(child);
  }
}

export function validateMarketplaceProduct(data, { storeSlug, productSlug } = {}) {
  const store = data?.store;
  const product = data?.product;
  const expectedStoreSlug = String(storeSlug || "").trim();
  const expectedProductSlug = String(productSlug || "").trim();

  if (
    !store ||
    typeof store !== "object" ||
    Array.isArray(store) ||
    !product ||
    typeof product !== "object" ||
    Array.isArray(product) ||
    !String(store.slug || "").trim() ||
    !String(store.name || "").trim() ||
    !String(product.slug || "").trim() ||
    !String(product.title || "").trim() ||
    !String(product.seller?.slug || "").trim() ||
    (expectedStoreSlug && store.slug !== expectedStoreSlug) ||
    (expectedStoreSlug && product.seller.slug !== expectedStoreSlug) ||
    (expectedProductSlug && product.slug !== expectedProductSlug)
  ) {
    throw new MarketplaceServerApiError("Marketplace product response is malformed", {
      code: "MARKETPLACE_UPSTREAM_INVALID_DATA",
    });
  }

  const publicData = { store, product };
  assertPublicMarketplaceProductPayload(publicData);
  return publicData;
}

export const getServerMarketplaceCatalogue = cache(async () => {
  const catalogue = await marketplaceFetch("/marketplace/catalogue", { revalidate: 300 });
  return validateMarketplaceCatalogue(catalogue);
});

export function getServerMarketplaceProducts(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return marketplaceFetch(`/marketplace/products?${query.toString()}`);
}

export function getServerMarketplaceStores() {
  return marketplaceFetch("/marketplace/stores?sort=name&limit=100", { revalidate: 60 });
}

export async function getServerMarketplaceProduct(storeSlug, productSlug) {
  const cleanStoreSlug = String(storeSlug || "").trim();
  const cleanProductSlug = String(productSlug || "").trim();

  if (!cleanStoreSlug || !cleanProductSlug) return null;

  try {
    const data = await marketplaceFetch(
      `/marketplace/stores/${encodeURIComponent(cleanStoreSlug)}/products/${encodeURIComponent(cleanProductSlug)}`,
    );

    return validateMarketplaceProduct(data, {
      storeSlug: cleanStoreSlug,
      productSlug: cleanProductSlug,
    });
  } catch (error) {
    if (error instanceof MarketplaceServerApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export function findMarketplaceCataloguePath(categories, slug) {
  for (const category of Array.isArray(categories) ? categories : []) {
    if (category.slug === slug) return { category, subcategory: null, leafCategory: null };
    for (const subcategory of category.children || []) {
      if (subcategory.slug === slug) return { category, subcategory, leafCategory: null };
      for (const leafCategory of subcategory.children || []) {
        if (leafCategory.slug === slug) return { category, subcategory, leafCategory };
      }
    }
  }
  return null;
}
