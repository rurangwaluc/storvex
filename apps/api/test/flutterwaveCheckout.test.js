"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createFlutterwaveTestCheckout,
} = require("../src/modules/payments/flutterwaveCheckout");

const basePayment = {
  reference: "SVX_TEST_202_001",
  amount: 10000,
  currency: "RWF",
  status: "PENDING",
  purpose: "OWNER_SIGNUP",
  planKey: "STARTER_MONTHLY",
  intentId: "intent-test-001",
};

const customer = {
  email: "customer@example.com",
  name: "Test Customer",
};

const redirectUrl =
  "https://storvex.rw/payment/return";

function createFixture(overrides = {}) {
  const calls = [];

  const fetchImpl = async (url, options) => {
    calls.push({
      url,
      body: JSON.parse(options.body),
    });

    return {
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          link: "https://checkout.flutterwave.com/v3/hosted/pay-test",
        },
      }),
    };
  };

  return {
    calls,
    args: {
      payment: basePayment,
      customer,
      redirectUrl,
      secretKey: "FLWSECK_TEST-FAKE",
      fetchImpl,
      ...overrides,
    },
  };
}

test("1. Creates pending signup checkout", async () => {
  const fixture = createFixture();
  const result = await createFlutterwaveTestCheckout(fixture.args);

  assert.equal(result.status, "PENDING");
  assert.equal(result.provider, "FLUTTERWAVE");
  assert.equal(result.reference, basePayment.reference);
  assert.equal(fixture.calls.length, 1);
});

test("2. Uses trusted backend amount and reference", async () => {
  const fixture = createFixture();

  await createFlutterwaveTestCheckout(fixture.args);

  assert.equal(fixture.calls[0].body.amount, 10000);
  assert.equal(
    fixture.calls[0].body.tx_ref,
    basePayment.reference
  );
  assert.equal(fixture.calls[0].body.currency, "RWF");
});

test("3. Supports subscription renewal", async () => {
  const fixture = createFixture({
    payment: {
      ...basePayment,
      purpose: "SUBSCRIPTION_RENEWAL",
      intentId: null,
      tenantId: "tenant-test-001",
    },
  });

  const result = await createFlutterwaveTestCheckout(fixture.args);

  assert.equal(result.status, "PENDING");
  assert.equal(fixture.calls.length, 1);
});

test("4. Rejects invalid payment amount", async () => {
  const fixture = createFixture({
    payment: { ...basePayment, amount: -100 },
  });

  await assert.rejects(
    createFlutterwaveTestCheckout(fixture.args),
    /Invalid trusted payment record/
  );

  assert.equal(fixture.calls.length, 0);
});

test("5. Rejects successful or reused payment records", async () => {
  const fixture = createFixture({
    payment: { ...basePayment, status: "SUCCESS" },
  });

  await assert.rejects(
    createFlutterwaveTestCheckout(fixture.args),
    /Invalid trusted payment record/
  );

  assert.equal(fixture.calls.length, 0);
});

test("6. Rejects missing signup ownership", async () => {
  const fixture = createFixture({
    payment: { ...basePayment, intentId: null },
  });

  await assert.rejects(
    createFlutterwaveTestCheckout(fixture.args),
    /Signup payment requires intent identity/
  );

  assert.equal(fixture.calls.length, 0);
});

test("7. Rejects insecure redirect URLs", async () => {
  const fixture = createFixture({
    redirectUrl: "http://example.com/payment",
  });

  await assert.rejects(
    createFlutterwaveTestCheckout(fixture.args),
    /HTTPS checkout return URL required/
  );

  assert.equal(fixture.calls.length, 0);
});

test("8. Rejects live credentials", async () => {
  const fixture = createFixture({
    secretKey: "FLWSECK_LIVE-FAKE",
  });

  await assert.rejects(
    createFlutterwaveTestCheckout(fixture.args),
    /Flutterwave test secret required/
  );

  assert.equal(fixture.calls.length, 0);
});

test("9. Rejects untrusted checkout links", async () => {
  const fixture = createFixture({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          link: "https://fake-flutterwave.example/checkout",
        },
      }),
    }),
  });

  await assert.rejects(
    createFlutterwaveTestCheckout(fixture.args),
    /Invalid Flutterwave checkout response/
  );
});

test("10. Never activates subscriptions", async () => {
  const fixture = createFixture();
  const result = await createFlutterwaveTestCheckout(fixture.args);

  assert.equal(result.status, "PENDING");
  assert.equal("subscription" in result, false);
  assert.equal("activated" in result, false);
});
