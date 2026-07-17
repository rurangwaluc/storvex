function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizedToken(value) {
  return cleanString(value)
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const CATEGORY_ALIASES = {
  ELECTRONICS: "ELECTRONICS",
  ELECTRONIC: "ELECTRONICS",
  PHONES: "ELECTRONICS",
  PHONE: "ELECTRONICS",
  SMARTPHONES: "ELECTRONICS",
  LAPTOPS: "ELECTRONICS",
  LAPTOP: "ELECTRONICS",
  COMPUTERS: "ELECTRONICS",
  COMPUTER: "ELECTRONICS",
  TELEVISIONS: "ELECTRONICS",
  TVS: "ELECTRONICS",
  ACCESSORIES: "ELECTRONICS",

  HARDWARE: "HARDWARE",
  QUINCAILLERIE: "HARDWARE",
  BUILDING_MATERIALS: "HARDWARE",
  CONSTRUCTION_MATERIALS: "HARDWARE",
  TOOLS: "HARDWARE",
  PLUMBING: "HARDWARE",
  PAINT: "HARDWARE",

  HOME_KITCHEN: "HOME_KITCHEN",
  HOME_AND_KITCHEN: "HOME_KITCHEN",
  HOME_KITCHEN_MATERIALS: "HOME_KITCHEN",
  KITCHEN: "HOME_KITCHEN",
  COOKWARE: "HOME_KITCHEN",
  TILES: "HOME_KITCHEN",
  SINKS: "HOME_KITCHEN",

  LIGHTING: "LIGHTING",
  LIGHTS: "LIGHTING",
  LIGHT: "LIGHTING",
  BULBS: "LIGHTING",
  LED: "LIGHTING",

  SPARE_PARTS: "SPARE_PARTS",
  SPARE_PART: "SPARE_PARTS",
  SPARES: "SPARE_PARTS",
  PARTS: "SPARE_PARTS",
  AUTO_PARTS: "SPARE_PARTS",
  REPLACEMENT_PARTS: "SPARE_PARTS",
};

const COMMON_ALIASES = {
  productType: [
    "productType",
    "type",
    "itemType",
    "deviceType",
    "lightType",
    "partType",
  ],
  brand: ["brand", "manufacturer", "make"],
  model: ["model", "modelName", "modelNumber"],
  color: ["color", "colour"],
  condition: ["condition", "itemCondition"],
  warranty: [
    "warranty",
    "warrantyPeriod",
    "warrantyMonths",
  ],
  size: ["size", "dimensions", "dimension"],
  material: ["material", "materialType"],
};

const CATEGORY_DEFINITIONS = {
  ELECTRONICS: {
    key: "ELECTRONICS",
    label: "Electronics",
    cardFields: [
      {
        key: "ram",
        label: "RAM",
        aliases: ["ram", "memory", "memorySize"],
      },
      {
        key: "storage",
        label: "Storage",
        aliases: [
          "storage",
          "storageSize",
          "internalStorage",
          "capacity",
        ],
      },
      {
        key: "processor",
        label: "Processor",
        aliases: [
          "processor",
          "cpu",
          "chipset",
          "processorType",
        ],
      },
      {
        key: "screenSize",
        label: "Screen",
        aliases: [
          "screenSize",
          "displaySize",
          "screen",
        ],
      },
      {
        key: "warranty",
        label: "Warranty",
        aliases: COMMON_ALIASES.warranty,
      },
    ],
    compareFields: [
      {
        key: "productType",
        label: "Product type",
        aliases: COMMON_ALIASES.productType,
      },
      {
        key: "brand",
        label: "Brand",
        aliases: COMMON_ALIASES.brand,
      },
      {
        key: "model",
        label: "Model",
        aliases: COMMON_ALIASES.model,
      },
      {
        key: "ram",
        label: "RAM",
        aliases: ["ram", "memory", "memorySize"],
      },
      {
        key: "storage",
        label: "Storage",
        aliases: [
          "storage",
          "storageSize",
          "internalStorage",
          "capacity",
        ],
      },
      {
        key: "processor",
        label: "Processor",
        aliases: [
          "processor",
          "cpu",
          "chipset",
          "processorType",
        ],
      },
      {
        key: "screenSize",
        label: "Screen size",
        aliases: [
          "screenSize",
          "displaySize",
          "screen",
        ],
      },
      {
        key: "battery",
        label: "Battery",
        aliases: [
          "battery",
          "batteryCapacity",
          "batterySize",
        ],
      },
      {
        key: "camera",
        label: "Camera",
        aliases: [
          "camera",
          "cameraResolution",
          "rearCamera",
        ],
      },
      {
        key: "network",
        label: "Network",
        aliases: [
          "network",
          "networkSupport",
          "connectivity",
        ],
      },
      {
        key: "color",
        label: "Color",
        aliases: COMMON_ALIASES.color,
      },
      {
        key: "condition",
        label: "Condition",
        aliases: COMMON_ALIASES.condition,
      },
      {
        key: "warranty",
        label: "Warranty",
        aliases: COMMON_ALIASES.warranty,
      },
      {
        key: "accessories",
        label: "Included",
        aliases: [
          "accessories",
          "includedAccessories",
          "itemsIncluded",
        ],
      },
    ],
  },

  HARDWARE: {
    key: "HARDWARE",
    label: "Hardware / Quincaillerie",
    cardFields: [
      {
        key: "size",
        label: "Size",
        aliases: COMMON_ALIASES.size,
      },
      {
        key: "unit",
        label: "Unit",
        aliases: [
          "unit",
          "unitOfSale",
          "sellingUnit",
        ],
      },
      {
        key: "material",
        label: "Material",
        aliases: COMMON_ALIASES.material,
      },
      {
        key: "grade",
        label: "Grade",
        aliases: ["grade", "strengthGrade"],
      },
    ],
    compareFields: [
      {
        key: "productType",
        label: "Item type",
        aliases: COMMON_ALIASES.productType,
      },
      {
        key: "brand",
        label: "Brand",
        aliases: COMMON_ALIASES.brand,
      },
      {
        key: "material",
        label: "Material",
        aliases: COMMON_ALIASES.material,
      },
      {
        key: "size",
        label: "Size",
        aliases: COMMON_ALIASES.size,
      },
      {
        key: "grade",
        label: "Grade",
        aliases: ["grade", "strengthGrade"],
      },
      {
        key: "weight",
        label: "Weight",
        aliases: ["weight", "netWeight"],
      },
      {
        key: "unit",
        label: "Unit of sale",
        aliases: [
          "unit",
          "unitOfSale",
          "sellingUnit",
        ],
      },
      {
        key: "packQuantity",
        label: "Pack quantity",
        aliases: [
          "packQuantity",
          "quantityPerPack",
          "packSize",
        ],
      },
      {
        key: "capacity",
        label: "Capacity",
        aliases: [
          "capacity",
          "strength",
          "power",
        ],
      },
      {
        key: "finish",
        label: "Finish",
        aliases: ["finish", "surfaceFinish"],
      },
      {
        key: "color",
        label: "Color",
        aliases: COMMON_ALIASES.color,
      },
      {
        key: "use",
        label: "Best use",
        aliases: [
          "use",
          "usage",
          "indoorOutdoor",
          "application",
        ],
      },
      {
        key: "warranty",
        label: "Warranty",
        aliases: COMMON_ALIASES.warranty,
      },
    ],
  },

  HOME_KITCHEN: {
    key: "HOME_KITCHEN",
    label: "Home & kitchen",
    cardFields: [
      {
        key: "material",
        label: "Material",
        aliases: COMMON_ALIASES.material,
      },
      {
        key: "size",
        label: "Size",
        aliases: COMMON_ALIASES.size,
      },
      {
        key: "capacity",
        label: "Capacity",
        aliases: ["capacity", "volume"],
      },
      {
        key: "setPieces",
        label: "Set",
        aliases: [
          "setPieces",
          "pieces",
          "numberOfPieces",
        ],
      },
    ],
    compareFields: [
      {
        key: "productType",
        label: "Product type",
        aliases: COMMON_ALIASES.productType,
      },
      {
        key: "brand",
        label: "Brand",
        aliases: COMMON_ALIASES.brand,
      },
      {
        key: "model",
        label: "Model",
        aliases: COMMON_ALIASES.model,
      },
      {
        key: "material",
        label: "Material",
        aliases: COMMON_ALIASES.material,
      },
      {
        key: "size",
        label: "Dimensions",
        aliases: COMMON_ALIASES.size,
      },
      {
        key: "capacity",
        label: "Capacity",
        aliases: ["capacity", "volume"],
      },
      {
        key: "finish",
        label: "Finish",
        aliases: ["finish", "surfaceFinish"],
      },
      {
        key: "color",
        label: "Color",
        aliases: COMMON_ALIASES.color,
      },
      {
        key: "setPieces",
        label: "Number of pieces",
        aliases: [
          "setPieces",
          "pieces",
          "numberOfPieces",
        ],
      },
      {
        key: "installation",
        label: "Installation",
        aliases: [
          "installation",
          "installationRequired",
        ],
      },
      {
        key: "use",
        label: "Best use",
        aliases: [
          "use",
          "usage",
          "indoorOutdoor",
        ],
      },
      {
        key: "warranty",
        label: "Warranty",
        aliases: COMMON_ALIASES.warranty,
      },
    ],
  },

  LIGHTING: {
    key: "LIGHTING",
    label: "Lighting",
    cardFields: [
      {
        key: "wattage",
        label: "Power",
        aliases: ["wattage", "watts", "power"],
      },
      {
        key: "lightColor",
        label: "Light color",
        aliases: [
          "lightColor",
          "colorTemperature",
          "colourTemperature",
        ],
      },
      {
        key: "lumens",
        label: "Brightness",
        aliases: ["lumens", "brightness"],
      },
      {
        key: "fitting",
        label: "Fitting",
        aliases: [
          "fitting",
          "baseType",
          "socketType",
        ],
      },
    ],
    compareFields: [
      {
        key: "productType",
        label: "Light type",
        aliases: COMMON_ALIASES.productType,
      },
      {
        key: "brand",
        label: "Brand",
        aliases: COMMON_ALIASES.brand,
      },
      {
        key: "wattage",
        label: "Wattage",
        aliases: ["wattage", "watts", "power"],
      },
      {
        key: "voltage",
        label: "Voltage",
        aliases: ["voltage", "volts"],
      },
      {
        key: "lumens",
        label: "Brightness",
        aliases: ["lumens", "brightness"],
      },
      {
        key: "colorTemperature",
        label: "Color temperature",
        aliases: [
          "colorTemperature",
          "colourTemperature",
          "lightColor",
        ],
      },
      {
        key: "shape",
        label: "Shape",
        aliases: ["shape", "bulbShape"],
      },
      {
        key: "fitting",
        label: "Fitting type",
        aliases: [
          "fitting",
          "baseType",
          "socketType",
        ],
      },
      {
        key: "dimmable",
        label: "Dimmable",
        aliases: ["dimmable", "isDimmable"],
      },
      {
        key: "use",
        label: "Best use",
        aliases: [
          "use",
          "usage",
          "indoorOutdoor",
        ],
      },
      {
        key: "waterproof",
        label: "Waterproof rating",
        aliases: [
          "waterproof",
          "ipRating",
          "waterproofRating",
        ],
      },
      {
        key: "lifespan",
        label: "Expected lifespan",
        aliases: [
          "lifespan",
          "expectedLifespan",
          "lifeHours",
        ],
      },
      {
        key: "warranty",
        label: "Warranty",
        aliases: COMMON_ALIASES.warranty,
      },
    ],
  },

  SPARE_PARTS: {
    key: "SPARE_PARTS",
    label: "Spare parts",
    cardFields: [
      {
        key: "partNumber",
        label: "Part number",
        aliases: [
          "partNumber",
          "partNo",
          "sku",
        ],
      },
      {
        key: "compatibleModel",
        label: "Fits",
        aliases: [
          "compatibleModel",
          "compatibility",
          "compatibleModels",
        ],
      },
      {
        key: "condition",
        label: "Condition",
        aliases: COMMON_ALIASES.condition,
      },
      {
        key: "warranty",
        label: "Warranty",
        aliases: COMMON_ALIASES.warranty,
      },
    ],
    compareFields: [
      {
        key: "productType",
        label: "Part type",
        aliases: COMMON_ALIASES.productType,
      },
      {
        key: "brand",
        label: "Brand",
        aliases: COMMON_ALIASES.brand,
      },
      {
        key: "partNumber",
        label: "Part number",
        aliases: [
          "partNumber",
          "partNo",
          "sku",
        ],
      },
      {
        key: "compatibleBrand",
        label: "Compatible brand",
        aliases: [
          "compatibleBrand",
          "vehicleBrand",
          "deviceBrand",
        ],
      },
      {
        key: "compatibleModel",
        label: "Compatible model",
        aliases: [
          "compatibleModel",
          "compatibility",
          "compatibleModels",
        ],
      },
      {
        key: "compatibleYear",
        label: "Compatible year",
        aliases: [
          "compatibleYear",
          "modelYear",
          "year",
        ],
      },
      {
        key: "position",
        label: "Position or side",
        aliases: [
          "position",
          "side",
          "placement",
        ],
      },
      {
        key: "size",
        label: "Size",
        aliases: COMMON_ALIASES.size,
      },
      {
        key: "material",
        label: "Material",
        aliases: COMMON_ALIASES.material,
      },
      {
        key: "condition",
        label: "Condition",
        aliases: COMMON_ALIASES.condition,
      },
      {
        key: "quality",
        label: "Part quality",
        aliases: [
          "quality",
          "partQuality",
          "originType",
          "oemType",
        ],
      },
      {
        key: "warranty",
        label: "Warranty",
        aliases: COMMON_ALIASES.warranty,
      },
    ],
  },
};

export function normalizeMarketplaceCategory(value) {
  const token = normalizedToken(value);

  return CATEGORY_ALIASES[token] || token || "ELECTRONICS";
}

export function marketplaceCategoryDefinition(value) {
  const key = normalizeMarketplaceCategory(value);

  return (
    CATEGORY_DEFINITIONS[key] ||
    CATEGORY_DEFINITIONS.ELECTRONICS
  );
}

export function marketplaceComparisonCategory(product) {
  const attributes = marketplaceProductAttributes(product);

  return normalizeMarketplaceCategory(
    attributes.businessCategory ||
      product?.businessCategory ||
      product?.category,
  );
}

export function marketplaceProductAttributes(product) {
  const raw =
    product?.attributes ||
    product?.marketplaceAttributes ||
    product?.listingAttributes ||
    product?.categoryAttributes ||
    {};

  return raw &&
    typeof raw === "object" &&
    !Array.isArray(raw)
    ? raw
    : {};
}

function attributeValue(attributes, aliases) {
  for (const alias of aliases) {
    const value = attributes?.[alias];

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    return value;
  }

  return null;
}

export function friendlyMarketplaceValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => cleanString(item))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => cleanString(item))
      .filter(Boolean)
      .join(", ");
  }

  return cleanString(value) || "—";
}

