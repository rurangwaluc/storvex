"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const {
  completeSandboxRenewal,
} = require("../../src/modules/payments/flutterwaveSandboxRenewalCompletion");

const raw = process.env.PAYMENT_CONCURRENCY_TEST_DATABASE_URL;
if (!raw) throw new Error("STOP: Test database URL missing");

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

const previousEnv = {
  NODE_ENV: process.env.NODE_ENV,
  FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED:
    process.env.FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED,
  FLUTTERWAVE_LIVE_ENABLED:
    process.env.FLUTTERWAVE_LIVE_ENABLED,
  FLUTTERWAVE_TEST_SECRET_KEY:
    process.env.FLUTTERWAVE_TEST_SECRET_KEY,
};

const env = {
  NODE_ENV: "development",
  FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "true",
  FLUTTERWAVE_LIVE_ENABLED: "false",
  FLUTTERWAVE_TEST_SECRET_KEY: "FLWSECK_TEST-FAKE",
};

Object.assign(process.env, env);

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

const tenants = [];

async function fixture({ trial = false } = {}) {
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const now = new Date();
  const endDate = new Date(now.getTime() + 5 * 86400000);

  const tenant = await prisma.tenant.create({
    data: {
      name: `Renewal Completion ${suffix}`,
      email: `complete-${suffix}@example.invalid`,
      phone: "+250700000000",
    },
  });

  tenants.push(tenant.id);

  await prisma.subscription.create({
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
      reference: `RENEW_${suffix}`,
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
      entitlementSnapshot: {},
    },
  });

  const attempt = await prisma.paymentAttempt.create({
    data: {
      paymentId: payment.id,
      provider: "FLUTTERWAVE",
      checkoutReference: payment.reference,
      status: "CREATED",
      amount: payment.amount,
      currency: payment.currency,
      checkoutUrl:
        "https://checkout-v2.dev-flutterwave.com/test",
    },
  });

  return {
    tenant,
    payment,
    attempt,
    transactionId: crypto.randomInt(100000000, 999999999),
  };
}

function providerResponse(f, overrides = {}) {
  return async () => ({
    ok: true,
    json: async () => ({
      status: "success",
      data: {
        id: f.transactionId,
        status: "successful",
        tx_ref: f.payment.reference,
        amount: f.payment.amount,
        currency: f.payment.currency,
        ...overrides,
      },
    }),
  });
}

function complete(f, options = {}) {
  return completeSandboxRenewal({
    prisma,
    reference: f.payment.reference,
    tenantId: f.tenant.id,
    loadTrustedPlan:
      options.loadTrustedPlan || (async () => plan),
    fetchImpl: options.fetchImpl || providerResponse(f),
    env,
  });
}

async function state(f) {
  const [payment, attempt, subscription] =
    await Promise.all([
      prisma.payment.findUnique({
        where: { id: f.payment.id },
      }),
      prisma.paymentAttempt.findUnique({
        where: { id: f.attempt.id },
      }),
      prisma.subscription.findUnique({
        where: { tenantId: f.tenant.id },
      }),
    ]);

  return { payment, attempt, subscription };
}

test.after(async () => {
  try {
    for (const tenantId of tenants) {
      const payments = await prisma.payment.findMany({
        where: { tenantId },
        select: { id: true },
      });

      await prisma.paymentAttempt.deleteMany({
        where: {
          paymentId: {
            in: payments.map(payment => payment.id),
          },
        },
      });

      await prisma.payment.deleteMany({
        where: { tenantId },
      });

      await prisma.subscription.deleteMany({
        where: { tenantId },
      });

      await prisma.tenant.delete({
        where: { id: tenantId },
      });
    }
  } finally {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    await prisma.$disconnect();
  }
});

