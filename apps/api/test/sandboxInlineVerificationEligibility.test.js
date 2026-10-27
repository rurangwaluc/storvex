"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const verifier = fs.readFileSync(
  path.resolve(
    __dirname,
    "../src/modules/payments/flutterwaveSandboxVerifiedRenewal.js"
  ),
  "utf8"
);

const reservation = fs.readFileSync(
  path.resolve(
    __dirname,
    "../src/modules/payments/flutterwaveCheckoutReservation.js"
  ),
  "utf8"
);

test("Inline eligibility requires its persisted checkout method", () => {
  assert.match(
    verifier,
    /attempt\?\.verificationDetails\?\.checkoutMethod ===\s*"FLUTTERWAVE_SANDBOX_INLINE"/
  );
  assert.match(
    reservation,
    /verificationDetails:\s*\{\s*checkoutMethod: "FLUTTERWAVE_SANDBOX_INLINE"/
  );
});

test("hosted checkout without URL remains ineligible", () => {
  assert.match(
    verifier,
    /\(!attempt\.checkoutUrl && !inlineReservation\)/
  );
});

test("Inline verification requires sandbox runtime opt-in", () => {
  assert.match(
    verifier,
    /if \(inlineReservation\) \{\s*requireSandboxInlineRuntime\(env\)/
  );
});

test("reservation and tenant identity still checked", () => {
  assert.match(verifier, /payment\.tenantId !== tenantId/);
  assert.match(
    verifier,
    /attempt\.checkoutReference !== payment\.reference/
  );
  assert.match(verifier, /attempt\.amount !== payment\.amount/);
  assert.match(verifier, /attempt\.currency !== payment\.currency/);
});

test("server verification by reference remains mandatory", () => {
  assert.match(
    verifier,
    /await verifySandboxPaymentByReference\(\{/
  );
  assert.match(verifier, /if \(!verification\.verified\)/);
});

test("transaction rechecks method and checkout URL", () => {
  assert.match(
    verifier,
    /currentAttempt\.checkoutUrl !== attempt\.checkoutUrl/
  );
  assert.match(
    verifier,
    /currentAttempt\.verificationDetails\?\.checkoutMethod !==\s*"FLUTTERWAVE_SANDBOX_INLINE"/
  );
  assert.match(
    verifier,
    /checkoutUrl: attempt\.checkoutUrl/
  );
});

test("provider evidence still required before verified status", () => {
  assert.match(verifier, /status: "VERIFIED"/);
  assert.match(
    verifier,
    /providerTransactionId: String\(\s*verification\.transactionId/
  );
  assert.match(verifier, /verifiedAt: new Date\(\)/);
});
