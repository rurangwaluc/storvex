const prisma = require("../../config/database");

const {
  inferCategoryFromText,
  getCategoryContext,
  buildClarifyingQuestion,
  buildNotFoundReply,
  buildNoProductReply,
} = require("./whatsapp.category.service");

function normalizeText(value) {
  const s = String(value || "").trim();
  return s || null;
}

function normalizeLower(value) {
  return String(value || "").toLowerCase().trim();
}

function collapseSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatMoneyRwf(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return String(n);

  return `${Math.round(x).toLocaleString("en-US")} RWF`;
}

function normalizeSearchText(value) {
  return collapseSpaces(
    String(value || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s/+._-]/gu, " ")
      .replace(/[_]+/g, " ")
  );
}

function getModelFields(delegate) {
  try {
    return delegate?.fields || {};
  } catch {
    return {};
  }
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const CATEGORY_SEARCH_MAP = Object.freeze({
  ELECTRONICS: [
    "phone", "smartphone", "mobile", "iphone", "samsung", "laptop", "computer",
    "charger", "adapter", "cable", "usb", "type c", "type-c", "audio",
    "earbuds", "headphones", "speaker", "router", "printer", "keyboard", "mouse",
    "power bank", "powerbank", "screen protector", "case", "cover", "ssd", "hdd",
    "flash", "memory card",
  ],
  HARDWARE: [
    "cement", "nail", "nails", "screw", "screws", "bolt", "paint", "brush",
    "roller", "hinge", "lock", "padlock", "pipe", "pvc", "wire", "hammer",
    "drill", "grinder", "spanner", "wrench", "saw", "glue", "silicone",
    "sealant", "tile", "tiles", "tap", "faucet",
  ],
  HOME_KITCHEN: [
    "plate", "plates", "cup", "cups", "mug", "spoon", "fork", "knife", "pot",
    "pan", "saucepan", "kettle", "flask", "jug", "bottle", "bowl", "glass",
    "cooker", "stove", "blender", "toaster", "rice cooker", "microwave",
    "fridge", "chair", "table", "bucket", "basin", "rack",
  ],
  LIGHTING: [
    "bulb", "ampoule", "led", "tube", "tube light", "downlight", "spotlight",
    "floodlight", "panel light", "ceiling light", "wall light", "chandelier",
    "lamp", "solar light", "street light", "strip light", "warm white",
    "cool white", "daylight", "socket", "holder", "switch", "driver",
    "emergency light",
  ],
  SPARE_PARTS: [
    "brake", "brake pad", "brake pads", "filter", "oil filter", "air filter",
    "fuel filter", "spark plug", "belt", "bearing", "shock", "clutch", "battery",
    "radiator", "bumper", "mirror", "headlight", "tail light", "indicator",
    "wiper", "tyre", "tire", "rim", "engine oil", "gear oil", "toyota",
    "hyundai", "nissan", "suzuki", "honda", "benz", "bmw", "mazda",
  ],
});

const PRODUCT_TYPE_ALIASES = Object.freeze({
  phone: ["phone", "smartphone", "mobile", "iphone", "galaxy"],
  laptop: ["laptop", "notebook", "computer", "macbook", "pc"],
  charger: ["charger", "adapter", "chargeur"],
  cable: ["cable", "usb", "type c", "type-c", "usb-c", "lightning"],
  audio: ["audio", "earbuds", "earphones", "headphones", "airpods", "headset"],
  speaker: ["speaker", "bluetooth speaker"],
  "power bank": ["power bank", "powerbank"],
  network: ["router", "modem", "wifi", "wi-fi"],
  printer: ["printer"],
  storage: ["ssd", "hard drive", "hdd", "usb drive", "flash", "memory card"],
  case: ["case", "cover"],
  "screen protector": ["screen protector", "protector"],
  hardware: CATEGORY_SEARCH_MAP.HARDWARE,
  "home kitchen": CATEGORY_SEARCH_MAP.HOME_KITCHEN,
  lighting: CATEGORY_SEARCH_MAP.LIGHTING,
  "spare parts": CATEGORY_SEARCH_MAP.SPARE_PARTS,
});

function tokenizeQuery(value) {
  const text = normalizeSearchText(value);
  if (!text) return [];

  const stopWords = new Set([
    "price", "stock", "available", "availability", "buy", "order", "want", "need",
    "the", "for", "with", "and", "phone", "please", "how", "much", "do", "you",
    "have", "mufite", "murafite", "igiciro", "angahe", "nkeneye", "ndashaka",
    "ndayishaka", "show", "send", "me", "hello", "hi",
  ]);

  return text
    .split(" ")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => x.length >= 2)
    .filter((x) => !stopWords.has(x));
}