test("Completed checkout activates subscription once", async () => {
  const f = await fixture();

  const result = await complete(f);
  const saved = await state(f);

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.alreadyCompleted, false);
  assert.equal(saved.payment.status, "SUCCESS");
  assert.equal(saved.attempt.status, "APPLIED");
  assert.equal(saved.subscription.planKey, plan.planKey);
  assert.equal(saved.subscription.staffLimit, plan.staffLimit);
  assert.ok(
    saved.subscription.endDate >
      new Date(Date.now() + 20 * 86400000)
  );

  const repeat = await complete(f, {
    fetchImpl: async () => {
      throw new Error("Provider must not be called twice");
    },
  });

  const after = await state(f);

  assert.equal(repeat.alreadyCompleted, true);
  assert.equal(
    after.subscription.endDate.getTime(),
    saved.subscription.endDate.getTime()
  );
});

test("Saved verification can resume activation", async () => {
  const f = await fixture();

  await prisma.paymentAttempt.update({
    where: { id: f.attempt.id },
    data: {
      status: "VERIFIED",
      providerTransactionId: String(f.transactionId),
      verifiedAt: new Date(),
      verificationDetails: {
        verificationSource:
          "FLUTTERWAVE_TRANSACTION_VERIFY",
        transactionId: f.transactionId,
        reference: f.payment.reference,
        amount: f.payment.amount,
        currency: f.payment.currency,
      },
    },
  });

  const result = await complete(f, {
    fetchImpl: async () => {
      throw new Error("Provider must not be called again");
    },
  });

  assert.equal(result.status, "SUCCESS");
  assert.equal((await state(f)).attempt.status, "APPLIED");
});

test("Incorrect trusted pricing prevents activation", async () => {
  const f = await fixture();

  await assert.rejects(
    complete(f, {
      loadTrustedPlan: async () => ({
        ...plan,
        price: 9999,
      }),
    }),
    /Stored renewal does not match trusted plan/
  );

  const saved = await state(f);

  assert.equal(saved.payment.status, "PENDING");
  assert.equal(saved.attempt.status, "VERIFIED");
  assert.equal(saved.subscription.staffLimit, 1);
});

test("Paid plan is queued during active trial", async () => {
  const f = await fixture({ trial: true });

  const result = await complete(f);
  const saved = await state(f);

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.activation.queuedAfterTrial, true);
  assert.equal(saved.subscription.accessMode, "TRIAL");
  assert.equal(saved.subscription.nextPlanKey, plan.planKey);
  assert.equal(saved.subscription.staffLimit, 1);
});


// STEP 342CN-S / QUOTED RENEWAL DATABASE TESTS
const {
  addCalendarMonths,
} = require("../../src/modules/billing/renewalPeriod");

async function attachQuotedPurchase(f, months, options = {}) {
  const regularAmount = plan.price * months;
  const discounts = { 1: 0, 3: 5, 6: 10, 12: 15 };
  const discountPercent = discounts[months];
  const discountAmount = Math.round(
    regularAmount * discountPercent / 100
  );
  const totalAmount = regularAmount - discountAmount;

  const renewalQuote = {
    version: 1,
    planKey: plan.planKey,
    countryCode: "RW",
    currency: plan.currency,
    durationMonths: months,
    discountPercent,
    monthlyAmount: plan.price,
    regularAmount,
    discountAmount,
    totalAmount,
  };

  await prisma.payment.update({
    where: { id: f.payment.id },
    data: {
      amount: totalAmount,
      renewalQuote,
      // STEP 342CN-AN / IMMUTABLE PURCHASE TESTS
      // Save all purchased terms in the same initial quote update.
      ...(options.entitlementSnapshot === undefined
        ? {}
        : { entitlementSnapshot: options.entitlementSnapshot }),
    },
  });

  await prisma.paymentAttempt.update({
    where: { id: f.attempt.id },
    data: { amount: totalAmount },
  });

  // The simulated provider must report the actual quoted charge.
  f.payment.amount = totalAmount;

  return renewalQuote;
}

