import { useEffect, useMemo, useState } from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import {
  getFinancialSummary,
  getInsights,
} from "../../services/reportsApi";
import {
  reportQueryKeys,
} from "../../lib/reportQueryKeys";
import {
  useActiveBranchId,
} from "../../hooks/useActiveBranchId";
import PageSkeleton from "../../components/ui/PageSkeleton";
import useTenantMoney from "../../hooks/useTenantMoney";
import useTenantDateTime from "../../hooks/useTenantDateTime";
import "../dashboard/Dashboard.css";
import "./Reports.css";

const RANGE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
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

function numberLabel(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(cleanNumber(value));
}

function percent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return `${n.toFixed(1)}%`;
}

function profitMargin(profit, sales) {
  const salesValue = cleanNumber(sales);
  if (salesValue <= 0) return null;

  return (cleanNumber(profit) / salesValue) * 100;
}

function profitAnswer(summary, money) {
  const sales = cleanNumber(summary.revenue);
  const productCost = cleanNumber(summary.costOfGoodsSold);
  const expenses = cleanNumber(summary.approvedExpenses);
  const profit = cleanNumber(summary.profitEstimate);

  if (sales <= 0) {
    return "No completed sales were recorded in this period.";
  }

  if (profit >= 0) {
    return `You sold ${money(sales)}, product cost was ${money(productCost)}, expenses were ${money(expenses)}, and estimated profit is ${money(profit)}.`;
  }

  return `You sold ${money(sales)}, but product cost and expenses were higher by ${money(Math.abs(profit))}.`;
}

function sellerName(item) {
  return item?.name || item?.productName || item?.title || "Product";
}

function sellerQty(item) {
  return cleanNumber(item?.soldQty ?? item?.qty ?? item?.unitsSold ?? item?.units);
}

function sellerRevenue(item) {
  return cleanNumber(item?.revenue ?? item?.totalRevenue ?? item?.amount);
}

function KpiCard({ label, value, helper, tone = "blue" }) {
  return (
    <article className={`svx-report-kpi-card svx-profit-report-kpi is-${tone}`}>
      <p className="svx-report-kpi-label">{label}</p>
      <strong className="svx-report-money-value">{value}</strong>
      <span>{helper}</span>
    </article>
  );
}

function ProfitStep({ label, value, helper, tone = "neutral" }) {
  return (
    <article className={`svx-profit-step is-${tone}`}>
      <div>
        <strong>{label}</strong>
        <span>{helper}</span>
      </div>
      <p>{value}</p>
    </article>
  );
}

function TopSellerRow({ item, index, money }) {
  const revenue = sellerRevenue(item);
  const quantity = sellerQty(item);

  return (
    <article className="svx-profit-seller-row">
      <div className="svx-profit-seller-rank">{index + 1}</div>

      <div className="svx-profit-seller-main">
        <strong>{sellerName(item)}</strong>
        <span>{numberLabel(quantity)} sold</span>
      </div>

      <p>{money(revenue)}</p>
    </article>
  );
}

function RangeControls({ selectedPreset, setSelectedPreset, range, setRange, formatDate }) {
  function choosePreset(key) {
    setSelectedPreset(key);
    setRange(rangeForPreset(key));
  }

  return (
    <section className="svx-report-date-card svx-dashboard-card">
      <div>
        <p className="svx-report-eyebrow">Report dates</p>
        <h2>Choose the profit period</h2>
      </div>

      <div className="svx-report-range-buttons">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={selectedPreset === preset.key ? "is-active" : ""}
            onClick={() => choosePreset(preset.key)}
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
            onChange={(event) => {
              setSelectedPreset("custom");
              setRange((current) => ({ ...current, from: event.target.value }));
            }}
          />
        </label>

        <label>
          <span>To</span>
          <input
            type="date"
            value={range.to}
            onChange={(event) => {
              setSelectedPreset("custom");
              setRange((current) => ({ ...current, to: event.target.value }));
            }}
          />
        </label>
      </div>

      <div className="svx-report-period">
        Report period: <strong>{formatDate(range.from)} to {formatDate(range.to)}</strong>
      </div>
    </section>
  );
}

