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

function formatMoney(value, currency = "RWF") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("en-US")} ${currency || "RWF"}`;
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

function normalizePhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/[^\d]/g, "");

  if (!digits) return "";
  if (digits.startsWith("07") && digits.length === 10) return `250${digits.slice(1)}`;
  if (digits.startsWith("2507") && digits.length === 12) return digits;

  return digits;
}

function isValidRwandaPhone(value) {
  return /^2507\d{8}$/.test(normalizePhone(value));
}

function pickOverviewPayload(data) {
  return {
    store: data?.store || data?.tenant || data?.me?.tenant || data?.user?.tenant || null,
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
    findSubscriptionPlan(plans, subscription?.nextPlanKey) ||
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
  return (
    <div className="svx-billing-capacity-line">
      <div>
        <strong>{label}</strong>
        <span>{value} active / {limit ?? "plan-based"} allowed</span>
      </div>
      <Badge tone={tone}>{tone === "danger" ? "Over" : tone === "warning" ? "Limit" : "OK"}</Badge>
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
            {plan.recommended ? (
              <Badge tone="primary">Recommended</Badge>
            ) : null}
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
    <div className="svx-billing-mini-card">
      <div className="svx-billing-mini-head">
        <span>{label}</span>
        <Badge tone={tone}>{tone === "warning" ? "Watch" : tone === "danger" ? "Over" : "Live"}</Badge>
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
        <Badge tone="neutral">{payments.length} records</Badge>
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
              <div data-label="Amount">{formatMoney(payment.amount ?? payment.priceAmount, payment.currency || "RWF")}</div>
              <div data-label="Status"><Badge tone={tone}>{status || "UNKNOWN"}</Badge></div>
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

    const cleanPhone = normalizePhone(phone);

    if (!isValidRwandaPhone(cleanPhone)) {
      toast.error("Use a Rwanda phone number like 078xxxxxxx or 25078xxxxxxx.");
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

      toast.success("MoMo request sent. Confirm on your phone.");

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
  const storeName = store?.name || "Your store";
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
          <p>See if the store is active, when access renews, and pay for the next month.</p>
        </div>

        <div className="svx-billing-command-actions">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <AsyncButton type="button" loading={refreshing} onClick={refreshStatus} className="svx-billing-secondary-btn svx-billing-refresh-soft">
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
            <Badge tone="primary">Launch pricing</Badge>
          </div>

          <div className="svx-billing-current-amount">
            {displayPlan
              ? formatMoney(displayPlan.price, displayPlan.currency)
              : formatMoney(subscription?.priceAmount, subscription?.currency)}
            <span>/ month</span>
          </div>

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
            <span>Renewal</span>
            <h3>Pay for next month</h3>
            <p>Choose the plan that matches your store, confirm the MoMo number, and send the request.</p>
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

            <label>
              <span>MoMo phone</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="07XXXXXXXX or 2507XXXXXXXX"
                inputMode="tel"
                required
              />
            </label>

            {!isValidRwandaPhone(phone) ? (
              <div className="svx-billing-warning">Enter a Rwanda MoMo number before sending the payment request.</div>
            ) : null}

            <AsyncButton
              type="submit"
              loading={submitting}
              disabled={!selectedPlan || !isValidRwandaPhone(phone)}
              className="svx-billing-primary-btn"
            >
              Send MoMo request
            </AsyncButton>

            <AsyncButton type="button" loading={refreshing} onClick={refreshStatus} className="svx-billing-secondary-btn svx-billing-payment-status-btn">
              Check payment status
            </AsyncButton>

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