for (const months of [1, 3, 6, 12]) {
  test(`Quoted ${months}-month renewal persists correct dates`, async () => {
    const f = await fixture();
    const before = await state(f);
    const quote = await attachQuotedPurchase(f, months);

    const result = await complete(f);
    const saved = await state(f);

    assert.equal(result.status, "SUCCESS");
    assert.equal(saved.payment.status, "SUCCESS");
    assert.equal(saved.payment.amount, quote.totalAmount);
    assert.equal(saved.attempt.status, "APPLIED");

    assert.equal(
      saved.subscription.endDate.toISOString(),
      addCalendarMonths(
        before.subscription.endDate, months
      ).toISOString()
    );

    assert.equal(
      saved.subscription.priceAmount,
      quote.monthlyAmount
    );

    const repeat = await complete(f, {
      fetchImpl: async () => {
        throw new Error("Provider must not be called twice");
      },
    });

    const afterRepeat = await state(f);
    assert.equal(repeat.alreadyCompleted, true);
    assert.equal(
      afterRepeat.subscription.endDate.toISOString(),
      saved.subscription.endDate.toISOString()
    );
  });
}

test("Historical quoted price survives later plan repricing", async () => {
  const f = await fixture();
  const before = await state(f);
  const quote = await attachQuotedPurchase(f, 12);

  const result = await complete(f, {
    loadTrustedPlan: async () => ({
      ...plan,
      price: plan.price + 5000,
    }),
  });

  const saved = await state(f);

  assert.equal(result.status, "SUCCESS");
  assert.equal(saved.payment.amount, quote.totalAmount);
  assert.equal(saved.subscription.priceAmount, quote.monthlyAmount);

  assert.equal(
    saved.subscription.endDate.toISOString(),
    addCalendarMonths(
      before.subscription.endDate, 12
    ).toISOString()
  );
});

test("Quoted annual purchase remains queued during trial", async () => {
  const f = await fixture({ trial: true });
  const before = await state(f);
  await attachQuotedPurchase(f, 12);

  const result = await complete(f);
  const saved = await state(f);

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.activation.queuedAfterTrial, true);
  assert.equal(saved.subscription.accessMode, "TRIAL");
  assert.equal(saved.subscription.nextPlanKey, plan.planKey);

  assert.equal(
    saved.subscription.endDate.toISOString(),
    addCalendarMonths(
      before.subscription.endDate, 12
    ).toISOString()
  );
});

test("Tampered quoted amount cannot activate subscription", async () => {
  const f = await fixture();
  const before = await state(f);
  await attachQuotedPurchase(f, 6);

  // STEP 342CN-AN / IMMUTABLE PURCHASE TESTS
  // PostgreSQL must reject the modification before finalization.
  await assert.rejects(
    prisma.payment.update({
      where: { id: f.payment.id },
      data: { amount: f.payment.amount - 1 },
    }),
    /Quoted renewal payment snapshot cannot be modified/
  );

  const saved = await state(f);

  assert.equal(saved.payment.status, "PENDING");
  assert.equal(saved.payment.amount, f.payment.amount);
  assert.notEqual(saved.attempt.status, "APPLIED");
  assert.equal(
    saved.subscription.endDate.toISOString(),
    before.subscription.endDate.toISOString()
  );

  // The original, untampered purchase must still complete normally.
  const completed = await complete(f);
  const afterCompletion = await state(f);

  assert.equal(completed.status, "SUCCESS");
  assert.equal(afterCompletion.payment.status, "SUCCESS");
  assert.equal(afterCompletion.attempt.status, "APPLIED");
});


