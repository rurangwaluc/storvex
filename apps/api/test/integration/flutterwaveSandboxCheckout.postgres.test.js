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
  getRenewalPaymentStatus,
  getPendingFlutterwaveRenewal,
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


async function recoveryStatus(reference, tenantId) {
  const req = {
    user: { tenantId, role: "OWNER" },
    params: { reference },
    query: {},
  };
  const res = responseRecorder();
  await getRenewalPaymentStatus(req, res);
  return res;
}

test("hosted recovery returns the saved checkout", async () => {
  const f = await fixture();
  const created = await checkout(f, 1);

  assert.equal(created.statusCode, 201);

  const status = await recoveryStatus(
    created.body.paymentReference,
    f.tenant.id
  );

  assert.equal(status.statusCode, 200);
  assert.equal(status.body.payment.status, "PENDING");
  assert.equal(
    status.body.checkoutRecovery.state,
    "HOSTED_CHECKOUT_AVAILABLE"
  );
  assert.equal(
    status.body.checkoutRecovery.checkoutUrl,
    created.body.checkoutUrl
  );
});

test("hosted recovery preserves unresolved checkout", async () => {
  const f = await fixture();

  const original = global.fetch;
  global.fetch = async () => ({ ok: false, status: 503 });

  let reference;

  try {
    const failed = await checkout(f, 1);
    assert.notEqual(failed.statusCode, 201);

    const payment = await prisma.payment.findFirst({
      where: {
        tenantId: f.tenant.id,
        purpose: "SUBSCRIPTION_RENEWAL",
      },
    });

    assert.ok(payment);
    reference = payment.reference;
  } finally {
    global.fetch = original;
  }

  const status = await recoveryStatus(reference, f.tenant.id);

  assert.equal(status.statusCode, 200);
  assert.equal(status.body.payment.status, "PENDING");
  assert.equal(
    status.body.checkoutRecovery.state,
    "RECONCILIATION_REQUIRED"
  );
  assert.equal(status.body.checkoutRecovery.checkoutUrl, null);
});

test("hosted recovery denies another tenant", async () => {
  const owner = await fixture();
  const outsider = await fixture();

  const created = await checkout(owner, 1);
  assert.equal(created.statusCode, 201);

  const status = await recoveryStatus(
    created.body.paymentReference,
    outsider.tenant.id
  );

  assert.equal(status.statusCode, 404);
  assert.equal(status.body.checkoutRecovery, undefined);
});

test("completed renewal exposes no checkout redirect", async () => {
  const f = await fixture();
  const created = await checkout(f, 1);
  assert.equal(created.statusCode, 201);

  const payment = await prisma.payment.findUnique({
    where: { reference: created.body.paymentReference },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "SUCCESS" },
  });

  const status = await recoveryStatus(
    created.body.paymentReference,
    f.tenant.id
  );

  assert.equal(status.statusCode, 200);
  assert.equal(
    status.body.checkoutRecovery.state,
    "COMPLETED"
  );
  assert.equal(status.body.checkoutRecovery.checkoutUrl, null);
});


test("hosted recovery rejects unsafe checkout URLs", async () => {
  const f = await fixture();
  const created = await checkout(f, 1);

  assert.equal(created.statusCode, 201);

  const reference = created.body.paymentReference;

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { checkoutReference: reference },
  });

  assert.ok(attempt);

  const unsafeUrls = [
    "https://checkout-v2.dev-flutterwave.com.evil.example/checkout",
    "https://evil.example/checkout",
    "http://checkout-v2.dev-flutterwave.com/checkout",
    "https://user:password@checkout-v2.dev-flutterwave.com/checkout",
    "https://checkout-v2.dev-flutterwave.com/checkout#fragment",
    "javascript:alert(1)",
    "not-a-url",
  ];

  for (const unsafeUrl of unsafeUrls) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { checkoutUrl: unsafeUrl },
    });

    const result = await recoveryStatus(
      reference,
      f.tenant.id
    );

    assert.equal(result.statusCode, 200);
    assert.equal(result.body.payment.status, "PENDING");
    assert.equal(
      result.body.checkoutRecovery.state,
      "RECONCILIATION_REQUIRED"
    );
    assert.equal(
      result.body.checkoutRecovery.checkoutUrl,
      null
    );
  }

  await prisma.paymentAttempt.update({
    where: { id: attempt.id },
    data: {
      checkoutUrl:
        "https://checkout-v2.dev-flutterwave.com/valid-session",
    },
  });

  const valid = await recoveryStatus(reference, f.tenant.id);

  assert.equal(valid.statusCode, 200);
  assert.equal(
    valid.body.checkoutRecovery.state,
    "HOSTED_CHECKOUT_AVAILABLE"
  );
  assert.equal(
    valid.body.checkoutRecovery.checkoutUrl,
    "https://checkout-v2.dev-flutterwave.com/valid-session"
  );
});


