const prisma =
  require("../../config/database");

const STATUS_LABELS = Object.freeze({
  REQUESTED: "Order sent",
  CONFIRMED: "Confirmed by store",
  REJECTED: "Not accepted",
  CANCELLED: "Cancelled",
  PREPARING: "Being prepared",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERY_FAILED: "Delivery not completed",
  COMPLETED: "Completed",
});

const FAILURE_LABELS = Object.freeze({
  CUSTOMER_UNREACHABLE:
    "The store could not reach the customer.",
  CUSTOMER_REFUSED:
    "The delivery was refused.",
  ADDRESS_NOT_FOUND:
    "The delivery address could not be found.",
  DELIVERY_AREA_UNAVAILABLE:
    "Delivery could not be completed in this area.",
  PRODUCT_DAMAGED:
    "The order could not be handed over safely.",
  OTHER:
    "The delivery could not be completed.",
});

function cleanString(
  value,
  maxLength = 300,
) {
  const normalized =
    String(value || "").trim();

  return normalized
    ? normalized.slice(0, maxLength)
    : null;
}

function normalizeTrackingToken(value) {
  const token =
    cleanString(value, 240);

  if (
    !token ||
    token.length < 20 ||
    !/^[a-zA-Z0-9_-]+$/.test(token)
  ) {
    const error =
      new Error(
        "Enter a valid order tracking link.",
      );

    error.status = 400;
    error.code =
      "MARKETPLACE_TRACKING_TOKEN_INVALID";

    throw error;
  }

  return token;
}

function publicFailureMessage(reason) {
  const key =
    String(reason || "")
      .trim()
      .toUpperCase();

  return (
    FAILURE_LABELS[key] ||
    FAILURE_LABELS.OTHER
  );
}

function phoneHref(value) {
  const phone =
    cleanString(value, 80);

  if (!phone) return null;

  const normalized =
    phone.replace(/[^\d+]/g, "");

  return normalized
    ? `tel:${normalized}`
    : null;
}

function whatsappHref(value) {
  const phone =
    cleanString(value, 80);

  if (!phone) return null;

  const normalized =
    phone.replace(/\D/g, "");

  return normalized
    ? `https://wa.me/${normalized}`
    : null;
}

function statusTimeline(request) {
  const submittedAt =
    request.submittedAt ||
    request.createdAt;

  const steps = [
    {
      key: "REQUESTED",
      label:
        STATUS_LABELS.REQUESTED,
      reached: Boolean(submittedAt),
      at: submittedAt || null,
    },
  ];

  if (
    request.status === "REJECTED"
  ) {
    steps.push({
      key: "REJECTED",
      label:
        STATUS_LABELS.REJECTED,
      reached: true,
      at:
        request.rejectedAt ||
        request.updatedAt,
    });

    return steps;
  }

  if (
    request.status === "CANCELLED"
  ) {
    steps.push({
      key: "CANCELLED",
      label:
        STATUS_LABELS.CANCELLED,
      reached: true,
      at:
        request.cancelledAt ||
        request.updatedAt,
    });

    return steps;
  }

  const confirmedStatuses =
    new Set([
      "CONFIRMED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "OUT_FOR_DELIVERY",
      "DELIVERY_FAILED",
      "COMPLETED",
    ]);

  steps.push({
    key: "CONFIRMED",
    label:
      STATUS_LABELS.CONFIRMED,
    reached:
      confirmedStatuses.has(
        request.status,
      ),
    at: request.confirmedAt || null,
  });

  const preparingStatuses =
    new Set([
      "PREPARING",
      "READY_FOR_PICKUP",
      "OUT_FOR_DELIVERY",
      "DELIVERY_FAILED",
      "COMPLETED",
    ]);

  steps.push({
    key: "PREPARING",
    label:
      STATUS_LABELS.PREPARING,
    reached:
      preparingStatuses.has(
        request.status,
      ),
    at:
      preparingStatuses.has(
        request.status,
      )
        ? request.updatedAt
        : null,
  });

  if (
    request.fulfilmentMethod ===
    "PICKUP"
  ) {
    steps.push({
      key: "READY_FOR_PICKUP",
      label:
        STATUS_LABELS
          .READY_FOR_PICKUP,
      reached:
        [
          "READY_FOR_PICKUP",
          "COMPLETED",
        ].includes(
          request.status,
        ),
      at:
        request.status ===
          "READY_FOR_PICKUP"
          ? request.updatedAt
          : null,
    });
  } else {
    steps.push({
      key: "OUT_FOR_DELIVERY",
      label:
        STATUS_LABELS
          .OUT_FOR_DELIVERY,
      reached:
        [
          "OUT_FOR_DELIVERY",
          "DELIVERY_FAILED",
          "COMPLETED",
        ].includes(
          request.status,
        ),
      at:
        request.status ===
          "OUT_FOR_DELIVERY"
          ? request.updatedAt
          : null,
    });
  }

  if (
    request.status ===
    "DELIVERY_FAILED"
  ) {
    steps.push({
      key: "DELIVERY_FAILED",
      label:
        STATUS_LABELS
          .DELIVERY_FAILED,
      reached: true,
      at:
        request.deliveryFailedAt ||
        request.updatedAt,
    });
  } else {
    steps.push({
      key: "COMPLETED",
      label:
        STATUS_LABELS.COMPLETED,
      reached:
        request.status ===
        "COMPLETED",
      at:
        request.completedAt ||
        null,
    });
  }

  return steps;
}

