"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  normalizeTrackingToken,
  publicFailureMessage,
  serializeTrackedOrder,
  statusTimeline,
} = require(
  "../src/modules/marketplace/marketplace.tracking.service"
).__private;

test(
  "accepts a valid Marketplace tracking token",
  () => {
    assert.equal(
      normalizeTrackingToken(
        "abcDEF_1234567890-token",
      ),
      "abcDEF_1234567890-token",
    );
  },
);

test(
  "rejects an invalid Marketplace tracking token",
  () => {
    assert.throws(
      () =>
        normalizeTrackingToken(
          "bad token",
        ),
      {
        code:
          "MARKETPLACE_TRACKING_TOKEN_INVALID",
      },
    );
  },
);

test(
  "uses a safe public delivery failure message",
  () => {
    assert.equal(
      publicFailureMessage(
        "CUSTOMER_UNREACHABLE",
      ),
      "The store could not reach the customer.",
    );

    assert.equal(
      publicFailureMessage(
        "UNKNOWN_INTERNAL_REASON",
      ),
      "The delivery could not be completed.",
    );
  },
);

test(
  "public tracked order excludes private customer and internal data",
  () => {
    const order =
      serializeTrackedOrder({
        requestNumber:
          "SVX-LIG-20260720-001",
        trackingToken:
          "should-not-be-returned",
        tenantId:
          "private-tenant",
        customerName:
          "Private Customer",
        customerPhone:
          "250700000000",
        customerEmail:
          "private@example.com",
        customerNote:
          "Internal customer note",
        deliveryAddress:
          "Private street address",
        status:
          "OUT_FOR_DELIVERY",
        fulfilmentMethod:
          "DELIVERY",
        deliveryCoverage:
          "KIGALI",
        paymentMethod:
          "CASH_ON_DELIVERY",
        currency:
          "RWF",
        subtotal: 4000,
        deliveryFee: 1000,
        total: 5000,
        sellerNameSnapshot:
          "Lighting Test",
        sellerPhoneSnapshot:
          "+250788000000",
        sellerEmailSnapshot:
          "private-store@example.com",
        submittedAt:
          new Date(
            "2026-07-20T10:00:00Z",
          ),
        confirmedAt:
          new Date(
            "2026-07-20T10:15:00Z",
          ),
        updatedAt:
          new Date(
            "2026-07-20T11:00:00Z",
          ),
        deliveryDistrict:
          "Gasabo",
        deliverySector:
          "Remera",
        deliveryFailureNote:
          "Private staff note",
        items: [
          {
            id: "item-1",
            productTitleSnapshot:
              "LED Bulb",
            productCategorySnapshot:
              "Lighting",
            productImageSnapshot:
              null,
            productUrlSnapshot:
              "/marketplace/store/bulb",
            quantity: 1,
            unitPrice: 4000,
            lineTotal: 4000,
          },
        ],
        fulfilmentBranch: null,
        sale: null,
      });

    assert.equal(
      order.orderNumber,
      "SVX-LIG-20260720-001",
    );

    assert.equal(
      order.deliveryLocation
        .district,
      "Gasabo",
    );

    assert.equal(
      order.deliveryLocation
        .sector,
      "Remera",
    );

    assert.equal(
      Object.hasOwn(
        order,
        "customerName",
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        order,
        "trackingToken",
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        order,
        "deliveryAddress",
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        order,
        "deliveryFailureNote",
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        order.seller,
        "email",
      ),
      false,
    );
  },
);

test(
  "builds a pickup tracking timeline",
  () => {
    const timeline =
      statusTimeline({
        status:
          "READY_FOR_PICKUP",
        fulfilmentMethod:
          "PICKUP",
        submittedAt:
          new Date(),
        confirmedAt:
          new Date(),
        updatedAt:
          new Date(),
      });

    assert.equal(
      timeline.some(
        (step) =>
          step.key ===
            "READY_FOR_PICKUP" &&
          step.reached === true,
      ),
      true,
    );

    assert.equal(
      timeline.some(
        (step) =>
          step.key ===
          "OUT_FOR_DELIVERY",
      ),
      false,
    );
  },
);
