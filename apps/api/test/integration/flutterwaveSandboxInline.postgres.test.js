"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const raw = process.env.PAYMENT_CONCURRENCY_TEST_DATABASE_URL;

if (!raw || process.env.DATABASE_URL !== raw) {
  throw new Error("STOP: Explicit isolated payment database required.");
}

const url = new URL(raw);

if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "5432" ||
  url.pathname !== "/storvex_payment_test" ||
  url.search !== "?schema=public" ||
  process.env.NODE_ENV !== "development" ||
  process.env.FLUTTERWAVE_LIVE_ENABLED !== "false"
) {
  throw new Error("STOP: Unsafe Inline test environment.");
}

// Fake credentials are used by this isolated test process only.
process.env.FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED = "true";
process.env.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED = "true";
process.env.FLUTTERWAVE_SANDBOX_INLINE_ENABLED = "true";
process.env.FLUTTERWAVE_TEST_SECRET_KEY =
  "FLWSECK_TEST-INTEGRATION-FAKE";
process.env.FLUTTERWAVE_TEST_PUBLIC_KEY =
  "FLWPUBK_TEST-INTEGRATION-FAKE";
process.env.API_METRICS_ENABLED = "false";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: { db: { url: raw } },
});

const {
  initiateRenewalPayment,
} = require("../../src/modules/billing/billing.controller");

const tenants = [];
let providerCalls = 0;
const originalFetch = global.fetch;

// Any provider request is a test failure.
global.fetch = async () => {
  providerCalls += 1;
  throw new Error("STOP: Inline reservation contacted a provider.");
};

function recorder() {
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

async function fixture() {
  const suffix = crypto.randomUUID().replaceAll("-", "");

  const tenant = await prisma.tenant.create({
    data: {
      name: `Inline Integration ${suffix}`,
      email: `inline-${suffix}@example.invalid`,
      phone: "+250700000000",
      countryCode: "RW",
      currencyCode: "RWF",
    },
  });

  tenants.push(tenant.id);

  const now = new Date();

  const subscription = await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      status: "ACTIVE",
      accessMode: "TRIAL",
      planKey: "TRIAL",
      startDate: now,
      endDate: new Date(now.getTime() + 20 * 86400000),
      trialStartDate: now,
      trialEndDate: new Date(now.getTime() + 20 * 86400000),
      staffLimit: 1,
      branchLimit: 1,
    },
  });

  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Inline Test Owner",
      email: `owner-${suffix}@example.invalid`,
      phone: "+250700000001",
      password: "not-a-real-login-password",
      role: "OWNER",
      isActive: true,
    },
  });

  return { tenant, owner, subscription };
}

async function checkout(f, overrides = {}) {
  const request = {
    user: {
      id: f.owner.id,
      tenantId: f.tenant.id,
      role: overrides.role || "OWNER",
    },
    body: {
      planKey: overrides.planKey || "LAUNCH_GROWTH",
      durationMonths: overrides.durationMonths ?? 3,
      checkoutMethod: "FLUTTERWAVE_SANDBOX_INLINE",
    },
  };

  const response = recorder();

  await initiateRenewalPayment(request, response);

  return response;
}

test.after(async () => {
  global.fetch = originalFetch;

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

      await prisma.payment.deleteMany({ where: { tenantId } });
      await prisma.user.deleteMany({ where: { tenantId } });
      await prisma.subscription.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } });
    }

    console.log("Temporary Inline fixtures: CLEANED UP");
  } finally {
    await prisma.$disconnect();
  }
});

test("test database identity is verified", async () => {
  const result = await prisma.$queryRaw`
    SELECT current_database() AS db, current_schema() AS schema_name
  `;

  assert.equal(result[0].db, "storvex_payment_test");
  assert.equal(result[0].schema_name, "public");
});

test("disabled Inline creates no payment or attempt", async () => {
  const f = await fixture();

  process.env.FLUTTERWAVE_SANDBOX_INLINE_ENABLED = "false";

  try {
    const response = await checkout(f);

    assert.equal(response.statusCode, 403);

    assert.equal(
      await prisma.payment.count({
        where: { tenantId: f.tenant.id },
      }),
      0
    );

    assert.equal(
      await prisma.paymentAttempt.count({
        where: { payment: { tenantId: f.tenant.id } },
      }),
      0
    );

    assert.equal(providerCalls, 0);
  } finally {
    process.env.FLUTTERWAVE_SANDBOX_INLINE_ENABLED = "true";
  }
});

