"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  authenticateWebhook,
  parseWebhook,
} = require("../src/modules/payments/flutterwaveSandboxWebhookSecurity");

const env = {
  NODE_ENV: "development",
  FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "true",
  FLUTTERWAVE_LIVE_ENABLED: "false",
  FLUTTERWAVE_TEST_SECRET_KEY: "FLWSECK_TEST-FAKE",
  FLUTTERWAVE_TEST_WEBHOOK_SECRET_HASH:
    "0123456789abcdef0123456789abcdef",
};

function request(header, body) {
  return {
    headers: header ? { "verif-hash": header } : {},
    body: body === undefined ? Buffer.from("{}") : body,
  };
}

test("valid dedicated webhook secret authenticates", () => {
  assert.equal(
    authenticateWebhook(
      request(env.FLUTTERWAVE_TEST_WEBHOOK_SECRET_HASH),
      env
    ).ok,
    true
  );
});

test("missing webhook signature is rejected", () => {
  assert.equal(authenticateWebhook(request(), env).status, 401);
});

test("incorrect signature is rejected", () => {
  assert.equal(
    authenticateWebhook(request("x".repeat(32)), env).status,
    401
  );
});

test("unconfigured secret fails closed", () => {
  const { FLUTTERWAVE_TEST_WEBHOOK_SECRET_HASH, ...disabled } = env;
  assert.equal(
    authenticateWebhook(request(), disabled).status,
    503
  );
});

test("production runtime cannot accept sandbox events", () => {
  assert.throws(
    () => authenticateWebhook(
      request(env.FLUTTERWAVE_TEST_WEBHOOK_SECRET_HASH),
      { ...env, NODE_ENV: "production" }
    ),
    /unavailable/i
  );
});

test("valid notification only supplies a lookup reference", () => {
  const result = parseWebhook(request(
    "signature",
    Buffer.from(JSON.stringify({
      event: "charge.completed",
      data: {
        status: "successful",
        tx_ref: "RENEW_12345678_ABCDEF12",
        amount: 999999,
        currency: "USD",
      },
    }))
  ));

  assert.deepEqual(result, {
    relevant: true,
    reference: "RENEW_12345678_ABCDEF12",
  });
});

test("malformed JSON cannot be processed", () => {
  assert.equal(
    parseWebhook(request("signature", Buffer.from("{"))),
    null
  );
});

test("failed and unrelated events cannot initiate verification", () => {
  for (const payload of [
    { event: "charge.completed", data: { status: "failed" } },
    { event: "transfer.completed", data: { status: "successful" } },
    { event: "charge.completed", data: { status: "successful", tx_ref: "../x" } },
  ]) {
    assert.equal(
      parseWebhook(request(
        "signature",
        Buffer.from(JSON.stringify(payload))
      )).relevant,
      false
    );
  }
});
