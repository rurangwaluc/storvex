const UNIT_OPTIONS = [
  "Piece",
  "Box",
  "Carton",
  "Pack",
  "Pair",
  "Set",
  "Bag",
  "Kg",
  "Litre",
  "Metre",
  "Roll",
  "Bundle",
];

const CONDITION_OPTIONS = [
  "New",
  "Used",
  "Refurbished",
  "Open box",
];

const YES_NO_OPTIONS = ["Yes", "No"];

function field(name, label, options = {}) {
  return {
    name,
    label,
    type: "text",
    placeholder: "",
    options: [],
    ...options,
  };
}

export const BUSINESS_PRODUCT_CONFIG = {
  ELECTRONICS: {
    key: "ELECTRONICS",
    label: "Electronics",
    itemLabel: "Product",
    itemLabelLower: "product",
    eyebrow: "Electronics product",
    pageDescription:
      "Add the details needed to sell, identify, and support this electronics product.",
    productNamePlaceholder:
      "Example: Samsung Galaxy A55 5G",
    brandPlaceholder: "Example: Samsung",
    categoryPrompt: "Choose electronics category",
    categories: [
      "Phones",
      "Laptops",
      "Tablets",
      "Desktop Computers",
      "Monitors",
      "Printers",
      "Networking",
      "TV & Audio",
      "Gaming",
      "Cameras",
      "Storage",
      "Accessories",
      "Smart Devices",
      "Components",
      "Other",
    ],
    subcategories: {
      Accessories: [
        "Charger",
        "Headphones / Earbuds",
        "Phone cover",
        "Screen protector",
        "Adapter / Dongle",
        "Cable",
        "Power bank",
        "SSD / HDD",
        "RAM",
        "Keyboard / Mouse",
        "Laptop bag",
        "Battery",
        "Remote",
        "Tripod",
        "Microphone",
        "Webcam",
        "Other",
      ],
      Storage: [
        "SSD",
        "HDD",
        "Memory card",
        "Flash disk",
        "External drive",
        "Other",
      ],
      Components: [
        "RAM",
        "Motherboard",
        "Power supply",
        "Battery",
        "Screen",
        "Keyboard",
        "Fan",
        "Other",
      ],
    },
    defaultFields: [
      field("model", "Model", {
        placeholder: "Example: 2025 model",
      }),
      field("specification", "Key specification", {
        placeholder:
          "Example: Bluetooth, 4K, dual-band",
      }),
      field("condition", "Condition", {
        type: "select",
        options: CONDITION_OPTIONS,
        placeholder: "Choose condition",
      }),
      field("warrantyDays", "Warranty days", {
        type: "number",
        placeholder: "Example: 30",
      }),
    ],
    categoryFields: {
      Phones: [
        field("model", "Model", {
          placeholder: "Example: SM-A556E",
        }),
        field("storage", "Storage", {
          placeholder: "Example: 256 GB",
        }),
        field("memory", "Memory", {
          placeholder: "Example: 8 GB RAM",
        }),
        field("color", "Colour", {
          placeholder: "Example: Awesome Navy",
        }),
        field("condition", "Condition", {
          type: "select",
          options: CONDITION_OPTIONS,
          placeholder: "Choose condition",
        }),
      ],
      Tablets: [
        field("model", "Model", {
          placeholder: "Example: Galaxy Tab A9",
        }),
        field("storage", "Storage", {
          placeholder: "Example: 128 GB",
        }),
        field("memory", "Memory", {
          placeholder: "Example: 6 GB RAM",
        }),
        field("screenSize", "Screen size", {
          placeholder: "Example: 11 inches",
        }),
        field("condition", "Condition", {
          type: "select",
          options: CONDITION_OPTIONS,
          placeholder: "Choose condition",
        }),
      ],
      Laptops: [
        field("model", "Model", {
          placeholder: "Example: Inspiron 15 3520",
        }),
        field("processor", "Processor", {
          placeholder: "Example: Intel Core i5",
        }),
        field("memory", "Memory", {
          placeholder: "Example: 16 GB RAM",
        }),
        field("storage", "Storage", {
          placeholder: "Example: 512 GB SSD",
        }),
        field("screenSize", "Screen size", {
          placeholder: "Example: 15.6 inches",
        }),
        field("condition", "Condition", {
          type: "select",
          options: CONDITION_OPTIONS,
          placeholder: "Choose condition",
        }),
      ],
      "Desktop Computers": [
        field("model", "Model", {
          placeholder: "Example: OptiPlex 7010",
        }),
        field("processor", "Processor", {
          placeholder: "Example: Intel Core i7",
        }),
        field("memory", "Memory", {
          placeholder: "Example: 16 GB RAM",
        }),
        field("storage", "Storage", {
          placeholder: "Example: 1 TB SSD",
        }),
        field("condition", "Condition", {
          type: "select",
          options: CONDITION_OPTIONS,
          placeholder: "Choose condition",
        }),
      ],
      "TV & Audio": [
        field("model", "Model", {
          placeholder: "Example: 55CU8000",
        }),
        field("screenSize", "Screen size", {
          placeholder: "Example: 55 inches",
        }),
        field("resolution", "Resolution", {
          placeholder: "Example: 4K UHD",
        }),
        field("smartFeature", "Smart TV", {
          type: "select",
          options: YES_NO_OPTIONS,
          placeholder: "Choose",
        }),
        field("connectivity", "Connectivity", {
          placeholder: "Example: HDMI, USB, Wi-Fi",
        }),
      ],
      Accessories: [
        field("compatibility", "Compatible with", {
          placeholder: "Example: USB-C phones",
        }),
        field("color", "Colour", {
          placeholder: "Example: Black",
        }),
        field("warrantyDays", "Warranty days", {
          type: "number",
          placeholder: "Example: 30",
        }),
        field("unit", "Selling unit", {
          type: "select",
          options: UNIT_OPTIONS,
          placeholder: "Choose unit",
        }),
      ],
    },
    tracking: {
      title: "Product identification",
      question:
        "Does each unit need its own serial number or IMEI?",
      normalTitle: "Manage by quantity",
      normalText:
        "Best when every unit is treated as the same product.",
      trackedTitle: "Track each unit separately",
      trackedText:
        "Use for phones, laptops, warranty items, and other uniquely identified devices.",
      inputLabel: "Serial number / IMEI",
      inputPlaceholder:
        "Scan or enter the serial number or IMEI",
      requiredMessage:
        "Enter the serial number or IMEI",
    },
  },

  HARDWARE: {
    key: "HARDWARE",
    label: "Hardware / Quincaillerie",
    itemLabel: "Item",
    itemLabelLower: "item",
    eyebrow: "Hardware item",
    pageDescription:
      "Add the measurements, unit, and material details needed to sell and control this hardware item.",
    productNamePlaceholder:
      "Example: Crown Emulsion Paint 20L",
    brandPlaceholder:
      "Example: Crown, Cimerwa, Bosch",
    categoryPrompt: "Choose hardware category",
    categories: [
      "Cement",
      "Iron sheets",
      "Paint",
      "Plumbing",
      "Electrical",
      "Tools",
      "Locks",
      "Tiles",
      "Timber",
      "Fasteners",
      "Adhesives",
      "Other",
    ],
    defaultFields: [
      field("unit", "Selling unit", {
        type: "select",
        options: UNIT_OPTIONS,
        placeholder: "Choose unit",
      }),
      field("size", "Size / measurement", {
        placeholder: "Example: 20L, 12mm, 2m",
      }),
      field("material", "Material", {
        placeholder: "Example: Steel, PVC, wood",
      }),
      field("grade", "Grade / quality", {
        placeholder: "Example: Standard, heavy duty",
      }),
    ],
    categoryFields: {
      Cement: [
        field("unit", "Selling unit", {
          type: "select",
          options: ["Bag", "Tonne", "Piece"],
          placeholder: "Choose unit",
        }),
        field("weight", "Weight per bag", {
          placeholder: "Example: 50 kg",
        }),
        field("cementType", "Cement type", {
          placeholder: "Example: Portland cement",
        }),
        field("grade", "Grade", {
          placeholder: "Example: 32.5R",
        }),
      ],
      "Iron sheets": [
        field("unit", "Selling unit", {
          type: "select",
          options: ["Piece", "Bundle"],
          placeholder: "Choose unit",
        }),
        field("length", "Length", {
          placeholder: "Example: 3 metres",
        }),
        field("width", "Width", {
          placeholder: "Example: 0.85 metres",
        }),
        field("gauge", "Gauge", {
          placeholder: "Example: 30 gauge",
        }),
        field("profile", "Profile", {
          placeholder: "Example: Corrugated",
        }),
        field("color", "Colour", {
          placeholder: "Example: Blue",
        }),
      ],
      Paint: [
        field("unit", "Selling unit", {
          type: "select",
          options: ["Tin", "Bucket", "Carton", "Piece"],
          placeholder: "Choose unit",
        }),
        field("containerSize", "Container size", {
          placeholder: "Example: 20 litres",
        }),
        field("color", "Colour", {
          placeholder: "Example: Brilliant white",
        }),
        field("finish", "Finish", {
          placeholder: "Example: Matt, gloss",
        }),
        field("useArea", "Recommended use", {
          placeholder: "Example: Interior walls",
        }),
      ],
      Tools: [
        field("toolType", "Tool type", {
          placeholder: "Example: Cordless drill",
        }),
        field("power", "Power", {
          placeholder: "Example: 18V",
        }),
        field("size", "Size", {
          placeholder: "Example: 13mm chuck",
        }),
        field("condition", "Condition", {
          type: "select",
          options: CONDITION_OPTIONS,
          placeholder: "Choose condition",
        }),
        field("warrantyDays", "Warranty days", {
          type: "number",
          placeholder: "Example: 90",
        }),
      ],
    },
    tracking: {
      title: "Item identification",
      question:
        "Does this item need its own serial number?",
      normalTitle: "Manage by quantity",
      normalText:
        "Best for cement, paint, fittings, fasteners, and building materials.",
      trackedTitle: "Track each item separately",
      trackedText:
        "Use for machinery, power tools, pumps, and warranty-controlled equipment.",
      inputLabel: "Machine serial number",
      inputPlaceholder:
        "Enter the manufacturer serial number",
      requiredMessage:
        "Enter the machine serial number",
    },
  },

  HOME_KITCHEN: {
    key: "HOME_KITCHEN",
    label: "Home & Kitchen",
    itemLabel: "Product",
    itemLabelLower: "product",
    eyebrow: "Home and kitchen product",
    pageDescription:
      "Add the size, material, capacity, and set details customers and staff need.",
    productNamePlaceholder:
      "Example: Stainless Steel Cooking Pot 10L",
    brandPlaceholder: "Example: Ramtons",
    categoryPrompt:
      "Choose home and kitchen category",
    categories: [
      "Cookware",
      "Kitchen appliances",
      "Dining",
      "Home appliances",
      "Storage",
      "Cleaning",
      "Furniture",
      "Decor",
      "Bathroom",
      "Bedding",
      "Other",
    ],
    defaultFields: [
      field("material", "Material", {
        placeholder:
          "Example: Stainless steel, glass",
      }),
      field("color", "Colour", {
        placeholder: "Example: Silver",
      }),
      field("size", "Size", {
        placeholder:
          "Example: Medium, 2L, queen",
      }),
      field("setPieces", "Pieces in set", {
        type: "number",
        placeholder: "Example: 6",
      }),
    ],
    categoryFields: {
      Cookware: [
        field("material", "Material", {
          placeholder: "Example: Stainless steel",
        }),
        field("capacity", "Capacity", {
          placeholder: "Example: 10 litres",
        }),
        field("setPieces", "Pieces in set", {
          type: "number",
          placeholder: "Example: 1",
        }),
        field("color", "Colour", {
          placeholder: "Example: Silver",
        }),
      ],
      "Kitchen appliances": [
        field("model", "Model", {
          placeholder: "Example: RM/330",
        }),
        field("capacity", "Capacity", {
          placeholder: "Example: 1.7 litres",
        }),
        field("power", "Power", {
          placeholder: "Example: 2200W",
        }),
        field("voltage", "Voltage", {
          placeholder: "Example: 220–240V",
        }),
        field("color", "Colour", {
          placeholder: "Example: Black",
        }),
        field("warrantyDays", "Warranty days", {
          type: "number",
          placeholder: "Example: 365",
        }),
      ],
      Furniture: [
        field("material", "Material", {
          placeholder: "Example: Hardwood",
        }),
        field("color", "Colour", {
          placeholder: "Example: Brown",
        }),
        field("dimensions", "Dimensions", {
          placeholder: "Example: 180 × 90 cm",
        }),
        field("seats", "Number of seats", {
          type: "number",
          placeholder: "Example: 6",
        }),
      ],
      Bedding: [
        field("size", "Bed size", {
          placeholder: "Example: Queen",
        }),
        field("material", "Material", {
          placeholder: "Example: Cotton",
        }),
        field("color", "Colour", {
          placeholder: "Example: White",
        }),
        field("setPieces", "Pieces in set", {
          type: "number",
          placeholder: "Example: 4",
        }),
      ],
    },
    tracking: {
      title: "Product identification",
      question:
        "Does this product need its own appliance serial number?",
      normalTitle: "Manage by quantity",
      normalText:
        "Best for cookware, dining, decor, furniture, bedding, and everyday home products.",
      trackedTitle: "Track each appliance separately",
      trackedText:
        "Use for appliances and warranty-controlled home products.",
      inputLabel: "Appliance serial number",
      inputPlaceholder:
        "Enter the appliance serial number",
      requiredMessage:
        "Enter the appliance serial number",
    },
  },

  LIGHTING: {
    key: "LIGHTING",
    label: "Lighting",
    itemLabel: "Product",
    itemLabelLower: "product",
    eyebrow: "Lighting product",
    pageDescription:
      "Add the power, fitting, colour, and installation details needed to sell this lighting product.",
    productNamePlaceholder:
      "Example: LED Floodlight 100W",
    brandPlaceholder: "Example: Philips",
    categoryPrompt: "Choose lighting category",
    categories: [
      "Bulbs",
      "Tubes",
      "Ceiling lights",
      "Wall lights",
      "Outdoor lights",
      "Solar lights",
      "LED strips",
      "Switches",
      "Cables",
      "Accessories",
      "Other",
    ],
    defaultFields: [
      field("wattage", "Power", {
        placeholder: "Example: 12W",
      }),
      field("voltage", "Voltage", {
        placeholder: "Example: 220–240V",
      }),
      field("fitting", "Fitting type", {
        placeholder: "Example: E27, GU10",
      }),
      field("lightColor", "Light colour", {
        placeholder: "Example: Warm white",
      }),
    ],
    categoryFields: {
      Bulbs: [
        field("wattage", "Power", {
          placeholder: "Example: 12W",
        }),
        field("voltage", "Voltage", {
          placeholder: "Example: 220–240V",
        }),
        field("fitting", "Fitting type", {
          placeholder: "Example: E27",
        }),
        field("lightColor", "Light colour", {
          placeholder: "Example: Cool white",
        }),
        field("brightness", "Brightness", {
          placeholder: "Example: 1200 lumens",
        }),
      ],
      "Outdoor lights": [
        field("wattage", "Power", {
          placeholder: "Example: 100W",
        }),
        field("voltage", "Voltage", {
          placeholder: "Example: 220–240V",
        }),
        field("lightColor", "Light colour", {
          placeholder: "Example: Cool white",
        }),
        field("protectionRating", "Protection rating", {
          placeholder: "Example: IP65",
        }),
        field("mounting", "Installation type", {
          placeholder: "Example: Wall mounted",
        }),
      ],
      "Solar lights": [
        field("solarPanelPower", "Solar panel power", {
          placeholder: "Example: 20W",
        }),
        field("batteryCapacity", "Battery capacity", {
          placeholder: "Example: 12000mAh",
        }),
        field("lightingDuration", "Lighting duration", {
          placeholder: "Example: 10 hours",
        }),
        field("chargingTime", "Charging time", {
          placeholder: "Example: 6 hours",
        }),
        field("remoteIncluded", "Remote included", {
          type: "select",
          options: YES_NO_OPTIONS,
          placeholder: "Choose",
        }),
      ],
      "LED strips": [
        field("length", "Strip length", {
          placeholder: "Example: 5 metres",
        }),
        field("voltage", "Voltage", {
          placeholder: "Example: 12V",
        }),
        field("lightColor", "Light colour", {
          placeholder: "Example: RGB",
        }),
        field("waterproof", "Waterproof", {
          type: "select",
          options: YES_NO_OPTIONS,
          placeholder: "Choose",
        }),
      ],
    },
    tracking: {
      title: "Product identification",
      question:
        "Does this product need serial or batch tracking?",
      normalTitle: "Manage by quantity",
      normalText:
        "Best for bulbs, tubes, switches, cables, and everyday lighting accessories.",
      trackedTitle: "Track serial or batch",
      trackedText:
        "Use for solar kits, drivers, fixtures, and warranty-controlled lighting.",
      inputLabel: "Serial / batch code",
      inputPlaceholder:
        "Enter the serial or batch code",
      requiredMessage:
        "Enter the serial or batch code",
    },
  },

  SPARE_PARTS: {
    key: "SPARE_PARTS",
    label: "Spare Parts",
    itemLabel: "Part",
    itemLabelLower: "part",
    eyebrow: "Spare part",
    pageDescription:
      "Add the compatibility and part-number details needed to identify and sell this spare part correctly.",
    productNamePlaceholder:
      "Example: Toyota Corolla Front Brake Pad",
    brandPlaceholder: "Example: Bosch",
    categoryPrompt: "Choose spare-parts category",
    categories: [
      "Engine parts",
      "Brake system",
      "Suspension",
      "Electrical parts",
      "Filters",
      "Belts",
      "Bearings",
      "Body parts",
      "Cooling system",
      "Phone parts",
      "Computer parts",
      "Appliance parts",
      "Other",
    ],
    defaultFields: [
      field("partNumber", "Part number", {
        placeholder: "Example: BP-4587",
      }),
      field("compatibleMake", "Compatible make", {
        placeholder: "Example: Toyota",
      }),
      field("compatibleModel", "Compatible model", {
        placeholder: "Example: Corolla",
      }),
      field("condition", "Condition", {
        type: "select",
        options: CONDITION_OPTIONS,
        placeholder: "Choose condition",
      }),
    ],
    categoryFields: {
      "Brake system": [
        field("partNumber", "Part number", {
          placeholder: "Example: BP-4587",
        }),
        field("compatibleMake", "Compatible make", {
          placeholder: "Example: Toyota",
        }),
        field("compatibleModel", "Compatible model", {
          placeholder: "Example: Corolla",
        }),
        field("compatibleYears", "Compatible years", {
          placeholder: "Example: 2014–2019",
        }),
        field("position", "Position", {
          placeholder: "Example: Front",
        }),
        field("condition", "Condition", {
          type: "select",
          options: CONDITION_OPTIONS,
          placeholder: "Choose condition",
        }),
      ],
      Bearings: [
        field("partNumber", "Part number", {
          placeholder: "Example: 6204-2RS",
        }),
        field("insideDiameter", "Inside diameter", {
          placeholder: "Example: 20mm",
        }),
        field("outsideDiameter", "Outside diameter", {
          placeholder: "Example: 47mm",
        }),
        field("width", "Width", {
          placeholder: "Example: 14mm",
        }),
        field("application", "Used for", {
          placeholder: "Example: Wheel hub",
        }),
      ],
      "Phone parts": [
        field("partNumber", "Part number", {
          placeholder: "Example: IP13-OLED",
        }),
        field("compatibleModel", "Compatible model", {
          placeholder: "Example: iPhone 13",
        }),
        field("partType", "Part type", {
          placeholder: "Example: Display assembly",
        }),
        field("quality", "Quality", {
          placeholder:
            "Example: Original, OEM, compatible",
        }),
        field("color", "Colour", {
          placeholder: "Example: Black",
        }),
        field("warrantyDays", "Warranty days", {
          type: "number",
          placeholder: "Example: 30",
        }),
      ],
      "Computer parts": [
        field("partNumber", "Part number", {
          placeholder: "Example: L19758-001",
        }),
        field("compatibleMake", "Compatible make", {
          placeholder: "Example: HP",
        }),
        field("compatibleModel", "Compatible model", {
          placeholder: "Example: EliteBook 840 G5",
        }),
        field("partType", "Part type", {
          placeholder: "Example: Replacement screen",
        }),
        field("condition", "Condition", {
          type: "select",
          options: CONDITION_OPTIONS,
          placeholder: "Choose condition",
        }),
      ],
    },
    tracking: {
      title: "Part identification",
      question:
        "Does this part need serial, batch, or warranty tracking?",
      normalTitle: "Manage by quantity",
      normalText:
        "Best for common parts where part number and compatibility are enough.",
      trackedTitle: "Track each part separately",
      trackedText:
        "Use for warranty-sensitive, serialized, or traceable parts.",
      inputLabel: "Serial / batch / warranty code",
      inputPlaceholder:
        "Enter the part tracking code",
      requiredMessage:
        "Enter the serial, batch, or warranty code",
    },
  },
};