export default function ProfitTable() {
  const { formatMoney } = useTenantMoney();
  const { formatDate } = useTenantDateTime();

  const money = (value) => formatMoney(cleanNumber(value));

  const [selectedPreset, setSelectedPreset] =
    useState("month");
  const [range, setRange] =
    useState(() => rangeForPreset("month"));

  const activeBranchId =
    useActiveBranchId();

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

  const financialQuery = useQuery({
    queryKey:
      reportQueryKeys.financialSummary({
        branchId: activeBranchId,
        from: range.from,
        to: range.to,
      }),
    queryFn: async () => {
      const [financialData, insightData] = await Promise.all([
        getFinancialSummary(requestRange),
        getInsights(requestRange, 8, 5),
      ]);

      return {
        financial: financialData || null,
        insights: insightData || null,
      };
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const payload =
    financialQuery.data?.financial || null;
  const insights =
    financialQuery.data?.insights || null;
  const loading =
    financialQuery.isPending;

  useEffect(() => {
    if (!financialQuery.error) return;

    toast.error(
      financialQuery.error?.response
        ?.data?.message ||
        financialQuery.error?.message ||
        "Failed to load profit and sales",
      {
        id: "profit-report-load-error",
      },
    );
  }, [financialQuery.error]);

  const summary = payload?.summary || {};
  const topSellers = Array.isArray(payload?.topSellers) ? payload.topSellers : [];

  const sales = cleanNumber(summary.revenue);
  const productCost = cleanNumber(summary.costOfGoodsSold);
  const grossProfit = cleanNumber(summary.grossProfit);
  const expenses = cleanNumber(summary.approvedExpenses);
  const profit = cleanNumber(summary.profitEstimate);
  const margin = profitMargin(profit, sales);

  const salesChangeRaw = Number(
    insights?.comparison?.percent?.revenue,
  );

  const salesChange =
    cleanNumber(summary.salesCount) > 0 && Number.isFinite(salesChangeRaw)
      ? salesChangeRaw
      : null;

  const facts = useMemo(
    () => [
      {
        label: "Completed sales",
        value: numberLabel(summary.salesCount),
        helper: "Sales included in this report",
      },
      {
        label: "Units sold",
        value: numberLabel(summary.unitsSold),
        helper: "Total items sold",
      },
    ],
    [summary.salesCount, summary.unitsSold],
  );

  if (loading && !payload) {
    return <PageSkeleton />;
  }

  return (
    <main className="svx-owner-dashboard svx-business-reports svx-profit-report-page">
      <section className="svx-profit-detail-header">
        <div>
          <p className="svx-report-eyebrow">Profit & sales</p>
          <h1>Profit & sales</h1>
          <p>See sales, product cost, expenses, profit or loss, margin, and best sellers.</p>
        </div>

        <div className="svx-profit-detail-meta">
          <span>Showing</span>
          <strong>{formatDate(range.from)} to {formatDate(range.to)}</strong>
          <p>{payload?.branchScope?.label || "Current branch"}</p>
          <Link to="/app/reports">Back to overview</Link>
        </div>
      </section>

      <section className="svx-profit-result-card">
        <div>
          <p className="svx-report-eyebrow">Business result</p>
          <h2>
            {cleanNumber(summary.salesCount) <= 0
              ? "No result yet"
              : profit < 0
                ? "Business made a loss"
                : "Business made a profit"}
          </h2>
          <strong>{profitAnswer(summary, money)}</strong>
        </div>

        <div className="svx-profit-result-side">
          <span>
            {cleanNumber(summary.salesCount) <= 0
              ? "No result yet"
              : profit < 0
                ? "Loss"
                : "Profit"}
          </span>
          <strong>{money(Math.abs(profit))}</strong>
          <p>
            {margin === null
              ? "No completed sales"
              : `${percent(Math.abs(margin))} ${profit < 0 ? "loss" : "profit margin"}`}
          </p>
          <p>
            {salesChange == null
              ? "No comparison yet"
              : `${salesChange >= 0 ? "+" : ""}${salesChange.toFixed(1)}% sales vs previous period`}
          </p>
        </div>
      </section>

      <RangeControls
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        range={range}
        setRange={setRange}
        formatDate={formatDate}
      />

      <section className="svx-report-kpi-grid">
        <KpiCard
          label="Sales"
          value={money(sales)}
          helper={`${numberLabel(summary.salesCount)} completed sales`}
          tone="blue"
        />
        <KpiCard
          label="Product cost"
          value={money(productCost)}
          helper="Estimated cost of sold products"
          tone="amber"
        />
        <KpiCard
          label="Gross profit"
          value={money(grossProfit)}
          helper="Sales minus product cost"
          tone={grossProfit < 0 ? "red" : "green"}
        />
        <KpiCard
          label="Expenses"
          value={money(expenses)}
          helper="Approved business expenses"
          tone="amber"
        />
      </section>

      {cleanNumber(summary.salesCount) > 0 ? (
        <>
      <section className="svx-dashboard-card svx-profit-flow-card">
        <div className="svx-report-section-head">
          <div>
            <p className="svx-report-eyebrow">Profit path</p>
            <h2>How the profit was calculated</h2>
          </div>
        </div>

        <div className="svx-profit-steps">
          <ProfitStep
            label="Sales made"
            value={money(sales)}
            helper="Total completed sales"
            tone="blue"
          />
          <ProfitStep
            label="Minus product cost"
            value={money(productCost)}
            helper="Estimated product cost"
            tone="amber"
          />
          <ProfitStep
            label="Gross profit"
            value={money(grossProfit)}
            helper="Sales minus product cost"
            tone={grossProfit >= 0 ? "green" : "red"}
          />
          <ProfitStep
            label="Minus expenses"
            value={money(expenses)}
            helper="Approved business expenses"
            tone="amber"
          />
          <ProfitStep
            label={profit < 0 ? "Loss" : "Profit"}
            value={money(profit)}
            helper="Gross profit minus expenses"
            tone={profit >= 0 ? "green" : "red"}
          />
        </div>
      </section>

      <section className="svx-profit-grid">
        <article className="svx-dashboard-card svx-profit-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Business activity</p>
              <h2>What was counted</h2>
            </div>
          </div>

          <div className="svx-profit-fact-grid">
            {facts.map((fact) => (
              <article key={fact.label} className="svx-profit-fact">
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
                <p>{fact.helper}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="svx-dashboard-card svx-profit-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Best sellers</p>
              <h2>Best sellers</h2>
            </div>
          </div>

          <div className="svx-profit-seller-list">
            {topSellers.length > 0 ? (
              topSellers.slice(0, 5).map((item, index) => (
                <TopSellerRow
                  key={item.productId || item.id || `${sellerName(item)}-${index}`}
                  item={item}
                  index={index}
                  money={money}
                />
              ))
            ) : (
              <p className="svx-report-empty-text">
                No sold products found in this period.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="svx-dashboard-card svx-profit-note">
        <p className="svx-report-eyebrow">Important</p>
        <h2>Profit is an estimate</h2>
        <p>
          Profit uses completed sales, product cost, and approved expenses.
        </p>
      </section>
        </>
      ) : (
        <section className="svx-profit-empty-detail">
          <strong>No completed sales in this period.</strong>
          <p>Profit details will appear after sales are completed.</p>
        </section>
      )}
    </main>
  );
}
