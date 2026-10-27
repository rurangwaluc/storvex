"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const raw = process.env.PAYMENT_CONCURRENCY_TEST_DATABASE_URL;
const dbUrl = new URL(process.env.DATABASE_URL || "");

if (
  !raw ||
  process.env.DATABASE_URL !== raw ||
  !["postgres:", "postgresql:"].includes(dbUrl.protocol) ||
  !["localhost", "127.0.0.1"].includes(dbUrl.hostname) ||
  dbUrl.port !== "5432" ||
  dbUrl.pathname !== "/storvex_payment_test" ||
  dbUrl.search !== "?schema=public" ||
  process.env.NODE_ENV !== "development" ||
  process.env.FLUTTERWAVE_LIVE_ENABLED !== "false"
) {
  throw new Error("STOP: Unsafe checkout test environment.");
}

process.env.FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED = "true";
process.env.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED = "false";
process.env.FLUTTERWAVE_TEST_SECRET_KEY = "FLWSECK_TEST-INTEGRATION-FAKE";
process.env.API_METRICS_ENABLED = "false";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: { db: { url: raw } },
});

const {
  initiateRenewalPayment,
} = require("../../src/modules/billing/billing.controller");

const {
  createRenewalPaymentQuote,
} = require("../../src/modules/billing/renewalPaymentQuote");

const tenants = [];
const providerCalls = [];

const originalFetch = global.fetch;

global.fetch = async (url, options) => {
  assert.equal(
    url,
    "https://api.flutterwave.com/v3/payments"
  );
  assert.equal(options.method, "POST");
  assert.equal(options.redirect, "error");
  assert.equal(
    options.headers.Authorization,
    "Bearer FLWSECK_TEST-INTEGRATION-FAKE"
  );

  const payload = JSON.parse(options.body);

  assert.equal(payload.currency, "RWF");
  assert.ok(Number.isSafeInteger(payload.amount));
  assert.ok(payload.amount > 0);
  assert.match(payload.tx_ref, /^RENEW_/);
  assert.match(
    payload.customer.email,
    /@example\.invalid$/
  );

  providerCalls.push(payload);

  return {
    ok: true,
    async json() {
      return {
        status: "success",
        data: {
          link: "https://checkout-v2.dev-flutterwave.com/test-session",
        },
      };
    },
  };
};

async function fixture() {
  const suffix = crypto.randomUUID().replaceAll("-", "");

  const tenant = await prisma.tenant.create({
    data: {
      name: `Checkout Integration ${suffix}`,
      email: `tenant-${suffix}@example.invalid`,
      phone: "+250700000000",
      countryCode: "RW",
      currencyCode: "RWF",
    },
  });

  tenants.push(tenant.id);

  const now = new Date();

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      status: "ACTIVE",
      accessMode: "ACTIVE",
      planKey: "LAUNCH_STARTER",
      startDate: now,
      endDate: new Date(now.getTime() + 10 * 86400000),
      staffLimit: 1,
      branchLimit: 1,
    },
  });

  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Checkout Test Owner",
      email: `owner-${suffix}@example.invalid`,
      phone: "+250700000001",
      password: "not-a-real-login-password",
      role: "OWNER",
      isActive: true,
    },
  });

  return { tenant, owner };
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function checkout(f, durationMonths, overrides = {}) {
  const req = {
    user: {
      id: f.owner.id,
      tenantId: f.tenant.id,
      role: overrides.role || "OWNER",
    },
    body: {
      planKey: "LAUNCH_STARTER",
      checkoutMethod: "FLUTTERWAVE_SANDBOX",
      durationMonths,
    },
  };

  const res = responseRecorder();

  await initiateRenewalPayment(req, res);

  return res;
}

async function paymentCount(tenantId) {
  return prisma.payment.count({
    where: { tenantId },
  });
}

