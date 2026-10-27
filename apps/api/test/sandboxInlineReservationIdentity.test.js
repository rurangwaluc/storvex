"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const reservation = fs.readFileSync(
  path.resolve(
    __dirname,
    "../src/modules/payments/flutterwaveCheckoutReservation.js"
  ),
  "utf8"
);

const controller = fs.readFileSync(
  path.resolve(
    __dirname,
    "../src/modules/billing/billing.controller.js"
  ),
  "utf8"
);

test("hosted checkout remains the reservation default", () => {
  assert.match(
    reservation,
    /checkoutMethod = "FLUTTERWAVE_SANDBOX"/
  );
});

test("unsupported checkout methods are rejected", () => {
  assert.match(
    reservation,
    /checkoutMethod !== "FLUTTERWAVE_SANDBOX"/
  );
  assert.match(
    reservation,
    /checkoutMethod !== "FLUTTERWAVE_SANDBOX_INLINE"/
  );
});

test("Inline must pass its own runtime gate", () => {
  assert.match(
    reservation,
    /if \(isInline\) \{\s*requireSandboxInlineRuntime\(env\)/
  );
});

test("Inline identity is persisted on its reserved attempt", () => {
  assert.match(
    reservation,
    /verificationDetails:\s*\{\s*checkoutMethod: "FLUTTERWAVE_SANDBOX_INLINE"/
  );
});

test("controller selects method from trusted server branch", () => {
  assert.match(
    controller,
    /checkoutMethod: inlineRequested\s*\?\s*"FLUTTERWAVE_SANDBOX_INLINE"\s*:\s*"FLUTTERWAVE_SANDBOX"/
  );
});

test("hosted checkout still saves its provider URL", () => {
  assert.match(
    controller,
    /checkoutUrl: checkout\.checkoutUrl/
  );
});