async function pendingRenewalFor(tenantId) {
  const req = {
    user: { tenantId, role: "OWNER" },
  };
  const res = responseRecorder();

  await getPendingFlutterwaveRenewal(req, res);

  return res;
}

test("pending renewal lookup returns no payment when empty", async () => {
  const f = await fixture();
  const result = await pendingRenewalFor(f.tenant.id);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.pendingRenewal, null);
});

test("pending renewal lookup recovers hosted reference", async () => {
  const f = await fixture();
  const created = await checkout(f, 1);

  assert.equal(created.statusCode, 201);

  const result = await pendingRenewalFor(f.tenant.id);

  assert.equal(result.statusCode, 200);
  assert.equal(
    result.body.pendingRenewal.reference,
    created.body.paymentReference
  );
});

test("pending renewal lookup recovers failed checkout request", async () => {
  const f = await fixture();
  const originalFetch = global.fetch;

  try {
    global.fetch = async () => {
      throw new Error("SIMULATED_CHECKOUT_TIMEOUT");
    };

    const result = await checkout(f, 1);
    assert.notEqual(result.statusCode, 201);
  } finally {
    global.fetch = originalFetch;
  }

  const lookup = await pendingRenewalFor(f.tenant.id);

  assert.equal(lookup.statusCode, 200);
  assert.ok(lookup.body.pendingRenewal?.reference);

  const status = await recoveryStatus(
    lookup.body.pendingRenewal.reference,
    f.tenant.id
  );

  assert.equal(status.statusCode, 200);
  assert.equal(
    status.body.checkoutRecovery.state,
    "RECONCILIATION_REQUIRED"
  );
});

test("pending renewal lookup never exposes another tenant", async () => {
  const owner = await fixture();
  const outsider = await fixture();

  const created = await checkout(owner, 1);
  assert.equal(created.statusCode, 201);

  const outsiderResult =
    await pendingRenewalFor(outsider.tenant.id);

  assert.equal(outsiderResult.statusCode, 200);
  assert.equal(
    outsiderResult.body.pendingRenewal,
    null
  );

  const unauthenticated = responseRecorder();

  await getPendingFlutterwaveRenewal(
    { user: {} },
    unauthenticated
  );

  assert.equal(unauthenticated.statusCode, 403);
});

test("completed renewal is excluded from pending lookup", async () => {
  const f = await fixture();
  const created = await checkout(f, 1);

  assert.equal(created.statusCode, 201);

  await prisma.payment.update({
    where: {
      reference: created.body.paymentReference,
    },
    data: {
      status: "SUCCESS",
    },
  });

  const result = await pendingRenewalFor(f.tenant.id);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.pendingRenewal, null);
});

