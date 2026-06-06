import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import {
  downloadBlob,
  downloadDailyClosePdf,
  downloadPeriodPdf,
  getInsights,
  getReportsDashboard,
} from "../../services/reportsApi";
import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { cn } from "../../lib/cn";

const CARD = () =>
  "rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";

const PANEL = () =>
  "rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";

const REPORT_LINKS = [
  {
    title: "Cash flow",
    text: "Money in, money out, net cash flow, drawer control, payment method split.",
    to: "/app/reports/cash-flow",
    badge: "Money control",
    emoji: "💵",
    primary: true,
  },
  {
    title: "Income statement",
    text: "Sales, expenses, estimated profit, margin, and business result.",
    to: "/app/reports/income-statement",
    badge: "Profit & loss",
    emoji: "📈",
  },
  {
    title: "Trial balance",
    text: "Owner control balance for sales, expenses, profit estimate, and checks.",
    to: "/app/reports/trial-balance",
    badge: "Accounting view",
    emoji: "⚖️",
  },
  {
    title: "Profit table",
    text: "Plain owner view of sales, expenses, profit margin, and top products.",
    to: "/app/reports/profit-table",
    badge: "Owner profit",
    emoji: "🏆",
  },
];

function todayISO() {
  const d = new Date();

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

function pctFmt(value) {
  if (value === null || value === undefined) return "—";

  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
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

function ReportCard({ report }) {
  return (
    <Link
      to={report.to}
      className={cn(
        "group relative overflow-hidden rounded-[34px] border p-5 transition hover:-translate-y-1 sm:p-6",
        report.primary
          ? "border-transparent bg-[var(--color-primary)] text-white shadow-[var(--shadow-card)]"
          : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] shadow-[var(--shadow-card)] hover:border-[var(--color-primary)]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-[var(--shadow-soft)]",
            report.primary ? "bg-white/15" : "bg-[var(--color-primary-soft)]",
          )}
        >
          {report.emoji}
        </div>

        <span
          className={cn(
            "rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]",
            report.primary
              ? "bg-white/15 text-white"
              : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
          )}
        >
          {report.badge}
        </span>
      </div>

      <h3 className="mt-6 text-xl font-black tracking-[-0.035em]">
        {report.title}
      </h3>

      <p
        className={cn(
          "mt-2 text-sm font-semibold leading-6",
          report.primary ? "text-white/75" : "text-[var(--color-text-muted)]",
        )}
      >
        {report.text}
      </p>

      <div
        className={cn(
          "mt-6 inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-black transition group-hover:translate-x-1",
          report.primary
            ? "bg-white text-[var(--color-primary)]"
            : "bg-[var(--color-surface-2)] text-[var(--color-text)]",
        )}
      >
        Open report →
      </div>
    </Link>
  );
}

function InsightTile({ label, value, note, tone = "neutral" }) {
  return (
    <div className={cn(PANEL(), "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>

          <p className="mt-2 text-lg font-black tracking-[-0.035em] text-[var(--color-text)]">
            {value}
          </p>

          {note ? (
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
              {note}
            </p>
          ) : null}
        </div>

        {tone !== "neutral" ? <Badge tone={tone}>Check</Badge> : null}
      </div>
    </div>
  );
}

function ActionRow({ title, text, tone = "neutral" }) {
  return (
    <div className={cn(PANEL(), "p-4")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-[var(--color-text)]">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            {text}
          </p>
        </div>

        <Badge tone={tone}>{tone === "success" ? "Good" : tone === "danger" ? "Urgent" : "Review"}</Badge>
      </div>
    </div>
  );
}

export default function Reports() {
  const [range] = useState({
    from: startOfMonthISO(),
    to: todayISO(),
  });

  const [dashboard, setDashboard] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyPdfBusy, setDailyPdfBusy] = useState(false);
  const [periodPdfBusy, setPeriodPdfBusy] = useState(false);

  const summary = dashboard || {};
  const comparison = insights?.comparison || {};
  const current = comparison?.current || {};
  const percent = comparison?.percent || {};
  const reorderItems = Array.isArray(insights?.reorderSuggestions?.items)
    ? insights.reorderSuggestions.items
    : [];
  const collectionItems = Array.isArray(insights?.collections?.items)
    ? insights.collections.items
    : [];

  const profit = numberValue(summary?.profitEstimate);
  const revenue = numberValue(summary?.sales?.total);
  const expenses = numberValue(summary?.expenses?.approvedTotal);

  const rangeLabel = useMemo(() => {
    return `${formatDate(range.from)} — ${formatDate(range.to)}`;
  }, [range]);

  async function load({ quiet = false } = {}) {
    if (!quiet) setLoading(true);

    try {
      const [dashboardData, insightsData] = await Promise.all([
        getReportsDashboard(range),
        getInsights(range, 10, 5),
      ]);

      setDashboard(dashboardData || null);
      setInsights(insightsData || null);
    } catch (error) {
      console.error("Reports hub failed:", error);
      toast.error(error?.response?.data?.message || "Failed to load reports");
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setRefreshing(true);

    try {
      await load({ quiet: true });
      toast.success("Reports refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  async function downloadDailyPdf() {
    setDailyPdfBusy(true);

    try {
      const blob = await downloadDailyClosePdf(todayISO());
      downloadBlob(blob, `storvex-daily-close-${todayISO()}.pdf`);
      toast.success("Daily close PDF downloaded");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download daily close PDF");
    } finally {
      setDailyPdfBusy(false);
    }
  }

  async function downloadPeriodReportPdf() {
    setPeriodPdfBusy(true);

    try {
      const blob = await downloadPeriodPdf(range, 10, 5);
      downloadBlob(blob, `storvex-period-report-${range.from}-to-${range.to}.pdf`);
      toast.success("Period report PDF downloaded");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download period PDF");
    } finally {
      setPeriodPdfBusy(false);
    }
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
                Reports command center • {summary?.branchScope?.label || "Current branch"} • {rangeLabel}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Owner reports.
            </h1>

            <p className="mt-3 max-w-3xl text-base font-medium leading-8 text-[var(--color-text-muted)]">
              Clear money, profit, stock, credit, and branch-aware reporting for business control.
              Start with the report you need, then use PDFs when you want a close or period summary.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:shrink-0">
            <AsyncButton
              loading={refreshing}
              loadingText="Refreshing..."
              variant="secondary"
              onClick={refresh}
              className="w-full sm:w-auto"
            >
              Refresh
            </AsyncButton>

            <AsyncButton
              loading={periodPdfBusy}
              loadingText="Preparing..."
              onClick={downloadPeriodReportPdf}
              className="w-full sm:w-auto"
            >
              Download period PDF
            </AsyncButton>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InsightTile label="Revenue" value={money(revenue)} note={`${summary?.sales?.count || 0} sale records`} tone="success" />
          <InsightTile label="Expenses" value={money(expenses)} note={`${summary?.expenses?.approvedCount || 0} approved expenses`} tone={expenses > 0 ? "warning" : "success"} />
          <InsightTile label="Profit estimate" value={money(profit)} note="Sales minus approved expenses" tone={profit > 0 ? "success" : profit < 0 ? "danger" : "neutral"} />
          <InsightTile label="Trend" value={pctFmt(percent?.profit)} note="Profit vs previous period" tone={numberValue(percent?.profit) >= 0 ? "success" : "warning"} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {REPORT_LINKS.map((report) => (
          <ReportCard key={report.to} report={report} />
        ))}
      </section>

      <section className={cn(CARD(), "p-5 sm:p-6 lg:p-7")}>
        <SectionHeader
          eyebrow="Owner actions"
          title="What needs attention"
          text="Reports are not just numbers. They should tell the owner where to act."
          action={<Badge tone="info">Current period</Badge>}
        />

        <div className="grid gap-3 lg:grid-cols-3">
          <ActionRow
            title="Revenue trend"
            text={`Revenue change compared to previous period: ${pctFmt(percent?.revenue)}.`}
            tone={numberValue(percent?.revenue) >= 0 ? "success" : "warning"}
          />

          <ActionRow
            title="Reorder pressure"
            text={`${reorderItems.length} product${reorderItems.length === 1 ? "" : "s"} suggested for reorder based on low stock and sales.`}
            tone={reorderItems.length ? "warning" : "success"}
          />

          <ActionRow
            title="Credit collections"
            text={`${collectionItems.length} overdue customer${collectionItems.length === 1 ? "" : "s"} need follow-up.`}
            tone={collectionItems.length ? "danger" : "success"}
          />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <section className={cn(CARD(), "p-5 sm:p-6")}>
          <SectionHeader
            eyebrow="PDF reports"
            title="Download owner summaries"
            text="Use these when you need a close report or a period report for review."
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn(PANEL(), "p-5")}>
              <p className="text-sm font-black text-[var(--color-text)]">
                Daily close PDF
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                Today’s cash, revenue, expenses, profit estimate, top sellers, reorder and collection actions.
              </p>

              <AsyncButton
                loading={dailyPdfBusy}
                loadingText="Preparing..."
                onClick={downloadDailyPdf}
                className="mt-5 w-full"
              >
                Download today
              </AsyncButton>
            </div>

            <div className={cn(PANEL(), "p-5")}>
              <p className="text-sm font-black text-[var(--color-text)]">
                Period report PDF
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                Current month summary with revenue, expenses, profit estimate, top sellers, and owner actions.
              </p>

              <AsyncButton
                loading={periodPdfBusy}
                loadingText="Preparing..."
                onClick={downloadPeriodReportPdf}
                className="mt-5 w-full"
              >
                Download period
              </AsyncButton>
            </div>
          </div>
        </section>

        <section className={cn(CARD(), "p-5 sm:p-6")}>
          <SectionHeader
            eyebrow="Data coverage"
            title="Available report sources"
            text="The current backend already exposes these report APIs."
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Sales summary",
              "Expense summary",
              "Repair summary",
              "Dashboard summary",
              "Daily close",
              "Top sellers",
              "Insights",
              "Financial summary",
              "Income statement",
              "Cash flow",
              "Branch performance",
              "PDF reports",
            ].map((item) => (
              <div
                key={item}
                className={cn(PANEL(), "px-4 py-3 text-sm font-black text-[var(--color-text)]")}
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}