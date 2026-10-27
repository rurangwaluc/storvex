"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/Renew.jsx"
  ),
  "utf8"
);

const effect = source.split(
  "// STEP 342CN-GF / AUTHENTICATED REFRESH RECOVERY"
)[1]?.split(
  "// STEP 342CN-FF / RETURN-TO-STORVEX RECONCILIATION"
)[0];

test("recovery is sandbox gated", () => {
  assert.ok(effect);
  assert.match(
    effect,
    /if \(!STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED\) return/
  );
});

test("recovery reads a tab-scoped reference", () => {
  assert.match(
    effect,
    /readInlineRecoveryReference\(\s*window\.sessionStorage/
  );
});

test("recovery only requests authenticated payment status", () => {
  assert.match(
    effect,
    /apiClient\.get\(\s*`\/billing\/payments\/\$\{encodeURIComponent\(reference\)\}`/
  );
  assert.doesNotMatch(
    effect,
    /apiClient\.post|\/billing\/renew|complete-sandbox/
  );
});

test("recovery requires matching server identity and purpose", () => {
  assert.match(
    effect,
    /payment\?\.reference !== reference/
  );
  assert.match(
    effect,
    /payment\?\.purpose !== "SUBSCRIPTION_RENEWAL"/
  );
});

test("stale recovery cannot replace a new payment attempt", () => {
  assert.match(
    effect,
    /paymentAttemptOwner\.current !== owner/
  );
  assert.match(
    effect,
    /current\.reference !== reference/
  );
  assert.match(
    effect,
    /if \(cancelled\) return/
  );
});

test("recovery never treats storage as payment proof", () => {
  assert.match(
    effect,
    /const status = String\(\s*payment\.status/
  );
  assert.match(
    effect,
    /status === "SUCCESS" \|\| status === "FAILED"/
  );
});

test("new reservations save only their server-issued reference", () => {
  assert.match(
    source,
    /saveInlineRecoveryReference\(\s*window\.sessionStorage,\s*data\.paymentReference/
  );
});

test("View Billing clears the recovery hint", () => {
  assert.match(
    source,
    /className="svx-rq-secondary"[\s\S]*?clearInlineRecoveryReference\([\s\S]*?nav\("\/app\/settings\/billing"\)/
  );
});

test("existing payment protections remain", () => {
  assert.match(
    source,
    /if \(paymentAttemptLock\.current \|\| submitting\) return/
  );
  assert.match(
    source,
    /disabled=\{!checkoutEnabled\}/
  );
  assert.match(
    source,
    /function closeVerifiedInlineCheckout/
  );
  assert.match(
    source,
    /await startFlutterwaveSandboxCheckout\(\{/
  );
});