function serializeTrackedOrder(
  request,
) {
  const sellerPhone =
    cleanString(
      request.sellerPhoneSnapshot,
      80,
    );

  return {
    orderNumber:
      request.requestNumber,
    status:
      request.status,
    statusLabel:
      STATUS_LABELS[
        request.status
      ] || "Order update",
    fulfilmentMethod:
      request.fulfilmentMethod,
    deliveryCoverage:
      request.deliveryCoverage,
    paymentMethod:
      request.paymentMethod,
    currency:
      request.currency,
    subtotal:
      Math.max(
        0,
        Number(
          request.subtotal || 0,
        ),
      ),
    deliveryFee:
      Math.max(
        0,
        Number(
          request.deliveryFee || 0,
        ),
      ),
    total:
      Math.max(
        0,
        Number(
          request.total || 0,
        ),
      ),
    submittedAt:
      request.submittedAt,
    confirmedAt:
      request.confirmedAt,
    completedAt:
      request.completedAt,
    deliveryFailedAt:
      request.deliveryFailedAt,
    deliveryFailure:
      request.status ===
      "DELIVERY_FAILED"
        ? {
            reason:
              request
                .deliveryFailureReason,
            message:
              publicFailureMessage(
                request
                  .deliveryFailureReason,
              ),
          }
        : null,
    deliveryLocation:
      request.fulfilmentMethod ===
      "DELIVERY"
        ? {
            district:
              request
                .deliveryDistrict ||
              null,
            sector:
              request
                .deliverySector ||
              null,
          }
        : null,
    seller: {
      name:
        request
          .sellerNameSnapshot,
      phone:
        sellerPhone,
      phoneHref:
        phoneHref(sellerPhone),
      whatsappHref:
        whatsappHref(
          sellerPhone,
        ),
    },
    pickupLocation:
      request.fulfilmentMethod ===
        "PICKUP" &&
      request.fulfilmentBranch
        ? {
            name:
              request
                .fulfilmentBranch
                .name,
            phone:
              request
                .fulfilmentBranch
                .phone ||
              sellerPhone,
            district:
              request
                .fulfilmentBranch
                .district ||
              null,
            sector:
              request
                .fulfilmentBranch
                .sector ||
              null,
            address:
              request
                .fulfilmentBranch
                .address ||
              null,
          }
        : null,
    items:
      request.items.map(
        (item) => ({
          id: item.id,
          title:
            item
              .productTitleSnapshot,
          category:
            item
              .productCategorySnapshot ||
            null,
          imageUrl:
            item
              .productImageSnapshot ||
            null,
          productUrl:
            item
              .productUrlSnapshot ||
            null,
          quantity:
            Math.max(
              1,
              Number(
                item.quantity || 1,
              ),
            ),
          unitPrice:
            Math.max(
              0,
              Number(
                item.unitPrice || 0,
              ),
            ),
          lineTotal:
            Math.max(
              0,
              Number(
                item.lineTotal || 0,
              ),
            ),
        }),
      ),
    sale:
      request.status ===
        "COMPLETED" &&
      request.sale
        ? {
            receiptNumber:
              request.sale
                .receiptNumber ||
              null,
          }
        : null,
    timeline:
      statusTimeline(request),
  };
}

async function getTrackedMarketplaceOrder(
  tokenValue,
) {
  const token =
    normalizeTrackingToken(
      tokenValue,
    );

  const request =
    await prisma
      .marketplaceRequest
      .findUnique({
        where: {
          trackingToken: token,
        },
        include: {
          items: {
            orderBy: {
              createdAt: "asc",
            },
          },
          fulfilmentBranch: {
            select: {
              name: true,
              phone: true,
              district: true,
              sector: true,
              address: true,
            },
          },
          sale: {
            select: {
              receiptNumber: true,
            },
          },
        },
      });

  return request
    ? serializeTrackedOrder(
        request,
      )
    : null;
}

module.exports = {
  getTrackedMarketplaceOrder,
};

module.exports.__private = {
  cleanString,
  normalizeTrackingToken,
  publicFailureMessage,
  serializeTrackedOrder,
  statusTimeline,
};
