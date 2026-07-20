"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizePaymentMethod,
} = require("../src/modules/store/marketplaceOrderCompletion.service");

test("accepts supported Marketplace completion payment methods", () => {
  assert.equal(
    normalizePaymentMethod("cash"),
    "CASH",
  );

  assert.equal(
    normalizePaymentMethod("momo"),
    "MOMO",
  );

  assert.equal(
    normalizePaymentMethod("bank"),
    "BANK",
  );

  assert.equal(
    normalizePaymentMethod("other"),
    "OTHER",
  );
});

test("stores card-style Marketplace payment as Other money", () => {
  assert.equal(
    normalizePaymentMethod("card"),
    "OTHER",
  );
});

test("rejects unsupported Marketplace completion payment methods", () => {
  assert.equal(
    normalizePaymentMethod("seller_approved_other"),
    null,
  );

  assert.equal(
    normalizePaymentMethod(""),
    null,
  );
});