function buildSearchHaystack(product) {
  return normalizeSearchText(
    [
      product?.name,
      product?.brand,
      product?.category,
      product?.subcategory,
      product?.sku,
      product?.barcode,
      product?.serial,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function extractBudgetFromText(text) {
  const raw = normalizeLower(text);

  const patterns = [
    /\b(?:around|about|budget|under|below|max(?:imum)?|up to|near|within)\s*(\d+(?:[.,]\d+)?)\s*(k|m|rwf|frw)?\b/i,
    /\b(\d+(?:[.,]\d+)?)\s*(k|m)\b/i,
    /\b(\d{5,8})\s*(rwf|frw)?\b/i,
  ];

  for (const rx of patterns) {
    const m = raw.match(rx);
    if (!m) continue;

    let amount = Number(String(m[1]).replace(/,/g, ""));
    if (!Number.isFinite(amount)) continue;

    const unit = String(m[2] || "").toLowerCase();

    if (unit === "k") amount *= 1000;
    if (unit === "m") amount *= 1000000;

    return Math.round(amount);
  }

  return null;
}

function detectBrandFromText(text) {
  const raw = normalizeLower(text);

  const brands = [
    "samsung", "apple", "iphone", "tecno", "infinix", "xiaomi", "redmi", "itel",
    "nokia", "oppo", "vivo", "huawei", "google", "pixel", "oneplus", "hp",
    "dell", "lenovo", "asus", "acer", "msi", "toshiba", "canon", "epson",
    "brother", "logitech", "anker", "oraimo", "jbl", "sony", "bose", "beats",
    "sandisk", "kingston", "seagate", "wd", "tp-link", "tplink", "mikrotik",
    "bosch", "total", "stanley", "makita", "philips", "osram", "toyota",
    "hyundai", "nissan", "suzuki", "honda", "mazda",
  ];

  for (const brand of brands) {
    if (raw.includes(brand)) {
      if (brand === "iphone") return "Apple";
      if (brand === "pixel") return "Google";
      if (brand === "tplink") return "TP-Link";
      if (brand === "hp") return "HP";
      if (brand === "wd") return "WD";

      return brand
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("-");
    }
  }

  return null;
}

function detectCategoryFromText(text) {
  const category = inferCategoryFromText(text);
  if (!category) return null;

  const raw = normalizeLower(text);

  if (category === "ELECTRONICS") {
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
  }

  if (category === "HARDWARE") return "hardware";
  if (category === "HOME_KITCHEN") return "home kitchen";
  if (category === "LIGHTING") return "lighting";
  if (category === "SPARE_PARTS") return "spare parts";

  return null;
}

function buildCategoryWhere(category) {
  if (!category) return null;

  const q = normalizeLower(category);
  const keywords = PRODUCT_TYPE_ALIASES[q] || CATEGORY_SEARCH_MAP[category] || [q];
  const productFields = getModelFields(prisma.product);

  return {
    OR: keywords.flatMap((kw) => {
      const conditions = [{ name: { contains: kw, mode: "insensitive" } }];

      if (typeof productFields.category !== "undefined") {
        conditions.push({ category: { contains: kw, mode: "insensitive" } });
      }

      if (typeof productFields.subcategory !== "undefined") {
        conditions.push({ subcategory: { contains: kw, mode: "insensitive" } });
      }

      if (typeof productFields.brand !== "undefined") {
        conditions.push({ brand: { contains: kw, mode: "insensitive" } });
      }

      return conditions;
    }),
  };
}

function scoreProductAgainstQuery(product, queryTokens, category = null) {
  const hay = buildSearchHaystack(product);
  let score = 0;

  for (const token of queryTokens) {
    if (!token) continue;

    const exactWord = new RegExp(`\\b${escapeRegExp(token)}\\b`, "i");

    if (exactWord.test(hay)) {
      score += 8;
      continue;
    }

    if (hay.includes(token.toLowerCase())) {
      score += 3;
    }
  }

  const fullName = normalizeLower(product?.name);
  const fullSku = normalizeLower(product?.sku);
  const fullBarcode = normalizeLower(product?.barcode);
  const fullSerial = normalizeLower(product?.serial);

  const joinedQuery = queryTokens.join(" ").trim();

  if (joinedQuery) {
    if (fullName === joinedQuery) score += 10;
    if (fullSku === joinedQuery) score += 12;
    if (fullBarcode === joinedQuery) score += 12;
    if (fullSerial === joinedQuery) score += 12;
    if (fullName.includes(joinedQuery)) score += 5;
  }

  if (category) {
    const context = getCategoryContext(category, joinedQuery || hay);
    const categoryKeywords = context.keywords || [];

    if (categoryKeywords.some((kw) => hay.includes(normalizeLower(kw)))) {
      score += 3;
    }
  }

  if (Number(product?.availableQty ?? product?.stockQty ?? 0) > 0) score += 1;

  return score;
}

function buildProductSelect() {
  const productFields = getModelFields(prisma.product);

  return {
    id: true,
    name: true,
    sellPrice: true,
    stockQty: true,
    ...(typeof productFields.brand !== "undefined" ? { brand: true } : {}),
    ...(typeof productFields.category !== "undefined" ? { category: true } : {}),
    ...(typeof productFields.subcategory !== "undefined" ? { subcategory: true } : {}),
    ...(typeof productFields.sku !== "undefined" ? { sku: true } : {}),
    ...(typeof productFields.barcode !== "undefined" ? { barcode: true } : {}),
    ...(typeof productFields.serial !== "undefined" ? { serial: true } : {}),
  };
}

function dedupeProducts(products) {
  const seen = new Set();
  const out = [];

  for (const p of products || []) {
    const key =
      p?.id ||
      `${normalizeLower(p?.name)}|${normalizeLower(p?.sku)}|${normalizeLower(p?.barcode)}`;

    if (seen.has(key)) continue;

    seen.add(key);
    out.push(p);
  }

  return out;
}

async function attachBranchQuantities({ tenantId, branchId, products }) {
  if (!Array.isArray(products) || products.length === 0) return [];

  if (!branchId || !prisma.branchInventory) {
    return products.map((product) => ({
      ...product,
      branchQty: null,
      availableQty: safeNumber(product.stockQty),
      stockSource: "PRODUCT",
    }));
  }

  const productIds = products.map((product) => product.id).filter(Boolean);

  const rows = await prisma.branchInventory.findMany({
    where: {
      tenantId,
      branchId,
      productId: { in: productIds },
    },
    select: {
      productId: true,
      qtyOnHand: true,
    },
  });

  const qtyByProductId = new Map(rows.map((row) => [row.productId, safeNumber(row.qtyOnHand)]));

  return products.map((product) => {
    const branchQty = qtyByProductId.has(product.id)
      ? qtyByProductId.get(product.id)
      : 0;

    return {
      ...product,
      branchQty,
      availableQty: branchQty,
      stockSource: "BRANCH_INVENTORY",
    };
  });
}

function buildProductWhere({
  tenantId,
  query = null,
  tokens = [],
  budget = null,
  brand = null,
  category = null,
}) {
  const productFields = getModelFields(prisma.product);

  const and = [
    { tenantId },
    ...(typeof productFields.isActive !== "undefined" ? [{ isActive: true }] : []),
  ];

  if (budget) {
    and.push({
      sellPrice: {
        gte: Math.max(0, Math.round(budget * 0.6)),
        lte: Math.round(budget * 1.15),
      },
    });
  }

  if (brand) {
    const brandOr = [{ name: { contains: brand, mode: "insensitive" } }];

    if (typeof productFields.brand !== "undefined") {
      brandOr.push({ brand: { contains: brand, mode: "insensitive" } });
    }

    and.push({ OR: brandOr });
  }

  const categoryWhere = buildCategoryWhere(category);
  if (categoryWhere) and.push(categoryWhere);

  if (query) {
    const exactOr = [{ name: { contains: query, mode: "insensitive" } }];

    if (typeof productFields.category !== "undefined") {
      exactOr.push({ category: { contains: query, mode: "insensitive" } });
    }

    if (typeof productFields.subcategory !== "undefined") {
      exactOr.push({ subcategory: { contains: query, mode: "insensitive" } });
    }

    if (typeof productFields.brand !== "undefined") {
      exactOr.push({ brand: { contains: query, mode: "insensitive" } });
    }

    if (typeof productFields.sku !== "undefined") {
      exactOr.push({ sku: { contains: query, mode: "insensitive" } });
    }

    if (typeof productFields.barcode !== "undefined") {
      exactOr.push({ barcode: { contains: query, mode: "insensitive" } });
    }

    if (typeof productFields.serial !== "undefined") {
      exactOr.push({ serial: { contains: query, mode: "insensitive" } });
    }

    const tokenOr = tokens.flatMap((token) => {
      const conditions = [{ name: { contains: token, mode: "insensitive" } }];

      if (typeof productFields.brand !== "undefined") {
        conditions.push({ brand: { contains: token, mode: "insensitive" } });
      }

      if (typeof productFields.category !== "undefined") {
        conditions.push({ category: { contains: token, mode: "insensitive" } });
      }

      if (typeof productFields.subcategory !== "undefined") {
        conditions.push({ subcategory: { contains: token, mode: "insensitive" } });
      }

      if (typeof productFields.sku !== "undefined") {
        conditions.push({ sku: { contains: token, mode: "insensitive" } });
      }

      if (typeof productFields.barcode !== "undefined") {
        conditions.push({ barcode: { contains: token, mode: "insensitive" } });
      }

      if (typeof productFields.serial !== "undefined") {
        conditions.push({ serial: { contains: token, mode: "insensitive" } });
      }

      return conditions;
    });

    and.push({
      OR: [...exactOr, ...tokenOr],
    });
  }

  return { AND: and };
}

function sortAndLimitProducts({ products, tokens, take, budget = null, category = null }) {
  return dedupeProducts(products)
    .map((p) => ({
      ...p,
      _score: scoreProductAgainstQuery(p, tokens, category),
    }))
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;

      if (budget) {
        const da = Math.abs(Number(a.sellPrice || 0) - budget);
        const db = Math.abs(Number(b.sellPrice || 0) - budget);
        if (da !== db) return da - db;
      }

      if (Number(b.availableQty || 0) !== Number(a.availableQty || 0)) {
        return Number(b.availableQty || 0) - Number(a.availableQty || 0);
      }

      if (Number(a.sellPrice || 0) !== Number(b.sellPrice || 0)) {
        return Number(a.sellPrice || 0) - Number(b.sellPrice || 0);
      }

      return String(a.name || "").localeCompare(String(b.name || ""));
    })
    .filter((p) => p._score > 0 || budget)
    .slice(0, take)
    .map(({ _score, ...rest }) => rest);
}

async function searchProducts({ tenantId, q, take = 3, branchId = null, category = null }) {
  const query = normalizeText(q);
  if (!query || query.length < 2) return [];

  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];

  const detectedCategory = category || detectCategoryFromText(query);
  const brand = detectBrandFromText(query);
  const productFields = getModelFields(prisma.product);
  const limit = Math.max(1, Number(take) || 3);

  const products = await prisma.product.findMany({
    where: buildProductWhere({
      tenantId,
      query,
      tokens,
      brand,
      category: detectedCategory,
    }),
    select: buildProductSelect(),
    orderBy: [
      { stockQty: "desc" },
      { sellPrice: "asc" },
      { name: "asc" },
    ],
    take: Math.max(24, limit * 8 || 24),
  });

  const withBranchQty = await attachBranchQuantities({
    tenantId,
    branchId,
    products,
  });

  return sortAndLimitProducts({
    products: withBranchQty,
    tokens,
    take: limit,
    category: detectedCategory,
  }).filter((p) => {
    if (branchId && prisma.branchInventory) return Number(p.availableQty || 0) > 0;
    if (typeof productFields.stockQty !== "undefined") return Number(p.stockQty || 0) > 0;
    return true;
  });
}

