/**
 * Coordinates a single Flutterwave Inline payment attempt.
 *
 * Provider callbacks are notifications, not payment evidence.
 * Only a subsequent authenticated Storvex status response can
 * report a successful or failed payment.
 *
 * Dependencies are injected to keep the flow independently
 * testable without payment requests.
 */
export async function runFlutterwaveInlinePaymentFlow({
  selection,
  reservePayment,
  loadCheckout,
  openPopup,
  verifyPayment,
  fetchStatus,
  onStatus,
  onFinished,
}) {
  if (
    typeof reservePayment !== "function" ||
    typeof loadCheckout !== "function" ||
    typeof openPopup !== "function" ||
    typeof verifyPayment !== "function" ||
    typeof fetchStatus !== "function"
  ) {
    throw new Error("Secure payment services are unavailable.");
  }

  const report = (status, reference) => {
    if (typeof onStatus === "function") {
      onStatus({ status, reference });
    }
  };

  const data = await reservePayment(selection);

  const reference = data?.paymentReference;

  if (!/^[A-Za-z0-9_-]{8,100}$/.test(reference || "")) {
    throw new Error("Storvex returned an invalid payment reference.");
  }

  // The popup integration must validate the entire authoritative
  // payload before passing it to Flutterwave.
  const checkout = await loadCheckout();

  let verificationStarted = false;
  let closed = false;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;

    if (typeof onFinished === "function") {
      onFinished(reference);
    }
  };

  const onPaymentNotification = async callbackReference => {
    if (
      callbackReference !== reference ||
      verificationStarted ||
      closed
    ) {
      return;
    }

    verificationStarted = true;
    report("VERIFYING", reference);

    try {
      // Never forward provider callback fields as payment proof.
      await verifyPayment(reference);
    } catch {
      // A verification failure is not necessarily a failed payment.
      // The authoritative status lookup below decides the outcome.
    }

    try {
      const response = await fetchStatus(reference);

      const status = String(
        response?.payment?.status || "PENDING"
      ).toUpperCase();

      if (status === "SUCCESS") {
        report("SUCCESS", reference);
      } else if (status === "FAILED") {
        report("FAILED", reference);
      } else {
        report("PENDING", reference);
      }
    } catch {
      report("PENDING", reference);
    } finally {
      // A completed server check ends the guarded UI attempt.
      // It cannot activate the subscription itself.
      finish();
    }
  };

  const onClose = info => {
    if (closed) return;
    closed = true;

    // Closing the popup never reports success or failure.
    // Verification may still be underway in another callback.
    if (!verificationStarted) {
      report("PENDING", reference);
      finish();
    }
  };

  report("OPENING", reference);

  const popup = openPopup({
    data,
    selection,
    checkout,
    onPaymentNotification,
    onClose,
  });

  return {
    reference,
    popup,
  };
}
