const OpenAI = require("openai");

const {
  inferCategoryFromText,
  getCategoryContext,
  shouldAskCategoryClarifier,
} = require("./whatsapp.category.service");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let client = null;

function getClient() {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  if (!client) {
    client = new OpenAI({ apiKey: OPENAI_API_KEY });
  }

  return client;
}

function normalizeText(value) {
  const s = String(value || "").trim();
  return s || null;
}

function normalizeLower(value) {
  return String(value || "").trim().toLowerCase();
}

function collapseSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const direct = safeJsonParse(raw);
  if (direct) return direct;

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const sliced = raw.slice(firstBrace, lastBrace + 1);
  return safeJsonParse(sliced);
}

function clampStringArray(arr, max = 8) {
  if (!Array.isArray(arr)) return [];

  return arr
    .map((x) => normalizeText(x))
    .filter(Boolean)
    .slice(0, max);
}

function clampConfidence(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;

  return n;
}

function normalizeMoneyAmount(rawValue, unit = "") {
  if (rawValue === undefined || rawValue === null) return null;

  const clean = String(rawValue).replace(/[,\s]/g, "");
  let amount = Number(clean);

  if (!Number.isFinite(amount) || amount <= 0) return null;

  const normalizedUnit = String(unit || "").trim().toLowerCase();

  if (normalizedUnit === "k") amount *= 1000;
  if (normalizedUnit === "m") amount *= 1000000;

  return Math.round(amount);
}

function extractBudgetFromText(text) {
  const raw = normalizeLower(text);

  const patterns = [
    /\b(?:around|about|budget|under|below|max(?:imum)?|up to|near|within)\s*(\d+(?:[.,]\d+)?)\s*(k|m|rwf|frw)?\b/i,
    /\b(\d+(?:[.,]\d+)?)\s*(k|m)\b/i,
    /\b(\d{5,9})\s*(rwf|frw)?\b/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (!match) continue;

    const amount = normalizeMoneyAmount(match[1], match[2]);
    if (amount) return amount;
  }

  return null;
}

