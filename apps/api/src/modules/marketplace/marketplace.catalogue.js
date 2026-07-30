"use strict";

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizeCatalogueToken(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyCatalogueValue(value) {
  return normalizeCatalogueToken(value)
    .replace(/\s+/g, "-");
}

function freezeNode(node) {
  const children = Array.isArray(node.children)
    ? node.children.map(freezeNode)
    : [];

  return Object.freeze({
    key: node.key,
    slug: node.slug,
    label: node.label,
    description: node.description || null,
    aliases: Object.freeze([
      node.label,
      node.slug,
      ...(node.aliases || []),
    ]),
    children: Object.freeze(children),
  });
}

const MARKETPLACE_CATALOGUE = Object.freeze([
  freezeNode({
    key: "ELECTRONICS",
    slug: "electronics",
    label: "Electronics",
    description:
      "Phones, computers, televisions, audio products and electronic accessories.",
    aliases: [
      "electronic",
      "electronic products",
    ],
    children: [
      {
        key: "ELECTRONICS_PHONES",
        slug: "phones",
        label: "Phones",
        aliases: [
          "phone",
          "mobile phones",
          "smartphones",
          "smartphone",
        ],
        children: [
          {
            key: "ELECTRONICS_PHONES_SMARTPHONES",
            slug: "smartphones",
            label: "Smartphones",
            aliases: [
              "smart phone",
              "smart phones",
            ],
          },
          {
            key: "ELECTRONICS_PHONES_FEATURE_PHONES",
            slug: "feature-phones",
            label: "Feature phones",
            aliases: [
              "feature phone",
              "basic phones",
              "button phones",
            ],
          },
          {
            key: "ELECTRONICS_PHONES_ACCESSORIES",
            slug: "phone-accessories",
            label: "Phone accessories",
            aliases: [
              "mobile accessories",
              "phone accessory",
              "chargers",
              "phone chargers",
              "phone cases",
            ],
          },
        ],
      },
      {
        key: "ELECTRONICS_COMPUTERS",
        slug: "computers",
        label: "Computers",
        aliases: [
          "computer",
          "computing",
        ],
        children: [
          {
            key: "ELECTRONICS_COMPUTERS_LAPTOPS",
            slug: "laptops",
            label: "Laptops",
            aliases: [
              "laptop",
              "notebooks",
              "notebook computers",
            ],
          },
          {
            key: "ELECTRONICS_COMPUTERS_DESKTOPS",
            slug: "desktops",
            label: "Desktop computers",
            aliases: [
              "desktop",
              "desktop pcs",
              "desktop computers",
            ],
          },
          {
            key: "ELECTRONICS_COMPUTERS_MONITORS",
            slug: "monitors",
            label: "Monitors",
            aliases: [
              "monitor",
              "computer screens",
              "display monitors",
            ],
          },
          {
            key: "ELECTRONICS_COMPUTERS_ACCESSORIES",
            slug: "computer-accessories",
            label: "Computer accessories",
            aliases: [
              "computer accessory",
              "keyboards",
              "computer mouse",
              "mice",
              "printers",
            ],
          },
        ],
      },
      {
        key: "ELECTRONICS_TELEVISIONS",
        slug: "televisions",
        label: "Televisions",
        aliases: [
          "television",
          "tv",
          "tvs",
          "smart tv",
          "smart tvs",
        ],
      },
      {
        key: "ELECTRONICS_AUDIO",
        slug: "audio",
        label: "Audio",
        aliases: [
          "sound",
          "speakers",
          "speaker",
          "headphones",
          "headphone",
          "earphones",
          "earphone",
        ],
      },
      {
        key: "ELECTRONICS_TABLETS",
        slug: "tablets",
        label: "Tablets",
        aliases: [
          "tablet",
          "tablet computers",
        ],
      },
      {
        key: "ELECTRONICS_ACCESSORIES",
        slug: "electronics-accessories",
        label: "Electronics accessories",
        aliases: [
          "electronic accessories",
          "electronics accessory",
          "accessories",
        ],
      },
    ],
  }),

  freezeNode({
    key: "HARDWARE",
    slug: "hardware",
    label: "Hardware",
    description:
      "Tools, building materials, plumbing products, paint and fittings.",
    aliases: [
      "quincaillerie",
      "hardware quincaillerie",
      "hardware / quincaillerie",
    ],
    children: [
      {
        key: "HARDWARE_TOOLS",
        slug: "tools",
        label: "Tools",
        aliases: [
          "tool",
          "work tools",
        ],
        children: [
          {
            key: "HARDWARE_TOOLS_POWER",
            slug: "power-tools",
            label: "Power tools",
            aliases: [
              "power tool",
              "electric tools",
              "cordless tools",
              "drills",
              "drill",
            ],
          },
          {
            key: "HARDWARE_TOOLS_HAND",
            slug: "hand-tools",
            label: "Hand tools",
            aliases: [
              "hand tool",
              "manual tools",
              "hammers",
              "spanners",
              "screwdrivers",
            ],
          },
          {
            key: "HARDWARE_TOOLS_ACCESSORIES",
            slug: "tool-accessories",
            label: "Tool accessories",
            aliases: [
              "tool accessory",
              "drill bits",
              "cutting discs",
            ],
          },
        ],
      },
      {
        key: "HARDWARE_BUILDING_MATERIALS",
        slug: "building-materials",
        label: "Building materials",
        aliases: [
          "building material",
          "construction materials",
          "construction material",
          "cement",
        ],
      },
      {
        key: "HARDWARE_PLUMBING",
        slug: "plumbing",
        label: "Plumbing",
        aliases: [
          "plumbing materials",
          "pipes",
          "pipe fittings",
          "taps",
        ],
      },
      {
        key: "HARDWARE_PAINT",
        slug: "paint",
        label: "Paint",
        aliases: [
          "paints",
          "painting materials",
          "wall paint",
        ],
      },
      {
        key: "HARDWARE_FASTENERS",
        slug: "fasteners",
        label: "Fasteners and fittings",
        aliases: [
          "fastener",
          "fittings",
          "screws",
          "screw",
          "bolts",
          "nuts",
          "locks",
          "lock",
        ],
      },
    ],
  }),

  freezeNode({
    key: "HOME_KITCHEN",
    slug: "home-and-kitchen",
    label: "Home & kitchen",
    description:
      "Cookware, kitchen products, sinks, tiles, cabinets and home materials.",
    aliases: [
      "home kitchen",
      "home and kitchen",
      "home & kitchen materials",
      "home and kitchen materials",
    ],
    children: [
      {
        key: "HOME_KITCHEN_COOKWARE",
        slug: "cookware",
        label: "Cookware",
        aliases: [
          "cooking products",
          "cooking pots",
          "cooking pot",
          "pots",
          "pans",
        ],
      },
      {
        key: "HOME_KITCHEN_KITCHEN_PRODUCTS",
        slug: "kitchen-products",
        label: "Kitchen products",
        aliases: [
          "kitchen",
          "kitchen materials",
          "kitchen utensils",
        ],
        children: [
          {
            key: "HOME_KITCHEN_KITCHEN_PRODUCTS_APPLIANCES",
            slug: "kitchen-appliances",
            label: "Kitchen appliances",
            aliases: [
              "kitchen appliance",
              "small kitchen appliances",
            ],
          },
          {
            key: "HOME_KITCHEN_KITCHEN_PRODUCTS_UTENSILS",
            slug: "kitchen-utensils",
            label: "Kitchen utensils",
            aliases: [
              "utensils",
              "cooking utensils",
            ],
          },
        ],
      },
      {
        key: "HOME_KITCHEN_SINKS",
        slug: "sinks",
        label: "Sinks",
        aliases: [
          "sink",
          "kitchen sinks",
        ],
      },
      {
        key: "HOME_KITCHEN_TILES",
        slug: "tiles",
        label: "Tiles",
        aliases: [
          "tile",
          "floor tiles",
          "wall tiles",
        ],
      },
      {
        key: "HOME_KITCHEN_CABINETS",
        slug: "cabinets",
        label: "Cabinets",
        aliases: [
          "cabinet",
          "kitchen cabinets",
          "storage cabinets",
        ],
      },
    ],
  }),

  freezeNode({
    key: "LIGHTING",
    slug: "lighting",
    label: "Lighting",
    description:
      "Bulbs, ceiling lights, outdoor lights, floodlights and solar lighting.",
    aliases: [
      "lights",
      "light",
    ],
    children: [
      {
        key: "LIGHTING_BULBS",
        slug: "bulbs",
        label: "Bulbs",
        aliases: [
          "bulb",
          "light bulbs",
          "light bulb",
        ],
        children: [
          {
            key: "LIGHTING_BULBS_LED",
            slug: "led-bulbs",
            label: "LED bulbs",
            aliases: [
              "led",
              "led bulb",
              "led lights",
            ],
          },
          {
            key: "LIGHTING_BULBS_STANDARD",
            slug: "standard-bulbs",
            label: "Standard bulbs",
            aliases: [
              "standard bulb",
              "normal bulbs",
            ],
          },
        ],
      },
      {
        key: "LIGHTING_CEILING",
        slug: "ceiling-lights",
        label: "Ceiling lights",
        aliases: [
          "ceiling light",
          "ceiling lamps",
        ],
      },
      {
        key: "LIGHTING_OUTDOOR",
        slug: "outdoor-lights",
        label: "Outdoor lights",
        aliases: [
          "outdoor light",
          "exterior lights",
          "security lights",
        ],
      },
      {
        key: "LIGHTING_FLOODLIGHTS",
        slug: "floodlights",
        label: "Floodlights",
        aliases: [
          "floodlight",
          "flood lights",
          "flood light",
        ],
      },
      {
        key: "LIGHTING_SOLAR",
        slug: "solar-lights",
        label: "Solar lights",
        aliases: [
          "solar light",
          "solar lighting",
        ],
      },
    ],
  }),

  freezeNode({
    key: "SPARE_PARTS",
    slug: "spare-parts",
    label: "Spare parts",
    description:
      "Automotive, appliance, electronic and machinery replacement parts.",
    aliases: [
      "spare part",
      "replacement parts",
      "replacement part",
      "parts",
    ],
    children: [
      {
        key: "SPARE_PARTS_AUTOMOTIVE",
        slug: "automotive-parts",
        label: "Automotive parts",
        aliases: [
          "auto parts",
          "car parts",
          "vehicle parts",
        ],
        children: [
          {
            key: "SPARE_PARTS_AUTOMOTIVE_BRAKES",
            slug: "brake-parts",
            label: "Brake parts",
            aliases: [
              "brakes",
              "brake pads",
              "brake pad",
              "brake discs",
              "brake disc",
            ],
          },
          {
            key: "SPARE_PARTS_AUTOMOTIVE_FILTERS",
            slug: "automotive-filters",
            label: "Automotive filters",
            aliases: [
              "car filters",
              "oil filters",
              "air filters",
            ],
          },
          {
            key: "SPARE_PARTS_AUTOMOTIVE_BEARINGS",
            slug: "bearings",
            label: "Bearings",
            aliases: [
              "bearing",
              "wheel bearings",
            ],
          },
        ],
      },
      {
        key: "SPARE_PARTS_ELECTRONICS",
        slug: "electronics-parts",
        label: "Electronics parts",
        aliases: [
          "electronic parts",
          "phone parts",
          "computer parts",
          "screens",
          "screen",
          "batteries",
          "battery",
        ],
      },
      {
        key: "SPARE_PARTS_APPLIANCE",
        slug: "appliance-parts",
        label: "Appliance parts",
        aliases: [
          "home appliance parts",
          "fridge parts",
          "washing machine parts",
        ],
      },
      {
        key: "SPARE_PARTS_MACHINERY",
        slug: "machinery-parts",
        label: "Machinery parts",
        aliases: [
          "machine parts",
          "industrial parts",
        ],
      },
    ],
  }),
]);

function walkCatalogue(nodes = MARKETPLACE_CATALOGUE) {
  const rows = [];

  function visit(node, parent = null, depth = 0) {
    rows.push({
      node,
      parent,
      depth,
    });

    node.children.forEach((child) => {
      visit(child, node, depth + 1);
    });
  }

  nodes.forEach((node) => visit(node));

  return rows;
}

const MARKETPLACE_CATALOGUE_ROWS =
  Object.freeze(walkCatalogue());

const MARKETPLACE_CATALOGUE_BY_KEY =
  new Map();

const MARKETPLACE_CATALOGUE_BY_SLUG =
  new Map();

const MARKETPLACE_CATALOGUE_BY_ALIAS =
  new Map();

for (const row of MARKETPLACE_CATALOGUE_ROWS) {
  const { node } = row;

  MARKETPLACE_CATALOGUE_BY_KEY.set(
    node.key,
    row,
  );

  MARKETPLACE_CATALOGUE_BY_SLUG.set(
    node.slug,
    row,
  );

  for (const alias of node.aliases) {
    const normalized =
      normalizeCatalogueToken(alias);

    if (!normalized) continue;

    if (!MARKETPLACE_CATALOGUE_BY_ALIAS.has(normalized)) {
      MARKETPLACE_CATALOGUE_BY_ALIAS.set(
        normalized,
        row,
      );
    }
  }
}

function findCatalogueRow(value) {
  const raw = cleanString(value);

  if (!raw) return null;

  const normalized =
    normalizeCatalogueToken(raw);

  const slug =
    slugifyCatalogueValue(raw);

  return (
    MARKETPLACE_CATALOGUE_BY_KEY.get(
      raw.toUpperCase(),
    ) ||
    MARKETPLACE_CATALOGUE_BY_SLUG.get(
      slug,
    ) ||
    MARKETPLACE_CATALOGUE_BY_ALIAS.get(
      normalized,
    ) ||
    null
  );
}

function catalogueAncestors(row) {
  if (!row) return [];

  const ancestors = [];
  let current = row;

  while (current) {
    ancestors.unshift(current.node);

    current = current.parent
      ? MARKETPLACE_CATALOGUE_BY_KEY.get(
          current.parent.key,
        )
      : null;
  }

  return ancestors;
}

function resolveMarketplaceCategoryPath({
  category,
  subcategory,
  leafCategory,
  attributes,
} = {}) {
  const safeAttributes =
    attributes &&
    typeof attributes === "object" &&
    !Array.isArray(attributes)
      ? attributes
      : {};

  const candidates = [
    leafCategory,
    safeAttributes.leafCategory,
    safeAttributes.leafCategorySlug,
    safeAttributes.subSubcategory,
    safeAttributes.productType,
    subcategory,
    safeAttributes.subcategory,
    safeAttributes.subcategorySlug,
    category,
    safeAttributes.category,
    safeAttributes.categorySlug,
    safeAttributes.businessCategory,
  ];

  let resolvedRow = null;

  for (const candidate of candidates) {
    resolvedRow = findCatalogueRow(candidate);

    if (resolvedRow) break;
  }

  if (!resolvedRow) {
    return null;
  }

  const ancestors =
    catalogueAncestors(resolvedRow);

  const department =
    ancestors[0] || null;

  const resolvedSubcategory =
    ancestors[1] || null;

  const resolvedLeaf =
    ancestors.length > 2
      ? ancestors[ancestors.length - 1]
      : null;

  return {
    categoryKey: department?.key || null,
    categorySlug: department?.slug || null,
    categoryLabel: department?.label || null,

    subcategoryKey:
      resolvedSubcategory?.key || null,
    subcategorySlug:
      resolvedSubcategory?.slug || null,
    subcategoryLabel:
      resolvedSubcategory?.label || null,

    leafCategoryKey:
      resolvedLeaf?.key || null,
    leafCategorySlug:
      resolvedLeaf?.slug || null,
    leafCategoryLabel:
      resolvedLeaf?.label || null,

    matchedKey: resolvedRow.node.key,
    matchedSlug: resolvedRow.node.slug,
    matchedLabel: resolvedRow.node.label,

    depth: resolvedRow.depth,
    breadcrumbs: ancestors.map((node) => ({
      key: node.key,
      slug: node.slug,
      label: node.label,
    })),
  };
}

function publicMarketplaceCatalogue() {
  function serialize(node) {
    return {
      key: node.key,
      slug: node.slug,
      label: node.label,
      description: node.description,
      children: node.children.map(serialize),
    };
  }

  return MARKETPLACE_CATALOGUE.map(serialize);
}

function marketplaceCategoryDescendantSlugs(value) {
  const row = findCatalogueRow(value);

  if (!row) return [];

  const slugs = [];

  function collect(node) {
    slugs.push(node.slug);
    node.children.forEach(collect);
  }

  collect(row.node);

  return slugs;
}

module.exports = {
  MARKETPLACE_CATALOGUE,
  findCatalogueRow,
  normalizeCatalogueToken,
  publicMarketplaceCatalogue,
  resolveMarketplaceCategoryPath,
  marketplaceCategoryDescendantSlugs,
};