test("non-owner cannot reserve Inline checkout", async () => {
  const f = await fixture();
  const response = await checkout(f, { role: "CASHIER" });

  assert.equal(response.statusCode, 403);

  assert.equal(
    await prisma.payment.count({
      where: { tenantId: f.tenant.id },
    }),
    0
  );

  assert.equal(providerCalls, 0);
});

test("Growth three-month Inline creates one pending reservation", async () => {
  const f = await fixture();
  const response = await checkout(f);

  assert.equal(response.statusCode, 201, JSON.stringify(response.body));

  const body = response.body;

  assert.equal(body.checkoutMethod, "FLUTTERWAVE_SANDBOX_INLINE");
  assert.equal(body.provider, "FLUTTERWAVE");
  assert.equal(body.paymentStatus, "PENDING");
  assert.equal(body.sandbox, true);
  assert.equal(body.durationMonths, 3);
  assert.equal(body.monthlyAmount, 25000);
  assert.equal(body.discountPercent, 5);
  assert.equal(body.totalAmount, 71250);
  assert.equal(body.currency, "RWF");
  assert.equal(body.checkoutUrl, undefined);

  const payments = await prisma.payment.findMany({
    where: { tenantId: f.tenant.id },
  });

  assert.equal(payments.length, 1);

  const payment = payments[0];

  assert.equal(payment.reference, body.paymentReference);
  assert.equal(payment.status, "PENDING");
  assert.equal(payment.amount, 71250);
  assert.equal(payment.renewalQuote.durationMonths, 3);

  const attempts = await prisma.paymentAttempt.findMany({
    where: { paymentId: payment.id },
  });

  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].status, "CREATED");
  assert.equal(attempts[0].checkoutReference, payment.reference);
  assert.equal(attempts[0].checkoutUrl, null);
  assert.equal(attempts[0].verifiedAt, null);
  assert.equal(attempts[0].appliedAt, null);

  const config = body.inlineConfig;

  assert.equal(config.public_key, "FLWPUBK_TEST-INTEGRATION-FAKE");
  assert.equal(config.tx_ref, payment.reference);
  assert.equal(config.amount, 71250);
  assert.equal(config.currency, "RWF");
  assert.equal(config.customer.email, f.owner.email);
  assert.equal(config.redirect_url, undefined);

  const serialized = JSON.stringify(body);

  assert.ok(!serialized.includes("FLWSECK"));
  assert.ok(!serialized.includes(f.tenant.id));
  assert.ok(!serialized.includes(f.owner.id));

  const after = await prisma.subscription.findUnique({
    where: { tenantId: f.tenant.id },
  });

  assert.equal(after.accessMode, "TRIAL");
  assert.equal(after.planKey, "TRIAL");
  assert.equal(after.nextPlanKey, null);
  assert.equal(after.queuedRenewalReference, null);
  assert.equal(
    after.endDate.toISOString(),
    f.subscription.endDate.toISOString()
  );

  assert.equal(providerCalls, 0);
});


// STEP 342CN-DM / INLINE COMPLETION LIFECYCLE
const {
  completeSandboxRenewal,
} = require("../../src/modules/payments/flutterwaveSandboxRenewalCompletion");

const inlineVerificationEnv = {
  NODE_ENV: "development",
  FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "true",
  FLUTTERWAVE_SANDBOX_INLINE_ENABLED: "true",
  FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED: "true",
  FLUTTERWAVE_LIVE_ENABLED: "false",
  FLUTTERWAVE_TEST_SECRET_KEY: "FLWSECK_TEST-INTEGRATION-FAKE",
  FLUTTERWAVE_TEST_PUBLIC_KEY: "FLWPUBK_TEST-INTEGRATION-FAKE",
};

async function completeInline(f, reference, fetchImpl, env = inlineVerificationEnv) {
  return completeSandboxRenewal({
    prisma,
    reference,
    tenantId: f.tenant.id,
    fetchImpl,
    env,
    loadTrustedPlan: async payment => ({
      planKey: payment.planKey,
      tierKey: payment.tierKey,
      cycleKey: payment.cycleKey,
      staffLimit: payment.staffLimit,
      branchLimit: payment.branchLimit,
      price: payment.priceAmount,
      currency: payment.currency,
      entitlements: payment.entitlementSnapshot || {},
      days: 30,
      graceDays: 7,
    }),
  });
}

