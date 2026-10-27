"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  recordVerifiedFlutterwaveAttempt,
} = require("../src/modules/payments/flutterwaveVerifiedAttempt");

function fixture(changes = {}) {
  const payment = {
    id: "payment-226",
    reference: "SVX_PAY_226",
    status: "PENDING",
    provider: "FLUTTERWAVE",
    amount: 10000,
    currency: "RWF",
    planKey: "STARTER_MONTHLY",
    purpose: "OWNER_SIGNUP",
  };

  const attempt = {
    id: "attempt-226",
    paymentId: payment.id,
    provider: "FLUTTERWAVE",
    checkoutReference: "SVX_CHECKOUT_226",
    amount: 10000,
    currency: "RWF",
    status: "CREATED",
    providerTransactionId: null,
    verifiedAt: null,
    appliedAt: null,
  };

  Object.assign(payment, changes.payment || {});
  Object.assign(attempt, changes.attempt || {});

  let providerCalls = 0;
  let updateCalls = 0;

  const db = {
    payment: {
      findUnique: async () => ({ ...payment }),
    },
    paymentAttempt: {
      findUnique: async () => ({ ...attempt }),
      updateMany: async ({ where, data }) => {
        updateCalls++;
        if (
          attempt.status !== where.status ||
          attempt.providerTransactionId !== null
        ) return { count: 0 };
        Object.assign(attempt, data);
        return { count: 1 };
      },
    },
  };

  const prisma = {
    ...db,
    $transaction: async fn => fn(db),
  };

  const fetchImpl = async () => {
    providerCalls++;
    return {
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          id: 22601,
          status: "successful",
          tx_ref: changes.providerReference || "SVX_CHECKOUT_226",
          amount: changes.providerAmount ?? 10000,
          currency: "RWF",
        },
      }),
    };
  };

  return {
    prisma,
    fetchImpl,
    get providerCalls() { return providerCalls; },
    get updateCalls() { return updateCalls; },
    get attempt() { return attempt; },
  };
}

function run(f) {
  return recordVerifiedFlutterwaveAttempt({
    prisma: f.prisma,
    attemptId: "attempt-226",
    transactionId: 22601,
    secretKey: "FLWSECK_TEST-FAKE",
    fetchImpl: f.fetchImpl,
  });
}

test("1. Matching provider result records verification", async () => {
  const f = fixture();
  const result = await run(f);

  assert.equal(result.status, "VERIFIED");
  assert.equal(f.attempt.providerTransactionId, "22601");
  assert.equal(f.updateCalls, 1);
});

test("2. Wrong provider reference cannot be recorded", async () => {
  const f = fixture({ providerReference: "WRONG_REF" });

  await assert.rejects(run(f), /did not verify/);
  assert.equal(f.updateCalls, 0);
});

test("3. Provider underpayment cannot be recorded", async () => {
  const f = fixture({ providerAmount: 5000 });

  await assert.rejects(run(f), /did not verify/);
  assert.equal(f.updateCalls, 0);
});

test("4. Changed stored payment cannot be recorded", async () => {
  const f = fixture({ payment: { amount: 5000 } });

  await assert.rejects(run(f), /do not match/);
  assert.equal(f.providerCalls, 0);
});

test("5. Previously verified attempt cannot repeat", async () => {
  const f = fixture({
    attempt: {
      status: "VERIFIED",
      providerTransactionId: "22601",
      verifiedAt: new Date(),
    },
  });

  await assert.rejects(run(f), /not eligible/);
  assert.equal(f.providerCalls, 0);
});

test("6. Recorder never activates subscriptions", async () => {
  const f = fixture();
  const result = await run(f);

  assert.equal("activation" in result, false);
  assert.equal("subscription" in result, false);
});