async function searchProductsByBudgetIntent({ tenantId, text, take = 3, branchId = null, category = null }) {
  const budget = extractBudgetFromText(text);
  const brand = detectBrandFromText(text);
  const detectedCategory = category || detectCategoryFromText(text);

  if (!budget && !brand && !detectedCategory) {
    return {
      products: [],
      meta: { budget: null, brand: null, category: null, used: false, relaxed: false },
    };
  }

  const limit = Math.max(1, Number(take) || 3);
  const tokens = tokenizeQuery([brand, detectedCategory].filter(Boolean).join(" "));

  let strictProducts = [];

  if (budget) {
    strictProducts = await prisma.product.findMany({
      where: buildProductWhere({
        tenantId,
        budget,
        brand,
        category: detectedCategory,
      }),
      select: buildProductSelect(),
      take: 30,
    });
  }

  if (strictProducts.length > 0) {
    const withBranchQty = await attachBranchQuantities({
      tenantId,
      branchId,
      products: strictProducts,
    });

    const products = sortAndLimitProducts({
      products: withBranchQty,
      tokens,
      take: limit,
      budget,
      category: detectedCategory,
    }).filter((p) => Number(p.availableQty ?? p.stockQty ?? 0) > 0);

    return {
      products,
      meta: {
        budget,
        brand,
        category: detectedCategory,
        categoryLabel: detectedCategory ? getCategoryContext(detectedCategory).label : null,
        used: true,
        relaxed: false,
      },
    };
  }

  const relaxedProducts = await prisma.product.findMany({
    where: buildProductWhere({
      tenantId,
      brand,
      category: detectedCategory,
    }),
    select: buildProductSelect(),
    take: 35,
  });

  const withBranchQty = await attachBranchQuantities({
    tenantId,
    branchId,
    products: relaxedProducts,
  });

  const products = sortAndLimitProducts({
    products: withBranchQty,
    tokens,
    take: limit,
    budget,
    category: detectedCategory,
  }).filter((p) => Number(p.availableQty ?? p.stockQty ?? 0) > 0);

  return {
    products,
    meta: {
      budget,
      brand,
      category: detectedCategory,
      categoryLabel: detectedCategory ? getCategoryContext(detectedCategory).label : null,
      used: true,
      relaxed: true,
    },
  };
}