// STEP 342CN-U / CONCURRENT DISTINCT RENEWAL PAYMENTS
test(
  "Two simultaneous three-month payments preserve both extensions",
  async () => {
    const first = await fixture();
    const before = await state(first);
    const quote = await attachQuotedPurchase(first, 3);

    const suffix = crypto.randomUUID().replaceAll("-", "");

    const secondPayment = await prisma.payment.create({
      data: {
        tenantId: first.tenant.id,
        reference: `RENEW_${suffix}`,
        provider: "FLUTTERWAVE",
        purpose: "SUBSCRIPTION_RENEWAL",
        status: "PENDING",
        amount: quote.totalAmount,
        currency: quote.currency,
        planKey: plan.planKey,
        tierKey: plan.tierKey,
        cycleKey: plan.cycleKey,
        staffLimit: plan.staffLimit,
        branchLimit: plan.branchLimit,
        priceAmount: quote.monthlyAmount,
        entitlementSnapshot: {},
        renewalQuote: quote,
      },
    });

    const secondAttempt = await prisma.paymentAttempt.create({
      data: {
        paymentId: secondPayment.id,
        provider: "FLUTTERWAVE",
        checkoutReference: secondPayment.reference,
        status: "CREATED",
        amount: secondPayment.amount,
        currency: secondPayment.currency,
        checkoutUrl:
          "https://checkout-v2.dev-flutterwave.com/test",
      },
    });

    const second = {
      tenant: first.tenant,
      payment: secondPayment,
      attempt: secondAttempt,
      transactionId: crypto.randomInt(100000000, 999999999),
    };

    const results = await Promise.allSettled([
      complete(first),
      complete(second),
    ]);

    for (const result of results) {
      if (result.status !== "fulfilled") {
        throw result.reason;
      }
      assert.equal(result.value.status, "SUCCESS");
    }

    const [savedFirst, savedSecond, subscription] =
      await Promise.all([
        prisma.payment.findUnique({
          where: { id: first.payment.id },
        }),
        prisma.payment.findUnique({
          where: { id: second.payment.id },
        }),
        prisma.subscription.findUnique({
          where: { tenantId: first.tenant.id },
        }),
      ]);

    assert.equal(savedFirst.status, "SUCCESS");
    assert.equal(savedSecond.status, "SUCCESS");

    const expectedEnd = addCalendarMonths(
      addCalendarMonths(before.subscription.endDate, 3),
      3
    );

    assert.equal(
      subscription.endDate.toISOString(),
      expectedEnd.toISOString()
    );

    const [firstAttempt, savedSecondAttempt] =
      await Promise.all([
        prisma.paymentAttempt.findUnique({
          where: { id: first.attempt.id },
        }),
        prisma.paymentAttempt.findUnique({
          where: { id: second.attempt.id },
        }),
      ]);

    assert.equal(firstAttempt.status, "APPLIED");
    assert.equal(savedSecondAttempt.status, "APPLIED");
  }
);


// STEP 342CN-Y / ATOMIC TRIAL ACTIVATION
test(
  "Annual trial purchase activates exactly once after trial expiry",
  async () => {
    const {
      resolveSubscriptionAccess,
    } = require(
      "../../src/middlewares/requireActiveSubscription"
    );

    if (typeof resolveSubscriptionAccess !== "function") {
      throw new Error("Subscription access resolver unavailable");
    }

    const f = await fixture({ trial: true });

    // STEP 342CN-AN / IMMUTABLE PURCHASE TESTS
    // Persist the quote and purchased entitlements atomically.
    const purchasedEntitlements = {
      testPurchasedFeature: "historical-contract",
    };

    await attachQuotedPurchase(f, 12, {
      entitlementSnapshot: purchasedEntitlements,
    });

    const original = await state(f);
    const purchase = await complete(f);

    assert.equal(purchase.status, "SUCCESS");
    assert.equal(purchase.activation.queuedAfterTrial, true);

    const queued = await state(f);
    const paidUntil = queued.subscription.endDate.toISOString();

    assert.equal(
      paidUntil,
      addCalendarMonths(
        original.subscription.endDate, 12
      ).toISOString()
    );

    // The entitlement snapshot was saved before verification.
    // Trial activation must use that original purchased snapshot.
    await prisma.subscription.update({
      where: { tenantId: f.tenant.id },
      data: {
        trialEndDate: new Date(Date.now() - 86400000),
      },
    });

    const [first, second] = await Promise.all([
      resolveSubscriptionAccess(f.tenant.id),
      resolveSubscriptionAccess(f.tenant.id),
    ]);

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);

    const activated = await state(f);

    assert.equal(activated.subscription.accessMode, "ACTIVE");
    assert.equal(activated.subscription.planKey, plan.planKey);
    assert.equal(activated.subscription.nextPlanKey, null);
    assert.equal(activated.subscription.staffLimit, plan.staffLimit);
    assert.equal(activated.subscription.priceAmount, plan.price);
    assert.deepEqual(
      activated.subscription.entitlementSnapshot,
      purchasedEntitlements
    );
    assert.equal(
      activated.subscription.endDate.toISOString(),
      paidUntil
    );

    await resolveSubscriptionAccess(f.tenant.id);

    const repeated = await state(f);

    assert.equal(
      repeated.subscription.endDate.toISOString(),
      paidUntil
    );
    assert.equal(
      repeated.subscription.startDate.toISOString(),
      activated.subscription.startDate.toISOString()
    );
    assert.deepEqual(
      repeated.subscription.entitlementSnapshot,
      purchasedEntitlements
    );
  }
);


