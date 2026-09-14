import { useEffect, useMemo, useState } from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import {
  downloadBlob,
  downloadDailyClosePdf,
  downloadPeriodPdf,
  getCashFlowReport,
  getFinancialSummary,
  getInsights,
  getReportsDashboard,
} from "../../services/reportsApi";
import { getMoneySummary } from "../../services/moneyApi";
import {
  getActiveBranchId,
} from "../../services/apiClient";
import {
  reportQueryKeys,
} from "../../lib/reportQueryKeys";
import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { cn } from "../../lib/cn";
import useTenantMoney from "../../hooks/useTenantMoney";
import useTenantDateTime from "../../hooks/useTenantDateTime";
import "../dashboard/Dashboard.css";
import "./Reports.css";

const CARD =
  "rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
const PANEL =
  "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";

const OWNER_REPORTS = [
  {
    title: "Money",
    text: "Money in, money out and balances.",
    to: "/app/reports/cash-flow",
    tag: "Money",
  },
  {
    title: "Profit & sales",
    text: "Sales, costs and estimated profit.",
    to: "/app/reports/profit-table",
    tag: "Profit",
  },
  {
    title: "Products",
    text: "Best sellers and stock to review.",
    to: "/app/reports/products",
    tag: "Stock",
  },
  {
    title: "Attention",
    text: "Debts, overdue money and stock issues.",
    to: "/app/reports/owner-checks",
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

      {helper ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
          {helper}
        </p>
      ) : null}
    </article>
  );
}

function MoneyTile({ label, value, helper }) {
  return (
    <div className="svx-report-money-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <p>{helper}</p> : null}
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
      {helper ? <p>{helper}</p> : null}
    </article>
  );
}

function ReportLink({ report }) {
  return (
    <Link to={report.to} className="svx-report-link-card">
      <div className="svx-report-link-top">
        <h3>{report.title}</h3>
        <small>→</small>
      </div>

      <p>{report.text}</p>
    </Link>
  );
}

