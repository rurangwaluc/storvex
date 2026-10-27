import "./BillingExperience.css";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function FlutterwaveReturn() {
  const [params] = useSearchParams();
  const reference = params.get("tx_ref") || "";

  const [result, setResult] = useState({
    loading: Boolean(reference),
    status: "PENDING",
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    if (!/^[A-Za-z0-9_-]{8,100}$/.test(reference)) {
      setResult({
        loading: false,
        status: "UNKNOWN",
        error: "No valid payment reference was received.",
      });
      return;
    }

    async function checkPayment() {
      try {
        // Ask the authenticated Storvex server to verify Flutterwave.
        // Browser redirect values are identifiers, never payment proof.
        try {
          await apiClient.post(
            `/billing/payments/${encodeURIComponent(reference)}/complete-sandbox`
          );
        } catch {
          // The authoritative status request below determines what
          // the customer sees, including a pending confirmation.
        }

        if (cancelled) return;

        const { data } = await apiClient.get(
          `/billing/payments/${encodeURIComponent(reference)}`
        );

        if (cancelled) return;

        const serverStatus = String(
          data?.payment?.status || "PENDING"
        ).toUpperCase();

        setResult({
          loading: false,
          status: serverStatus,
          error: "",
        });
      } catch {
        if (cancelled) return;

        setResult({
          loading: false,
          status: "UNKNOWN",
          error: "We could not confirm this payment's status.",
        });
      }
    }

    checkPayment();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  const successful = result.status === "SUCCESS";
  const failed = result.status === "FAILED";

  return (
    <main className="svx-flutterwave-return flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-12 text-[var(--color-text)]">
      <section className="svx-flutterwave-return-card w-full max-w-lg rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="text-sm font-semibold text-[var(--color-text-muted)]">
          Storvex · Subscription payment
        </div>

        <h1 className="mt-3 text-2xl font-black">
          {result.loading
            ? "Checking your payment"
            : successful
              ? "Payment recorded"
              : failed
                ? "Payment unsuccessful"
                : "Payment confirmation pending"}
        </h1>

        <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">
          {result.loading
            ? "We are checking your Storvex payment record."
            : successful
              ? "Storvex has recorded your payment successfully. Your subscription access may now be refreshed."
              : failed
                ? "Your payment was not completed successfully. No subscription activation has been confirmed."
                : "Your payment has not yet been confirmed by Storvex. A checkout redirect alone does not confirm payment."}
        </p>

        {result.error ? (
          <p role="alert" className="mt-3 text-sm text-[var(--color-text-muted)]">
            {result.error}
          </p>
        ) : null}

        {reference && /^[A-Za-z0-9_-]{8,100}$/.test(reference) ? (
          <p className="mt-5 break-all text-xs text-[var(--color-text-muted)]">
            Payment reference: {reference}
          </p>
        ) : null}

        <p className="mt-5 text-xs leading-6 text-[var(--color-text-muted)]">
          Storvex is operated by RURAXIS LTD, the merchant shown at checkout.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/renew"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-primary-contrast)]"
          >
            Review subscription
          </Link>
          <Link
            to="/app/settings/billing"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border)] px-5 text-sm font-bold"
          >
            Billing settings
          </Link>
        </div>
      </section>
    </main>
  );
}
