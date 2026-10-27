"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const {
  finalizeVerifiedPayment,
} = require("../../src/modules/payments/verifiedPaymentFinalization");

const raw = process.env.PAYMENT_CONCURRENCY_TEST_DATABASE_URL;
if (!raw) throw new Error("Missing isolated test database URL");

const url = new URL(raw);
if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "5432" ||
  url.pathname !== "/storvex_payment_test"
) {
  throw new Error("STOP: Refusing non-test database");
}

const prisma = new PrismaClient({
  datasources: { db: { url: raw } },
});

const created = [];

async function fixture() {
  const suffix = crypto.randomUUID();
  const payment = {
    id: `payment-${suffix}`,
    reference: `SVX_${suffix.replaceAll("-", "")}`,
    provider: "FLUTTERWAVE",
    amount: 10000,
    currency: "RWF",
    planKey: "STARTER_MONTHLY",
    purpose: "OWNER_SIGNUP",
    status: "PENDING",
  };

  const attempt = {
    id: `attempt-${suffix}`,
    paymentId: payment.id,
    provider: payment.provider,
    providerTransactionId:
      String(BigInt("0x" + crypto.randomBytes(6).toString("hex"))),
    checkoutReference: `CHECKOUT_${suffix.replaceAll("-", "")}`,
    amount: payment.amount,
    currency: payment.currency,
    status: "VERIFIED",
    verifiedAt: new Date(),
    appliedAt: null,
  };

  attempt.verificationDetails = {
    verificationSource: "FLUTTERWAVE_TRANSACTION_VERIFY",
    transactionId: Number(attempt.providerTransactionId),
    reference: attempt.checkoutReference,
    amount: attempt.amount,
    currency: attempt.currency,
  };

  await prisma.$executeRaw`
    INSERT INTO "Payment" (
      "id", "reference", "provider", "amount",
      "currency", "planKey", "purpose", "status"
    ) VALUES (
      ${payment.id}, ${payment.reference},
      ${payment.provider}, ${payment.amount},
      ${payment.currency}, ${payment.planKey},
      ${payment.purpose}, 'PENDING'::"PaymentStatus"
    )
  `;

  created.push(payment.id);

  await prisma.$executeRaw`
    INSERT INTO "PaymentAttempt" (
      "id", "paymentId", "provider",
      "providerTransactionId", "checkoutReference",
      "amount", "currency", "status", "verifiedAt",
      "verificationDetails"
    ) VALUES (
      ${attempt.id}, ${attempt.paymentId},
      ${attempt.provider}, ${attempt.providerTransactionId},
      ${attempt.checkoutReference}, ${attempt.amount},
      ${attempt.currency}, 'VERIFIED', ${attempt.verifiedAt},
      ${JSON.stringify(attempt.verificationDetails)}::jsonb
    )
  `;

  return { payment, attempt };
}

async function state(paymentId) {
  const payments = await prisma.$queryRaw`
    SELECT "status"::text AS status
    FROM "Payment"
    WHERE "id" = ${paymentId}
  `;

  const attempts = await prisma.$queryRaw`
    SELECT "status", "appliedAt"
    FROM "PaymentAttempt"
    WHERE "paymentId" = ${paymentId}
  `;

  const ledger = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "PaymentFinalizationTestLedger"
    WHERE "paymentId" = ${paymentId}
  `;

  return {
    paymentStatus: payments[0]?.status,
    attemptStatus: attempts[0]?.status,
    appliedAt: attempts[0]?.appliedAt,
    activations: ledger[0]?.count,
  };
}

function activation({ fail = false, hold = null } = {}) {
  return async ({ tx, payment, attempt }) => {
    await tx.$executeRaw`
      INSERT INTO "PaymentFinalizationTestLedger"
      ("paymentId", "attemptId")
      VALUES (${payment.id}, ${attempt.id})
    `;

    if (hold) await hold;

    if (fail) {
      throw new Error("SIMULATED_ACTIVATION_FAILURE");
    }

    return { activated: true };
  };
}

test.after(async () => {
  try {
    for (const id of created) {
      await prisma.$executeRaw`
        DELETE FROM "PaymentFinalizationTestLedger"
        WHERE "paymentId" = ${id}
      `;

      await prisma.$executeRaw`
        DELETE FROM "PaymentAttempt"
        WHERE "paymentId" = ${id}
      `;

      await prisma.$executeRaw`
        DELETE FROM "Payment"
        WHERE "id" = ${id}
      `;
    }
  } finally {
    await prisma.$disconnect();
  }
});

test("1. Verified payment applies once", async () => {
  const { payment, attempt } = await fixture();

  const result = await finalizeVerifiedPayment({
    prisma,
    payment,
    attempt,
    applyActivation: activation(),
  });

  assert.equal(result.applied, true);

  const current = await state(payment.id);
  assert.equal(current.paymentStatus, "SUCCESS");
  assert.equal(current.attemptStatus, "APPLIED");
  assert.ok(current.appliedAt instanceof Date);
  assert.equal(current.activations, 1);
});

test("2. Duplicate finalization cannot apply twice", async () => {
  const { payment, attempt } = await fixture();

  const args = {
    prisma,
    payment,
    attempt,
    applyActivation: activation(),
  };

  await finalizeVerifiedPayment(args);

  await assert.rejects(
    finalizeVerifiedPayment(args),
    /Authoritative payment verification mismatch/
  );

  const current = await state(payment.id);
  assert.equal(current.activations, 1);
  assert.equal(current.attemptStatus, "APPLIED");
});

test("3. Activation failure rolls back all writes", async () => {
  const { payment, attempt } = await fixture();

  await assert.rejects(
    finalizeVerifiedPayment({
      prisma,
      payment,
      attempt,
      applyActivation: activation({ fail: true }),
    }),
    /SIMULATED_ACTIVATION_FAILURE/
  );

  const current = await state(payment.id);
  assert.equal(current.paymentStatus, "PENDING");
  assert.equal(current.attemptStatus, "VERIFIED");
  assert.equal(current.appliedAt, null);
  assert.equal(current.activations, 0);
});

test("4. Simultaneous finalizations create one activation", {
  timeout: 30000,
}, async () => {
  const { payment, attempt } = await fixture();

  let signalEntered;
  const entered = new Promise(resolve => {
    signalEntered = resolve;
  });

  let releaseFirst;
  const held = new Promise(resolve => {
    releaseFirst = resolve;
  });

  const first = finalizeVerifiedPayment({
    prisma,
    payment,
    attempt,
    applyActivation: async args => {
      signalEntered();
      return activation({ hold: held })(args);
    },
  });

  let second;

  try {
    await entered;

    second = finalizeVerifiedPayment({
      prisma,
      payment,
      attempt,
      applyActivation: activation(),
    });

    // Ensure the competing operation has time to begin
    // while the first transaction holds the payment lock.
    await new Promise(resolve => setTimeout(resolve, 200));
  } finally {
    releaseFirst();
  }

  const results = await Promise.allSettled([first, second]);

  assert.equal(
    results.filter(item => item.status === "fulfilled").length,
    1
  );

  assert.equal(
    results.filter(item => item.status === "rejected").length,
    1
  );

  const current = await state(payment.id);
  assert.equal(current.paymentStatus, "SUCCESS");
  assert.equal(current.attemptStatus, "APPLIED");
  assert.equal(current.activations, 1);
});
