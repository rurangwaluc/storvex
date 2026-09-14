import { useEffect, useMemo, useState } from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { getProductsReport } from "../../services/reportsApi";
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

function productName(item) {
  return item?.name || item?.productName || "Product";
}

function soldQty(item) {
  return cleanNumber(item?.soldQty ?? item?.qty ?? item?.unitsSold ?? item?.units);
}

function revenue(item) {
  return cleanNumber(item?.revenue ?? item?.totalRevenue ?? item?.amount);
}

function stockQty(item) {
  return cleanNumber(item?.stockQty ?? item?.qtyOnHand ?? item?.stock);
}

function ownerAnswer({ bestSellers, needRestock, slowProducts }) {
  if (!bestSellers.length && !needRestock.length && !slowProducts.length) {
    return "No product movement needs attention in this period.";
  }

  const best = bestSellers[0];

  if (best && needRestock.length > 0) {
    return `${productName(best)} is bringing the most money. ${numberLabel(needRestock.length)} product${needRestock.length === 1 ? "" : "s"} need restock review.`;
  }

  if (best) {
    return `${productName(best)} is bringing the most money in this period.`;
  }

  if (needRestock.length > 0) {
    return `${numberLabel(needRestock.length)} product${needRestock.length === 1 ? "" : "s"} need restock review.`;
  }

  return `${numberLabel(slowProducts.length)} product${slowProducts.length === 1 ? " has" : "s have"} slow movement.`;
}

function nextMoves({ bestSellers, needRestock, slowProducts, money }) {
  const moves = [];

  if (needRestock[0]) {
    moves.push({
      title: `Review stock for ${productName(needRestock[0])}`,
      text: `${numberLabel(stockQty(needRestock[0]))} left in stock and ${numberLabel(soldQty(needRestock[0]))} sold in this period.`,
    });
  }

  if (bestSellers[0]) {
    moves.push({
      title: `Keep selling ${productName(bestSellers[0])}`,
      text: `${money(revenue(bestSellers[0]))} brought in from ${numberLabel(soldQty(bestSellers[0]))} sold.`,
    });
  }

  if (slowProducts[0]) {
    moves.push({
      title: `Check slow product: ${productName(slowProducts[0])}`,
      text: `${numberLabel(stockQty(slowProducts[0]))} in stock with ${numberLabel(soldQty(slowProducts[0]))} sold in this period.`,
    });
  }

  return moves.slice(0, 3);
}