export function marketplaceFieldValue(product, field) {
  const attributes = marketplaceProductAttributes(product);

  return friendlyMarketplaceValue(
    attributeValue(
      attributes,
      field.aliases || [field.key],
    ),
  );
}

export function marketplaceCardAttributes(product) {
  const definition = marketplaceCategoryDefinition(
    marketplaceComparisonCategory(product),
  );

  return definition.cardFields
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: marketplaceFieldValue(product, field),
    }))
    .filter((item) => item.value !== "—")
    .slice(0, 2);
}

export function marketplaceComparisonFields(products) {
  const first = products?.[0];

  if (!first) return [];

  const definition = marketplaceCategoryDefinition(
    marketplaceComparisonCategory(first),
  );

  return definition.compareFields.filter((field) =>
    products.some(
      (product) =>
        marketplaceFieldValue(product, field) !== "—",
    ),
  );
}

export function marketplaceDiscountPercent(product) {
  const regularPrice = Number(product?.regularPrice);
  const salePrice = Number(product?.price);

  if (
    !product?.onSale ||
    !Number.isFinite(regularPrice) ||
    !Number.isFinite(salePrice) ||
    regularPrice <= 0 ||
    salePrice >= regularPrice
  ) {
    return 0;
  }

  return Math.max(
    1,
    Math.round(
      ((regularPrice - salePrice) / regularPrice) *
        100,
    ),
  );
}
