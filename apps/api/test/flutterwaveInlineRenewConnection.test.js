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

test("Inline has an additional disabled-by-default development flag", () => {
  assert.match(
    source,
    /STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED\s*=\s*STORVEX_FLUTTERWAVE_SANDBOX_UI_ENABLED\s*&&\s*process\.env\.NEXT_PUBLIC_FLUTTERWAVE_SANDBOX_INLINE_ENABLED === "true"/
  );
});

test("Inline branches around the original hosted checkout call", () => {
  assert.match(
    source,
    /if \(STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED\) \{[\s\S]*runFlutterwaveInlinePaymentFlow\(\{[\s\S]*\} else \{\s*await startFlutterwaveSandboxCheckout\(\{\s*planKey: selectedPlan\.key,\s*durationMonths,\s*expectedTotal: total,\s*expectedCurrency: selectedPlan\.currency/
  );
});

test("Inline reservation does not send client prices", () => {
  const start = source.indexOf(
    'apiClient.post("/billing/renew", {'
  );
  assert.ok(start >= 0);

  const end = source.indexOf("});", start);
  assert.ok(end > start);

  const request = source.slice(start, end);

  assert.match(
    request,
    /checkoutMethod: "FLUTTERWAVE_SANDBOX_INLINE"/
  );
  assert.doesNotMatch(
    request,
    /expectedTotal|totalAmount|monthlyAmount|discountPercent/
  );
});

test("Inline payment completion uses authenticated API", () => {
  assert.match(source, /\/complete-sandbox/);
  assert.match(source, /apiClient\.get\(/);
  assert.match(source, /setInlinePaymentStatus\(status\)/);
});

test("approved design and fallback language remain", () => {
  assert.match(source, /svx-renew-premium/);
  assert.match(source, /renewThemeClass/);
  assert.match(source, /Proceed to Secure Payment/);
  assert.match(source, /Secure hosted checkout/);
  assert.match(source, /Secure popup checkout/);
  assert.match(
    source,
    /Test mode — No real payment will be charged/
  );
});
