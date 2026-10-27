"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  verifySandboxPaymentByReference,
} = require("../src/modules/payments/flutterwaveSandboxReferenceVerification");

const reference = "RENEW_TEST_12345678";

const env = {
  NODE_ENV: "development",
  FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "true",
  FLUTTERWAVE_LIVE_ENABLED: "false",
  FLUTTERWAVE_TEST_SECRET_KEY: "FLWSECK_TEST-FAKE",
};

function provider(overrides = {}) {
  return async (url, options) => {
    assert.equal(
      new URL(url).searchParams.get("tx_ref"),
      reference
    );
    assert.equal(options.method, "GET");
    assert.match(options.headers.Authorization, /^Bearer FLWSECK_TEST-/);

    return {
      ok: true,
      json: async () => ({
        status: "success",
        data: {
          id: 123456789,
          tx_ref: reference,
          amount: 10000,
          currency: "RWF",
          status: "successful",
          ...overrides,
        },
      }),
    };
  };
}

function verify(overrides = {}, fetchImpl = provider()) {
  return verifySandboxPaymentByReference({
    reference,
    amount: 10000,
    currency: "RWF",
    env: { ...env, ...overrides },
    fetchImpl,
  });
}

test("Accepts independently verified payment", async () => {
  const result = await verify();
  assert.equal(result.verified, true);
  assert.equal(result.transactionId, 123456789);
});

test("Rejects incorrect payment reference", async () => {
  const result = await verify(
    {},
    provider({ tx_ref: "RENEW_WRONG_12345678" })
  );
  assert.equal(result.verified, false);
});

test("Rejects incorrect amount", async () => {
  const result = await verify({}, provider({ amount: 9999 }));
  assert.equal(result.verified, false);
});

test("Rejects incorrect currency", async () => {
  const result = await verify({}, provider({ currency: "USD" }));
  assert.equal(result.verified, false);
});

test("Rejects pending transaction", async () => {
  const result = await verify({}, provider({ status: "pending" }));
  assert.equal(result.verified, false);
});

test("Rejects production runtime", async () => {
  await assert.rejects(
    verify({ NODE_ENV: "production" }),
    /unavailable/
  );
});

test("Rejects disabled sandbox", async () => {
  await assert.rejects(
    verify({ FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "false" }),
    /unavailable/
  );
});

test("Rejects live-payment flag", async () => {
  await assert.rejects(
    verify({ FLUTTERWAVE_LIVE_ENABLED: "true" }),
    /unavailable/
  );
});

test("Rejects missing test secret", async () => {
  await assert.rejects(
    verify({ FLUTTERWAVE_TEST_SECRET_KEY: "" }),
    /unavailable/
  );
});

test("Provider failure cannot verify payment", async () => {
  const result = await verify({}, async () => ({ ok: false }));
  assert.equal(result.verified, false);
});
