"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dir = path.resolve(
  __dirname,
  "../../web/src/legacy-pages/Billing"
);

const source = fs.readFileSync(
  path.join(dir, "Renew.jsx"),
  "utf8"
);

const css = fs.readFileSync(
  path.join(dir, "RenewPremium.css"),
  "utf8"
);

test("success requires authoritative terminal state", () => {
  assert.match(
    source,
    /STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED &&\s*inlinePaymentStatus === "SUCCESS" &&/
  );
  assert.match(
    source,
    /inlineTerminalResult\.current\?\.status !== "SUCCESS"/
  );
});

test("success confirmation is persistent and accessible", () => {
  assert.match(
    source,
    /className="svx-rq-payment-success"/
  );
  assert.match(
    source,
    /aria-label="Payment successful"/
  );
  assert.match(
    source,
    /your subscription renewal has been applied/
  );
});

test("existing checkout disabled contract is preserved", () => {
  assert.match(
    source,
    /disabled=\{!checkoutEnabled\}/
  );
  assert.match(
    source,
    /!submitting &&\s*inlinePaymentStatus !== "SUCCESS"/
  );
});

test("handler independently prevents another checkout", () => {
  assert.match(
    source,
    /if \(paymentAttemptLock\.current \|\| submitting\) return;[\s\S]*?if \(inlinePaymentStatus === "SUCCESS"\) return;/
  );
});

test("completed checkout has an appropriate label", () => {
  assert.match(source, /"Payment completed"/);
});

test("Billing action uses existing route", () => {
  assert.match(
    source,
    /className="svx-rq-secondary"[\s\S]*?nav\("\/app\/settings\/billing"\)/
  );
});

test("unconfirmed statuses retain distinct messaging", () => {
  assert.match(source, /inlinePaymentStatus !== "SUCCESS"/);
  assert.match(source, /"Payment was unsuccessful\."/);
  assert.match(source, /"Verifying your payment securely\.\.\."/);
  assert.match(source, /"Payment confirmation pending\./);
});

test("success styling uses existing theme colors", () => {
  assert.match(
    css,
    /\.svx-rq-payment-success \{/
  );
  assert.match(css, /background: var\(--rq-soft\)/);
  assert.match(css, /color: var\(--rq-text\)/);
  assert.match(css, /color: var\(--rq-muted\)/);
});

test("verified modal close and hosted fallback remain", () => {
  assert.match(
    source,
    /function closeVerifiedInlineCheckout/
  );
  assert.match(
    source,
    /await startFlutterwaveSandboxCheckout\(\{/
  );
});
