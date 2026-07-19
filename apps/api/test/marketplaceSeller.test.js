const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildMarketplaceReadiness,
} = require("../src/modules/store/marketplaceSeller.service");

function completeInput(overrides = {}) {
  return {
    tenant: {
      name: "Ruraxis Store",
      phone: "0788000000",
    },
    profile: {
      publicSlug: "ruraxis-store",
      displayName: "Ruraxis Store",
      description: "Trusted electronics and accessories.",
      customerPhone: "0788000000",
      whatsappPhone: "0788000000",
      pickupEnabled: true,
      deliveryEnabled: false,
      deliveryAreas: [],
      paymentMethods: [
        "CASH_ON_DELIVERY",
        "MOMO_ON_DELIVERY",
      ],
    },
    publishedProductCount: 2,
    availablePublishedProductCount: 2,
    approvedImageProductCount: 2,
    ...overrides,
  };
}

test("marks a complete seller profile ready", () => {
  const readiness = buildMarketplaceReadiness(
    completeInput(),
  );

  assert.equal(readiness.ready, true);
  assert.equal(readiness.readinessPercent, 100);
  assert.deepEqual(
    readiness.summary.missingRequiredKeys,
    [],
  );
});

test("requires a public store identity", () => {
  const readiness = buildMarketplaceReadiness(
    completeInput({
      profile: {
        ...completeInput().profile,
        description: null,
      },
    }),
  );

  assert.equal(readiness.ready, false);
  assert.equal(
    readiness.summary.missingRequiredKeys.includes(
      "public_identity",
    ),
    true,
  );
});

test("accepts enabled delivery without configured areas", () => {
  const readiness = buildMarketplaceReadiness(
    completeInput({
      profile: {
        ...completeInput().profile,
        pickupEnabled: false,
        deliveryEnabled: true,
        deliveryAreas: [],
      },
    }),
  );

  assert.equal(readiness.ready, true);
  assert.equal(
    readiness.summary.missingRequiredKeys.includes(
      "fulfilment",
    ),
    false,
  );
});

test("requires published stock and approved images", () => {
  const readiness = buildMarketplaceReadiness(
    completeInput({
      publishedProductCount: 1,
      availablePublishedProductCount: 0,
      approvedImageProductCount: 0,
    }),
  );

  assert.equal(readiness.ready, false);
  assert.equal(
    readiness.summary.missingRequiredKeys.includes(
      "available_stock",
    ),
    true,
  );
  assert.equal(
    readiness.summary.missingRequiredKeys.includes(
      "approved_images",
    ),
    true,
  );
});

test("does not require delivery when pickup is enabled", () => {
  const readiness = buildMarketplaceReadiness(
    completeInput({
      profile: {
        ...completeInput().profile,
        pickupEnabled: true,
        deliveryEnabled: false,
        deliveryAreas: [],
      },
    }),
  );

  assert.equal(readiness.ready, true);
});
