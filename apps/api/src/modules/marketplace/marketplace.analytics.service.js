const prisma = require("../../config/database");

const {
  getPublicStore,
  getPublicProduct,
} = require("./marketplace.public.service");

const EVENT_TYPES = Object.freeze({
  STORE_VIEW: "STORE_VIEW",
  PRODUCT_VIEW: "PRODUCT_VIEW",
  PRODUCT_CARD_OPEN: "PRODUCT_CARD_OPEN",
  ADD_TO_CART: "ADD_TO_CART",
  SAVE_PRODUCT: "SAVE_PRODUCT",
  ADD_TO_COMPARE: "ADD_TO_COMPARE",
  SEARCH: "SEARCH",
  SEARCH_NO_RESULTS: "SEARCH_NO_RESULTS",
});

const ALLOWED_EVENT_TYPES = new Set(
  Object.values(EVENT_TYPES),
);

const PRODUCT_EVENT_TYPES = new Set([
  EVENT_TYPES.PRODUCT_VIEW,
  EVENT_TYPES.PRODUCT_CARD_OPEN,
  EVENT_TYPES.ADD_TO_CART,
  EVENT_TYPES.SAVE_PRODUCT,
  EVENT_TYPES.ADD_TO_COMPARE,
]);

const SEARCH_EVENT_TYPES = new Set([
  EVENT_TYPES.SEARCH,
  EVENT_TYPES.SEARCH_NO_RESULTS,
]);

const VIEW_EVENT_TYPES = new Set([
  EVENT_TYPES.STORE_VIEW,
  EVENT_TYPES.PRODUCT_VIEW,
]);

const DEFAULT_RANGE_DAYS = 30;
const ALLOWED_RANGE_DAYS = new Set([
  7,
  30,
  90,
]);

function cleanString(
  value,
  maxLength = 200,
) {
  const result = String(
    value || "",
  ).trim();

  return result
    ? result.slice(0, maxLength)
    : null;
}

function normalizeSlug(value) {
  const slug = cleanString(value, 100);

  if (
    !slug ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)
  ) {
    return null;
  }

  return slug.toLowerCase();
}

function normalizeVisitorId(value) {
  const visitorId =
    cleanString(value, 80);

  if (!visitorId) {
    return null;
  }

  if (
    !/^[a-zA-Z0-9:_-]{16,80}$/.test(
      visitorId,
    )
  ) {
    const error = new Error(
      "Marketplace visitor identifier is invalid",
    );

    error.status = 400;
    error.code =
      "MARKETPLACE_VISITOR_ID_INVALID";

    throw error;
  }

  return visitorId;
}

function normalizeSource(value) {
  const source = cleanString(value, 80);

  if (!source) {
    return null;
  }

  return source
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || null;
}

function normalizeSearchTerm(value) {
  const term = cleanString(value, 120);

  if (!term) {
    return null;
  }

  return term
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

function normalizeMetadata(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const allowed = {};

  const resultCount = Number.parseInt(
    value.resultCount,
    10,
  );

  if (
    Number.isFinite(resultCount) &&
    resultCount >= 0
  ) {
    allowed.resultCount = Math.min(
      resultCount,
      100000,
    );
  }

  const page = Number.parseInt(
    value.page,
    10,
  );

  if (
    Number.isFinite(page) &&
    page > 0
  ) {
    allowed.page = Math.min(
      page,
      10000,
    );
  }

  const category = cleanString(
    value.category,
    120,
  );

  if (category) {
    allowed.category = category;
  }

  return Object.keys(allowed).length
    ? allowed
    : null;
}

function normalizeEventPayload(
  payload = {},
) {
  const eventType = String(
    payload.eventType || "",
  )
    .trim()
    .toUpperCase();

  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    const error = new Error(
      "Marketplace activity type is not supported",
    );

    error.status = 400;
    error.code =
      "MARKETPLACE_ANALYTICS_EVENT_INVALID";

    throw error;
  }

  const storeSlug =
    normalizeSlug(payload.storeSlug);

  if (!storeSlug) {
    const error = new Error(
      "Marketplace store is required",
    );

    error.status = 400;
    error.code =
      "MARKETPLACE_ANALYTICS_STORE_REQUIRED";

    throw error;
  }

  const productSlug =
    normalizeSlug(payload.productSlug);

  if (
    PRODUCT_EVENT_TYPES.has(eventType) &&
    !productSlug
  ) {
    const error = new Error(
      "Marketplace product is required for this activity",
    );

    error.status = 400;
    error.code =
      "MARKETPLACE_ANALYTICS_PRODUCT_REQUIRED";

    throw error;
  }

  const searchTerm =
    normalizeSearchTerm(
      payload.searchTerm,
    );

  if (
    SEARCH_EVENT_TYPES.has(eventType) &&
    !searchTerm
  ) {
    const error = new Error(
      "Enter a search term",
    );

    error.status = 400;
    error.code =
      "MARKETPLACE_ANALYTICS_SEARCH_REQUIRED";

    throw error;
  }

  return {
    eventType,
    storeSlug,
    productSlug:
      productSlug || null,
    visitorId:
      normalizeVisitorId(
        payload.visitorId,
      ),
    searchTerm,
    source:
      normalizeSource(payload.source),
    metadata:
      normalizeMetadata(
        payload.metadata,
      ),
  };
}

