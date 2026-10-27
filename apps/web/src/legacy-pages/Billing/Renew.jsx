import "./BillingExperience.css";
import "./RenewPremium.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { startFlutterwaveSandboxCheckout } from "./startFlutterwaveSandboxCheckout";
import {
  loadFlutterwaveInlineScript,
  openSandboxInlinePopup,
} from "./flutterwaveSandboxInline";
import { runFlutterwaveInlinePaymentFlow } from "./flutterwaveInlinePaymentFlow";
import { createFlutterwaveInlineReconciler } from "./flutterwaveInlineReconciliation";
import { createSharedInlinePaymentVerifier } from "./flutterwaveInlineSharedVerification";
import {
  saveInlineRecoveryReference,
  readInlineRecoveryReference,
  clearInlineRecoveryReference,
} from "./flutterwaveInlineRecovery";

const STORVEX_FLUTTERWAVE_SANDBOX_UI_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_FLUTTERWAVE_SANDBOX_UI_ENABLED === "true";

// Separate opt-in; the hosted payment flow remains the default.
const STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED =
  STORVEX_FLUTTERWAVE_SANDBOX_UI_ENABLED &&
  process.env.NEXT_PUBLIC_FLUTTERWAVE_SANDBOX_INLINE_ENABLED === "true";

// Multi-month checkout requires a separate explicit development opt-in.
// Neither frontend flag authorizes payment without the backend gate.
const STORVEX_FLUTTERWAVE_SANDBOX_MULTI_MONTH_UI_ENABLED =
  STORVEX_FLUTTERWAVE_SANDBOX_UI_ENABLED &&
  process.env.NEXT_PUBLIC_FLUTTERWAVE_SANDBOX_MULTI_MONTH_UI_ENABLED === "true";



import apiClient from "../../services/apiClient";
import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { useTheme } from "../../hooks/useTheme";
import {
  normalizeSubscriptionPlan,
  normalizeSubscriptionPlans,
} from "../../utils/subscriptionPlans";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function strongText() {
  return "text-[var(--color-text)]";
}

function mutedText() {
  return "text-[var(--color-text-muted)]";
}

function softText() {
  return "text-[var(--color-text-muted)]";
}

function pageShell() {
  return "svx-renew-page min-h-screen overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-text)]";
}

function pageCard() {
  return "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "app-input";
}

function primaryBtn() {
  return "inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function badgeClass(tone = "neutral") {
  if (tone === "success") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (tone === "info") {
    return "bg-sky-500/10 text-sky-600 dark:text-sky-300";
  }

  if (tone === "warning") {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
  }

  if (tone === "process") {
    return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
  }

  if (tone === "primary") {
    return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
  }

  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black",
        badgeClass(tone),
        className,
      )}
    >
      {children}
    </span>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function ThemeToggle({ isDark, onToggleTheme }) {
  return (
    <button
      type="button"
      onClick={onToggleTheme}
      aria-label="Toggle theme"
      className="inline-flex h-12 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] p-1 text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]"
    >
      <span
        className={cx(
          "flex h-10 w-10 items-center justify-center rounded-full transition",
          !isDark
            ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-sm"
            : "text-[var(--color-text-muted)]",
        )}
      >
        <SunIcon />
      </span>

      <span
        className={cx(
          "flex h-10 w-10 items-center justify-center rounded-full transition",
          isDark
            ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-sm"
            : "text-[var(--color-text-muted)]",
        )}
      >
        <MoonIcon />
      </span>
    </button>
  );
}