async function findBestProductMatch({ tenantId, query, branchId = null, category = null }) {
  const cleanQuery = normalizeText(query);

  if (!cleanQuery) {
    return { kind: "NONE", product: null, candidates: [] };
  }

  const candidates = await searchProducts({
    tenantId,
    q: cleanQuery,
    take: 6,
    branchId,
    category,
  });

  if (!candidates.length) {
    return { kind: "NONE", product: null, candidates: [] };
  }

  if (candidates.length === 1) {
    return { kind: "ONE", product: candidates[0], candidates };
  }

  const normalizedQuery = normalizeLower(cleanQuery);
  const tokens = tokenizeQuery(cleanQuery);

  const exactName = candidates.find((p) => normalizeLower(p.name) === normalizedQuery);
  if (exactName) return { kind: "ONE", product: exactName, candidates };

  const exactSku = candidates.find((p) => normalizeLower(p.sku) === normalizedQuery);
  if (exactSku) return { kind: "ONE", product: exactSku, candidates };

  const exactBarcode = candidates.find((p) => normalizeLower(p.barcode) === normalizedQuery);
  if (exactBarcode) return { kind: "ONE", product: exactBarcode, candidates };

  const exactSerial = candidates.find((p) => normalizeLower(p.serial) === normalizedQuery);
  if (exactSerial) return { kind: "ONE", product: exactSerial, candidates };

  const scored = candidates.map((p) => ({
    product: p,
    score: scoreProductAgainstQuery(p, tokens, category),
  }));

  scored.sort((a, b) => b.score - a.score);

  const first = scored[0];
  const second = scored[1];

  if (!second) {
    return { kind: "ONE", product: first.product, candidates };
  }

  if (first.score >= second.score + 4) {
    return { kind: "ONE", product: first.product, candidates };
  }

  return {
    kind: "MULTIPLE",
    product: null,
    candidates: candidates.slice(0, 4),
  };
}

