// frontend-stores/src/pages/Billing/Billing.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import apiClient from "../../services/apiClient";
import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";

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

function pageCard() {
  return "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
}

function primaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function subtleBtn() {
  return "inline-flex h-10 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text)] transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function badgeClass(tone = "neutral") {
  if (tone === "primary") {
    return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
  }

  if (tone === "success") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (tone === "warning") {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
  }

  if (tone === "danger") {
    return "bg-red-500/10 text-red-600 dark:text-red-300";
  }

  if (tone === "info") {
    return "bg-sky-500/10 text-sky-600 dark:text-sky-300";
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

  const now = Date.now();
  const diff = end - now;

  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function normalizeCycleFromPlan(plan) {
  const cycleKey = cleanString(plan?.cycleKey).toUpperCase();
  const label = cleanString(plan?.cycleLabel || plan?.label).toLowerCase();
  const days = toNumber(plan?.days, 0);

  if (["M1", "MONTHLY", "MONTH"].includes(cycleKey)) return "MONTHLY";
  if (["M3", "QUARTERLY", "QUARTER"].includes(cycleKey)) return "QUARTERLY";
  if (["M6", "HALF_YEAR", "HALF_YEARLY", "SIX_MONTHS"].includes(cycleKey)) {
    return "HALF_YEAR";
  }
  if (["Y1", "YEARLY", "ANNUAL", "ANNUALLY"].includes(cycleKey)) return "YEARLY";

  if (label.includes("1 year") || label.includes("year") || days >= 360) return "YEARLY";
  if (label.includes("6 months") || label.includes("6 month") || days >= 175) {
    return "HALF_YEAR";
  }
  if (label.includes("3 months") || label.includes("3 month") || days >= 85) {
    return "QUARTERLY";
  }

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
  return "Monthly";
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

function subscriptionTone(subscription) {
  const status = cleanString(subscription?.status).toUpperCase();
  const mode = cleanString(subscription?.accessMode).toUpperCase();
  const canOperate = subscription?.canOperate !== false;

  if (status === "EXPIRED" || canOperate === false) {
    return {
      label: "Read-only",
      tone: "warning",
      note: "Operational writes are blocked until renewal is completed.",
    };
  }

  if (mode === "TRIAL") {
    return {
      label: "Trial",
      tone: "info",
      note: "Trial workspace is active.",
    };
  }

  if (mode === "READ_ONLY") {
    return {
      label: "Read-only",
      tone: "warning",
      note: "The store can review data, but cannot operate normally.",
    };
  }

  return {
    label: "Active",
    tone: "success",
    note: "Subscription is active and the store can operate normally.",
  };
}

function pickOverviewPayload(data) {
  return {
    tenant: data?.tenant || data?.me?.tenant || data?.user?.tenant || null,
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

const SUPPORT_WHATSAPP = cleanString(
  process.env.NEXT_PUBLIC_STORVEX_SUPPORT_WHATSAPP,
);

const SUPPORT_EMAIL = cleanString(
  process.env.NEXT_PUBLIC_STORVEX_SUPPORT_EMAIL,
);


function buildEnterpriseMessage({ tenantName, activeStaff, activeBranches, maxStaffLimit }) {
  return [
    "Hello Storvex team,",
    "",
    "I need a custom Enterprise subscription plan.",
    `Store: ${tenantName || "Unknown store"}`,
    `Active staff: ${activeStaff}`,
    `Active branches: ${activeBranches}`,
    `Standard staff maximum: ${maxStaffLimit || 10}`,
    "",
    "Please help me upgrade this store.",
  ].join("\n");
}

function openEnterpriseSupport({ tenantName, activeStaff, activeBranches, maxStaffLimit }) {
  const message = buildEnterpriseMessage({
    tenantName,
    activeStaff,
    activeBranches,
    maxStaffLimit,
  });

  if (SUPPORT_WHATSAPP) {
    const phone = SUPPORT_WHATSAPP.replace(/[^\d]/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }

  if (SUPPORT_EMAIL) {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      "Storvex Enterprise Plan Request",
    )}&body=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }

  return false;
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
          "mt-3 text-[1.55rem] font-black tracking-[-0.04em] sm:text-[1.9rem]",
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

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const accentClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-[var(--color-danger)]"
          : tone === "info"
            ? "bg-sky-500"
            : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative min-h-[132px] min-w-0 overflow-hidden p-5")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accentClass)} />

      <div className="min-w-0 pl-2">
        <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
          {label}
        </div>

        <div
          className={cx(
            "mt-2 truncate text-[1.35rem] font-black tracking-[-0.04em]",
            strongText(),
          )}
        >
          {value}
        </div>

        {note ? (
          <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</div>
        ) : null}
      </div>
    </article>
  );
}

function MetricBlock({ label, value, note, tone = "neutral" }) {
  return (
    <div className={cx(softPanel(), "min-w-0 p-4")}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
            {label}
          </div>
          <div
            className={cx(
              "mt-2 break-words text-lg font-black tracking-[-0.03em]",
              strongText(),
            )}
          >
            {value}
          </div>
        </div>

        <Badge tone={tone} className="shrink-0">
          {tone === "success" ? "OK" : tone === "warning" ? "Watch" : "Live"}
        </Badge>
      </div>

      {note ? (
        <p className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</p>
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

function ProgressBar({ value, max, tone = "primary" }) {
  const safeMax = Number(max) > 0 ? Number(max) : 1;
  const safeValue = Math.max(0, Number(value) || 0);
  const pct = Math.min(100, Math.round((safeValue / safeMax) * 100));

  const barClass =
    tone === "warning"
      ? "bg-amber-500"
      : tone === "danger"
        ? "bg-red-500"
        : tone === "success"
          ? "bg-emerald-500"
          : "bg-[var(--color-primary)]";

  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
      <div className={cx("h-full rounded-full transition-all", barClass)} style={{ width: `${pct}%` }} />
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
        <div className="min-w-0 rounded-2xl bg-[var(--color-surface-2)] p-3">
          <div className={cx("text-[9px] font-black uppercase tracking-[0.16em]", softText())}>
            Staff
          </div>
          <div className={cx("mt-1 text-sm font-black", strongText())}>
            {plan.staffLimit ?? "Custom"}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl bg-[var(--color-surface-2)] p-3">
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
  maxStaffLimit,
  activeBranches,
  maxBranchLimit,
  refreshing,
  onRefresh,
  onContactSupport,
}) {
  return (
    <section className={cx(pageCard(), "min-w-0 max-w-full overflow-hidden")}>
      <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">Custom plan required</Badge>
            <Badge tone="neutral">Owner-level upgrade</Badge>
          </div>

          <h3 className={cx("mt-4 text-2xl font-black tracking-[-0.05em]", strongText())}>
            This store has outgrown the standard plans.
          </h3>

          <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
            Standard self-service billing supports up to {maxStaffLimit || 10} staff. This store
            currently has {activeStaff} active staff, so renewal should move to a custom plan with
            the right staff seats, branch capacity, support level, and pricing.
          </p>

          <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricBlock
              label="Current staff"
              value={activeStaff}
              note={`Standard maximum: ${maxStaffLimit || 10}`}
              tone="warning"
            />

            <MetricBlock
              label="Current branches"
              value={activeBranches}
              note={`Standard maximum shown: ${maxBranchLimit || "plan-based"}`}
              tone={maxBranchLimit && activeBranches > maxBranchLimit ? "warning" : "success"}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onContactSupport} className={primaryBtn()}>
              Contact Storvex support
            </button>

            <AsyncButton type="button" loading={refreshing} onClick={onRefresh} className={secondaryBtn()}>
              Refresh billing status
            </AsyncButton>
          </div>

          {!SUPPORT_WHATSAPP && !SUPPORT_EMAIL ? (
            <div className="mt-4 rounded-2xl bg-amber-500/10 px-4 py-3 text-xs font-bold leading-5 text-amber-600 dark:text-amber-300">
              Support contact is not configured yet. Add VITE_STORVEX_SUPPORT_WHATSAPP or
              VITE_STORVEX_SUPPORT_EMAIL to the frontend environment.
            </div>
          ) : null}

          <div className={cx("mt-4 text-xs font-semibold leading-5", mutedText())}>
            Support request will include: {tenantName || "store name"}, active staff, active
            branches, and the standard plan limit.
          </div>
        </div>

        <aside className="min-w-0 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] p-5 sm:p-6 xl:border-l xl:border-t-0">
          <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
            Recommended action
          </div>

          <div className={cx("mt-3 text-lg font-black tracking-[-0.03em]", strongText())}>
            Activate Enterprise manually
          </div>

          <p className={cx("mt-3 text-sm font-semibold leading-6", mutedText())}>
            The platform owner side should create or approve a custom subscription for this tenant.
            Do not squeeze larger teams into Team 10 pricing.
          </p>

          <div className="mt-5 space-y-2">
            <div className={cx(softPanel(), "min-w-0 bg-[var(--color-card)] p-4")}>
              <div className={cx("text-xs font-black", strongText())}>What to include</div>
              <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>
                Staff seats, branch capacity, support level, renewal cycle, and payment method.
              </div>
            </div>

            <div className={cx(softPanel(), "min-w-0 bg-[var(--color-card)] p-4")}>
              <div className={cx("text-xs font-black", strongText())}>Why</div>
              <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>
                Larger teams carry more operational risk and need custom support.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PaymentsTable({ payments }) {
  if (!payments.length) {
    return (
      <section className={cx(pageCard(), "min-w-0 max-w-full p-6 text-center")}>
        <div className={cx("text-lg font-black tracking-[-0.03em]", strongText())}>
          No billing activity yet
        </div>
        <p className={cx("mx-auto mt-2 max-w-md text-sm font-semibold leading-6", mutedText())}>
          Renewal requests and successful subscription payments will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className={cx(pageCard(), "min-w-0 max-w-full overflow-hidden")}>
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
              Payment history
            </div>
            <h3 className={cx("mt-2 text-xl font-black tracking-[-0.04em]", strongText())}>
              Recent billing activity
            </h3>
          </div>

          <Badge tone="neutral" className="shrink-0">
            {payments.length} records
          </Badge>
        </div>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <tr>
              {["Reference", "Amount", "Status", "Provider", "Created", "Plan"].map((label) => (
                <th
                  key={label}
                  className={cx(
                    "px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em]",
                    softText(),
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => {
              const status = cleanString(payment.status).toUpperCase();
              const statusTone =
                status === "SUCCESS"
                  ? "success"
                  : status === "FAILED"
                    ? "danger"
                    : status === "PENDING"
                      ? "warning"
                      : "neutral";

              return (
                <tr
                  key={payment.id || payment.reference}
                  className="border-b border-[var(--color-border)] last:border-b-0"
                >
                  <td className="max-w-[270px] px-4 py-4">
                    <div className={cx("truncate text-sm font-black", strongText())}>
                      {payment.reference || "—"}
                    </div>
                    <div className={cx("mt-1 text-xs font-semibold", mutedText())}>
                      {payment.purpose || "Subscription"}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className={cx("text-sm font-black", strongText())}>
                      {formatMoney(payment.amount ?? payment.priceAmount, payment.currency || "RWF")}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <Badge tone={statusTone}>{status || "UNKNOWN"}</Badge>
                  </td>

                  <td className="px-4 py-4">
                    <div className={cx("text-sm font-black", strongText())}>
                      {payment.provider || "—"}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className={cx("text-sm font-semibold", mutedText())}>
                      {formatDate(payment.createdAt)}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className={cx("text-sm font-black", strongText())}>
                      {payment.planKey || "—"}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 p-4 lg:hidden">
        {payments.map((payment) => {
          const status = cleanString(payment.status).toUpperCase();
          const statusTone =
            status === "SUCCESS"
              ? "success"
              : status === "FAILED"
                ? "danger"
                : status === "PENDING"
                  ? "warning"
                  : "neutral";

          return (
            <article
              key={payment.id || payment.reference}
              className={cx(softPanel(), "min-w-0 max-w-full p-4")}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={cx("break-all text-sm font-black", strongText())}>
                    {payment.reference || "—"}
                  </div>
                  <div className={cx("mt-1 text-xs font-semibold", mutedText())}>
                    {formatDate(payment.createdAt)}
                  </div>
                </div>

                <Badge tone={statusTone} className="shrink-0">
                  {status || "UNKNOWN"}
                </Badge>
              </div>

              <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricBlock
                  label="Amount"
                  value={formatMoney(payment.amount ?? payment.priceAmount, payment.currency || "RWF")}
                  tone="neutral"
                />
                <MetricBlock label="Plan" value={payment.planKey || "—"} tone="neutral" />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function Billing() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [overview, setOverview] = useState({
    tenant: null,
    subscription: null,
    usage: null,
    payments: [],
  });

  const [plans, setPlans] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("");
  const [planKey, setPlanKey] = useState("");
  const [phone, setPhone] = useState(localStorage.getItem("storvex_ownerPhone") || "");
  const [paymentRef, setPaymentRef] = useState("");

  const grouped = useMemo(() => groupPlans(plans), [plans]);

  const activeStaff = useMemo(() => pickActiveStaff(overview), [overview]);
  const staffLimit = useMemo(() => pickStaffLimit(overview), [overview]);
  const activeBranches = useMemo(() => pickActiveBranches(overview), [overview]);
  const effectiveBranchLimit = useMemo(() => pickEffectiveBranchLimit(overview), [overview]);

  const enterpriseRequired = Boolean(
    grouped.maxStaffLimit > 0 && activeStaff > grouped.maxStaffLimit,
  );

  const visiblePlans = useMemo(() => {
    return grouped.standard.filter((plan) => {
      const matchesSegment = !selectedSegment || plan.segment === selectedSegment;
      const matchesCycle = !selectedCycle || plan.cycle === selectedCycle;
      return matchesSegment && matchesCycle;
    });
  }, [grouped.standard, selectedSegment, selectedCycle]);

  const selectedPlan = useMemo(() => {
    return (
      visiblePlans.find((plan) => plan.key === planKey) ||
      grouped.standard.find((plan) => plan.key === planKey) ||
      visiblePlans[0] ||
      null
    );
  }, [visiblePlans, grouped.standard, planKey]);

  const selectedPlanInsufficient = useMemo(() => {
    if (!selectedPlan) return true;

    const selectedStaffLimit = Number(selectedPlan.staffLimit);
    if (Number.isFinite(selectedStaffLimit) && activeStaff > selectedStaffLimit) return true;

    const selectedBranchLimit = Number(selectedPlan.branchLimit);
    if (Number.isFinite(selectedBranchLimit) && activeBranches > selectedBranchLimit) return true;

    return false;
  }, [selectedPlan, activeStaff, activeBranches]);

  async function loadBilling({ silent = false } = {}) {
    if (!silent) setLoading(true);

    try {
      const [overviewRes, plansRes] = await Promise.all([
        apiClient.get("/billing/overview"),
        apiClient.get("/billing/plans"),
      ]);

      const nextOverview = pickOverviewPayload(overviewRes?.data || {});
      const nextPlans = Array.isArray(plansRes?.data?.plans) ? plansRes.data.plans : [];

      setOverview(nextOverview);
      setPlans(nextPlans);

      if (!phone && nextOverview?.tenant?.phone) {
        setPhone(nextOverview.tenant.phone);
      }

      const normalizedPlans = nextPlans.map(normalizePlan);
      const currentPlanKey =
        nextOverview?.subscription?.nextPlanKey || nextOverview?.subscription?.planKey || "";

      const match =
        normalizedPlans.find((plan) => plan.key === currentPlanKey) ||
        normalizedPlans.find((plan) => plan.staffLimit >= pickActiveStaff(nextOverview)) ||
        normalizedPlans[0] ||
        null;

      if (match) {
        const normalizedMatch = normalizePlan(match);
        setSelectedSegment((current) => current || normalizedMatch.segment);
        setSelectedCycle((current) => current || normalizedMatch.cycle);
        setPlanKey((current) => current || normalizedMatch.key);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load billing");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);

      try {
        const [overviewRes, plansRes] = await Promise.all([
          apiClient.get("/billing/overview"),
          apiClient.get("/billing/plans"),
        ]);

        if (!alive) return;

        const nextOverview = pickOverviewPayload(overviewRes?.data || {});
        const nextPlans = Array.isArray(plansRes?.data?.plans) ? plansRes.data.plans : [];

        setOverview(nextOverview);
        setPlans(nextPlans);

        if (!phone && nextOverview?.tenant?.phone) {
          setPhone(nextOverview.tenant.phone);
        }

        const normalizedPlans = nextPlans.map(normalizePlan);
        const currentPlanKey =
          nextOverview?.subscription?.nextPlanKey || nextOverview?.subscription?.planKey || "";

        const matched =
          normalizedPlans.find((plan) => plan.key === currentPlanKey) ||
          normalizedPlans.find((plan) => plan.staffLimit >= pickActiveStaff(nextOverview)) ||
          normalizedPlans[0] ||
          null;

        if (matched) {
          const normalizedMatched = normalizePlan(matched);
          setSelectedSegment(normalizedMatched.segment);
          setSelectedCycle(normalizedMatched.cycle);
          setPlanKey(normalizedMatched.key);
        }
      } catch (err) {
        if (alive) {
          toast.error(err?.response?.data?.message || "Failed to load billing");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    boot();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseSegment(segment) {
    setSelectedSegment(segment);

    const nextPlan =
      grouped.standard.find((plan) => plan.segment === segment && plan.cycle === selectedCycle) ||
      grouped.standard.find((plan) => plan.segment === segment && plan.cycle === "HALF_YEAR") ||
      grouped.standard.find((plan) => plan.segment === segment) ||
      null;

    if (nextPlan) {
      setSelectedCycle(nextPlan.cycle);
      setPlanKey(nextPlan.key);
    }
  }

  function chooseCycle(cycle) {
    setSelectedCycle(cycle);

    const nextPlan =
      grouped.standard.find((plan) => plan.segment === selectedSegment && plan.cycle === cycle) ||
      grouped.standard.find((plan) => plan.cycle === cycle) ||
      null;

    if (nextPlan) {
      setSelectedSegment(nextPlan.segment);
      setPlanKey(nextPlan.key);
    }
  }

  async function refreshStatus() {
    setRefreshing(true);

    try {
      await loadBilling({ silent: true });
      toast.success("Billing status refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  function contactEnterpriseSupport() {
    const ok = openEnterpriseSupport({
      tenantName: overview?.tenant?.name || "Your store",
      activeStaff,
      activeBranches,
      maxStaffLimit: grouped.maxStaffLimit,
    });

    if (!ok) {
      toast.error("Support contact is not configured yet.");
    }
  }

  async function startRenewal(event) {
    event.preventDefault();

    if (enterpriseRequired) {
      toast.error("This tenant requires a custom enterprise plan.");
      return;
    }

    if (!selectedPlan) {
      toast.error("Select a renewal plan.");
      return;
    }

    if (selectedPlanInsufficient) {
      toast.error("Selected plan does not cover the current staff or branch usage.");
      return;
    }

    const cleanPhone = cleanString(phone);
    if (!cleanPhone) {
      toast.error("Enter the MoMo phone number.");
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

  const subscription = overview?.subscription || null;
  const tenant = overview?.tenant || null;
  const tenantName = tenant?.name || "Your store";
  const subMeta = subscriptionTone(subscription);

  const daysLeft = daysUntil(subscription?.endDate);
  const graceDaysLeft = daysUntil(subscription?.graceEndDate);

  const staffTone =
    staffLimit != null && activeStaff > staffLimit
      ? "danger"
      : staffLimit != null && activeStaff >= staffLimit
        ? "warning"
        : "success";

  const branchTone =
    effectiveBranchLimit != null && activeBranches > effectiveBranchLimit
      ? "danger"
      : effectiveBranchLimit != null && activeBranches >= effectiveBranchLimit
        ? "warning"
        : "success";

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <section className={cx(pageCard(), "min-w-0 max-w-full overflow-hidden")}>
        <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1.15fr)_380px]">
          <div className="min-w-0 border-b border-[var(--color-border)] p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <SectionHeading
                eyebrow="Billing control"
                title="Billing & subscription"
                subtitle="Monitor subscription status, staff seats, branch capacity, payment history, and renewals directly inside Settings."
              />

              <div className="flex shrink-0 flex-wrap gap-2">
                <Badge tone={subMeta.tone}>{subMeta.label}</Badge>
                {enterpriseRequired ? <Badge tone="warning">Enterprise required</Badge> : null}
              </div>
            </div>

            <div className="mt-6 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Store" value={tenantName} note="Current billing workspace" />
              <SummaryCard
                label="Current plan"
                value={subscription?.planKey || "—"}
                note={`Cycle: ${subscription?.cycleKey || "—"}`}
                tone="info"
              />
              <SummaryCard
                label="Ends"
                value={formatDate(subscription?.endDate)}
                note={
                  daysLeft == null
                    ? "No end date found"
                    : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                }
                tone={daysLeft != null && daysLeft <= 7 ? "warning" : "success"}
              />
              <SummaryCard
                label="Price"
                value={formatMoney(subscription?.priceAmount, subscription?.currency || "RWF")}
                note="Current subscription amount"
              />
            </div>
          </div>

          <aside className="min-w-0 p-5 sm:p-6">
            <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
              Live capacity
            </div>

            <div className="mt-4 space-y-4">
              <div className={cx(softPanel(), "min-w-0 p-4")}>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className={cx("text-xs font-black", strongText())}>Staff seats</div>
                    <div className={cx("mt-1 text-xs font-semibold", mutedText())}>
                      {activeStaff} active / {staffLimit ?? "custom"} allowed
                    </div>
                  </div>
                  <Badge tone={staffTone} className="shrink-0">
                    {staffTone === "danger" ? "Over" : staffTone === "warning" ? "Limit" : "OK"}
                  </Badge>
                </div>

                {staffLimit ? <ProgressBar value={activeStaff} max={staffLimit} tone={staffTone} /> : null}
              </div>

              <div className={cx(softPanel(), "min-w-0 p-4")}>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className={cx("text-xs font-black", strongText())}>Branch capacity</div>
                    <div className={cx("mt-1 text-xs font-semibold", mutedText())}>
                      {activeBranches} active / {effectiveBranchLimit ?? "custom"} allowed
                    </div>
                  </div>
                  <Badge tone={branchTone} className="shrink-0">
                    {branchTone === "danger" ? "Over" : branchTone === "warning" ? "Limit" : "OK"}
                  </Badge>
                </div>

                {effectiveBranchLimit ? (
                  <ProgressBar value={activeBranches} max={effectiveBranchLimit} tone={branchTone} />
                ) : null}
              </div>

              <div className={cx(softPanel(), "min-w-0 p-4")}>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className={cx("text-xs font-black", strongText())}>Access mode</div>
                    <div className={cx("mt-1 text-xs font-semibold", mutedText())}>
                      Status: {subscription?.status || "—"}
                    </div>
                  </div>
                  <Badge tone={subMeta.tone} className="shrink-0">
                    {subscription?.accessMode || "—"}
                  </Badge>
                </div>

                <p className={cx("mt-3 text-xs font-semibold leading-5", mutedText())}>
                  {subMeta.note}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {enterpriseRequired ? (
        <EnterpriseRequiredPanel
          tenantName={tenantName}
          activeStaff={activeStaff}
          maxStaffLimit={grouped.maxStaffLimit}
          activeBranches={activeBranches}
          maxBranchLimit={grouped.maxBranchLimit}
          refreshing={refreshing}
          onRefresh={refreshStatus}
          onContactSupport={contactEnterpriseSupport}
        />
      ) : (
        <section className={cx(pageCard(), "min-w-0 max-w-full overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="Renewal"
                title="Renew or extend access"
                subtitle="Choose the plan size and billing cycle, then create a MoMo renewal request from this same settings screen."
              />

              <div className="flex shrink-0 flex-wrap gap-2">
                <AsyncButton
                  type="button"
                  loading={refreshing}
                  onClick={refreshStatus}
                  className={secondaryBtn()}
                >
                  Refresh status
                </AsyncButton>
              </div>
            </div>
          </div>

          <form onSubmit={startRenewal} className="min-w-0 p-5 sm:p-6">
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-6">
                <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
                  <div className="min-w-0">
                    <div className={cx("text-sm font-black", strongText())}>1. Choose business size</div>
                    <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                      Pick the renewal family that matches the current team.
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
                      Longer cycles reduce renewal friction and protect continuity.
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

                <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
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

                <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="min-w-0 lg:col-span-7">
                    <label className={cx("text-sm font-black", strongText())}>Selected plan</label>
                    <select
                      className="app-input mt-2"
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

                  <div className="min-w-0 lg:col-span-5">
                    <label className={cx("text-sm font-black", strongText())}>MoMo phone</label>
                    <input
                      className="app-input mt-2"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="07XXXXXXXX or 2507XXXXXXXX"
                      required
                    />
                  </div>
                </div>
              </div>

              <aside className={cx(softPanel(), "h-fit min-w-0 p-4")}>
                <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
                  Selected
                </div>

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

                    <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
                      {selectedPlan.label}
                    </p>

                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                      <MetricBlock label="Cycle" value={cycleLabel(selectedPlan.cycle)} />
                      <MetricBlock label="Duration" value={`${selectedPlan.days} days`} />
                      <MetricBlock label="Staff" value={selectedPlan.staffLimit ?? "Custom"} />
                      <MetricBlock label="Branches" value={selectedPlan.branchLimit ?? "Custom"} />
                    </div>

                    {selectedPlanInsufficient ? (
                      <div className="mt-4 rounded-2xl bg-amber-500/10 px-4 py-3 text-xs font-bold leading-5 text-amber-600 dark:text-amber-300">
                        This plan does not cover the current staff or branch usage.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className={cx("mt-3 text-sm font-semibold leading-6", mutedText())}>
                    No matching plan is available for the current filters.
                  </p>
                )}
              </aside>
            </div>

            <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">
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
                I paid → Refresh billing
              </AsyncButton>
            </div>

            {paymentRef ? (
              <div className={cx("mt-5", softPanel(), "min-w-0 p-4")}>
                <div className={cx("text-sm font-black", strongText())}>Payment request created</div>
                <div className={cx("mt-2 break-all text-sm font-semibold leading-6", mutedText())}>
                  Reference: <span className={strongText()}>{paymentRef}</span>
                </div>
                <div className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
                  Confirm on your phone, then refresh billing.
                </div>
              </div>
            ) : null}
          </form>
        </section>
      )}

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
        <MetricBlock
          label="Grace window"
          value={formatDate(subscription?.graceEndDate)}
          note={
            graceDaysLeft == null
              ? "No grace date available"
              : `${graceDaysLeft} day${graceDaysLeft === 1 ? "" : "s"} remaining in grace window`
          }
          tone={graceDaysLeft != null && graceDaysLeft <= 3 ? "warning" : "neutral"}
        />

        <MetricBlock
          label="Last payment"
          value={formatDate(subscription?.lastPaymentAt)}
          note="Last recorded successful subscription payment"
          tone="neutral"
        />

        <MetricBlock
          label="Renewed at"
          value={formatDate(subscription?.renewedAt)}
          note="Most recent subscription renewal timestamp"
          tone="neutral"
        />
      </section>

      <PaymentsTable payments={overview.payments || []} />

      <div className="flex min-w-0 justify-end">
        <button type="button" onClick={refreshStatus} className={subtleBtn()} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh billing data"}
        </button>
      </div>
    </div>
  );
}