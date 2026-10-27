"use strict";

const {
  requireFlutterwaveSandboxRuntime,
} = require("./flutterwaveSandboxRuntimeGate");

const {
  requireSandboxRenewalDuration,
} = require("../billing/renewalPaymentQuote");

function reject(message) {
  const error = new Error(message);
  error.status = 403;
  error.code = "SANDBOX_INLINE_REJECTED";
  throw error;
}

/**
 * Fail closed before inserting a payment or reserving an attempt.
 * Return only the public test key; never expose server secrets.
 */
function requireSandboxInlineRuntime(env = process.env) {
  requireFlutterwaveSandboxRuntime(env);

  if (
    env.NODE_ENV !== "development" ||
    env.FLUTTERWAVE_SANDBOX_INLINE_ENABLED !== "true" ||
    env.FLUTTERWAVE_LIVE_ENABLED === "true"
  ) {
    reject("Flutterwave Inline sandbox is not enabled.");
  }

  const publicKey = env.FLUTTERWAVE_TEST_PUBLIC_KEY;

  if (
    typeof publicKey !== "string" ||
    !/^FLWPUBK_TEST-[A-Za-z0-9_-]+$/.test(publicKey)
  ) {
    reject("A Flutterwave test public key is required.");
  }

  return publicKey;
}

/**
 * Construct public Flutterwave Inline configuration from trusted
 * persisted payment and reserved attempt records.
 *
 * Does not contact Flutterwave, change a payment status, or
 * activate any subscription.
 *
 * This helper is deliberately not connected to an HTTP route yet.
 */
function createSandboxInlineConfig({
  payment,
  reservation,
  identity,
  customer,
  env = process.env,
}) {
  const publicKey = requireSandboxInlineRuntime(env);

  if (
    !identity ||
    identity.role !== "OWNER" ||
    typeof identity.userId !== "string" ||
    !identity.userId ||
    typeof identity.tenantId !== "string" ||
    !identity.tenantId
  ) {
    reject("Authenticated business owner required.");
  }

  if (
    !payment ||
    payment.provider !== "FLUTTERWAVE" ||
    payment.purpose !== "SUBSCRIPTION_RENEWAL" ||
    payment.status !== "PENDING" ||
    payment.tenantId !== identity.tenantId ||
    typeof payment.id !== "string" ||
    !payment.id ||
    typeof payment.reference !== "string" ||
    !/^[A-Za-z0-9_-]{8,100}$/.test(payment.reference) ||
    payment.currency !== "RWF" ||
    !Number.isSafeInteger(payment.amount) ||
    payment.amount <= 0 ||
    payment.intentId != null
  ) {
    reject("Trusted pending renewal payment required.");
  }

  if (
    !reservation ||
    reservation.paymentId !== payment.id ||
    reservation.reference !== payment.reference ||
    reservation.status !== "CREATED" ||
    reservation.currency !== payment.currency ||
    reservation.amount !== payment.amount ||
    typeof reservation.attemptId !== "string" ||
    !reservation.attemptId
  ) {
    reject("Matching reserved payment attempt required.");
  }

  const quote = payment.renewalQuote;

  if (
    !quote ||
    ![1, 3, 6, 12].includes(quote.durationMonths) ||
    quote.totalAmount !== payment.amount ||
    quote.currency !== payment.currency ||
    quote.planKey !== payment.planKey
  ) {
    reject("Persisted renewal quote mismatch.");
  }

  requireSandboxRenewalDuration(quote.durationMonths, env);

  if (
    !customer ||
    typeof customer.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())
  ) {
    reject("Verified customer email required.");
  }

  return {
    public_key: publicKey,
    tx_ref: payment.reference,
    amount: payment.amount,
    currency: payment.currency,
    payment_options: "mobilemoneyrwanda,card",
    customer: {
      email: customer.email.trim(),
      name: "Storvex Customer",
    },
    customizations: {
      title: "Storvex Subscription",
      description: "Subscription renewal",
    },
  };
}

module.exports = {
  requireSandboxInlineRuntime,
  createSandboxInlineConfig,
};
