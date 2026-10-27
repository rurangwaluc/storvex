import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { startFlutterwaveSandboxCheckout } from "./startFlutterwaveSandboxCheckout";

const STORVEX_FLUTTERWAVE_SANDBOX_UI_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_FLUTTERWAVE_SANDBOX_UI_ENABLED === "true";


import apiClient from "../../services/apiClient";
import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  findSubscriptionPlan,
  normalizeSubscriptionPlans,
  pickRecommendedPlan,
  planCapacityLabel,
} from "../../utils/subscriptionPlans";
import "./BillingOverview.css";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(value, currency = "") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  const amount = Math.round(n).toLocaleString("en-US");
  const code = cleanString(currency).toUpperCase();

  return code ? `${amount} ${code}` : amount;
}

function formatDate(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysUntil(value) {
  if (!value) return null;

  const end = new Date(value).getTime();
  if (!Number.isFinite(end)) return null;

  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
}

function normalizePaymentPhone(value) {
  return String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

function hasPaymentPhone(value) {
  const digits = normalizePaymentPhone(value).replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function pickOverviewPayload(data) {
  return {
    store: data?.store || data?.tenant || data?.me?.tenant || data?.user?.tenant || null,
    market: data?.market || null,
    subscription: data?.subscription || data?.me?.subscription || null,
    usage: data?.usage || null,
    payments: Array.isArray(data?.payments) ? data.payments : [],
  };
}

function pickActiveStaff(overview) {
  const usage = overview?.usage || null;
  const subscription = overview?.subscription || null;

  return toNumber(
    usage?.activeStaff ??
      usage?.activeUsers ??
      subscription?.activeUsers ??
      subscription?.activeStaff,
    0,
  );
}

function pickStaffLimit(overview) {
  const usage = overview?.usage || null;
  const subscription = overview?.subscription || null;
  const raw = usage?.staffLimit ?? subscription?.staffLimit;
  return Number.isFinite(Number(raw)) ? Number(raw) : null;
}

function pickActiveBranches(overview) {
  const usage = overview?.usage || null;
  const subscription = overview?.subscription || null;
  return toNumber(usage?.activeBranches ?? subscription?.activeBranches, 0);
}

function pickEffectiveBranchLimit(overview) {
  const usage = overview?.usage || null;
  const subscription = overview?.subscription || null;

  const raw =
    usage?.effectiveBranchLimit ??
    subscription?.effectiveBranchLimit ??
    usage?.branchLimit ??
    subscription?.branchLimit;

  return Number.isFinite(Number(raw)) ? Number(raw) : null;
}

function pickCurrentPlan(plans, subscription) {
  return (
    findSubscriptionPlan(plans, subscription?.planKey) ||
    null
  );
}

function subscriptionMeta(subscription) {
  const status = cleanString(subscription?.status).toUpperCase();
  const mode = cleanString(subscription?.accessMode).toUpperCase();
  const canOperate = subscription?.canOperate !== false;

  if (status === "EXPIRED" || canOperate === false) {
    return {
      label: "Needs renewal",
      tone: "warning",
      note: "Renew to keep sales, stock, and staff work active.",
    };
  }

  if (mode === "TRIAL") {
    return {
      label: "Trial active",
      tone: "info",
      note: "Your free trial is active.",
    };
  }

  if (mode === "READ_ONLY") {
    return {
      label: "Read-only",
      tone: "warning",
      note: "You can view records, but daily work is paused.",
    };
  }

  return {
    label: "Active",
    tone: "success",
    note: "Your store can keep working.",
  };
}

function statusToneClass(tone) {
  if (tone === "success") return "is-success";
  if (tone === "warning") return "is-warning";
  if (tone === "danger") return "is-danger";
  if (tone === "info") return "is-info";
  return "is-neutral";
}

function Badge({ children, tone = "neutral" }) {
  return <span className={cx("svx-billing-badge", statusToneClass(tone))}>{children}</span>;
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 12.5L10.25 15.75L17.5 8.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgressBar({ value, max, tone = "success" }) {
  const safeMax = Number(max) > 0 ? Number(max) : 1;
  const safeValue = Math.max(0, Number(value) || 0);
  const pct = Math.min(100, Math.round((safeValue / safeMax) * 100));

  return (
    <div className="svx-billing-progress" data-tone={tone}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

function CapacityLine({ label, value, limit, tone }) {
  const state =
    tone === "danger"
      ? "Over plan limit"
      : tone === "warning"
        ? "At plan limit"
        : "Within plan";

  return (
    <div className="svx-billing-capacity-line">
      <div className="svx-billing-capacity-copy">
        <div>
          <strong>{label}</strong>
          <span>{value} active / {limit ?? "plan-based"} allowed</span>
        </div>

        <small className={`is-${tone}`}>{state}</small>
      </div>

      {limit ? <ProgressBar value={value} max={limit} tone={tone} /> : null}
    </div>
  );
}

function LaunchPlanRow({
  plan,
  active,
  disabled,
  disabledReason,
  onSelect,
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.key)}
      disabled={disabled}
      className={cx(
        "svx-billing-plan-row",
        active && "is-active",
        disabled && "is-disabled",
      )}
    >
      <div className="svx-billing-plan-main">
        <div>
          <div className="svx-billing-plan-top">
            <strong>{plan.name}</strong>
          </div>
          <p>{plan.audience}</p>
        </div>

        <span>
          {formatMoney(plan.price, plan.currency)} / month
        </span>
      </div>

      <div className="svx-billing-plan-note">
        {plan.shortDescription}
      </div>

      <div className="svx-billing-plan-capacity">
        {planCapacityLabel(plan)}
      </div>

      <div className="svx-billing-plan-features">
        {plan.highlights.slice(0, 3).map((item) => (
          <span key={item}>
            <CheckIcon />
            {item}
          </span>
        ))}
      </div>

      {disabledReason ? (
        <div className="svx-billing-plan-disabled-note">
          {disabledReason}
        </div>
      ) : null}
    </button>
  );
}


function MetricBlock({ label, value, note, tone = "neutral" }) {
  return (
    <div className={`svx-billing-mini-card is-${tone}`}>
      <div className="svx-billing-mini-head">
        <span>{label}</span>
      </div>

      <strong>{value}</strong>

      {note ? <p>{note}</p> : null}
    </div>
  );
}

function PaymentHistory({ payments }) {
  if (!payments.length) {
    return (
      <section className="svx-billing-card svx-billing-empty">
        <strong>No payment records yet</strong>
        <p>After you renew, payment records will appear here.</p>
      </section>
    );
  }

  return (
    <section className="svx-billing-card svx-billing-history">
      <div className="svx-billing-card-head">
        <div>
          <span>Payment history</span>
          <h3>Recent billing activity</h3>
        </div>
        <span className="svx-billing-record-count">
          {payments.length} record{payments.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="svx-billing-history-table">
        <div className="svx-billing-history-row is-head">
          <span>Reference</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Provider</span>
          <span>Created</span>
        </div>

        {payments.map((payment) => {
          const status = cleanString(payment.status).toUpperCase();
          const tone =
            status === "SUCCESS"
              ? "success"
              : status === "FAILED"
                ? "danger"
                : status === "PENDING"
                  ? "warning"
                  : "neutral";

          return (
            <div key={payment.id || payment.reference} className="svx-billing-history-row">
              <div data-label="Reference">
                <strong>{payment.reference || "—"}</strong>
                <small>{payment.purpose || "Subscription"}</small>
              </div>
              <div data-label="Amount">{formatMoney(payment.amount ?? payment.priceAmount, payment.currency)}</div>
              <div data-label="Status">
                <span className={`svx-billing-status-text is-${tone}`}>
                  {status || "UNKNOWN"}
                </span>
              </div>
              <div data-label="Provider">{payment.provider || "—"}</div>
              <div data-label="Created">{formatDate(payment.createdAt)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Billing({ embedded = false } = {}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [overview, setOverview] = useState({
    store: null,
    market: null,
    subscription: null,
    usage: null,
    payments: [],
  });

  const [plans, setPlans] = useState([]);
  const [planKey, setPlanKey] = useState("");
  const [phone, setPhone] = useState(localStorage.getItem("storvex_ownerPhone") || "");
  const [paymentRef, setPaymentRef] = useState("");

  const activeStaff = useMemo(() => pickActiveStaff(overview), [overview]);
  const staffLimit = useMemo(() => pickStaffLimit(overview), [overview]);
  const activeBranches = useMemo(() => pickActiveBranches(overview), [overview]);
  const branchLimit = useMemo(() => pickEffectiveBranchLimit(overview), [overview]);

  const selectedPlan = useMemo(() => {
    return (
      findSubscriptionPlan(plans, planKey) ||
      pickRecommendedPlan(plans)
    );
  }, [plans, planKey]);

  const currentPlan = useMemo(
    () => pickCurrentPlan(plans, overview.subscription),
    [plans, overview.subscription],
  );

  const confirmedNextPlan = useMemo(() => {
    const nextPlanKey = overview?.subscription?.nextPlanKey;

    if (!nextPlanKey) return null;

    const hasSuccessfulPayment = (overview?.payments || []).some(
      (payment) =>
        String(payment?.purpose || "").toUpperCase() ===
          "SUBSCRIPTION_RENEWAL" &&
        String(payment?.status || "").toUpperCase() === "SUCCESS" &&
        payment?.planKey === nextPlanKey,
    );

    return hasSuccessfulPayment
      ? findSubscriptionPlan(plans, nextPlanKey)
      : null;
  }, [
    overview?.subscription?.nextPlanKey,
    overview?.payments,
    plans,
  ]);

  const displayPlan = currentPlan || selectedPlan;

  async function loadBilling({ silent = false } = {}) {
    if (!silent) setLoading(true);

    try {
      const [{ data: overviewData }, { data: planData }] =
        await Promise.all([
          apiClient.get("/billing/overview"),
          apiClient.get("/billing/plans"),
        ]);

      const nextOverview = pickOverviewPayload(overviewData || {});
      const nextPlans = normalizeSubscriptionPlans(
        planData?.plans,
      ).filter((plan) => !plan.isEnterprise);

      setOverview(nextOverview);
      setPlans(nextPlans);

      if (!phone && nextOverview?.store?.phone) {
        setPhone(nextOverview.store.phone);
      }

      const currentPlanKey =
        nextOverview?.subscription?.nextPlanKey ||
        nextOverview?.subscription?.planKey ||
        "";

      const match =
        findSubscriptionPlan(nextPlans, currentPlanKey) ||
        pickRecommendedPlan(nextPlans);

      setPlanKey((current) => {
        return findSubscriptionPlan(nextPlans, current)?.key ||
          match?.key ||
          "";
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load billing");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshStatus() {
    setRefreshing(true);

    try {
      await loadBilling({ silent: true });
      toast.success("Billing status refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  async function startFlutterwavePayment() {
    if (!selectedPlan) {
      toast.error("Select a subscription plan.");
      return;
    }

    setSubmitting(true);

    try {
      await startFlutterwaveSandboxCheckout({
        planKey: selectedPlan.key,
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Flutterwave checkout is unavailable."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function startRenewal(event) {
    event.preventDefault();

    if (!selectedPlan) {
      toast.error("Select a renewal plan.");
      return;
    }

    const cleanPhone = normalizePaymentPhone(phone);

    if (!hasPaymentPhone(cleanPhone)) {
      toast.error("Enter a valid payment phone number.");
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await apiClient.post("/billing/renew", {
        planKey: selectedPlan.key,
        phone: cleanPhone,
      });

      const ref =
        data?.paymentReference ||
        data?.reference ||
        data?.payment?.reference ||
        data?.payment?.id ||
        "";

      setPaymentRef(ref);
      localStorage.setItem("storvex_ownerPhone", cleanPhone);

      toast.success("Payment request sent. Confirm on your phone.");

      await loadBilling({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Renewal request failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PageSkeleton titleWidth="w-48" lines={4} variant="default" />;
  }

  const subscription = overview.subscription || null;
  const store = overview.store || null;
  const market = overview.market || null;
  const storeName = store?.name || "Your store";

  const subscriptionPaymentsEnabled =
    market?.subscriptionPaymentsEnabled === true;

  const marketCurrency =
    market?.currencyCode ||
    store?.currencyCode ||
    "";

  const meta = subscriptionMeta(subscription);
  const daysLeft = daysUntil(subscription?.endDate);
  const graceDaysLeft = daysUntil(subscription?.graceEndDate);

  const staffTone =
    staffLimit != null && activeStaff > staffLimit
      ? "danger"
      : staffLimit != null && activeStaff >= staffLimit
        ? "warning"
        : "success";

  const branchTone =
    branchLimit != null && activeBranches > branchLimit
      ? "danger"
      : branchLimit != null && activeBranches >= branchLimit
        ? "warning"
        : "success";

  // STEP 342CM-E / APPROVED PREMIUM BILLING
  return (
    <div className="svx-billing-page svx-billing-v2 svx-billing-premium">
      <header className="svx-bp-titlebar">
        <div>
          <h2>Billing &amp; subscription</h2>
          <p>Your plan, usage and payment history in one place.</p>
        </div>
        {/* STEP 342CM-J / REMOVE REFRESH */}
      </header>

      <section className="svx-bp-hero" aria-label="Current subscription">
        <div className="svx-bp-primary">
          <span className="svx-bp-kicker">Current subscription</span>
          <div className="svx-bp-planline">
            <h3>{displayPlan?.name || "Storvex plan"}</h3>
            <span className={`svx-bp-status is-${meta.tone}`}>
              {meta.label}
            </span>
          </div>
          <div className="svx-bp-price">
            <strong>
              {displayPlan
                ? formatMoney(displayPlan.price, displayPlan.currency)
                : formatMoney(
                    subscription?.priceAmount,
                    subscription?.currency || marketCurrency
                  )}
            </strong>
            <span>/ month</span>
          </div>
          <p className="svx-bp-description">
            {meta.note}
            {daysLeft != null && subscription?.endDate
              ? ` Subscription ends ${formatDate(subscription.endDate)} (${daysLeft} days left).`
              : ""}
          </p>
          {confirmedNextPlan ? (
            <p className="svx-bp-next">
              Next paid plan: {confirmedNextPlan.name}, after your trial ends
              on {formatDate(subscription?.trialEndDate)}.
            </p>
          ) : null}
          <div className="svx-bp-actions">
            <Link to="/app/settings/billing/renew" className="svx-bp-action-primary">
              Manage plan &amp; renew
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <aside className="svx-bp-usage" aria-label="Plan usage">
          <span className="svx-bp-kicker">Usage</span>
          {/* STEP 342CM-H / BILLING USAGE REFINEMENT */}
          {[
            {
              label: "Staff seats",
              count: activeStaff,
              limit: staffLimit,
              tone: staffTone,
            },
            {
              label: "Store locations",
              count: activeBranches,
              limit: branchLimit,
              tone: branchTone,
            },
          ].map((usage) => (
            <div className="svx-bp-usage-item" key={usage.label}>
              <div className="svx-bp-usage-top">
                <strong>{usage.label}</strong>
                <span className={`is-${usage.tone}`}>
                  {usage.tone === "danger"
                    ? "Over limit"
                    : usage.tone === "warning"
                      ? "At limit"
                      : "Within plan"}
                </span>
              </div>
              <p className="svx-bp-usage-count">
                {usage.count} active
                {usage.limit == null
                  ? " / Unlimited"
                  : ` / ${usage.limit} allowed`}
              </p>
              <div
                className="svx-bp-usage-track"
                role="progressbar"
                aria-label={`${usage.label} usage`}
                aria-valuemin={0}
                aria-valuemax={usage.limit > 0 ? usage.limit : 100}
                aria-valuenow={Math.max(
                  0,
                  Math.min(usage.count, usage.limit > 0 ? usage.limit : 100)
                )}
              >
                <span
                  className={`is-${usage.tone}`}
                  style={{
                    width: `${
                      usage.limit == null
                        ? 0
                        : usage.limit > 0
                          ? Math.min(100, Math.max(0, usage.count / usage.limit * 100))
                          : 100
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </aside>
      </section>

      <section className="svx-bp-facts" aria-label="Subscription information">
        <article className="svx-bp-fact">
          <span className="svx-bp-fact-icon" aria-hidden="true">▣</span>
          <div>
            <small>Store</small>
            <strong>{storeName}</strong>
          </div>
        </article>
        <article className="svx-bp-fact">
          <span className="svx-bp-fact-icon" aria-hidden="true">▦</span>
          <div>
            <small>Subscription ends</small>
            <strong>{formatDate(subscription?.endDate)}</strong>
            <em>{daysLeft == null ? "Date unavailable" : `${daysLeft} days left`}</em>
          </div>
        </article>
        <article className="svx-bp-fact">
          <span className="svx-bp-fact-icon" aria-hidden="true">✓</span>
          <div>
            <small>Status</small>
            <strong>{meta.label}</strong>
            <em>{meta.note}</em>
          </div>
        </article>
        <article className="svx-bp-fact">
          <span className="svx-bp-fact-icon" aria-hidden="true">▤</span>
          <div>
            <small>Billing cycle</small>
            <strong>Monthly</strong>
            <em>
              {displayPlan
                ? formatMoney(displayPlan.price, displayPlan.currency)
                : formatMoney(subscription?.priceAmount, subscription?.currency || marketCurrency)}
            </em>
          </div>
        </article>
      </section>

      {!subscriptionPaymentsEnabled ? (
        <p className="svx-bp-notice">
          Online subscription payments are not enabled for this market.
          Your existing access remains unchanged.
        </p>
      ) : null}

      <div className="svx-bp-history">
        <PaymentHistory payments={overview.payments || []} />
      </div>

      <footer className="svx-bp-footer">
        <span>Storvex is a product operated by <strong>RURAXIS LTD</strong>.</span>
        <span>Secure checkout powered by Flutterwave.</span>
      </footer>
    </div>
  );
}
