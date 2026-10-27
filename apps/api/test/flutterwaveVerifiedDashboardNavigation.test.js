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

const handler = source.split(
  "// STEP 342CN-HK / VERIFIED DASHBOARD CONTINUATION"
)[1]?.split("  async function refreshStatus() {")[0];

const confirmation = source.split(
  'aria-label="Payment successful"'
)[1]?.split('inlinePaymentStatus !== "SUCCESS"')[0];

test("dashboard action requires verified payment success", () => {
  assert.ok(handler);
  assert.match(handler, /inlinePaymentStatus !== "SUCCESS"/);
});

test("dashboard access requires a fresh authenticated response", () => {
  assert.match(handler, /await apiClient\.get\("\/auth\/me"\)/);
  assert.match(
    handler,
    /if \(!isAccessRecovered\(data\?\.subscription\)\)/
  );

  assert.ok(
    handler.indexOf("isAccessRecovered(data?.subscription)") <
    handler.indexOf('nav("/app", { replace: true })')
  );
});

test("pending subscription access cannot enter dashboard", () => {
  assert.match(handler, /subscription access is still updating/);
});

test("failed access lookup does not grant workspace access", () => {
  assert.match(handler, /Unable to confirm subscription access/);
});

test("dashboard continuation never creates another payment", () => {
  assert.doesNotMatch(
    handler,
    /\/billing\/renew|complete-sandbox|FlutterwaveCheckout/
  );
});

test("standalone success provides dashboard primary action", () => {
  assert.ok(confirmation);
  assert.match(confirmation, /!\s*embedded/);
  assert.match(
    confirmation,
    /className="svx-rq-payment-success-action"[\s\S]*?onClick=\{continueAfterVerifiedRenewal\}/
  );
  assert.match(confirmation, /Continue to dashboard/);
});

test("secondary Billing action remains available", () => {
  assert.match(
    confirmation,
    /className="svx-rq-secondary"[\s\S]*?View Billing/
  );
  assert.match(
    confirmation,
    /nav\("\/app\/settings\/billing"\)/
  );
});

test("verified dashboard continuation clears only stored reference", () => {
  assert.match(
    handler,
    /clearInlineRecoveryReference\(\s*window\.sessionStorage,\s*reference/
  );
});