function DownloadCard({
  selectedPreset,
  setSelectedPreset,
  range,
  setRange,
  downloading,
  dailyCloseDownloading,
  onDownload,
  onDownloadDailyClose,
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
          <p className="svx-report-eyebrow">Report period</p>
          <h2>Choose a period</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AsyncButton
            loading={dailyCloseDownloading}
            disabled={dailyCloseDownloading || downloading}
            onClick={onDownloadDailyClose}
            className="svx-report-primary-button"
          >
            Download today's report
          </AsyncButton>

          <AsyncButton
            loading={downloading}
            disabled={
              downloading ||
              dailyCloseDownloading ||
              !range.from ||
              !range.to
            }
            onClick={onDownload}
            className="svx-report-primary-button"
          >
            Download business report
          </AsyncButton>
        </div>
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
  const { formatMoney } = useTenantMoney();
  const { formatDate: formatTenantDate } = useTenantDateTime();

  const money = (value) => formatMoney(cleanNumber(value));

  const [selectedPreset, setSelectedPreset] =
    useState("month");
  const [range, setRange] =
    useState(() => rangeForPreset("month"));
  const [downloading, setDownloading] =
    useState(false);
  const [dailyCloseDownloading, setDailyCloseDownloading] =
    useState(false);
  const [activeBranchId, setActiveBranchId] =
    useState(
      () => getActiveBranchId() || "default",
    );

  const explicitBranchId =
    activeBranchId === "default"
      ? undefined
      : activeBranchId;

  const requestRange = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      branchId: explicitBranchId,
    }),
    [
      range.from,
      range.to,
      explicitBranchId,
    ],
  );

  const reportsQuery = useQuery({
    queryKey:
      reportQueryKeys.overview({
        branchId: activeBranchId,
        from: range.from,
        to: range.to,
        allBranches: false,
      }),
    queryFn: async () => {
      const [
        dashboard,
        insightData,
        moneyData,
        financialData,
        cashFlowData,
      ] = await Promise.all([
        getReportsDashboard(
          requestRange,
        ),
        getInsights(
          requestRange,
          8,
          5,
        ),
        getMoneySummary(
          {
            branchId:
              explicitBranchId,
          },
          {
            branchId:
              explicitBranchId,
          },
        ).catch(() => null),
        getFinancialSummary(requestRange),
        getCashFlowReport(requestRange),
      ]);

      return {
        summary: dashboard || null,
        insights: insightData || null,
        moneySummary:
          moneyData || null,
        financialSummary:
          financialData || null,
        cashFlowReport:
          cashFlowData || null,
      };
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const summary =
    reportsQuery.data?.summary || null;
  const insights =
    reportsQuery.data?.insights || null;
  const moneySummary =
    reportsQuery.data?.moneySummary ||
    null;
  const financialSummary =
    reportsQuery.data?.financialSummary ||
    null;
  const cashFlowReport =
    reportsQuery.data?.cashFlowReport ||
    null;
  const loading =
    reportsQuery.isPending;

  const rangeLabel = useMemo(
    () =>
      `${formatTenantDate(range.from)} to ${formatTenantDate(range.to)}`,
    [
      range.from,
      range.to,
      formatTenantDate,
    ],
  );

  useEffect(() => {
    function handleBranchChanged() {
      setActiveBranchId(
        getActiveBranchId() ||
          "default",
      );
    }

    window.addEventListener(
      "storvex:branch-changed",
      handleBranchChanged,
    );
    window.addEventListener(
      "storvex:workspace-refreshed",
      handleBranchChanged,
    );

    return () => {
      window.removeEventListener(
        "storvex:branch-changed",
        handleBranchChanged,
      );
      window.removeEventListener(
        "storvex:workspace-refreshed",
        handleBranchChanged,
      );
    };
  }, []);

  useEffect(() => {
    if (!reportsQuery.error) return;

    toast.error(
      reportsQuery.error?.response
        ?.data?.message ||
        reportsQuery.error?.message ||
        "Failed to load reports",
      {
        id: "reports-load-error",
      },
    );
  }, [reportsQuery.error]);

  const numbers = useMemo(() => {
    const financial = financialSummary?.summary || {};
    const cashFlow = cashFlowReport?.cashFlow || {};

    const sales = cleanNumber(
      financial.revenue ??
        getValue(summary, ["sales.total", "revenue"], 0),
    );

    const productCost = cleanNumber(
      financial.costOfGoodsSold,
    );

    const grossProfit = cleanNumber(
      financial.grossProfit,
    );

    const expenses = cleanNumber(
      financial.approvedExpenses ??
        getValue(summary, ["expenses.approvedTotal"], 0),
    );

    const profit = cleanNumber(
      financial.profitEstimate,
    );

    const moneyReceived = cleanNumber(
      cashFlow.moneyIn ?? sales,
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

    const overdue = getValue(
      summary,
      ["ownerChecks.overdueCustomerMoney.total"],
      0,
    );

    const suppliersOwe = getValue(
      summary,
      ["ownerChecks.iOweSuppliers.total"],
      getValue(
        moneySummary,
        [
          "summary.iOweSuppliers",
          "iOweSuppliers.total",
          "suppliers.total",
        ],
        0,
      ),
    );

    const stockToReview = getValue(
      summary,
      ["ownerChecks.stockToReview.count"],
      0,
    );

    const salesCount = cleanNumber(
      financial.salesCount ??
        getValue(summary, ["sales.count"], 0),
    );

    const profitMargin =
      sales > 0 ? (profit / sales) * 100 : null;

    return {
      sales,
      productCost,
      grossProfit,
      expenses,
      profit,
      profitMargin,
      moneyReceived,
      customersOwe,
      overdue,
      suppliersOwe,
      stockToReview,
      salesCount,
    };
  }, [
    summary,
    moneySummary,
    financialSummary,
    cashFlowReport,
  ]);

  const paymentMethods = useMemo(() => {
    const rows = Array.isArray(
      cashFlowReport?.cashFlow?.paymentMethodSplit,
    )
      ? cashFlowReport.cashFlow.paymentMethodSplit
      : [];

    return rows
      .map((item) => ({
        ...item,
        amount: cleanNumber(item.amount),
        count: cleanNumber(item.count),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [cashFlowReport]);

  const topPaymentMethod =
    paymentMethods.find((item) => item.amount > 0) || null;

  const topPaymentShare =
    topPaymentMethod && numbers.moneyReceived > 0
      ? (topPaymentMethod.amount / numbers.moneyReceived) * 100
      : 0;

  const currentMoney = useMemo(() => {
    const cash = cashBalance(moneySummary);
    const momo = accountBalance(moneySummary, "MOMO");
    const bank = accountBalance(moneySummary, "BANK");
    const other = accountBalance(moneySummary, "OTHER");
    const total = cash + momo + bank + other;

    return { cash, momo, bank, other, total };
  }, [moneySummary]);

  const usedPaymentMethods = paymentMethods.filter(
    (item) => item.amount > 0 || item.count > 0,
  );

  const salesChangeRaw = Number(
    insights?.comparison?.percent?.revenue,
  );

  const salesChange = Number.isFinite(salesChangeRaw)
    ? salesChangeRaw
    : null;

  const topSeller = Array.isArray(financialSummary?.topSellers)
    ? financialSummary.topSellers[0] || null
    : null;

  const restockItems = Array.isArray(
    insights?.reorderSuggestions?.items,
  )
    ? insights.reorderSuggestions.items
    : [];

  const nextActions = [];

  if (cleanNumber(numbers.overdue) > 0) {
    nextActions.push({
      title: "Collect overdue customer money",
      text: `${money(numbers.overdue)} is already overdue.`,
    });
  }

  if (cleanNumber(numbers.stockToReview) > 0) {
    nextActions.push({
      title: "Review stock",
      text: `${numberLabel(numbers.stockToReview)} product${
        numbers.stockToReview === 1 ? "" : "s"
      } need attention.`,
    });
  }

  if (cleanNumber(numbers.suppliersOwe) > 0) {
    nextActions.push({
      title: "Review supplier payments",
      text: `${money(numbers.suppliersOwe)} is still owed to suppliers.`,
    });
  }

  if (
    cleanNumber(numbers.customersOwe) > 0 &&
    cleanNumber(numbers.overdue) <= 0
  ) {
    nextActions.push({
      title: "Follow up customer balances",
      text: `Customers still owe ${money(numbers.customersOwe)}.`,
    });
  }


  async function handleDownload() {
    if (!range.from || !range.to) {
      toast.error("Choose report dates first");
      return;
    }

    setDownloading(true);

    try {
      const blob = await downloadPeriodPdf(
        requestRange,
        12,
        5,
      );

      const filename =
        `storvex-business-overview-${fileSafe(range.from)}-to-${fileSafe(range.to)}.pdf`;

      downloadBlob(blob, filename);
      toast.success("Business overview downloaded");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to download business overview",
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadDailyClose() {
    setDailyCloseDownloading(true);

    try {
      const blob = await downloadDailyClosePdf(
        undefined,
        {
          branchId: explicitBranchId,
        },
      );

      downloadBlob(
        blob,
        "storvex-daily-close.pdf",
      );

      toast.success("Today's report downloaded");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to download today's report",
      );
    } finally {
      setDailyCloseDownloading(false);
    }
  }

  if (loading && !summary) {
    return <PageSkeleton />;
  }

  return (
    <main className="svx-owner-dashboard svx-business-reports svx-report-overview">
      <section className="svx-report-hero svx-dashboard-card">
        <div>
          <p className="svx-report-eyebrow">Reports</p>
          <h1>Business overview</h1>
          <span>
            Profit, sales, money, customer debt, and what needs your attention.
          </span>
        </div>

        <aside>
          <p>Period</p>
          <strong>{rangeLabel}</strong>
          <span>{summary?.branchScope?.label || "Current branch"}</span>
        </aside>
      </section>

      <DownloadCard
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        range={range}
        setRange={setRange}
        downloading={downloading}
        dailyCloseDownloading={dailyCloseDownloading}
        onDownload={handleDownload}
        onDownloadDailyClose={handleDownloadDailyClose}
      />

      <section className="svx-report-business-result svx-dashboard-card">
        <div className="svx-report-result-main">
          <div>
            <p className="svx-report-eyebrow">Business result</p>
            <h2>How is the business doing?</h2>
          </div>

          <div
            className={`svx-report-result-number ${
              numbers.salesCount <= 0
                ? "is-neutral"
                : numbers.profit < 0
                  ? "is-loss"
                  : "is-profit"
            }`}
          >
            <span>
              {numbers.salesCount <= 0
                ? "No result yet"
                : numbers.profit < 0
                  ? "Loss"
                  : "Profit"}
            </span>
            <strong>{money(Math.abs(numbers.profit))}</strong>
            <p>
              {numbers.salesCount <= 0 || numbers.profitMargin == null
                ? "No completed sales in this period"
                : `${Math.abs(numbers.profitMargin).toFixed(1)}% ${
                    numbers.profit < 0 ? "loss" : "profit margin"
                  }`}
            </p>
          </div>
        </div>

        <div className="svx-report-result-grid">
          <MoneyTile
            label="Sales"
            value={money(numbers.sales)}
            helper={`${numberLabel(numbers.salesCount)} completed sale${
              numbers.salesCount === 1 ? "" : "s"
            }`}
          />
          <MoneyTile
            label="Product cost"
            value={money(numbers.productCost)}
            helper="Cost of products sold"
          />
          <MoneyTile
            label="Gross profit"
            value={money(numbers.grossProfit)}
            helper="Sales minus product cost"
          />
          <MoneyTile
            label="Expenses"
            value={money(numbers.expenses)}
            helper="Approved business expenses"
          />
        </div>
      </section>

      <section className="svx-report-executive-grid">
        <article className="svx-report-executive-panel">
          <div className="svx-report-compact-head">
            <div>
              <p className="svx-report-eyebrow">Money received</p>
              <h2>How customers paid</h2>
            </div>
            <strong>{money(numbers.moneyReceived)}</strong>
          </div>

          {topPaymentMethod ? (
            <div className="svx-report-payment-leader">
              <span>Most used</span>
              <strong>{topPaymentMethod.label}</strong>
              <p>
                {money(topPaymentMethod.amount)} /{" "}
                {topPaymentShare.toFixed(0)}% of money received
              </p>
            </div>
          ) : (
            <p className="svx-report-compact-empty">
              No customer payments in this period.
            </p>
          )}

          {usedPaymentMethods.length > 0 ? (
            <div className="svx-report-compact-list">
              {usedPaymentMethods.map((item) => (
                <div key={item.method || item.label}>
                  <span>{item.label || item.method}</span>
                  <strong>{money(item.amount)}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <article className="svx-report-executive-panel">
          <div className="svx-report-compact-head">
            <div>
              <p className="svx-report-eyebrow">Money now</p>
              <h2>Money available</h2>
            </div>
            <strong>{money(currentMoney.total)}</strong>
          </div>

          <div className="svx-report-compact-list is-money">
            <div><span>Cash</span><strong>{money(currentMoney.cash)}</strong></div>
            <div><span>Mobile money</span><strong>{money(currentMoney.momo)}</strong></div>
            <div><span>Bank</span><strong>{money(currentMoney.bank)}</strong></div>
            <div><span>Other</span><strong>{money(currentMoney.other)}</strong></div>
          </div>
        </article>
      </section>

      <section className="svx-report-executive-grid">
        <article className="svx-report-executive-panel">
          <div className="svx-report-compact-head">
            <div>
              <p className="svx-report-eyebrow">Needs attention</p>
              <h2>What needs your attention</h2>
            </div>
          </div>

          <div className="svx-report-compact-list">
            <div>
              <span>Overdue customer money</span>
              <strong>{money(numbers.overdue)}</strong>
            </div>
            <div>
              <span>Customers owe us</span>
              <strong>{money(numbers.customersOwe)}</strong>
            </div>
            <div>
              <span>We owe suppliers</span>
              <strong>{money(numbers.suppliersOwe)}</strong>
            </div>
            <div>
              <span>Products to review</span>
              <strong>{numberLabel(numbers.stockToReview)}</strong>
            </div>
          </div>
        </article>

        <article className="svx-report-executive-panel">
          <div className="svx-report-compact-head">
            <div>
              <p className="svx-report-eyebrow">Performance</p>
              <h2>What is selling</h2>
            </div>
          </div>

          {topSeller ? (
            <div className="svx-report-best-seller">
              <span>Best seller</span>
              <strong>{topSeller.name || "Product"}</strong>
              <p>
                {numberLabel(topSeller.soldQty)} sold /{" "}
                {money(topSeller.revenue)}
              </p>
            </div>
          ) : (
            <p className="svx-report-compact-empty">
              No products sold in this period.
            </p>
          )}

          <div className="svx-report-performance-foot">
            <div>
              <span>Sales change</span>
              <strong>
                {numbers.salesCount <= 0 || salesChange == null
                  ? "No comparison yet"
                  : `${salesChange >= 0 ? "+" : ""}${salesChange.toFixed(1)}%`}
              </strong>
            </div>
            <div>
              <span>Need restock</span>
              <strong>{numberLabel(restockItems.length)}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="svx-report-next-actions">
        <div className="svx-report-compact-head">
          <div>
            <p className="svx-report-eyebrow">Next actions</p>
            <h2>What to do next</h2>
          </div>
        </div>

        {nextActions.length > 0 ? (
          <div className="svx-report-action-list">
            {nextActions.slice(0, 3).map((action, index) => (
              <div key={action.title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{action.title}</strong>
                  <p>{action.text}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="svx-report-compact-empty">
            Nothing urgent needs your attention right now.
          </p>
        )}
      </section>

      <section className="svx-report-links svx-dashboard-card">
        <div className="svx-report-section-head">
          <div>
            <p className="svx-report-eyebrow">Go deeper</p>
            <h2>More detail</h2>
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
