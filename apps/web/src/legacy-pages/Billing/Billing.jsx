import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import apiClient from "../../services/apiClient";
import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  findSubscriptionPlan,
  normalizeSubscriptionPlans,
  pickRecommendedPlan,
  planCapacityLabel,
} from "../../utils/subscriptionPlans";
import "./Billing.css";

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

  return (
    <div className="svx-billing-page">
      <section className="svx-billing-command">
        <div className="svx-billing-command-main">
          <span>Billing</span>
          <h2>Your plan and renewal</h2>
          <p>
            {subscriptionPaymentsEnabled
              ? "Manage your plan, usage, renewal date, and subscription payment."
              : "Manage your plan, usage, and renewal readiness for your market."}
          </p>
        </div>

        <div className="svx-billing-command-actions">
          <span className={`svx-billing-plan-state is-${meta.tone}`}>
            {meta.label}
          </span>

          <AsyncButton
            type="button"
            loading={refreshing}
            onClick={refreshStatus}
            className="svx-billing-secondary-btn svx-billing-refresh-soft"
          >
            Refresh
          </AsyncButton>
        </div>
      </section>

      <section className="svx-billing-grid">
        <article className="svx-billing-card svx-billing-current">
          <div className="svx-billing-card-head">
            <div>
              <span>Current plan</span>
              <h3>{displayPlan?.name || "Storvex plan"}</h3>
            </div>
          </div>

          <div className="svx-billing-current-amount">
            {displayPlan
              ? formatMoney(displayPlan.price, displayPlan.currency)
              : formatMoney(
                  subscription?.priceAmount,
                  subscription?.currency || marketCurrency,
                )}
            <span>/ month</span>
          </div>

          {confirmedNextPlan ? (
            <div className="svx-billing-warning">
              <strong>
                Next paid plan: {confirmedNextPlan.name}
              </strong>
              <div>
                Starts after your trial ends on{" "}
                {formatDate(subscription?.trialEndDate)}.
              </div>
            </div>
          ) : null}

          <div className="svx-billing-current-meta">
            <div>
              <span>Store</span>
              <strong>{storeName}</strong>
            </div>
            <div>
              <span>Ends</span>
              <strong>{formatDate(subscription?.endDate)}</strong>
              <small>{daysLeft == null ? "No end date found" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}</small>
            </div>
            <div>
              <span>Status</span>
              <strong>{meta.label}</strong>
              <small>{meta.note}</small>
            </div>
          </div>
        </article>

        <aside className="svx-billing-card svx-billing-capacity">
          <div className="svx-billing-card-head">
            <div>
              <span>Store usage</span>
              <h3>Staff and locations</h3>
            </div>
          </div>

          <CapacityLine label="Staff seats" value={activeStaff} limit={staffLimit} tone={staffTone} />
          <CapacityLine label="Store locations" value={activeBranches} limit={branchLimit} tone={branchTone} />
        </aside>
      </section>

      <section className="svx-billing-card svx-billing-renewal">
        <div className="svx-billing-card-head">
          <div>
            <span>Next plan</span>
            <h3>
              {subscriptionPaymentsEnabled
                ? "Choose and renew"
                : "Choose your next plan"}
            </h3>
            <p>
              {subscriptionPaymentsEnabled
                ? "Choose the plan that fits your business, then complete renewal."
                : "Compare plans and choose what you want to use when subscription payments become available in your market."}
            </p>
          </div>
        </div>

        <form onSubmit={startRenewal} className="svx-billing-renewal-layout">
          <div className="svx-billing-plan-list">
            {plans.map((plan) => {
              const staffTooHigh =
                plan.staffLimit != null &&
                activeStaff > plan.staffLimit;

              const branchesTooHigh =
                plan.branchLimit != null &&
                activeBranches > plan.branchLimit;

              const disabled = staffTooHigh || branchesTooHigh;

              const disabledReason = staffTooHigh
                ? `This store needs at least ${activeStaff} active-user spaces.`
                : branchesTooHigh
                  ? `This store needs at least ${activeBranches} location spaces.`
                  : "";

              return (
                <LaunchPlanRow
                  key={plan.key}
                  plan={plan}
                  active={plan.key === selectedPlan?.key}
                  disabled={disabled}
                  disabledReason={disabledReason}
                  onSelect={setPlanKey}
                />
              );
            })}
          </div>

          <aside className="svx-billing-renewal-panel">
            <div className="svx-billing-selected">
              <span>Selected plan</span>
              <strong>{selectedPlan?.name || "Choose a plan"}</strong>
              <p>
                {selectedPlan
                  ? `${formatMoney(
                      selectedPlan.price,
                      selectedPlan.currency,
                    )} / month`
                  : "No plan available"}
              </p>
            </div>

            {subscriptionPaymentsEnabled ? (
              <label>
                <span>Payment phone</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Enter payment phone number"
                  inputMode="tel"
                  required
                />
              </label>
            ) : null}

            {!subscriptionPaymentsEnabled ? (
              <div className="svx-billing-availability">
                <span>Payment availability</span>
                <strong>Online renewal is not available in your market yet.</strong>
                <p>Your current access is unchanged. You can still choose the plan you want next.</p>
              </div>
            ) : !hasPaymentPhone(phone) ? (
              <div className="svx-billing-warning">
                Enter a valid payment phone number before sending the payment request.
              </div>
            ) : null}

            {subscriptionPaymentsEnabled ? (
              <AsyncButton
                type="submit"
                loading={submitting}
                disabled={!selectedPlan || !hasPaymentPhone(phone)}
                className="svx-billing-primary-btn"
              >
                Send payment request
              </AsyncButton>
            ) : null}

            {subscriptionPaymentsEnabled ? (
              <AsyncButton
                type="button"
                loading={refreshing}
                onClick={refreshStatus}
                className="svx-billing-secondary-btn svx-billing-payment-status-btn"
              >
                Check payment status
              </AsyncButton>
            ) : null}

            {paymentRef ? (
              <div className="svx-billing-payment-ref">
                <span>Payment request created</span>
                <strong>{paymentRef}</strong>
                <p>Confirm on your phone, then refresh billing.</p>
              </div>
            ) : null}
          </aside>
        </form>
      </section>

      <PaymentHistory payments={overview.payments || []} />
    </div>
  );
}
