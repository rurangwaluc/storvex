import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { getInsights, getTopSellers } from "../../services/reportsApi";
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

function ownerAnswer({ topSellers, reorderItems }) {
  if (!topSellers.length && !reorderItems.length) {
    return "No product movement was found in this period.";
  }

  const best = topSellers[0];

  if (best && reorderItems.length > 0) {
    return `${productName(best)} brought the most money, and ${numberLabel(reorderItems.length)} product${reorderItems.length === 1 ? "" : "s"} need stock review.`;
  }

  if (best) {
    return `${productName(best)} brought the most money in this period.`;
  }

  return `${numberLabel(reorderItems.length)} product${reorderItems.length === 1 ? "" : "s"} need stock review.`;
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
  return (
    <article className="svx-products-report-row">
      <div className="svx-products-report-rank">{index + 1}</div>

      <div className="svx-products-report-main">
        <strong>{productName(item)}</strong>
        {mode === "seller" ? (
          <span>{numberLabel(soldQty(item))} sold</span>
        ) : (
          <span>{numberLabel(stockQty(item))} left in stock</span>
        )}
      </div>

      <p>{mode === "seller" ? money(revenue(item)) : `${numberLabel(soldQty(item))} sold`}</p>
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
  const [topSellersPayload, setTopSellersPayload] = useState(null);
  const [insightsPayload, setInsightsPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      try {
        const [topSellersData, insightsData] = await Promise.all([
          getTopSellers(range, 10),
          getInsights(range, 20, 5),
        ]);

        if (!alive) return;

        setTopSellersPayload(topSellersData || null);
        setInsightsPayload(insightsData || null);
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

  const topSellers = Array.isArray(topSellersPayload?.topSellers)
    ? topSellersPayload.topSellers
    : [];

  const reorderItems = Array.isArray(insightsPayload?.reorderSuggestions?.items)
    ? insightsPayload.reorderSuggestions.items
    : [];

  const totalRevenue = useMemo(
    () => topSellers.reduce((sum, item) => sum + revenue(item), 0),
    [topSellers],
  );

  const totalUnits = useMemo(
    () => topSellers.reduce((sum, item) => sum + soldQty(item), 0),
    [topSellers],
  );

  if (loading && !topSellersPayload && !insightsPayload) {
    return <PageSkeleton />;
  }

  return (
    <main className="svx-owner-dashboard svx-business-reports svx-products-report-page">
      <section className="svx-report-hero svx-dashboard-card">
        <div>
          <p className="svx-report-eyebrow">Products report</p>
          <h1>See what sells and what needs stock</h1>
          <span>
            Simple owner view for best sellers, money brought in, quantity sold, and products to review.
          </span>
        </div>

        <aside>
          <p>Showing</p>
          <strong>{formatDate(range.from)} to {formatDate(range.to)}</strong>
          <span>{topSellersPayload?.branchScope?.label || "Current branch"}</span>
        </aside>
      </section>

      <section className="svx-report-owner-answer svx-dashboard-card">
        <div>
          <p className="svx-report-eyebrow">Owner answer</p>
          <h2>What products need your attention</h2>
          <strong>{ownerAnswer({ topSellers, reorderItems })}</strong>
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
          label="Products sold"
          value={numberLabel(topSellers.length)}
          helper="Products with sales in this period"
          tone="blue"
        />
        <ProductMetric
          label="Units sold"
          value={numberLabel(totalUnits)}
          helper="Total quantity sold from best sellers"
          tone="green"
        />
        <ProductMetric
          label="Money brought in"
          value={money(totalRevenue)}
          helper="Revenue from shown products"
          tone="green"
        />
        <ProductMetric
          label="Stock to review"
          value={numberLabel(reorderItems.length)}
          helper="Products at or below stock threshold"
          tone={reorderItems.length > 0 ? "amber" : "green"}
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
            {topSellers.length > 0 ? (
              topSellers.slice(0, 10).map((item, index) => (
                <ProductRow
                  key={item.productId || item.id || `${productName(item)}-${index}`}
                  item={item}
                  index={index}
                  mode="seller"
                />
              ))
            ) : (
              <p className="svx-report-empty-text">
                No sold products found in this period.
              </p>
            )}
          </div>
        </article>

        <article className="svx-dashboard-card svx-products-report-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Stock to review</p>
              <h2>Products that may need restocking</h2>
            </div>
          </div>

          <div className="svx-products-report-list">
            {reorderItems.length > 0 ? (
              reorderItems.slice(0, 10).map((item, index) => (
                <ProductRow
                  key={item.productId || item.id || `${productName(item)}-${index}`}
                  item={item}
                  index={index}
                  mode="stock"
                />
              ))
            ) : (
              <p className="svx-report-empty-text">
                No urgent stock review found from the current sales data.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="svx-dashboard-card svx-products-report-note">
        <p className="svx-report-eyebrow">Important</p>
        <h2>This report is for owner decisions</h2>
        <p>
          Use this page to decide what to restock, what is selling, and which products deserve more attention.
          Full product editing stays on the Stock page.
        </p>
      </section>
    </main>
  );
}
