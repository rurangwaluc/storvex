"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRenewalPaymentQuote,
  assertRenewalPaymentQuote,
} = require("../src/modules/billing/renewalPaymentQuote");

function fixture(months = 12) {
  const renewalQuote = createRenewalPaymentQuote({
    countryCode: "RW",
    planKey: "LAUNCH_BUSINESS",
    durationMonths: months,
    totalAmount: 1,
    discountPercent: 99,
  });

  const payment = {
    provider: "FLUTTERWAVE",
    purpose: "SUBSCRIPTION_RENEWAL",
    planKey: renewalQuote.planKey,
    currency: renewalQuote.currency,
    amount: renewalQuote.totalAmount,
  };

  return { renewalQuote, payment, countryCode: "RW" };
}

test("creates the exact annual Business quote", () => {
  const { renewalQuote } = fixture();
  assert.equal(renewalQuote.version, 1);
  assert.equal(renewalQuote.durationMonths, 12);
  assert.equal(renewalQuote.monthlyAmount, 45000);
  assert.equal(renewalQuote.regularAmount, 540000);
  assert.equal(renewalQuote.discountAmount, 81000);
  assert.equal(renewalQuote.totalAmount, 459000);
  assert.equal(Object.isFrozen(renewalQuote), true);
});

test("validates all approved duration snapshots", () => {
  for (const months of [1, 3, 6, 12]) {
    const input = fixture(months);
    assert.deepEqual(
      assertRenewalPaymentQuote(input),
      input.renewalQuote,
    );
  }
});

test("rejects altered quote totals and discounts", () => {
  for (const field of [
    "totalAmount",
    "regularAmount",
    "discountAmount",
    "discountPercent",
    "monthlyAmount",
  ]) {
    const input = fixture();
    input.renewalQuote = {
      ...input.renewalQuote,
      [field]: input.renewalQuote[field] + 1,
    };

    assert.throws(() => assertRenewalPaymentQuote(input));
  }
});

test("rejects underpayment and wrong currency", () => {
  const underpaid = fixture();
  underpaid.payment.amount -= 1;
  assert.throws(() => assertRenewalPaymentQuote(underpaid));

  const currency = fixture();
  currency.payment.currency = "USD";
  assert.throws(() => assertRenewalPaymentQuote(currency));
});

test("rejects unrelated provider, purpose and plan", () => {
  for (const [field, value] of [
    ["provider", "MOMO"],
    ["purpose", "OTHER"],
    ["planKey", "LAUNCH_STARTER"],
  ]) {
    const input = fixture();
    input.payment[field] = value;
    assert.throws(() => assertRenewalPaymentQuote(input));
  }
});

test("rejects unsupported and manipulated duration", () => {
  for (const months of [2, 4, "3", 13, null]) {
    const input = fixture();
    input.renewalQuote = {
      ...input.renewalQuote,
      durationMonths: months,
    };
    assert.throws(() => assertRenewalPaymentQuote(input));
  }
});

test("rejects invalid or missing quote version", () => {
  for (const version of [undefined, 0, 2, "1"]) {
    const input = fixture();
    input.renewalQuote = {
      ...input.renewalQuote,
      version,
    };
    assert.throws(() => assertRenewalPaymentQuote(input));
  }
});
