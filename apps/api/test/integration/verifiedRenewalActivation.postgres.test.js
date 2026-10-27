"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const {
  finalizeVerifiedRenewalPayment,
} = require("../../src/modules/payments/verifiedPaymentFinalization");

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

const fixtures = [];

const plan = Object.freeze({
  planKey: "STARTER_MONTHLY",
  tierKey: "STARTER",
  cycleKey: "MONTHLY",
  staffLimit: 3,
  branchLimit: 1,
  price: 10000,
  currency: "RWF",
  days: 30,
  graceDays: 7,
  entitlements: {},
});

async function fixture({ trial = false } = {}) {
  const id = crypto.randomUUID().replaceAll("-", "");
  const now = new Date();
  const endDate = new Date(now.getTime() + 5 * 86400000);

  const tenant = await prisma.tenant.create({
    data: {
      name: `Payment Test ${id}`,
      email: `test-${id}@example.invalid`,
      phone: `+2507${id.slice(0, 8).replace(/[a-f]/g, "1")}`,
      countryCode: "RW",
      currencyCode: "RWF",
    },
  });

  fixtures.push(tenant.id);

  const subscription = await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      status: "ACTIVE",
      accessMode: trial ? "TRIAL" : "ACTIVE",
      planKey: trial ? "TRIAL" : "STARTER_MONTHLY",
      startDate: now,
      endDate,
      trialStartDate: trial ? now : null,
      trialEndDate: trial ? endDate : null,
      staffLimit: 1,
      branchLimit: 1,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      reference: `RENEW_${id}`,
      provider: "FLUTTERWAVE",
      purpose: "SUBSCRIPTION_RENEWAL",
      status: "PENDING",
      amount: plan.price,
      currency: plan.currency,
      planKey: plan.planKey,
      tierKey: plan.tierKey,
      cycleKey: plan.cycleKey,
      staffLimit: plan.staffLimit,
      branchLimit: plan.branchLimit,
      priceAmount: plan.price,
      entitlementSnapshot: plan.entitlements,
    },
  });

  const transactionId = crypto.randomInt(100000000, 999999999);

  const attempt = await prisma.paymentAttempt.create({
    data: {
      paymentId: payment.id,
      provider: "FLUTTERWAVE",
      checkoutReference: payment.reference,
      providerTransactionId: String(transactionId),
      amount: payment.amount,
      currency: payment.currency,
      status: "VERIFIED",
      verifiedAt: new Date(),
      verificationDetails: {
        verificationSource: "FLUTTERWAVE_TRANSACTION_VERIFY",
        transactionId,
        reference: payment.reference,
        amount: payment.amount,
        currency: payment.currency,
      },
    },
  });

  return { tenant, subscription, payment, attempt };
}

function args(f, loadTrustedPlan = async () => plan) {
  return {
    prisma,
    payment: f.payment,
    attempt: f.attempt,
    loadTrustedPlan,
  };
}

async function state(f) {
  const [payment, attempt, subscription] = await Promise.all([
    prisma.payment.findUnique({ where: { id: f.payment.id } }),
    prisma.paymentAttempt.findUnique({ where: { id: f.attempt.id } }),
    prisma.subscription.findUnique({
      where: { tenantId: f.tenant.id },
    }),
  ]);

  return { payment, attempt, subscription };
}

test.after(async () => {
  try {
    for (const tenantId of fixtures) {
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
      await prisma.subscription.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

test("Verified renewal activates the purchased plan", async () => {
  const f = await fixture();

  const result = await finalizeVerifiedRenewalPayment(args(f));
  const saved = await state(f);

  assert.equal(result.applied, true);
  assert.equal(result.activation.queuedAfterTrial, false);
  assert.equal(saved.payment.status, "SUCCESS");
  assert.equal(saved.attempt.status, "APPLIED");
  assert.equal(saved.subscription.accessMode, "ACTIVE");
  assert.equal(saved.subscription.planKey, plan.planKey);
  assert.equal(saved.subscription.staffLimit, plan.staffLimit);
  assert.equal(saved.subscription.branchLimit, plan.branchLimit);
  assert.ok(saved.subscription.endDate > f.subscription.endDate);
});

test("Repeated renewal cannot extend subscription twice", async () => {
  const f = await fixture();

  await finalizeVerifiedRenewalPayment(args(f));
  const before = await state(f);

  await assert.rejects(finalizeVerifiedRenewalPayment(args(f)));

  const after = await state(f);
  assert.equal(
    after.subscription.endDate.getTime(),
    before.subscription.endDate.getTime()
  );
  assert.equal(after.payment.status, "SUCCESS");
  assert.equal(after.attempt.status, "APPLIED");
});

test("Trusted plan mismatch rolls back all changes", async () => {
  const f = await fixture();

  await assert.rejects(
    finalizeVerifiedRenewalPayment(
      args(f, async () => ({ ...plan, price: 9999 }))
    ),
    /Stored renewal does not match trusted plan/
  );

  const saved = await state(f);
  assert.equal(saved.payment.status, "PENDING");
  assert.equal(saved.attempt.status, "VERIFIED");
  assert.equal(saved.attempt.appliedAt, null);
  assert.equal(saved.subscription.staffLimit, 1);
});

test("Active trial remains active and paid plan is queued", async () => {
  const f = await fixture({ trial: true });

  const result = await finalizeVerifiedRenewalPayment(args(f));
  const saved = await state(f);

  assert.equal(result.applied, true);
  assert.equal(result.activation.queuedAfterTrial, true);
  assert.equal(saved.payment.status, "SUCCESS");
  assert.equal(saved.subscription.accessMode, "TRIAL");
  assert.equal(saved.subscription.nextPlanKey, plan.planKey);
  assert.equal(saved.subscription.staffLimit, 1);
});