function formatProductLine(p) {
  const pieces = [];

  if (p?.brand) pieces.push(p.brand);
  if (p?.category) pieces.push(p.category);
  if (p?.subcategory) pieces.push(p.subcategory);
  if (p?.sku) pieces.push(`SKU ${p.sku}`);

  return pieces.join(" • ");
}

function availabilityLine(product) {
  const qty = Number(product?.availableQty ?? product?.stockQty ?? 0);

  if (qty <= 0) {
    return "Availability: our team will confirm";
  }

  return `Available: ${Math.round(qty)}`;
}

function buildProductListLines(products) {
  const lines = [];

  for (const p of products || []) {
    lines.push(`📦 *${p.name}*`);
    if (formatProductLine(p)) lines.push(formatProductLine(p));
    lines.push(`💰 Price: ${formatMoneyRwf(p.sellPrice)}`);
    lines.push(`📍 ${availabilityLine(p)}`);
    lines.push("");
  }

  return lines;
}

function buildProductsReply({ businessName, q, products, category = null }) {
  const context = getCategoryContext(category || q, q);
  const categoryLabel = context.label;

  if (!products || products.length === 0) {
    return (
      `❌ *${businessName}*\n` +
      `${buildNotFoundReply(context.category)}\n\n` +
      `Search: "${q}"\n` +
      `Reply with ${context.questionRule.shortLabel}, SKU, barcode, or product name.`
    );
  }

  const lines = [];

  lines.push(`✅ *${businessName}*`);
  lines.push(`*${categoryLabel}*`);
  lines.push(`Closest matches for: "${q}"`);
  lines.push("");

  lines.push(...buildProductListLines(products));

  lines.push(`To reserve, reply with:`);
  lines.push(`*BUY <exact product name>*`);
  lines.push(`Our staff will confirm pickup or delivery details.`);

  return lines.join("\n").trim();
}

