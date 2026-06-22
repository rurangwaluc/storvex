/**
 * WhatsApp category service
 *
 * Purpose:
 * - Keep WhatsApp business replies category-aware.
 * - Keep product/category language out of the generic intent engine.
 * - Make customer questions easier to understand for real shop staff.
 *
 * Supported Storvex business categories:
 * - ELECTRONICS
 * - HARDWARE
 * - HOME_KITCHEN
 * - LIGHTING
 * - SPARE_PARTS
 */

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

const DEFAULT_CATEGORY = BUSINESS_CATEGORIES.ELECTRONICS;

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function collapseSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanText(value) {
  return collapseSpaces(
    String(value || "")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[^\p{L}\p{N}\s#@+./_-]/gu, " ")
  );
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordRegex(keyword) {
  const cleaned = normalizeText(keyword);
  if (!cleaned) return null;

  const escaped = escapeRegExp(cleaned).replace(/\s+/g, "\\s+");

  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, "iu");
}

function hasAnyKeyword(text, keywords = []) {
  const source = normalizeLower(text);
  if (!source) return false;

  return keywords.some((keyword) => {
    const rx = keywordRegex(keyword);
    return rx ? rx.test(source) : false;
  });
}

const CATEGORY_KEYWORDS = Object.freeze({
  [BUSINESS_CATEGORIES.ELECTRONICS]: [
    "iphone",
    "samsung",
    "tecno",
    "infinix",
    "itel",
    "nokia",
    "xiaomi",
    "redmi",
    "oppo",
    "vivo",
    "google pixel",
    "pixel",
    "phone",
    "smartphone",
    "tablet",
    "ipad",
    "laptop",
    "computer",
    "desktop",
    "hp",
    "dell",
    "lenovo",
    "asus",
    "acer",
    "macbook",
    "charger",
    "adapter",
    "type c",
    "type-c",
    "usb c",
    "usb-c",
    "lightning",
    "cable",
    "earphones",
    "earbuds",
    "headphones",
    "headset",
    "speaker",
    "bluetooth",
    "power bank",
    "powerbank",
    "router",
    "wifi",
    "printer",
    "ssd",
    "hdd",
    "hard drive",
    "flash",
    "usb drive",
    "memory card",
    "mouse",
    "keyboard",
    "screen protector",
    "protector",
    "phone case",
    "cover",
  ],

  [BUSINESS_CATEGORIES.HARDWARE]: [
    "cement",
    "nails",
    "nail",
    "screw",
    "screws",
    "bolt",
    "bolts",
    "nut",
    "nuts",
    "paint",
    "brush",
    "roller",
    "hinge",
    "lock",
    "padlock",
    "door handle",
    "pipe",
    "pvc",
    "wire",
    "copper",
    "steel",
    "iron sheet",
    "roofing",
    "timber",
    "wood",
    "plywood",
    "hammer",
    "drill",
    "grinder",
    "spanner",
    "wrench",
    "saw",
    "tape measure",
    "wheelbarrow",
    "glue",
    "silicone",
    "sealant",
    "sandpaper",
    "tiles",
    "tile",
    "plumbing",
    "faucet",
    "tap",
  ],

  [BUSINESS_CATEGORIES.HOME_KITCHEN]: [
    "plate",
    "plates",
    "cup",
    "cups",
    "mug",
    "mugs",
    "spoon",
    "spoons",
    "fork",
    "forks",
    "knife",
    "knives",
    "pot",
    "pots",
    "pan",
    "pans",
    "saucepan",
    "kettle",
    "flask",
    "thermos",
    "jug",
    "bottle",
    "bowl",
    "bowls",
    "glass",
    "glasses",
    "cooker",
    "stove",
    "gas cooker",
    "blender",
    "toaster",
    "rice cooker",
    "microwave",
    "fridge",
    "refrigerator",
    "freezer",
    "chair",
    "table",
    "bed sheet",
    "curtain",
    "bucket",
    "basin",
    "rack",
    "storage",
  ],

  [BUSINESS_CATEGORIES.LIGHTING]: [
    "bulb",
    "bulbs",
    "led",
    "tube",
    "tube light",
    "downlight",
    "spotlight",
    "floodlight",
    "panel light",
    "ceiling light",
    "wall light",
    "chandelier",
    "lamp",
    "solar light",
    "street light",
    "strip light",
    "rgb",
    "warm white",
    "cool white",
    "daylight",
    "watts",
    "watt",
    "w",
    "socket",
    "holder",
    "switch",
    "driver",
    "transformer",
    "sensor light",
    "emergency light",
  ],

  [BUSINESS_CATEGORIES.SPARE_PARTS]: [
    "brake",
    "brake pad",
    "brake pads",
    "filter",
    "oil filter",
    "air filter",
    "fuel filter",
    "spark plug",
    "plug",
    "belt",
    "timing belt",
    "bearing",
    "shock",
    "shock absorber",
    "clutch",
    "battery",
    "radiator",
    "bumper",
    "mirror",
    "headlight",
    "tail light",
    "indicator",
    "wiper",
    "tyre",
    "tire",
    "tube",
    "rim",
    "engine oil",
    "gear oil",
    "car",
    "vehicle",
    "moto",
    "motorcycle",
    "toyota",
    "hyundai",
    "nissan",
    "suzuki",
    "honda",
    "benz",
    "bmw",
    "volkswagen",
    "mazda",
  ],
});

const CATEGORY_QUESTION_RULES = Object.freeze({
  [BUSINESS_CATEGORIES.ELECTRONICS]: {
    shortLabel: "brand or model",
    question: "Which brand or model do you need?",
    examples: ["iPhone", "Samsung", "HP laptop", "USB-C charger"],
    usefulFields: ["brand", "model", "storage", "color", "condition", "warranty"],
  },

  [BUSINESS_CATEGORIES.HARDWARE]: {
    shortLabel: "size or specification",
    question: "What size or specification do you need?",
    examples: ["1 inch nails", "50kg cement", "white paint", "PVC size"],
    usefulFields: ["size", "material", "quantity", "color", "brand"],
  },

  [BUSINESS_CATEGORIES.HOME_KITCHEN]: {
    shortLabel: "quantity or set",
    question: "How many pieces or what set size do you need?",
    examples: ["6 pieces", "12 pieces", "large pot", "glass set"],
    usefulFields: ["pieces", "size", "material", "color", "brand"],
  },

  [BUSINESS_CATEGORIES.LIGHTING]: {
    shortLabel: "watts, color, or fitting",
    question: "What watts, color, or fitting do you need?",
    examples: ["9W", "18W", "warm white", "daylight", "E27"],
    usefulFields: ["watts", "colorTemperature", "fitting", "voltage", "type"],
  },

  [BUSINESS_CATEGORIES.SPARE_PARTS]: {
    shortLabel: "vehicle or part number",
    question: "Which vehicle model or part number is it for?",
    examples: ["Toyota Corolla", "RAV4", "Suzuki moto", "part number"],
    usefulFields: ["vehicleMake", "vehicleModel", "year", "partNumber", "engine"],
  },
});

const CATEGORY_REPLY_COPY = Object.freeze({
  [BUSINESS_CATEGORIES.ELECTRONICS]: {
    greeting:
      "Hello. What product do you need today? You can send brand, model, storage, or accessory name.",
    noProduct:
      "Please send the product name, brand, or model so we can check availability.",
    stockFoundPrefix: "Available electronics item",
    stockNotFound:
      "We did not find that exact electronics item. Send brand/model or a clearer name and we will check again.",
  },

  [BUSINESS_CATEGORIES.HARDWARE]: {
    greeting:
      "Hello. What hardware item do you need today? You can send item name, size, color, or quantity.",
    noProduct:
      "Please send the hardware item name, size, or specification so we can check availability.",
    stockFoundPrefix: "Available hardware item",
    stockNotFound:
      "We did not find that exact hardware item. Send size/specification or a clearer item name and we will check again.",
  },

  [BUSINESS_CATEGORIES.HOME_KITCHEN]: {
    greeting:
      "Hello. What home or kitchen item do you need today? You can send item name, size, set, or quantity.",
    noProduct:
      "Please send the item name, pieces/set size, or quantity so we can check availability.",
    stockFoundPrefix: "Available home & kitchen item",
    stockNotFound:
      "We did not find that exact home or kitchen item. Send set size, item name, or quantity and we will check again.",
  },

  [BUSINESS_CATEGORIES.LIGHTING]: {
    greeting:
      "Hello. What lighting item do you need today? You can send bulb type, watts, color, or fitting.",
    noProduct:
      "Please send the lighting type, watts, color, or fitting so we can check availability.",
    stockFoundPrefix: "Available lighting item",
    stockNotFound:
      "We did not find that exact lighting item. Send watts, color, or fitting and we will check again.",
  },

  [BUSINESS_CATEGORIES.SPARE_PARTS]: {
    greeting:
      "Hello. What spare part do you need today? You can send vehicle model, year, part name, or part number.",
    noProduct:
      "Please send the vehicle model, part name, or part number so we can check availability.",
    stockFoundPrefix: "Available spare part",
    stockNotFound:
      "We did not find that exact spare part. Send vehicle model, year, or part number and we will check again.",
  },
});

const PRODUCT_SPEC_PATTERNS = Object.freeze({
  [BUSINESS_CATEGORIES.ELECTRONICS]: [
    /\b\d{2,4}\s?gb\b/i,
    /\b\d{1,2}\s?tb\b/i,
    /\btype[-\s]?c\b/i,
    /\busb[-\s]?c\b/i,
    /\ba\d{1,3}\b/i,
    /\bs\d{1,3}\b/i,
    /\bnote\s?\d{1,3}\b/i,
    /\biphone\s?\d{1,2}\b/i,
  ],

  [BUSINESS_CATEGORIES.HARDWARE]: [
    /\b\d+(\.\d+)?\s?(mm|cm|m|inch|inches|kg|g|l|litre|liter)\b/i,
    /\b\d+\s?x\s?\d+\b/i,
    /\b\d{1,3}\s?mm\b/i,
  ],

  [BUSINESS_CATEGORIES.HOME_KITCHEN]: [
    /\b\d+\s?(pcs|pieces|piece|set|sets)\b/i,
    /\b\d+\s?(l|litre|liter|ml)\b/i,
    /\b(small|medium|large|xl|double|queen|king)\b/i,
  ],

  [BUSINESS_CATEGORIES.LIGHTING]: [
    /\b\d+\s?w\b/i,
    /\b\d+\s?watts?\b/i,
    /\b(e27|e14|b22|gu10|g9)\b/i,
    /\b(warm white|cool white|daylight|rgb)\b/i,
  ],

  [BUSINESS_CATEGORIES.SPARE_PARTS]: [
    /\b\d{4}\b/i,
    /\b(part\s?no|part\s?number|oem)\b/i,
    /\b(toyota|hyundai|nissan|suzuki|honda|benz|bmw|volkswagen|mazda)\b/i,
  ],
});

function normalizeBusinessCategory(value) {
  const raw = normalizeText(value).toUpperCase();

  if (BUSINESS_CATEGORIES[raw]) return BUSINESS_CATEGORIES[raw];

  const aliases = {
    ELECTRONIC: BUSINESS_CATEGORIES.ELECTRONICS,
    ELECTRONICS_STORE: BUSINESS_CATEGORIES.ELECTRONICS,
    HARDWARE_STORE: BUSINESS_CATEGORIES.HARDWARE,
    QUINCAILLERIE: BUSINESS_CATEGORIES.HARDWARE,
    HOME: BUSINESS_CATEGORIES.HOME_KITCHEN,
    KITCHEN: BUSINESS_CATEGORIES.HOME_KITCHEN,
    HOME_AND_KITCHEN: BUSINESS_CATEGORIES.HOME_KITCHEN,
    HOME_KITCHEN_STORE: BUSINESS_CATEGORIES.HOME_KITCHEN,
    LIGHT: BUSINESS_CATEGORIES.LIGHTING,
    LIGHTS: BUSINESS_CATEGORIES.LIGHTING,
    LIGHTING_STORE: BUSINESS_CATEGORIES.LIGHTING,
    SPARES: BUSINESS_CATEGORIES.SPARE_PARTS,
    SPARE_PART: BUSINESS_CATEGORIES.SPARE_PARTS,
    SPARE_PARTS_STORE: BUSINESS_CATEGORIES.SPARE_PARTS,
    AUTO_PARTS: BUSINESS_CATEGORIES.SPARE_PARTS,
    MOTOR_PARTS: BUSINESS_CATEGORIES.SPARE_PARTS,
  };

  return aliases[raw] || DEFAULT_CATEGORY;
}

function inferCategoryFromText(text, fallbackCategory = DEFAULT_CATEGORY) {
  const source = normalizeLower(cleanText(text));
  if (!source) return normalizeBusinessCategory(fallbackCategory);

  const scores = Object.values(BUSINESS_CATEGORIES).map((category) => {
    const keywords = CATEGORY_KEYWORDS[category] || [];
    const keywordScore = keywords.reduce((score, keyword) => {
      return score + (hasAnyKeyword(source, [keyword]) ? 1 : 0);
    }, 0);

    const specPatterns = PRODUCT_SPEC_PATTERNS[category] || [];
    const specScore = specPatterns.reduce((score, pattern) => {
      return score + (pattern.test(source) ? 1 : 0);
    }, 0);

    return {
      category,
      score: keywordScore * 3 + specScore,
    };
  });

  scores.sort((a, b) => b.score - a.score);

  if (scores[0]?.score > 0) return scores[0].category;

  return normalizeBusinessCategory(fallbackCategory);
}

function getCategoryKeywords(category) {
  return CATEGORY_KEYWORDS[normalizeBusinessCategory(category)] || [];
}

function getCategoryQuestionRule(category) {
  return CATEGORY_QUESTION_RULES[normalizeBusinessCategory(category)];
}

function getCategoryReplyCopy(category) {
  return CATEGORY_REPLY_COPY[normalizeBusinessCategory(category)];
}

function getCategoryLabel(category) {
  return BUSINESS_CATEGORY_LABELS[normalizeBusinessCategory(category)];
}

function getCategoryContext(category, text = "") {
  const normalizedCategory = inferCategoryFromText(text, category);
  const questionRule = getCategoryQuestionRule(normalizedCategory);
  const replyCopy = getCategoryReplyCopy(normalizedCategory);

  return {
    category: normalizedCategory,
    label: getCategoryLabel(normalizedCategory),
    keywords: getCategoryKeywords(normalizedCategory),
    questionRule,
    replyCopy,
  };
}

function hasEnoughCategoryDetail(category, text) {
  const normalizedCategory = normalizeBusinessCategory(category);
  const source = normalizeLower(text);

  if (!source) return false;

  const patterns = PRODUCT_SPEC_PATTERNS[normalizedCategory] || [];

  if (patterns.some((pattern) => pattern.test(source))) return true;

  const words = cleanText(source).split(/\s+/).filter(Boolean);

  if (normalizedCategory === BUSINESS_CATEGORIES.ELECTRONICS) {
    return words.length >= 2;
  }

  if (normalizedCategory === BUSINESS_CATEGORIES.SPARE_PARTS) {
    return words.length >= 2;
  }

  return words.length >= 3;
}

function buildClarifyingQuestion(category, text = "") {
  const context = getCategoryContext(category, text);
  const examples = context.questionRule.examples.slice(0, 4).join(", ");

  return `${context.questionRule.question}\nExamples: ${examples}`;
}

function buildBusinessGreeting(category) {
  const context = getCategoryContext(category);

  return context.replyCopy.greeting;
}

function buildNoProductReply(category) {
  const context = getCategoryContext(category);

  return context.replyCopy.noProduct;
}

function buildNotFoundReply(category) {
  const context = getCategoryContext(category);

  return context.replyCopy.stockNotFound;
}

function shouldAskCategoryClarifier(category, text) {
  const normalizedCategory = inferCategoryFromText(text, category);

  return !hasEnoughCategoryDetail(normalizedCategory, text);
}

module.exports = {
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_LABELS,
  DEFAULT_CATEGORY,

  normalizeBusinessCategory,
  inferCategoryFromText,
  getCategoryKeywords,
  getCategoryQuestionRule,
  getCategoryReplyCopy,
  getCategoryLabel,
  getCategoryContext,

  hasEnoughCategoryDetail,
  shouldAskCategoryClarifier,

  buildClarifyingQuestion,
  buildBusinessGreeting,
  buildNoProductReply,
  buildNotFoundReply,
};
