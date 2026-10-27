/**
 * Deduplicates concurrent verification for the same payment.
 *
 * The supplied verifier must be Storvex's authenticated backend
 * endpoint, not Flutterwave's browser callback.
 *
 * Completed requests are released so subsequent legitimate
 * reconciliation can retry a still-pending payment.
 */
export function createSharedInlinePaymentVerifier(verifyPayment) {
  if (typeof verifyPayment !== "function") {
    throw new Error("Secure payment verification is unavailable.");
  }

  const inFlight = new Map();

  function verify(reference) {
    if (
      typeof reference !== "string" ||
      !/^[A-Za-z0-9_-]{8,100}$/.test(reference)
    ) {
      return Promise.reject(new Error("Invalid payment reference."));
    }

    const existing = inFlight.get(reference);
    if (existing) return existing;

    let task;

    task = Promise.resolve()
      .then(() => verifyPayment(reference))
      .finally(() => {
        if (inFlight.get(reference) === task) {
          inFlight.delete(reference);
        }
      });

    inFlight.set(reference, task);

    return task;
  }

  return { verify };
}