function extractQuantityFromText(text) {
  const raw = normalizeLower(text);

  const patterns = [
    /\b(?:qty|quantity|x)\s*[:#-]?\s*(\d{1,4})\b/i,
    /\b(\d{1,4})\s*(?:pcs|pieces|piece|items|units|phones|laptops|chargers|cables|bulbs|plates|cups|sets|bags|boxes)\b/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (!match?.[1]) continue;

    const qty = Number(match[1]);
    if (Number.isInteger(qty) && qty > 0) return Math.min(999, qty);
  }

  if (/\b(two|couple)\b/i.test(raw)) return 2;
  if (/\bthree\b/i.test(raw)) return 3;
  if (/\bfour\b/i.test(raw)) return 4;
  if (/\bfive\b/i.test(raw)) return 5;

  return 1;
}

function cleanSearchQuery(value) {
  const text = collapseSpaces(
    String(value || "")
      .replace(/[^\p{L}\p{N}\s/+._-]/gu, " ")
      .replace(
        /\b(price|stock|available|availability|how much|cost|buy|order|reserve|book|please|pls|need|want|do you have|have you got|murafite|mufite|igiciro|angahe|ndashaka|nkeneye|ndayishaka|show me|send me)\b/gi,
        " "
      )
      .replace(/\s+/g, " ")
  );

  return text && text.length >= 2 ? text : null;
}

function normalizeKnownBrand(value) {
  const raw = normalizeLower(value);
  if (!raw) return null;

  const map = {
    iphone: "Apple",
    apple: "Apple",
    samsung: "Samsung",
    tecno: "Tecno",
    infinix: "Infinix",
    itel: "Itel",
    nokia: "Nokia",
    xiaomi: "Xiaomi",
    redmi: "Redmi",
    oppo: "Oppo",
    vivo: "Vivo",
    huawei: "Huawei",
    pixel: "Google",
    google: "Google",
    hp: "HP",
    dell: "Dell",
    lenovo: "Lenovo",
    asus: "Asus",
    acer: "Acer",
    msi: "MSI",
    macbook: "Apple",
    canon: "Canon",
    epson: "Epson",
    brother: "Brother",
    logitech: "Logitech",
    anker: "Anker",
    oraimo: "Oraimo",
    jbl: "JBL",
    sony: "Sony",
    bose: "Bose",
    sandisk: "SanDisk",
    kingston: "Kingston",
    seagate: "Seagate",
    wd: "WD",
    tplink: "TP-Link",
    "tp-link": "TP-Link",
    mikrotik: "MikroTik",
    bosch: "Bosch",
    makita: "Makita",
    stanley: "Stanley",
    total: "Total",
    philips: "Philips",
    osram: "Osram",
    toyota: "Toyota",
    hyundai: "Hyundai",
    nissan: "Nissan",
    suzuki: "Suzuki",
    honda: "Honda",
    mazda: "Mazda",
    bmw: "BMW",
    benz: "Mercedes-Benz",
    mercedes: "Mercedes-Benz",
  };

  return map[raw] || normalizeText(value);
}

function normalizeProductType(value) {
  const raw = normalizeLower(value);
  if (!raw) return null;

  if (/\b(phone|smartphone|mobile|telephone|iphone|galaxy)\b/i.test(raw)) return "phone";
  if (/\b(laptop|computer|notebook|pc|macbook)\b/i.test(raw)) return "laptop";
  if (/\b(charger|adapter|chargeur)\b/i.test(raw)) return "charger";
  if (/\b(cable|usb|type c|type-c|usb-c|lightning)\b/i.test(raw)) return "cable";
  if (/\b(airpods|earbuds|earphones|headphones|pods|headset)\b/i.test(raw)) return "audio";
  if (/\b(speaker|bluetooth speaker)\b/i.test(raw)) return "speaker";
  if (/\b(power bank|powerbank)\b/i.test(raw)) return "power bank";
  if (/\b(router|modem|wifi|wi-fi)\b/i.test(raw)) return "network";
  if (/\b(printer)\b/i.test(raw)) return "printer";
  if (/\b(flash|usb drive|memory card|ssd|hard drive|hdd)\b/i.test(raw)) return "storage";
  if (/\b(case|cover)\b/i.test(raw)) return "case";
  if (/\b(screen protector|protector)\b/i.test(raw)) return "screen protector";

  if (/\b(cement|nail|nails|screw|hammer|drill|paint|hinge|lock|pipe|tile|tap|faucet)\b/i.test(raw)) {
    return raw;
  }

  if (/\b(plate|cup|mug|spoon|fork|knife|pot|pan|kettle|flask|blender|toaster|rice cooker|stove)\b/i.test(raw)) {
    return raw;
  }

  if (/\b(bulb|ampoule|led|tube|downlight|spotlight|floodlight|lamp|socket|switch)\b/i.test(raw)) {
    return raw;
  }

  if (/\b(brake|brake pad|filter|spark plug|belt|bearing|shock|clutch|radiator|wiper|tyre|tire)\b/i.test(raw)) {
    return raw;
  }

  return normalizeText(value);
}

function inferQueryFromParts(data, fallbackText) {
  const parts = [
    data.brand,
    data.model,
    data.storage,
    data.color,
    data.condition,
    data.productType,
    data.categoryLabel,
    data.vehicleMake,
    data.vehicleModel,
    data.partNumber,
    data.size,
    data.watts,
    data.fitting,
    data.material,
  ]
    .map(normalizeText)
    .filter(Boolean);

  const built = cleanSearchQuery(parts.join(" "));
  if (built) return built;

  return cleanSearchQuery(fallbackText);
}

function normalizeAiExtraction(raw, fallbackText = null) {
  const data = raw && typeof raw === "object" ? raw : {};
  const fallbackCategory = inferCategoryFromText(fallbackText);

  const category = inferCategoryFromText(data.category || data.businessCategory || fallbackText, fallbackCategory);
  const categoryContext = getCategoryContext(category, fallbackText);

  const brand = normalizeKnownBrand(data.brand);
  const productType = normalizeProductType(data.productType || data.categoryName || data.itemType);
  const model = normalizeText(data.model);
  const storage = normalizeText(data.storage);
  const color = normalizeText(data.color);
  const condition = normalizeText(data.condition);
  const size = normalizeText(data.size);
  const material = normalizeText(data.material);
  const watts = normalizeText(data.watts);
  const fitting = normalizeText(data.fitting);
  const vehicleMake = normalizeKnownBrand(data.vehicleMake);
  const vehicleModel = normalizeText(data.vehicleModel);
  const vehicleYear = normalizeText(data.vehicleYear);
  const partNumber = normalizeText(data.partNumber);
  const urgency = normalizeText(data.urgency);
  const quantity = Number(data.quantity) > 0 ? Math.min(999, Math.round(Number(data.quantity))) : extractQuantityFromText(fallbackText);
  const budget = normalizeMoneyAmount(data.budget) || extractBudgetFromText(fallbackText);

  const normalizedQuery =
    cleanSearchQuery(data.normalizedQuery) ||
    cleanSearchQuery(model) ||
    cleanSearchQuery([brand, model, storage].filter(Boolean).join(" ")) ||
    cleanSearchQuery([vehicleMake, vehicleModel, partNumber, productType].filter(Boolean).join(" ")) ||
    cleanSearchQuery(productType) ||
    inferQueryFromParts(
      {
        brand,
        categoryLabel: categoryContext.label,
        productType,
        model,
        storage,
        color,
        condition,
        vehicleMake,
        vehicleModel,
        partNumber,
        size,
        watts,
        fitting,
        material,
      },
      fallbackText
    );

  const confidence = clampConfidence(data.confidence);
  const needsClarification =
    Boolean(data.needsClarification) ||
    shouldAskCategoryClarifier(category, normalizedQuery || fallbackText);

  return {
    normalizedQuery,
    category,
    categoryLabel: categoryContext.label,
    brand,
    productType,
    model,
    storage,
    color,
    condition,
    quantity,
    budget,
    size,
    material,
    watts,
    fitting,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    partNumber,
    urgency,
    accessories: clampStringArray(data.accessories),
    alternatives: clampStringArray(data.alternatives),
    missingDetails: clampStringArray(data.missingDetails),
    suggestedQuestions: clampStringArray(data.suggestedQuestions, 4),
    confidence,
    needsClarification,
    needsHumanReview: Boolean(data.needsHumanReview) || confidence < 0.35,
    notes: normalizeText(data.notes),
  };
}

function buildFallbackExtraction(text, note) {
  const normalized = cleanSearchQuery(text);
  const category = inferCategoryFromText(text);
  const categoryContext = getCategoryContext(category, text);

  return {
    normalizedQuery: normalized,
    category,
    categoryLabel: categoryContext.label,
    brand: null,
    productType: null,
    model: null,
    storage: null,
    color: null,
    condition: null,
    quantity: extractQuantityFromText(text),
    budget: extractBudgetFromText(text),
    size: null,
    material: null,
    watts: null,
    fitting: null,
    vehicleMake: null,
    vehicleModel: null,
    vehicleYear: null,
    partNumber: null,
    urgency: null,
    accessories: [],
    alternatives: [],
    missingDetails: [],
    suggestedQuestions: [],
    confidence: normalized ? 0.25 : 0,
    needsClarification: shouldAskCategoryClarifier(category, normalized || text),
    needsHumanReview: true,
    notes: note || "Fallback extraction used",
  };
}

async function extractProductIntent({ messageText, businessCategory = null }) {
  const text = normalizeText(messageText);

  if (!text) {
    return buildFallbackExtraction("", "Empty message");
  }

  const inferredCategory = inferCategoryFromText(text, businessCategory);
  const categoryContext = getCategoryContext(inferredCategory, text);

  let openai;

  try {
    openai = getClient();
  } catch (err) {
    return buildFallbackExtraction(text, "OpenAI key missing");
  }

  const system = `
You are the strict extraction brain for Storvex WhatsApp Business Assistant.

You are NOT a chatbot.
You are NOT allowed to answer the customer.
You only return JSON for backend product lookup.

Supported business categories:
1. ELECTRONICS — phones, laptops, chargers, cables, audio, printers, routers, storage, accessories
2. HARDWARE — cement, nails, screws, tools, paint, plumbing, locks, tiles, construction supplies
3. HOME_KITCHEN — plates, cups, pots, pans, kettles, flasks, blenders, cookers, furniture, home items
4. LIGHTING — bulbs, LED, tubes, lamps, solar lights, switches, sockets, fittings, watts, color temperature
5. SPARE_PARTS — vehicle parts, brake pads, filters, spark plugs, belts, bearings, headlights, wipers, tyres

Current inferred category:
${categoryContext.category} (${categoryContext.label})

Rules:
- Extract only what the message supports.
- Never invent price, stock, branch, payment status, or availability.
- Never create an order, invoice, sale, payment, refund, or stock adjustment.
- Never expose internal branch logic.
- If product is unclear, set needsClarification true.
- If message needs staff judgement or is too vague, set needsHumanReview true.
- Keep useful product words for search: model, size, watts, fitting, vehicle, brand, SKU, barcode, part number.
- Customer may use English, French, Kinyarwanda, or mixed wording.
- Return JSON only. No markdown. No explanation.

Kinyarwanda examples:
- "mufite iphone 13?" => electronics, iPhone 13
- "igiciro cya type c charger" => electronics, Type-C charger
- "ndashaka ampoule led 12w" => lighting, LED bulb 12W
- "nkeneye inyundo" => hardware, hammer
- "nkeneye blender" => home kitchen, blender
- "brake pads za Toyota" => spare parts, Toyota brake pads

Return exactly this JSON shape:
{
  "normalizedQuery": string|null,
  "businessCategory": "ELECTRONICS"|"HARDWARE"|"HOME_KITCHEN"|"LIGHTING"|"SPARE_PARTS"|null,
  "category": string|null,
  "productType": string|null,
  "brand": string|null,
  "model": string|null,
  "storage": string|null,
  "color": string|null,
  "condition": string|null,
  "quantity": number|null,
  "budget": number|null,
  "size": string|null,
  "material": string|null,
  "watts": string|null,
  "fitting": string|null,
  "vehicleMake": string|null,
  "vehicleModel": string|null,
  "vehicleYear": string|null,
  "partNumber": string|null,
  "urgency": string|null,
  "accessories": string[],
  "alternatives": string[],
  "missingDetails": string[],
  "suggestedQuestions": string[],
  "confidence": number,
  "needsClarification": boolean,
  "needsHumanReview": boolean,
  "notes": string|null
}
`.trim();

  const user = `
Customer WhatsApp message:
${text}

Extract only what is reasonably supported by the message.
`.trim();

  try {
    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.05,
      max_output_tokens: 420,
    });

    const outputText = response.output_text || "";
    const parsed = extractJsonObject(outputText);

    if (!parsed) {
      return buildFallbackExtraction(text, "AI returned non-JSON output");
    }

    const normalized = normalizeAiExtraction(parsed, text);

    if (!normalized.normalizedQuery) {
      return buildFallbackExtraction(text, "AI did not return a usable query");
    }

    return normalized;
  } catch (err) {
    console.error("extractProductIntent error:", err?.message || err);
    return buildFallbackExtraction(text, "AI request failed");
  }
}