// STEP 342CN-AD / EXACT QUEUED PAYMENT REFERENCE
test(
  "Quoted trial renewal stores its exact successful payment reference",
  async () => {
    const f = await fixture({ trial: true });
    await attachQuotedPurchase(f, 12);

    const result = await complete(f);
    const saved = await state(f);

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.activation.queuedAfterTrial, true);
    assert.equal(saved.payment.status, "SUCCESS");
    assert.equal(saved.attempt.status, "APPLIED");

    assert.equal(saved.subscription.accessMode, "TRIAL");
    assert.equal(saved.subscription.nextPlanKey, plan.planKey);
    assert.equal(
      saved.subscription.queuedRenewalReference,
      f.payment.reference
    );

    const repeat = await complete(f, {
      fetchImpl: async () => {
        throw new Error("Provider must not be called again");
      },
    });

    const afterRepeat = await state(f);

    assert.equal(repeat.alreadyCompleted, true);
    assert.equal(
      afterRepeat.subscription.queuedRenewalReference,
      f.payment.reference
    );
  }
);


// STEP 342CN-AF / EXACT PAYMENT TRIAL ACTIVATION TESTS
test(
  "Wrong queued reference cannot activate an expired trial",
  async () => {
    const { resolveSubscriptionAccess } = require(
      "../../src/middlewares/requireActiveSubscription"
    );

    const f = await fixture({ trial: true });
    await attachQuotedPurchase(f, 12);
    await complete(f);

    const queued = await state(f);
    const paidUntil = queued.subscription.endDate.toISOString();

    // A successful payment for the same tenant and plan exists,
    // but the queued reference deliberately points elsewhere.
    await prisma.subscription.update({
      where: { tenantId: f.tenant.id },
      data: {
        queuedRenewalReference: `MISSING_${crypto.randomUUID()}`,
        trialEndDate: new Date(Date.now() - 86400000),
      },
    });

    const denied = await resolveSubscriptionAccess(f.tenant.id);
    const persisted = await state(f);

    assert.equal(denied.ok, true);
    assert.equal(denied.code, "SUBSCRIPTION_BLOCKED");
    assert.equal(denied.subscription.accessMode, "READ_ONLY");

    // Failed authorization must not corrupt the queued purchase.
    assert.equal(persisted.subscription.accessMode, "TRIAL");
    assert.equal(persisted.subscription.nextPlanKey, plan.planKey);
    assert.notEqual(
      persisted.subscription.queuedRenewalReference,
      f.payment.reference
    );
    assert.equal(
      persisted.subscription.endDate.toISOString(),
      paidUntil
    );

    // Restoring the exact verified reference permits activation.
    await prisma.subscription.update({
      where: { tenantId: f.tenant.id },
      data: { queuedRenewalReference: f.payment.reference },
    });

    const recovered = await resolveSubscriptionAccess(f.tenant.id);
    const activated = await state(f);

    assert.equal(recovered.ok, true);
    assert.equal(activated.subscription.accessMode, "ACTIVE");
    assert.equal(activated.subscription.planKey, plan.planKey);
    assert.equal(activated.subscription.nextPlanKey, null);
    assert.equal(activated.subscription.queuedRenewalReference, null);
    assert.equal(
      activated.subscription.endDate.toISOString(),
      paidUntil
    );
  }
);