function duplicateWindowMs(eventType) {
  if (
    eventType ===
      EVENT_TYPES.STORE_VIEW ||
    eventType ===
      EVENT_TYPES.PRODUCT_VIEW
  ) {
    return 30 * 60 * 1000;
  }

  if (
    SEARCH_EVENT_TYPES.has(eventType)
  ) {
    return 60 * 1000;
  }

  return 10 * 1000;
}

function percentage(
  numerator,
  denominator,
) {
  const top = Number(numerator || 0);
  const bottom =
    Number(denominator || 0);

  if (bottom <= 0) {
    return 0;
  }

  return Number(
    (
      (top / bottom) *
      100
    ).toFixed(1),
  );
}

function safeRangeDays(value) {
  const parsed = Number.parseInt(
    value,
    10,
  );

  return ALLOWED_RANGE_DAYS.has(parsed)
    ? parsed
    : DEFAULT_RANGE_DAYS;
}

function effectiveTrackingStart(
  rangeStart,
  firstTrackedEventAt,
) {
  const start =
    rangeStart instanceof Date
      ? rangeStart
      : new Date(rangeStart);

  if (!firstTrackedEventAt) {
    return null;
  }

  const trackedAt =
    firstTrackedEventAt instanceof Date
      ? firstTrackedEventAt
      : new Date(firstTrackedEventAt);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(trackedAt.getTime())
  ) {
    return null;
  }

  return trackedAt > start
    ? trackedAt
    : start;
}

function visitorKey(event) {
  if (event.marketplaceCustomerId) {
    return `customer:${event.marketplaceCustomerId}`;
  }

  if (event.visitorId) {
    return `visitor:${event.visitorId}`;
  }

  return null;
}

async function visibleTenantAndProduct({
  storeSlug,
  productSlug,
}) {
  if (productSlug) {
    const publicProduct =
      await getPublicProduct(
        storeSlug,
        productSlug,
      );

    if (!publicProduct) {
      const error = new Error(
        "Marketplace product is not available",
      );

      error.status = 404;
      error.code =
        "MARKETPLACE_PRODUCT_NOT_FOUND";

      throw error;
    }
  } else {
    const publicStore =
      await getPublicStore(
        storeSlug,
        {
          page: 1,
          limit: 1,
        },
      );

    if (!publicStore) {
      const error = new Error(
        "Marketplace store is not available",
      );

      error.status = 404;
      error.code =
        "MARKETPLACE_STORE_NOT_FOUND";

      throw error;
    }
  }

  const profile =
    await prisma
      .marketplaceSellerProfile
      .findUnique({
        where: {
          publicSlug: storeSlug,
        },
        select: {
          tenantId: true,
        },
      });

  if (!profile?.tenantId) {
    const error = new Error(
      "Marketplace store is not available",
    );

    error.status = 404;
    error.code =
      "MARKETPLACE_STORE_NOT_FOUND";

    throw error;
  }

  let product = null;

  if (productSlug) {
    product =
      await prisma.product.findFirst({
        where: {
          tenantId: profile.tenantId,
          marketplaceSlug:
            productSlug,
          marketplaceStatus:
            "PUBLISHED",
          isActive: true,
        },
        select: {
          id: true,
        },
      });

    if (!product) {
      const error = new Error(
        "Marketplace product is not available",
      );

      error.status = 404;
      error.code =
        "MARKETPLACE_PRODUCT_NOT_FOUND";

      throw error;
    }
  }

  return {
    tenantId: profile.tenantId,
    productId:
      product?.id || null,
  };
}

