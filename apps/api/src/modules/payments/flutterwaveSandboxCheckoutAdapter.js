"use strict";

const {
  requireFlutterwaveSandboxRuntime,
} = require("./flutterwaveSandboxRuntimeGate");

const API_URL = "https://api.flutterwave.com/v3/payments";

function reject(message) {
  const error = new Error(message);
  error.status = 403;
  error.code = "FLUTTERWAVE_CHECKOUT_REJECTED";
  throw error;
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validCheckoutUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "checkout-v2.dev-flutterwave.com" &&
      !url.username &&
      !url.password &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function validReturnUrl(value) {
  try {
    const url = new URL(value);
    const localSandbox =
      process.env.NODE_ENV === "development" &&
      process.env.FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED === "true" &&
      process.env.FLUTTERWAVE_LIVE_ENABLED !== "true" &&
      url.protocol === "http:" &&
      url.hostname === "localhost" &&
      url.port === "3000" &&
      url.pathname === "/billing/return" &&
      !url.search;

    const approvedProduction =
      url.protocol === "https:" &&
      url.hostname === "storvex.rw";

    return (
      (localSandbox || approvedProduction) &&
      !url.username &&
      !url.password &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function validateRenewalCheckout({
  payment,
  identity,
  plan,
  customer,
  returnUrl,
}) {
  if (
    !identity ||
    !clean(identity.userId) ||
    !clean(identity.tenantId)
  ) {
    reject("Authenticated business identity required");
  }

  if (
    !payment ||
    payment.provider !== "FLUTTERWAVE" ||
    payment.purpose !== "SUBSCRIPTION_RENEWAL" ||
    payment.status !== "PENDING" ||
    !clean(payment.id) ||
    !/^[A-Za-z0-9_-]{8,100}$/.test(
      payment.reference || ""
    ) ||
    payment.tenantId !== identity.tenantId ||
    payment.intentId != null ||
    payment.currency !== "RWF" ||
    !Number.isSafeInteger(payment.amount) ||
    payment.amount <= 0
  ) {
    reject("Trusted renewal payment mismatch");
  }

  if (
    !plan ||
    plan.planKey !== payment.planKey ||
    plan.currency !== payment.currency ||
    !Number.isSafeInteger(plan.amount) ||
    plan.amount !== payment.amount
  ) {
    reject("Server-side renewal price mismatch");
  }

  if (
    !customer ||
    typeof customer.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      customer.email.trim()
    )
  ) {
    reject("Verified customer email required");
  }

  if (!validReturnUrl(returnUrl)) {
    reject("Approved Storvex return URL required");
  }

  return {
    reference: payment.reference,
    amount: payment.amount,
    currency: payment.currency,
    returnUrl,
    customer: {
      email: customer.email.trim(),
      name: clean(customer.name).slice(0, 150),
    },
  };
}

/**
 * Development sandbox only.
 *
 * Dependencies must come from trusted server-side code.
 * Never forward req.body directly as payment or identity.
 *
 * Does not record attempts or activate subscriptions.
 */
async function createSandboxRenewalCheckout({
  payment,
  identity,
  plan,
  customer,
  returnUrl,
  env = process.env,
  fetchImpl,
}) {
  requireFlutterwaveSandboxRuntime(env);

  if (typeof fetchImpl !== "function") {
    reject("Explicit provider transport required");
  }

  const trusted = validateRenewalCheckout({
    payment,
    identity,
    plan,
    customer,
    returnUrl,
  });

  const response = await fetchImpl(API_URL, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization:
        `Bearer ${env.FLUTTERWAVE_TEST_SECRET_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      tx_ref: trusted.reference,
      amount: trusted.amount,
      currency: trusted.currency,
      redirect_url: trusted.returnUrl,
      customer: trusted.customer,
      payment_options: "mobilemoneyrwanda,card",
      customizations: {
        title: "Storvex Subscription",
        description: "Subscription renewal",
      },
    }),
  });

  if (!response?.ok) {
    reject("Sandbox checkout creation failed");
  }

  const result = await response.json();

  if (
    result?.status !== "success" ||
    !validCheckoutUrl(result?.data?.link)
  ) {
    reject("Invalid sandbox checkout response");
  }

  return {
    reference: trusted.reference,
    checkoutUrl: result.data.link,
    provider: "FLUTTERWAVE",
    status: "PENDING",
    merchantName: "RURAXIS LTD",
  };
}

module.exports = {
  validateRenewalCheckout,
  createSandboxRenewalCheckout,
};
