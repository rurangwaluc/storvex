"use strict";

const API_URL = "https://api.flutterwave.com/v3/payments";

function requireTestEnvironment(secretKey, fetchImpl) {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.FLUTTERWAVE_LIVE_ENABLED === "true"
  ) {
    throw new Error("Flutterwave checkout is disabled outside tests");
  }

  if (
    typeof secretKey !== "string" ||
    !secretKey.startsWith("FLWSECK_TEST-")
  ) {
    throw new Error("Flutterwave test secret required");
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("Explicit test transport required");
  }
}

function requireTrustedPayment(payment) {
  if (!payment || typeof payment !== "object") {
    throw new Error("Trusted payment record required");
  }

  const reference = payment.reference;
  const amount = payment.amount;
  const currency = payment.currency;
  const purpose = payment.purpose;

  if (
    typeof reference !== "string" ||
    !/^[A-Za-z0-9_-]{8,100}$/.test(reference) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    currency !== "RWF" ||
    payment.status !== "PENDING" ||
    !["OWNER_SIGNUP", "SUBSCRIPTION_RENEWAL"].includes(purpose) ||
    typeof payment.planKey !== "string" ||
    !payment.planKey.trim()
  ) {
    throw new Error("Invalid trusted payment record");
  }

  if (
    purpose === "OWNER_SIGNUP" &&
    (typeof payment.intentId !== "string" || !payment.intentId.trim())
  ) {
    throw new Error("Signup payment requires intent identity");
  }

  if (
    purpose === "SUBSCRIPTION_RENEWAL" &&
    (typeof payment.tenantId !== "string" || !payment.tenantId.trim())
  ) {
    throw new Error("Renewal requires tenant identity");
  }

  return { reference, amount, currency, purpose };
}

function requireCheckoutCustomer(customer) {
  if (
    !customer ||
    typeof customer.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)
  ) {
    throw new Error("Verified customer email required");
  }

  return {
    email: customer.email.trim(),
    name: String(customer.name || "").trim().slice(0, 150),
  };
}

function requireRedirectUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid checkout return URL");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    !parsed.hostname ||
    parsed.hash
  ) {
    throw new Error("HTTPS checkout return URL required");
  }

  return parsed.toString();
}

function isTrustedCheckoutLink(link) {
  try {
    const url = new URL(link);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (
        url.hostname === "flutterwave.com" ||
        url.hostname.endsWith(".flutterwave.com")
      )
    );
  } catch {
    return false;
  }
}

async function createFlutterwaveTestCheckout({
  payment,
  customer,
  redirectUrl,
  secretKey,
  fetchImpl,
}) {
  // Deliberately inaccessible to ordinary runtime routes.
  requireTestEnvironment(secretKey, fetchImpl);

  // This function must receive a trusted backend payment snapshot.
  // Never pass raw req.body as payment.
  const validatedPayment = requireTrustedPayment(payment);
  const validatedCustomer = requireCheckoutCustomer(customer);
  const safeRedirect = requireRedirectUrl(redirectUrl);

  const payload = {
    tx_ref: validatedPayment.reference,
    amount: validatedPayment.amount,
    currency: validatedPayment.currency,
    redirect_url: safeRedirect,
    customer: validatedCustomer,
    customizations: {
      title: "Storvex Subscription",
      description:
        validatedPayment.purpose === "OWNER_SIGNUP"
          ? "New business subscription"
          : "Subscription renewal",
    },
  };

  const response = await fetchImpl(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response?.ok) {
    throw new Error("Flutterwave checkout creation failed");
  }

  const result = await response.json();

  if (
    result?.status !== "success" ||
    !isTrustedCheckoutLink(result?.data?.link)
  ) {
    throw new Error("Invalid Flutterwave checkout response");
  }

  return {
    reference: validatedPayment.reference,
    checkoutUrl: result.data.link,
    status: "PENDING",
    provider: "FLUTTERWAVE",
  };
}

module.exports = {
  createFlutterwaveTestCheckout,
};