test("old pending renewal remains verifiable but is not auto-discovered", async () => {
  const f = await fixture();
  const created = await checkout(f, 1);
  assert.equal(created.statusCode, 201);

  await prisma.payment.update({
    where: { reference: created.body.paymentReference },
    data: {
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
    },
  });

  const lookup = await pendingRenewalFor(f.tenant.id);
  assert.equal(lookup.statusCode, 200);
  assert.equal(lookup.body.pendingRenewal, null);

  const originalStatus = await recoveryStatus(
    created.body.paymentReference,
    f.tenant.id
  );
  assert.equal(originalStatus.statusCode, 200);
  assert.equal(
    originalStatus.body.payment.reference,
    created.body.paymentReference
  );
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
  process.env.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED = "true";

  const expectations = [
    [1, 0, 10000],
    [3, 5, 28500],
    [6, 10, 54000],
    [12, 15, 102000],
  ];

  try {
    for (const [months, discount, total] of expectations) {
      // Independent tenant: previous pending checkout must not be bypassed.
      const f = await fixture();
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



test("provider HTTP rejection preserves unresolved renewal", async () => {
  const f = await fixture();
  const subscriptionBefore = await prisma.subscription.findUnique({
    where: { tenantId: f.tenant.id },
  });

  const original = global.fetch;
  global.fetch = async () => ({ ok: false, status: 503 });

  try {
    const res = await checkout(f, 1);
    assert.notEqual(res.statusCode, 201);

    const payments = await prisma.payment.findMany({
      where: { tenantId: f.tenant.id, purpose: "SUBSCRIPTION_RENEWAL" },
      include: { attempts: true },
    });

    assert.equal(payments.length, 1);
    assert.equal(payments[0].status, "PENDING");
    assert.equal(payments[0].attempts.length, 1);
    assert.equal(payments[0].attempts[0].checkoutUrl, null);

    const after = await prisma.subscription.findUnique({
      where: { tenantId: f.tenant.id },
    });
    assert.equal(after.endDate.toISOString(), subscriptionBefore.endDate.toISOString());
  } finally {
    global.fetch = original;
  }
});

test("uncertain hosted timeout preserves payment for reconciliation", async () => {
  const f = await fixture();
  const subscriptionBefore = await prisma.subscription.findUnique({
    where: { tenantId: f.tenant.id },
  });

  const original = global.fetch;
  global.fetch = async () => {
    throw new Error("SIMULATED_PROVIDER_TIMEOUT");
  };

  try {
    const res = await checkout(f, 1);
    assert.notEqual(res.statusCode, 201);

    const payments = await prisma.payment.findMany({
      where: { tenantId: f.tenant.id, purpose: "SUBSCRIPTION_RENEWAL" },
      include: { attempts: true },
    });

    assert.equal(payments.length, 1);
    assert.equal(payments[0].status, "PENDING");
    assert.equal(payments[0].attempts.length, 1);
    assert.equal(payments[0].attempts[0].checkoutUrl, null);

    const after = await prisma.subscription.findUnique({
      where: { tenantId: f.tenant.id },
    });
    assert.equal(after.endDate.toISOString(), subscriptionBefore.endDate.toISOString());
  } finally {
    global.fetch = original;
  }
});


test("Flutterwave webhook HTTP acceptance: authentication, verification and replay", async () => {
  const secret =
    "STORVEX-INTEGRATION-WEBHOOK-SECRET-0123456789";

  const previousSecret =
    process.env.FLUTTERWAVE_TEST_WEBHOOK_SECRET_HASH;

  const checkoutFetch = global.fetch;
  const httpFetch = originalFetch;

  let server;

  process.env.FLUTTERWAVE_TEST_WEBHOOK_SECRET_HASH = secret;

  try {
    const good = await fixture();
    const wrong = await fixture();

    const goodCheckout = await checkout(good, 1);
    const wrongCheckout = await checkout(wrong, 1);

    assert.equal(goodCheckout.statusCode, 201);
    assert.equal(wrongCheckout.statusCode, 201);

    const goodReference = goodCheckout.body.paymentReference;
    const wrongReference = wrongCheckout.body.paymentReference;

    const goodBefore = await prisma.subscription.findUnique({
      where: { tenantId: good.tenant.id },
    });

    const wrongBefore = await prisma.subscription.findUnique({
      where: { tenantId: wrong.tenant.id },
    });

    const app = require("../../src/app");

    server = await new Promise((resolve, reject) => {
      const instance = app.listen(
        0,
        "127.0.0.1",
        () => resolve(instance)
      );
      instance.once("error", reject);
    });

    const port = server.address().port;
    const url =
      `http://127.0.0.1:${port}/api/billing/flutterwave/webhook`;

    const event = reference => ({
      event: "charge.completed",
      data: {
        status: "successful",
        tx_ref: reference,

        // Deliberately untrusted webhook values.
        amount: 999999,
        currency: "USD",
      },
    });

    async function deliver(reference, signature = secret, payload) {
      const response = await httpFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signature == null
            ? {}
            : { "verif-hash": signature }),
        },
        body: JSON.stringify(payload || event(reference)),
      });

      await response.arrayBuffer();
      return response.status;
    }

    let verificationCalls = 0;

    global.fetch = async (providerUrl, options) => {
      verificationCalls++;

      const parsed = new URL(providerUrl);

      assert.equal(
        parsed.origin + parsed.pathname,
        "https://api.flutterwave.com/v3/transactions/verify_by_reference"
      );

      assert.equal(options.method, "GET");

      assert.equal(
        options.headers.Authorization,
        "Bearer FLWSECK_TEST-INTEGRATION-FAKE"
      );

      const reference = parsed.searchParams.get("tx_ref");

      return {
        ok: true,
        async json() {
          return {
            status: "success",
            data: {
              id: reference === goodReference
                ? 913570001
                : 913570002,
              status: "successful",
              tx_ref: reference,

              // Only the first payment has a matching amount.
              amount: reference === goodReference
                ? goodCheckout.body.totalAmount
                : 1,

              currency: "RWF",
            },
          };
        },
      };
    };

    // Authentication must reject forged or missing headers
    // before any provider lookup.
    assert.equal(
      await deliver(goodReference, null),
      401
    );

    assert.equal(
      await deliver(goodReference, "WRONG-WEBHOOK-SECRET"),
      401
    );

    assert.equal(verificationCalls, 0);

    const beforeAuthentication =
      await prisma.subscription.findUnique({
        where: { tenantId: good.tenant.id },
      });

    assert.equal(
      beforeAuthentication.endDate.toISOString(),
      goodBefore.endDate.toISOString()
    );

    // Unknown payment references cannot create payments.
    assert.equal(
      await deliver("RENEW_99999999999_UNKNOWN"),
      200
    );

    assert.equal(verificationCalls, 0);

    // Successful notification still requires an independent
    // provider verification of amount, currency and reference.
    assert.equal(
      await deliver(wrongReference),
      503
    );

    const wrongPayment = await prisma.payment.findUnique({
      where: { reference: wrongReference },
    });

    const wrongAfter = await prisma.subscription.findUnique({
      where: { tenantId: wrong.tenant.id },
    });

    assert.equal(wrongPayment.status, "PENDING");
    assert.equal(
      wrongAfter.endDate.toISOString(),
      wrongBefore.endDate.toISOString()
    );

    // A temporary provider outage must not activate payment.
    // Returning 503 allows a later webhook retry.
    const successfulProviderFetch = global.fetch;

    global.fetch = async () => ({
      ok: false,
      status: 503,
    });

    assert.equal(
      await deliver(goodReference),
      503
    );

    const pendingAfterOutage = await prisma.payment.findUnique({
      where: { reference: goodReference },
    });

    const subscriptionAfterOutage =
      await prisma.subscription.findUnique({
        where: { tenantId: good.tenant.id },
      });

    assert.equal(pendingAfterOutage.status, "PENDING");
    assert.equal(
      subscriptionAfterOutage.endDate.toISOString(),
      goodBefore.endDate.toISOString()
    );

    // Restore the verified provider and retry the same event.
    global.fetch = successfulProviderFetch;

    assert.equal(
      await deliver(goodReference),
      200
    );

    const goodPayment = await prisma.payment.findUnique({
      where: { reference: goodReference },
    });

    const goodAttempt = await prisma.paymentAttempt.findUnique({
      where: { checkoutReference: goodReference },
    });

    const goodAfter = await prisma.subscription.findUnique({
      where: { tenantId: good.tenant.id },
    });

    assert.equal(goodPayment.status, "SUCCESS");
    assert.equal(goodAttempt.status, "APPLIED");
    assert.ok(goodAttempt.appliedAt instanceof Date);

    assert.ok(
      goodAfter.endDate.getTime() >
      goodBefore.endDate.getTime()
    );

    const endDateAfterFirstDelivery =
      goodAfter.endDate.toISOString();

    const callsBeforeReplay = verificationCalls;

    // Replayed notifications must not extend the subscription
    // or verify and apply the payment a second time.
    assert.equal(
      await deliver(goodReference),
      200
    );

    const goodAfterReplay =
      await prisma.subscription.findUnique({
        where: { tenantId: good.tenant.id },
      });

    assert.equal(
      goodAfterReplay.endDate.toISOString(),
      endDateAfterFirstDelivery
    );

    assert.equal(
      verificationCalls,
      callsBeforeReplay
    );

    console.log(
      "PASS: HTTP webhook rejects forged authentication."
    );
    console.log(
      "PASS: Unknown references cannot create payments."
    );
    console.log(
      "PASS: Provider amount mismatch cannot activate a subscription."
    );
    console.log(
      "PASS: Verified payment activates exactly once."
    );
    console.log(
      "PASS: Replayed notification does not extend subscription."
    );

  } finally {
    global.fetch = checkoutFetch;

    if (server) {
      await new Promise((resolve, reject) => {
        server.close(error =>
          error ? reject(error) : resolve()
        );
      });
    }

    if (previousSecret === undefined) {
      delete process.env.FLUTTERWAVE_TEST_WEBHOOK_SECRET_HASH;
    } else {
      process.env.FLUTTERWAVE_TEST_WEBHOOK_SECRET_HASH =
        previousSecret;
    }
  }
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