test(
  "Legacy queued trial without payment reference remains compatible",
  async () => {
    const { resolveSubscriptionAccess } = require(
      "../../src/middlewares/requireActiveSubscription"
    );

    const f = await fixture({ trial: true });
    await complete(f);

    await prisma.subscription.update({
      where: { tenantId: f.tenant.id },
      data: {
        queuedRenewalReference: null,
        trialEndDate: new Date(Date.now() - 86400000),
      },
    });

    const result = await resolveSubscriptionAccess(f.tenant.id);
    const saved = await state(f);

    assert.equal(result.ok, true);
    assert.equal(saved.subscription.accessMode, "ACTIVE");
    assert.equal(saved.subscription.planKey, plan.planKey);
    assert.equal(saved.subscription.nextPlanKey, null);
    assert.equal(saved.subscription.queuedRenewalReference, null);
  }
);

test(
  "Expired trial without a successful payment cannot gain paid access",
  async () => {
    const { resolveSubscriptionAccess } = require(
      "../../src/middlewares/requireActiveSubscription"
    );

    const f = await fixture({ trial: true });

    await prisma.subscription.update({
      where: { tenantId: f.tenant.id },
      data: {
        trialEndDate: new Date(Date.now() - 86400000),
        nextPlanKey: plan.planKey,
        queuedRenewalReference: f.payment.reference,
      },
    });

    // The original payment is still PENDING.
    const result = await resolveSubscriptionAccess(f.tenant.id);
    const saved = await state(f);

    assert.equal(result.ok, true);
    assert.equal(result.code, "SUBSCRIPTION_BLOCKED");
    assert.equal(result.subscription.accessMode, "READ_ONLY");
    assert.equal(saved.payment.status, "PENDING");
    assert.equal(saved.subscription.accessMode, "TRIAL");
    assert.equal(
      saved.subscription.queuedRenewalReference,
      f.payment.reference
    );
  }
);


// STEP 342CN-AS / PURCHASED ENTITLEMENT SNAPSHOT
test(
  "Immediate quoted activation preserves checkout-time entitlements",
  async () => {
    const f = await fixture();

    const purchasedEntitlements = {
      historicalFeature: "included-at-checkout",
      historicalLimit: 12,
    };

    // Save purchased entitlements before creating the immutable quote.
    await prisma.payment.update({
      where: { id: f.payment.id },
      data: {
        entitlementSnapshot: purchasedEntitlements,
      },
    });

    await attachQuotedPurchase(f, 12);

    const before = await state(f);

    // Simulate an entitlement change in today's trusted plan.
    // The historical payment remains authoritative for entitlements.
    const changedPlan = {
      ...plan,
      entitlements: {
        historicalFeature: "removed-from-current-plan",
        newFeature: true,
      },
    };

    const result = await complete(f, {
      loadTrustedPlan: async () => changedPlan,
    });

    const saved = await state(f);

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.activation.queuedAfterTrial, false);
    assert.equal(saved.payment.status, "SUCCESS");
    assert.equal(saved.attempt.status, "APPLIED");
    assert.equal(saved.subscription.accessMode, "ACTIVE");

    assert.deepEqual(
      saved.payment.entitlementSnapshot,
      purchasedEntitlements
    );

    assert.deepEqual(
      saved.subscription.entitlementSnapshot,
      purchasedEntitlements
    );

    assert.equal(saved.subscription.priceAmount, plan.price);
    assert.equal(
      saved.subscription.endDate.toISOString(),
      addCalendarMonths(before.subscription.endDate, 12).toISOString()
    );

    assert.equal(saved.subscription.queuedRenewalReference, null);
  }
);


