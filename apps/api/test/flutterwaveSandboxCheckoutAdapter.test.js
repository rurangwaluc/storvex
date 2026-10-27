"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createSandboxRenewalCheckout,
} = require("../src/modules/payments/flutterwaveSandboxCheckoutAdapter");

const env = {
  NODE_ENV: "development",
  FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "true",
  FLUTTERWAVE_LIVE_ENABLED: "false",
  FLUTTERWAVE_TEST_SECRET_KEY: "FLWSECK_TEST-unit-only",
};

function fixtures(overrides = {}) {
  return {
    payment: {
      id: "payment-1",
      reference: "RENEW_TEST_123456",
      tenantId: "tenant-A",
      intentId: null,
      provider: "FLUTTERWAVE",
      purpose: "SUBSCRIPTION_RENEWAL",
      status: "PENDING",
      planKey: "TEST_PLAN",
      amount: 1000,
      currency: "RWF",
    },
    identity: {
      userId: "user-A",
      tenantId: "tenant-A",
    },
    plan: {
      planKey: "TEST_PLAN",
      amount: 1000,
      currency: "RWF",
    },
    customer: {
      email: "customer@example.test",
      name: "Test Customer",
    },
    returnUrl: "https://storvex.rw/billing/return",
    env,
    ...overrides,
  };
}

function mockFetch(link =
  "https://checkout-v2.dev-flutterwave.com/test-session"
) {
  const calls = [];

  const fetchImpl = async (url, options) => {
    calls.push({ url, options });

    return {
      ok: true,
      async json() {
        return {
          status: "success",
          data: { link },
        };
      },
    };
  };

  return { calls, fetchImpl };
}

test("1. Creates checkout from trusted renewal details", async () => {
  const mock = mockFetch();

  const result = await createSandboxRenewalCheckout({
    ...fixtures(),
    fetchImpl: mock.fetchImpl,
  });

  assert.equal(result.status, "PENDING");
  assert.equal(result.provider, "FLUTTERWAVE");
  assert.equal(result.merchantName, "RURAXIS LTD");
  assert.equal(mock.calls.length, 1);

  const payload = JSON.parse(mock.calls[0].options.body);

  assert.equal(payload.tx_ref, "RENEW_TEST_123456");
  assert.equal(payload.amount, 1000);
  assert.equal(payload.currency, "RWF");
});

test("2. Rejects cross-tenant checkout", async () => {
  const mock = mockFetch();

  await assert.rejects(
    createSandboxRenewalCheckout({
      ...fixtures({
        identity: {
          userId: "user-B",
          tenantId: "tenant-B",
        },
      }),
      fetchImpl: mock.fetchImpl,
    }),
    { code: "FLUTTERWAVE_CHECKOUT_REJECTED" }
  );

  assert.equal(mock.calls.length, 0);
});

test("3. Rejects manipulated prices", async () => {
  const mock = mockFetch();

  await assert.rejects(
    createSandboxRenewalCheckout({
      ...fixtures({
        plan: {
          planKey: "TEST_PLAN",
          amount: 1,
          currency: "RWF",
        },
      }),
      fetchImpl: mock.fetchImpl,
    }),
    { code: "FLUTTERWAVE_CHECKOUT_REJECTED" }
  );

  assert.equal(mock.calls.length, 0);
});

test("4. Rejects already successful payments", async () => {
  const mock = mockFetch();
  const original = fixtures();

  await assert.rejects(
    createSandboxRenewalCheckout({
      ...fixtures({
        payment: {
          ...original.payment,
          status: "SUCCESS",
        },
      }),
      fetchImpl: mock.fetchImpl,
    }),
    { code: "FLUTTERWAVE_CHECKOUT_REJECTED" }
  );

  assert.equal(mock.calls.length, 0);
});

test("5. Rejects unexpected checkout domains", async () => {
  const mock = mockFetch(
    "https://example.com/checkout"
  );

  await assert.rejects(
    createSandboxRenewalCheckout({
      ...fixtures(),
      fetchImpl: mock.fetchImpl,
    }),
    { code: "FLUTTERWAVE_CHECKOUT_REJECTED" }
  );
});

test("6. Rejects unapproved return URLs", async () => {
  const mock = mockFetch();

  await assert.rejects(
    createSandboxRenewalCheckout({
      ...fixtures({
        returnUrl: "https://example.com/return",
      }),
      fetchImpl: mock.fetchImpl,
    }),
    { code: "FLUTTERWAVE_CHECKOUT_REJECTED" }
  );

  assert.equal(mock.calls.length, 0);
});

test("7. Rejects production checkout", async () => {
  const mock = mockFetch();

  await assert.rejects(
    createSandboxRenewalCheckout({
      ...fixtures({
        env: { ...env, NODE_ENV: "production" },
      }),
      fetchImpl: mock.fetchImpl,
    }),
    { code: "FLUTTERWAVE_SANDBOX_DISABLED" }
  );

  assert.equal(mock.calls.length, 0);
});
