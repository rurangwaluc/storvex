/**
 * Recheck an existing Inline payment after external authorization.
 *
 * No reservation is created here. Browser input is never payment proof.
 * Only authenticated Storvex status may report payment success.
 */
export function createFlutterwaveInlineReconciler({
  verifyPayment,
  fetchStatus,
  onStatus,
  now = Date.now,
  minIntervalMs = 5000,
}) {
  if (
    typeof verifyPayment !== "function" ||
    typeof fetchStatus !== "function" ||
    typeof now !== "function" ||
    !Number.isSafeInteger(minIntervalMs) ||
    minIntervalMs < 0
  ) {
    throw new Error("Secure payment reconciliation is unavailable.");
  }

  const inFlight = new Map();
  const lastChecked = new Map();

  async function reconcile(reference) {
    if (
      typeof reference !== "string" ||
      !/^[A-Za-z0-9_-]{8,100}$/.test(reference)
    ) {
      throw new Error("Invalid payment reference.");
    }

    if (inFlight.has(reference)) {
      return inFlight.get(reference);
    }

    const current = now();
    if (!Number.isFinite(current)) {
      throw new Error("Invalid reconciliation clock.");
    }

    const previous = lastChecked.get(reference);

    if (
      previous !== undefined &&
      current - previous >= 0 &&
      current - previous < minIntervalMs
    ) {
      return { reference, status: "SKIPPED" };
    }

    lastChecked.set(reference, current);

    const task = (async () => {
      try {
        // Verification is performed by STORVEX, never by the browser.
        // A provider error cannot be treated as proof of failure.
        try {
          await verifyPayment(reference);
        } catch {
          // The authenticated status read below remains authoritative.
        }

        let status = "PENDING";

        try {
          const response = await fetchStatus(reference);
          const serverStatus = String(
            response?.payment?.status || ""
          ).toUpperCase();

          if (serverStatus === "SUCCESS" || serverStatus === "FAILED") {
            status = serverStatus;
          }
        } catch {
          // A failed status request cannot claim successful payment.
        }

        if (typeof onStatus === "function") {
          onStatus({ reference, status });
        }

        return { reference, status };
      } finally {
        inFlight.delete(reference);
      }
    })();

    inFlight.set(reference, task);
    return task;
  }

  return { reconcile };
}
