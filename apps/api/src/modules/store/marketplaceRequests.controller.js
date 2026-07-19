const prisma = require("../../config/database");
const {
  MarketplaceRequestStatus,
} = require("@prisma/client");

function cleanString(value) {
  const text = String(value || "").trim();
  return text || null;
}

function tenantIdFromRequest(req) {
  return (
    cleanString(req.user?.tenantId) ||
    cleanString(req.tenantId) ||
    cleanString(req.tenant?.id)
  );
}

function safeTake(value, fallback = 30, max = 100) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(
    Math.max(Math.trunc(number), 1),
    max,
  );
}

function safeSkip(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(Math.trunc(number), 0);
}

function normalizeStatus(value) {
  const status = String(value || "")
    .trim()
    .toUpperCase();

  if (!status || status === "ALL") {
    return null;
  }

  return Object.values(
    MarketplaceRequestStatus,
  ).includes(status)
    ? status
    : null;
}

function requestItemSelect() {
  return {
    id: true,
    requestId: true,
    productId: true,
    productSlugSnapshot: true,
    productTitleSnapshot: true,
    productCategorySnapshot: true,
    productImageSnapshot: true,
    productUrlSnapshot: true,
    quantity: true,
    unitPrice: true,
    lineTotal: true,
    createdAt: true,
  };
}

function requestSelect({ includeItems = false } = {}) {
  return {
    id: true,
    tenantId: true,
    requestNumber: true,
    status: true,
    preferredContact: true,
    fulfilmentMethod: true,
    deliveryCoverage: true,
    paymentMethod: true,

    customerName: true,
    customerPhone: true,
    customerEmail: true,

    deliveryAddress: true,
    deliveryDistrict: true,
    deliverySector: true,
    customerNote: true,

    currency: true,
    subtotal: true,
    deliveryFee: true,
    total: true,

    sellerNameSnapshot: true,
    sellerPhoneSnapshot: true,
    sellerEmailSnapshot: true,

    submittedAt: true,
    confirmedAt: true,
    rejectedAt: true,
    cancelledAt: true,
    completedAt: true,
    createdAt: true,
    updatedAt: true,

    ...(includeItems
      ? {
          items: {
            orderBy: {
              createdAt: "asc",
            },
            select: requestItemSelect(),
          },
        }
      : {
          items: {
            orderBy: {
              createdAt: "asc",
            },
            take: 3,
            select: requestItemSelect(),
          },
          _count: {
            select: {
              items: true,
            },
          },
        }),
  };
}

function sendError(res, error, fallback) {
  return res.status(error.status || 500).json({
    message: error.message || fallback,
    code: error.code || null,
    details: error.details || null,
  });
}

async function listMarketplaceRequests(req, res) {
  const tenantId = tenantIdFromRequest(req);

  if (!tenantId) {
    return res.status(400).json({
      message: "Business context is required",
      code: "TENANT_CONTEXT_REQUIRED",
    });
  }

  try {
    const query = cleanString(req.query?.q);
    const status = normalizeStatus(
      req.query?.status,
    );
    const take = safeTake(req.query?.take);
    const skip = safeSkip(req.query?.skip);

    const where = {
      tenantId,
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              {
                requestNumber: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                customerName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                customerPhone: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                customerEmail: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                items: {
                  some: {
                    productTitleSnapshot: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [
      requests,
      total,
      requestedCount,
      activeCount,
      completedCount,
    ] = await Promise.all([
      prisma.marketplaceRequest.findMany({
        where,
        orderBy: [
          {
            submittedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        skip,
        take,
        select: requestSelect(),
      }),

      prisma.marketplaceRequest.count({
        where,
      }),

      prisma.marketplaceRequest.count({
        where: {
          tenantId,
          status:
            MarketplaceRequestStatus.REQUESTED,
        },
      }),

      prisma.marketplaceRequest.count({
        where: {
          tenantId,
          status: {
            in: [
              MarketplaceRequestStatus.CONFIRMED,
              MarketplaceRequestStatus.PREPARING,
              MarketplaceRequestStatus.READY_FOR_PICKUP,
              MarketplaceRequestStatus.OUT_FOR_DELIVERY,
            ],
          },
        },
      }),

      prisma.marketplaceRequest.count({
        where: {
          tenantId,
          status:
            MarketplaceRequestStatus.COMPLETED,
        },
      }),
    ]);

    return res.json({
      requests,
      summary: {
        newRequests: requestedCount,
        activeRequests: activeCount,
        completedRequests: completedCount,
        totalRequests: total,
      },
      page: {
        total,
        take,
        skip,
        hasMore: skip + requests.length < total,
        nextSkip:
          skip + requests.length < total
            ? skip + requests.length
            : null,
      },
    });
  } catch (error) {
    console.error(
      "listMarketplaceRequests error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to load Marketplace requests",
    );
  }
}

async function getMarketplaceRequest(req, res) {
  const tenantId = tenantIdFromRequest(req);
  const requestId = cleanString(
    req.params?.requestId,
  );

  if (!tenantId) {
    return res.status(400).json({
      message: "Business context is required",
      code: "TENANT_CONTEXT_REQUIRED",
    });
  }

  if (!requestId) {
    return res.status(400).json({
      message: "Request ID is required",
      code: "MARKETPLACE_REQUEST_ID_REQUIRED",
    });
  }

  try {
    const request =
      await prisma.marketplaceRequest.findFirst({
        where: {
          id: requestId,
          tenantId,
        },
        select: requestSelect({
          includeItems: true,
        }),
      });

    if (!request) {
      return res.status(404).json({
        message:
          "Marketplace request not found",
        code:
          "MARKETPLACE_REQUEST_NOT_FOUND",
      });
    }

    return res.json({
      request,
    });
  } catch (error) {
    console.error(
      "getMarketplaceRequest error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to load Marketplace request",
    );
  }
}

module.exports = {
  listMarketplaceRequests,
  getMarketplaceRequest,
};
