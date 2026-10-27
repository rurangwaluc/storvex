"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const helper = fs.readFileSync(
  path.join(root, "apps/web/src/legacy-pages/Billing/startFlutterwaveSandboxCheckout.js"),
  "utf8"
);
const renew = fs.readFileSync(
  path.join(root, "apps/web/src/legacy-pages/Billing/Renew.jsx"),
  "utf8"
);

test("checkout request transmits selected duration but no client price", () => {
  assert.match(helper, /durationMonths,\s*checkoutMethod: "FLUTTERWAVE_SANDBOX"/);
  const start = helper.indexOf('apiClient.post("/billing/renew", {');
  assert.ok(start >= 0);
  const request = helper.slice(start, helper.indexOf("});", start));
  assert.doesNotMatch(request, /expectedTotal|totalAmount|monthlyAmount|discountPercent/);
});

test("checkout helper rejects server duration and amount mismatches", () => {
  assert.match(helper, /data\?\.durationMonths !== durationMonths/);
  assert.match(helper, /data\?\.totalAmount !== expectedTotal/);
  assert.match(helper, /data\?\.currency !== expectedCurrency/);
  assert.match(helper, /Number\.isSafeInteger\(expectedTotal\)/);
  assert.match(helper, /Number\.isSafeInteger\(data\?\.monthlyAmount\)/);
  assert.match(helper, /trustedSandboxCheckoutUrl\(data\?\.checkoutUrl\)/);
  assert.ok(
    helper.indexOf("data?.totalAmount !== expectedTotal") <
    helper.indexOf("navigateToCheckout(data.checkoutUrl)")
  );
});

test("renew page supplies the displayed selection to checkout verification", () => {
  assert.match(
    renew,
    /startFlutterwaveSandboxCheckout\(\{\s*planKey: selectedPlan\.key,\s*durationMonths,\s*expectedTotal: total,\s*expectedCurrency: selectedPlan\.currency/
  );
});

test("multi-month checkout requires a separate explicit UI opt-in", () => {
  assert.match(
    renew,
    /STORVEX_FLUTTERWAVE_SANDBOX_MULTI_MONTH_UI_ENABLED/
  );
  assert.match(
    renew,
    /NEXT_PUBLIC_FLUTTERWAVE_SANDBOX_MULTI_MONTH_UI_ENABLED === "true"/
  );
  assert.match(
    renew,
    /durationMonths === 1 \|\|\s*STORVEX_FLUTTERWAVE_SANDBOX_MULTI_MONTH_UI_ENABLED/
  );
  assert.match(
    renew,
    /STORVEX_FLUTTERWAVE_SANDBOX_UI_ENABLED &&\s*checkoutDurationEnabled &&/
  );
  assert.match(renew, /disabled=\{!checkoutEnabled\}/);
  assert.match(renew, /Multi-month checkout not yet enabled/);
});

test("sandbox UI remains restricted to development", () => {
  assert.match(
    renew,
    /process\.env\.NODE_ENV === "development" &&\s*process\.env\.NEXT_PUBLIC_FLUTTERWAVE_SANDBOX_UI_ENABLED === "true"/
  );
  assert.match(
    renew,
    /STORVEX_FLUTTERWAVE_SANDBOX_MULTI_MONTH_UI_ENABLED =\s*STORVEX_FLUTTERWAVE_SANDBOX_UI_ENABLED &&/
  );
});

test("disabled multi-month selection remains a pricing preview", () => {
  assert.match(
    renew,
    /durationMonths !== 1 && !checkoutDurationEnabled/
  );
  assert.match(
    renew,
    /explicit sandbox multi-month testing to be enabled/
  );
});


test("checkout button uses professional payment wording", () => {
  assert.match(renew, /"Proceed to Secure Payment"/);
  assert.doesNotMatch(renew, /"Continue to Flutterwave \(Test\)"/);
});

test("sandbox notice only appears under the sandbox UI gate", () => {
  assert.match(
    renew,
    /STORVEX_FLUTTERWAVE_SANDBOX_UI_ENABLED && \(\s*<p className="svx-rq-secure">/
  );
  assert.match(
    renew,
    /Test mode — No real payment will be charged/
  );
});

test("checkout opens in the current browser tab", () => {
  assert.match(
    helper,
    /navigateToCheckout = \(url\) => window\.location\.assign\(url\)/
  );
  assert.doesNotMatch(helper, /window\.open\(/);
});

test("payment total remains an estimate before server verification", () => {
  assert.match(renew, /Estimated total/);
  assert.match(helper, /data\?\.totalAmount !== expectedTotal/);
});
