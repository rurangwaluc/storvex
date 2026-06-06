// frontend-stores/src/pages/Billing/Renew.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import apiClient from "../../services/apiClient";
import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { useTheme } from "../../hooks/useTheme";

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
  return "min-h-screen overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-text)]";
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

function normalizeCycleFromPlan(plan) {
  const cycleKey = cleanString(plan?.cycleKey).toUpperCase();
  const label = cleanString(plan?.cycleLabel || plan?.label).toLowerCase();
  const days = toNumber(plan?.days, 0);

  if (["M1", "MONTHLY", "MONTH"].includes(cycleKey)) return "MONTHLY";
  if (["M3", "QUARTERLY", "QUARTER"].includes(cycleKey)) return "QUARTERLY";
  if (["M6", "HALF_YEAR", "HALF_YEARLY", "SIX_MONTHS"].includes(cycleKey)) return "HALF_YEAR";
  if (["Y1", "YEARLY", "ANNUAL", "ANNUALLY"].includes(cycleKey)) return "YEARLY";

  if (label.includes("1 year") || label.includes("year") || days >= 360) return "YEARLY";
  if (label.includes("6 months") || label.includes("6 month") || days >= 175) return "HALF_YEAR";
  if (label.includes("3 months") || label.includes("3 month") || days >= 85) return "QUARTERLY";

  return "MONTHLY";
}

function normalizeSegmentFromPlan(plan) {
  const tierKey = cleanString(plan?.tierKey).toUpperCase();
  const label = cleanString(plan?.tierLabel || plan?.label).toLowerCase();

  if (tierKey === "ENTERPRISE" || label.includes("enterprise")) return "ENTERPRISE";
  if (tierKey === "SOLO" || label.includes("solo")) return "SOLO";
  if (tierKey === "DUO" || label.includes("duo")) return "DUO";

  if (tierKey === "TEAM_3" || label.includes("team 3")) return "TEAM_3";
  if (tierKey === "TEAM_4" || label.includes("team 4")) return "TEAM_4";
  if (tierKey === "TEAM_5" || label.includes("team 5")) return "TEAM_5";
  if (tierKey === "TEAM_10" || label.includes("team 10")) return "TEAM_10";

  const staffLimit = Number(plan?.staffLimit);
  if (staffLimit === 1) return "SOLO";
  if (staffLimit === 2) return "DUO";
  if (staffLimit === 3) return "TEAM_3";
  if (staffLimit === 4) return "TEAM_4";
  if (staffLimit === 5) return "TEAM_5";
  if (staffLimit === 10) return "TEAM_10";

  return "OTHER";
}

function segmentLabel(segment) {
  if (segment === "SOLO") return "Solo";
  if (segment === "DUO") return "Duo";
  if (segment === "TEAM_3") return "Team 3";
  if (segment === "TEAM_4") return "Team 4";
  if (segment === "TEAM_5") return "Team 5";
  if (segment === "TEAM_10") return "Team 10";
  if (segment === "ENTERPRISE") return "Enterprise";
  return "Other";
}

function cycleLabel(cycle) {
  if (cycle === "MONTHLY") return "Monthly";
  if (cycle === "QUARTERLY") return "3 months";
  if (cycle === "HALF_YEAR") return "6 months";
  if (cycle === "YEARLY") return "1 year";
  return "Other";
}

function cycleRank(cycle) {
  if (cycle === "MONTHLY") return 1;
  if (cycle === "QUARTERLY") return 2;
  if (cycle === "HALF_YEAR") return 3;
  if (cycle === "YEARLY") return 4;
  return 99;
}

function segmentRank(segment) {
  if (segment === "SOLO") return 1;
  if (segment === "DUO") return 2;
  if (segment === "TEAM_3") return 3;
  if (segment === "TEAM_4") return 4;
  if (segment === "TEAM_5") return 5;
  if (segment === "TEAM_10") return 10;
  return 99;
}

function normalizePlan(plan) {
  const segment = normalizeSegmentFromPlan(plan);
  const cycle = normalizeCycleFromPlan(plan);

  return {
    ...plan,
    key: cleanString(plan?.key),
    label: cleanString(plan?.label) || "Plan",
    segment,
    cycle,
    staffLimit: Number.isFinite(Number(plan?.staffLimit)) ? Number(plan.staffLimit) : null,
    branchLimit: Number.isFinite(Number(plan?.branchLimit)) ? Number(plan.branchLimit) : null,
    days: Number.isFinite(Number(plan?.days)) ? Number(plan.days) : 30,
    price: Number.isFinite(Number(plan?.price)) ? Number(plan.price) : 0,
    currency: cleanString(plan?.currency) || "RWF",
    isEnterprise: Boolean(plan?.isEnterprise) || segment === "ENTERPRISE",
  };
}

