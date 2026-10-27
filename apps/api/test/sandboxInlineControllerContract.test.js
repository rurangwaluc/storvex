"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const controller = fs.readFileSync(
  path.join(
    __dirname,
    "../src/modules/billing/billing.controller.js"
  ),
  "utf8"
);

const start = controller.indexOf(
  "async function initiateRenewalPayment(req, res) {"
);
const end = controller.indexOf(
  "async function devMarkRenewalPaymentSuccessful(req, res) {",
  start
);

assert.ok(start >= 0 && end > start);
const section = controller.slice(start, end);

test("Inline is explicitly selected, not the hosted default", () => {
  assert.match(
    section,
    /checkoutMethod === "FLUTTERWAVE_SANDBOX_INLINE"/
  );
  assert.match(
    section,
    /checkoutMethod === "FLUTTERWAVE_SANDBOX"/
  );
});

test("Inline gate precedes payment creation", () => {
  const gate = section.indexOf("requireSandboxInlineRuntime()");
  const payment = section.indexOf("prisma.payment.create({");

  assert.ok(gate >= 0 && payment > gate);
});

test("Inline reserves the same pending payment", () => {
  const reserve = section.indexOf("reserveSandboxRenewalCheckout({");
  const inline = section.indexOf(
    "const inlineConfig = createSandboxInlineConfig({"
  );

  assert.ok(reserve >= 0 && inline > reserve);
  assert.match(section, /payment,\s*reservation,\s*identity:/);
  assert.match(section, /renewalQuote: true/);
});

test("Inline returns before hosted provider creation", () => {
  const branch = section.indexOf("if (inlineRequested) {",
    section.indexOf("reserveSandboxRenewalCheckout({")
  );
  const returned = section.indexOf(
    'message: "Sandbox Inline checkout reserved"', branch
  );
  const hosted = section.indexOf(
    "const checkout = await createSandboxRenewalCheckout({"
  );

  assert.ok(branch >= 0 && returned > branch);
  assert.ok(hosted > returned);
  assert.match(section, /inlineConfig,\s*provider: "FLUTTERWAVE"/);
});

test("Existing hosted checkout response remains available", () => {
  assert.match(
    section,
    /checkoutUrl: checkout\.checkoutUrl/
  );
  assert.match(
    section,
    /message: "Sandbox checkout created"/
  );
});