function ProductMetric({ label, value, helper, tone = "blue" }) {
  return (
    <article className={`svx-products-report-metric is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}

function ProductRow({ item, index, money, mode = "seller" }) {
  const helper =
    mode === "seller"
      ? `${numberLabel(soldQty(item))} sold`
      : mode === "stock"
        ? `${numberLabel(stockQty(item))} left in stock`
        : `${numberLabel(stockQty(item))} in stock`;

  const value =
    mode === "seller"
      ? money(revenue(item))
      : mode === "stock"
        ? `${numberLabel(soldQty(item))} sold`
        : `${numberLabel(soldQty(item))} sold`;

  return (
    <article className="svx-products-report-row">
      <div className="svx-products-report-rank">{index + 1}</div>

      <div className="svx-products-report-main">
        <strong>{productName(item)}</strong>
        <span>{helper}</span>
      </div>

      <p>{value}</p>
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
        <h2>Choose the product period</h2>
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

export default function ProductsReport() {
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

  const productsQuery = useQuery({
    queryKey:
      reportQueryKeys.productReport({
        branchId: activeBranchId,
        from: range.from,
        to: range.to,
        limit: 5,
        threshold: 5,
      }),
    queryFn: () =>
      getProductsReport(
        requestRange,
        5,
        5,
      ),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const payload =
    productsQuery.data || null;
  const loading =
    productsQuery.isPending;

  useEffect(() => {
    if (!productsQuery.error) return;

    toast.error(
      productsQuery.error?.response
        ?.data?.message ||
        productsQuery.error?.message ||
        "Failed to load products",
      {
        id: "products-report-load-error",
      },
    );
  }, [productsQuery.error]);

  const bestSellers = Array.isArray(payload?.bestSellers) ? payload.bestSellers : [];
  const needRestock = Array.isArray(payload?.needRestock) ? payload.needRestock : [];
  const slowProducts = Array.isArray(payload?.slowProducts) ? payload.slowProducts : [];
  const summary = payload?.summary || {};
  const moves = nextMoves({ bestSellers, needRestock, slowProducts, money });

  if (loading && !payload) {
    return <PageSkeleton />;
  }

  return (
    <main className="svx-owner-dashboard svx-business-reports svx-products-report-page">
      <section className="svx-products-detail-header">
        <div>
          <p className="svx-report-eyebrow">Products</p>
          <h1>Products</h1>
          <p>See what is selling, what needs restock, what is moving slowly, and what to do next.</p>
        </div>

        <div className="svx-products-detail-meta">
          <span>Showing</span>
          <strong>{formatDate(range.from)} to {formatDate(range.to)}</strong>
          <p>{payload?.branchScope?.label || "Current branch"}</p>
          <Link to="/app/reports">Back to overview</Link>
        </div>
      </section>

      <section className="svx-products-result-card">
        <div>
          <p className="svx-report-eyebrow">Product result</p>
          <h2>What needs your attention?</h2>
          <strong>{ownerAnswer({ bestSellers, needRestock, slowProducts })}</strong>
        </div>
      </section>

      <RangeControls
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        range={range}
        setRange={setRange}
        formatDate={formatDate}
      />

      <section className="svx-products-report-metrics">
        <ProductMetric
          label="Products sold"
          value={numberLabel(summary.sellingProductsCount)}
          helper="Products with sales in this period"
          tone="blue"
        />
        <ProductMetric
          label="Units sold"
          value={numberLabel(summary.unitsSold)}
          helper="Quantity sold from top products"
          tone="green"
        />
        <ProductMetric
          label="Sales from products"
          value={money(summary.productSales)}
          helper="Money from shown products"
          tone="green"
        />
        <ProductMetric
          label="Need restock"
          value={numberLabel(summary.needRestockCount)}
          helper="Products at or below stock limit"
          tone={cleanNumber(summary.needRestockCount) > 0 ? "amber" : "green"}
        />
      </section>

      {(bestSellers.length > 0 || needRestock.length > 0 || slowProducts.length > 0 || moves.length > 0) ? (
        <section className="svx-products-report-grid">
          {bestSellers.length > 0 ? (
            <article className="svx-dashboard-card svx-products-report-panel">
              <div className="svx-report-section-head">
                <div>
                  <p className="svx-report-eyebrow">Best sellers</p>
                  <h2>Best sellers</h2>
                </div>
              </div>

              <div className="svx-products-report-list">
                {bestSellers.slice(0, 5).map((item, index) => (
                  <ProductRow
                    key={item.productId || item.id || `${productName(item)}-${index}`}
                    item={item}
                    index={index}
                    money={money}
                    mode="seller"
                  />
                ))}
              </div>
            </article>
          ) : null}

          {needRestock.length > 0 ? (
            <article className="svx-dashboard-card svx-products-report-panel">
              <div className="svx-report-section-head">
                <div>
                  <p className="svx-report-eyebrow">Need restock</p>
                  <h2>Need restock</h2>
                </div>
              </div>

              <div className="svx-products-report-list">
                {needRestock.slice(0, 5).map((item, index) => (
                  <ProductRow
                    key={item.productId || item.id || `${productName(item)}-${index}`}
                    item={item}
                    index={index}
                    money={money}
                    mode="stock"
                  />
                ))}
              </div>
            </article>
          ) : null}

          {slowProducts.length > 0 ? (
            <article className="svx-dashboard-card svx-products-report-panel">
              <div className="svx-report-section-head">
                <div>
                  <p className="svx-report-eyebrow">Slow products</p>
                  <h2>Slow products</h2>
                </div>
              </div>

              <div className="svx-products-report-list">
                {slowProducts.slice(0, 5).map((item, index) => (
                  <ProductRow
                    key={item.productId || item.id || `${productName(item)}-${index}`}
                    item={item}
                    index={index}
                    money={money}
                    mode="slow"
                  />
                ))}
              </div>
            </article>
          ) : null}

          {moves.length > 0 ? (
            <article className="svx-dashboard-card svx-products-report-panel">
              <div className="svx-report-section-head">
                <div>
                  <p className="svx-report-eyebrow">Next actions</p>
                  <h2>What to do next</h2>
                </div>
              </div>

              <div className="svx-products-next-moves">
                {moves.slice(0, 3).map((move) => (
                  <article key={move.title} className="svx-products-next-move">
                    <strong>{move.title}</strong>
                    <p>{move.text}</p>
                  </article>
                ))}
              </div>
            </article>
          ) : null}
        </section>
      ) : (
        <section className="svx-products-empty-detail">
          <strong>No product activity needs attention in this period.</strong>
          <p>Product details will appear when sales, restock needs, or slow movement are found.</p>
        </section>
      )}

    </main>
  );
}
