"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  reserveSandboxRenewalCheckout,
} = require("../src/modules/payments/flutterwaveCheckoutReservation");

const env = {
  NODE_ENV: "development",
  FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "true",
  FLUTTERWAVE_LIVE_ENABLED: "false",
  FLUTTERWAVE_TEST_SECRET_KEY: "FLWSECK_TEST-unit-only",
};

function fixture() {
  const payment = {
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
  };

  let created = 0;
  let storedAttempt = null;

  const prisma = {
    async $transaction(callback) {
      return callback({
        payment: {
          async findUnique({ where }) {
            return where.reference === payment.reference
              ? { ...payment }
              : null;
          },
        },
        paymentAttempt: {
          async create({ data }) {
            if (storedAttempt) {
              const error = new Error("Unique reference");
              error.code = "P2002";
              throw error;
            }

            created += 1;
            storedAttempt = {
              id: "attempt-1",
              checkoutUrl: null,
              ...data,
            };
            return storedAttempt;
          },
        },
      });
    },
  };

  return {
    payment,
    prisma,
    reference: payment.reference,
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
      name: "Sandbox Customer",
    },
    returnUrl: "https://storvex.rw/billing/return",
    env,
    getCreated: () => created,
  };
}

test("1. Reserves one attempt for a valid payment", async () => {
  const f = fixture();

  const result = await reserveSandboxRenewalCheckout(f);

  assert.equal(result.paymentId, "payment-1");
  assert.equal(result.attemptId, "attempt-1");
  assert.equal(result.reference, "RENEW_TEST_123456");
  assert.equal(result.status, "CREATED");
  assert.equal(f.getCreated(), 1);
});

test("2. Rejects duplicate reservation", async () => {
  const f = fixture();

  await reserveSandboxRenewalCheckout(f);

  await assert.rejects(
    reserveSandboxRenewalCheckout(f),
    { code: "CHECKOUT_RESERVATION_REJECTED" }
  );

  assert.equal(f.getCreated(), 1);
});

test("3. Rejects cross-tenant reservation", async () => {
  const f = fixture();

  f.identity.tenantId = "tenant-B";

  await assert.rejects(
    reserveSandboxRenewalCheckout(f),
    { code: "FLUTTERWAVE_CHECKOUT_REJECTED" }
  );

  assert.equal(f.getCreated(), 0);
});

test("4. Rejects manipulated plan price", async () => {
  const f = fixture();

  f.plan.amount = 1;

  await assert.rejects(
    reserveSandboxRenewalCheckout(f),
    { code: "FLUTTERWAVE_CHECKOUT_REJECTED" }
  );

  assert.equal(f.getCreated(), 0);
});

test("5. Rejects already successful payment", async () => {
  const f = fixture();

  f.payment.status = "SUCCESS";

  await assert.rejects(
    reserveSandboxRenewalCheckout(f),
    { code: "FLUTTERWAVE_CHECKOUT_REJECTED" }
  );

  assert.equal(f.getCreated(), 0);
});

test("6. Rejects production environment", async () => {
  const f = fixture();

  f.env = { ...env, NODE_ENV: "production" };

  await assert.rejects(
    reserveSandboxRenewalCheckout(f),
    { code: "FLUTTERWAVE_SANDBOX_DISABLED" }
  );

  assert.equal(f.getCreated(), 0);
});

test("7. Rejects unknown payment reference", async () => {
  const f = fixture();

  f.reference = "RENEW_UNKNOWN_123456";

  await assert.rejects(
    reserveSandboxRenewalCheckout(f),
    { code: "CHECKOUT_RESERVATION_REJECTED" }
  );

  assert.equal(f.getCreated(), 0);
});
