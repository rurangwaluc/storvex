import {
  normalizeMarketplaceCategory,
} from "../legacy-pages/marketplace/marketplaceCategoryDefinitions.js";

export const MARKETPLACE_LISTING_QUALITY_LEVELS = Object.freeze({
  NEEDS_WORK: "NEEDS WORK",
  GOOD: "GOOD",
  STRONG: "STRONG",
});

const TAXONOMY_ATTRIBUTE_KEYS = new Set([
  "businesscategory",
  "category",
  "categoryslug",
  "subcategory",
  "subcategoryslug",
  "leafcategory",
  "leafcategoryslug",
  "subsubcategory",
]);

const GENERIC_TITLES = new Set([
  "good product",
  "item",
  "laptop",
  "laptop adapter",
  "laptop stand",
  "lenovo",
  "phone",
  "product",
  "wireless mouse",
]);

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizedText(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function publicAttributes(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function attributeEntries(attributes) {
  return Object.entries(publicAttributes(attributes)).filter(([key, value]) => (
    !TAXONOMY_ATTRIBUTE_KEYS.has(normalizedText(key).replace(/\s/g, "")) &&
    value !== null &&
    value !== undefined &&
    cleanText(Array.isArray(value) ? value.join(" ") : value)
  ));
}

function includesAny(corpus, signals) {
  return signals.some((signal) => corpus.includes(signal));
}

function addUnique(items, value) {
  if (value && !items.includes(value)) items.push(value);
}

function categoryGuidance(category, corpus, title, recommendations) {
  let detailSignals = 0;
  const has = (...signals) => includesAny(corpus, signals);
  const genericTitle = GENERIC_TITLES.has(normalizedText(title));

  if (category === "ELECTRONICS") {
    const isAdapter = has("adapter", "charger");
    const isComputer = has("laptop", "computer", "desktop", "notebook");
    const isPhone = has("phone", "iphone", "pixel", "galaxy", "smartphone");
    const isAccessory = has("mouse", "keyboard", "headphone", "earphone");
    const isStand = has("laptop stand", "computer stand");
    const hasModel = has("model", "surface laptop 4") || /[a-z]+[ -]?\d[a-z0-9-]*/i.test(title);
    const hasMemory = has("ram", "storage", "ssd", "gb", "tb");
    const hasPerformance = has("processor", "intel", "core i", "cpu", "screen", "inch");
    const hasCondition = has("condition", "new", "used", "refurbished", "tested");
    const hasConnection = has("bluetooth", "wireless", "usb", "connector", "compatible");

    detailSignals += [hasModel, hasMemory, hasPerformance, hasCondition, hasConnection]
      .filter(Boolean).length;

    if (genericTitle || !hasModel) {
      addUnique(recommendations, "Add the exact model or product type to the title.");
    }
    if (((isComputer && !isAdapter && !isStand) || isPhone) && !hasMemory) {
      addUnique(recommendations, "Add storage and RAM where they apply.");
    }
    if (((isComputer && !isAdapter && !isStand) || isPhone) && !hasCondition) {
      addUnique(recommendations, "Add the product condition, such as new, used, or refurbished.");
    }
    if (((isComputer && !isAdapter && !isStand) || isPhone) && !hasPerformance) {
      addUnique(recommendations, "Add useful details such as processor or screen size.");
    }
    if (isAdapter && !has("watt", "voltage", "compatible")) {
      addUnique(recommendations, "Add wattage, connector type, or compatible laptop models.");
    }
    if (isAccessory && !hasConnection) {
      addUnique(recommendations, "Add the brand, model, or connection type.");
    }
    if (isStand && !has("size", "material", "adjustable", "compatible")) {
      addUnique(recommendations, "Add size, material, adjustment, or compatibility details.");
    }
  }

  if (category === "HARDWARE") {
    const checks = [
      [has("type", "tool", "cement", "paint", "pipe"), "Add the exact product or tool type."],
      [has("size", "dimension", "mm", "cm", "metre", "meter", "inch"), "Add the size or dimensions."],
      [has("material", "steel", "metal", "wood", "plastic", "concrete"), "Add the material."],
      [has("capacity", "litre", "liter", "kg", "compatible", "use"), "Add capacity or compatible use where it applies."],
    ];
    detailSignals += checks.filter(([present]) => present).length;
    for (const [present, message] of checks) if (!present) addUnique(recommendations, message);
  }

  if (category === "HOME_KITCHEN") {
    const checks = [
      [has("type", "pan", "pot", "cookware", "appliance", "kettle"), "Add the exact product type."],
      [has("material", "steel", "aluminium", "aluminum", "ceramic", "glass"), "Add the material."],
      [has("capacity", "litre", "liter", "ml"), "Add capacity where it applies."],
      [has("size", "dimension", "cm", "inch", "watt", "power"), "Add size, dimensions, or power where useful."],
    ];
    detailSignals += checks.filter(([present]) => present).length;
    for (const [present, message] of checks) if (!present) addUnique(recommendations, message);
  }

  if (category === "LIGHTING") {
    const checks = [
      [has("type", "bulb", "light", "lamp", "flood"), "Add the exact light type."],
      [has("watt", "wattage", " w "), "Add the wattage."],
      [has("solar", "battery", "electric", "power source", "mains"), "Add the power source, such as solar, battery, or mains."],
      [has("lumen", "brightness", "colour temperature", "color temperature", "kelvin"), "Add brightness or colour temperature where available."],
    ];
    detailSignals += checks.filter(([present]) => present).length;
    for (const [present, message] of checks) if (!present) addUnique(recommendations, message);
  }

  if (category === "SPARE_PARTS") {
    const checks = [
      [has("part type", "brake", "filter", "screen", "battery", "replacement"), "Add the exact part type."],
      [has("compatible", "fits", "make", "vehicle", "device"), "Add the compatible make, model, vehicle, or device."],
      [has("part number", "model number", "oem"), "Add the public part or model number where available."],
      [has("size", "dimension", "material", "mm", "cm", "inch"), "Add size or material where it helps confirm compatibility."],
    ];
    detailSignals += checks.filter(([present]) => present).length;
    for (const [present, message] of checks) if (!present) addUnique(recommendations, message);
  }

  return detailSignals;
}

export function evaluateMarketplaceListingQuality(input = {}) {
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const category = normalizeMarketplaceCategory(input.category);
  const attributes = publicAttributes(input.attributes);
  const entries = attributeEntries(attributes);
  const attributeText = entries
    .flatMap(([key, value]) => [key, Array.isArray(value) ? value.join(" ") : value])
    .map(normalizedText)
    .join(" ");
  const corpus = normalizedText([
    title,
    description,
    input.subcategory,
    input.leafCategory,
    attributeText,
  ].join(" "));
  const recommendations = [];
  const strengths = [];
  const normalizedTitle = normalizedText(title);
  const normalizedDescription = normalizedText(description);
  const titleIsGeneric = !title || title.length < 5 || GENERIC_TITLES.has(normalizedTitle);
  const descriptionRepeatsTitle = Boolean(
    normalizedTitle && normalizedDescription === normalizedTitle,
  );
  const descriptionIsPlaceholder = [
    "good product",
    "nice product",
    "best product",
  ].includes(normalizedDescription);
  const usefulDescription = Boolean(
    description &&
    !descriptionRepeatsTitle &&
    !descriptionIsPlaceholder &&
    normalizedDescription.length >= 20,
  );
  const positivePrice = Number.isFinite(Number(input.price)) && Number(input.price) > 0;
  const hasImage = Number(input.approvedImageCount || 0) > 0;

  if (!title) addUnique(recommendations, "Add a clear product title.");
  else if (titleIsGeneric) addUnique(recommendations, "Add the exact model or product type to the title.");
  else addUnique(strengths, "Clear product title");

  if (!description) addUnique(recommendations, "Add a useful product description.");
  else if (descriptionRepeatsTitle) addUnique(recommendations, "Describe the product instead of repeating the title.");
  else if (!usefulDescription) addUnique(recommendations, "Add a clearer description with useful product facts.");
  else addUnique(strengths, "Useful product description");

  if (!hasImage) addUnique(recommendations, "Add and approve a clear product image.");
  else addUnique(strengths, "Product image ready");

  if (!positivePrice) addUnique(recommendations, "Add a visible price above zero.");
  else addUnique(strengths, "Visible price added");

  const categorySignals = categoryGuidance(category, corpus, title, recommendations);
  const detailCount = Math.max(categorySignals, entries.length);

  if (detailCount > 0) addUnique(strengths, "Useful product details added");

  const coreComplete = !titleIsGeneric && usefulDescription && hasImage && positivePrice;
  const level = !coreComplete || detailCount === 0
    ? MARKETPLACE_LISTING_QUALITY_LEVELS.NEEDS_WORK
    : detailCount >= 3 && recommendations.length <= 1
      ? MARKETPLACE_LISTING_QUALITY_LEVELS.STRONG
      : MARKETPLACE_LISTING_QUALITY_LEVELS.GOOD;

  return {
    level,
    recommendations: recommendations.slice(0, 4),
    strengths: strengths.slice(0, 5),
  };
}
