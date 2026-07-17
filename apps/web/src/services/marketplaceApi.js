import { apiFetch } from "./apiClient";

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  const value = query.toString();
  return value ? `?${value}` : "";
}

export function listMarketplaceProducts(params = {}) {
  return apiFetch(`/marketplace/products${buildQuery(params)}`);
}

export function listMarketplaceStores(params = {}) {
  return apiFetch(`/marketplace/stores${buildQuery(params)}`);
}

export function getMarketplaceStore(storeSlug, params = {}) {
  return apiFetch(
    `/marketplace/stores/${encodeURIComponent(storeSlug)}${buildQuery(params)}`,
  );
}

export function getMarketplaceProduct(storeSlug, productSlug) {
  return apiFetch(
    `/marketplace/stores/${encodeURIComponent(storeSlug)}/products/${encodeURIComponent(productSlug)}`,
  );
}

export function submitMarketplaceRequest(payload = {}) {
  return apiFetch("/marketplace/requests", {
    method: "POST",
    body: payload,
  });
}