test.after(async () => {
  global.fetch = originalFetch;

  try {
    for (const tenantId of tenants) {
      const payments = await prisma.payment.findMany({
        where: { tenantId },
        select: { id: true },
      });

      if (payments.length) {
        await prisma.paymentAttempt.deleteMany({
          where: {
            paymentId: {
              in: payments.map(p => p.id),
            },
          },
        });
      }

      await prisma.payment.deleteMany({
        where: { tenantId },
      });

      await prisma.user.deleteMany({
        where: { tenantId },
      });

      await prisma.subscription.deleteMany({
        where: { tenantId },
      });

      await prisma.tenant.delete({
        where: { id: tenantId },
      });
    }

    console.log("Temporary checkout fixtures: CLEANED UP");
  } finally {
    await prisma.$disconnect();
  }
});

test("isolated PostgreSQL database is verified", async () => {
  const result = await prisma.$queryRaw`
    SELECT current_database() AS db,
           current_schema() AS schema_name
  `;

  assert.equal(result[0].db, "storvex_payment_test");
  assert.equal(result[0].schema_name, "public");
});

test("multi-month checkout is blocked without opt-in", async () => {
  const f = await fixture();

  process.env.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED = "false";

  for (const months of [3, 6, 12]) {
    const before = await paymentCount(f.tenant.id);
    const callsBefore = providerCalls.length;

    const res = await checkout(f, months);

    assert.equal(res.statusCode, 400);
    assert.equal(await paymentCount(f.tenant.id), before);
    assert.equal(providerCalls.length, callsBefore);
  }
});

test("all four durations create exact server-priced checkouts", async () => {
  const f = await fixture();

  process.env.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED = "true";

  const expectations = [
    [1, 0, 10000],
    [3, 5, 28500],
    [6, 10, 54000],
    [12, 15, 102000],
  ];

  try {
    for (const [months, discount, total] of expectations) {
      const callsBefore = providerCalls.length;
      const res = await checkout(f, months);

      assert.equal(res.statusCode, 201, JSON.stringify(res.body));
      assert.equal(res.body.sandbox, true);
      assert.equal(res.body.provider, "FLUTTERWAVE");
      assert.equal(res.body.paymentStatus, "PENDING");
      assert.equal(res.body.durationMonths, months);
      assert.equal(res.body.discountPercent, discount);
      assert.equal(res.body.monthlyAmount, 10000);
      assert.equal(res.body.totalAmount, total);
      assert.equal(res.body.currency, "RWF");

      const payment = await prisma.payment.findUnique({
        where: { reference: res.body.paymentReference },
      });

      assert.ok(payment);
      assert.equal(payment.tenantId, f.tenant.id);
      assert.equal(payment.status, "PENDING");
      assert.equal(payment.provider, "FLUTTERWAVE");
      assert.equal(payment.amount, total);
      assert.equal(payment.priceAmount, 10000);
      assert.equal(payment.renewalQuote.durationMonths, months);

      const expectedQuote = createRenewalPaymentQuote({
        countryCode: "RW",
        planKey: "LAUNCH_STARTER",
        durationMonths: months,
      });

      assert.deepEqual(payment.renewalQuote, expectedQuote);

      const attempts = await prisma.paymentAttempt.findMany({
        where: { paymentId: payment.id },
      });

      assert.equal(attempts.length, 1);
      assert.equal(attempts[0].status, "CREATED");
      assert.equal(attempts[0].amount, total);
      assert.equal(attempts[0].currency, "RWF");
      assert.equal(
        attempts[0].checkoutReference,
        payment.reference
      );
      assert.equal(
        attempts[0].checkoutUrl,
        res.body.checkoutUrl
      );

      assert.equal(providerCalls.length, callsBefore + 1);

      const payload = providerCalls.at(-1);

      assert.equal(payload.amount, total);
      assert.equal(payload.tx_ref, payment.reference);

      console.log(
        `VERIFIED: ${months} month(s), ${discount}% discount, RWF ${total}`
      );
    }
  } finally {
    process.env.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED = "false";
  }
});

