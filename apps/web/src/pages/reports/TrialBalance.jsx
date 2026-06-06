import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { getFinancialSummary } from "../../services/reportsApi";
import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { cn } from "../../lib/cn";

const CARD = () =>
  "rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";

const PANEL = () =>
  "rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";

function todayISO() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - Number(days || 0));

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function startOfMonthISO() {
  const d = new Date();
  d.setDate(1);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    "01",
  ].join("-");
}

function money(value) {
  const n = Number(value || 0);

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(n))}`;
}

function numberValue(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toneForAmount(value) {
  const n = numberValue(value);

  if (n > 0) return "success";
  if (n < 0) return "danger";

  return "neutral";
}

function Badge({ children, tone = "neutral" }) {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
    info: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
    neutral: "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em]",
        styles[tone] || styles.neutral,
      )}
    >
      {children}
    </span>
  );
}

function SectionHeader({ eyebrow, title, text, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-text)] sm:text-2xl">
          {title}
        </h2>

        {text ? (
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            {text}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function KpiCard({ label, value, note, tone = "info" }) {
  const barStyles = {
    success: "bg-emerald-500",
    info: "bg-[var(--color-primary)]",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    neutral: "bg-[var(--color-text-muted)]",
  };

  return (
    <article className={cn(CARD(), "relative overflow-hidden p-5 sm:p-6")}>
      <div className={cn("absolute inset-x-0 top-0 h-1.5", barStyles[tone] || barStyles.info)} />

      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </p>

      <div className="mt-4 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl">
        {value}
      </div>

      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
        {note}
      </p>
    </article>
  );
}

function DetailTile({ label, value, tone = "neutral" }) {
  return (
    <div className={cn(PANEL(), "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>

          <p className="mt-2 break-words text-sm font-black text-[var(--color-text)]">
            {value || "—"}
          </p>
        </div>

        {tone !== "neutral" ? <Badge tone={tone}>Check</Badge> : null}
      </div>
    </div>
  );
}

function RangeButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 rounded-2xl px-4 text-sm font-black transition",
        active
          ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]"
          : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  );
}

function BalanceRow({ account, type, debit = 0, credit = 0, note, strong = false }) {
  const debitValue = numberValue(debit);
  const creditValue = numberValue(credit);

  return (
    <div
      className={cn(
        "grid gap-3 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-4",
        "lg:grid-cols-[minmax(0,1.2fr)_170px_170px_170px]",
        strong ? "shadow-[var(--shadow-soft)]" : "",
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-black text-[var(--color-text)]",
            strong ? "text-base" : "text-sm",
          )}
        >
          {account}
        </p>

        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
          {note}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          Type
        </p>
        <p className="mt-1 text-sm font-black text-[var(--color-text)]">{type}</p>
      </div>

      <div className="lg:text-right">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          Debit
        </p>
        <p className="mt-1 text-sm font-black text-[var(--color-text)]">
          {debitValue > 0 ? money(debitValue) : "—"}
        </p>
      </div>

      <div className="lg:text-right">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          Credit
        </p>
        <p className="mt-1 text-sm font-black text-[var(--color-text)]">
          {creditValue > 0 ? money(creditValue) : "—"}
        </p>
      </div>
    </div>
  );
}

function EmptyNote({ title, text }) {
  return (
    <div className={cn(PANEL(), "p-5")}>
      <p className="text-sm font-black text-[var(--color-text)]">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>
    </div>
  );
}

export default function TrialBalance() {
  const [range, setRange] = useState({
    from: startOfMonthISO(),
    to: todayISO(),
  });

  const [preset, setPreset] = useState("MONTH");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const summary = payload?.summary || {};
  const branchScope = payload?.branchScope || {};

  const revenue = numberValue(summary?.revenue);
  const expenses = numberValue(summary?.approvedExpenses);
  const profit = numberValue(summary?.profitEstimate);
  const salesCount = numberValue(summary?.salesCount);
  const stockAdjustmentsCount = numberValue(summary?.stockAdjustmentsCount);

  const estimatedDebitTotal = expenses + Math.max(profit, 0);
  const estimatedCreditTotal = revenue + Math.max(-profit, 0);
  const difference = estimatedDebitTotal - estimatedCreditTotal;

  const isBalanced = Math.abs(difference) <= 0;

  const rangeLabel = useMemo(() => {
    return `${formatDate(range.from)} — ${formatDate(range.to)}`;
  }, [range]);

  async function loadReport({ quiet = false } = {}) {
    if (!quiet) setLoading(true);

    try {
      const data = await getFinancialSummary(range);
      setPayload(data || null);
    } catch (error) {
      console.error("Trial balance failed:", error);
      toast.error(error?.response?.data?.message || "Failed to load trial balance");
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  async function refresh() {
    setRefreshing(true);

    try {
      await loadReport({ quiet: true });
      toast.success("Trial balance refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  function applyPreset(nextPreset) {
    setPreset(nextPreset);

    if (nextPreset === "TODAY") {
      setRange({ from: todayISO(), to: todayISO() });
      return;
    }

    if (nextPreset === "7D") {
      setRange({ from: daysAgoISO(6), to: todayISO() });
      return;
    }

    if (nextPreset === "30D") {
      setRange({ from: daysAgoISO(29), to: todayISO() });
      return;
    }

    setRange({ from: startOfMonthISO(), to: todayISO() });
  }

  function updateRange(key, value) {
    setPreset("CUSTOM");
    setRange((current) => ({ ...current, [key]: value }));
  }

  if (loading) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <div className="space-y-6">
      <section className={cn(CARD(), "relative overflow-hidden p-5 sm:p-6 lg:p-7")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgba(74,163,255,0.14)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              <span className="truncate">
                Trial balance • {branchScope?.label || "Current branch"} • {rangeLabel}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Trial balance.
            </h1>

            <p className="mt-3 max-w-3xl text-base font-medium leading-8 text-[var(--color-text-muted)]">
              A clean owner control view showing sales, expenses, estimated profit,
              and whether the period looks balanced from the data currently available.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:shrink-0">
             <Link
                to="/dashboard/reports"
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 sm:w-auto"
            >
                Back to reports
            </Link>
            <AsyncButton
              loading={refreshing}
              loadingText="Refreshing..."
              variant="secondary"
              onClick={refresh}
              className="w-full sm:w-auto"
            >
              Refresh
            </AsyncButton>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile label="Branch view" value={branchScope?.label || "Current branch"} />
          <DetailTile label="From" value={formatDate(range.from)} />
          <DetailTile label="To" value={formatDate(range.to)} />
          <DetailTile
            label="Balance check"
            value={isBalanced ? "Balanced" : `${money(difference)} difference`}
            tone={isBalanced ? "success" : "warning"}
          />
        </div>
      </section>

      <section className={cn(CARD(), "p-5 sm:p-6 lg:p-7")}>
        <SectionHeader
          eyebrow="Period"
          title="Choose report period"
          text="Use a quick period or choose your own dates."
          action={<Badge tone="info">{preset === "CUSTOM" ? "Custom" : preset}</Badge>}
        />

        <div className="flex flex-wrap gap-2">
          <RangeButton active={preset === "TODAY"} onClick={() => applyPreset("TODAY")}>
            Today
          </RangeButton>
          <RangeButton active={preset === "7D"} onClick={() => applyPreset("7D")}>
            Last 7 days
          </RangeButton>
          <RangeButton active={preset === "30D"} onClick={() => applyPreset("30D")}>
            Last 30 days
          </RangeButton>
          <RangeButton active={preset === "MONTH"} onClick={() => applyPreset("MONTH")}>
            This month
          </RangeButton>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-black text-[var(--color-text)]">
              From
            </label>
            <input
              type="date"
              value={range.from}
              onChange={(event) => updateRange("from", event.target.value)}
              className="h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-black text-[var(--color-text)]">
              To
            </label>
            <input
              type="date"
              value={range.to}
              onChange={(event) => updateRange("to", event.target.value)}
              className="h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)]"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sales"
          value={money(revenue)}
          note={`${salesCount} sale${salesCount === 1 ? "" : "s"} recorded.`}
          tone="success"
        />

        <KpiCard
          label="Expenses"
          value={money(expenses)}
          note="Approved expenses in this period."
          tone={expenses > 0 ? "warning" : "success"}
        />

        <KpiCard
          label="Estimated profit"
          value={money(profit)}
          note="Sales minus approved expenses."
          tone={toneForAmount(profit)}
        />

        <KpiCard
          label="Stock activity"
          value={String(stockAdjustmentsCount)}
          note="Stock adjustments recorded."
          tone={stockAdjustmentsCount > 0 ? "info" : "neutral"}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className={cn(CARD(), "p-5 sm:p-6")}>
          <SectionHeader
            eyebrow="Balance"
            title="Owner control balance"
            text="This is an owner-friendly balance view using the current financial summary endpoint."
            action={<Badge tone={isBalanced ? "success" : "warning"}>{isBalanced ? "Balanced" : "Review"}</Badge>}
          />

          <div className="space-y-3">
            <BalanceRow
              account="Sales income"
              type="Income"
              credit={revenue}
              note="Money earned from sales in the selected period."
            />

            <BalanceRow
              account="Approved expenses"
              type="Expense"
              debit={expenses}
              note="Approved store expenses in the selected period."
            />

            {profit >= 0 ? (
              <BalanceRow
                account="Estimated profit"
                type="Result"
                debit={profit}
                note="Positive result used to balance the owner view."
                strong
              />
            ) : (
              <BalanceRow
                account="Estimated loss"
                type="Result"
                credit={Math.abs(profit)}
                note="Negative result used to balance the owner view."
                strong
              />
            )}

            <BalanceRow
              account="Totals"
              type="Check"
              debit={estimatedDebitTotal}
              credit={estimatedCreditTotal}
              note="Debit and credit sides should match in this owner control view."
              strong
            />
          </div>
        </section>

        <aside className={cn(CARD(), "h-fit p-5 sm:p-6 lg:sticky lg:top-24")}>
          <SectionHeader
            eyebrow="Owner meaning"
            title="What this means"
            text="Plain-English reading of this report."
          />

          <div className="space-y-3">
            <DetailTile
              label="Sales side"
              value={revenue > 0 ? "Sales are recorded" : "No sales in this period"}
              tone={revenue > 0 ? "success" : "warning"}
            />

            <DetailTile
              label="Expense side"
              value={expenses > 0 ? "Expenses are recorded" : "No approved expenses"}
              tone={expenses > 0 ? "warning" : "success"}
            />

            <DetailTile
              label="Result"
              value={
                profit > 0
                  ? "Business made estimated profit"
                  : profit < 0
                    ? "Business made estimated loss"
                    : "Business broke even"
              }
              tone={toneForAmount(profit)}
            />

            <EmptyNote
              title="Accuracy note"
              text="This is not yet a formal accountant-grade trial balance because the backend does not currently return full debit and credit ledger accounts. It is an owner control view built from sales, approved expenses, profit estimate, and stock adjustment count."
            />
          </div>
        </aside>
      </section>

      <section className={cn(CARD(), "p-5 sm:p-6")}>
        <SectionHeader
          eyebrow="Data check"
          title="Report coverage"
          text="This shows what this report can currently confirm."
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile label="Sales" value="Available" tone="success" />
          <DetailTile label="Expenses" value="Available" tone="success" />
          <DetailTile label="Profit estimate" value="Available" tone="success" />
          <DetailTile label="Full ledger accounts" value="Not available yet" tone="warning" />
        </div>
      </section>
    </div>
  );
}