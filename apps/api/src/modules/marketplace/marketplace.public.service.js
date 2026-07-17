const prisma = require("../../config/database");

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

function cleanString(value, maxLength = 200) {
  const result = String(value || "").trim();
  return result ? result.slice(0, maxLength) : null;
}

function safeInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(min, Math.min(max, parsed));
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanString(item, 120))
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);
}

function calculateAvailableQuantity(rows) {
  if (!Array.isArray(rows)) return 0;

  return rows.reduce((total, row) => {
    const onHand = Math.max(0, Number(row?.qtyOnHand || 0));
    const reserved = Math.max(0, Number(row?.qtyReserved || 0));

    return total + Math.max(0, onHand - reserved);
  }, 0);
}

function chooseApprovedImage(images) {
  const approved = Array.isArray(images)
    ? images.filter(
        (image) =>
          image?.isMarketplaceApproved === true &&
          String(image?.imageType || "").toUpperCase() === "CLEANED" &&
          cleanString(image?.url, 2000),
      )
    : [];

  approved.sort((a, b) => {
    if (Boolean(a.isPrimary) !== Boolean(b.isPrimary)) {
      return a.isPrimary ? -1 : 1;
    }

    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });

  const image = approved[0] || null;

  if (!image) return null;

  return {
    url: image.url,
    altText: image.altText || null,
  };
}

function chooseApprovedImages(images) {
  const approved = Array.isArray(images)
    ? images.filter(
        (image) =>
          image?.isMarketplaceApproved === true &&
          String(image?.imageType || "").toUpperCase() ===
            "CLEANED" &&
          cleanString(image?.url, 2000),
      )
    : [];

  approved.sort((left, right) => {
    if (Boolean(left.isPrimary) !== Boolean(right.isPrimary)) {
      return left.isPrimary ? -1 : 1;
    }

    const sortDifference =
      Number(left.sortOrder || 0) -
      Number(right.sortOrder || 0);

    if (sortDifference !== 0) {
      return sortDifference;
    }

    return String(left.url || "").localeCompare(
      String(right.url || ""),
    );
  });

  return approved.map((image) => ({
    url: image.url,
    altText: image.altText || null,
    isPrimary: Boolean(image.isPrimary),
  }));
}

function activeMarketplacePricing(
  product,
  now = new Date(),
) {
  const regularPrice = Math.max(
    0,
    Number(
      product?.marketplacePrice ??
        product?.sellPrice ??
        0,
    ) || 0,
  );

  const rawSaleValue =
    product?.marketplaceSalePrice;

  const hasSalePrice =
    rawSaleValue !== null &&
    rawSaleValue !== undefined &&
    String(rawSaleValue).trim() !== "";

  const salePrice = hasSalePrice
    ? Number(rawSaleValue)
    : null;

  const validSalePrice =
    salePrice !== null &&
    Number.isFinite(salePrice) &&
    salePrice >= 0 &&
    salePrice < regularPrice;

  function parsedDate(value) {
    if (!value) {
      return {
        supplied: false,
        valid: true,
        date: null,
      };
    }

    const date = new Date(value);

    return {
      supplied: true,
      valid: !Number.isNaN(date.getTime()),
      date: Number.isNaN(date.getTime())
        ? null
        : date,
    };
  }

  const start = parsedDate(
    product?.marketplaceSaleStartsAt,
  );

  const end = parsedDate(
    product?.marketplaceSaleEndsAt,
  );

  const currentTime =
    now instanceof Date
      ? now
      : new Date(now);

  const validCurrentTime =
    !Number.isNaN(currentTime.getTime());

  const validSchedule =
    start.valid &&
    end.valid &&
    (
      !start.date ||
      !end.date ||
      end.date > start.date
    );

  const hasStarted =
    !start.date ||
    (
      validCurrentTime &&
      currentTime >= start.date
    );

  const hasNotEnded =
    !end.date ||
    (
      validCurrentTime &&
      currentTime <= end.date
    );

  const onSale =
    validSalePrice &&
    validSchedule &&
    validCurrentTime &&
    hasStarted &&
    hasNotEnded;

  return {
    regularPrice,
    salePrice: onSale ? salePrice : null,
    price: onSale ? salePrice : regularPrice,
    onSale,
    saleStartsAt: start.date
      ? start.date.toISOString()
      : null,
    saleEndsAt: end.date
      ? end.date.toISOString()
      : null,
  };
}

