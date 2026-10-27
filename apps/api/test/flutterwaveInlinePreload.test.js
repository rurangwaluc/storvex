"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const renew = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/Renew.jsx"
  ),
  "utf8"
);

const loader = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/flutterwaveSandboxInline.js"
  ),
  "utf8"
);

const section = renew.match(
  /\/\/ STEP 342CN-DY \/ DEVELOPMENT-ONLY INLINE PRELOAD([\s\S]*?)const \[me, setMe\]/
)?.[1];

test("Inline preload is installed separately from payment initiation", () => {
  assert.ok(section);
  assert.match(section, /useEffect\(\(\) => \{/);
});

test("preload requires the development-only Inline UI flag", () => {
  assert.match(
    section,
    /if \(!STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED\) return/
  );
  assert.match(
    renew,
    /process\.env\.NODE_ENV === "development"/
  );
  assert.match(
    renew,
    /NEXT_PUBLIC_FLUTTERWAVE_SANDBOX_INLINE_ENABLED === "true"/
  );
});

test("preload does not reserve or verify payments", () => {
  assert.match(
    section,
    /loadFlutterwaveInlineScript\(\)\.catch/
  );

  assert.doesNotMatch(
    section,
    /apiClient|reservePayment|openPopup|verifyPayment|FlutterwaveCheckout\(/
  );
});

test("preload errors cannot crash renewal page", () => {
  assert.match(
    section,
    /loadFlutterwaveInlineScript\(\)\.catch\(\(\) => \{/
  );
});

test("existing loader deduplicates concurrent requests", () => {
  assert.match(
    loader,
    /if \(loadingScript\) return loadingScript/
  );
  assert.match(
    loader,
    /typeof window\.FlutterwaveCheckout === "function"/
  );
});

test("hosted checkout remains the exact fallback", () => {
  assert.match(
    renew,
    /await startFlutterwaveSandboxCheckout\(\{\s*planKey: selectedPlan\.key,\s*durationMonths,\s*expectedTotal: total,\s*expectedCurrency: selectedPlan\.currency/
  );
});