function buildBudgetProductsReply({ businessName, originalText, products, meta }) {
  const context = getCategoryContext(meta?.category || originalText, originalText);

  if (!products || products.length === 0) {
    return (
      `❌ *${businessName}*\n` +
      `No close available match for "${originalText}".\n\n` +
      `${buildNoProductReply(context.category)}`
    );
  }

  const lines = [];

  lines.push(`✅ *${businessName}*`);
  lines.push(`*${meta?.categoryLabel || context.label}*`);

  if (meta?.relaxed) {
    lines.push(`No exact budget match found.`);
    lines.push(`Closest available options:`);
  } else {
    lines.push(`Close matches for your request:`);
  }

  const hints = [];

  if (meta?.brand) hints.push(`brand: ${meta.brand}`);
  if (meta?.categoryLabel || meta?.category) hints.push(`category: ${meta.categoryLabel || meta.category}`);
  if (meta?.budget) hints.push(`budget: ${formatMoneyRwf(meta.budget)}`);

  if (hints.length) lines.push(`(${hints.join(" • ")})`);

  lines.push("");

  lines.push(...buildProductListLines(products));

  lines.push(`To reserve, reply with:`);
  lines.push(`*BUY <exact product name>*`);
  lines.push(`Our staff will confirm pickup or delivery details.`);

  return lines.join("\n").trim();
}

