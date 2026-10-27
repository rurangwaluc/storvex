"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const renew = fs.readFileSync(
  path.resolve(__dirname, "../../web/src/legacy-pages/Billing/Renew.jsx"),
  "utf8"
);

const preload = renew.match(
  /\/\/ STEP 342CN-DY \/ DEVELOPMENT-ONLY INLINE PRELOAD([\s\S]*?)const \[me, setMe\]/
)?.[1];

const recheck = renew.match(
  /\/\/ STEP 342CN-FF \/ RETURN-TO-STORVEX RECONCILIATION([\s\S]*?)const grouped = useMemo/
)?.[1];

test("preload remains isolated from reconciliation", () => {
  assert.ok(preload);
  assert.ok(recheck);
  assert.match(preload, /loadFlutterwaveInlineScript\(\)\.catch/);
  assert.doesNotMatch(
    preload,
    /apiClient|verifyPayment|createFlutterwaveInlineReconciler/
  );
});

test("return reconciliation uses the existing safe helper", () => {
  assert.match(
    renew,
    /import \{ createFlutterwaveInlineReconciler \} from "\.\/flutterwaveInlineReconciliation"/
  );
  assert.match(recheck, /createFlutterwaveInlineReconciler\(\{/);
});

test("verification and status requests are authenticated", () => {
  assert.match(
    recheck,
    /inlineSharedVerifier\.current\.verify\(reference\)/
  );
  assert.match(
    renew,
    /createSharedInlinePaymentVerifier\([\s\S]*?apiClient\.post\([\s\S]*?complete-sandbox/
  );
  assert.match(recheck, /apiClient\.get\(/);
  assert.match(recheck, /billing\/payments/);
});

test("only the current server-issued reference is checked", () => {
  assert.match(renew, /inlinePaymentToRecheck = useRef\(null\)/);
  assert.match(
    renew,
    /reference: data\.paymentReference,\s*owner: attemptOwner/
  );
  assert.match(recheck, /current\.reference !== reference/);
  assert.match(
    recheck,
    /current\.owner !== paymentAttemptOwner\.current/
  );
});

test("focus and visibility listeners are cleaned up", () => {
  for (const statement of [
    'window.addEventListener("focus", recheckOnReturn)',
    'document.addEventListener("visibilitychange", recheckOnReturn)',
    'window.removeEventListener("focus", recheckOnReturn)',
    'document.removeEventListener("visibilitychange", recheckOnReturn)',
  ]) {
    assert.ok(recheck.includes(statement), statement);
  }
});

test("return checks are event-driven and sandbox-gated", () => {
  assert.match(
    recheck,
    /if \(!STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED\) return/
  );
  assert.match(
    recheck,
    /document\.visibilityState === "hidden"/
  );
  assert.match(recheck, /reconciler\.reconcile\(current\.reference\)/);
  assert.doesNotMatch(recheck, /setInterval|setTimeout/);
});

test("reconciliation does not create payments or redirects", () => {
  assert.doesNotMatch(
    recheck,
    /reservePayment|checkoutMethod|window\.location|window\.open/
  );
});

test("terminal status clears the pending reference", () => {
  assert.match(
    recheck,
    /if \(status === "SUCCESS" \|\| status === "FAILED"\)/
  );
  assert.match(
    recheck,
    /inlinePaymentToRecheck\.current = null/
  );
});

test("original hosted checkout and click lock remain", () => {
  assert.match(
    renew,
    /await startFlutterwaveSandboxCheckout\(\{\s*planKey: selectedPlan\.key,\s*durationMonths,\s*expectedTotal: total,\s*expectedCurrency: selectedPlan\.currency/
  );
  assert.match(
    renew,
    /if \(paymentAttemptLock\.current \|\| submitting\) return/
  );
});
