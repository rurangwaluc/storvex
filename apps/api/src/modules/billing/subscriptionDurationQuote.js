"use strict";

// STEP 342CN-C / SERVER-AUTHORITATIVE DURATION PRICING
// No database writes, payment requests or entitlement changes.

const {
  getPaidPlansForMarket,
} = require("../../config/subscriptions/pricing");

const DURATION_DISCOUNTS = Object.freeze({
  1: 0,
  3: 5,
  6: 10,
  12: 15,
});

function reject(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "INVALID_SUBSCRIPTION_QUOTE";
  throw error;
}

function requireAmount(value) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    reject("A valid integer monthly price is required.");
  }
  return value;
}

function quoteSubscriptionDuration({
  countryCode,
  planKey,
  durationMonths,
}) {
  if (
    typeof countryCode !== "string" ||
    !/^[A-Za-z]{2}$/.test(countryCode)
  ) {
    reject("Valid market country required.");
  }

  if (
    typeof planKey !== "string" ||
    !/^[A-Za-z0-9_]+$/.test(planKey)
  ) {
    reject("Valid paid plan required.");
  }

  // Never coerce "3", 3.5, null or arbitrary browser values.
  if (
    typeof durationMonths !== "number" ||
    !Number.isInteger(durationMonths) ||
    !Object.hasOwn(DURATION_DISCOUNTS, durationMonths)
  ) {
    reject("Subscription duration must be 1, 3, 6 or 12 months.");
  }

  const plans = getPaidPlansForMarket(
    countryCode.toUpperCase()
  );

  const plan = plans.find(
    (candidate) =>
      String(candidate.key || candidate.planKey || "")
        .toUpperCase() === planKey.toUpperCase()
  );

  if (!plan) {
    reject("Paid subscription plan not found for market.");
  }

  const monthlyAmount = requireAmount(plan.price);
  const regularAmount = monthlyAmount * durationMonths;

  if (!Number.isSafeInteger(regularAmount)) {
    reject("Subscription total exceeds supported range.");
  }

  const discountPercent =
    DURATION_DISCOUNTS[durationMonths];

  // All approved market prices are expressed in whole currency
  // units. Round the percentage discount once on the total.
  const discountAmount = Math.round(
    regularAmount * discountPercent / 100
  );

  const totalAmount = regularAmount - discountAmount;

  if (
    !Number.isSafeInteger(discountAmount) ||
    !Number.isSafeInteger(totalAmount) ||
    totalAmount <= 0
  ) {
    reject("Invalid calculated subscription total.");
  }

  const currency = String(plan.currency || "").toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    reject("Invalid configured market currency.");
  }

  return Object.freeze({
    planKey: String(plan.key || plan.planKey).toUpperCase(),
    countryCode: countryCode.toUpperCase(),
    currency,
    durationMonths,
    discountPercent,
    monthlyAmount,
    regularAmount,
    discountAmount,
    totalAmount,
  });
}

module.exports = {
  DURATION_DISCOUNTS,
  quoteSubscriptionDuration,
};
