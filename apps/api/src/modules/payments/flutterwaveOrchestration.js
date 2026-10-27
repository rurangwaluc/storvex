"use strict";

const crypto = require("node:crypto");

const {
  assertPaymentOwnership,
} = require("./paymentOwnership");

const {
  createFlutterwaveTestCheckout,
} = require("./flutterwaveCheckout");

function reject(message) {
  const error = new Error(message);
  error.status = 403;
  error.code = "CHECKOUT_NOT_AUTHORIZED";
  throw error;
}

function requireIdentity(identity, purpose) {
  if (!identity || typeof identity !== "object") {
    reject("Authenticated identity required");
  }

  if (purpose === "OWNER_SIGNUP") {
    if (
      typeof identity.accountId !== "string" ||
      !identity.accountId.trim() ||
      identity.emailVerified !== true
    ) {
      reject("Verified Storvex account required");
    }
  } else if (purpose === "SUBSCRIPTION_RENEWAL") {
    if (
      typeof identity.userId !== "string" ||
      !identity.userId.trim() ||
      typeof identity.tenantId !== "string" ||
      !identity.tenantId.trim()
    ) {
      reject("Authenticated business user required");
    }
  } else {
    reject("Unsupported checkout purpose");
  }
}

function trustedAmountMatches(payment, plan) {
  return (
    plan &&
    typeof plan === "object" &&
    plan.planKey === payment.planKey &&
    plan.currency === payment.currency &&
    Number.isSafeInteger(plan.amount) &&
    plan.amount > 0 &&
    plan.amount === payment.amount
  );
}

/**
 * An isolated test-only checkout orchestrator.
 *
 * All loaders and authorization functions must be supplied by
 * a trusted server-side caller. Never supply values directly
 * from an untrusted browser request as identity or payment.
 *
 * This function does not save records or activate plans.
 */
async function prepareFlutterwaveTestCheckout({
  reference,
  identity,
  loadPayment,
  authorizePayment,
  loadPlanPrice,
  loadCustomer,
  redirectUrl,
  secretKey,
  fetchImpl,
}) {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.FLUTTERWAVE_LIVE_ENABLED === "true"
  ) {
    reject("Checkout orchestration disabled outside offline tests");
  }

  if (
    typeof reference !== "string" ||
    !/^[A-Za-z0-9_-]{8,100}$/.test(reference)
  ) {
    reject("Invalid payment reference");
  }

  if (
    typeof loadPayment !== "function" ||
    typeof authorizePayment !== "function" ||
    typeof loadPlanPrice !== "function" ||
    typeof loadCustomer !== "function"
  ) {
    reject("Trusted server-side checkout dependencies required");
  }

  // Load from trusted persistence, never from request-supplied
  // amounts, plans, or customer details.
  const payment = await loadPayment(reference);

  if (!payment || payment.reference !== reference) {
    reject("Payment record not found");
  }

  if (payment.provider !== "FLUTTERWAVE") {
    reject("Payment provider mismatch");
  }

  requireIdentity(identity, payment.purpose);

  // Must check the authenticated identity against the
  // intended signup account or tenant membership.
  const authorized = await authorizePayment({
    identity,
    payment,
  });

  if (authorized !== true) {
    reject("Payment does not belong to this customer");
  }

  const plan = await loadPlanPrice({
    planKey: payment.planKey,
    purpose: payment.purpose,
    payment,
  });

  if (!trustedAmountMatches(payment, plan)) {
    reject("Stored payment does not match current plan price");
  }

  const ownership = assertPaymentOwnership({
    payment,
    purpose: payment.purpose,
    intentId:
      payment.purpose === "OWNER_SIGNUP"
        ? payment.intentId
        : undefined,
    tenantId:
      payment.purpose === "SUBSCRIPTION_RENEWAL"
        ? identity.tenantId
        : undefined,
    planKey: plan.planKey,
    amount: plan.amount,
    currency: plan.currency,
  });

  const customer = await loadCustomer({
    identity,
    payment,
  });

  if (
    !customer ||
    customer.verified !== true ||
    typeof customer.email !== "string"
  ) {
    reject("Verified checkout customer required");
  }

  // Existing test-only checkout service performs strict
  // redirect, key, payload, and provider-response validation.
  const checkout = await createFlutterwaveTestCheckout({
    payment: {
      ...ownership,
      provider: "FLUTTERWAVE",
      status: payment.status,
    },
    customer: {
      email: customer.email,
      name: customer.name || "",
    },
    redirectUrl,
    secretKey,
    fetchImpl,
  });

  return Object.freeze({
    reference: checkout.reference,
    checkoutUrl: checkout.checkoutUrl,
    provider: checkout.provider,
    status: "PENDING",
    purpose: payment.purpose,
  });
}

module.exports = {
  prepareFlutterwaveTestCheckout,
};