function shouldUseAiFallback({ text, deterministicQuery, searchResultsCount }) {
  const cleanText = normalizeText(text);
  const cleanDeterministic = cleanSearchQuery(deterministicQuery);

  if (!cleanText) return false;

  if (Number(searchResultsCount || 0) > 0) return false;

  if (!cleanDeterministic) return true;

  const rawLower = cleanText.toLowerCase();
  const deterministicLower = cleanDeterministic.toLowerCase();

  if (rawLower === deterministicLower) return false;

  const hasHumanLanguage =
    /\b(mufite|murafite|igiciro|angahe|ndashaka|nkeneye|ndayishaka|nabona|combien|bonjour|muraho|amakuru|ampoule|chargeur)\b/i.test(
      cleanText
    );

  const hasCategorySignal =
    /\b(led|bulb|ampoule|hammer|cement|nails|screws|plate|cup|pot|pan|blender|kettle|brake|filter|toyota|charger|phone|laptop)\b/i.test(
      cleanText
    );

  const hasManyWords = cleanText.split(/\s+/).filter(Boolean).length >= 3;

  if (hasHumanLanguage) return true;
  if (hasCategorySignal) return true;
  if (hasManyWords) return true;
  if (cleanText.length >= 4) return true;

  return false;
}

module.exports = {
  extractProductIntent,
  shouldUseAiFallback,

  // helpful for safe testing later
  cleanSearchQuery,
  normalizeAiExtraction,
  extractBudgetFromText,
  extractQuantityFromText,
};
