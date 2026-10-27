"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const {
  recordVerifiedFlutterwaveAttempt,
} = require("../../src/modules/payments/flutterwaveVerifiedAttempt");

const raw = process.env.PAYMENT_CONCURRENCY_TEST_DATABASE_URL;
if (!raw) throw new Error("STOP: Test database URL missing");

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
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const transactionId = crypto.randomInt(100000000, 999999999);

  const payment = await prisma.payment.create({
    data: {
      reference: `SVX_227_${suffix}`,
      provider: "FLUTTERWAVE",
      amount: 10000,
      currency: "RWF",
      planKey: "STARTER_MONTHLY",
      purpose: "OWNER_SIGNUP",
      status: "PENDING",
    },
  });

  created.push(payment.id);

  const attempt = await prisma.paymentAttempt.create({
    data: {
      paymentId: payment.id,
      provider: "FLUTTERWAVE",
      checkoutReference: `CHECKOUT_227_${suffix}`,
      amount: 10000,
      currency: "RWF",
      status: "CREATED",
    },
  });

  return { payment, attempt, transactionId };
}

function providerResponse(f, overrides = {}) {
  return async () => ({
    ok: true,
    json: async () => ({
      status: "success",
      data: {
        id: f.transactionId,
        status: "successful",
        tx_ref: f.attempt.checkoutReference,
        amount: f.attempt.amount,
        currency: f.attempt.currency,
        ...overrides,
      },
    }),
  });
}

async function verify(f, overrides = {}) {
  return recordVerifiedFlutterwaveAttempt({
    prisma,
    attemptId: f.attempt.id,
    transactionId: f.transactionId,
    secretKey: "FLWSECK_TEST-FAKE",
    fetchImpl: providerResponse(f, overrides),
  });
}

test.after(async () => {
  try {
    for (const id of created) {
      await prisma.paymentAttempt.deleteMany({
        where: { paymentId: id },
      });
      await prisma.payment.deleteMany({
        where: { id },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
});

test("1. Provider verification persists in PostgreSQL", async () => {
  const f = await fixture();
  const result = await verify(f);

  assert.equal(result.recorded, true);

  const stored = await prisma.paymentAttempt.findUnique({
    where: { id: f.attempt.id },
  });

  assert.equal(stored.status, "VERIFIED");
  assert.equal(
    stored.providerTransactionId,
    String(f.transactionId)
  );
  assert.ok(stored.verifiedAt instanceof Date);
  assert.equal(
    stored.verificationDetails.transactionId,
    f.transactionId
  );

  const payment = await prisma.payment.findUnique({
    where: { id: f.payment.id },
  });

  assert.equal(payment.status, "PENDING");
});

test("2. Incorrect provider reference cannot be persisted", async () => {
  const f = await fixture();

  await assert.rejects(
    verify(f, { tx_ref: "INCORRECT_REFERENCE" }),
    /did not verify/
  );

  const stored = await prisma.paymentAttempt.findUnique({
    where: { id: f.attempt.id },
  });

  assert.equal(stored.status, "CREATED");
  assert.equal(stored.providerTransactionId, null);
  assert.equal(stored.verifiedAt, null);
});

test("3. Repeated verification cannot modify verified attempt", async () => {
  const f = await fixture();

  await verify(f);

  await assert.rejects(
    verify(f),
    /not eligible/
  );

  const stored = await prisma.paymentAttempt.findUnique({
    where: { id: f.attempt.id },
  });

  assert.equal(stored.status, "VERIFIED");
  assert.equal(
    stored.providerTransactionId,
    String(f.transactionId)
  );
});


test("4. Same provider transaction cannot verify two attempts", async () => {
  const first = await fixture();
  const second = await fixture();

  // Simulate a provider response claiming the same transaction
  // for two different checkout references.
  second.transactionId = first.transactionId;

  await verify(first);

  await assert.rejects(
    verify(second),
    error => {
      assert.equal(error.code, "P2002");
      return true;
    }
  );

  const stored = await prisma.paymentAttempt.findUnique({
    where: { id: second.attempt.id },
  });

  assert.equal(stored.status, "CREATED");
  assert.equal(stored.providerTransactionId, null);
  assert.equal(stored.verifiedAt, null);
});

test("5. Concurrent duplicate transaction IDs yield one winner", async () => {
  const first = await fixture();
  const second = await fixture();

  second.transactionId = first.transactionId;

  const results = await Promise.allSettled([
    verify(first),
    verify(second),
  ]);

  assert.equal(
    results.filter(result => result.status === "fulfilled").length,
    1
  );

  const rejected = results.filter(
    result => result.status === "rejected"
  );

  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason.code, "P2002");

  const attempts = await prisma.paymentAttempt.findMany({
    where: {
      id: { in: [first.attempt.id, second.attempt.id] },
    },
  });

  assert.equal(
    attempts.filter(attempt => attempt.status === "VERIFIED").length,
    1
  );

  assert.equal(
    attempts.filter(attempt => attempt.status === "CREATED").length,
    1
  );
});
