"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  requireSandboxRenewalDuration,
  createRenewalPaymentQuote,
} = require("../src/modules/billing/renewalPaymentQuote");

const disabled = Object.freeze({});
const enabled = Object.freeze({
  FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED: "true",
});

test("one-month sandbox checkout remains available", () => {
  assert.equal(requireSandboxRenewalDuration(1, disabled), 1);
});

test("multi-month checkout is disabled by default", () => {
  for (const months of [3, 6, 12]) {
    assert.throws(
      () => requireSandboxRenewalDuration(months, disabled),
      { code: "MULTI_MONTH_CHECKOUT_NOT_READY", status: 400 }
    );
  }
});

test("flag must be exactly true", () => {
  for (const value of ["false", "TRUE", "1", "", null]) {
    assert.throws(
      () => requireSandboxRenewalDuration(3, {
        FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED: value,
      }),
      { code: "MULTI_MONTH_CHECKOUT_NOT_READY" }
    );
  }
});

test("enabled sandbox supports all approved durations", () => {
  const expectedDiscounts = { 1: 0, 3: 5, 6: 10, 12: 15 };

  for (const months of [1, 3, 6, 12]) {
    assert.equal(requireSandboxRenewalDuration(months, enabled), months);

    const quote = createRenewalPaymentQuote({
      countryCode: "RW",
      planKey: "LAUNCH_STARTER",
      durationMonths: months,
    });

    assert.equal(quote.durationMonths, months);
    assert.equal(quote.discountPercent, expectedDiscounts[months]);
    assert.equal(quote.monthlyAmount, 10000);
    assert.equal(quote.totalAmount,
      quote.regularAmount - quote.discountAmount);
  }
});

test("invalid and coerced durations fail even when enabled", () => {
  for (const value of [
    0, 2, 4, 13, -1, 1.5, "1", "3", "12", null, true, {},
  ]) {
    assert.throws(
      () => requireSandboxRenewalDuration(value, enabled),
      { code: "INVALID_RENEWAL_PAYMENT_QUOTE" }
    );
  }
});

test("billing route calls the gate before quote and payment creation", () => {
  const content = fs.readFileSync(
    path.join(
      __dirname,
      "../src/modules/billing/billing.controller.js"
    ),
    "utf8"
  );

  const start = content.indexOf(
    "async function initiateRenewalPayment(req, res) {"
  );
  const end = content.indexOf(
    "async function devMarkRenewalPaymentSuccessful(req, res) {",
    start
  );

  assert.ok(start >= 0 && end > start);

  const section = content.slice(start, end);
  const runtime = section.indexOf("requireFlutterwaveSandboxRuntime()");
  const gate = section.indexOf(
    "requireSandboxRenewalDuration(requestedDurationMonths)"
  );
  const quote = section.indexOf("renewalQuote = createRenewalPaymentQuote({");
  const payment = section.indexOf("prisma.payment.create({");

  assert.ok(runtime >= 0);
  assert.ok(gate > runtime);
  assert.ok(quote > gate);
  assert.ok(payment > quote);
  assert.match(section, /amount: renewalQuote\.totalAmount/);
  assert.match(section, /entitlementSnapshot: snap\.entitlements/);
});
