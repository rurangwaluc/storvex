const prisma = require("../../config/database");

const DEFAULT_PAYMENT_METHODS = Object.freeze([
  "CASH_ON_DELIVERY",
  "MOMO_ON_DELIVERY",
]);

function cleanString(value, maxLength = 1000) {
  const result = String(value || "").trim();
  return result ? result.slice(0, maxLength) : null;
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function nonNegativeMoney(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.round(number));
}

function normalizePhone(value) {
  const phone = cleanString(value, 40);
  if (!phone) return null;

  const digits = phone.replace(/[^\d]/g, "");

  if (digits.length < 10 || digits.length > 15) {
    const error = new Error("Enter a valid customer phone number");
    error.status = 400;
    error.code = "MARKETPLACE_PHONE_INVALID";
    throw error;
  }

  return phone;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function normalizeStringList(value, allowed = null) {
  const input = Array.isArray(value) ? value : [];

  const result = input
    .map((item) => cleanString(item, 120))
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);

  if (!allowed) return result;

  return result.filter((item) => allowed.has(item));
}

function normalizeDeliveryAreas(value) {
  return normalizeStringList(value).slice(0, 30);
}

function normalizePaymentMethods(value) {
  const allowed = new Set([
    "CASH_ON_DELIVERY",
    "MOMO_ON_DELIVERY",
    "PAY_ON_PICKUP",
    "SELLER_APPROVED_OTHER",
  ]);

  const methods = normalizeStringList(value, allowed);

  return methods.length ? methods : [...DEFAULT_PAYMENT_METHODS];
}

function readinessCheck(key, label, done, detail, required = true) {
  return {
    key,
    label,
    done: Boolean(done),
    required: Boolean(required),
    detail,
  };
}

function buildMarketplaceReadiness({
  tenant,
  profile,
  publishedProductCount = 0,
  availablePublishedProductCount = 0,
  approvedImageProductCount = 0,
}) {
  const fulfilmentReady =
    Boolean(profile?.pickupEnabled) ||
    Boolean(profile?.deliveryEnabled);

  const checks = [
    readinessCheck(
      "public_identity",
      "Public store identity",
      profile?.displayName && profile?.description,
      "Add the store name and a customer-friendly description.",
    ),
    readinessCheck(
      "customer_contact",
      "Customer contact",
      tenant?.phone,
      "Add the business phone in Business settings.",
    ),
    readinessCheck(
      "public_link",
      "Public store link",
      profile?.publicSlug,
      "Save a unique public store link.",
    ),
    readinessCheck(
      "fulfilment",
      "Pickup or delivery",
      fulfilmentReady,
      "Enable store pickup, seller delivery, or both.",
    ),
    readinessCheck(
      "published_products",
      "Published products",
      Number(publishedProductCount) > 0,
      "Publish at least one Marketplace product.",
    ),
    readinessCheck(
      "available_stock",
      "Available stock",
      Number(availablePublishedProductCount) > 0,
      "At least one published product must have available stock.",
    ),
    readinessCheck(
      "approved_images",
      "Approved product images",
      Number(approvedImageProductCount) > 0,
      "At least one published product needs an approved cleaned image.",
    ),
  ];

  const requiredChecks = checks.filter((check) => check.required);
  const doneCount = checks.filter((check) => check.done).length;
  const missingRequiredKeys = requiredChecks
    .filter((check) => !check.done)
    .map((check) => check.key);

  return {
    ready: missingRequiredKeys.length === 0,
    readinessPercent: Math.round((doneCount / checks.length) * 100),
    checks,
    summary: {
      total: checks.length,
      done: doneCount,
      requiredTotal: requiredChecks.length,
      requiredDone: requiredChecks.length - missingRequiredKeys.length,
      missingRequiredKeys,
    },
    counts: {
      publishedProducts: Number(publishedProductCount) || 0,
      availablePublishedProducts:
        Number(availablePublishedProductCount) || 0,
      productsWithApprovedImages:
        Number(approvedImageProductCount) || 0,
    },
  };
}

async function uniquePublicSlug(tenantId, requested, fallbackName) {
  const base = slugify(requested || fallbackName);

  if (!base) {
    const error = new Error("Public store link is required");
    error.status = 400;
    error.code = "MARKETPLACE_SLUG_REQUIRED";
    throw error;
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    const existing = await prisma.marketplaceSellerProfile.findFirst({
      where: {
        publicSlug: candidate,
        tenantId: { not: tenantId },
      },
      select: { tenantId: true },
    });

    if (!existing) return candidate;
  }

  const error = new Error("Could not create a unique public store link");
  error.status = 409;
  error.code = "MARKETPLACE_SLUG_UNAVAILABLE";
  throw error;
}

function marketplaceCodeBase(value) {
  const words = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (word) =>
        ![
          "LTD",
          "LIMITED",
          "LLC",
          "INC",
          "COMPANY",
          "CO",
          "SHOP",
          "STORE",
          "BUSINESS",
          "ENTERPRISE",
          "ENTERPRISES",
        ].includes(word),
    );

  const letters = words.join("");

  if (letters.length >= 3) {
    return letters.slice(0, 3);
  }

  return `${letters}XXX`.slice(0, 3);
}

function marketplaceCodeCandidate(base, attempt) {
  if (attempt === 0) return base;

  const number = attempt - 1;
  const first = Math.floor(number / (26 * 26)) % 26;
  const second = Math.floor(number / 26) % 26;
  const third = number % 26;

  return String.fromCharCode(
    65 + first,
    65 + second,
    65 + third,
  );
}

