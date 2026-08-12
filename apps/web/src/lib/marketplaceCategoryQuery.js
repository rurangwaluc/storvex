const DEFAULT_PAGE_SIZE = 24;
const ALLOWED_PAGE_SIZES = new Set([12, 24, 48]);

export const marketplaceCategoryQueryNames = [
  "search",
  "sort",
  "fulfilment",
  "minPrice",
  "maxPrice",
  "onSale",
  "store",
  "limit",
  "page",
];

function readValue(source, key) {
  const value = typeof source?.get === "function" ? source.get(key) : source?.[key];
  const first = Array.isArray(value) ? value[0] : value;
  return String(first ?? "").trim();
}

export function normalizeMarketplaceCategoryQuery(source = {}) {
  const limitValue = Number.parseInt(readValue(source, "limit"), 10);
  const pageValue = Number.parseInt(readValue(source, "page") || "1", 10);

  return {
    search: readValue(source, "search"),
    sort: readValue(source, "sort") || "newest",
    fulfilment: readValue(source, "fulfilment"),
    minPrice: readValue(source, "minPrice"),
    maxPrice: readValue(source, "maxPrice"),
    onSale: readValue(source, "onSale") === "true",
    store: readValue(source, "store"),
    limit: ALLOWED_PAGE_SIZES.has(limitValue) ? limitValue : DEFAULT_PAGE_SIZE,
    page: Math.max(1, Number.isFinite(pageValue) ? pageValue : 1),
  };
}

export function marketplaceCategoryQueryString(query) {
  const normalized = normalizeMarketplaceCategoryQuery(query);
  const params = new URLSearchParams();

  if (normalized.search) params.set("search", normalized.search);
  if (normalized.sort !== "newest") params.set("sort", normalized.sort);
  if (normalized.fulfilment) params.set("fulfilment", normalized.fulfilment);
  if (normalized.minPrice) params.set("minPrice", normalized.minPrice);
  if (normalized.maxPrice) params.set("maxPrice", normalized.maxPrice);
  if (normalized.onSale) params.set("onSale", "true");
  if (normalized.store) params.set("store", normalized.store);
  if (normalized.limit !== DEFAULT_PAGE_SIZE) params.set("limit", String(normalized.limit));
  if (normalized.page !== 1) params.set("page", String(normalized.page));

  return params.toString();
}

export function hasMarketplaceCategoryQueryVariant(source = {}) {
  if (typeof source?.keys === "function") {
    return !source.keys().next().done;
  }

  return Object.keys(source || {}).length > 0;
}

export function marketplaceCategoryProductParams(query, path) {
  const normalized = normalizeMarketplaceCategoryQuery(query);

  return {
    search: normalized.search,
    category: path.category.slug,
    subcategory: path.subcategory?.slug || undefined,
    leafCategory: path.leafCategory?.slug || undefined,
    sort: normalized.sort,
    fulfilment: normalized.fulfilment,
    minPrice: normalized.minPrice,
    maxPrice: normalized.maxPrice,
    onSale: normalized.onSale || undefined,
    store: normalized.store || undefined,
    page: normalized.page,
    limit: normalized.limit,
  };
}