// STEP 342CN-AU / HISTORICAL PLAN SNAPSHOT
test(
  "Historical quoted plan limits survive later plan changes",
  async () => {
    const f = await fixture();
    const before = await state(f);

    const purchasedEntitlements = {
      historicalLimitContract: true,
    };

    await attachQuotedPurchase(f, 12, {
      entitlementSnapshot: purchasedEntitlements,
    });

    const updatedPlan = {
      ...plan,
      price: plan.price + 5000,
      tierKey: "CHANGED_TIER",
      cycleKey: "CHANGED_CYCLE",
      staffLimit: 99,
      branchLimit: 99,
      entitlements: { newFeatureOnly: true },
    };

    const result = await complete(f, {
      loadTrustedPlan: async () => updatedPlan,
    });

    const saved = await state(f);

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.activation.queuedAfterTrial, false);
    assert.equal(saved.payment.status, "SUCCESS");
    assert.equal(saved.attempt.status, "APPLIED");

    assert.equal(saved.subscription.planKey, plan.planKey);
    assert.equal(saved.subscription.tierKey, plan.tierKey);
    assert.equal(saved.subscription.cycleKey, plan.cycleKey);
    assert.equal(saved.subscription.staffLimit, plan.staffLimit);
    assert.equal(saved.subscription.branchLimit, plan.branchLimit);
    assert.equal(saved.subscription.priceAmount, plan.price);

    assert.deepEqual(
      saved.subscription.entitlementSnapshot,
      purchasedEntitlements
    );

    assert.equal(
      saved.subscription.endDate.toISOString(),
      addCalendarMonths(
        before.subscription.endDate,
        12
      ).toISOString()
    );

    assert.equal(saved.subscription.queuedRenewalReference, null);
  }
);


// STEP 342CN-GS2 / SAME PAYMENT CONCURRENCY
test(
  "Two simultaneous completions never apply the same payment twice",
  async () => {
    const f = await fixture();
    const before = await state(f);

    // Both requests use the SAME payment reference.
    // The provider response is mocked by the existing fixture.
    const outcomes = await Promise.allSettled([
      complete(f),
      complete(f),
    ]);

    const after = await state(f);

    assert.equal(after.payment.status, "SUCCESS");
    assert.equal(after.attempt.status, "APPLIED");
    assert.ok(after.attempt.appliedAt instanceof Date);

    const extensionDays =
      (after.subscription.endDate.getTime() -
        before.subscription.endDate.getTime()) /
      86400000;

    // This fixture purchases one 30-day plan.
    // Two activations would extend approximately 60 days.
    assert.ok(
      extensionDays >= 29 && extensionDays <= 31,
      `Expected one renewal, received ${extensionDays} days`
    );

    const successful = outcomes.filter(
      item =>
        item.status === "fulfilled" &&
        item.value.status === "SUCCESS"
    );

    assert.ok(
      successful.length >= 1,
      "At least one completion must succeed"
    );

    for (const outcome of outcomes) {
      if (outcome.status === "fulfilled") {
        assert.equal(outcome.value.reference, f.payment.reference);
        assert.equal(outcome.value.status, "SUCCESS");
      }
    }

    // Once applied, this same reference must remain idempotent.
    const repeat = await complete(f, {
      fetchImpl: async () => {
        throw new Error(
          "Previously completed payment must not recontact provider"
        );
      },
    });

    const final = await state(f);

    assert.equal(repeat.alreadyCompleted, true);
    assert.equal(
      final.subscription.endDate.getTime(),
      after.subscription.endDate.getTime()
    );
  }
);
