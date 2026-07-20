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

test("normalizes supported Marketplace delivery failure reasons", () => {
  const {
    normalizeDeliveryFailureReason,
  } = require("../src/modules/store/marketplaceDeliveryFailure.service");

  assert.equal(
    normalizeDeliveryFailureReason(
      "customer_refused",
    ),
    "CUSTOMER_REFUSED",
  );

  assert.equal(
    normalizeDeliveryFailureReason(
      " customer_unreachable ",
    ),
    "CUSTOMER_UNREACHABLE",
  );

  assert.equal(
    normalizeDeliveryFailureReason(
      "wrong_address",
    ),
    "WRONG_ADDRESS",
  );

  assert.equal(
    normalizeDeliveryFailureReason(
      "delivery_attempt_failed",
    ),
    "DELIVERY_ATTEMPT_FAILED",
  );

  assert.equal(
    normalizeDeliveryFailureReason(
      "other",
    ),
    "OTHER",
  );
});

test("rejects unsupported Marketplace delivery failure reasons", () => {
  const {
    normalizeDeliveryFailureReason,
  } = require("../src/modules/store/marketplaceDeliveryFailure.service");

  assert.equal(
    normalizeDeliveryFailureReason(
      "changed_mind",
    ),
    null,
  );

  assert.equal(
    normalizeDeliveryFailureReason(
      "",
    ),
    null,
  );
});