function groupPlans(plans) {
  const normalized = Array.isArray(plans) ? plans.map(normalizePlan).filter((p) => p.key) : [];

  const standard = normalized
    .filter((plan) => !plan.isEnterprise && plan.segment !== "ENTERPRISE")
    .sort((a, b) => {
      const segmentDiff = segmentRank(a.segment) - segmentRank(b.segment);
      if (segmentDiff !== 0) return segmentDiff;
      return cycleRank(a.cycle) - cycleRank(b.cycle);
    });

  const segments = Array.from(new Set(standard.map((p) => p.segment))).sort(
    (a, b) => segmentRank(a) - segmentRank(b),
  );

  const cycles = Array.from(new Set(standard.map((p) => p.cycle))).sort(
    (a, b) => cycleRank(a) - cycleRank(b),
  );

  const maxStaffLimit = standard.reduce((max, plan) => {
    const staffLimit = Number(plan.staffLimit);
    if (!Number.isFinite(staffLimit)) return max;
    return Math.max(max, staffLimit);
  }, 0);

  const maxBranchLimit = standard.reduce((max, plan) => {
    const branchLimit = Number(plan.branchLimit);
    if (!Number.isFinite(branchLimit)) return max;
    return Math.max(max, branchLimit);
  }, 0);

  return {
    standard,
    segments,
    cycles,
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
            {segmentLabel(plan.segment)} • {cycleLabel(plan.cycle)}
          </div>
        </div>

        <Badge tone={active ? "primary" : "neutral"} className="shrink-0">
          {plan.days} days
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
  tenantName,
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
            Standard self-service renewal supports up to {maxStaffLimit || 10} staff. {tenantName}
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

function TopRecoveryBar({ tenantName, sub, isDark, onToggleTheme }) {
  const meta = statusMeta(sub);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
            Storvex recovery
          </div>

          <div className={cx("mt-1 truncate text-lg font-black tracking-tight", strongText())}>
            {tenantName}
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
        </div>
      </div>
    </header>
  );
}

export default function Renew() {
  const nav = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [me, setMe] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("");
  const [planKey, setPlanKey] = useState("");
  const [phone, setPhone] = useState(localStorage.getItem("storvex_ownerPhone") || "");
  const [paymentRef, setPaymentRef] = useState("");

  const grouped = useMemo(() => groupPlans(plans), [plans]);

  const activeStaff = useMemo(() => pickActiveStaff(me), [me]);
  const activeBranches = useMemo(() => pickActiveBranches(me), [me]);

  const enterpriseRequired = Boolean(
    grouped.maxStaffLimit > 0 && activeStaff > grouped.maxStaffLimit,
  );

  const visiblePlans = useMemo(() => {
    return grouped.standard.filter(
      (plan) =>
        (!selectedSegment || plan.segment === selectedSegment) &&
        (!selectedCycle || plan.cycle === selectedCycle),
    );
  }, [grouped.standard, selectedSegment, selectedCycle]);

  const selectedPlan = useMemo(
    () =>
      visiblePlans.find((plan) => plan.key === planKey) ||
      grouped.standard.find((plan) => plan.key === planKey) ||
      visiblePlans[0] ||
      null,
    [visiblePlans, grouped.standard, planKey],
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

        if (!phone && meData?.tenant?.phone) {
          setPhone(meData.tenant.phone);
        }

        const list = Array.isArray(planData?.plans) ? planData.plans : [];
        const normalizedPlans = list.map(normalizePlan);
        const filtered = normalizedPlans.filter((plan) => !plan.isEnterprise);

        setPlans(filtered);

        if (filtered.length) {
          const currentPlanKey = meData?.subscription?.nextPlanKey || meData?.subscription?.planKey;
          const matched =
            filtered.find((plan) => plan.key === currentPlanKey) ||
            filtered.find((plan) => Number(plan.staffLimit) >= pickActiveStaff(meData)) ||
            filtered[0];

          setSelectedSegment(matched.segment);
          setSelectedCycle(matched.cycle);
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

  function chooseSegment(segment) {
    setSelectedSegment(segment);

    const firstPlan =
      grouped.standard.find((plan) => plan.segment === segment && plan.cycle === selectedCycle) ||
      grouped.standard.find((plan) => plan.segment === segment && plan.cycle === "HALF_YEAR") ||
      grouped.standard.find((plan) => plan.segment === segment) ||
      null;

    if (firstPlan) {
      setSelectedCycle(firstPlan.cycle);
      setPlanKey(firstPlan.key);
    }
  }

  function chooseCycle(cycle) {
    setSelectedCycle(cycle);

    const match =
      grouped.standard.find((plan) => plan.segment === selectedSegment && plan.cycle === cycle) ||
      grouped.standard.find((plan) => plan.cycle === cycle) ||
      null;

    if (match) {
      setSelectedSegment(match.segment);
      setPlanKey(match.key);
    }
  }

  async function startRenewal(event) {
    event.preventDefault();

    if (enterpriseRequired) {
      toast.error("This store requires a custom Enterprise plan.");
      return;
    }

    if (!selectedPlan) {
      toast.error("Select a plan.");
      return;
    }

    if (selectedPlanInsufficient) {
      toast.error("Selected plan does not cover current staff or branch usage.");
      return;
    }

    const cleanPhone = cleanString(phone);
    if (!cleanPhone) {
      toast.error("Enter MoMo phone number.");
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
    } catch (err) {
      toast.error(err?.response?.data?.message || "Renewal request failed");
    } finally {
      setSubmitting(false);
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
  const tenantName = me?.tenant?.name || "Your store";
  const subMeta = statusMeta(sub);

  const daysLeft = daysUntil(sub?.endDate);
  const graceDaysLeft = daysUntil(sub?.graceEndDate);

  return (
    <div className={pageShell()}>
      <TopRecoveryBar
        tenantName={tenantName}
        sub={sub}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {enterpriseRequired ? (
          <EnterpriseRequiredPanel
            tenantName={tenantName}
            activeStaff={activeStaff}
            activeBranches={activeBranches}
            maxStaffLimit={grouped.maxStaffLimit}
            onBack={() => nav("/app/settings/billing", { replace: true })}
          />
        ) : (
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <section className={cx(pageCard(), "min-w-0 overflow-hidden")}>
              <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
                <SectionHeading
                  eyebrow="Subscription recovery"
                  title="Renew access and restore full operations"
                  subtitle="Choose a renewal plan, confirm payment, and recover the workspace with the same locked billing flow used across Storvex."
                />
              </div>

              <div className="space-y-6 px-5 py-5 sm:px-6">
                <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
                  <InfoStat
                    label="Store"
                    value={tenantName}
                    sub={`Access mode: ${sub?.accessMode || "—"}`}
                  />

                  <InfoStat
                    label="Subscription end"
                    value={formatDate(sub?.endDate)}
                    sub={
                      daysLeft == null
                        ? `Grace end: ${formatDate(sub?.graceEndDate)}`
                        : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                    }
                  />

                  <div className={cx(softPanel(), "min-w-0 p-4")}>
                    <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                      Current state
                    </div>

                    <div className="mt-2">
                      <Badge tone={subMeta.tone}>{subMeta.label}</Badge>
                    </div>

                    <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>
                      {subMeta.note}
                    </div>
                  </div>
                </div>

                <form onSubmit={startRenewal} className="space-y-6">
                  <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
                    <div className="min-w-0">
                      <div className={cx("text-sm font-black", strongText())}>1. Choose business size</div>
                      <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                        Select the plan family that matches your current store team.
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {grouped.segments.map((segment) => (
                          <FilterChip
                            key={segment}
                            active={selectedSegment === segment}
                            onClick={() => chooseSegment(segment)}
                          >
                            {segmentLabel(segment)}
                          </FilterChip>
                        ))}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className={cx("text-sm font-black", strongText())}>2. Choose billing cycle</div>
                      <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                        Pick the renewal duration that matches your commitment.
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {grouped.cycles.map((cycle) => (
                          <FilterChip
                            key={cycle}
                            active={selectedCycle === cycle}
                            onClick={() => chooseCycle(cycle)}
                          >
                            {cycleLabel(cycle)}
                          </FilterChip>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
                    {visiblePlans.map((plan) => {
                      const staffTooHigh =
                        Number.isFinite(Number(plan.staffLimit)) && activeStaff > Number(plan.staffLimit);

                      const branchesTooHigh =
                        Number.isFinite(Number(plan.branchLimit)) &&
                        activeBranches > Number(plan.branchLimit);

                      const disabled = staffTooHigh || branchesTooHigh;

                      let reason = "";
                      if (staffTooHigh) reason = `Needs at least ${activeStaff} staff seats.`;
                      else if (branchesTooHigh) reason = `Needs at least ${activeBranches} branch slots.`;

                      return (
                        <PlanCard
                          key={plan.key}
                          plan={plan}
                          active={plan.key === selectedPlan?.key}
                          disabled={disabled}
                          reason={reason}
                          onSelect={setPlanKey}
                        />
                      );
                    })}
                  </div>

                  <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="min-w-0 md:col-span-2">
                        <label className={cx("text-sm font-black", strongText())}>Plan</label>
                        <select
                          className={cx(inputClass(), "mt-2")}
                          value={planKey}
                          onChange={(event) => setPlanKey(event.target.value)}
                          disabled={!visiblePlans.length}
                        >
                          {visiblePlans.map((plan) => (
                            <option key={plan.key} value={plan.key}>
                              {plan.label} — {formatMoney(plan.price, plan.currency)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="min-w-0 md:col-span-2">
                        <label className={cx("text-sm font-black", strongText())}>MoMo phone</label>
                        <input
                          className={cx(inputClass(), "mt-2")}
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="07XXXXXXXX or 2507XXXXXXXX"
                          required
                        />
                      </div>
                    </div>

                    <div className={cx(softPanel(), "h-fit min-w-0 p-4")}>
                      <div className={cx("text-sm font-black", strongText())}>Selected summary</div>

                      {selectedPlan ? (
                        <>
                          <div
                            className={cx(
                              "mt-3 break-words text-2xl font-black tracking-[-0.05em]",
                              strongText(),
                            )}
                          >
                            {formatMoney(selectedPlan.price, selectedPlan.currency)}
                          </div>

                          <div className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
                            {selectedPlan.label}
                          </div>

                          <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                            <InfoStat label="Cycle" value={cycleLabel(selectedPlan.cycle)} />
                            <InfoStat label="Duration" value={`${selectedPlan.days} days`} />
                            <InfoStat label="Staff" value={selectedPlan.staffLimit ?? "Custom"} />
                            <InfoStat label="Branches" value={selectedPlan.branchLimit ?? "Custom"} />
                          </div>

                          {selectedPlanInsufficient ? (
                            <div className="mt-4 rounded-2xl bg-amber-500/10 px-4 py-3 text-xs font-bold leading-5 text-amber-600 dark:text-amber-300">
                              This plan does not cover the current staff or branch usage.
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className={cx("mt-3 text-sm font-semibold leading-6", mutedText())}>
                          No matching plan available for the current filters.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <AsyncButton
                      type="submit"
                      loading={submitting}
                      disabled={!selectedPlan || selectedPlanInsufficient}
                      className={primaryBtn()}
                    >
                      Send MoMo request
                    </AsyncButton>

                    <AsyncButton
                      type="button"
                      loading={refreshing}
                      onClick={refreshStatus}
                      className={secondaryBtn()}
                    >
                      I paid → Refresh access
                    </AsyncButton>
                  </div>

                  {paymentRef ? (
                    <div className={cx(softPanel(), "min-w-0 p-4")}>
                      <div className={cx("text-sm font-black", strongText())}>
                        Payment request created
                      </div>
                      <div className={cx("mt-2 break-all text-sm font-semibold leading-6", mutedText())}>
                        Reference: <span className={strongText()}>{paymentRef}</span>
                      </div>
                      <div className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
                        Confirm on your phone, then refresh access to re-check the subscription state.
                      </div>
                    </div>
                  ) : null}
                </form>
              </div>
            </section>

            <aside className="min-w-0 space-y-4">
              <div className={cx(pageCard(), "p-5 sm:p-6")}>
                <div className={cx("text-lg font-black tracking-tight", strongText())}>
                  What happens next
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    "Choose the renewal plan that fits your store size.",
                    "Approve the MoMo request on your phone.",
                    "Refresh access to restore normal operations when payment is recorded.",
                  ].map((step, index) => (
                    <div key={step} className={cx(softPanel(), "p-4")}>
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-sm font-black text-[var(--color-primary-contrast)]">
                          {index + 1}
                        </div>
                        <div className={cx("text-sm font-semibold leading-6", mutedText())}>{step}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cx(pageCard(), "p-5 sm:p-6")}>
                <div className={cx("text-lg font-black tracking-tight", strongText())}>Access rule</div>
                <p className={cx("mt-3 text-sm font-semibold leading-6", mutedText())}>
                  In read-only mode, the store can still review historical data, but operational
                  write actions remain blocked until renewal is completed.
                </p>
              </div>

              <div className={cx(pageCard(), "p-5 sm:p-6")}>
                <div className={cx("text-lg font-black tracking-tight", strongText())}>
                  Need to return fast?
                </div>
                <div className={cx("mt-3 text-sm font-semibold leading-6", mutedText())}>
                  After you approve payment, use refresh access. Once billing becomes active, the
                  page automatically sends you back into the workspace.
                </div>

                <div className={cx("mt-4 rounded-2xl bg-[var(--color-surface-2)] p-4 text-xs font-semibold leading-5", mutedText())}>
                  Grace window: {formatDate(sub?.graceEndDate)}
                  {graceDaysLeft == null
                    ? ""
                    : ` • ${graceDaysLeft} day${graceDaysLeft === 1 ? "" : "s"} left`}
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}