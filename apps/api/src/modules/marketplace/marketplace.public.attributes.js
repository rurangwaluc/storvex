const PUBLIC_MARKETPLACE_ATTRIBUTE_KEYS = new Set([
  "businessCategory",
  "category",
  "categorySlug",
  "subcategory",
  "subcategorySlug",
  "leafCategory",
  "leafCategorySlug",
  "subSubcategory",
  "productType",
  "brand",
  "model",
  "condition",
  "color",
  "size",
  "material",
  "capacity",
  "dimensions",
  "weight",
  "warranty",
  "compatibility",
  "features",
]);

function publicAttributeValue(value) {
  if (typeof value === "string") {
    const clean = value.trim().slice(0, 300);
    return clean || null;
  }

  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    const items = value
      .slice(0, 20)
      .map(publicAttributeValue)
      .filter((item) => item !== null && !Array.isArray(item));
    return items.length ? items : null;
  }

  return null;
}

function sanitizePublicMarketplaceAttributes(attributes) {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(attributes)
      .filter(([key]) => PUBLIC_MARKETPLACE_ATTRIBUTE_KEYS.has(key))
      .map(([key, value]) => [key, publicAttributeValue(value)])
      .filter(([, value]) => value !== null),
  );
}

module.exports = {
  PUBLIC_MARKETPLACE_ATTRIBUTE_KEYS,
  sanitizePublicMarketplaceAttributes,
};