async function recordMarketplaceAnalyticsEvent(
  payload = {},
  context = {},
) {
  const normalized =
    normalizeEventPayload(payload);

  const marketplaceCustomerId =
    cleanString(
      context.marketplaceCustomerId,
      120,
    );

  if (
    !marketplaceCustomerId &&
    !normalized.visitorId
  ) {
    const error = new Error(
      "Marketplace visitor identifier is required",
    );

    error.status = 400;
    error.code =
      "MARKETPLACE_VISITOR_ID_REQUIRED";

    throw error;
  }

  const target =
    await visibleTenantAndProduct(
      normalized,
    );

  const cutoff = new Date(
    Date.now() -
      duplicateWindowMs(
        normalized.eventType,
      ),
  );

  const identityWhere =
    marketplaceCustomerId
      ? {
          marketplaceCustomerId,
        }
      : {
          visitorId:
            normalized.visitorId,
        };

  const duplicate =
    await prisma
      .marketplaceAnalyticsEvent
      .findFirst({
        where: {
          tenantId:
            target.tenantId,
          productId:
            target.productId,
          eventType:
            normalized.eventType,
          searchTerm:
            normalized.searchTerm,
          occurredAt: {
            gte: cutoff,
          },
          ...identityWhere,
        },
        select: {
          id: true,
        },
      });

  if (duplicate) {
    return {
      recorded: false,
      duplicate: true,
    };
  }

  await prisma
    .marketplaceAnalyticsEvent
    .create({
      data: {
        tenantId:
          target.tenantId,
        productId:
          target.productId,
        marketplaceCustomerId:
          marketplaceCustomerId ||
          null,
        visitorId:
          normalized.visitorId,
        eventType:
          normalized.eventType,
        searchTerm:
          normalized.searchTerm,
        source:
          normalized.source,
        metadata:
          normalized.metadata,
      },
      select: {
        id: true,
      },
    });

  return {
    recorded: true,
    duplicate: false,
  };
}

function summarizeEventCounts(
  groups = [],
) {
  const counts = {};

  Object.values(EVENT_TYPES)
    .forEach((eventType) => {
      counts[eventType] = 0;
    });

  groups.forEach((group) => {
    const eventType =
      group.eventType;

    if (
      !ALLOWED_EVENT_TYPES.has(
        eventType,
      )
    ) {
      return;
    }

    counts[eventType] =
      Number(
        group._count?._all ||
        group._count ||
        0,
      );
  });

  return counts;
}

function buildRequestSummary(
  requests = [],
) {
  const summary = {
    total: 0,
    requested: 0,
    confirmed: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    deliveryFailed: 0,
    revenue: 0,
    averageOrderValue: 0,
  };

  requests.forEach((request) => {
    summary.total += 1;

    switch (request.status) {
      case "REQUESTED":
        summary.requested += 1;
        break;
      case "REJECTED":
        summary.rejected += 1;
        break;
      case "CANCELLED":
        summary.cancelled += 1;
        break;
      case "DELIVERY_FAILED":
        summary.deliveryFailed += 1;
        break;
      case "COMPLETED":
        summary.completed += 1;
        summary.confirmed += 1;
        summary.revenue += Math.max(
          0,
          Number(request.total || 0),
        );
        break;
      default:
        summary.confirmed += 1;
        break;
    }
  });

  summary.revenue =
    Math.round(summary.revenue);

  summary.averageOrderValue =
    summary.completed
      ? Math.round(
          summary.revenue /
            summary.completed,
        )
      : 0;

  return summary;
}