test("unsupported durations cannot create payments", async () => {
  const f = await fixture();

  process.env.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED = "true";

  try {
    for (const months of [0, 2, 13, "3", null]) {
      const before = await paymentCount(f.tenant.id);
      const callsBefore = providerCalls.length;

      const res = await checkout(f, months);

      assert.notEqual(res.statusCode, 201);
      assert.equal(await paymentCount(f.tenant.id), before);
      assert.equal(providerCalls.length, callsBefore);
    }
  } finally {
    process.env.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED = "false";
  }
});

test("non-owner cannot initiate checkout", async () => {
  const f = await fixture();

  const before = await paymentCount(f.tenant.id);
  const callsBefore = providerCalls.length;

  const res = await checkout(f, 1, { role: "CASHIER" });

  assert.equal(res.statusCode, 403);
  assert.equal(await paymentCount(f.tenant.id), before);
  assert.equal(providerCalls.length, callsBefore);
});


// STEP 342CN-BX / CONTINUOUS CHECKOUT-TO-ACTIVATION REGRESSION
const {
  completeSandboxRenewal,
} = require("../../src/modules/payments/flutterwaveSandboxRenewalCompletion");

const {
  addCalendarMonths,
} = require("../../src/modules/billing/renewalPeriod");

for (const [months, discount, expectedAmount] of [
  [1, 0, 10000],
  [3, 5, 28500],
  [6, 10, 54000],
  [12, 15, 102000],
]) {
  test(
    `Real ${months}-month checkout activates exactly once after verification`,
    async () => {
      const f = await fixture();

      const before = await prisma.subscription.findUnique({
        where: { tenantId: f.tenant.id },
      });

      assert.ok(before);
      assert.ok(before.endDate instanceof Date);

      process.env.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED = "true";

      let checkoutResponse;

      try {
        checkoutResponse = await checkout(f, months);
      } finally {
        process.env.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED = "false";
      }

      assert.equal(
        checkoutResponse.statusCode,
        201,
        JSON.stringify(checkoutResponse.body)
      );

      const reference = checkoutResponse.body.paymentReference;

      assert.match(reference, /^RENEW_/);
      assert.equal(checkoutResponse.body.durationMonths, months);
      assert.equal(checkoutResponse.body.discountPercent, discount);
      assert.equal(checkoutResponse.body.totalAmount, expectedAmount);

      const paymentBefore = await prisma.payment.findUnique({
        where: { reference },
      });

      assert.ok(paymentBefore);
      assert.equal(paymentBefore.tenantId, f.tenant.id);
      assert.equal(paymentBefore.status, "PENDING");
      assert.equal(paymentBefore.amount, expectedAmount);
      assert.equal(paymentBefore.renewalQuote.durationMonths, months);
      assert.equal(paymentBefore.renewalQuote.discountPercent, discount);

      const attemptBefore = await prisma.paymentAttempt.findUnique({
        where: { checkoutReference: reference },
      });

      assert.ok(attemptBefore);
      assert.equal(attemptBefore.paymentId, paymentBefore.id);
      assert.equal(attemptBefore.status, "CREATED");
      assert.equal(attemptBefore.amount, expectedAmount);

      const transactionId = crypto.randomInt(
        100000000,
        999999999
      );

      let verificationCalls = 0;

      const verifiedProvider = async (url, options) => {
        verificationCalls++;

        const parsed = new URL(url);

        assert.equal(
          parsed.origin + parsed.pathname,
          "https://api.flutterwave.com/v3/transactions/verify_by_reference"
        );

        assert.equal(parsed.searchParams.get("tx_ref"), reference);
        assert.equal(options.method, "GET");
        assert.equal(
          options.headers.Authorization,
          "Bearer FLWSECK_TEST-INTEGRATION-FAKE"
        );

        return {
          ok: true,
          async json() {
            return {
              status: "success",
              data: {
                id: transactionId,
                status: "successful",
                tx_ref: reference,
                amount: expectedAmount,
                currency: "RWF",
              },
            };
          },
        };
      };

      const trustedPlan = async storedPayment => {
        assert.equal(storedPayment.id, paymentBefore.id);
        assert.equal(storedPayment.tenantId, f.tenant.id);

        return {
          planKey: storedPayment.planKey,
          tierKey: storedPayment.tierKey,
          cycleKey: storedPayment.cycleKey,
          staffLimit: storedPayment.staffLimit,
          branchLimit: storedPayment.branchLimit,
          price: storedPayment.priceAmount,
          currency: storedPayment.currency,
          entitlements: storedPayment.entitlementSnapshot || {},
          days: 30,
          graceDays: 7,
        };
      };

      const completion = await completeSandboxRenewal({
        prisma,
        reference,
        tenantId: f.tenant.id,
        loadTrustedPlan: trustedPlan,
        fetchImpl: verifiedProvider,
        env: {
          NODE_ENV: "development",
          FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "true",
          FLUTTERWAVE_LIVE_ENABLED: "false",
          FLUTTERWAVE_TEST_SECRET_KEY:
            "FLWSECK_TEST-INTEGRATION-FAKE",
        },
      });

      assert.equal(completion.status, "SUCCESS");
      assert.equal(completion.alreadyCompleted, false);
      assert.equal(completion.reference, reference);
      assert.equal(verificationCalls, 1);

      const [paymentAfter, attemptAfter, subscriptionAfter] =
        await Promise.all([
          prisma.payment.findUnique({
            where: { reference },
          }),
          prisma.paymentAttempt.findUnique({
            where: { checkoutReference: reference },
          }),
          prisma.subscription.findUnique({
            where: { tenantId: f.tenant.id },
          }),
        ]);

      assert.equal(paymentAfter.status, "SUCCESS");
      assert.equal(paymentAfter.amount, expectedAmount);
      assert.deepEqual(
        paymentAfter.renewalQuote,
        paymentBefore.renewalQuote
      );

      assert.equal(attemptAfter.status, "APPLIED");
      assert.equal(
        attemptAfter.providerTransactionId,
        String(transactionId)
      );
      assert.ok(attemptAfter.verifiedAt instanceof Date);
      assert.ok(attemptAfter.appliedAt instanceof Date);
      assert.equal(
        attemptAfter.verificationDetails.verificationSource,
        "FLUTTERWAVE_TRANSACTION_VERIFY"
      );
      assert.equal(
        attemptAfter.verificationDetails.reference,
        reference
      );
      assert.equal(
        attemptAfter.verificationDetails.amount,
        expectedAmount
      );
      assert.equal(
        attemptAfter.verificationDetails.currency,
        "RWF"
      );

      const expectedEnd = addCalendarMonths(
        before.endDate,
        months
      );

      assert.equal(
        subscriptionAfter.endDate.toISOString(),
        expectedEnd.toISOString()
      );

      assert.equal(subscriptionAfter.accessMode, "ACTIVE");
      assert.equal(
        subscriptionAfter.planKey,
        paymentBefore.planKey
      );
      assert.equal(
        subscriptionAfter.priceAmount,
        paymentBefore.priceAmount
      );

      const repeat = await completeSandboxRenewal({
        prisma,
        reference,
        tenantId: f.tenant.id,
        loadTrustedPlan: trustedPlan,
        fetchImpl: async () => {
          throw new Error(
            "STOP: Repeat completion must not call Flutterwave"
          );
        },
        env: {
          NODE_ENV: "development",
          FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "true",
          FLUTTERWAVE_LIVE_ENABLED: "false",
          FLUTTERWAVE_TEST_SECRET_KEY:
            "FLWSECK_TEST-INTEGRATION-FAKE",
        },
      });

      assert.equal(repeat.status, "SUCCESS");
      assert.equal(repeat.alreadyCompleted, true);
      assert.equal(verificationCalls, 1);

      const finalSubscription =
        await prisma.subscription.findUnique({
          where: { tenantId: f.tenant.id },
        });

      assert.equal(
        finalSubscription.endDate.toISOString(),
        expectedEnd.toISOString()
      );

      console.log(
        `LIFECYCLE VERIFIED: ${months} month(s), ` +
        `${discount}% discount, RWF ${expectedAmount}, ` +
        "verified payment, exact calendar extension, no duplicate"
      );
    }
  );
}
