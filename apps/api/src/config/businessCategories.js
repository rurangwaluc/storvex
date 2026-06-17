const BUSINESS_CATEGORIES = Object.freeze({
  ELECTRONICS: "ELECTRONICS",
  HARDWARE: "HARDWARE",
  HOME_KITCHEN: "HOME_KITCHEN",
  LIGHTING: "LIGHTING",
  SPARE_PARTS: "SPARE_PARTS",
});

const BUSINESS_CATEGORY_LABELS = Object.freeze({
  [BUSINESS_CATEGORIES.ELECTRONICS]: "Electronics",
  [BUSINESS_CATEGORIES.HARDWARE]: "Hardware / quincaillerie",
  [BUSINESS_CATEGORIES.HOME_KITCHEN]: "Home & kitchen",
  [BUSINESS_CATEGORIES.LIGHTING]: "Lighting",
  [BUSINESS_CATEGORIES.SPARE_PARTS]: "Spare parts",
});

const BUSINESS_CATEGORY_SCREEN_COPY = Object.freeze({
  [BUSINESS_CATEGORIES.ELECTRONICS]: {
    title: "Electronics store",
    inventory: "Device-ready inventory with brand, model, serial/IMEI, warranty, and specs.",
    pos: "Electronics POS should support serial-aware items, warranty, repairs, and accessories.",
  },
  [BUSINESS_CATEGORIES.HARDWARE]: {
    title: "Hardware store",
    inventory: "Hardware inventory with units, measurements, material, grade, and pack quantity.",
    pos: "Hardware POS should support quantity, unit, measurement, and fast repeat items.",
  },
  [BUSINESS_CATEGORIES.HOME_KITCHEN]: {
    title: "Home & kitchen store",
    inventory: "Home inventory with material, color, size/capacity, set pieces, and warranty.",
    pos: "Home & kitchen POS should support sets, bundles, appliances, and household goods.",
  },
  [BUSINESS_CATEGORIES.LIGHTING]: {
    title: "Lighting store",
    inventory: "Lighting inventory with wattage, voltage, fitting, color temperature, and warranty.",
    pos: "Lighting POS should support bulbs, fittings, accessories, and compatibility notes.",
  },
  [BUSINESS_CATEGORIES.SPARE_PARTS]: {
    title: "Spare parts store",
    inventory: "Spare parts inventory with part number, compatibility, condition, and warranty.",
    pos: "Spare parts POS should support compatibility lookup and part-number-first selling.",
  },
});

const LEGACY_ELECTRONICS_VALUES = new Set([
  "ELECTRONICS_RETAIL",
  "PHONE_SHOP",
  "LAPTOP_SHOP",
  "ACCESSORIES_SHOP",
  "REPAIR_SHOP",
  "MIXED_ELECTRONICS",
  "PHONES_AND_ACCESSORIES",
  "COMPUTER_AND_LAPTOP_SHOP",
  "PHONE_REPAIR_AND_ACCESSORIES",
  "ELECTRONICS_REPAIR_SHOP",
  "GAMING_AND_ELECTRONICS",
  "APPLIANCES_AND_ELECTRONICS",
  "WHOLESALE_ELECTRONICS",
  "MIXED_ELECTRONICS_STORE",
  "PHONE",
  "LAPTOP",
  "ACCESSORIES",
  "REPAIRS",
]);

const CATEGORY_ALIASES = Object.freeze({
  "ELECTRONICS RETAIL": BUSINESS_CATEGORIES.ELECTRONICS,
  "ELECTRONICS RETAILER": BUSINESS_CATEGORIES.ELECTRONICS,
  "PHONES AND ACCESSORIES": BUSINESS_CATEGORIES.ELECTRONICS,
  "COMPUTER AND LAPTOP SHOP": BUSINESS_CATEGORIES.ELECTRONICS,
  "PHONE REPAIR AND ACCESSORIES": BUSINESS_CATEGORIES.ELECTRONICS,
  "ELECTRONICS REPAIR SHOP": BUSINESS_CATEGORIES.ELECTRONICS,
  "GAMING AND ELECTRONICS": BUSINESS_CATEGORIES.ELECTRONICS,
  "APPLIANCES AND ELECTRONICS": BUSINESS_CATEGORIES.ELECTRONICS,
  "WHOLESALE ELECTRONICS": BUSINESS_CATEGORIES.ELECTRONICS,
  "MIXED ELECTRONICS STORE": BUSINESS_CATEGORIES.ELECTRONICS,

  QUINCAILLERIE: BUSINESS_CATEGORIES.HARDWARE,
  "HARDWARE / QUINCAILLERIE": BUSINESS_CATEGORIES.HARDWARE,
  "HARDWARE STORE": BUSINESS_CATEGORIES.HARDWARE,

  "HOME AND KITCHEN": BUSINESS_CATEGORIES.HOME_KITCHEN,
  "HOME & KITCHEN": BUSINESS_CATEGORIES.HOME_KITCHEN,
  "HOME_AND_KITCHEN": BUSINESS_CATEGORIES.HOME_KITCHEN,
  "HOME KITCHEN": BUSINESS_CATEGORIES.HOME_KITCHEN,

  "LIGHTING BUSINESS": BUSINESS_CATEGORIES.LIGHTING,
  "LIGHTING STORE": BUSINESS_CATEGORIES.LIGHTING,

  "SPARE PARTS": BUSINESS_CATEGORIES.SPARE_PARTS,
  "SPARE PARTS BUSINESS": BUSINESS_CATEGORIES.SPARE_PARTS,
  "SPARE PARTS STORE": BUSINESS_CATEGORIES.SPARE_PARTS,
  AUTO_PARTS: BUSINESS_CATEGORIES.SPARE_PARTS,
});

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

  const spaced = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  if (CATEGORY_ALIASES[raw]) return CATEGORY_ALIASES[raw];
  if (CATEGORY_ALIASES[spaced]) return CATEGORY_ALIASES[spaced];

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

function getBusinessCategoryScreenCopy(value) {
  const category = normalizeBusinessCategory(value);
  return BUSINESS_CATEGORY_SCREEN_COPY[category] || BUSINESS_CATEGORY_SCREEN_COPY.ELECTRONICS;
}

function serializeBusinessCategory(value) {
  const valueNormalized = normalizeBusinessCategory(value);

  return {
    value: valueNormalized,
    label: getBusinessCategoryLabel(valueNormalized),
    screenCopy: getBusinessCategoryScreenCopy(valueNormalized),
  };
}

module.exports = {
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_LABELS,
  BUSINESS_CATEGORY_SCREEN_COPY,
  ALLOWED_BUSINESS_CATEGORIES,
  LEGACY_ELECTRONICS_VALUES,
  normalizeBusinessCategory,
  getBusinessCategoryLabel,
  getBusinessCategoryScreenCopy,
  serializeBusinessCategory,
};
