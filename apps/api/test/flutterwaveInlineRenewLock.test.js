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

const flow = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/flutterwaveInlinePaymentFlow.js"
  ),
  "utf8"
);

test("rapid payment clicks are blocked synchronously", () => {
  assert.match(renew, /useRef/);
  assert.match(
    renew,
    /paymentAttemptLock = useRef\(false\)/
  );
  assert.match(
    renew,
    /if \(paymentAttemptLock\.current \|\| submitting\) return/
  );
  assert.match(
    renew,
    /paymentAttemptLock\.current = true/
  );
});

test("Inline completion releases the button lock", () => {
  assert.match(
    renew,
    /onFinished: \(\) => \{\s*if \(paymentAttemptOwner\.current !== attemptOwner\) return;\s*paymentAttemptLock\.current = false;\s*setSubmitting\(false\)/
  );
  assert.match(flow, /onFinished\(reference\)/);
});

test("successful Inline opening keeps the lock engaged", () => {
  assert.match(renew, /inlinePopupOpened = true/);
  assert.match(
    renew,
    /!STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED \|\|\s*!inlinePopupOpened/
  );
});

test("failed opening and hosted checkout release the lock", () => {
  assert.match(
    renew,
    /paymentAttemptLock\.current = false;\s*setSubmitting\(false\)/
  );
  assert.match(
    renew,
    /finally \{[\s\S]*paymentAttemptOwner\.current === attemptOwner[\s\S]*!inlinePopupOpened[\s\S]*setSubmitting\(false\)/
  );
});

test("original hosted checkout call remains intact", () => {
  assert.match(
    renew,
    /startFlutterwaveSandboxCheckout\(\{\s*planKey: selectedPlan\.key,\s*durationMonths,\s*expectedTotal: total,\s*expectedCurrency: selectedPlan\.currency/
  );
});

test("approved renewal design and disabled-by-default Inline remain", () => {
  assert.match(renew, /Proceed to Secure Payment/);
  assert.match(renew, /svx-renew-premium/);
  assert.match(
    renew,
    /NEXT_PUBLIC_FLUTTERWAVE_SANDBOX_INLINE_ENABLED === "true"/
  );
  assert.match(renew, /disabled=\{!checkoutEnabled\}/);
});


test("payment attempts receive unique lock identities", () => {
  assert.match(
    renew,
    /paymentAttemptOwner = useRef\(0\)/
  );

  assert.match(
    renew,
    /const attemptOwner = \+\+paymentAttemptOwner\.current/
  );
});

test("stale popup completion cannot release newer lock", () => {
  assert.match(
    renew,
    /onFinished: \(\) => \{\s*if \(paymentAttemptOwner\.current !== attemptOwner\) return;\s*paymentAttemptLock\.current = false/
  );
});

test("finally releases only its own attempt", () => {
  assert.match(
    renew,
    /paymentAttemptOwner\.current === attemptOwner &&/
  );
});

test("synchronous duplicate-click guard remains", () => {
  assert.match(
    renew,
    /if \(paymentAttemptLock\.current \|\| submitting\) return/
  );
});