async function uniqueMarketplaceCode(
  tenantId,
  businessName,
  database = prisma,
) {
  const base = marketplaceCodeBase(
    businessName,
  );

  for (
    let attempt = 0;
    attempt <= 26 * 26 * 26;
    attempt += 1
  ) {
    const candidate =
      marketplaceCodeCandidate(
        base,
        attempt,
      );

    const existing =
      await database.marketplaceSellerProfile.findFirst({
        where: {
          marketplaceCode: candidate,
          tenantId: {
            not: tenantId,
          },
        },
        select: {
          tenantId: true,
        },
      });

    if (!existing) return candidate;
  }

  const error = new Error(
    "Could not create a unique Marketplace business code",
  );
  error.status = 409;
  error.code =
    "MARKETPLACE_CODE_UNAVAILABLE";
  throw error;
}

async function getMarketplaceSellerProfile(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      district: true,
      sector: true,
      address: true,
      logoUrl: true,
      marketplaceProfile: true,
    },
  });

  if (!tenant) {
    const error = new Error("Store not found");
    error.status = 404;
    throw error;
  }

  let profile = await prisma.marketplaceSellerProfile.findUnique({
    where: { tenantId },
  });

  if (!profile) {
    profile = await prisma.marketplaceSellerProfile.create({
      data: {
        tenantId,
        publicSlug: await uniquePublicSlug(
          tenantId,
          null,
          tenant.name,
        ),
        marketplaceCode:
          await uniqueMarketplaceCode(
            tenantId,
            tenant.name,
          ),
        displayName: tenant.name,
        paymentMethods: [...DEFAULT_PAYMENT_METHODS],
      },
    });
  }

  return {
    tenant,
    profile: {
      ...profile,
      deliveryAreas: normalizeDeliveryAreas(profile.deliveryAreas),
      paymentMethods: normalizePaymentMethods(profile.paymentMethods),
    },
  };
}

async function getMarketplaceReadiness(tenantId) {
  const { tenant, profile } =
    await getMarketplaceSellerProfile(tenantId);

  const [
    publishedProductCount,
    availablePublishedProductCount,
    approvedImageProducts,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        tenantId,
        isActive: true,
        marketplaceStatus: "PUBLISHED",
      },
    }),

    prisma.product.count({
      where: {
        tenantId,
        isActive: true,
        marketplaceStatus: "PUBLISHED",
        stockQty: { gt: 0 },
      },
    }),

    prisma.productImage.findMany({
      where: {
        tenantId,
        isMarketplaceApproved: true,
        product: {
          tenantId,
          isActive: true,
          marketplaceStatus: "PUBLISHED",
        },
      },
      distinct: ["productId"],
      select: {
        productId: true,
      },
    }),
  ]);

  return buildMarketplaceReadiness({
    tenant,
    profile,
    publishedProductCount,
    availablePublishedProductCount,
    approvedImageProductCount: approvedImageProducts.length,
  });
}

async function updateMarketplaceSellerProfile(tenantId, payload = {}) {
  const current = await getMarketplaceSellerProfile(tenantId);
  const body = payload || {};
  const data = {};

  if ("displayName" in body) {
    data.displayName = cleanString(body.displayName, 180);
  }

  if ("description" in body) {
    data.description = cleanString(body.description, 1200);
  }

  if ("customerPhone" in body) {
    data.customerPhone = normalizePhone(body.customerPhone);
  }

  if ("whatsappPhone" in body) {
    data.whatsappPhone = normalizePhone(body.whatsappPhone);
  }

  if ("pickupEnabled" in body) {
    data.pickupEnabled = toBoolean(body.pickupEnabled, false);
  }

  if ("deliveryEnabled" in body) {
    data.deliveryEnabled = toBoolean(body.deliveryEnabled, false);
  }

  if ("temporarilyClosed" in body) {
    data.temporarilyClosed = toBoolean(
      body.temporarilyClosed,
      false,
    );
  }

  if ("defaultDeliveryFee" in body) {
    data.defaultDeliveryFee = nonNegativeMoney(
      body.defaultDeliveryFee,
      0,
    );
  }

  if ("deliveryAreas" in body) {
    data.deliveryAreas = normalizeDeliveryAreas(body.deliveryAreas);
  }

  if ("paymentMethods" in body) {
    data.paymentMethods = normalizePaymentMethods(
      body.paymentMethods,
    );
  }

  if ("publicSlug" in body) {
    data.publicSlug = await uniquePublicSlug(
      tenantId,
      body.publicSlug,
      current.tenant.name,
    );
  }

  const updated = await prisma.marketplaceSellerProfile.update({
    where: { tenantId },
    data,
  });

  if ("marketplaceEnabled" in body) {
    const enable = toBoolean(body.marketplaceEnabled, false);

    if (enable) {
      const readiness = await getMarketplaceReadiness(tenantId);

      if (!readiness.ready) {
        const error = new Error(
          "Complete the required Marketplace setup before making the store visible",
        );
        error.status = 409;
        error.code = "MARKETPLACE_NOT_READY";
        error.details = readiness;
        throw error;
      }
    }

    return prisma.marketplaceSellerProfile.update({
      where: { tenantId },
      data: {
        marketplaceEnabled: enable,
      },
    });
  }

  return updated;
}

module.exports = {
  DEFAULT_PAYMENT_METHODS,
  marketplaceCodeBase,
  marketplaceCodeCandidate,
  uniqueMarketplaceCode,
  buildMarketplaceReadiness,
  getMarketplaceSellerProfile,
  getMarketplaceReadiness,
  updateMarketplaceSellerProfile,
};
