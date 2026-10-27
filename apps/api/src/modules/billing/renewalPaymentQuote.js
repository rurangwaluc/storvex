"use strict";

// STEP 342CN-F / TRUSTED PAYMENT QUOTE SNAPSHOT
// Pure functions only. No provider or database operations.

const {
  quoteSubscriptionDuration,
} = require("./subscriptionDurationQuote");

const VERSION = 1;

function reject(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "INVALID_RENEWAL_PAYMENT_QUOTE";
  throw error;
}

function createRenewalPaymentQuote(input) {
  if (!input || typeof input !== "object") {
    reject("Trusted renewal input required.");
  }

  const {
    countryCode,
    planKey,
    durationMonths,
  } = input;

  // Prices and discounts come exclusively from server price books.
  const quote = quoteSubscriptionDuration({
    countryCode,
    planKey,
    durationMonths,
  });

  return Object.freeze({
    version: VERSION,
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

function assertRenewalPaymentQuote({
  renewalQuote,
  payment,
  countryCode,
}) {
  if (
    !renewalQuote ||
    typeof renewalQuote !== "object" ||
    Array.isArray(renewalQuote) ||
    renewalQuote.version !== VERSION ||
    !payment ||
    payment.provider !== "FLUTTERWAVE" ||
    payment.purpose !== "SUBSCRIPTION_RENEWAL" ||
    typeof payment.planKey !== "string" ||
    typeof countryCode !== "string"
  ) {
    reject("Trusted Flutterwave renewal payment required.");
  }

  const expected = createRenewalPaymentQuote({
    countryCode,
    planKey: payment.planKey,
    durationMonths: renewalQuote.durationMonths,
  });

  // Reject missing, stale and tampered quote fields.
  for (const [key, value] of Object.entries(expected)) {
    if (renewalQuote[key] !== value) {
      reject("Stored renewal quote does not match trusted pricing.");
    }
  }

  if (
    payment.planKey !== expected.planKey ||
    payment.currency !== expected.currency ||
    payment.amount !== expected.totalAmount ||
    !Number.isSafeInteger(payment.amount) ||
    payment.amount <= 0
  ) {
    reject("Payment amount or identity does not match renewal quote.");
  }

  return expected;
}

// STEP 342CN-BD / MULTI-MONTH SANDBOX GATE
// This does not authorize production checkout or payment success.
// The existing Flutterwave sandbox runtime gate is still required.
function requireSandboxRenewalDuration(
  durationMonths,
  env = process.env
) {
  if (![1, 3, 6, 12].includes(durationMonths)) {
    reject("Unsupported subscription duration.");
  }

  if (
    durationMonths !== 1 &&
    env?.FLUTTERWAVE_SANDBOX_MULTI_MONTH_ENABLED !== "true"
  ) {
    const error = new Error(
      "Multi-month Flutterwave checkout is not enabled yet."
    );
    error.status = 400;
    error.code = "MULTI_MONTH_CHECKOUT_NOT_READY";
    throw error;
  }

  return durationMonths;
}

module.exports = {
  createRenewalPaymentQuote,
  assertRenewalPaymentQuote,
  requireSandboxRenewalDuration,
};
