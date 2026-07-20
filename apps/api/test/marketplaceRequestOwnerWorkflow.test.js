const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MarketplaceRequestStatus,
} = require("@prisma/client");

const {
  __private,
} = require(
  "../src/modules/store/marketplaceRequests.controller",
);

test(
  "allocates a Marketplace order request from available branch stock",
  () => {
    const result =
      __private.buildInventoryAllocations({
        requestedQuantity: 4,
        inventories: [
          {
            id: "inventory-main",
            branchId: "main",
            productId: "product-1",
            qtyOnHand: 5,
            qtyReserved: 2,
          },
          {
            id: "inventory-second",
            branchId: "second",
            productId: "product-1",
            qtyOnHand: 3,
            qtyReserved: 1,
          },
        ],
      });

    assert.equal(
      result.complete,
      true,
    );

    assert.equal(
      result.available,
      4,
    );

    assert.equal(
      result.missing,
      0,
    );

    assert.deepEqual(
      result.allocations,
      [
        {
          inventoryId:
            "inventory-main",
          branchId: "main",
          productId:
            "product-1",
          quantity: 3,
        },
        {
          inventoryId:
            "inventory-second",
          branchId: "second",
          productId:
            "product-1",
          quantity: 1,
        },
      ],
    );
  },
);

test(
  "reports insufficient available stock",
  () => {
    const result =
      __private.buildInventoryAllocations({
        requestedQuantity: 5,
        inventories: [
          {
            id: "inventory-main",
            branchId: "main",
            productId: "product-1",
            qtyOnHand: 4,
            qtyReserved: 2,
          },
        ],
      });

    assert.equal(
      result.complete,
      false,
    );

    assert.equal(
      result.available,
      2,
    );

    assert.equal(
      result.missing,
      3,
    );
  },
);

test(
  "requires an outside Kigali delivery cost",
  () => {
    assert.throws(
      () =>
        __private.resolveDeliveryFee(
          {
            fulfilmentMethod:
              "DELIVERY",
            deliveryCoverage:
              "OUTSIDE_KIGALI",
            deliveryFee: 0,
          },
          {},
        ),
      (error) =>
        error.code ===
        "MARKETPLACE_DELIVERY_FEE_REQUIRED",
    );
  },
);

test(
  "accepts a valid outside Kigali delivery cost",
  () => {
    assert.equal(
      __private.resolveDeliveryFee(
        {
          fulfilmentMethod:
            "DELIVERY",
          deliveryCoverage:
            "OUTSIDE_KIGALI",
          deliveryFee: 0,
        },
        {
          deliveryFee: 7500,
        },
      ),
      7500,
    );
  },
);

test(
  "blocks confirmation after a request was already processed",
  () => {
    assert.throws(
      () =>
        __private.assertRequestedStatus({
          status:
            MarketplaceRequestStatus.CONFIRMED,
        }),
      (error) =>
        error.code ===
        "MARKETPLACE_REQUEST_ALREADY_PROCESSED",
    );
  },
);

test(
  "accepts a new order request for processing",
  () => {
    assert.doesNotThrow(() =>
      __private.assertRequestedStatus({
        status:
          MarketplaceRequestStatus.REQUESTED,
      }),
    );
  },
);

test(
  "allows a confirmed request to start preparing",
  () => {
    assert.doesNotThrow(() =>
      __private.assertRequestStatus(
        {
          status:
            MarketplaceRequestStatus.CONFIRMED,
        },
        [
          MarketplaceRequestStatus.CONFIRMED,
        ],
        "moved to preparing",
      ),
    );
  },
);

test(
  "blocks preparing from an invalid request status",
  () => {
    assert.throws(
      () =>
        __private.assertRequestStatus(
          {
            status:
              MarketplaceRequestStatus.REQUESTED,
          },
          [
            MarketplaceRequestStatus.CONFIRMED,
          ],
          "moved to preparing",
        ),
      (error) =>
        error.code ===
        "MARKETPLACE_REQUEST_STATUS_TRANSITION_INVALID",
    );
  },
);

test(
  "requires active reservations for fulfilment workflow",
  () => {
    assert.throws(
      () =>
        __private.assertActiveReservations(
          [],
        ),
      (error) =>
        error.code ===
        "MARKETPLACE_REQUEST_RESERVATIONS_NOT_FOUND",
    );
  },
);
