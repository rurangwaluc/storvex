import apiClient from "../../services/apiClient";

function trustedSandboxCheckoutUrl(value) {
  if (typeof value !== "string") return false;

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

/**
 * Development sandbox checkout only.
 *
 * The API must authorize the customer and create the payment
 * using trusted subscription pricing.
 *
 * A checkout URL is never proof of payment.
 */
export async function startFlutterwaveSandboxCheckout({
  planKey,
  durationMonths = 1,
  expectedTotal,
  expectedCurrency,
  navigateToCheckout = (url) => window.location.assign(url),
  onCheckoutReady,
}) {
  if (typeof planKey !== "string" || !planKey.trim()) {
    throw new Error("Select a subscription plan.");
  }

  // STEP 342CN-BG / CHECKOUT DURATION AND AMOUNT CONTRACT
  // These values verify the displayed estimate, not the server's pricing.
  if (
    ![1, 3, 6, 12].includes(durationMonths) ||
    !Number.isSafeInteger(expectedTotal) ||
    expectedTotal <= 0 ||
    typeof expectedCurrency !== "string" ||
    !/^[A-Z]{3}$/.test(expectedCurrency)
  ) {
    throw new Error("Invalid checkout selection or amount.");
  }

  const { data } = await apiClient.post("/billing/renew", {
    planKey: planKey.trim(),
    durationMonths,
    checkoutMethod: "FLUTTERWAVE_SANDBOX",
  });

  if (
    data?.sandbox !== true ||
    data?.provider !== "FLUTTERWAVE" ||
    data?.paymentStatus !== "PENDING" ||
    data?.merchantName !== "RURAXIS LTD" ||
    data?.durationMonths !== durationMonths ||
    data?.totalAmount !== expectedTotal ||
    data?.currency !== expectedCurrency ||
    !Number.isSafeInteger(data?.monthlyAmount) ||
    data.monthlyAmount <= 0 ||
    !Number.isSafeInteger(data?.discountPercent) ||
    !trustedSandboxCheckoutUrl(data?.checkoutUrl)
  ) {
    throw new Error(
      "Storvex could not confirm a secure sandbox checkout."
    );
  }

  if (
    typeof data.paymentReference !== "string" ||
    !/^[A-Za-z0-9_-]{8,100}$/.test(data.paymentReference)
  ) {
    throw new Error(
      "Storvex could not confirm the payment reference."
    );
  }

  // Persist a recovery hint before leaving the current page.
  // This does not verify or complete the payment.
  if (typeof onCheckoutReady === "function") {
    onCheckoutReady(data.paymentReference);
  }

  navigateToCheckout(data.checkoutUrl);

  return {
    reference: data.paymentReference,
    status: "PENDING",
  };
}
