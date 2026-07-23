const prisma = require("../../config/database");
const {
  signGetUrl,
} = require("../../lib/storage/objectStorage");

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

function cleanString(value, maxLength = 200) {
  const result = String(value || "").trim();
  return result ? result.slice(0, maxLength) : null;
}

async function resolveMarketplaceLogoUrl(tenant) {
  const existingUrl = cleanString(
    tenant?.logoUrl,
    2000,
  );

  if (existingUrl) {
    return existingUrl;
  }

  const logoKey = cleanString(
    tenant?.logoKey,
    2000,
  );

  if (!logoKey) {
    return null;
  }

  try {
    return await signGetUrl(
      logoKey,
      3600,
    );
  } catch (error) {
    console.error(
      "Failed to sign Marketplace business logo:",
      error?.message || error,
    );

    return null;
  }
}

async function attachMarketplaceLogoUrls(
  sellers,
) {
  const rows = Array.isArray(sellers)
    ? sellers
    : [];

  await Promise.all(
    rows.map(async (seller) => {
      if (!seller?.tenant) {
        return;
      }

      seller.tenant.logoUrl =
        await resolveMarketplaceLogoUrl(
          seller.tenant,
        );
    }),
  );

  return rows;
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
    thumbnailUrl:
      image.thumbnailUrl || image.url,
    altText: image.altText || null,
    isPrimary: Boolean(image.isPrimary),
    width:
      Number(image.width || 0) || null,
    height:
      Number(image.height || 0) || null,
    thumbnailWidth:
      Number(image.thumbnailWidth || 0) ||
      null,
    thumbnailHeight:
      Number(image.thumbnailHeight || 0) ||
      null,
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

function marketplaceSubscriptionDate(value) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function isPublicMarketplaceSubscriptionVisible(
  subscription,
  now = new Date(),
) {
  if (!subscription) return false;

  const status = String(
    subscription.status || "",
  )
    .trim()
    .toUpperCase();

  const accessMode = String(
    subscription.accessMode || "",
  )
    .trim()
    .toUpperCase();

  if (
    status === "SUSPENDED" ||
    accessMode === "SUSPENDED"
  ) {
    return false;
  }

  const currentTime =
    now instanceof Date
      ? now
      : new Date(now);

  if (Number.isNaN(currentTime.getTime())) {
    return false;
  }

  const endDate =
    marketplaceSubscriptionDate(
      subscription.endDate,
    );

  const graceEndDate =
    marketplaceSubscriptionDate(
      subscription.graceEndDate,
    );

  if (
    status === "ACTIVE" &&
    ["TRIAL", "ACTIVE"].includes(
      accessMode,
    ) &&
    endDate &&
    endDate >= currentTime
  ) {
    return true;
  }

  return Boolean(
    graceEndDate &&
    graceEndDate >= currentTime,
  );
}

function serializePublicSeller(profile, tenant, counts = {}) {
  return {
    slug: profile.publicSlug,
    name: profile.displayName || tenant.name,
    description: profile.description || null,
    logoUrl: tenant.logoUrl || null,
    customerPhone: tenant.phone || null,
    whatsappPhone: tenant.phone || null,
    whatsappAvailable: Boolean(tenant.phone),
    emailAvailable: Boolean(tenant.email),
    temporarilyClosed: Boolean(profile.temporarilyClosed),
    pickupEnabled: Boolean(profile.pickupEnabled),
    deliveryEnabled: Boolean(profile.deliveryEnabled),
    deliveryPolicy: profile.deliveryEnabled
      ? {
          kigali: "FREE",
          outsideKigali: "CONFIRM_WITH_STORE",
        }
      : null,
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
      thumbnailUrl: true,
      altText: true,
      isPrimary: true,
      sortOrder: true,
      imageType: true,
      isMarketplaceApproved: true,
      width: true,
      height: true,
      thumbnailWidth: true,
      thumbnailHeight: true,
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
      email: true,
      logoUrl: true,
      logoKey: true,
      countryCode: true,
      currencyCode: true,
      district: true,
      sector: true,
      address: true,
      status: true,
      subscription: {
        select: {
          status: true,
          accessMode: true,
          endDate: true,
          graceEndDate: true,
        },
      },
    },
  },
};