function cleanString(value) {
  return String(value || "").trim();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(value, currency) {
  const n = Number(value);
  const c = currency || "RWF";

  if (!Number.isFinite(n)) return "—";

  return `${Math.round(n).toLocaleString("en-US")} ${c}`;
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

function normalizePlan(plan) {
  return normalizeSubscriptionPlan(plan);
}

function groupPlans(plans) {
  const normalized = normalizeSubscriptionPlans(plans).filter(
    (plan) => !plan.isEnterprise,
  );

  const maxStaffLimit = normalized.reduce((maximum, plan) => {
    if (plan.staffLimit == null) return maximum;
    return Math.max(maximum, plan.staffLimit);
  }, 0);

  const maxBranchLimit = normalized.reduce((maximum, plan) => {
    if (plan.branchLimit == null) return maximum;
    return Math.max(maximum, plan.branchLimit);
  }, 0);

  return {
    standard: normalized,
    maxStaffLimit,
    maxBranchLimit,
  };
}

function statusMeta(sub) {
  const status = cleanString(sub?.status).toUpperCase();
  const mode = cleanString(sub?.accessMode).toUpperCase();
  const canOperate = sub?.canOperate !== false;

  if (status === "EXPIRED" || canOperate === false) {
    return {
      label: "Read-only",
      tone: "warning",
      note: "Renew to restore operational write access.",
    };
  }

  if (mode === "READ_ONLY") {
    return {
      label: "Read-only",
      tone: "process",
      note: "Historical data stays visible while write actions are blocked.",
    };
  }

  if (mode === "TRIAL") {
    return {
      label: "Trial",
      tone: "info",
      note: "Trial workspace is still active.",
    };
  }

  return {
    label: "Active",
    tone: "success",
    note: "Subscription is active and operations can continue.",
  };
}

function isAccessRecovered(sub) {
  const mode = cleanString(sub?.accessMode).toUpperCase();
  const status = cleanString(sub?.status).toUpperCase();
  const canOperate = sub?.canOperate !== false;

  return mode === "ACTIVE" && status !== "EXPIRED" && canOperate;
}

function pickActiveStaff(data) {
  const sub = data?.subscription || null;
  const usage = data?.usage || null;

  return toNumber(
    usage?.activeStaff ??
      usage?.activeUsers ??
      sub?.activeUsers ??
      sub?.activeStaff,
    0,
  );
}

function pickActiveBranches(data) {
  const sub = data?.subscription || null;
  const usage = data?.usage || null;

  return toNumber(usage?.activeBranches ?? sub?.activeBranches, 0);
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="min-w-0">
      {eyebrow ? (
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h2
        className={cx(
          "mt-3 text-[1.55rem] font-black tracking-[-0.04em] sm:text-[1.95rem]",
          strongText(),
        )}
      >
        {title}
      </h2>

      {subtitle ? (
        <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function FilterChip({ active, children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex h-10 items-center justify-center rounded-2xl px-4 text-xs font-black uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]"
          : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:border-[var(--color-primary)]",
      )}
    >
      {children}
    </button>
  );
}

function InfoStat({ label, value, sub }) {
  return (
    <div className={cx(softPanel(), "min-w-0 p-4")}>
      <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
        {label}
      </div>

      <div className={cx("mt-2 break-words text-sm font-black leading-6", strongText())}>
        {value || "—"}
      </div>

      {sub ? (
        <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>{sub}</div>
      ) : null}
    </div>
  );
}

function PlanCard({ plan, active, disabled, reason, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.key)}
      disabled={disabled}
      className={cx(
        "group relative w-full min-w-0 overflow-hidden rounded-[24px] border p-4 text-left transition disabled:cursor-not-allowed",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-[var(--shadow-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-card)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-soft)]",
        disabled ? "opacity-60 hover:translate-y-0" : "",
      )}
    >
      {active ? (
        <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-[var(--color-primary)]" />
      ) : null}

      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cx("truncate text-sm font-black tracking-[-0.02em]", strongText())}>
            {plan.label}
          </div>

          <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
            {plan.audience}
          </div>
        </div>

        <Badge tone={active ? "primary" : "neutral"} className="shrink-0">
          {plan.recommended ? "Recommended" : plan.cycleLabel || "Monthly"}
        </Badge>
      </div>

      <div className={cx("mt-4 text-xl font-black tracking-[-0.04em]", strongText())}>
        {formatMoney(plan.price, plan.currency)}
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[var(--color-surface-2)] p-3">
          <div className={cx("text-[9px] font-black uppercase tracking-[0.16em]", softText())}>
            Staff
          </div>
          <div className={cx("mt-1 text-sm font-black", strongText())}>
            {plan.staffLimit ?? "Custom"}
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--color-surface-2)] p-3">
          <div className={cx("text-[9px] font-black uppercase tracking-[0.16em]", softText())}>
            Branches
          </div>
          <div className={cx("mt-1 text-sm font-black", strongText())}>
            {plan.branchLimit ?? "Custom"}
          </div>
        </div>
      </div>

      {disabled && reason ? (
        <div className="mt-3 rounded-2xl bg-amber-500/10 px-3 py-2 text-xs font-bold leading-5 text-amber-600 dark:text-amber-300">
          {reason}
        </div>
      ) : null}
    </button>
  );
}

function EnterpriseRequiredPanel({
  storeName,
  activeStaff,
  activeBranches,
  maxStaffLimit,
  onBack,
}) {
  return (
    <section className={cx(pageCard(), "overflow-hidden")}>
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone="warning">Custom plan required</Badge>
            <Badge tone="primary">Enterprise</Badge>
          </div>

          <h3 className={cx("mt-4 text-2xl font-black tracking-[-0.05em]", strongText())}>
            This store needs a custom Enterprise renewal.
          </h3>

          <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
            Standard self-service renewal supports up to {maxStaffLimit || 10} staff. {storeName}
            currently has {activeStaff} active staff and {activeBranches} active branch
            {activeBranches === 1 ? "" : "es"}, so it should be handled through a custom plan.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoStat
              label="Active staff"
              value={activeStaff}
              sub={`Standard max: ${maxStaffLimit || 10}`}
            />

            <InfoStat
              label="Active branches"
              value={activeBranches}
              sub="Used for custom subscription sizing"
            />
          </div>
        </div>

        <aside className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)] p-5 sm:p-6 xl:border-l xl:border-t-0">
          <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
            Next action
          </div>

          <div className={cx("mt-3 text-lg font-black tracking-[-0.03em]", strongText())}>
            Use billing settings
          </div>

          <p className={cx("mt-3 text-sm font-semibold leading-6", mutedText())}>
            Go back to the app billing screen and contact support from the Enterprise panel.
          </p>

          <button type="button" onClick={onBack} className={cx(primaryBtn(), "mt-5 w-full")}>
            Back to app
          </button>
        </aside>
      </div>
    </section>
  );
}

