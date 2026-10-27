"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createSandboxInlineConfig,
} = require("../src/modules/payments/flutterwaveSandboxInlineConfig");

const env = {
  NODE_ENV: "development",
  FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "true",
  FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED: "true",
  FLUTTERWAVE_SANDBOX_INLINE_ENABLED: "true",
  FLUTTERWAVE_LIVE_ENABLED: "false",
  FLUTTERWAVE_TEST_SECRET_KEY: "FLWSECK_TEST-FAKE",
  FLUTTERWAVE_TEST_PUBLIC_KEY: "FLWPUBK_TEST-FAKE",
};

function fixture() {
  const payment = {
    id: "payment-test-1",
    tenantId: "tenant-test-1",
    reference: "RENEW_TEST_12345678",
    provider: "FLUTTERWAVE",
    purpose: "SUBSCRIPTION_RENEWAL",
    status: "PENDING",
    planKey: "LAUNCH_GROWTH",
    currency: "RWF",
    amount: 71250,
    intentId: null,
    renewalQuote: {
      planKey: "LAUNCH_GROWTH",
      durationMonths: 3,
      currency: "RWF",
      totalAmount: 71250,
    },
  };

  return {
    payment,
    reservation: {
      paymentId: payment.id,
      attemptId: "attempt-test-1",
      reference: payment.reference,
      amount: payment.amount,
      currency: payment.currency,
      status: "CREATED",
    },
    identity: {
      tenantId: payment.tenantId,
      userId: "owner-test-1",
      role: "OWNER",
    },
    customer: {
      email: "owner@example.invalid",
    },
    env: { ...env },
  };
}

test("builds the public Inline payload from trusted payment data", () => {
  const config = createSandboxInlineConfig(fixture());

  assert.equal(config.public_key, "FLWPUBK_TEST-FAKE");
  assert.equal(config.tx_ref, "RENEW_TEST_12345678");
  assert.equal(config.amount, 71250);
  assert.equal(config.currency, "RWF");
  assert.equal(config.customer.email, "owner@example.invalid");

  assert.equal(config.redirect_url, undefined);
  assert.equal(config.callback, undefined);
  assert.equal(config.onclose, undefined);

  assert.ok(!JSON.stringify(config).includes("FLWSECK"));
  assert.ok(!JSON.stringify(config).includes("tenant-test"));
});

test("rejects Inline when its feature flag is disabled", () => {
  const input = fixture();
  input.env.FLUTTERWAVE_SANDBOX_INLINE_ENABLED = "false";

  assert.throws(() => createSandboxInlineConfig(input));
});

test("rejects Inline outside development", () => {
  const input = fixture();
  input.env.NODE_ENV = "production";

  assert.throws(() => createSandboxInlineConfig(input));
});

test("rejects live payment mode", () => {
  const input = fixture();
  input.env.FLUTTERWAVE_LIVE_ENABLED = "true";

  assert.throws(() => createSandboxInlineConfig(input));
});

test("rejects missing or non-test public keys", () => {
  for (const key of [
    undefined,
    "FLWPUBK_LIVE-FAKE",
    "FLWSECK_TEST-FAKE",
    "",
  ]) {
    const input = fixture();
    input.env.FLUTTERWAVE_TEST_PUBLIC_KEY = key;

    assert.throws(() => createSandboxInlineConfig(input));
  }
});

test("rejects cross-tenant checkout", () => {
  const input = fixture();
  input.identity.tenantId = "different-tenant";

  assert.throws(() => createSandboxInlineConfig(input));
});

test("rejects non-owner checkout", () => {
  const input = fixture();
  input.identity.role = "CASHIER";

  assert.throws(() => createSandboxInlineConfig(input));
});

test("rejects mismatched payment reservation", () => {
  const input = fixture();
  input.reservation.amount = 10000;

  assert.throws(() => createSandboxInlineConfig(input));
});

test("rejects mutated or missing renewal quote", () => {
  for (const mutation of [
    quote => { quote.totalAmount = 10000; },
    quote => { quote.durationMonths = 2; },
    quote => { quote.planKey = "WRONG_PLAN"; },
  ]) {
    const input = fixture();
    mutation(input.payment.renewalQuote);

    assert.throws(() => createSandboxInlineConfig(input));
  }
});

test("rejects an invalid customer email", () => {
  const input = fixture();
  input.customer.email = "not-an-email";

  assert.throws(() => createSandboxInlineConfig(input));
});

test("rejects multi-month checkout when backend opt-in is disabled", () => {
  const input = fixture();
  input.env.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED = "false";

  assert.throws(() => createSandboxInlineConfig(input));
});


test("pre-payment Inline runtime requires explicit test configuration", () => {
  const {
    requireSandboxInlineRuntime,
  } = require("../src/modules/payments/flutterwaveSandboxInlineConfig");

  assert.equal(
    requireSandboxInlineRuntime({ ...env }),
    "FLWPUBK_TEST-FAKE"
  );

  for (const overrides of [
    { FLUTTERWAVE_SANDBOX_INLINE_ENABLED: "false" },
    { FLUTTERWAVE_SANDBOX_INLINE_ENABLED: undefined },
    { NODE_ENV: "production" },
    { FLUTTERWAVE_LIVE_ENABLED: "true" },
    { FLUTTERWAVE_TEST_PUBLIC_KEY: undefined },
    { FLUTTERWAVE_TEST_PUBLIC_KEY: "FLWPUBK_LIVE-FAKE" },
  ]) {
    assert.throws(() =>
      requireSandboxInlineRuntime({ ...env, ...overrides })
    );
  }
});
