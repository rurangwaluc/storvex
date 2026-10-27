"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  requireFlutterwaveSandboxRuntime,
} = require("../src/modules/payments/flutterwaveSandboxRuntimeGate");

function safeEnvironment(overrides = {}) {
  return {
    NODE_ENV: "development",
    FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: "true",
    FLUTTERWAVE_LIVE_ENABLED: "false",
    FLUTTERWAVE_TEST_SECRET_KEY: "FLWSECK_TEST-unit-test-only",
    ...overrides,
  };
}

function rejected(environment) {
  assert.throws(
    () => requireFlutterwaveSandboxRuntime(environment),
    {
      code: "FLUTTERWAVE_SANDBOX_DISABLED",
      status: 503,
    }
  );
}

test("1. Allows explicitly configured development sandbox", () => {
  assert.equal(
    requireFlutterwaveSandboxRuntime(safeEnvironment()),
    true
  );
});

test("2. Rejects production", () => {
  rejected(safeEnvironment({ NODE_ENV: "production" }));
});

test("3. Rejects test and unspecified runtime modes", () => {
  rejected(safeEnvironment({ NODE_ENV: "test" }));
  rejected(safeEnvironment({ NODE_ENV: undefined }));
});

test("4. Rejects missing sandbox opt-in", () => {
  rejected(
    safeEnvironment({
      FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED: undefined,
    })
  );
});

test("5. Rejects explicit live-payment mode", () => {
  rejected(
    safeEnvironment({
      FLUTTERWAVE_LIVE_ENABLED: "true",
    })
  );
});

test("6. Rejects missing or live credentials", () => {
  rejected(
    safeEnvironment({
      FLUTTERWAVE_TEST_SECRET_KEY: undefined,
    })
  );

  rejected(
    safeEnvironment({
      FLUTTERWAVE_TEST_SECRET_KEY: "FLWSECK-live-example",
    })
  );
});

test("7. Rejects invalid environment input", () => {
  rejected(null);
  rejected("development");
});
