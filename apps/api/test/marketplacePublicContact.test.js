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
        customerPhone: "0788000000",
        whatsappPhone: "0788111111",
      },
      {
        name: "RURAXIS LTD",
        phone: "0785587833",
        email: "owner@example.com",
        countryCode: "RW",
        currencyCode: "RWF",
        timezone: "Africa/Kigali",
        district: "Gasabo",
        sector: "Kimironko",
      },
    );

    assert.equal(
      result.whatsappAvailable,
      true,
    );

    assert.equal(
      result.customerPhone,
      "0788000000",
    );

    assert.equal(
      result.whatsappPhone,
      "0788111111",
    );

    assert.equal(
      Object.hasOwn(result, "emailAvailable"),
      false,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        "email",
      ),
      false,
    );

    assert.deepEqual(
      result.market,
      {
        countryCode: "RW",
        countryName: "Rwanda",
        currencyCode: "RWF",
        timezone: "Africa/Kigali",
        locale: "en-RW",
        locationSchema: "DISTRICT_SECTOR",
      },
    );

    assert.deepEqual(
      result.location,
      {
        countryCode: "RW",
        area: "Gasabo",
        locality: "Kimironko",
        district: "Gasabo",
        sector: "Kimironko",
      },
    );

    assert.deepEqual(
      result.deliveryPolicy,
      {
        defaultFee: 2000,
        areas: [],
      },
    );

    assert.equal(
      Object.hasOwn(result, "deliveryAreas"),
      false,
    );
  },
);
