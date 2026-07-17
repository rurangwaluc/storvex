"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  __private: {
    activeMarketplacePricing,
  },
} = require(
  "../src/modules/marketplace/marketplace.public.service"
);

const NOW = new Date("2026-07-17T10:00:00.000Z");

function price(overrides = {}) {
  return activeMarketplacePricing(
    {
      marketplacePrice: 650000,
      sellPrice: 700000,
      marketplaceSalePrice: null,
      marketplaceSaleStartsAt: null,
      marketplaceSaleEndsAt: null,
      ...overrides,
    },
    NOW,
  );
}

test("uses the normal Marketplace price without a sale", () => {
  assert.deepEqual(price(), {
    regularPrice: 650000,
    salePrice: null,
    price: 650000,
    onSale: false,
    saleStartsAt: null,
    saleEndsAt: null,
  });
});

test("does not treat a null sale price as zero", () => {
  const result = price({
    marketplaceSalePrice: null,
  });

  assert.equal(result.onSale, false);
  assert.equal(result.salePrice, null);
  assert.equal(result.price, 650000);
});

test("does not treat an empty sale price as zero", () => {
  const result = price({
    marketplaceSalePrice: "",
  });

  assert.equal(result.onSale, false);
  assert.equal(result.salePrice, null);
  assert.equal(result.price, 650000);
});

test("uses an immediate valid sale price", () => {
  const result = price({
    marketplaceSalePrice: 545000,
  });

  assert.equal(result.onSale, true);
  assert.equal(result.regularPrice, 650000);
  assert.equal(result.salePrice, 545000);
  assert.equal(result.price, 545000);
});

test("supports a zero sale price intentionally", () => {
  const result = price({
    marketplaceSalePrice: 0,
  });

  assert.equal(result.onSale, true);
  assert.equal(result.salePrice, 0);
  assert.equal(result.price, 0);
});

test("activates a sale inside its schedule", () => {
  const result = price({
    marketplaceSalePrice: 545000,
    marketplaceSaleStartsAt:
      "2026-07-17T09:00:00.000Z",
    marketplaceSaleEndsAt:
      "2026-07-17T11:00:00.000Z",
  });

  assert.equal(result.onSale, true);
  assert.equal(result.price, 545000);
});

test("keeps a future sale inactive", () => {
  const result = price({
    marketplaceSalePrice: 545000,
    marketplaceSaleStartsAt:
      "2026-07-17T11:00:00.000Z",
    marketplaceSaleEndsAt:
      "2026-07-17T12:00:00.000Z",
  });

  assert.equal(result.onSale, false);
  assert.equal(result.salePrice, null);
  assert.equal(result.price, 650000);
});

test("returns to normal price after a sale ends", () => {
  const result = price({
    marketplaceSalePrice: 545000,
    marketplaceSaleStartsAt:
      "2026-07-17T08:00:00.000Z",
    marketplaceSaleEndsAt:
      "2026-07-17T09:00:00.000Z",
  });

  assert.equal(result.onSale, false);
  assert.equal(result.salePrice, null);
  assert.equal(result.price, 650000);
});

test("rejects a sale price equal to normal price", () => {
  const result = price({
    marketplaceSalePrice: 650000,
  });

  assert.equal(result.onSale, false);
  assert.equal(result.price, 650000);
});

test("rejects a sale price above normal price", () => {
  const result = price({
    marketplaceSalePrice: 700000,
  });

  assert.equal(result.onSale, false);
  assert.equal(result.price, 650000);
});

test("rejects an invalid schedule", () => {
  const result = price({
    marketplaceSalePrice: 545000,
    marketplaceSaleStartsAt:
      "2026-07-17T12:00:00.000Z",
    marketplaceSaleEndsAt:
      "2026-07-17T11:00:00.000Z",
  });

  assert.equal(result.onSale, false);
  assert.equal(result.price, 650000);
});

test("rejects malformed schedule dates", () => {
  const result = price({
    marketplaceSalePrice: 545000,
    marketplaceSaleStartsAt: "invalid-date",
  });

  assert.equal(result.onSale, false);
  assert.equal(result.saleStartsAt, null);
  assert.equal(result.price, 650000);
});

test("falls back to the internal selling price", () => {
  const result = activeMarketplacePricing(
    {
      marketplacePrice: null,
      sellPrice: 545000,
      marketplaceSalePrice: null,
    },
    NOW,
  );

  assert.equal(result.regularPrice, 545000);
  assert.equal(result.price, 545000);
});
