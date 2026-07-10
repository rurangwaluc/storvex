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
import { getMoneySummary } from "../../services/moneyApi";
import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { cn } from "../../lib/cn";
import "../dashboard/Dashboard.css";
import "./Reports.css";

const CARD =
  "rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
const PANEL =
  "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";

const OWNER_REPORTS = [
  {
    title: "Money report",
    text: "Cash, MoMo, bank, other money, money in, and money out.",
    to: "/app/reports/cash-flow",
    tag: "Money",
  },
  {
    title: "Sales and profit",
    text: "Sales made, expenses paid, and estimated profit.",
    to: "/app/reports/profit-table",
    tag: "Profit",
  },
  {
    title: "Products report",
    text: "Best sellers, low stock, slow stock, and stock movement.",
    to: "/app/reports",
    tag: "Stock",
  },
  {
    title: "Owner checks",
    text: "Check business records, sales, expenses, and control gaps.",
    to: "/app/reports/trial-balance",
    tag: "Control",
  },
];

const RANGE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Choose dates" },
];

function cleanNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function isoDate(date) {
  const d = new Date(date);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function todayISO() {
  return isoDate(new Date());
}

function startOfWeekISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);

  return isoDate(d);
}

function startOfMonthISO() {
  const d = new Date();
  d.setDate(1);

  return isoDate(d);
}

function startOfYearISO() {
  const d = new Date();
  d.setMonth(0, 1);

  return isoDate(d);
}

function rangeForPreset(key) {
  const today = todayISO();

  if (key === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = isoDate(d);

    return { from: yesterday, to: yesterday };
  }

  if (key === "week") return { from: startOfWeekISO(), to: today };
  if (key === "month") return { from: startOfMonthISO(), to: today };
  if (key === "year") return { from: startOfYearISO(), to: today };

  return { from: today, to: today };
}

function getValue(source, paths, fallback = 0) {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce((current, key) => current?.[key], source);

    if (value !== undefined && value !== null) return value;
  }

  return fallback;
}

function money(value) {
  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(cleanNumber(value)))}`;
}

function numberLabel(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(cleanNumber(value));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fileSafe(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function accountBalance(moneySummary, accountType) {
  const accounts = Array.isArray(moneySummary?.moneyAccounts)
    ? moneySummary.moneyAccounts
    : [];

  const found = accounts.find(
    (account) =>
      String(account.accountType || "").toUpperCase() ===
      String(accountType || "").toUpperCase(),
  );

  return cleanNumber(found?.balance);
}

function cashBalance(moneySummary) {
  return cleanNumber(
    getValue(moneySummary, [
      "cashDrawer.expectedCash",
      "cashDrawer.cashExpected",
      "cashDrawer.expected",
      "summary.cashIHave",
      "summary.cash",
    ]),
  );
}

function ownerSentence(numbers) {
  const sales = cleanNumber(numbers.sales);
  const moneyReceived = cleanNumber(numbers.moneyReceived);
  const expenses = cleanNumber(numbers.expenses);
  const profit = cleanNumber(numbers.profit);

  if (sales === 0 && moneyReceived === 0 && expenses === 0) {
    return "No sales, payments, or approved expenses were recorded in this period.";
  }

  if (profit >= 0) {
    return `You sold ${money(sales)}, received ${money(moneyReceived)}, spent ${money(expenses)}, and your estimated profit is ${money(profit)}.`;
  }

  return `You sold ${money(sales)}, received ${money(moneyReceived)}, but expenses are higher than sales by ${money(Math.abs(profit))}.`;
}

function KpiCard({ label, value, helper, tone = "blue" }) {
  const tones = {
    blue: "before:bg-[var(--dashboard-primary)]",
    green: "before:bg-[var(--dashboard-success)]",
    amber: "before:bg-[var(--dashboard-warning)]",
    red: "before:bg-[var(--dashboard-danger)]",
  };

  return (
    <article
      className={cn(
        CARD,
        "svx-report-kpi-card relative overflow-hidden p-5 before:absolute before:left-0 before:top-0 before:h-full before:w-1.5",
        tones[tone],
      )}
    >
      <p className="svx-report-kpi-label">{label}</p>

      <strong className="svx-report-money-value mt-4 block font-black leading-none text-[var(--color-text)]">
        {value}
      </strong>

      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
        {helper}
      </p>
    </article>
  );
}

function MoneyTile({ label, value, helper }) {
  return (
    <div className="svx-report-money-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </div>
  );
}

function AttentionTile({ label, value, helper, tone = "blue" }) {
  return (
    <article className={`svx-report-attention-tile is-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <p>{helper}</p>
    </article>
  );
}

