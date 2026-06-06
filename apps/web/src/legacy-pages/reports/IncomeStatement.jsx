import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { getIncomeStatement } from "../../services/reportsApi";
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

function maybeMoney(value) {
  if (value === null || value === undefined) return "Not available yet";
  return money(value);
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

function percent(value) {
  if (value === null || value === undefined) return "—";

  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return `${n.toFixed(1)}%`;
}

function margin(part, total) {
  const p = numberValue(part);
  const t = numberValue(total);

  if (t <= 0) return null;

  return (p / t) * 100;
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

function StatementRow({ label, value, note, strong = false, tone = "neutral" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        strong ? "shadow-[var(--shadow-soft)]" : "",
      )}
    >
      <div>
        <p
          className={cn(
            "font-black text-[var(--color-text)]",
            strong ? "text-base" : "text-sm",
          )}
        >
          {label}
        </p>

        {note ? (
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
            {note}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-3 sm:text-right">
        {tone !== "neutral" ? <Badge tone={tone}>{tone === "success" ? "Good" : "Watch"}</Badge> : null}

        <p
          className={cn(
            "font-black tracking-[-0.03em]",
            strong ? "text-xl text-[var(--color-text)]" : "text-base text-[var(--color-text)]",
          )}
        >
          {value}
        </p>
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

export default function IncomeStatement() {
  const [range, setRange] = useState({
    from: startOfMonthISO(),
    to: todayISO(),
  });

  const [preset, setPreset] = useState("MONTH");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const statement = payload?.incomeStatement || {};
  const branchScope = payload?.branchScope || {};

  const revenue = numberValue(statement?.revenue);
  const operatingExpenses = numberValue(statement?.operatingExpenses);
  const netIncome = numberValue(statement?.netIncomeEstimate);

  const costOfGoodsSold =
    statement?.costOfGoodsSold ??
    statement?.costOfSales ??
    statement?.cost ??
    null;

  const grossProfit =
    statement?.grossProfit ??
    (costOfGoodsSold !== null && costOfGoodsSold !== undefined
      ? revenue - numberValue(costOfGoodsSold)
      : null);

  const grossMargin = grossProfit === null ? null : margin(grossProfit, revenue);
  const netMargin = margin(netIncome, revenue);

  const rangeLabel = useMemo(() => {
    return `${formatDate(range.from)} — ${formatDate(range.to)}`;
  }, [range]);

  async function loadReport({ quiet = false } = {}) {
    if (!quiet) setLoading(true);

    try {
      const data = await getIncomeStatement(range);
      setPayload(data || null);
    } catch (error) {
      console.error("Income statement failed:", error);
      toast.error(error?.response?.data?.message || "Failed to load income statement");
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
      toast.success("Income statement refreshed");
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
                Income statement • {branchScope?.label || "Current branch"} • {rangeLabel}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Income statement.
            </h1>

            <p className="mt-3 max-w-3xl text-base font-medium leading-8 text-[var(--color-text-muted)]">
              See sales, expenses, and estimated profit for the selected period.
              This helps the owner understand whether the store is actually making money.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:shrink-0">
             <Link
                to="/app/reports"
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
            label="Profit status"
            value={netIncome > 0 ? "Profitable" : netIncome < 0 ? "Loss" : "Break-even"}
            tone={toneForAmount(netIncome)}
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
          note="Total sales recorded in this period."
          tone="success"
        />

        <KpiCard
          label="Gross profit"
          value={maybeMoney(grossProfit)}
          note={
            grossProfit === null
              ? "Backend cost data is not connected yet."
              : `${percent(grossMargin)} gross margin.`
          }
          tone={grossProfit === null ? "neutral" : toneForAmount(grossProfit)}
        />

        <KpiCard
          label="Expenses"
          value={money(operatingExpenses)}
          note="Approved operating expenses."
          tone={operatingExpenses > 0 ? "warning" : "success"}
        />

        <KpiCard
          label="Net profit"
          value={money(netIncome)}
          note={`${percent(netMargin)} net margin.`}
          tone={toneForAmount(netIncome)}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className={cn(CARD(), "p-5 sm:p-6")}>
          <SectionHeader
            eyebrow="Statement"
            title="Profit and loss"
            text="A clean owner view of sales, costs, expenses, and net profit."
            action={<Badge tone={toneForAmount(netIncome)}>{netIncome >= 0 ? "Positive" : "Loss"}</Badge>}
          />

          <div className="space-y-3">
            <StatementRow
              label="Sales"
              value={money(revenue)}
              note="All sales recorded during the selected period."
              strong
              tone="success"
            />

            <StatementRow
              label="Cost of goods sold"
              value={maybeMoney(costOfGoodsSold)}
              note={
                costOfGoodsSold === null || costOfGoodsSold === undefined
                  ? "Product cost tracking is not connected to this report yet."
                  : "Estimated product cost for goods sold."
              }
              tone={costOfGoodsSold === null || costOfGoodsSold === undefined ? "warning" : "neutral"}
            />

            <StatementRow
              label="Gross profit"
              value={maybeMoney(grossProfit)}
              note={
                grossProfit === null
                  ? "Will show after cost of goods sold is available."
                  : "Sales minus cost of goods sold."
              }
              strong
              tone={grossProfit === null ? "warning" : toneForAmount(grossProfit)}
            />

            <StatementRow
              label="Operating expenses"
              value={money(operatingExpenses)}
              note="Approved expenses during the period."
              tone={operatingExpenses > 0 ? "warning" : "success"}
            />

            <StatementRow
              label="Net profit estimate"
              value={money(netIncome)}
              note="Current backend estimate: sales minus approved expenses."
              strong
              tone={toneForAmount(netIncome)}
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
              label="Sales strength"
              value={revenue > 0 ? "Sales recorded" : "No sales in this period"}
              tone={revenue > 0 ? "success" : "warning"}
            />

            <DetailTile
              label="Expense pressure"
              value={
                revenue > 0
                  ? `${percent(margin(operatingExpenses, revenue))} of sales`
                  : "No sales to compare"
              }
              tone={operatingExpenses > revenue && revenue > 0 ? "danger" : "neutral"}
            />

            <DetailTile
              label="Net result"
              value={netIncome > 0 ? "Business made profit" : netIncome < 0 ? "Business made loss" : "Break-even"}
              tone={toneForAmount(netIncome)}
            />

            <EmptyNote
              title="Accuracy note"
              text="This page is ready for true gross profit, but the current backend response does not yet include cost of goods sold. Until that is added, net profit is an estimate based on sales minus approved expenses."
            />
          </div>
        </aside>
      </section>

      <section className={cn(CARD(), "p-5 sm:p-6")}>
        <SectionHeader
          eyebrow="Data check"
          title="Report coverage"
          text="This shows what the current income statement can and cannot confirm."
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile label="Sales" value="Available" tone="success" />
          <DetailTile label="Expenses" value="Available" tone="success" />
          <DetailTile
            label="Product cost"
            value={costOfGoodsSold === null || costOfGoodsSold === undefined ? "Not available yet" : "Available"}
            tone={costOfGoodsSold === null || costOfGoodsSold === undefined ? "warning" : "success"}
          />
          <DetailTile
            label="Gross profit"
            value={grossProfit === null ? "Waiting for cost data" : "Available"}
            tone={grossProfit === null ? "warning" : "success"}
          />
        </div>
      </section>
    </div>
  );
}