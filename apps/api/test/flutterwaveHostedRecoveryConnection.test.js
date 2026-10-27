"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");

const page = fs.readFileSync(
  path.join(
    root,
    "apps/web/src/legacy-pages/Billing/Renew.jsx"
  ),
  "utf8"
);

const storage = fs.readFileSync(
  path.join(
    root,
    "apps/web/src/legacy-pages/Billing/flutterwaveHostedRecovery.js"
  ),
  "utf8"
);

const helper = fs.readFileSync(
  path.join(
    root,
    "apps/web/src/legacy-pages/Billing/startFlutterwaveSandboxCheckout.js"
  ),
  "utf8"
);

test("hosted checkout stores a reference before redirect", () => {
  assert.match(helper, /onCheckoutReady\(data\.paymentReference\)/);
  assert.ok(
    helper.indexOf("onCheckoutReady(data.paymentReference)") <
    helper.indexOf("navigateToCheckout(data.checkoutUrl)")
  );
  assert.match(page, /onCheckoutReady: reference =>/);
  assert.match(page, /saveHostedRecoveryReference/);
});

test("hosted recovery uses authenticated payment status", () => {
  assert.match(
    page,
    /apiClient\.get\(\s*`\/billing\/payments\/\$\{encodeURIComponent\(reference\)\}`/
  );
  assert.match(page, /data\?\.payment\?\.reference !== reference/);
  assert.match(page, /data\?\.payment\?\.purpose !== "SUBSCRIPTION_RENEWAL"/);
  assert.match(page, /data\?\.checkoutRecovery\?\.method !==/);
});

test("hosted recovery never starts a duplicate checkout", () => {
  assert.match(page, /readHostedRecoveryReference/);
  assert.match(page, /if \(existing\) \{/);
  assert.match(page, /await checkHostedRecovery\(existing\)/);
});

test("hosted recovery checks redirects and preserves Inline", () => {
  assert.match(page, /trustedHostedRecoveryUrl/);
  assert.match(page, /Continue existing checkout/);
  assert.match(page, /!STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED/);
  assert.match(page, /runFlutterwaveInlinePaymentFlow/);
});

test("recovery storage carries references, never payment proof", () => {
  assert.match(storage, /storvex_hosted_renewal_reference_v1/);
  assert.match(storage, /validHostedReference/);
  assert.match(storage, /entry\?\.reference !== expectedReference/);
  assert.doesNotMatch(storage, /status:\s*"SUCCESS"/);
});

test("hosted recovery discovers server-side pending payments", () => {
  assert.match(
    page,
    /apiClient\.get\(\s*"\/billing\/payments\/pending-renewal"/
  );
  assert.match(page, /void discoverHostedRecovery\(\)/);
  assert.match(page, /await checkHostedRecovery\(reference\)/);
  assert.match(page, /state: "LOOKUP_UNAVAILABLE"/);
  assert.match(page, /hostedRecoveryChecking\s*\|\|\s*\(hostedRecovery\s*&&\s*hostedRecovery\.state\s*!==\s*"COMPLETED"\)/);
});

test("confirmed hosted payments release the recovery lock", () => {
  assert.match(
    page,
    /clearHostedRecoveryReference\(\s*window\.sessionStorage,\s*reference\s*\)/
  );

  assert.match(
    page,
    /data\?\.payment\?\.reference === reference/
  );

  assert.match(
    page,
    /data\?\.payment\?\.status === "SUCCESS"/
  );

  assert.match(
    page,
    /data\?\.checkoutRecovery\?\.state === "COMPLETED"/
  );

  assert.match(
    page,
    /hostedRecovery\.state !== "COMPLETED"/
  );

  assert.match(
    page,
    /hostedRecoveryChecking \|\|/
  );
});