function ReportLink({ report }) {
  return (
    <Link to={report.to} className="svx-report-link-card">
      <div className="svx-report-link-top">
        <span>{report.tag}</span>
        <small>→</small>
      </div>

      <div>
        <h3>{report.title}</h3>
        <p>{report.text}</p>
      </div>

      <strong>Open report</strong>
    </Link>
  );
}

function DownloadCard({
  selectedPreset,
  setSelectedPreset,
  range,
  setRange,
  downloading,
  onDownload,
}) {
  const custom = selectedPreset === "custom";

  function choosePreset(key) {
    setSelectedPreset(key);

    if (key !== "custom") {
      setRange(rangeForPreset(key));
    }
  }

  return (
    <section className={cn(CARD, "svx-report-download-card p-5 sm:p-6")}>
      <div className="svx-report-download-head">
        <div>
          <p className="svx-report-eyebrow">Download report</p>
          <h2>Choose any date and download a business report</h2>
          <span>
            Use this when the owner needs a daily, weekly, monthly, yearly, or custom report.
          </span>
        </div>

        <AsyncButton
          loading={downloading}
          disabled={downloading || !range.from || !range.to}
          onClick={onDownload}
          className="svx-report-primary-button"
        >
          Download PDF
        </AsyncButton>
      </div>

      <div className="svx-report-range-controls">
        <div className="svx-report-range-buttons">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => choosePreset(preset.key)}
              className={selectedPreset === preset.key ? "is-active" : ""}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="svx-report-date-grid">
          <label>
            <span>From</span>
            <input
              type="date"
              value={range.from}
              disabled={!custom}
              onChange={(event) =>
                setRange((current) => ({ ...current, from: event.target.value }))
              }
            />
          </label>

          <label>
            <span>To</span>
            <input
              type="date"
              value={range.to}
              disabled={!custom}
              onChange={(event) =>
                setRange((current) => ({ ...current, to: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="svx-report-period">
          Report period: <strong>{formatDate(range.from)} to {formatDate(range.to)}</strong>
        </div>
      </div>
    </section>
  );
}

export default function Reports() {
  const [selectedPreset, setSelectedPreset] = useState("month");
  const [range, setRange] = useState(() => rangeForPreset("month"));
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [moneySummary, setMoneySummary] = useState(null);

  const rangeLabel = useMemo(
    () => `${formatDate(range.from)} to ${formatDate(range.to)}`,
    [range.from, range.to],
  );

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      try {
        const [dashboard, insightData, moneyData] = await Promise.all([
          getReportsDashboard(range),
          getInsights(range, 8, 5),
          getMoneySummary().catch(() => null),
        ]);

        if (!alive) return;

        setSummary(dashboard);
        setInsights(insightData);
        setMoneySummary(moneyData);
      } catch (error) {
        if (!alive) return;
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load reports",
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [range.from, range.to, range.branchId, range.allBranches]);

  const numbers = useMemo(() => {
    const sales = getValue(summary, [
      "sales.total",
      "sales.salesTotal",
      "sales.cash.total",
      "revenue",
      "summary.revenue",
      "period.revenue",
    ]);

    const moneyReceived = getValue(
      summary,
      [
        "payments.total",
        "payments.paymentsTotal",
        "sales.paymentsTotal",
        "cashFlow.summary.moneyIn",
        "moneyIn",
      ],
      sales,
    );

    const expenses = getValue(summary, [
      "expenses.approvedTotal",
      "expenses.approvedExpenseTotal",
      "approvedExpenses",
      "summary.expenses",
      "period.expensesApproved",
    ]);

    const profit = getValue(
      summary,
      [
        "profitEstimate",
        "profitEstimateToday",
        "summary.profitEstimate",
        "period.profitEstimate",
      ],
      cleanNumber(sales) - cleanNumber(expenses),
    );

    const customersOwe = getValue(
      summary,
      ["ownerChecks.customersOweMe.total"],
      getValue(
        moneySummary,
        [
          "summary.customersOweMe",
          "customersOweMe.total",
          "customersOwe.total",
        ],
        0,
      ),
    );

    const overdue = getValue(summary, ["ownerChecks.overdueCustomerMoney.total"], 0);

    const salesCount = getValue(summary, [
      "sales.count",
      "sales.salesCount",
      "sales.cash.count",
      "sales.credit.count",
      "salesCount",
    ]);

    const expenseCount = getValue(summary, [
      "expenses.approvedCount",
      "expenses.approvedExpenseCount",
    ]);

    const suppliersOwe = getValue(
      summary,
      ["ownerChecks.iOweSuppliers.total"],
      getValue(moneySummary, ["summary.iOweSuppliers", "iOweSuppliers.total", "suppliers.total"], 0),
    );

    const stockToReview = getValue(summary, ["ownerChecks.stockToReview.count"], 0);

    return {
      sales,
      moneyReceived,
      expenses,
      profit,
      customersOwe,
      overdue,
      salesCount,
      expenseCount,
      suppliersOwe,
      stockToReview,
    };
  }, [summary, moneySummary]);

  const currentMoney = useMemo(() => {
    const cash = cashBalance(moneySummary);
    const momo = accountBalance(moneySummary, "MOMO");
    const bank = accountBalance(moneySummary, "BANK");
    const other = accountBalance(moneySummary, "OTHER");
    const total = cash + momo + bank + other;

    return { cash, momo, bank, other, total };
  }, [moneySummary]);

  const attentionCount = useMemo(() => {
    let count = 0;
    if (cleanNumber(numbers.customersOwe) > 0) count += 1;
    if (cleanNumber(numbers.suppliersOwe) > 0) count += 1;
    if (cleanNumber(numbers.overdue) > 0) count += 1;
    if (cleanNumber(numbers.stockToReview) > 0) count += 1;
    return count;
  }, [numbers.customersOwe, numbers.suppliersOwe, numbers.overdue, numbers.stockToReview]);

  async function handleDownload() {
    if (!range.from || !range.to) {
      toast.error("Choose report dates first");
      return;
    }

    setDownloading(true);

    try {
      const sameDay = range.from === range.to;
      const blob = sameDay
        ? await downloadDailyClosePdf(range.from, {
            branchId: range.branchId,
            allBranches: range.allBranches,
          })
        : await downloadPeriodPdf(range, 12, 5);

      const filename = sameDay
        ? `storvex-business-report-${fileSafe(range.from)}.pdf`
        : `storvex-business-report-${fileSafe(range.from)}-to-${fileSafe(range.to)}.pdf`;

      downloadBlob(blob, filename);
      toast.success("Report downloaded");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to download report",
      );
    } finally {
      setDownloading(false);
    }
  }

  if (loading && !summary) {
    return <PageSkeleton />;
  }

  return (
    <main className="svx-owner-dashboard svx-business-reports">
      <section className="svx-report-hero svx-dashboard-card">
        <div>
          <p className="svx-report-eyebrow">Business reports</p>
          <h1>Know exactly what happened in the business</h1>
          <span>
            Simple owner reports for sales, money received, expenses, profit, customers who owe you, and stock movement.
          </span>
        </div>

        <aside>
          <p>Showing</p>
          <strong>{rangeLabel}</strong>
          <span>{summary?.branchScope?.label || "Current branch"}</span>
        </aside>
      </section>

      <section className="svx-report-owner-answer svx-dashboard-card">
        <div>
          <p className="svx-report-eyebrow">Owner answer</p>
          <h2>What happened in this period</h2>
          <strong>{ownerSentence(numbers)}</strong>
        </div>

        <div className="svx-report-owner-status">
          <span>{attentionCount > 0 ? `${attentionCount} need attention` : "No urgent issue"}</span>
        </div>
      </section>

      <DownloadCard
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        range={range}
        setRange={setRange}
        downloading={downloading}
        onDownload={handleDownload}
      />

      <section className="svx-report-kpi-grid">
        <KpiCard
          label="Sales made"
          value={money(numbers.sales)}
          helper={`${numberLabel(numbers.salesCount)} sale${cleanNumber(numbers.salesCount) === 1 ? "" : "s"} in this period`}
          tone="blue"
        />
        <KpiCard
          label="Money received"
          value={money(numbers.moneyReceived)}
          helper="Money paid into cash, MoMo, bank, or other methods"
          tone="green"
        />
        <KpiCard
          label="Expenses"
          value={money(numbers.expenses)}
          helper={`${numberLabel(numbers.expenseCount)} approved expense${cleanNumber(numbers.expenseCount) === 1 ? "" : "s"}`}
          tone="amber"
        />
        <KpiCard
          label="Profit estimate"
          value={money(numbers.profit)}
          helper={cleanNumber(numbers.profit) >= 0 ? "Sales minus approved expenses" : "Expenses are higher than sales"}
          tone={cleanNumber(numbers.profit) >= 0 ? "green" : "red"}
        />
      </section>

      <section className="svx-report-money-position svx-dashboard-card">
        <div className="svx-report-section-head">
          <div>
            <p className="svx-report-eyebrow">Money position</p>
            <h2>Where the business money is now</h2>
          </div>
          <strong>{money(currentMoney.total)}</strong>
        </div>

        <div className="svx-report-money-grid">
          <MoneyTile label="Cash" value={money(currentMoney.cash)} helper="Physical cash in drawer" />
          <MoneyTile label="MoMo" value={money(currentMoney.momo)} helper="Money on MoMo" />
          <MoneyTile label="Bank" value={money(currentMoney.bank)} helper="Money in the bank" />
          <MoneyTile label="Other" value={money(currentMoney.other)} helper="Card, cheque, or other payments" />
        </div>
      </section>

      <section className="svx-report-attention svx-dashboard-card">
        <div className="svx-report-section-head">
          <div>
            <p className="svx-report-eyebrow">Needs attention</p>
            <h2>What the owner should check</h2>
          </div>
        </div>

        <div className="svx-report-attention-grid">
          <AttentionTile
            label="Customers owe me"
            value={money(numbers.customersOwe)}
            helper="Customer credit still unpaid."
            tone={cleanNumber(numbers.customersOwe) > 0 ? "warning" : "good"}
          />
          <AttentionTile
            label="I owe suppliers"
            value={money(numbers.suppliersOwe)}
            helper="Supplier bills still unpaid."
            tone={cleanNumber(numbers.suppliersOwe) > 0 ? "danger" : "good"}
          />
          <AttentionTile
            label="Overdue customer money"
            value={money(numbers.overdue)}
            helper="Money that should already have been collected."
            tone={cleanNumber(numbers.overdue) > 0 ? "danger" : "good"}
          />
          <AttentionTile
            label="Stock to review"
            value={numberLabel(numbers.stockToReview)}
            helper="Products that may need restocking."
            tone={cleanNumber(numbers.stockToReview) > 0 ? "warning" : "good"}
          />
        </div>
      </section>

      <section className="svx-report-links svx-dashboard-card">
        <div className="svx-report-section-head">
          <div>
            <p className="svx-report-eyebrow">Open report</p>
            <h2>Choose what you want to understand</h2>
          </div>
        </div>

        <div className="svx-report-link-grid">
          {OWNER_REPORTS.map((report) => (
            <ReportLink key={report.to} report={report} />
          ))}
        </div>
      </section>

    </main>
  );
}
