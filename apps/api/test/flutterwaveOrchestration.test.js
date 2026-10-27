"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  prepareFlutterwaveTestCheckout,
} = require("../src/modules/payments/flutterwaveOrchestration");

const signupPayment = Object.freeze({
  reference: "SVX_TEST_204_001",
  provider: "FLUTTERWAVE",
  purpose: "OWNER_SIGNUP",
  status: "PENDING",
  intentId: "intent-204",
  tenantId: null,
  planKey: "STARTER_MONTHLY",
  amount: 10000,
  currency: "RWF",
});

function setup(overrides = {}) {
  const calls = [];

  const args = {
    reference: signupPayment.reference,
    identity: {
      accountId: "account-204",
      emailVerified: true,
    },
    loadPayment: async () => signupPayment,
    authorizePayment: async ({ identity, payment }) =>
      identity.accountId === "account-204" &&
      payment.intentId === "intent-204",
    loadPlanPrice: async () => ({
      planKey: signupPayment.planKey,
      amount: 10000,
      currency: "RWF",
    }),
    loadCustomer: async () => ({
      verified: true,
      email: "buyer@example.com",
      name: "Test Buyer",
    }),
    redirectUrl: "https://storvex.rw/payment/return",
    secretKey: "FLWSECK_TEST-FAKE",
    fetchImpl: async (url, options) => {
      calls.push({
        url,
        body: JSON.parse(options.body),
      });

      return {
        ok: true,
        json: async () => ({
          status: "success",
          data: {
            link: "https://checkout.flutterwave.com/v3/hosted/test-204",
          },
        }),
      };
    },
    ...overrides,
  };

  return { args, calls };
}

test("1. Verified signup account prepares pending checkout", async () => {
  const { args, calls } = setup();
  const result = await prepareFlutterwaveTestCheckout(args);

  assert.equal(result.status, "PENDING");
  assert.equal(result.provider, "FLUTTERWAVE");
  assert.equal(calls.length, 1);
});

test("2. Checkout uses backend price and reference", async () => {
  const { args, calls } = setup();
  await prepareFlutterwaveTestCheckout(args);

  assert.equal(calls[0].body.amount, 10000);
  assert.equal(calls[0].body.currency, "RWF");
  assert.equal(calls[0].body.tx_ref, signupPayment.reference);
});

test("3. Unverified account cannot start checkout", async () => {
  const { args, calls } = setup({
    identity: {
      accountId: "account-204",
      emailVerified: false,
    },
  });

  await assert.rejects(
    prepareFlutterwaveTestCheckout(args),
    /Verified Storvex account required/
  );

  assert.equal(calls.length, 0);
});

test("4. Another account cannot use this payment", async () => {
  const { args, calls } = setup({
    identity: {
      accountId: "another-account",
      emailVerified: true,
    },
  });

  await assert.rejects(
    prepareFlutterwaveTestCheckout(args),
    /does not belong/
  );

  assert.equal(calls.length, 0);
});

test("5. Wrong plan amount blocks checkout", async () => {
  const { args, calls } = setup({
    loadPlanPrice: async () => ({
      planKey: "STARTER_MONTHLY",
      amount: 20000,
      currency: "RWF",
    }),
  });

  await assert.rejects(
    prepareFlutterwaveTestCheckout(args),
    /does not match current plan price/
  );

  assert.equal(calls.length, 0);
});

test("6. Payment cannot be used with another provider", async () => {
  const { args, calls } = setup({
    loadPayment: async () => ({
      ...signupPayment,
      provider: "MOMO",
    }),
  });

  await assert.rejects(
    prepareFlutterwaveTestCheckout(args),
    /Payment provider mismatch/
  );

  assert.equal(calls.length, 0);
});

test("7. Already paid records cannot create checkout", async () => {
  const { args, calls } = setup({
    loadPayment: async () => ({
      ...signupPayment,
      status: "SUCCESS",
    }),
  });

  await assert.rejects(
    prepareFlutterwaveTestCheckout(args),
    /not eligible for checkout/
  );

  assert.equal(calls.length, 0);
});

test("8. Renewal requires correct tenant ownership", async () => {
  const renewal = {
    ...signupPayment,
    reference: "SVX_TEST_204_002",
    purpose: "SUBSCRIPTION_RENEWAL",
    intentId: null,
    tenantId: "tenant-204",
  };

  const { args, calls } = setup({
    reference: renewal.reference,
    identity: {
      userId: "user-204",
      tenantId: "tenant-204",
    },
    loadPayment: async () => renewal,
    authorizePayment: async ({ identity, payment }) =>
      identity.tenantId === payment.tenantId,
  });

  const result = await prepareFlutterwaveTestCheckout(args);

  assert.equal(result.purpose, "SUBSCRIPTION_RENEWAL");
  assert.equal(result.status, "PENDING");
  assert.equal(calls.length, 1);
});

test("9. Cross-tenant renewal access is rejected", async () => {
  const renewal = {
    ...signupPayment,
    reference: "SVX_TEST_204_003",
    purpose: "SUBSCRIPTION_RENEWAL",
    intentId: null,
    tenantId: "tenant-204",
  };

  const { args, calls } = setup({
    reference: renewal.reference,
    identity: {
      userId: "user-999",
      tenantId: "tenant-999",
    },
    loadPayment: async () => renewal,
    authorizePayment: async ({ identity, payment }) =>
      identity.tenantId === payment.tenantId,
  });

  await assert.rejects(
    prepareFlutterwaveTestCheckout(args),
    /does not belong/
  );

  assert.equal(calls.length, 0);
});

test("10. Checkout never activates a subscription", async () => {
  const { args } = setup();
  const result = await prepareFlutterwaveTestCheckout(args);

  assert.equal(result.status, "PENDING");
  assert.equal("subscription" in result, false);
  assert.equal("activated" in result, false);
});

test("11. Missing backend authorization blocks checkout", async () => {
  const { args, calls } = setup({
    authorizePayment: undefined,
  });

  await assert.rejects(
    prepareFlutterwaveTestCheckout(args),
    /Trusted server-side checkout dependencies required/
  );

  assert.equal(calls.length, 0);
});

test("12. Provider reference must match stored reference", async () => {
  const { args, calls } = setup({
    loadPayment: async () => ({
      ...signupPayment,
      reference: "ANOTHER_REFERENCE",
    }),
  });

  await assert.rejects(
    prepareFlutterwaveTestCheckout(args),
    /Payment record not found/
  );

  assert.equal(calls.length, 0);
});