async function getMarketplaceAnalytics(
  tenantId,
  query = {},
) {
  if (!tenantId) {
    const error = new Error(
      "Business context is required",
    );

    error.status = 400;
    error.code =
      "TENANT_CONTEXT_REQUIRED";

    throw error;
  }

  const days =
    safeRangeDays(query.days);

  const end = new Date();

  const start = new Date(
    end.getTime() -
      days * 24 * 60 * 60 * 1000,
  );

  const eventWhere = {
    tenantId,
    occurredAt: {
      gte: start,
      lte: end,
    },
  };

  const requestWhere = {
    tenantId,
    submittedAt: {
      gte: start,
      lte: end,
    },
  };

  const [
    firstTrackedEvent,
    groupedEvents,
    visitorEvents,
    productEvents,
    searchEvents,
    requests,
  ] = await Promise.all([
    prisma
      .marketplaceAnalyticsEvent
      .findFirst({
        where: {
          tenantId,
        },
        orderBy: {
          occurredAt: "asc",
        },
        select: {
          occurredAt: true,
        },
      }),

    prisma
      .marketplaceAnalyticsEvent
      .groupBy({
        by: ["eventType"],
        where: eventWhere,
        _count: {
          _all: true,
        },
      }),

    prisma
      .marketplaceAnalyticsEvent
      .findMany({
        where: eventWhere,
        select: {
          visitorId: true,
          marketplaceCustomerId:
            true,
        },
      }),

    prisma
      .marketplaceAnalyticsEvent
      .findMany({
        where: {
          ...eventWhere,
          productId: {
            not: null,
          },
        },
        select: {
          productId: true,
          eventType: true,
          product: {
            select: {
              id: true,
              name: true,
              marketplaceTitle:
                true,
              marketplaceSlug:
                true,
              marketplaceCategory:
                true,
              stockQty: true,
            },
          },
        },
      }),

    prisma
      .marketplaceAnalyticsEvent
      .findMany({
        where: {
          ...eventWhere,
          eventType: {
            in: [
              EVENT_TYPES.SEARCH,
              EVENT_TYPES
                .SEARCH_NO_RESULTS,
            ],
          },
          searchTerm: {
            not: null,
          },
        },
        select: {
          eventType: true,
          searchTerm: true,
        },
      }),

    prisma
      .marketplaceRequest
      .findMany({
        where: requestWhere,
        select: {
          id: true,
          status: true,
          total: true,
          submittedAt: true,
          items: {
            select: {
              productId: true,
              productSlugSnapshot: true,
              productTitleSnapshot: true,
              productCategorySnapshot: true,
              quantity: true,
              lineTotal: true,
            },
          },
        },
      }),
  ]);

  const eventCounts =
    summarizeEventCounts(
      groupedEvents,
    );

  const visitors = new Set();

  visitorEvents.forEach((event) => {
    const key = visitorKey(event);

    if (key) {
      visitors.add(key);
    }
  });

  const trackingStart =
    effectiveTrackingStart(
      start,
      firstTrackedEvent?.occurredAt,
    );

  const trackedRequests =
    trackingStart
      ? requests.filter(
          (request) =>
            request.submittedAt &&
            new Date(
              request.submittedAt,
            ) >= trackingStart,
        )
      : [];

  const requestSummary =
    buildRequestSummary(
      requests,
    );

  const trackedRequestSummary =
    buildRequestSummary(
      trackedRequests,
    );

  const trackedRequestIds =
    new Set(
      trackedRequests.map(
        (request) => request.id,
      ),
    );

  const productMap =
    new Map();

  function productMetric(
    productId,
    product = null,
  ) {
    const nextTitle =
      product?.marketplaceTitle ||
      product?.productTitleSnapshot ||
      product?.name ||
      "Product";

    const nextSlug =
      product?.marketplaceSlug ||
      product?.productSlugSnapshot ||
      null;

    const nextCategory =
      product?.marketplaceCategory ||
      product?.productCategorySnapshot ||
      null;

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        title: nextTitle,
        slug: nextSlug,
        category: nextCategory,
        stockQuantity:
          Math.max(
            0,
            Number(
              product?.stockQty || 0,
            ),
          ),
        views: 0,
        cardOpens: 0,
        cartAdds: 0,
        saves: 0,
        comparisons: 0,
        requests: 0,
        trackedRequests: 0,
        requestedUnits: 0,
        completedOrders: 0,
        completedRevenue: 0,
        conversionRate: 0,
      });
    } else {
      const metric =
        productMap.get(productId);

      if (
        metric.title === "Product" &&
        nextTitle !== "Product"
      ) {
        metric.title = nextTitle;
      }

      if (!metric.slug && nextSlug) {
        metric.slug = nextSlug;
      }

      if (
        !metric.category &&
        nextCategory
      ) {
        metric.category =
          nextCategory;
      }
    }

    return productMap.get(productId);
  }

  productEvents.forEach((event) => {
    if (!event.productId) {
      return;
    }

    const metric = productMetric(
      event.productId,
      event.product,
    );

    switch (event.eventType) {
      case EVENT_TYPES.PRODUCT_VIEW:
        metric.views += 1;
        break;
      case EVENT_TYPES.PRODUCT_CARD_OPEN:
        metric.cardOpens += 1;
        break;
      case EVENT_TYPES.ADD_TO_CART:
        metric.cartAdds += 1;
        break;
      case EVENT_TYPES.SAVE_PRODUCT:
        metric.saves += 1;
        break;
      case EVENT_TYPES.ADD_TO_COMPARE:
        metric.comparisons += 1;
        break;
      default:
        break;
    }
  });

  requests.forEach((request) => {
    request.items.forEach((item) => {
      const metric = productMetric(
        item.productId,
        item,
      );

      metric.requests += 1;

      if (
        trackedRequestIds.has(
          request.id,
        )
      ) {
        metric.trackedRequests += 1;
      }

      metric.requestedUnits +=
        Math.max(
          0,
          Number(item.quantity || 0),
        );

      if (
        request.status ===
        "COMPLETED"
      ) {
        metric.completedOrders += 1;
        metric.completedRevenue +=
          Math.max(
            0,
            Number(
              item.lineTotal || 0,
            ),
          );
      }
    });
  });

  const products = Array.from(
    productMap.values(),
  )
    .map((metric) => ({
      ...metric,
      completedRevenue:
        Math.round(
          metric.completedRevenue,
        ),
      conversionRate:
        percentage(
          metric.trackedRequests,
          metric.views,
        ),
    }))
    .sort((left, right) => {
      return (
        right.views -
          left.views ||
        right.requests -
          left.requests ||
        right.cartAdds -
          left.cartAdds
      );
    })
    .slice(0, 20);

  const searchMap = new Map();

  searchEvents.forEach((event) => {
    const term =
      event.searchTerm;

    if (!term) {
      return;
    }

    if (!searchMap.has(term)) {
      searchMap.set(term, {
        term,
        searches: 0,
        noResults: 0,
      });
    }

    const metric =
      searchMap.get(term);

    metric.searches += 1;

    if (
      event.eventType ===
      EVENT_TYPES.SEARCH_NO_RESULTS
    ) {
      metric.noResults += 1;
    }
  });

  const searches = Array.from(
    searchMap.values(),
  )
    .sort((left, right) => {
      return (
        right.searches -
          left.searches ||
        right.noResults -
          left.noResults
      );
    })
    .slice(0, 20);

  return {
    range: {
      days,
      start: start.toISOString(),
      end: end.toISOString(),
    },

    tracking: {
      startedAt:
        firstTrackedEvent?.occurredAt
          ? firstTrackedEvent
              .occurredAt
              .toISOString()
          : null,
      effectiveStart:
        trackingStart
          ? trackingStart.toISOString()
          : null,
      trackedOrderRequests:
        trackedRequestSummary.total,
    },

    summary: {
      uniqueVisitors:
        visitors.size,
      storeViews:
        eventCounts.STORE_VIEW,
      productViews:
        eventCounts.PRODUCT_VIEW,
      productCardOpens:
        eventCounts.PRODUCT_CARD_OPEN,
      cartAdds:
        eventCounts.ADD_TO_CART,
      saves:
        eventCounts.SAVE_PRODUCT,
      comparisons:
        eventCounts.ADD_TO_COMPARE,
      searches:
        eventCounts.SEARCH,
      searchesWithoutResults:
        eventCounts.SEARCH_NO_RESULTS,
      orderRequests:
        requestSummary.total,
      confirmedOrders:
        requestSummary.confirmed,
      completedOrders:
        requestSummary.completed,
      marketplaceRevenue:
        requestSummary.revenue,
      averageOrderValue:
        requestSummary
          .averageOrderValue,
      storeConversionRate:
        percentage(
          trackedRequestSummary.total,
          eventCounts.STORE_VIEW,
        ),
      productConversionRate:
        percentage(
          trackedRequestSummary.total,
          eventCounts.PRODUCT_VIEW,
        ),
    },

    requests: requestSummary,
    products,
    searches,
  };
}

module.exports = {
  EVENT_TYPES,
  recordMarketplaceAnalyticsEvent,
  getMarketplaceAnalytics,
};

module.exports.__private = {
  cleanString,
  normalizeVisitorId,
  normalizeSearchTerm,
  normalizeMetadata,
  normalizeEventPayload,
  duplicateWindowMs,
  percentage,
  safeRangeDays,
  effectiveTrackingStart,
  visitorKey,
  summarizeEventCounts,
  buildRequestSummary,
};