async function findVisibleSeller(publicSlug) {
  const slug = cleanString(publicSlug, 72);

  if (!slug) return null;

  const seller =
    await prisma.marketplaceSellerProfile.findFirst({
      where: {
        publicSlug: slug,
        marketplaceEnabled: true,
        tenant: {
          status: "ACTIVE",
        },
      },
      include: publicSellerInclude,
    });

  if (!seller) return null;

  if (
    !isPublicMarketplaceSubscriptionVisible(
      seller.tenant?.subscription,
    )
  ) {
    return null;
  }

  await attachMarketplaceLogoUrls([
    seller,
  ]);

  return seller;
}

async function listPublicStores(query = {}) {
  const search = cleanString(
    query.search,
    100,
  );

  const district = cleanString(
    query.district,
    100,
  );

  const requestedFulfilment = String(
    query.fulfilment || "",
  )
    .trim()
    .toLowerCase();

  const fulfilment = [
    "pickup",
    "delivery",
  ].includes(requestedFulfilment)
    ? requestedFulfilment
    : "";

  const openOnly =
    String(query.openOnly || "")
      .trim()
      .toLowerCase() === "true";

  const requestedSort = String(
    query.sort || "",
  )
    .trim()
    .toLowerCase();

  const sort = [
    "name",
    "newest",
    "products",
  ].includes(requestedSort)
    ? requestedSort
    : "name";

  const page = safeInteger(
    query.page,
    1,
    1,
    100000,
  );

  const limit = safeInteger(
    query.limit,
    DEFAULT_PAGE_SIZE,
    1,
    MAX_PAGE_SIZE,
  );

  const profiles =
    await prisma.marketplaceSellerProfile.findMany({
      where: {
        marketplaceEnabled: true,
        publicSlug: {
          not: null,
        },
        tenant: {
          status: "ACTIVE",
        },
        ...(openOnly
          ? {
              temporarilyClosed: false,
            }
          : {}),
        ...(fulfilment === "pickup"
          ? {
              pickupEnabled: true,
            }
          : {}),
        ...(fulfilment === "delivery"
          ? {
              deliveryEnabled: true,
            }
          : {}),
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
      orderBy:
        sort === "newest"
          ? [
              {
                createdAt: "desc",
              },
              {
                displayName: "asc",
              },
            ]
          : [
              {
                temporarilyClosed: "asc",
              },
              {
                displayName: "asc",
              },
              {
                createdAt: "desc",
              },
            ],
    });

  const subscriptionVisibleProfiles =
    profiles.filter((profile) =>
      isPublicMarketplaceSubscriptionVisible(
        profile.tenant?.subscription,
      ),
    );

  await attachMarketplaceLogoUrls(
    subscriptionVisibleProfiles,
  );

  const sellerIds =
    subscriptionVisibleProfiles.map(
      (profile) => profile.tenantId,
    );

  const products = sellerIds.length
    ? await prisma.product.findMany({
        where: publishedProductWhere({
          tenantId: {
            in: sellerIds,
          },
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
      calculateAvailableQuantity(
        product.branchInventory,
      ) > 0;

    const counts =
      countsByTenant.get(
        product.tenantId,
      ) || {
        productCount: 0,
        availableProductCount: 0,
      };

    counts.productCount += 1;

    if (available) {
      counts.availableProductCount += 1;
    }

    countsByTenant.set(
      product.tenantId,
      counts,
    );
  }

  const allVisibleStores =
    subscriptionVisibleProfiles
      .map((profile) =>
        serializePublicSeller(
          profile,
          profile.tenant,
          countsByTenant.get(
            profile.tenantId,
          ),
        ),
      )
      .filter(
        (store) =>
          store.availableProductCount > 0,
      );

  function normalizeDistrictName(value) {
    const cleaned = String(value || "")
      .trim()
      .replace(
        /\s+district$/i,
        "",
      )
      .replace(/\s+/g, " ");

    if (!cleaned) return "";

    return cleaned
      .split(" ")
      .map(
        (part) =>
          part.charAt(0).toUpperCase() +
          part.slice(1).toLowerCase(),
      )
      .join(" ");
  }

  const districtMap = new Map();

  for (const store of allVisibleStores) {
    const normalized =
      normalizeDistrictName(
        store.location?.district,
      );

    if (!normalized) continue;

    const key = normalized.toLowerCase();

    if (!districtMap.has(key)) {
      districtMap.set(
        key,
        normalized,
      );
    }
  }

  const districts = Array.from(
    districtMap.values(),
  ).sort((left, right) =>
    left.localeCompare(right),
  );

  const requestedDistrict =
    normalizeDistrictName(district)
      .toLowerCase();

  const visible = requestedDistrict
    ? allVisibleStores.filter(
        (store) =>
          normalizeDistrictName(
            store.location?.district,
          ).toLowerCase() ===
          requestedDistrict,
      )
    : [...allVisibleStores];

  if (sort === "products") {
    visible.sort((left, right) => {
      const difference =
        right.availableProductCount -
        left.availableProductCount;

      if (difference !== 0) {
        return difference;
      }

      return String(
        left.name || "",
      ).localeCompare(
        String(right.name || ""),
      );
    });
  }

  const total = visible.length;

  const pages = Math.max(
    1,
    Math.ceil(total / limit),
  );

  const safePage = Math.min(
    page,
    pages,
  );

  const startIndex =
    (safePage - 1) * limit;

  return {
    stores: visible.slice(
      startIndex,
      startIndex + limit,
    ),
    districts,
    pagination: {
      page: safePage,
      limit,
      total,
      pages,
      hasPreviousPage:
        safePage > 1,
      hasNextPage:
        safePage < pages,
    },
    filters: {
      search: search || "",
      district:
        districtMap.get(
          requestedDistrict,
        ) || "",
      fulfilment,
      openOnly,
      sort,
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
  const subcategory = cleanString(
    query.subcategory,
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

  const minimumPriceValue = Number(query.minPrice);
  const maximumPriceValue = Number(query.maxPrice);

  const minimumPrice =
    Number.isFinite(minimumPriceValue) &&
    minimumPriceValue >= 0
      ? minimumPriceValue
      : null;

  const maximumPrice =
    Number.isFinite(maximumPriceValue) &&
    maximumPriceValue >= 0
      ? maximumPriceValue
      : null;

  const onSaleOnly =
    String(query.onSale || "").toLowerCase() === "true";

  const fulfilment = [
    "pickup",
    "delivery",
  ].includes(
    String(query.fulfilment || "").toLowerCase(),
  )
    ? String(query.fulfilment).toLowerCase()
    : "";

  const sort = [
    "newest",
    "price_asc",
    "price_desc",
    "name",
  ].includes(
    String(query.sort || "").toLowerCase(),
  )
    ? String(query.sort).toLowerCase()
    : "newest";

  const sellers =
    await prisma.marketplaceSellerProfile.findMany({
      where: {
        marketplaceEnabled: true,
        publicSlug: { not: null },
        ...(storeSlug
          ? { publicSlug: storeSlug }
          : {}),
        tenant: {
          status: "ACTIVE",
        },
      },
      include: publicSellerInclude,
    });

  const subscriptionVisibleSellers =
    sellers.filter((seller) =>
      isPublicMarketplaceSubscriptionVisible(
        seller.tenant?.subscription,
      ),
    );

  if (!subscriptionVisibleSellers.length) {
    return {
      products: [],
      categories: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      filters: {
        search: search || "",
        category: requestedCategory || "",
        subcategory: subcategory || "",
        minPrice: minimumPrice,
        maxPrice: maximumPrice,
        onSale: onSaleOnly,
        fulfilment,
        sort,
      },
    };
  }

  await attachMarketplaceLogoUrls(
    subscriptionVisibleSellers,
  );

  const sellerByTenant = new Map(
    subscriptionVisibleSellers.map((seller) => [
      seller.tenantId,
      seller,
    ]),
  );

  const products = await prisma.product.findMany({
    where: publishedProductWhere({
      tenantId: {
        in: subscriptionVisibleSellers.map(
          (seller) => seller.tenantId,
        ),
      },
    }),
    select: publicProductSelect,
    orderBy: [
      { marketplacePublishedAt: "desc" },
      { name: "asc" },
    ],
  });

  const allVisibleProducts = products
    .map((product) => {
      const seller =
        sellerByTenant.get(product.tenantId);

      if (!seller) return null;

      const serialized =
        serializePublicProduct(product, seller);

      if (!serialized) return null;

      return {
        ...serialized,
        marketplacePublishedAt:
          product.marketplacePublishedAt
            ? new Date(
                product.marketplacePublishedAt,
              ).toISOString()
            : null,
      };
    })
    .filter(Boolean);

  const categories = Array.from(
    new Set(
      allVisibleProducts
        .map((product) => product.category)
        .filter(Boolean),
    ),
  ).sort((left, right) =>
    left.localeCompare(right),
  );

  const normalizedSearch =
    String(search || "").toLowerCase();

  const normalizeCatalogueToken = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normalizedSubcategory =
    normalizeCatalogueToken(subcategory);

  const filteredProducts =
    allVisibleProducts.filter((product) => {
      if (
        requestedCategory &&
        !productMatchesMarketplaceCategory(
          {
            category: product.category,
            marketplaceCategory:
              product.category,
            marketplaceAttributes:
              product.attributes,
          },
          requestedCategory,
        )
      ) {
        return false;
      }

      if (category) {
        const productCategory =
          String(
            product.category || "",
          ).toLowerCase();

        if (
          productCategory !==
          String(category).toLowerCase()
        ) {
          return false;
        }
      }

      if (normalizedSubcategory) {
        const attributes =
          product.attributes &&
          typeof product.attributes === "object" &&
          !Array.isArray(product.attributes)
            ? product.attributes
            : {};

        const subcategoryValues = [
          attributes.subcategory,
          attributes.subSubcategory,
          attributes.productType,
          product.category,
          product.title,
        ]
          .filter(Boolean)
          .map(normalizeCatalogueToken);

        const matchesSubcategory =
          subcategoryValues.some(
            (value) =>
              value === normalizedSubcategory ||
              value.includes(
                normalizedSubcategory,
              ) ||
              normalizedSubcategory.includes(
                value,
              ),
          );

        if (!matchesSubcategory) {
          return false;
        }
      }

      if (normalizedSearch) {
        const searchable = [
          product.title,
          product.description,
          product.category,
          product.seller?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (
          !searchable.includes(
            normalizedSearch,
          )
        ) {
          return false;
        }
      }

      if (
        minimumPrice !== null &&
        Number(product.price || 0) <
          minimumPrice
      ) {
        return false;
      }

      if (
        maximumPrice !== null &&
        Number(product.price || 0) >
          maximumPrice
      ) {
        return false;
      }

      if (onSaleOnly && !product.onSale) {
        return false;
      }

      if (
        fulfilment === "pickup" &&
        !product.pickupEnabled
      ) {
        return false;
      }

      if (
        fulfilment === "delivery" &&
        !product.deliveryEnabled
      ) {
        return false;
      }

      return true;
    });

  filteredProducts.sort((left, right) => {
    if (sort === "price_asc") {
      return (
        Number(left.price || 0) -
          Number(right.price || 0) ||
        String(left.title || "").localeCompare(
          String(right.title || ""),
        )
      );
    }

    if (sort === "price_desc") {
      return (
        Number(right.price || 0) -
          Number(left.price || 0) ||
        String(left.title || "").localeCompare(
          String(right.title || ""),
        )
      );
    }

    if (sort === "name") {
      return String(
        left.title || "",
      ).localeCompare(
        String(right.title || ""),
      );
    }

    const leftDate = left.marketplacePublishedAt
      ? new Date(
          left.marketplacePublishedAt,
        ).getTime()
      : 0;

    const rightDate =
      right.marketplacePublishedAt
        ? new Date(
            right.marketplacePublishedAt,
          ).getTime()
        : 0;

    return (
      rightDate -
        leftDate ||
      String(left.title || "").localeCompare(
        String(right.title || ""),
      )
    );
  });

  const total = filteredProducts.length;
  const pages = Math.max(
    1,
    Math.ceil(total / limit),
  );
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * limit;

  return {
    products: filteredProducts
      .slice(start, start + limit)
      .map(
        ({
          marketplacePublishedAt,
          ...product
        }) => product,
      ),
    categories,
    pagination: {
      page: safePage,
      limit,
      total,
      pages,
      hasPreviousPage: safePage > 1,
      hasNextPage: safePage < pages,
    },
    filters: {
      search: search || "",
      category: requestedCategory || "",
      subcategory: subcategory || "",
      minPrice: minimumPrice,
      maxPrice: maximumPrice,
      onSale: onSaleOnly,
      fulfilment,
      sort,
    },
  };
}

module.exports = {
  calculateAvailableQuantity,
  chooseApprovedImage,
  activeMarketplacePricing,
  serializePublicProduct,
  serializePublicSeller,
  isPublicMarketplaceSubscriptionVisible,
  listPublicStores,
  getPublicStore,
  getPublicProduct,
  listPublicProducts,
};

module.exports.__private = {
  ...(module.exports.__private || {}),
  activeMarketplacePricing,
};
