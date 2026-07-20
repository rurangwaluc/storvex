"use strict";

const prisma = require("../../config/database");
const {
  MarketplaceRequestStatus,
  Prisma,
} = require("@prisma/client");
const {
  recordMoneyAccountMovement,
} = require("../money/moneyAccount.service");
const {
  reserveSaleDocumentNumbersTx,
} = require("../documents/documentNumber.service");

const PAYMENT_METHODS = new Set([
  "CASH",
  "MOMO",
  "BANK",
  "OTHER",
]);

function cleanString(value) {
  const text = String(value || "").trim();
  return text || null;
}

function normalizePaymentMethod(value) {
  const method = String(value || "")
    .trim()
    .toUpperCase();

  if (method === "CARD") {
    return "OTHER";
  }

  return PAYMENT_METHODS.has(method)
    ? method
    : null;
}

function roundMoney(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(
    (number + Number.EPSILON) * 100,
  ) / 100;
}

function businessError(
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

function assertBranchAccess(req, branchId) {
  const canViewAllBranches = Boolean(
    req.user?.canViewAllBranches,
  );

  const allowedBranchIds = Array.isArray(
    req.user?.allowedBranchIds,
  )
    ? req.user.allowedBranchIds.filter(Boolean)
    : [];

  if (
    !canViewAllBranches &&
    allowedBranchIds.length > 0 &&
    !allowedBranchIds.includes(branchId)
  ) {
    throw businessError(
      "You do not have access to complete orders from this location.",
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
  const rows = await tx.$queryRaw(
    Prisma.sql`
      SELECT
        "id",
        "status",
        "saleId",
        "fulfilmentMethod",
        "fulfilmentBranchId"
      FROM "MarketplaceRequest"
      WHERE
        "id" = ${requestId}
        AND "tenantId" = ${tenantId}
      FOR UPDATE
    `,
  );

  return rows[0] || null;
}

async function openCashSessionId(
  tx,
  tenantId,
  branchId,
) {
  const rows = await tx.$queryRaw`
    SELECT id
    FROM public.cash_sessions
    WHERE tenant_id::text = ${String(tenantId)}::text
      AND branch_id::text = ${String(branchId)}::text
      AND closed_at IS NULL
    ORDER BY opened_at DESC
    LIMIT 1
  `;

  return rows?.[0]?.id || null;
}

async function cashDrawerBlocksSales(
  tx,
  tenantId,
) {
  const rows = await tx.$queryRaw`
    SELECT cash_drawer_block_cash_sales
    FROM public."Tenant"
    WHERE id::text = ${String(tenantId)}::text
    LIMIT 1
  `;

  const configured =
    rows?.[0]?.cash_drawer_block_cash_sales;

  return configured == null
    ? true
    : Boolean(configured);
}

async function insertMarketplaceCashMovement(
  tx,
  {
    tenantId,
    branchId,
    userId,
    sessionId,
    amount,
    receiptNumber,
    requestNumber,
    fulfilmentLabel = "order",
  },
) {
  const roundedAmount = Math.round(
    Number(amount || 0),
  );

  if (roundedAmount <= 0) {
    return null;
  }

  const rows = await tx.$queryRaw`
    INSERT INTO public.cash_movements (
      id,
      tenant_id,
      branch_id,
      session_id,
      type,
      reason,
      amount,
      note,
      created_by,
      created_at
    )
    VALUES (
      gen_random_uuid()::text,
      ${String(tenantId)},
      ${String(branchId)},
      ${String(sessionId)},
      'IN',
      'OTHER',
      ${BigInt(roundedAmount)},
      ${`Marketplace ${fulfilmentLabel} ${requestNumber} — ${receiptNumber}`},
      ${String(userId)},
      NOW()
    )
    RETURNING id
  `;

  return rows?.[0] || null;
}

async function resolveMarketplaceCustomer(
  tx,
  order,
) {
  const phone = cleanString(
    order.customerPhone,
  );

  if (!phone) {
    return null;
  }

  const name =
    cleanString(order.customerName) ||
    "Marketplace customer";

  const email = cleanString(
    order.customerEmail,
  );

  const address = cleanString(
    order.deliveryAddress,
  );

  const customer =
    await tx.customer.upsert({
      where: {
        tenantId_phone: {
          tenantId: order.tenantId,
          phone,
        },
      },
      create: {
        tenantId: order.tenantId,
        name,
        phone,
        email,
        address,
        notes:
          `Created from Marketplace order ${order.requestNumber}`,
        isActive: true,
      },
      update: {
        name,
        ...(email
          ? {
              email,
            }
          : {}),
        ...(address
          ? {
              address,
            }
          : {}),
        isActive: true,
      },
      select: {
        id: true,
      },
    });

  return customer.id;
}

async function marketplaceTaxSnapshot(
  tx,
  tenantId,
  subtotal,
) {
  const settings =
    await tx.tenantDocumentSettings.findUnique({
      where: {
        tenantId,
      },
      select: {
        taxMode: true,
        taxDisplayMode: true,
        taxName: true,
        taxRateBps: true,
        pricesIncludeTax: true,
        showTaxOnCustomerDocuments: true,
      },
    });

  const safeSubtotal =
    roundMoney(subtotal);

  const taxMode = String(
    settings?.taxMode || "NONE",
  )
    .trim()
    .toUpperCase();

  const taxRateBps = Math.max(
    0,
    Math.min(
      10000,
      Math.round(
        Number(
          settings?.taxRateBps || 0,
        ),
      ),
    ),
  );

  const hasTax =
    taxMode !== "NONE" &&
    taxRateBps > 0;

  const taxAmount = hasTax
    ? roundMoney(
        (safeSubtotal * taxRateBps) /
          (10000 + taxRateBps),
      )
    : 0;

  const taxableAmount = hasTax
    ? Math.max(
        0,
        safeSubtotal - taxAmount,
      )
    : safeSubtotal;

  const taxDisplayMode = String(
    settings?.taxDisplayMode ||
      "HIDDEN",
  )
    .trim()
    .toUpperCase();

  return {
    subtotalAmount: safeSubtotal,
    taxableAmount,
    taxName: hasTax
      ? cleanString(settings?.taxName)
      : null,
    taxMode,
    taxDisplayMode,
    taxRateBps: hasTax
      ? taxRateBps
      : 0,
    taxAmount,
    pricesIncludeTax: hasTax,
    showTaxOnCustomerDocuments:
      Boolean(
        settings
          ?.showTaxOnCustomerDocuments,
      ) &&
      taxDisplayMode ===
        "CUSTOMER_FACING" &&
      hasTax,
    total: safeSubtotal,
  };
}

function groupReservations(
  reservations,
) {
  const grouped = new Map();

  for (const reservation of reservations) {
    const productId = String(
      reservation.productId,
    );

    const quantity = Number(
      reservation.quantity || 0,
    );

    grouped.set(
      productId,
      (grouped.get(productId) || 0) +
        quantity,
    );
  }

  return grouped;
}

function assertReservationMatchesOrder(
  order,
  reservations,
) {
  if (
    !Array.isArray(reservations) ||
    reservations.length === 0
  ) {
    throw businessError(
      "Reserved stock was not found for this order.",
      409,
      "MARKETPLACE_ORDER_RESERVATIONS_NOT_FOUND",
    );
  }

  const grouped =
    groupReservations(reservations);

  for (const item of order.items || []) {
    const reserved =
      grouped.get(String(item.productId)) ||
      0;

    if (
      reserved !==
      Number(item.quantity || 0)
    ) {
      throw businessError(
        `Reserved quantity does not match the order for ${item.productTitleSnapshot}.`,
        409,
        "MARKETPLACE_ORDER_RESERVATION_MISMATCH",
      );
    }
  }
}

async function completeMarketplaceOrder({
  req,
  tenantId,
  requestId,
  paymentMethod,
  paymentReference,
  expectedFulfilmentMethod,
  expectedStatus,
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

  const normalizedMethod =
    normalizePaymentMethod(paymentMethod);

  if (!normalizedMethod) {
    throw businessError(
      "Choose Cash, MoMo, Bank, or Other money.",
      400,
      "INVALID_PAYMENT_METHOD",
    );
  }

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
        locked.saleId &&
        locked.status ===
          MarketplaceRequestStatus.COMPLETED
      ) {
        const existing =
          await tx.marketplaceRequest.findFirst({
            where: {
              id: requestId,
              tenantId,
            },
            include: {
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
            },
          });

        return {
          alreadyCompleted: true,
          request: existing,
          sale: existing?.sale || null,
        };
      }

      if (
        locked.status !== expectedStatus
      ) {
        throw businessError(
          expectedFulfilmentMethod === "DELIVERY"
            ? "Only an order that is out for delivery can be completed here."
            : "Only an order that is ready for pickup can be completed here.",
          409,
          expectedFulfilmentMethod === "DELIVERY"
            ? "MARKETPLACE_ORDER_NOT_OUT_FOR_DELIVERY"
            : "MARKETPLACE_ORDER_NOT_READY_FOR_PICKUP",
        );
      }

      if (
        locked.fulfilmentMethod !==
        expectedFulfilmentMethod
      ) {
        throw businessError(
          expectedFulfilmentMethod === "DELIVERY"
            ? "This action is only for delivery orders."
            : "This action is only for pickup orders.",
          409,
          expectedFulfilmentMethod === "DELIVERY"
            ? "MARKETPLACE_ORDER_NOT_DELIVERY"
            : "MARKETPLACE_ORDER_NOT_PICKUP",
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
            id: locked.fulfilmentBranchId,
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

      const order =
        await tx.marketplaceRequest.findFirst({
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
          },
        });

      if (!order) {
        throw businessError(
          "Order was not found.",
          404,
          "MARKETPLACE_ORDER_NOT_FOUND",
        );
      }

      const reservations =
        await tx
          .marketplaceRequestReservation
          .findMany({
            where: {
              tenantId,
              requestId,
              branchId:
                locked.fulfilmentBranchId,
              releasedAt: null,
              completedAt: null,
            },
            orderBy: {
              createdAt: "asc",
            },
          });

      assertReservationMatchesOrder(
        order,
        reservations,
      );

      const itemSubtotal = roundMoney(
        (order.items || []).reduce(
          (sum, item) =>
            sum +
            Number(item.unitPrice || 0) *
              Number(item.quantity || 0),
          0,
        ),
      );

      if (
        Math.abs(
          itemSubtotal -
            Number(order.subtotal || 0),
        ) > 0.01
      ) {
        throw businessError(
          "The stored order prices do not match the order subtotal.",
          409,
          "MARKETPLACE_ORDER_TOTAL_MISMATCH",
        );
      }

      const deliveryFee =
        roundMoney(
          order.deliveryFee || 0,
        );

      if (
        expectedFulfilmentMethod === "PICKUP" &&
        deliveryFee !== 0
      ) {
        throw businessError(
          "Pickup orders cannot include a delivery charge.",
          409,
          "MARKETPLACE_PICKUP_DELIVERY_FEE_FOUND",
        );
      }

      if (
        deliveryFee < 0
      ) {
        throw businessError(
          "Delivery cost cannot be negative.",
          409,
          "MARKETPLACE_DELIVERY_FEE_INVALID",
        );
      }

      const expectedTotal =
        roundMoney(
          itemSubtotal + deliveryFee,
        );

      if (
        Math.abs(
          expectedTotal -
            Number(order.total || 0),
        ) > 0.01
      ) {
        throw businessError(
          "The order total does not match the products and delivery cost.",
          409,
          "MARKETPLACE_ORDER_TOTAL_MISMATCH",
        );
      }

      let openSessionId = null;

      if (normalizedMethod === "CASH") {
        openSessionId =
          await openCashSessionId(
            tx,
            tenantId,
            branch.id,
          );

        const mustHaveDrawer =
          await cashDrawerBlocksSales(
            tx,
            tenantId,
          );

        if (
          mustHaveDrawer &&
          !openSessionId
        ) {
          throw businessError(
            "The cash drawer is closed for this location. Open it before completing this cash order.",
            409,
            "CASH_DRAWER_CLOSED",
          );
        }
      }

      const customerId =
        await resolveMarketplaceCustomer(
          tx,
          order,
        );

      const createdAt = new Date();

      const documentNumbers =
        await reserveSaleDocumentNumbersTx(
          tx,
          {
            tenantId,
            createdAt,
          },
        );

      const taxSnapshot =
        await marketplaceTaxSnapshot(
          tx,
          tenantId,
          itemSubtotal,
        );

      const saleTotal =
        roundMoney(
          taxSnapshot.total +
            deliveryFee,
        );

      const sale = await tx.sale.create({
        data: {
          tenantId,
          branchId: branch.id,
          cashierId: userId,
          customerId,
          total: saleTotal,
          subtotalAmount:
            taxSnapshot.subtotalAmount,
          deliveryFee,
          taxableAmount:
            taxSnapshot.taxableAmount,
          taxName: taxSnapshot.taxName,
          taxMode: taxSnapshot.taxMode,
          taxDisplayMode:
            taxSnapshot.taxDisplayMode,
          taxRateBps:
            taxSnapshot.taxRateBps,
          taxAmount:
            taxSnapshot.taxAmount,
          pricesIncludeTax:
            taxSnapshot.pricesIncludeTax,
          showTaxOnCustomerDocuments:
            taxSnapshot
              .showTaxOnCustomerDocuments,
          amountPaid: saleTotal,
          balanceDue: 0,
          saleType: "CASH",
          status: "PAID",
          isDraft: false,
          draftSource: "MARKETPLACE",
          finalizedAt: createdAt,
          receiptNumber:
            documentNumbers.receiptNumber,
          invoiceNumber:
            documentNumbers.invoiceNumber,
          createdAt,
        },
        select: {
          id: true,
          tenantId: true,
          branchId: true,
          customerId: true,
          total: true,
          amountPaid: true,
          balanceDue: true,
          saleType: true,
          status: true,
          receiptNumber: true,
          invoiceNumber: true,
          createdAt: true,
        },
      });

      await tx.saleItem.createMany({
        data: order.items.map(
          (item) => ({
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.unitPrice,
          }),
        ),
      });

      const paymentNote =
        `Marketplace order ${order.requestNumber} payment`;

      const payment =
        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            tenantId,
            branchId: branch.id,
            receivedById: userId,
            amount: saleTotal,
            method: normalizedMethod,
            note: paymentNote,
          },
          select: {
            id: true,
            amount: true,
            method: true,
            note: true,
            createdAt: true,
          },
        });

      let cashMovement = null;
      let moneyMovement = null;

      if (normalizedMethod === "CASH") {
        if (openSessionId) {
          cashMovement =
            await insertMarketplaceCashMovement(
              tx,
              {
                tenantId,
                branchId: branch.id,
                userId,
                sessionId: openSessionId,
                amount: saleTotal,
                receiptNumber:
                  sale.receiptNumber ||
                  sale.id,
                requestNumber:
                  order.requestNumber,
                fulfilmentLabel:
                  expectedFulfilmentMethod ===
                  "DELIVERY"
                    ? "delivery"
                    : "pickup",
              },
            );
        }
      } else {
        moneyMovement =
          await recordMoneyAccountMovement(
            tx,
            {
              tenantId,
              branchId: branch.id,
              method: normalizedMethod,
              direction: "IN",
              reason: "OTHER",
              amount: saleTotal,
              sourceType: "SalePayment",
              sourceId: payment.id,
              note:
                `Marketplace sale payment ${sale.receiptNumber || sale.id}`,
              createdById: userId,
            },
          );
      }

      for (const reservation of reservations) {
        const quantity = Number(
          reservation.quantity || 0,
        );

        const inventoryUpdated =
          await tx.branchInventory.updateMany({
            where: {
              tenantId,
              branchId: branch.id,
              productId:
                reservation.productId,
              qtyOnHand: {
                gte: quantity,
              },
              qtyReserved: {
                gte: quantity,
              },
            },
            data: {
              qtyOnHand: {
                decrement: quantity,
              },
              qtyReserved: {
                decrement: quantity,
              },
            },
          });

        if (
          !inventoryUpdated ||
          inventoryUpdated.count !== 1
        ) {
          throw businessError(
            "Reserved stock is no longer available at the fulfilment location.",
            409,
            "MARKETPLACE_ORDER_STOCK_CHANGED",
          );
        }

        const productUpdated =
          await tx.product.updateMany({
            where: {
              id: reservation.productId,
              tenantId,
              isActive: true,
              stockQty: {
                gte: quantity,
              },
            },
            data: {
              stockQty: {
                decrement: quantity,
              },
            },
          });

        if (
          !productUpdated ||
          productUpdated.count !== 1
        ) {
          throw businessError(
            "The product stock total is no longer sufficient.",
            409,
            "MARKETPLACE_ORDER_PRODUCT_STOCK_CHANGED",
          );
        }

        await tx
          .marketplaceRequestReservation
          .update({
            where: {
              id: reservation.id,
            },
            data: {
              completedAt: createdAt,
            },
          });
      }

      const completed =
        await tx.marketplaceRequest.update({
          where: {
            id: requestId,
          },
          data: {
            status:
              MarketplaceRequestStatus
                .COMPLETED,
            completedAt: createdAt,
            saleId: sale.id,
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
          },
        });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          branchId: branch.id,
          entity: "SALE",
          action: "ADD_PAYMENT",
          entityId: sale.id,
          metadata: {
            event:
              expectedFulfilmentMethod ===
              "DELIVERY"
                ? "MARKETPLACE_DELIVERY_COMPLETED"
                : "MARKETPLACE_PICKUP_COMPLETED",
            requestId: order.id,
            requestNumber:
              order.requestNumber,
            saleId: sale.id,
            receiptNumber:
              sale.receiptNumber,
            paymentMethod:
              normalizedMethod,
            total: sale.total,
          },
        },
      });

      return {
        alreadyCompleted: false,
        request: completed,
        sale,
        payment,
        cashMovement,
        moneyMovement:
          moneyMovement?.movement ||
          null,
      };
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel
          .Serializable,
      maxWait: 10000,
      timeout: 25000,
    },
  );
}

async function completeMarketplacePickup(
  options,
) {
  return completeMarketplaceOrder({
    ...options,
    expectedFulfilmentMethod:
      "PICKUP",
    expectedStatus:
      MarketplaceRequestStatus
        .READY_FOR_PICKUP,
  });
}

async function completeMarketplaceDelivery(
  options,
) {
  return completeMarketplaceOrder({
    ...options,
    expectedFulfilmentMethod:
      "DELIVERY",
    expectedStatus:
      MarketplaceRequestStatus
        .OUT_FOR_DELIVERY,
  });
}

module.exports = {
  completeMarketplaceDelivery,
  completeMarketplacePickup,
  normalizePaymentMethod,
};
