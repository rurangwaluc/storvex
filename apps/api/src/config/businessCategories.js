const BUSINESS_CATEGORIES = Object.freeze({
  ELECTRONICS: "ELECTRONICS",
  HARDWARE: "HARDWARE",
  HOME_KITCHEN: "HOME_KITCHEN",
  LIGHTING: "LIGHTING",
  SPARE_PARTS: "SPARE_PARTS",
});

const BUSINESS_CATEGORY_LABELS = Object.freeze({
  [BUSINESS_CATEGORIES.ELECTRONICS]: "Electronics retailer",
  [BUSINESS_CATEGORIES.HARDWARE]: "Hardware / quincaillerie",
  [BUSINESS_CATEGORIES.HOME_KITCHEN]: "Home and kitchen materials",
  [BUSINESS_CATEGORIES.LIGHTING]: "Lighting business",
  [BUSINESS_CATEGORIES.SPARE_PARTS]: "Spare parts business",
});

const LEGACY_ELECTRONICS_VALUES = new Set([
  "ELECTRONICS_RETAIL",
  "PHONE_SHOP",
  "LAPTOP_SHOP",
  "ACCESSORIES_SHOP",
  "REPAIR_SHOP",
  "MIXED_ELECTRONICS",
  "PHONE",
  "LAPTOP",
  "ACCESSORIES",
  "REPAIRS",
]);

const ALLOWED_BUSINESS_CATEGORIES = new Set(Object.values(BUSINESS_CATEGORIES));

function cleanCategory(value) {
  const raw = String(value || "").trim();
  return raw ? raw.toUpperCase() : "";
}

function normalizeBusinessCategory(value, fallback = BUSINESS_CATEGORIES.ELECTRONICS) {
  const raw = cleanCategory(value);

  if (!raw) return fallback;

  if (ALLOWED_BUSINESS_CATEGORIES.has(raw)) {
    return raw;
  }

  if (LEGACY_ELECTRONICS_VALUES.has(raw)) {
    return BUSINESS_CATEGORIES.ELECTRONICS;
  }

  const err = new Error(
    "Business category must be one of ELECTRONICS, HARDWARE, HOME_KITCHEN, LIGHTING, SPARE_PARTS",
  );
  err.status = 400;
  throw err;
}

function getBusinessCategoryLabel(value) {
  const category = normalizeBusinessCategory(value);
  return BUSINESS_CATEGORY_LABELS[category] || BUSINESS_CATEGORY_LABELS.ELECTRONICS;
}

module.exports = {
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_LABELS,
  ALLOWED_BUSINESS_CATEGORIES,
  LEGACY_ELECTRONICS_VALUES,
  normalizeBusinessCategory,
  getBusinessCategoryLabel,
};