const MARKETPLACE_PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const approvedMarketplaceProductKeys = new Set([]);

export function marketplaceProductSeoKey(storeSlug, productSlug) {
  const store = typeof storeSlug === "string" ? storeSlug.trim().toLowerCase() : "";
  const product = typeof productSlug === "string" ? productSlug.trim().toLowerCase() : "";

  if (
    !MARKETPLACE_PRODUCT_SLUG_PATTERN.test(store) ||
    !MARKETPLACE_PRODUCT_SLUG_PATTERN.test(product)
  ) {
    return null;
  }

  return `${store}/${product}`;
}

export function marketplaceProductSeoPair(key) {
  if (typeof key !== "string") return null;

  const parts = key.split("/");
  if (parts.length !== 2) return null;

  const normalizedKey = marketplaceProductSeoKey(parts[0], parts[1]);
  if (!normalizedKey) return null;

  const [storeSlug, productSlug] = normalizedKey.split("/");
  return { storeSlug, productSlug, key: normalizedKey };
}

export function isMarketplaceProductSeoApproved({
  storeSlug,
  productSlug,
  approvedKeys = approvedMarketplaceProductKeys,
} = {}) {
  const key = marketplaceProductSeoKey(storeSlug, productSlug);
  return Boolean(key && approvedKeys?.has(key));
}

export function hasMarketplaceProductQueryVariant(searchParams) {
  if (!searchParams) return false;
  if (searchParams instanceof URLSearchParams) return searchParams.size > 0;
  return typeof searchParams === "object" && Object.keys(searchParams).length > 0;
}

export function isMarketplaceProductIndexable({
  storeSlug,
  productSlug,
  searchParams,
  approvedKeys = approvedMarketplaceProductKeys,
} = {}) {
  return !hasMarketplaceProductQueryVariant(searchParams) && isMarketplaceProductSeoApproved({
    storeSlug,
    productSlug,
    approvedKeys,
  });
}
