const prisma = require("../../config/database");
const {
  MarketplaceRequestStatus,
  Prisma,
} = require("@prisma/client");
const {
  completeMarketplaceDelivery,
  completeMarketplacePickup,
} = require("./marketplaceOrderCompletion.service");
const {
  failMarketplaceDelivery,
} = require("./marketplaceDeliveryFailure.service");

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

function createBusinessError(
  message,
  status,
  code,
  details = null,
) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

function safeTake(
  value,
  fallback = 30,
  max = 100,
) {
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

function normalizeMoney(value) {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return Math.round(
    (number + Number.EPSILON) * 100,
  ) / 100;
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

function requestSelect({
  includeItems = false,
} = {}) {
  return {
    id: true,
    tenantId: true,
    requestNumber: true,
    status: true,
    preferredContact: true,
    fulfilmentMethod: true,
    deliveryCoverage: true,
    paymentMethod: true,
    fulfilmentBranchId: true,
    saleId: true,

    sale: {
      select: {
        id: true,
        receiptNumber: true,
        invoiceNumber: true,
        total: true,
        amountPaid: true,
        status: true,
      },
    },

    fulfilmentBranch: {
      select: {
        id: true,
        name: true,
        phone: true,
        district: true,
        sector: true,
        address: true,
        code: true,
        isMain: true,
        status: true,
      },
    },

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
    deliveryFailedAt: true,
    deliveryFailureReason: true,
    deliveryFailureNote: true,
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

function sendError(
  res,
  error,
  fallback,
) {
  return res
    .status(error.status || 500)
    .json({
      message:
        error.message || fallback,
      code: error.code || null,
      details:
        error.details || null,
    });
}

function assertRequestedStatus(request) {
  if (!request) {
    throw createBusinessError(
      "Order request not found",
      404,
      "MARKETPLACE_REQUEST_NOT_FOUND",
    );
  }

  if (
    request.status !==
    MarketplaceRequestStatus.REQUESTED
  ) {
    throw createBusinessError(
      "This order has already been processed.",
      409,
      "MARKETPLACE_REQUEST_ALREADY_PROCESSED",
      {
        currentStatus: request.status,
      },
    );
  }
}

function resolveDeliveryFee(
  request,
  body = {},
) {
  if (
    request.fulfilmentMethod !==
    "DELIVERY"
  ) {
    return 0;
  }

  const supplied =
    Object.prototype.hasOwnProperty.call(
      body,
      "deliveryFee",
    );

  if (
    request.deliveryCoverage ===
      "OUTSIDE_KIGALI" &&
    !supplied
  ) {
    throw createBusinessError(
      "Enter the delivery cost before confirming this order.",
      400,
      "MARKETPLACE_DELIVERY_FEE_REQUIRED",
    );
  }

  const source = supplied
    ? body.deliveryFee
    : request.deliveryFee;

  const deliveryFee =
    normalizeMoney(source);

  if (deliveryFee === null) {
    throw createBusinessError(
      "Delivery cost must be zero or more.",
      400,
      "MARKETPLACE_DELIVERY_FEE_INVALID",
    );
  }

  return deliveryFee;
}

function buildInventoryAllocations({
  inventories,
  requestedQuantity,
}) {
  const required =
    Number(requestedQuantity);

  if (
    !Number.isInteger(required) ||
    required <= 0
  ) {
    throw createBusinessError(
      "Requested quantity is invalid.",
      400,
      "MARKETPLACE_REQUEST_QUANTITY_INVALID",
    );
  }

  let remaining = required;
  const allocations = [];

  for (
    const inventory of inventories || []
  ) {
    if (remaining <= 0) {
      break;
    }

    const onHand = Number(
      inventory.qtyOnHand || 0,
    );

    const reserved = Number(
      inventory.qtyReserved || 0,
    );

    const available = Math.max(
      onHand - reserved,
      0,
    );

    if (available <= 0) {
      continue;
    }

    const quantity = Math.min(
      available,
      remaining,
    );

    allocations.push({
      inventoryId: inventory.id,
      branchId: inventory.branchId,
      productId: inventory.productId,
      quantity,
    });

    remaining -= quantity;
  }

  return {
    allocations,
    available:
      required - remaining,
    missing: remaining,
    complete: remaining === 0,
  };
}

async function lockRequest(
  tx,
  tenantId,
  requestId,
) {
  const rows = await tx.$queryRaw(
    Prisma.sql`
      SELECT
        "id",
        "status"
      FROM "MarketplaceRequest"
      WHERE
        "id" = ${requestId}
        AND "tenantId" = ${tenantId}
      FOR UPDATE
    `,
  );

  return rows[0] || null;
}

async function lockProductInventory(
  tx,
  tenantId,
  productId,
  branchId,
) {
  return tx.$queryRaw(
    Prisma.sql`
      SELECT
        inventory."id",
        inventory."branchId",
        inventory."productId",
        inventory."qtyOnHand",
        inventory."qtyReserved",
        branch."isMain"
      FROM "BranchInventory" AS inventory
      INNER JOIN "Branch" AS branch
        ON branch."id" = inventory."branchId"
      WHERE
        inventory."tenantId" = ${tenantId}
        AND inventory."productId" = ${productId}
        AND inventory."branchId" = ${branchId}
        AND branch."tenantId" = ${tenantId}
        AND branch."status" = 'ACTIVE'
      FOR UPDATE OF inventory
    `,
  );
}

async function resolveFulfilmentBranch(
  tx,
  req,
  tenantId,
  branchId,
) {
  const safeBranchId =
    cleanString(branchId);

  if (!safeBranchId) {
    throw createBusinessError(
      "Choose the location that will fulfil this order.",
      400,
      "MARKETPLACE_FULFILMENT_BRANCH_REQUIRED",
    );
  }

  const branch =
    await tx.branch.findFirst({
      where: {
        id: safeBranchId,
        tenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        code: true,
        isMain: true,
      },
    });

  if (!branch) {
    throw createBusinessError(
      "The selected fulfilment location is not active.",
      404,
      "MARKETPLACE_FULFILMENT_BRANCH_NOT_FOUND",
    );
  }

  const role = cleanString(
    req.user?.role,
  )?.toUpperCase();

  const ownerRoles = new Set([
    "OWNER",
    "PRIMARY_OWNER",
    "PARTNER",
  ]);

  if (!ownerRoles.has(role)) {
    const allowedBranchIds =
      Array.isArray(
        req.user?.allowedBranchIds,
      )
        ? req.user.allowedBranchIds.map(
            String,
          )
        : [];

    if (
      !allowedBranchIds.includes(
        safeBranchId,
      )
    ) {
      throw createBusinessError(
        "You cannot operate from the selected fulfilment location.",
        403,
        "MARKETPLACE_FULFILMENT_BRANCH_ACCESS_DENIED",
      );
    }

    const assignment =
      await tx.userBranchAssignment.findFirst({
        where: {
          tenantId,
          userId:
            req.user?.userId ||
            req.user?.id,
          branchId: safeBranchId,
          canOperate: true,
        },
        select: {
          id: true,
        },
      });

    if (!assignment) {
      throw createBusinessError(
        "You cannot operate from the selected fulfilment location.",
        403,
        "MARKETPLACE_FULFILMENT_BRANCH_OPERATION_DENIED",
      );
    }
  }

  return branch;
}

function assertRequestStatus(
  request,
  allowedStatuses,
  actionLabel,
) {
  if (!request) {
    throw createBusinessError(
      "Order request not found",
      404,
      "MARKETPLACE_REQUEST_NOT_FOUND",
    );
  }

  if (
    !allowedStatuses.includes(
      request.status,
    )
  ) {
    throw createBusinessError(
      `This order cannot be ${actionLabel} from its current status.`,
      409,
      "MARKETPLACE_REQUEST_STATUS_TRANSITION_INVALID",
      {
        currentStatus: request.status,
        allowedStatuses,
      },
    );
  }
}

function assertActiveReservations(
  reservations,
) {
  if (
    !Array.isArray(reservations) ||
    reservations.length === 0
  ) {
    throw createBusinessError(
      "Reserved stock was not found for this order.",
      409,
      "MARKETPLACE_REQUEST_RESERVATIONS_NOT_FOUND",
    );
  }
}

async function changeMarketplaceRequestStatus({
  req,
  tenantId,
  requestId,
  allowedStatuses,
  nextStatus,
  actionLabel,
  validateRequest = null,
}) {
  return prisma.$transaction(
    async (tx) => {
      const locked =
        await lockRequest(
          tx,
          tenantId,
          requestId,
        );

      assertRequestStatus(
        locked,
        allowedStatuses,
        actionLabel,
      );

      const current =
        await loadFullRequest(
          tx,
          tenantId,
          requestId,
        );

      assertRequestStatus(
        current,
        allowedStatuses,
        actionLabel,
      );

      if (
        typeof validateRequest ===
        "function"
      ) {
        validateRequest(current);
      }

      const reservations =
        await tx
          .marketplaceRequestReservation
          .findMany({
            where: {
              tenantId,
              requestId,
              releasedAt: null,
              completedAt: null,
            },
            select: {
              id: true,
              branchId: true,
              productId: true,
              quantity: true,
            },
          });

      assertActiveReservations(
        reservations,
      );

      await tx.marketplaceRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: nextStatus,
        },
      });

      return loadFullRequest(
        tx,
        tenantId,
        requestId,
      );
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel
          .Serializable,
    },
  );
}

async function releaseMarketplaceReservations({
  tx,
  tenantId,
  requestId,
}) {
  const reservations =
    await tx
      .marketplaceRequestReservation
      .findMany({
        where: {
          tenantId,
          requestId,
          releasedAt: null,
          completedAt: null,
        },
        select: {
          id: true,
          branchId: true,
          productId: true,
          quantity: true,
        },
      });

  assertActiveReservations(
    reservations,
  );

  const releasedAt = new Date();

  for (
    const reservation of reservations
  ) {
    const updated =
      await tx.branchInventory.updateMany({
        where: {
          tenantId,
          branchId:
            reservation.branchId,
          productId:
            reservation.productId,
          qtyReserved: {
            gte: reservation.quantity,
          },
        },
        data: {
          qtyReserved: {
            decrement:
              reservation.quantity,
          },
        },
      });

    if (
      !updated ||
      updated.count !== 1
    ) {
      throw createBusinessError(
        "Reserved stock could not be released safely.",
        409,
        "MARKETPLACE_REQUEST_RESERVATION_RELEASE_FAILED",
        {
          reservationId:
            reservation.id,
          branchId:
            reservation.branchId,
          productId:
            reservation.productId,
        },
      );
    }
  }

  await tx
    .marketplaceRequestReservation
    .updateMany({
      where: {
        tenantId,
        requestId,
        releasedAt: null,
        completedAt: null,
      },
      data: {
        releasedAt,
      },
    });

  return reservations;
}

async function loadFullRequest(
  client,
  tenantId,
  requestId,
) {
  return client.marketplaceRequest.findFirst({
    where: {
      id: requestId,
      tenantId,
    },
    select: requestSelect({
      includeItems: true,
    }),
  });
}

async function listMarketplaceRequests(
  req,
  res,
) {
  const tenantId =
    tenantIdFromRequest(req);

  if (!tenantId) {
    return res.status(400).json({
      message:
        "Business context is required",
      code:
        "TENANT_CONTEXT_REQUIRED",
    });
  }

  try {
    const query =
      cleanString(req.query?.q);

    const status =
      normalizeStatus(
        req.query?.status,
      );

    const take =
      safeTake(req.query?.take);

    const skip =
      safeSkip(req.query?.skip);

    const where = {
      tenantId,
      ...(status
        ? { status }
        : {}),
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
        newRequests:
          requestedCount,
        activeRequests:
          activeCount,
        completedRequests:
          completedCount,
        totalRequests: total,
      },
      page: {
        total,
        take,
        skip,
        hasMore:
          skip + requests.length <
          total,
        nextSkip:
          skip + requests.length <
          total
            ? skip +
              requests.length
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
      "Failed to load order requests",
    );
  }
}

async function getMarketplaceRequest(
  req,
  res,
) {
  const tenantId =
    tenantIdFromRequest(req);

  const requestId =
    cleanString(
      req.params?.requestId,
    );

  if (!tenantId) {
    return res.status(400).json({
      message:
        "Business context is required",
      code:
        "TENANT_CONTEXT_REQUIRED",
    });
  }

  if (!requestId) {
    return res.status(400).json({
      message:
        "Request ID is required",
      code:
        "MARKETPLACE_REQUEST_ID_REQUIRED",
    });
  }

  try {
    const request =
      await loadFullRequest(
        prisma,
        tenantId,
        requestId,
      );

    if (!request) {
      return res.status(404).json({
        message:
          "Order request not found",
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
      "Failed to load order request",
    );
  }
}

async function confirmMarketplaceRequest(
  req,
  res,
) {
  const tenantId =
    tenantIdFromRequest(req);

  const requestId =
    cleanString(
      req.params?.requestId,
    );

  if (!tenantId) {
    return res.status(400).json({
      message:
        "Business context is required",
      code:
        "TENANT_CONTEXT_REQUIRED",
    });
  }

  if (!requestId) {
    return res.status(400).json({
      message:
        "Request ID is required",
      code:
        "MARKETPLACE_REQUEST_ID_REQUIRED",
    });
  }

  try {
    const request =
      await prisma.$transaction(
        async (tx) => {
          const locked =
            await lockRequest(
              tx,
              tenantId,
              requestId,
            );

          assertRequestedStatus(
            locked,
          );

          const current =
            await loadFullRequest(
              tx,
              tenantId,
              requestId,
            );

          assertRequestedStatus(
            current,
          );

          const fulfilmentBranch =
            await resolveFulfilmentBranch(
              tx,
              req,
              tenantId,
              req.body?.fulfilmentBranchId,
            );

          if (
            !Array.isArray(
              current.items,
            ) ||
            current.items.length ===
              0
          ) {
            throw createBusinessError(
              "This order has no products to confirm.",
              409,
              "MARKETPLACE_REQUEST_HAS_NO_ITEMS",
            );
          }

          const existingReservations =
            await tx
              .marketplaceRequestReservation
              .count({
                where: {
                  tenantId,
                  requestId,
                  releasedAt: null,
                  completedAt: null,
                },
              });

          if (
            existingReservations > 0
          ) {
            throw createBusinessError(
              "Stock has already been reserved for this order.",
              409,
              "MARKETPLACE_REQUEST_ALREADY_RESERVED",
            );
          }

          const allAllocations = [];

          for (
            const item of current.items
          ) {
            const inventories =
              await lockProductInventory(
                tx,
                tenantId,
                item.productId,
                fulfilmentBranch.id,
              );

            const allocation =
              buildInventoryAllocations(
                {
                  inventories,
                  requestedQuantity:
                    item.quantity,
                },
              );

            if (!allocation.complete) {
              throw createBusinessError(
                `${item.productTitleSnapshot} does not have enough available stock at ${fulfilmentBranch.name}.`,
                409,
                "MARKETPLACE_REQUEST_INSUFFICIENT_STOCK",
                {
                  productId:
                    item.productId,
                  productName:
                    item.productTitleSnapshot,
                  requested:
                    item.quantity,
                  available:
                    allocation.available,
                  missing:
                    allocation.missing,
                },
              );
            }

            allocation.allocations.forEach(
              (entry) => {
                allAllocations.push({
                  ...entry,
                  requestItemId:
                    item.id,
                });
              },
            );
          }

          for (
            const allocation of
            allAllocations
          ) {
            await tx.branchInventory.update({
              where: {
                id:
                  allocation.inventoryId,
              },
              data: {
                qtyReserved: {
                  increment:
                    allocation.quantity,
                },
              },
            });
          }

          await tx
            .marketplaceRequestReservation
            .createMany({
              data:
                allAllocations.map(
                  (allocation) => ({
                    tenantId,
                    requestId,
                    requestItemId:
                      allocation.requestItemId,
                    productId:
                      allocation.productId,
                    branchId:
                      allocation.branchId,
                    quantity:
                      allocation.quantity,
                  }),
                ),
            });

          const deliveryFee =
            resolveDeliveryFee(
              current,
              req.body || {},
            );

          await tx
            .marketplaceRequest
            .update({
              where: {
                id: requestId,
              },
              data: {
                status:
                  MarketplaceRequestStatus.CONFIRMED,
                confirmedAt:
                  new Date(),
                rejectedAt: null,
                fulfilmentBranchId:
                  fulfilmentBranch.id,
                deliveryFee,
                total:
                  Number(
                    current.subtotal ||
                      0,
                  ) +
                  deliveryFee,
              },
            });

          return loadFullRequest(
            tx,
            tenantId,
            requestId,
          );
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );

    return res.json({
      message:
        "Order confirmed and stock reserved.",
      request,
    });
  } catch (error) {
    console.error(
      "confirmMarketplaceRequest error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to confirm order",
    );
  }
}

async function startPreparingMarketplaceRequest(
  req,
  res,
) {
  const tenantId =
    tenantIdFromRequest(req);

  const requestId =
    cleanString(
      req.params?.requestId,
    );

  if (!tenantId || !requestId) {
    return res.status(400).json({
      message:
        "Business context and request ID are required",
      code:
        "MARKETPLACE_REQUEST_CONTEXT_REQUIRED",
    });
  }

  try {
    const request =
      await changeMarketplaceRequestStatus({
        req,
        tenantId,
        requestId,
        allowedStatuses: [
          MarketplaceRequestStatus.CONFIRMED,
        ],
        nextStatus:
          MarketplaceRequestStatus.PREPARING,
        actionLabel:
          "moved to preparing",
      });

    return res.json({
      message:
        "Order marked as preparing.",
      request,
    });
  } catch (error) {
    console.error(
      "startPreparingMarketplaceRequest error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to start preparing request",
    );
  }
}

async function markMarketplaceRequestReady(
  req,
  res,
) {
  const tenantId =
    tenantIdFromRequest(req);

  const requestId =
    cleanString(
      req.params?.requestId,
    );

  if (!tenantId || !requestId) {
    return res.status(400).json({
      message:
        "Business context and request ID are required",
      code:
        "MARKETPLACE_REQUEST_CONTEXT_REQUIRED",
    });
  }

  try {
    const request =
      await changeMarketplaceRequestStatus({
        req,
        tenantId,
        requestId,
        allowedStatuses: [
          MarketplaceRequestStatus.PREPARING,
        ],
        nextStatus:
          MarketplaceRequestStatus.READY_FOR_PICKUP,
        actionLabel:
          "marked ready for pickup",
        validateRequest(current) {
          if (
            current.fulfilmentMethod !==
            "PICKUP"
          ) {
            throw createBusinessError(
              "Only pickup requests can be marked ready for pickup.",
              409,
              "MARKETPLACE_REQUEST_NOT_PICKUP",
            );
          }
        },
      });

    return res.json({
      message:
        "Order is ready for pickup.",
      request,
    });
  } catch (error) {
    console.error(
      "markMarketplaceRequestReady error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to mark order ready",
    );
  }
}

async function markMarketplaceRequestOutForDelivery(
  req,
  res,
) {
  const tenantId =
    tenantIdFromRequest(req);

  const requestId =
    cleanString(
      req.params?.requestId,
    );

  if (!tenantId || !requestId) {
    return res.status(400).json({
      message:
        "Business context and request ID are required",
      code:
        "MARKETPLACE_REQUEST_CONTEXT_REQUIRED",
    });
  }

  try {
    const request =
      await changeMarketplaceRequestStatus({
        req,
        tenantId,
        requestId,
        allowedStatuses: [
          MarketplaceRequestStatus.PREPARING,
        ],
        nextStatus:
          MarketplaceRequestStatus.OUT_FOR_DELIVERY,
        actionLabel:
          "marked out for delivery",
        validateRequest(current) {
          if (
            current.fulfilmentMethod !==
            "DELIVERY"
          ) {
            throw createBusinessError(
              "Only delivery requests can be marked out for delivery.",
              409,
              "MARKETPLACE_REQUEST_NOT_DELIVERY",
            );
          }
        },
      });

    return res.json({
      message:
        "Order is out for delivery.",
      request,
    });
  } catch (error) {
    console.error(
      "markMarketplaceRequestOutForDelivery error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to mark order out for delivery",
    );
  }
}

async function cancelMarketplaceRequest(
  req,
  res,
) {
  const tenantId =
    tenantIdFromRequest(req);

  const requestId =
    cleanString(
      req.params?.requestId,
    );

  if (!tenantId || !requestId) {
    return res.status(400).json({
      message:
        "Business context and request ID are required",
      code:
        "MARKETPLACE_REQUEST_CONTEXT_REQUIRED",
    });
  }

  try {
    const request =
      await prisma.$transaction(
        async (tx) => {
          const locked =
            await lockRequest(
              tx,
              tenantId,
              requestId,
            );

          const cancellableStatuses = [
            MarketplaceRequestStatus.CONFIRMED,
            MarketplaceRequestStatus.PREPARING,
            MarketplaceRequestStatus.READY_FOR_PICKUP,
            MarketplaceRequestStatus.OUT_FOR_DELIVERY,
          ];

          assertRequestStatus(
            locked,
            cancellableStatuses,
            "cancelled",
          );

          const current =
            await loadFullRequest(
              tx,
              tenantId,
              requestId,
            );

          assertRequestStatus(
            current,
            cancellableStatuses,
            "cancelled",
          );

          await releaseMarketplaceReservations({
            tx,
            tenantId,
            requestId,
          });

          await tx
            .marketplaceRequest
            .update({
              where: {
                id: requestId,
              },
              data: {
                status:
                  MarketplaceRequestStatus.CANCELLED,
                cancelledAt:
                  new Date(),
              },
            });

          return loadFullRequest(
            tx,
            tenantId,
            requestId,
          );
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );

    return res.json({
      message:
        "Order cancelled and reserved stock released.",
      request,
    });
  } catch (error) {
    console.error(
      "cancelMarketplaceRequest error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to cancel order",
    );
  }
}

async function completeMarketplacePickupRequest(
  req,
  res,
) {
  const tenantId =
    tenantIdFromRequest(req);

  const requestId =
    cleanString(
      req.params?.requestId,
    );

  if (!tenantId || !requestId) {
    return res.status(400).json({
      message:
        "Business context and order ID are required.",
      code:
        "MARKETPLACE_ORDER_CONTEXT_REQUIRED",
    });
  }

  try {
    const result =
      await completeMarketplacePickup({
        req,
        tenantId,
        requestId,
        paymentMethod:
          req.body?.paymentMethod,
        paymentReference:
          req.body?.paymentReference,
      });

    return res.json({
      message: result.alreadyCompleted
        ? "This pickup was already completed."
        : "Pickup completed and sale recorded.",
      ...result,
    });
  } catch (error) {
    console.error(
      "completeMarketplacePickupRequest error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to complete pickup",
    );
  }
}

async function completeMarketplaceDeliveryRequest(
  req,
  res,
) {
  const tenantId =
    tenantIdFromRequest(req);

  const requestId =
    cleanString(
      req.params?.requestId,
    );

  if (!tenantId || !requestId) {
    return res.status(400).json({
      message:
        "Business context and order ID are required.",
      code:
        "MARKETPLACE_ORDER_CONTEXT_REQUIRED",
    });
  }

  try {
    const result =
      await completeMarketplaceDelivery({
        req,
        tenantId,
        requestId,
        paymentMethod:
          req.body?.paymentMethod,
        paymentReference:
          req.body?.paymentReference,
      });

    return res.json({
      message:
        result.alreadyCompleted
          ? "This delivery was already completed."
          : "Delivery completed and sale recorded.",
      ...result,
    });
  } catch (error) {
    console.error(
      "completeMarketplaceDeliveryRequest error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to complete delivery",
    );
  }
}

async function failMarketplaceDeliveryRequest(
  req,
  res,
) {
  const tenantId =
    tenantIdFromRequest(req);

  const requestId =
    cleanString(
      req.params?.requestId,
    );

  if (!tenantId || !requestId) {
    return res.status(400).json({
      message:
        "Business context and order ID are required.",
      code:
        "MARKETPLACE_ORDER_CONTEXT_REQUIRED",
    });
  }

  try {
    const result =
      await failMarketplaceDelivery({
        req,
        tenantId,
        requestId,
        reason:
          req.body
            ?.deliveryFailureReason,
        note:
          req.body
            ?.deliveryFailureNote,
      });

    return res.json({
      message:
        result.alreadyFailed
          ? "This delivery was already marked as failed."
          : "Delivery closed and reserved stock released.",
      ...result,
    });
  } catch (error) {
    console.error(
      "failMarketplaceDeliveryRequest error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to close delivery",
    );
  }
}

async function rejectMarketplaceRequest(
  req,
  res,
) {
  const tenantId =
    tenantIdFromRequest(req);

  const requestId =
    cleanString(
      req.params?.requestId,
    );

  if (!tenantId) {
    return res.status(400).json({
      message:
        "Business context is required",
      code:
        "TENANT_CONTEXT_REQUIRED",
    });
  }

  if (!requestId) {
    return res.status(400).json({
      message:
        "Request ID is required",
      code:
        "MARKETPLACE_REQUEST_ID_REQUIRED",
    });
  }

  try {
    const request =
      await prisma.$transaction(
        async (tx) => {
          const locked =
            await lockRequest(
              tx,
              tenantId,
              requestId,
            );

          assertRequestedStatus(
            locked,
          );

          const reservationCount =
            await tx
              .marketplaceRequestReservation
              .count({
                where: {
                  tenantId,
                  requestId,
                  releasedAt: null,
                  completedAt: null,
                },
              });

          if (
            reservationCount > 0
          ) {
            throw createBusinessError(
              "This order already has reserved stock and cannot be rejected from the new-order stage.",
              409,
              "MARKETPLACE_REQUEST_HAS_RESERVATIONS",
            );
          }

          await tx
            .marketplaceRequest
            .update({
              where: {
                id: requestId,
              },
              data: {
                status:
                  MarketplaceRequestStatus.REJECTED,
                rejectedAt:
                  new Date(),
                confirmedAt: null,
              },
            });

          return loadFullRequest(
            tx,
            tenantId,
            requestId,
          );
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );

    return res.json({
      message:
        "Request rejected.",
      request,
    });
  } catch (error) {
    console.error(
      "rejectMarketplaceRequest error:",
      error,
    );

    return sendError(
      res,
      error,
      "Failed to reject order request",
    );
  }
}

module.exports = {
  listMarketplaceRequests,
  getMarketplaceRequest,
  confirmMarketplaceRequest,
  rejectMarketplaceRequest,
  startPreparingMarketplaceRequest,
  markMarketplaceRequestReady,
  markMarketplaceRequestOutForDelivery,
  cancelMarketplaceRequest,
  completeMarketplaceDeliveryRequest,
  completeMarketplacePickupRequest,
  failMarketplaceDeliveryRequest,

  __private: {
    assertRequestedStatus,
    buildInventoryAllocations,
    normalizeMoney,
    resolveDeliveryFee,
    resolveFulfilmentBranch,
    assertRequestStatus,
    assertActiveReservations,
  },
};
