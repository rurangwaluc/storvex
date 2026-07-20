"use strict";

const prisma =
  require("../../config/database");

const {
  MarketplaceRequestStatus,
  Prisma,
} = require("@prisma/client");

const DELIVERY_FAILURE_REASONS =
  new Set([
    "CUSTOMER_REFUSED",
    "CUSTOMER_UNREACHABLE",
    "WRONG_ADDRESS",
    "DELIVERY_ATTEMPT_FAILED",
    "OTHER",
  ]);

function cleanString(value) {
  const text =
    String(value || "").trim();

  return text || null;
}

function businessError(
  message,
  status,
  code,
  details = null,
) {
  const error =
    new Error(message);

  error.status = status;
  error.code = code;
  error.details = details;

  return error;
}

function normalizeDeliveryFailureReason(
  value,
) {
  const reason =
    String(value || "")
      .trim()
      .toUpperCase();

  return DELIVERY_FAILURE_REASONS.has(
    reason,
  )
    ? reason
    : null;
}

function normalizeDeliveryFailureNote(
  value,
) {
  const note =
    cleanString(value);

  if (!note) {
    return null;
  }

  return note.slice(0, 1000);
}

function assertBranchAccess(
  req,
  branchId,
) {
  const canViewAllBranches =
    Boolean(
      req.user?.canViewAllBranches,
    );

  const allowedBranchIds =
    Array.isArray(
      req.user?.allowedBranchIds,
    )
      ? req.user.allowedBranchIds
          .filter(Boolean)
      : [];

  if (
    !canViewAllBranches &&
    allowedBranchIds.length > 0 &&
    !allowedBranchIds.includes(
      branchId,
    )
  ) {
    throw businessError(
      "You do not have access to update delivery orders from this location.",
      403,
      "MARKETPLACE_ORDER_BRANCH_ACCESS_DENIED",
    );
  }
}

async function lockMarketplaceOrder(
  tx,
  tenantId,
  requestId,
) {
  const rows =
    await tx.$queryRaw(
      Prisma.sql`
        SELECT
          "id",
          "status",
          "saleId",
          "fulfilmentMethod",
          "fulfilmentBranchId",
          "deliveryFailedAt",
          "deliveryFailureReason"
        FROM "MarketplaceRequest"
        WHERE
          "id" = ${requestId}
          AND "tenantId" = ${tenantId}
        FOR UPDATE
      `,
    );

  return rows[0] || null;
}

