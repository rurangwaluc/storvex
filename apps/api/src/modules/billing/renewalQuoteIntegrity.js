"use strict";

// STEP 342CN-M / HISTORICAL QUOTE INTEGRITY
// Validate purchased terms without consulting today's price book.

const DISCOUNTS = Object.freeze({
  1: 0,
  3: 5,
  6: 10,
  12: 15,
});

function reject() {
  const error = new Error("Invalid stored renewal purchase terms");
  error.code = "RENEWAL_QUOTE_INTEGRITY_FAILED";
  error.status = 409;
  throw error;
}

function safePositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function assertHistoricalRenewalQuote(payment) {
  const quote = payment?.renewalQuote;

  if (
    !payment ||
    payment.provider !== "FLUTTERWAVE" ||
    payment.purpose !== "SUBSCRIPTION_RENEWAL" ||
    !quote ||
    typeof quote !== "object" ||
    Array.isArray(quote) ||
    quote.version !== 1 ||
    !Object.hasOwn(DISCOUNTS, quote.durationMonths) ||
    typeof quote.countryCode !== "string" ||
    !/^[A-Z]{2}$/.test(quote.countryCode) ||
    typeof quote.planKey !== "string" ||
    !quote.planKey ||
    quote.planKey !== payment.planKey ||
    typeof quote.currency !== "string" ||
    !/^[A-Z]{3}$/.test(quote.currency) ||
    quote.currency !== payment.currency ||
    !safePositiveInteger(quote.monthlyAmount) ||
    !safePositiveInteger(quote.regularAmount) ||
    !Number.isSafeInteger(quote.discountAmount) ||
    !safePositiveInteger(quote.totalAmount) ||
    !safePositiveInteger(payment.amount) ||
    !safePositiveInteger(payment.priceAmount)
  ) {
    reject();
  }

  const expectedRegular =
    quote.monthlyAmount * quote.durationMonths;

  if (!Number.isSafeInteger(expectedRegular)) {
    reject();
  }

  const expectedDiscount = Math.round(
    expectedRegular * DISCOUNTS[quote.durationMonths] / 100
  );

  const expectedTotal = expectedRegular - expectedDiscount;

  if (
    quote.discountPercent !== DISCOUNTS[quote.durationMonths] ||
    quote.regularAmount !== expectedRegular ||
    quote.discountAmount !== expectedDiscount ||
    quote.totalAmount !== expectedTotal ||
    payment.amount !== expectedTotal ||
    payment.priceAmount !== quote.monthlyAmount
  ) {
    reject();
  }

  return Object.freeze({
    version: 1,
    planKey: quote.planKey,
    countryCode: quote.countryCode,
    currency: quote.currency,
    durationMonths: quote.durationMonths,
    discountPercent: quote.discountPercent,
    monthlyAmount: quote.monthlyAmount,
    regularAmount: quote.regularAmount,
    discountAmount: quote.discountAmount,
    totalAmount: quote.totalAmount,
  });
}

module.exports = { assertHistoricalRenewalQuote };
