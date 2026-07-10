import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { getProductsReport } from "../../services/reportsApi";
import PageSkeleton from "../../components/ui/PageSkeleton";
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

  return `${numberLabel(slowProducts.length)} product${slowProducts.length === 1 ? "" : "s"} have slow movement.`;
}

function nextMoves({ bestSellers, needRestock, slowProducts }) {
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

function ProductRow({ item, index, mode = "seller" }) {
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

function RangeControls({ selectedPreset, setSelectedPreset, range, setRange }) {
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
  const [selectedPreset, setSelectedPreset] = useState("month");
  const [range, setRange] = useState(() => rangeForPreset("month"));
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      try {
        const data = await getProductsReport(range, 5, 5);
        if (!alive) return;
        setPayload(data || null);
      } catch (error) {
        if (!alive) return;
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load products report",
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

  const bestSellers = Array.isArray(payload?.bestSellers) ? payload.bestSellers : [];
  const needRestock = Array.isArray(payload?.needRestock) ? payload.needRestock : [];
  const slowProducts = Array.isArray(payload?.slowProducts) ? payload.slowProducts : [];
  const summary = payload?.summary || {};
  const moves = nextMoves({ bestSellers, needRestock, slowProducts });

  if (loading && !payload) {
    return <PageSkeleton />;
  }

  return (
    <main className="svx-owner-dashboard svx-business-reports svx-products-report-page">
      <section className="svx-report-hero svx-dashboard-card">
        <div>
          <p className="svx-report-eyebrow">Products report</p>
          <h1>See what sells and what needs stock</h1>
          <span>
            Simple owner view for best sellers, product sales, slow products, and restock review.
          </span>
        </div>

        <aside>
          <p>Showing</p>
          <strong>{formatDate(range.from)} to {formatDate(range.to)}</strong>
          <span>{payload?.branchScope?.label || "Current branch"}</span>
        </aside>
      </section>

      <section className="svx-report-owner-answer svx-dashboard-card">
        <div>
          <p className="svx-report-eyebrow">Owner answer</p>
          <h2>What products need your attention</h2>
          <strong>{ownerAnswer({ bestSellers, needRestock, slowProducts })}</strong>
        </div>

        <Link to="/app/reports" className="svx-report-secondary-link">
          Back to reports
        </Link>
      </section>

      <RangeControls
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        range={range}
        setRange={setRange}
      />

      <section className="svx-products-report-metrics">
        <ProductMetric
          label="Selling products"
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
          label="Product sales"
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

      <section className="svx-products-report-grid">
        <article className="svx-dashboard-card svx-products-report-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Best sellers</p>
              <h2>Products bringing money</h2>
            </div>
          </div>

          <div className="svx-products-report-list">
            {bestSellers.length > 0 ? (
              bestSellers.slice(0, 5).map((item, index) => (
                <ProductRow
                  key={item.productId || item.id || `${productName(item)}-${index}`}
                  item={item}
                  index={index}
                  mode="seller"
                />
              ))
            ) : (
              <p className="svx-report-empty-text">No sold products found in this period.</p>
            )}
          </div>
        </article>

        <article className="svx-dashboard-card svx-products-report-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Need restock</p>
              <h2>Products to review now</h2>
            </div>
          </div>

          <div className="svx-products-report-list">
            {needRestock.length > 0 ? (
              needRestock.slice(0, 5).map((item, index) => (
                <ProductRow
                  key={item.productId || item.id || `${productName(item)}-${index}`}
                  item={item}
                  index={index}
                  mode="stock"
                />
              ))
            ) : (
              <p className="svx-report-empty-text">No urgent restock review found.</p>
            )}
          </div>
        </article>

        <article className="svx-dashboard-card svx-products-report-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Slow products</p>
              <h2>Products not moving fast</h2>
            </div>
          </div>

          <div className="svx-products-report-list">
            {slowProducts.length > 0 ? (
              slowProducts.slice(0, 5).map((item, index) => (
                <ProductRow
                  key={item.productId || item.id || `${productName(item)}-${index}`}
                  item={item}
                  index={index}
                  mode="slow"
                />
              ))
            ) : (
              <p className="svx-report-empty-text">No slow products found in this period.</p>
            )}
          </div>
        </article>

        <article className="svx-dashboard-card svx-products-report-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Owner next move</p>
              <h2>What to do next</h2>
            </div>
          </div>

          <div className="svx-products-next-moves">
            {moves.length > 0 ? (
              moves.map((move) => (
                <article key={move.title} className="svx-products-next-move">
                  <strong>{move.title}</strong>
                  <p>{move.text}</p>
                </article>
              ))
            ) : (
              <p className="svx-report-empty-text">No urgent product action found.</p>
            )}
          </div>
        </article>
      </section>

      <section className="svx-dashboard-card svx-products-report-note">
        <p className="svx-report-eyebrow">Important</p>
        <h2>This report is for owner decisions</h2>
        <p>
          Use this page to decide what to restock, what is selling, and what needs attention.
          Full product editing stays on the Stock page.
        </p>
      </section>
    </main>
  );
}