function publicStoreLocation(tenant) {
  return {
    countryCode: tenant?.countryCode || "RW",
    district: tenant?.district || null,
    sector: tenant?.sector || null,
    address: tenant?.address || null,
  };
}

function serializePublicSeller(profile, tenant, counts = {}) {
  return {
    slug: profile.publicSlug,
    name: profile.displayName || tenant.name,
    description: profile.description || null,
    logoUrl: tenant.logoUrl || null,
    customerPhone: profile.customerPhone || null,
    whatsappPhone: profile.whatsappPhone || null,
    temporarilyClosed: Boolean(profile.temporarilyClosed),
    pickupEnabled: Boolean(profile.pickupEnabled),
    deliveryEnabled: Boolean(profile.deliveryEnabled),
    defaultDeliveryFee: Math.max(
      0,
      Number(profile.defaultDeliveryFee || 0),
    ),
    deliveryAreas: normalizeList(profile.deliveryAreas),
    paymentMethods: normalizeList(profile.paymentMethods),
    location: publicStoreLocation(tenant),
    productCount: Math.max(0, Number(counts.productCount || 0)),
    availableProductCount: Math.max(
      0,
      Number(counts.availableProductCount || 0),
    ),
  };
}


function normalizeMarketplaceCategory(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MARKETPLACE_CATEGORY_CHILDREN = Object.freeze({
  electronics: Object.freeze([
    "electronics",
    "phone",
    "phones",
    "smartphone",
    "smartphones",
    "feature phone",
    "feature phones",
    "laptop",
    "laptops",
    "computer",
    "computers",
    "desktop",
    "desktops",
    "monitor",
    "monitors",
    "television",
    "televisions",
    "tv",
    "tvs",
    "tablet",
    "tablets",
    "accessory",
    "accessories",
    "charger",
    "chargers",
    "earphone",
    "earphones",
    "headphone",
    "headphones",
    "keyboard",
    "keyboards",
    "mouse",
    "mice",
    "printer",
    "printers",
  ]),

  hardware: Object.freeze([
    "hardware",
    "quincaillerie",
    "building material",
    "building materials",
    "tool",
    "tools",
    "plumbing",
    "lock",
    "locks",
    "screw",
    "screws",
    "paint",
    "cement",
  ]),

  "home and kitchen": Object.freeze([
    "home and kitchen",
    "home kitchen",
    "cookware",
    "cooking pot",
    "cooking pots",
    "sink",
    "sinks",
    "tile",
    "tiles",
    "cabinet",
    "cabinets",
    "kitchen appliance",
    "kitchen appliances",
  ]),

  lighting: Object.freeze([
    "lighting",
    "light",
    "lights",
    "bulb",
    "bulbs",
    "led bulb",
    "led bulbs",
    "ceiling light",
    "ceiling lights",
    "flood light",
    "flood lights",
    "solar light",
    "solar lights",
  ]),

  "spare parts": Object.freeze([
    "spare part",
    "spare parts",
    "screen",
    "screens",
    "battery",
    "batteries",
    "brake pad",
    "brake pads",
    "filter",
    "filters",
    "replacement part",
    "replacement parts",
  ]),
});

function normalizeMainMarketplaceCategory(value) {
  const normalized = normalizeMarketplaceCategory(value);

  if (normalized === "home kitchen") {
    return "home and kitchen";
  }

  if (
    normalized === "hardware quincaillerie" ||
    normalized === "quincaillerie"
  ) {
    return "hardware";
  }

  return normalized;
}

function isMainMarketplaceCategory(value) {
  const normalized = normalizeMainMarketplaceCategory(value);

  return Object.prototype.hasOwnProperty.call(
    MARKETPLACE_CATEGORY_CHILDREN,
    normalized,
  );
}

function productMatchesMarketplaceCategory(product, requestedCategory) {
  const requested =
    normalizeMainMarketplaceCategory(requestedCategory);

  if (!requested) return true;

  const productValues = [
    product?.marketplaceCategory,
    product?.category,
    product?.subcategory,
    product?.subcategoryOther,
    product?.marketplaceAttributes?.businessCategory,
    product?.marketplaceAttributes?.category,
    product?.marketplaceAttributes?.subcategory,
    product?.marketplaceAttributes?.subSubcategory,
    product?.marketplaceAttributes?.productType,
  ]
    .map(normalizeMainMarketplaceCategory)
    .filter(Boolean);

  if (!isMainMarketplaceCategory(requested)) {
    return productValues.includes(requested);
  }

  const children = MARKETPLACE_CATEGORY_CHILDREN[requested];

  return productValues.some((value) => children.includes(value));
}

function serializePublicProduct(product, seller) {
  const availableQuantity = calculateAvailableQuantity(
    product.branchInventory,
  );

  const images = chooseApprovedImages(
    product.images,
  );

  const image = images[0] || null;
  const pricing = activeMarketplacePricing(product);

  if (availableQuantity <= 0 || !image) return null;

  return {
    slug: product.marketplaceSlug,
    seller: {
      slug: seller.publicSlug,
      name: seller.displayName || seller.tenant.name,
      logoUrl: seller.tenant.logoUrl || null,
      temporarilyClosed: Boolean(seller.temporarilyClosed),
    },
    title: product.marketplaceTitle || product.name,
    description: product.marketplaceDescription || null,
    price: pricing.price,
    regularPrice: pricing.regularPrice,
    salePrice: pricing.salePrice,
    onSale: pricing.onSale,
    saleStartsAt: pricing.saleStartsAt,
    saleEndsAt: pricing.saleEndsAt,
    currency: seller.tenant.currencyCode || "RWF",
    category:
      product.marketplaceCategory ||
      product.category ||
      null,
    attributes:
      product.marketplaceAttributes &&
      typeof product.marketplaceAttributes === "object"
        ? product.marketplaceAttributes
        : {},
    image,
    images: images.slice(0, 4),
    availableQuantity,
    pickupEnabled: Boolean(seller.pickupEnabled),
    deliveryEnabled: Boolean(seller.deliveryEnabled),
  };
}

function publishedProductWhere(extra = {}) {
  return {
    isActive: true,
    marketplaceStatus: "PUBLISHED",
    marketplaceSlug: { not: null },
    images: {
      some: {
        isMarketplaceApproved: true,
        imageType: "CLEANED",
      },
    },
    branchInventory: {
      some: {
        qtyOnHand: { gt: 0 },
      },
    },
    ...extra,
  };
}

const publicProductSelect = {
  id: true,
  tenantId: true,
  name: true,
  sellPrice: true,
  category: true,
  subcategory: true,
  subcategoryOther: true,
  marketplaceTitle: true,
  marketplaceDescription: true,
  marketplacePrice: true,
  marketplaceSalePrice: true,
  marketplaceSaleStartsAt: true,
  marketplaceSaleEndsAt: true,
  marketplaceCategory: true,
  marketplaceAttributes: true,
  marketplaceSlug: true,
  marketplacePublishedAt: true,
  images: {
    where: {
      isMarketplaceApproved: true,
      imageType: "CLEANED",
    },
    orderBy: [
      { isPrimary: "desc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      url: true,
      altText: true,
      isPrimary: true,
      sortOrder: true,
      imageType: true,
      isMarketplaceApproved: true,
    },
  },
  branchInventory: {
    select: {
      qtyOnHand: true,
      qtyReserved: true,
    },
  },
};

const publicSellerInclude = {
  tenant: {
    select: {
      id: true,
      name: true,
      phone: true,
      logoUrl: true,
      countryCode: true,
      currencyCode: true,
      district: true,
      sector: true,
      address: true,
      status: true,
    },
  },
};

async function findVisibleSeller(publicSlug) {
  const slug = cleanString(publicSlug, 72);

  if (!slug) return null;

  return prisma.marketplaceSellerProfile.findFirst({
    where: {
      publicSlug: slug,
      marketplaceEnabled: true,
      tenant: {
        status: "ACTIVE",
      },
    },
    include: publicSellerInclude,
  });
}

async function listPublicStores(query = {}) {
  const search = cleanString(query.search, 100);
  const page = safeInteger(query.page, 1, 1, 100000);
  const limit = safeInteger(
    query.limit,
    DEFAULT_PAGE_SIZE,
    1,
    MAX_PAGE_SIZE,
  );

  const profiles = await prisma.marketplaceSellerProfile.findMany({
    where: {
      marketplaceEnabled: true,
      publicSlug: { not: null },
      tenant: {
        status: "ACTIVE",
      },
      ...(search
        ? {
            OR: [
              {
                displayName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                tenant: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: publicSellerInclude,
    orderBy: [
      { temporarilyClosed: "asc" },
      { displayName: "asc" },
      { createdAt: "desc" },
    ],
  });

  const sellerIds = profiles.map((profile) => profile.tenantId);

  const products = sellerIds.length
    ? await prisma.product.findMany({
        where: publishedProductWhere({
          tenantId: { in: sellerIds },
        }),
        select: {
          tenantId: true,
          branchInventory: {
            select: {
              qtyOnHand: true,
              qtyReserved: true,
            },
          },
        },
      })
    : [];

  const countsByTenant = new Map();

  for (const product of products) {
    const available =
      calculateAvailableQuantity(product.branchInventory) > 0;

    const counts = countsByTenant.get(product.tenantId) || {
      productCount: 0,
      availableProductCount: 0,
    };

    counts.productCount += 1;

    if (available) {
      counts.availableProductCount += 1;
    }

    countsByTenant.set(product.tenantId, counts);
  }

  const visible = profiles
    .map((profile) =>
      serializePublicSeller(
        profile,
        profile.tenant,
        countsByTenant.get(profile.tenantId),
      ),
    )
    .filter((seller) => seller.availableProductCount > 0);

  const total = visible.length;
  const start = (page - 1) * limit;

  return {
    stores: visible.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getPublicStore(publicSlug, query = {}) {
  const seller = await findVisibleSeller(publicSlug);

  if (!seller) return null;

  const search = cleanString(query.search, 100);
  const requestedCategory = cleanString(
    query.category,
    120,
  );

  const category = isMainMarketplaceCategory(requestedCategory)
    ? ""
    : requestedCategory;
  const page = safeInteger(query.page, 1, 1, 100000);
  const limit = safeInteger(
    query.limit,
    DEFAULT_PAGE_SIZE,
    1,
    MAX_PAGE_SIZE,
  );

  const products = await prisma.product.findMany({
    where: publishedProductWhere({
      tenantId: seller.tenantId,
      ...(category
        ? {
            OR: [
              {
                marketplaceCategory: {
                  equals: category,
                  mode: "insensitive",
                },
              },
              {
                category: {
                  equals: category,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                marketplaceTitle: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                marketplaceDescription: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                category: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                marketplaceCategory: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    }),
    select: publicProductSelect,
    orderBy: [
      { marketplacePublishedAt: "desc" },
      { name: "asc" },
    ],
  });

  const visibleProducts = products
    .filter((product) =>
      productMatchesMarketplaceCategory(
        product,
        requestedCategory,
      ),
    )
    .map((product) => serializePublicProduct(product, seller))
    .filter(Boolean);

  const categories = Array.from(
    new Set(
      visibleProducts
        .map((product) => product.category)
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const total = visibleProducts.length;
  const start = (page - 1) * limit;

  return {
    store: serializePublicSeller(seller, seller.tenant, {
      productCount: total,
      availableProductCount: total,
    }),
    products: visibleProducts.slice(start, start + limit),
    categories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getPublicProduct(storeSlug, productSlug) {
  const seller = await findVisibleSeller(storeSlug);

  if (!seller) return null;

  const slug = cleanString(productSlug, 120);

  if (!slug) return null;

  const product = await prisma.product.findFirst({
    where: publishedProductWhere({
      tenantId: seller.tenantId,
      marketplaceSlug: slug,
    }),
    select: publicProductSelect,
  });

  if (!product) return null;

  const serialized = serializePublicProduct(product, seller);

  if (!serialized) return null;

  return {
    store: serializePublicSeller(seller, seller.tenant, {
      productCount: 1,
      availableProductCount: 1,
    }),
    product: serialized,
  };
}

async function listPublicProducts(query = {}) {
  const search = cleanString(query.search, 100);
  const requestedCategory = cleanString(
    query.category,
    120,
  );

  const category = isMainMarketplaceCategory(requestedCategory)
    ? ""
    : requestedCategory;
  const storeSlug = cleanString(query.store, 72);
  const page = safeInteger(query.page, 1, 1, 100000);
  const limit = safeInteger(
    query.limit,
    DEFAULT_PAGE_SIZE,
    1,
    MAX_PAGE_SIZE,
  );

  const sellers = await prisma.marketplaceSellerProfile.findMany({
    where: {
      marketplaceEnabled: true,
      publicSlug: { not: null },
      ...(storeSlug ? { publicSlug: storeSlug } : {}),
      tenant: {
        status: "ACTIVE",
      },
    },
    include: publicSellerInclude,
  });

  if (!sellers.length) {
    return {
      products: [],
      categories: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 1,
      },
    };
  }

  const sellerByTenant = new Map(
    sellers.map((seller) => [seller.tenantId, seller]),
  );

  const products = await prisma.product.findMany({
    where: publishedProductWhere({
      tenantId: {
        in: sellers.map((seller) => seller.tenantId),
      },
      ...(category
        ? {
            OR: [
              {
                marketplaceCategory: {
                  equals: category,
                  mode: "insensitive",
                },
              },
              {
                category: {
                  equals: category,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                marketplaceTitle: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                marketplaceDescription: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                category: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                marketplaceCategory: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    }),
    select: publicProductSelect,
    orderBy: [
      { marketplacePublishedAt: "desc" },
      { name: "asc" },
    ],
  });

  const visibleProducts = products
    .filter((product) =>
      productMatchesMarketplaceCategory(
        product,
        requestedCategory,
      ),
    )
    .map((product) => {
      const seller = sellerByTenant.get(product.tenantId);

      return seller
        ? serializePublicProduct(product, seller)
        : null;
    })
    .filter(Boolean);

  const categories = Array.from(
    new Set(
      visibleProducts
        .map((product) => product.category)
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const total = visibleProducts.length;
  const start = (page - 1) * limit;

  return {
    products: visibleProducts.slice(start, start + limit),
    categories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

module.exports = {
  calculateAvailableQuantity,
  chooseApprovedImage,
  serializePublicProduct,
  serializePublicSeller,
  listPublicStores,
  getPublicStore,
  getPublicProduct,
  listPublicProducts,
};

module.exports.__private = {
  ...(module.exports.__private || {}),
  activeMarketplacePricing,
};