function buildBuyCreatedReply({ businessName, product, quantity, draftId }) {
  const code = String(draftId || "").slice(-6).toUpperCase();
  const qty = Math.max(1, Number(quantity || 1));
  const total = Number(product?.sellPrice || 0) * qty;

  const lines = [];

  lines.push(`✅ *${businessName}*`);
  lines.push(`Order request prepared.`);
  lines.push("");
  lines.push(`📦 Product: *${product.name}*`);
  lines.push(`🔢 Quantity: *${qty}*`);
  lines.push(`💰 Unit price: ${formatMoneyRwf(product.sellPrice)}`);
  lines.push(`🧾 Draft code: *${code}*`);
  lines.push(`Estimated total: *${formatMoneyRwf(total)}*`);
  lines.push("");
  lines.push(`Our staff will review and finalize your order.`);
  lines.push(`To record payment later, send:`);
  lines.push(`*PAY ${Math.round(total)} MOMO YOUR_REF #${code}*`);

  return lines.join("\n");
}

function buildBuyMultipleReply({ businessName, query, candidates, category = null }) {
  const context = getCategoryContext(category || query, query);
  const lines = [];

  lines.push(`⚠️ *${businessName}*`);
  lines.push(`I found multiple ${context.label.toLowerCase()} matches for "${query}".`);
  lines.push(`Please reply with the exact product name:`);
  lines.push("");

  for (const p of candidates || []) {
    lines.push(
      `• *${p.name}* — ${formatMoneyRwf(p.sellPrice)} — ${availabilityLine(p)}`
    );
  }

  lines.push("");
  lines.push(`Example: *BUY ${candidates?.[0]?.name || "<exact product name>"}*`);

  return lines.join("\n");
}

function buildClarifierReply({ businessName, category, text }) {
  const context = getCategoryContext(category, text);

  return (
    `✅ *${businessName}*\n` +
    `*${context.label}*\n` +
    `${buildClarifyingQuestion(context.category, text)}`
  );
}

function buildHumanEscalationReply({ businessName, text = "" }) {
  const category = inferCategoryFromText(text);
  const context = getCategoryContext(category, text);

  return (
    `🤝 *${businessName}*\n` +
    `A staff member will help you shortly.\n\n` +
    `You can also reply with:\n` +
    `• Product name\n` +
    `• ${context.questionRule.shortLabel}\n` +
    `• Quantity\n` +
    `• Photo if available`
  );
}

module.exports = {
  searchProducts,
  searchProductsByBudgetIntent,
  findBestProductMatch,
  formatMoneyRwf,
  buildProductsReply,
  buildBudgetProductsReply,
  buildBuyCreatedReply,
  buildBuyMultipleReply,
  buildClarifierReply,
  buildHumanEscalationReply,

  // helpful for safe testing
  detectCategoryFromText,
  detectBrandFromText,
  extractBudgetFromText,
  tokenizeQuery,
};