async function failMarketplaceDelivery({
  req,
  tenantId,
  requestId,
  reason,
  note,
}) {
  const userId =
    cleanString(req.user?.userId) ||
    cleanString(req.user?.id);

  if (!userId) {
    throw businessError(
      "User context is required.",
      401,
      "USER_CONTEXT_REQUIRED",
    );
  }

  const normalizedReason =
    normalizeDeliveryFailureReason(
      reason,
    );

  if (!normalizedReason) {
    throw businessError(
      "Choose why the delivery was not completed.",
      400,
      "MARKETPLACE_DELIVERY_FAILURE_REASON_REQUIRED",
      {
        allowedReasons:
          Array.from(
            DELIVERY_FAILURE_REASONS,
          ),
      },
    );
  }

  const normalizedNote =
    normalizeDeliveryFailureNote(
      note,
    );

  return prisma.$transaction(
    async (tx) => {
      const locked =
        await lockMarketplaceOrder(
          tx,
          tenantId,
          requestId,
        );

      if (!locked) {
        throw businessError(
          "Order was not found.",
          404,
          "MARKETPLACE_ORDER_NOT_FOUND",
        );
      }

      if (
        locked.status ===
          MarketplaceRequestStatus
            .DELIVERY_FAILED
      ) {
        const existing =
          await tx.marketplaceRequest
            .findFirst({
              where: {
                id: requestId,
                tenantId,
              },
              include: {
                items: {
                  orderBy: {
                    createdAt: "asc",
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
                  },
                },
              },
            });

        return {
          alreadyFailed: true,
          request: existing,
        };
      }

      if (locked.saleId) {
        throw businessError(
          "This order already has a sale and cannot be marked as a failed delivery.",
          409,
          "MARKETPLACE_ORDER_ALREADY_SOLD",
        );
      }

      if (
        locked.fulfilmentMethod !==
        "DELIVERY"
      ) {
        throw businessError(
          "This action is only for delivery orders.",
          409,
          "MARKETPLACE_ORDER_NOT_DELIVERY",
        );
      }

      if (
        locked.status !==
        MarketplaceRequestStatus
          .OUT_FOR_DELIVERY
      ) {
        throw businessError(
          "Only an order that is out for delivery can be marked as failed.",
          409,
          "MARKETPLACE_ORDER_NOT_OUT_FOR_DELIVERY",
        );
      }

      if (!locked.fulfilmentBranchId) {
        throw businessError(
          "The fulfilment location is missing.",
          409,
          "MARKETPLACE_ORDER_BRANCH_REQUIRED",
        );
      }

      assertBranchAccess(
        req,
        locked.fulfilmentBranchId,
      );

      const branch =
        await tx.branch.findFirst({
          where: {
            id:
              locked
                .fulfilmentBranchId,
            tenantId,
            status: "ACTIVE",
          },
          select: {
            id: true,
            name: true,
          },
        });

      if (!branch) {
        throw businessError(
          "The fulfilment location is not active.",
          409,
          "MARKETPLACE_ORDER_BRANCH_NOT_ACTIVE",
        );
      }

      const reservations =
        await tx
          .marketplaceRequestReservation
          .findMany({
            where: {
              tenantId,
              requestId,
              branchId: branch.id,
              releasedAt: null,
              completedAt: null,
            },
            orderBy: {
              createdAt: "asc",
            },
          });

      if (
        !Array.isArray(
          reservations,
        ) ||
        reservations.length === 0
      ) {
        throw businessError(
          "Reserved stock was not found for this order.",
          409,
          "MARKETPLACE_ORDER_RESERVATIONS_NOT_FOUND",
        );
      }

      const failedAt =
        new Date();

      for (
        const reservation
        of reservations
      ) {
        const quantity =
          Number(
            reservation.quantity ||
              0,
          );

        if (
          !Number.isInteger(
            quantity,
          ) ||
          quantity <= 0
        ) {
          throw businessError(
            "The reserved stock quantity is invalid.",
            409,
            "MARKETPLACE_ORDER_RESERVATION_INVALID",
          );
        }

        const inventoryUpdated =
          await tx.branchInventory
            .updateMany({
              where: {
                tenantId,
                branchId:
                  branch.id,
                productId:
                  reservation
                    .productId,
                qtyReserved: {
                  gte: quantity,
                },
              },
              data: {
                qtyReserved: {
                  decrement:
                    quantity,
                },
              },
            });

        if (
          !inventoryUpdated ||
          inventoryUpdated.count !==
            1
        ) {
          throw businessError(
            "Reserved stock could not be released at the fulfilment location.",
            409,
            "MARKETPLACE_ORDER_RESERVED_STOCK_CHANGED",
          );
        }

        await tx
          .marketplaceRequestReservation
          .update({
            where: {
              id:
                reservation.id,
            },
            data: {
              releasedAt:
                failedAt,
            },
          });
      }

      const failed =
        await tx.marketplaceRequest
          .update({
            where: {
              id: requestId,
            },
            data: {
              status:
                MarketplaceRequestStatus
                  .DELIVERY_FAILED,
              deliveryFailedAt:
                failedAt,
              deliveryFailureReason:
                normalizedReason,
              deliveryFailureNote:
                normalizedNote,
              completedAt: null,
              saleId: null,
            },
            include: {
              items: {
                orderBy: {
                  createdAt: "asc",
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
                },
              },
            },
          });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          branchId:
            branch.id,
          entity:
            "MARKETPLACE_ORDER",
          action:
            "MARKETPLACE_DELIVERY_FAILED",
          entityId:
            requestId,
          metadata: {
            event:
              "MARKETPLACE_DELIVERY_FAILED",
            requestId,
            requestNumber:
              failed.requestNumber,
            reason:
              normalizedReason,
            note:
              normalizedNote,
            releasedReservations:
              reservations.length,
          },
        },
      });

      return {
        alreadyFailed: false,
        request: failed,
      };
    },
    {
      isolationLevel:
        Prisma
          .TransactionIsolationLevel
          .Serializable,
      maxWait: 10000,
      timeout: 25000,
    },
  );
}

module.exports = {
  DELIVERY_FAILURE_REASONS,
  failMarketplaceDelivery,
  normalizeDeliveryFailureNote,
  normalizeDeliveryFailureReason,
};