function TopRecoveryBar({ storeName, sub, isDark, onToggleTheme }) {
  const meta = statusMeta(sub);
  const navigate = useNavigate();

  async function handleSignOut() {
    // Revoke the passwordless account session when present.
    try {
      await fetch("/api/auth/account/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // An unavailable API must not trap users on this page.
    }

    // Clear retail authentication without removing business data.
    try {
      localStorage.removeItem("tenantToken");
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("tenantId");
      localStorage.removeItem("activeTenantId");
      localStorage.removeItem("activeTenantName");
      localStorage.removeItem("activeBranchName");
      localStorage.removeItem("activeBranchCode");
      localStorage.removeItem("activeBranchIsMain");
      sessionStorage.removeItem("storvex_me_cache_v2");
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
            Storvex recovery
          </div>

          <div className={cx("mt-1 truncate text-lg font-black tracking-tight", strongText())}>
            {storeName}
          </div>

          <div className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
            Restore subscription access and return to full operations.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>

          <ThemeToggle isDark={isDark} onToggleTheme={onToggleTheme} />

          <button type="button" onClick={() => window.history.back()} className={secondaryBtn()}>
            Back
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className={secondaryBtn()}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

// STEP 342CM-P / EMBEDDED SETTINGS RENEW
// Embedded renewal inherits the existing workspace theme.
// Only standalone renewal mounts an independent theme controller.
export default function Renew({ embedded = false }) {
  return embedded
    ? <RenewContent embedded />
    : <StandaloneRenew />;
}

function StandaloneRenew() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <RenewContent
      embedded={false}
      isDark={isDark}
      toggleTheme={toggleTheme}
    />
  );
}

function RenewContent({
  embedded = false,
  isDark = false,
  toggleTheme = () => {},
}) {
  const nav = useNavigate();

  // Embedded renewal follows the workspace's theme attribute.
  // The standalone renewal page keeps its own theme controls.
  const renewThemeClass = embedded
    ? ""
    : isDark
      ? "is-dark"
      : "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inlinePaymentStatus, setInlinePaymentStatus] = useState("");

  // Synchronous lock prevents rapid clicks before React updates.
  const paymentAttemptLock = useRef(false);

  // STEP 342CN-DU / PAYMENT LOCK OWNERSHIP
  const paymentAttemptOwner = useRef(0);
  const inlinePaymentToRecheck = useRef(null);

  // One authoritative terminal result per Inline payment attempt.
  const inlineTerminalResult = useRef(null);
  const inlineCheckoutHandle = useRef(null);

  // Never close Flutterwave based on its browser callback alone.
  // A matching, authenticated STORVEX SUCCESS is required.
  function closeVerifiedInlineCheckout(reference, owner) {
    const current = inlineCheckoutHandle.current;

    if (
      !current ||
      current.reference !== reference ||
      current.owner !== owner ||
      inlineTerminalResult.current?.owner !== owner ||
      inlineTerminalResult.current?.status !== "SUCCESS"
    ) return;

    inlineCheckoutHandle.current = null;

    try {
      if (typeof current.modal?.close === "function") {
        current.modal.close();
      }
    } catch {
      // A provider UI error does not undo a verified payment.
    }
  }

  // The popup callback and return-to-tab handler share one
  // in-flight provider verification for a payment reference.
  const inlineSharedVerifier = useRef(
    createSharedInlinePaymentVerifier(reference =>
      apiClient.post(
        `/billing/payments/${encodeURIComponent(reference)}/complete-sandbox`
      )
    )
  );

  // STEP 342CN-DY / DEVELOPMENT-ONLY INLINE PRELOAD
  // Prepare the provider library before a customer starts checkout.
  // No reservation, payment or popup occurs in this effect.
  useEffect(() => {
    if (!STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED) return;

    loadFlutterwaveInlineScript().catch(() => {
      // Checkout still handles a failed load when explicitly selected.
      // Do not interrupt the renewal page or create a payment.
    });
  }, []);

  const [me, setMe] = useState(null);
  const [plans, setPlans] = useState([]);
  const [planKey, setPlanKey] = useState("");
  const [durationMonths, setDurationMonths] = useState(1);

  // STEP 342CN-GF / AUTHENTICATED REFRESH RECOVERY
  // The tab stores only a reference, never proof of payment.
  // Recovery reads STORVEX's existing payment-status endpoint.
  useEffect(() => {
    if (!STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED) return;

    const reference = readInlineRecoveryReference(
      window.sessionStorage
    );

    if (!reference) return;

    const owner = paymentAttemptOwner.current;
    let cancelled = false;

    inlinePaymentToRecheck.current = { reference, owner };

    const recover = async () => {
      try {
        // STEP 342CN-GU / RESUME EXISTING PAYMENT VERIFICATION
        // Reuse the same verifier as callback and return-to-tab.
        // The authenticated status lookup remains authoritative.
        try {
          await inlineSharedVerifier.current.verify(reference);
        } catch {
          // Failed verification is not proof of failed payment.
        }

        if (cancelled) return;
        if (paymentAttemptOwner.current !== owner) return;
        if (inlinePaymentToRecheck.current?.reference !== reference) return;

        const { data } = await apiClient.get(
          `/billing/payments/${encodeURIComponent(reference)}`
        );

        if (cancelled) return;

        const current = inlinePaymentToRecheck.current;

        if (
          !current ||
          current.reference !== reference ||
          current.owner !== owner ||
          paymentAttemptOwner.current !== owner ||
          inlineTerminalResult.current?.owner === owner
        ) return;

        const payment = data?.payment;

        if (
          payment?.reference !== reference ||
          payment?.purpose !== "SUBSCRIPTION_RENEWAL"
        ) {
          clearInlineRecoveryReference(
            window.sessionStorage,
            reference
          );
          inlinePaymentToRecheck.current = null;
          return;
        }

        const status = String(
          payment.status || "PENDING"
        ).toUpperCase();

        if (status === "SUCCESS" || status === "FAILED") {
          inlineTerminalResult.current = { owner, status };
          inlinePaymentToRecheck.current = null;

          if (status === "FAILED") {
            clearInlineRecoveryReference(
              window.sessionStorage,
              reference
            );
          }
        }

        setInlinePaymentStatus(
          status === "SUCCESS" || status === "FAILED"
            ? status
            : "PENDING"
        );
      } catch {
        // A failed status lookup cannot establish payment success.
        // Keep the reference for a later authenticated recheck.
      }
    };

    void recover();

    return () => {
      cancelled = true;
    };
  }, []);

  // STEP 342CN-FF / RETURN-TO-STORVEX RECONCILIATION
  // Runs separately from provider-script preloading.
  // Never creates a checkout or trusts provider callback data.
  useEffect(() => {
    if (!STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED) return;

    const reconciler = createFlutterwaveInlineReconciler({
      verifyPayment: reference =>
        inlineSharedVerifier.current.verify(reference),
      fetchStatus: async reference => {
        const { data } = await apiClient.get(
          `/billing/payments/${encodeURIComponent(reference)}`
        );
        return data;
      },
      onStatus: ({ reference, status }) => {
        const current = inlinePaymentToRecheck.current;

        if (
          !current ||
          current.reference !== reference ||
          current.owner !== paymentAttemptOwner.current
        ) return;

        // A completed payment result cannot be overwritten by
        // a late pending response or another verification path.
        if (inlineTerminalResult.current?.owner === current.owner) {
          return;
        }

        if (status === "SUCCESS" || status === "FAILED") {
          inlineTerminalResult.current = {
            owner: current.owner,
            status,
          };
          inlinePaymentToRecheck.current = null;
        }

        setInlinePaymentStatus(status);

        if (status === "SUCCESS" || status === "FAILED") {

          if (status === "SUCCESS") {
            closeVerifiedInlineCheckout(reference, current.owner);
            toast.success("Payment verified by Storvex.");
          } else {
            toast.error("Payment was unsuccessful.");
          }
        }
      },
    });

    const recheckOnReturn = () => {
      if (document.visibilityState === "hidden") return;

      const current = inlinePaymentToRecheck.current;
      if (!current) return;
      if (current.owner !== paymentAttemptOwner.current) return;

      void reconciler.reconcile(current.reference).catch(() => {});
    };

    window.addEventListener("focus", recheckOnReturn);
    document.addEventListener("visibilitychange", recheckOnReturn);

    return () => {
      window.removeEventListener("focus", recheckOnReturn);
      document.removeEventListener("visibilitychange", recheckOnReturn);
    };
  }, []);



  const grouped = useMemo(() => groupPlans(plans), [plans]);

  const activeStaff = useMemo(() => pickActiveStaff(me), [me]);
  const activeBranches = useMemo(() => pickActiveBranches(me), [me]);

  const enterpriseRequired = Boolean(
    grouped.maxStaffLimit > 0 && activeStaff > grouped.maxStaffLimit,
  );

  const visiblePlans = grouped.standard;

  const selectedPlan = useMemo(
    () =>
      grouped.standard.find((plan) => plan.key === planKey) ||
      grouped.standard.find((plan) => plan.recommended) ||
      grouped.standard[0] ||
      null,
    [grouped.standard, planKey],
  );

  const selectedPlanInsufficient = useMemo(() => {
    if (!selectedPlan) return true;

    const staffLimit = Number(selectedPlan.staffLimit);
    if (Number.isFinite(staffLimit) && activeStaff > staffLimit) return true;

    const branchLimit = Number(selectedPlan.branchLimit);
    if (Number.isFinite(branchLimit) && activeBranches > branchLimit) return true;

    return false;
  }, [selectedPlan, activeStaff, activeBranches]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const [{ data: meData }, { data: planData }] = await Promise.all([
          apiClient.get("/auth/me"),
          apiClient.get("/billing/plans"),
        ]);

        if (cancelled) return;

        setMe(meData || null);

        const filtered = normalizeSubscriptionPlans(
          planData?.plans,
        ).filter((plan) => !plan.isEnterprise);

        setPlans(filtered);

        if (filtered.length) {
          const currentPlanKey =
            meData?.subscription?.nextPlanKey ||
            meData?.subscription?.planKey;

          const activeStaffCount = pickActiveStaff(meData);
          const activeBranchCount = pickActiveBranches(meData);

          const matched =
            filtered.find((plan) => plan.key === currentPlanKey) ||
            filtered.find(
              (plan) =>
                (plan.staffLimit == null ||
                  plan.staffLimit >= activeStaffCount) &&
                (plan.branchLimit == null ||
                  plan.branchLimit >= activeBranchCount),
            ) ||
            filtered.find((plan) => plan.recommended) ||
            filtered[0];

          setPlanKey(matched.key);
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load billing");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startFlutterwavePayment() {
    if (paymentAttemptLock.current || submitting) return;

    // A verified renewal cannot initiate a second checkout.
    if (inlinePaymentStatus === "SUCCESS") return;

    if (!selectedPlan) {
      toast.error("Select a subscription plan.");
      return;
    }

    paymentAttemptLock.current = true;
    const attemptOwner = ++paymentAttemptOwner.current;
    inlineCheckoutHandle.current = null;
    inlinePaymentToRecheck.current = null;
    inlineTerminalResult.current = null;
    setSubmitting(true);
    setInlinePaymentStatus("");

    let inlinePopupOpened = false;

    try {
      if (STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED) {
        await runFlutterwaveInlinePaymentFlow({
          selection: {
            planKey: selectedPlan.key,
            durationMonths,
            expectedTotal: total,
            expectedCurrency: selectedPlan.currency,
          },
          reservePayment: async (selection) => {
            const { data } = await apiClient.post("/billing/renew", {
              planKey: selection.planKey,
              durationMonths: selection.durationMonths,
              checkoutMethod: "FLUTTERWAVE_SANDBOX_INLINE",
            });
            if (
              typeof data?.paymentReference === "string" &&
              /^[A-Za-z0-9_-]{8,100}$/.test(data.paymentReference) &&
              paymentAttemptOwner.current === attemptOwner
            ) {
              inlinePaymentToRecheck.current = {
                reference: data.paymentReference,
                owner: attemptOwner,
              };

              saveInlineRecoveryReference(
                window.sessionStorage,
                data.paymentReference
              );
            }
            return data;
          },
          loadCheckout: loadFlutterwaveInlineScript,
          openPopup: options => {
            const opened = openSandboxInlinePopup(options);

            if (paymentAttemptOwner.current === attemptOwner) {
              inlineCheckoutHandle.current = {
                reference: opened.reference,
                owner: attemptOwner,
                modal: opened.modal,
              };

              // Protect against synchronous provider callbacks.
              if (
                inlineTerminalResult.current?.owner === attemptOwner &&
                inlineTerminalResult.current?.status === "SUCCESS"
              ) {
                closeVerifiedInlineCheckout(
                  opened.reference,
                  attemptOwner
                );
              }
            }

            return opened;
          },
          verifyPayment: (reference) =>
            inlineSharedVerifier.current.verify(reference),
          fetchStatus: async (reference) => {
            const { data } = await apiClient.get(
              `/billing/payments/${encodeURIComponent(reference)}`
            );
            return data;
          },
          onFinished: () => {
            if (paymentAttemptOwner.current !== attemptOwner) return;
            paymentAttemptLock.current = false;
            setSubmitting(false);
          },
          onStatus: ({ status }) => {
            if (paymentAttemptOwner.current !== attemptOwner) return;

            // Only the first authoritative terminal result can
            // update this attempt's visible payment outcome.
            if (inlineTerminalResult.current?.owner === attemptOwner) {
              return;
            }

            if (status === "SUCCESS" || status === "FAILED") {
              inlineTerminalResult.current = {
                owner: attemptOwner,
                status,
              };
              inlinePaymentToRecheck.current = null;
            }

            setInlinePaymentStatus(status);
            if (status === "SUCCESS") {
              const current = inlineCheckoutHandle.current;

              if (current?.owner === attemptOwner) {
                closeVerifiedInlineCheckout(
                  current.reference,
                  attemptOwner
                );
              }

              toast.success("Payment verified by Storvex.");
            } else if (status === "FAILED") {
              toast.error("Payment was unsuccessful.");
            } else if (status === "PENDING") {
              toast("Payment is not yet confirmed.");
            }
          },
        });

        // Only the popup lifecycle callback may normally release
        // a successfully opened Inline attempt.
        inlinePopupOpened = true;
      } else {
      await startFlutterwaveSandboxCheckout({
        planKey: selectedPlan.key,
        durationMonths,
        expectedTotal: total,
        expectedCurrency: selectedPlan.currency,
      });
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Flutterwave checkout is unavailable."
      );
    } finally {
      // Hosted checkout retains its original completion behavior.
      // Inline releases here only if reservation/opening failed.
      if (
        paymentAttemptOwner.current === attemptOwner &&
        (
          !STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED ||
          !inlinePopupOpened
        )
      ) {
        paymentAttemptLock.current = false;
        setSubmitting(false);
      }
    }
  }

  // STEP 342CN-HK / VERIFIED DASHBOARD CONTINUATION
  // A successful payment is necessary but does not itself
  // authorize entry into the operational workspace.
  async function continueAfterVerifiedRenewal() {
    if (inlinePaymentStatus !== "SUCCESS" || refreshing) return;

    setRefreshing(true);

    try {
      const { data } = await apiClient.get("/auth/me");
      setMe(data || null);

      if (!isAccessRecovered(data?.subscription)) {
        toast(
          "Payment confirmed. Your subscription access is still updating. Please check again."
        );
        return;
      }

      const reference = readInlineRecoveryReference(
        window.sessionStorage
      );

      if (reference) {
        clearInlineRecoveryReference(
          window.sessionStorage,
          reference
        );
      }

      nav("/app", { replace: true });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Unable to confirm subscription access. Please try again."
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function refreshStatus() {
    setRefreshing(true);

    try {
      const { data } = await apiClient.get("/auth/me");
      setMe(data || null);

      const sub = data?.subscription;

      if (isAccessRecovered(sub)) {
        toast.success("Subscription active. Welcome back.");
        nav("/app", { replace: true });
        return;
      }

      toast("Still read-only or expired. If you already paid, wait a moment then refresh again.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to refresh status");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className={pageShell()}>
        <PageSkeleton titleWidth="w-56" lines={4} variant="default" />
      </div>
    );
  }

  const sub = me?.subscription || null;
  const storeName = me?.store?.name || "Your store";
  const subMeta = statusMeta(sub);

  const daysLeft = daysUntil(sub?.endDate);


  // STEP 342CM-Q / APPROVED REFERENCE
  const durations = [
    { months: 1, discount: 0 },
    { months: 3, discount: 5 },
    { months: 6, discount: 10 },
    { months: 12, discount: 15 },
  ];

  const discount =
    durations.find((entry) => entry.months === durationMonths)?.discount ?? 0;
  const monthlyPrice = Number(selectedPlan?.price);
  const hasPrice = Number.isFinite(monthlyPrice) && monthlyPrice > 0;
  const fullPrice = hasPrice ? Math.round(monthlyPrice * durationMonths) : null;
  const savings = fullPrice == null ? null : Math.round(fullPrice * discount / 100);
  const total = fullPrice == null ? null : fullPrice - savings;

  const isReadOnly =
    sub?.canOperate === false ||
    ["EXPIRED", "READ_ONLY"].includes(String(sub?.status || "").toUpperCase()) ||
    String(sub?.accessMode || "").toUpperCase() === "READ_ONLY";

  // Multi-month sandbox checkout is separately opted in.
  // The backend remains responsible for authorizing the duration.
  const checkoutDurationEnabled =
    durationMonths === 1 ||
    STORVEX_FLUTTERWAVE_SANDBOX_MULTI_MONTH_UI_ENABLED;

  const checkoutEnabled =
    STORVEX_FLUTTERWAVE_SANDBOX_UI_ENABLED &&
    checkoutDurationEnabled &&
    hasPrice &&
    Boolean(selectedPlan) &&
    !selectedPlanInsufficient &&
    !enterpriseRequired &&
    !submitting &&
    inlinePaymentStatus !== "SUCCESS";

  return (
    <div className={`svx-renew-premium ${renewThemeClass} ${embedded ? "is-embedded" : ""}`}>
      <main className="svx-rq-wrap">
        {/* STEP 342CM-S / RENEW NAVIGATION */}
        <header className="svx-rq-heading">
          <div className="svx-rq-heading-main">
            <button
              type="button"
              className="svx-rq-back"
              onClick={() => {
                if (embedded || !isReadOnly) {
                  nav("/app/settings/billing");
                } else {
                  nav("/login");
                }
              }}
              aria-label={isReadOnly && !embedded ? "Back to login" : "Back to Billing"}
              title="Back to Billing"
            >
              <svg
                viewBox="0 0 24 24"
                width="17"
                height="17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <div className="svx-rq-heading-copy">
              <nav className="svx-rq-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => nav("/app/settings")}>Settings</button>
                <span>/</span>
                <button type="button" onClick={() => nav("/app/settings/billing")}>Billing</button>
                <span>/</span>
                <strong>Renew</strong>
              </nav>
              <h1>Renew your subscription</h1>
              <p>Choose the right plan, duration and payment option for your business.</p>
            </div>
          </div>

          {/* STEP 342CM-T / RECOVERY CONTROLS */}
          {!embedded && (
            <button
              type="button"
              className="svx-rq-theme-pill"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title="Toggle theme"
              aria-pressed={isDark}
            >
              <span className={!isDark ? "is-active" : ""}>
                <SunIcon />
              </span>
              <span className={isDark ? "is-active" : ""}>
                <MoonIcon />
              </span>
            </button>
          )}
        </header>

        <section className="svx-rq-strip" aria-label="Subscription overview">
          <div className="svx-rq-strip-item">
            <span className="svx-rq-strip-icon">✓</span>
            <div>
              <small>Current access</small>
              <strong>{subMeta.label}</strong>
              <span>{isReadOnly ? "Restricted until verified renewal" : "Your workspace remains available"}</span>
            </div>
          </div>
          <div className="svx-rq-strip-item">
            <span className="svx-rq-strip-icon">▦</span>
            <div>
              <small>Subscription ends</small>
              <strong>{formatDate(sub?.endDate)}</strong>
              <span>{daysLeft == null ? "Date not available" : `${daysLeft} days remaining`}</span>
            </div>
          </div>
          <div className="svx-rq-strip-item">
            <span className="svx-rq-strip-icon">✦</span>
            <div>
              <small>After verified renewal</small>
              <strong>Continued access</strong>
              <span>Subject to successful payment verification</span>
            </div>
          </div>
        </section>

        {enterpriseRequired ? (
          <EnterpriseRequiredPanel
            storeName={storeName}
            activeStaff={activeStaff}
            activeBranches={activeBranches}
            maxStaffLimit={grouped.maxStaffLimit}
            onBack={() => nav("/app/settings/billing")}
          />
        ) : (
          <div className="svx-rq-layout">
            <div className="svx-rq-left">
              <section className="svx-rq-plans-section">
                <div className="svx-rq-section-title">
                  <h2>1. Choose a plan</h2>
                  <p>Select a plan that fits your business and current usage.</p>
                </div>

                <div className="svx-rq-plans">
                  {visiblePlans.map((plan) => {
                    const staffTooHigh =
                      plan.staffLimit != null &&
                      Number.isFinite(Number(plan.staffLimit)) &&
                      activeStaff > Number(plan.staffLimit);
                    const branchesTooHigh =
                      plan.branchLimit != null &&
                      Number.isFinite(Number(plan.branchLimit)) &&
                      activeBranches > Number(plan.branchLimit);
                    const disabled = staffTooHigh || branchesTooHigh;
                    const selected = selectedPlan?.key === plan.key;

                    return (
                      <button
                        key={plan.key}
                        type="button"
                        className={`svx-rq-plan ${selected ? "is-selected" : ""}`}
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={() => setPlanKey(plan.key)}
                      >
                        <span className="svx-rq-plan-head">
                          <strong>{plan.label}</strong>
                          <span className="svx-rq-radio" />
                        </span>
                        {plan.recommended && (
                          <span className="svx-rq-recommended">Recommended</span>
                        )}
                        <span className="svx-rq-price">
                          {formatMoney(plan.price, plan.currency)}
                          <small>/month</small>
                        </span>
                        <span className="svx-rq-limits">
                          {plan.staffLimit ?? "Custom"} staff · {plan.branchLimit ?? "Custom"} locations
                        </span>
                        {/* STEP 342CM-V / RENEW REFINEMENT */}
                        <span className="svx-rq-feature">
                          {plan.audience || "Retail business operations"}
                        </span>
                        <span className={`svx-rq-plan-action ${selected ? "is-selected" : ""}`}>
                          {disabled
                            ? "Insufficient capacity"
                            : selected
                              ? "Selected plan"
                              : "Select plan"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedPlanInsufficient && (
                  <p className="svx-rq-warning">
                    The selected plan does not cover your current staff or locations.
                  </p>
                )}
              </section>

              <section className="svx-rq-steps">
                <h2>What happens next?</h2>
                <div className="svx-rq-step-grid">
                  <div><b>1</b><span><strong>Choose your plan</strong><small>Pick your plan and duration</small></span></div>
                  <div><b>2</b><span><strong>Complete payment</strong><small>Pay securely with Flutterwave</small></span></div>
                  <div><b>3</b><span><strong>Access confirmed</strong><small>After backend verification</small></span></div>
                </div>
              </section>
            </div>

            <aside className="svx-rq-payment">
              <section className="svx-rq-payment-card">
                <h2>2. Payment details</h2>

                <div className="svx-rq-details">
                  <div><span>Selected plan</span><strong>{selectedPlan?.label || "—"}</strong></div>
                  <div><span>Monthly price</span><strong>{hasPrice ? formatMoney(monthlyPrice, selectedPlan?.currency) : "—"}</strong></div>
                  <div><span>Staff seats</span><strong>{selectedPlan?.staffLimit ?? "—"}</strong></div>
                  <div><span>Store locations</span><strong>{selectedPlan?.branchLimit ?? "—"}</strong></div>
                </div>

                <div className="svx-rq-duration-heading">
                  <strong>Subscription duration</strong>
                  <small>Save on longer terms</small>
                </div>
                <div className="svx-rq-duration-grid">
                  {durations.map((entry) => (
                    <button
                      type="button"
                      key={entry.months}
                      className={`svx-rq-duration ${durationMonths === entry.months ? "is-selected" : ""}`}
                      aria-pressed={durationMonths === entry.months}
                      onClick={() => setDurationMonths(entry.months)}
                    >
                      <strong>{entry.months} {entry.months === 1 ? "mo" : "mos"}</strong>
                      <span>{entry.discount ? `${entry.discount}% off` : "Standard"}</span>
                    </button>
                  ))}
                </div>

                <div className="svx-rq-totals">
                  <div><span>Regular total</span><strong>{fullPrice == null ? "—" : formatMoney(fullPrice, selectedPlan?.currency)}</strong></div>
                  <div className="is-saving"><span>Discount ({discount}%)</span><strong>{savings == null ? "—" : `− ${formatMoney(savings, selectedPlan?.currency)}`}</strong></div>
                  <div className="svx-rq-grand-total"><span>Estimated total</span><strong>{total == null ? "—" : formatMoney(total, selectedPlan?.currency)}</strong></div>
                </div>

                <div className="svx-rq-payment-method">
                  <strong>Payment method</strong>
                  <div className="svx-rq-provider">
                    <span aria-hidden="true">●</span>
                    <div>
                      <strong>Pay securely with Flutterwave</strong>
                      <small>
                        {STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED
                          ? "Secure popup checkout"
                          : "Secure hosted checkout"}
                      </small>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="svx-rq-checkout"
                  disabled={!checkoutEnabled}
                  onClick={startFlutterwavePayment}
                >
                  {inlinePaymentStatus === "SUCCESS"
                    ? "Payment completed"
                    : submitting
                      ? "Opening checkout..."
                    : !STORVEX_FLUTTERWAVE_SANDBOX_UI_ENABLED
                      ? "Checkout unavailable"
                      : !checkoutDurationEnabled
                        ? "Multi-month checkout not yet enabled"
                        : "Proceed to Secure Payment"}
                </button>

                {durationMonths !== 1 && !checkoutDurationEnabled && (
                  <p className="svx-rq-checkout-note">
                    Multi-month pricing is a preview. Checkout requires
                    explicit sandbox multi-month testing to be enabled.
                  </p>
                )}
                {STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED &&
                  inlinePaymentStatus === "SUCCESS" && (
                    <section
                      className="svx-rq-payment-success"
                      role="status"
                      aria-live="polite"
                      aria-label="Payment successful"
                    >
                      <div className="svx-rq-payment-success-heading">
                        <span
                          className="svx-rq-payment-success-mark"
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                        <strong>Payment successful</strong>
                      </div>

                      <p>
                        Your payment has been verified by Storvex and
                        your subscription renewal has been applied.
                      </p>

                      {/* STEP 342CN-HK / PRIMARY DASHBOARD ACTION */}
                      {!embedded && (
                        <button
                          type="button"
                          className="svx-rq-payment-success-action"
                          disabled={refreshing}
                          onClick={continueAfterVerifiedRenewal}
                        >
                          {refreshing
                            ? "Checking subscription..."
                            : "Continue to dashboard"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="svx-rq-secondary"
                        onClick={() => {
                          const reference =
                            readInlineRecoveryReference(
                              window.sessionStorage
                            );

                          if (reference) {
                            clearInlineRecoveryReference(
                              window.sessionStorage,
                              reference
                            );
                          }

                          nav("/app/settings/billing");
                        }}
                      >
                        View Billing
                      </button>
                    </section>
                  )}

                {STORVEX_FLUTTERWAVE_SANDBOX_INLINE_UI_ENABLED &&
                  inlinePaymentStatus &&
                  inlinePaymentStatus !== "SUCCESS" && (
                    <p className="svx-rq-checkout-note" role="status">
                      {inlinePaymentStatus === "FAILED"
                        ? "Payment was unsuccessful."
                        : inlinePaymentStatus === "VERIFYING"
                          ? "Verifying your payment securely..."
                          : inlinePaymentStatus === "OPENING"
                            ? "Opening secure payment popup..."
                            : "Payment confirmation pending. Check Billing for updates."}
                    </p>
                  )}

                {STORVEX_FLUTTERWAVE_SANDBOX_UI_ENABLED && (
                  <p className="svx-rq-secure">
                    Test mode — No real payment will be charged.
                  </p>
                )}
                <p className="svx-rq-secure">
                  Secure checkout powered by Flutterwave.
                </p>

                {isReadOnly && (
                  <button
                    type="button"
                    className="svx-rq-secondary svx-rq-status-check"
                    disabled={refreshing}
                    onClick={refreshStatus}
                  >
                    {refreshing ? "Checking..." : "Check subscription status"}
                  </button>
                )}
              </section>
            </aside>
          </div>
        )}

        <footer className="svx-rq-footer">
          Storvex is a product operated by <strong>RURAXIS LTD.</strong>
        </footer>
      </main>
    </div>
  );

}