function providerResponse(reference, amount, status = "successful") {
  return {
    ok: true,
    async json() {
      return {
        status: "success",
        data: {
          id: 847291163,
          tx_ref: reference,
          amount,
          currency: "RWF",
          status,
        },
      };
    },
  };
}

test("Inline without verified provider payment stays pending", async () => {
  const f = await fixture();
  const response = await checkout(f);
  assert.equal(response.statusCode, 201, JSON.stringify(response.body));

  const reference = response.body.paymentReference;
  let requests = 0;

  const result = await completeInline(f, reference, async url => {
    requests++;
    assert.equal(
      new URL(url).searchParams.get("tx_ref"),
      reference
    );
    return providerResponse(reference, 71250, "pending");
  });

  assert.equal(result.status, "PENDING");
  assert.equal(requests, 1);

  const payment = await prisma.payment.findUnique({ where: { reference } });
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { checkoutReference: reference },
  });
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId: f.tenant.id },
  });

  assert.equal(payment.status, "PENDING");
  assert.equal(attempt.status, "CREATED");
  assert.equal(attempt.verifiedAt, null);
  assert.equal(attempt.appliedAt, null);
  assert.equal(subscription.endDate.toISOString(), f.subscription.endDate.toISOString());
});

test("mismatched provider amount cannot activate Inline payment", async () => {
  const f = await fixture();
  const response = await checkout(f);
  assert.equal(response.statusCode, 201, JSON.stringify(response.body));

  const reference = response.body.paymentReference;

  const result = await completeInline(
    f,
    reference,
    async () => providerResponse(reference, 1)
  );

  assert.equal(result.status, "PENDING");

  const payment = await prisma.payment.findUnique({ where: { reference } });
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { checkoutReference: reference },
  });

  assert.equal(payment.status, "PENDING");
  assert.equal(attempt.status, "CREATED");
  assert.equal(attempt.verifiedAt, null);
});

test("verified Inline completes once without hosted checkout URL", async () => {
  const f = await fixture();
  const response = await checkout(f);
  assert.equal(response.statusCode, 201, JSON.stringify(response.body));

  const reference = response.body.paymentReference;

  const initialAttempt = await prisma.paymentAttempt.findUnique({
    where: { checkoutReference: reference },
  });
  assert.equal(initialAttempt.checkoutUrl, null);
  assert.equal(
    initialAttempt.verificationDetails?.checkoutMethod,
    "FLUTTERWAVE_SANDBOX_INLINE"
  );

  let requests = 0;

  const verifiedProvider = async (url, options) => {
    requests++;
    const parsed = new URL(url);
    assert.equal(
      parsed.origin + parsed.pathname,
      "https://api.flutterwave.com/v3/transactions/verify_by_reference"
    );
    assert.equal(parsed.searchParams.get("tx_ref"), reference);
    assert.equal(options.method, "GET");
    return providerResponse(reference, 71250);
  };

  const result = await completeInline(f, reference, verifiedProvider);

  assert.equal(result.status, "SUCCESS");
  assert.equal(result.alreadyCompleted, false);
  assert.equal(requests, 1);

  const payment = await prisma.payment.findUnique({ where: { reference } });
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { checkoutReference: reference },
  });
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId: f.tenant.id },
  });

  assert.equal(payment.status, "SUCCESS");
  assert.equal(attempt.status, "APPLIED");
  assert.ok(attempt.verifiedAt instanceof Date);
  assert.ok(attempt.appliedAt instanceof Date);
  assert.equal(attempt.checkoutUrl, null);
  assert.equal(attempt.verificationDetails?.verificationSource,
    "FLUTTERWAVE_TRANSACTION_VERIFY");
  assert.ok(subscription);

  const repeat = await completeInline(f, reference, async () => {
    throw new Error("STOP: Duplicate completion called Flutterwave");
  });

  assert.equal(repeat.status, "SUCCESS");
  assert.equal(repeat.alreadyCompleted, true);
  assert.equal(requests, 1);
});