export function normalizeBusinessCategory(value) {
  const raw = String(value || "")
    .trim()
    .toUpperCase();

  if (
    ["HARDWARE", "QUINCAILLERIE"].includes(raw)
  ) {
    return "HARDWARE";
  }

  if (
    [
      "HOME_KITCHEN",
      "HOME_AND_KITCHEN",
      "HOME & KITCHEN",
    ].includes(raw)
  ) {
    return "HOME_KITCHEN";
  }

  if (raw === "LIGHTING") {
    return "LIGHTING";
  }

  if (
    [
      "SPARE_PARTS",
      "SPARE PARTS",
      "AUTO_PARTS",
    ].includes(raw)
  ) {
    return "SPARE_PARTS";
  }

  return "ELECTRONICS";
}

export function getBusinessProductConfig(value) {
  const key = normalizeBusinessCategory(value);

  return (
    BUSINESS_PRODUCT_CONFIG[key] ||
    BUSINESS_PRODUCT_CONFIG.ELECTRONICS
  );
}

export function getProductCategoryFields(
  businessCategory,
  productCategory,
) {
  const config =
    getBusinessProductConfig(businessCategory);

  return (
    config.categoryFields?.[productCategory] ||
    config.defaultFields ||
    []
  );
}

export function getProductSubcategoryOptions(
  businessCategory,
  productCategory,
) {
  const config =
    getBusinessProductConfig(businessCategory);

  return (
    config.subcategories?.[productCategory] ||
    []
  );
}

export function getKnownProductCategories() {
  return Array.from(
    new Set(
      Object.values(BUSINESS_PRODUCT_CONFIG)
        .flatMap(
          (config) => config.categories || [],
        )
        .filter(Boolean),
    ),
  );
}
