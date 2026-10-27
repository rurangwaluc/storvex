"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createRenewalPaymentQuote,
} = require("../src/modules/billing/renewalPaymentQuote");
const {
  assertHistoricalRenewalQuote,
} = require("../src/modules/billing/renewalQuoteIntegrity");

function payment(months = 12) {
  const renewalQuote = createRenewalPaymentQuote({
    countryCode: "RW",
    planKey: "LAUNCH_BUSINESS",
    durationMonths: months,
  });

  return {
    provider: "FLUTTERWAVE",
    purpose: "SUBSCRIPTION_RENEWAL",
    planKey: renewalQuote.planKey,
    amount: renewalQuote.totalAmount,
    priceAmount: renewalQuote.monthlyAmount,
    currency: renewalQuote.currency,
    renewalQuote,
  };
}

test("accepts all four historically stored durations", () => {
  for (const months of [1, 3, 6, 12]) {
    const record = payment(months);
    assert.deepEqual(
      assertHistoricalRenewalQuote(record),
      record.renewalQuote
    );
  }
});

test("historical verification does not need a current price book", () => {
  const record = payment(12);
  assert.equal(assertHistoricalRenewalQuote(record).totalAmount, 459000);
});

test("rejects forged totals, discounts and monthly prices", () => {
  for (const field of [
    "totalAmount",
    "regularAmount",
    "discountAmount",
    "discountPercent",
    "monthlyAmount",
  ]) {
    const record = payment();
    record.renewalQuote = {
      ...record.renewalQuote,
      [field]: record.renewalQuote[field] + 1,
    };
    assert.throws(() => assertHistoricalRenewalQuote(record));
  }
});

test("rejects payment mismatches and wrong provider", () => {
  for (const [field, value] of [
    ["amount", 1],
    ["priceAmount", 1],
    ["currency", "USD"],
    ["planKey", "LAUNCH_STARTER"],
    ["provider", "MOMO"],
    ["purpose", "OTHER"],
  ]) {
    const record = payment();
    record[field] = value;
    assert.throws(() => assertHistoricalRenewalQuote(record));
  }
});

test("rejects manipulated durations and versions", () => {
  for (const durationMonths of [0, 2, 13, "3", null]) {
    const record = payment();
    record.renewalQuote = { ...record.renewalQuote, durationMonths };
    assert.throws(() => assertHistoricalRenewalQuote(record));
  }

  const record = payment();
  record.renewalQuote = { ...record.renewalQuote, version: 2 };
  assert.throws(() => assertHistoricalRenewalQuote(record));
});

test("rejects missing quote rather than guessing its duration", () => {
  const record = payment();
  record.renewalQuote = null;
  assert.throws(() => assertHistoricalRenewalQuote(record));
});
