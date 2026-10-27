"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const {
  verifyAndRecordSandboxRenewal,
} = require("../../src/modules/payments/flutterwaveSandboxVerifiedRenewal");

const raw = process.env.PAYMENT_CONCURRENCY_TEST_DATABASE_URL;
if (!raw) throw new Error("STOP: Missing test database URL");

const url = new URL(raw);
if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "5432" ||
  url.pathname !== "/storvex_payment_test"
) {
  throw new Error("STOP: Wrong test database");
}

const prisma = new PrismaClient({
  datasources: { db: { url: raw } },
});

const env = {
  NODE_ENV: "development",
  FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "true",
  FLUTTERWAVE_LIVE_ENABLED: "false",
  FLUTTERWAVE_TEST_SECRET_KEY: "FLWSECK_TEST-FAKE",
};

const created = [];

async function fixture() {
  const suffix = crypto.randomUUID().replaceAll("-", "");

  const tenant = await prisma.tenant.create({
    data: {
      name: "Storvex Verification Test",
      email: `verify-${suffix}@example.invalid`,
      phone: "+250700000000",
    },
  });

  created.push(tenant.id);

  const payment = await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      reference: `RENEW_${suffix}`,
      provider: "FLUTTERWAVE",
      purpose: "SUBSCRIPTION_RENEWAL",
      status: "PENDING",
      amount: 10000,
      currency: "RWF",
      planKey: "STARTER_MONTHLY",
    },
  });

  const attempt = await prisma.paymentAttempt.create({
    data: {
      paymentId: payment.id,
      checkoutReference: payment.reference,
      provider: "FLUTTERWAVE",
      status: "CREATED",
      amount: payment.amount,
      currency: payment.currency,
      checkoutUrl: "https://checkout-v2.dev-flutterwave.com/test",
    },
  });

  return { tenant, payment, attempt };
}

function response(f, overrides = {}) {
  return async () => ({
    ok: true,
    json: async () => ({
      status: "success",
      data: {
        id: crypto.randomInt(100000000, 999999999),
        status: "successful",
        tx_ref: f.payment.reference,
        amount: f.payment.amount,
        currency: f.payment.currency,
        ...overrides,
      },
    }),
  });
}

function verify(f, fetchImpl = response(f), tenantId = f.tenant.id) {
  return verifyAndRecordSandboxRenewal({
    prisma,
    reference: f.payment.reference,
    tenantId,
    env,
    fetchImpl,
  });
}

test.after(async () => {
  try {
    for (const tenantId of created) {
      const payments = await prisma.payment.findMany({
        where: { tenantId },
        select: { id: true },
      });

      await prisma.paymentAttempt.deleteMany({
        where: {
          paymentId: { in: payments.map(p => p.id) },
        },
      });
      await prisma.payment.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

test("Verified Flutterwave evidence is persisted", async () => {
  const f = await fixture();
  const result = await verify(f);

  assert.equal(result.verified, true);

  const saved = await prisma.paymentAttempt.findUnique({
    where: { id: f.attempt.id },
  });

  assert.equal(saved.status, "VERIFIED");
  assert.equal(
    saved.verificationDetails.reference,
    f.payment.reference
  );
  assert.equal(saved.verificationDetails.amount, 10000);

  const payment = await prisma.payment.findUnique({
    where: { id: f.payment.id },
  });

  assert.equal(payment.status, "PENDING");
});

test("Incorrect provider amount cannot verify payment", async () => {
  const f = await fixture();

  const result = await verify(f, response(f, { amount: 9999 }));
  assert.equal(result.verified, false);

  const saved = await prisma.paymentAttempt.findUnique({
    where: { id: f.attempt.id },
  });

  assert.equal(saved.status, "CREATED");
  assert.equal(saved.verificationDetails, null);
});

test("Another business cannot verify the payment", async () => {
  const f = await fixture();

  await assert.rejects(
    verify(f, response(f), "different-tenant"),
    /Payment unavailable/
  );

  const saved = await prisma.paymentAttempt.findUnique({
    where: { id: f.attempt.id },
  });

  assert.equal(saved.status, "CREATED");
});

test("Already verified attempt cannot be verified again", async () => {
  const f = await fixture();

  await verify(f);

  await assert.rejects(
    verify(f),
    /not eligible/
  );

  const saved = await prisma.paymentAttempt.findUnique({
    where: { id: f.attempt.id },
  });

  assert.equal(saved.status, "VERIFIED");
});
