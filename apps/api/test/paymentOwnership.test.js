"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assertPaymentOwnership,
} = require("../src/modules/payments/paymentOwnership");

const payment = {
  reference: "SVX_TEST_203_001",
  purpose: "OWNER_SIGNUP",
  status: "PENDING",
  planKey: "STARTER_MONTHLY",
  amount: 10000,
  currency: "RWF",
  intentId: "intent-001",
  tenantId: null,
};

function check(overrides = {}) {
  return assertPaymentOwnership({
    payment,
    purpose: "OWNER_SIGNUP",
    intentId: "intent-001",
    planKey: "STARTER_MONTHLY",
    amount: 10000,
    currency: "RWF",
    ...overrides,
  });
}

test("1. Accepts correct signup ownership", () => {
  assert.equal(check().reference, payment.reference);
});

test("2. Rejects another signup intent", () => {
  assert.throws(
    () => check({ intentId: "different-intent" }),
    /ownership mismatch/
  );
});

test("3. Rejects changed plan", () => {
  assert.throws(
    () => check({ planKey: "BUSINESS_MONTHLY" }),
    /plan or amount mismatch/
  );
});

test("4. Rejects changed amount", () => {
  assert.throws(
    () => check({ amount: 5000 }),
    /plan or amount mismatch/
  );
});

test("5. Rejects changed currency", () => {
  assert.throws(
    () => check({ currency: "USD" }),
    /plan or amount mismatch/
  );
});

test("6. Rejects successful payment reuse", () => {
  assert.throws(
    () => check({
      payment: { ...payment, status: "SUCCESS" },
    }),
    /not eligible/
  );
});

test("7. Accepts correct renewal ownership", () => {
  const renewal = {
    ...payment,
    purpose: "SUBSCRIPTION_RENEWAL",
    intentId: null,
    tenantId: "tenant-001",
  };

  const result = assertPaymentOwnership({
    payment: renewal,
    purpose: "SUBSCRIPTION_RENEWAL",
    tenantId: "tenant-001",
    planKey: renewal.planKey,
    amount: renewal.amount,
    currency: renewal.currency,
  });

  assert.equal(result.tenantId, "tenant-001");
});

test("8. Rejects cross-tenant payment reuse", () => {
  const renewal = {
    ...payment,
    purpose: "SUBSCRIPTION_RENEWAL",
    intentId: null,
    tenantId: "tenant-001",
  };

  assert.throws(
    () =>
      assertPaymentOwnership({
        payment: renewal,
        purpose: "SUBSCRIPTION_RENEWAL",
        tenantId: "tenant-002",
        planKey: renewal.planKey,
        amount: renewal.amount,
        currency: renewal.currency,
      }),
    /ownership mismatch/
  );
});

test("9. Rejects unknown payment purposes", () => {
  assert.throws(
    () => check({ purpose: "MARKETPLACE_ORDER" }),
    /not eligible|Unsupported/
  );
});

test("10. Rejects missing payment records", () => {
  assert.throws(
    () => check({ payment: null }),
    /Payment record is required/
  );
});
