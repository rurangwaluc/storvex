export const approvedMarketplaceCategorySlugs = new Set([
  "electronics",
]);

export function isMarketplaceCategorySeoApproved(slug) {
  return approvedMarketplaceCategorySlugs.has(String(slug || ""));
}

export function isMarketplaceCategoryIndexable({
  slug,
  curated,
  hasQueryVariant,
  approvedSlugs = approvedMarketplaceCategorySlugs,
}) {
  return Boolean(
    curated &&
      !hasQueryVariant &&
      approvedSlugs.has(String(slug || "")),
  );
}
