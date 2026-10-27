"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  createRenewalPaymentQuote,
  requireSandboxRenewalDuration,
} = require("../src/modules/billing/renewalPaymentQuote");

const source = fs.readFileSync(
  path.join(
    __dirname,
    "../src/modules/billing/billing.controller.js"
  ),
  "utf8"
);

function renewalSection() {
  const start = source.indexOf(
    "async function initiateRenewalPayment(req, res) {"
  );
  const end = source.indexOf(
    "async function devMarkRenewalPaymentSuccessful(req, res) {",
    start
  );

  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}

test("sandbox response exposes the authoritative quote", () => {
  const section = renewalSection();
  const start = section.indexOf(
    'message: "Sandbox checkout created"'
  );

  assert.ok(start >= 0);

  const response = section.slice(
    start,
    section.indexOf("});", start)
  );

  for (const requirement of [
    /paymentReference: payment\.reference/,
    /checkoutUrl: checkout\.checkoutUrl/,
    /sandbox: true/,
    /durationMonths: renewalQuote\.durationMonths/,
    /monthlyAmount: renewalQuote\.monthlyAmount/,
    /discountPercent: renewalQuote\.discountPercent/,
    /totalAmount: payment\.amount/,
    /currency: payment\.currency/,
  ]) {
    assert.match(response, requirement);
  }

  assert.doesNotMatch(response, /req\.body/);
});

test("checkout total is stored before provider creation", () => {
  const section = renewalSection();

  const quote = section.indexOf(
    "renewalQuote = createRenewalPaymentQuote({"
  );
  const persisted = section.indexOf(
    "amount: renewalQuote.totalAmount"
  );
  const reserved = section.indexOf(
    "reserveSandboxRenewalCheckout({"
  );
  const provider = section.indexOf(
    "createSandboxRenewalCheckout({"
  );
  const response = section.indexOf(
    'message: "Sandbox checkout created"'
  );

  assert.ok(quote >= 0);
  assert.ok(persisted > quote);
  assert.ok(reserved > persisted);
  assert.ok(provider > reserved);
  assert.ok(response > provider);

  assert.match(
    section,
    /amount: payment\.amount,\s*currency: payment\.currency/
  );
});

test("all approved durations retain correct quote totals", () => {
  const expected = [
    [1, 0, 10000],
    [3, 5, 28500],
    [6, 10, 54000],
    [12, 15, 102000],
  ];

  const enabled = {
    FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED: "true",
  };

  for (const [months, discount, total] of expected) {
    assert.equal(
      requireSandboxRenewalDuration(months, enabled),
      months
    );

    const quote = createRenewalPaymentQuote({
      countryCode: "RW",
      planKey: "LAUNCH_STARTER",
      durationMonths: months,
    });

    assert.equal(quote.currency, "RWF");
    assert.equal(quote.durationMonths, months);
    assert.equal(quote.monthlyAmount, 10000);
    assert.equal(quote.discountPercent, discount);
    assert.equal(quote.totalAmount, total);
  }
});

test("multi-month checkout remains disabled by default", () => {
  for (const months of [3, 6, 12]) {
    assert.throws(
      () => requireSandboxRenewalDuration(months, {}),
      { code: "MULTI_MONTH_CHECKOUT_NOT_READY" }
    );
  }
});

test("unsupported durations remain rejected", () => {
  const enabled = {
    FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED: "true",
  };

  for (const months of [0, 2, 13, "3", null]) {
    assert.throws(
      () => requireSandboxRenewalDuration(months, enabled),
      { code: "INVALID_RENEWAL_PAYMENT_QUOTE" }
    );
  }
});
