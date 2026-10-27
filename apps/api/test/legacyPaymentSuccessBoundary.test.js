"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../src/modules/auth/payment.controller.js"),
  "utf8"
);

const signatures = [
  "markSignupPaymentSuccessful({ payment, provider })",
  "markRenewalPaymentSuccessful({ payment, provider })",
  "markPaymentSuccessfulByReference({ reference, provider })",
];

for (const signature of signatures) {
  test(`Legacy success disabled: ${signature}`, () => {
    const anchor = `async function ${signature} {`;
    const start = source.indexOf(anchor);

    assert.notEqual(start, -1);
    assert.equal(source.indexOf(anchor, start + 1), -1);

    const entry = source.slice(start + anchor.length, start + anchor.length + 350);

    assert.match(
      entry,
      /LEGACY_PAYMENT_SUCCESS_DISABLED/
    );
    assert.match(entry, /throw error;/);
  });
}

test("Legacy callback route remains disabled", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/modules/auth/auth.routes.js"),
    "utf8"
  );

  const start = routes.indexOf('"/payments/momo/callback"');
  assert.notEqual(start, -1);

  assert.ok(
    routes.slice(start, start + 250).includes("res.status(503)"),
    "Legacy callback must respond with HTTP 503"
  );
});
