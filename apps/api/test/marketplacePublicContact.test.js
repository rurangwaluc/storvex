const test = require("node:test");
const assert = require("node:assert/strict");

const {
  serializePublicSeller,
} = require(
  "../src/modules/marketplace/marketplace.public.service",
);

test(
  "public seller exposes contact availability without exposing email",
  () => {
    const result = serializePublicSeller(
      {
        publicSlug: "ruraxis",
        displayName: "RURAXIS LTD",
        temporarilyClosed: false,
        pickupEnabled: true,
        deliveryEnabled: true,
        defaultDeliveryFee: 2000,
        deliveryAreas: [],
        paymentMethods: [],
      },
      {
        name: "RURAXIS LTD",
        phone: "0785587833",
        email: "owner@example.com",
      },
    );

    assert.equal(
      result.whatsappAvailable,
      true,
    );

    assert.equal(
      result.emailAvailable,
      true,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "email",
      ),
      false,
    );
  },
);
