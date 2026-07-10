import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { getOwnerChecksReport } from "../../services/reportsApi";
import PageSkeleton from "../../components/ui/PageSkeleton";
import "../dashboard/Dashboard.css";
import "./Reports.css";

function cleanNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
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

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function checkAmount(section) {
  return cleanNumber(section?.total ?? section?.amount ?? section?.value);
}

function checkCount(section) {
  return cleanNumber(section?.count ?? section?.itemsCount ?? section?.totalCount);
}

function stockProducts(ownerChecks) {
  const stock = ownerChecks?.stockToReview || {};
  return Array.isArray(stock.products) ? stock.products : [];
}

function productName(item) {
  return item?.name || item?.productName || "Product";
}

function stockQty(item) {
  return cleanNumber(item?.stockQty ?? item?.qtyOnHand ?? item?.stock);
}

function minStock(item) {
  return cleanNumber(item?.minStockLevel ?? item?.minStock ?? item?.limit);
}

function ownerAnswer(ownerChecks) {
  const customersOwe = checkAmount(ownerChecks?.customersOweMe);
  const overdue = checkAmount(ownerChecks?.overdueCustomerMoney);
  const suppliersOwe = checkAmount(ownerChecks?.iOweSuppliers);
  const stockCount = checkCount(ownerChecks?.stockToReview);

  if (overdue > 0) {
    return `Collect overdue customer money first. Customers are overdue by ${money(overdue)}.`;
  }

  if (customersOwe > 0) {
    return `Customers still owe ${money(customersOwe)}. Review credit sales and follow up.`;
  }

  if (suppliersOwe > 0) {
    return `You owe suppliers ${money(suppliersOwe)}. Review supplier bills before paying.`;
  }

  if (stockCount > 0) {
    return `${numberLabel(stockCount)} product${stockCount === 1 ? "" : "s"} need stock review.`;
  }

  return "No urgent owner checks found right now.";
}

function nextMoves(ownerChecks) {
  const moves = [];

  const overdue = checkAmount(ownerChecks?.overdueCustomerMoney);
  const customersOwe = checkAmount(ownerChecks?.customersOweMe);
  const suppliersOwe = checkAmount(ownerChecks?.iOweSuppliers);
  const stockList = stockProducts(ownerChecks);

  if (overdue > 0) {
    moves.push({
      title: "Collect overdue customer money",
      text: `${money(overdue)} should already have been collected.`,
      tone: "red",
    });
  }

  if (customersOwe > 0) {
    moves.push({
      title: "Review customer credit",
      text: `${money(customersOwe)} is still unpaid by customers.`,
      tone: "amber",
    });
  }

  if (suppliersOwe > 0) {
    moves.push({
      title: "Check supplier bills",
      text: `${money(suppliersOwe)} is still owed to suppliers.`,
      tone: "amber",
    });
  }

  if (stockList[0]) {
    moves.push({
      title: `Review stock for ${productName(stockList[0])}`,
      text: `${numberLabel(stockQty(stockList[0]))} left in stock. Limit is ${numberLabel(minStock(stockList[0]))}.`,
      tone: "blue",
    });
  }

  return moves.slice(0, 4);
}

function CheckMetric({ label, value, helper, tone = "blue" }) {
  return (
    <article className={`svx-owner-check-metric is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}

function MoveCard({ move }) {
  return (
    <article className={`svx-owner-check-move is-${move.tone || "blue"}`}>
      <strong>{move.title}</strong>
      <p>{move.text}</p>
    </article>
  );
}

function StockRow({ item, index }) {
  return (
    <article className="svx-owner-check-stock-row">
      <div className="svx-owner-check-rank">{index + 1}</div>

      <div>
        <strong>{productName(item)}</strong>
        <span>
          {numberLabel(stockQty(item))} left / limit {numberLabel(minStock(item))}
        </span>
      </div>
    </article>
  );
}

export default function OwnerChecksReport() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const data = await getOwnerChecksReport();
      setPayload(data || null);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load owner checks",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const ownerChecks = payload?.ownerChecks || {};
  const stockList = stockProducts(ownerChecks);
  const moves = useMemo(() => nextMoves(ownerChecks), [ownerChecks]);

  const customersOwe = checkAmount(ownerChecks.customersOweMe);
  const customersOweCount = checkCount(ownerChecks.customersOweMe);

  const overdue = checkAmount(ownerChecks.overdueCustomerMoney);
  const overdueCount = checkCount(ownerChecks.overdueCustomerMoney);

  const suppliersOwe = checkAmount(ownerChecks.iOweSuppliers);
  const suppliersOweCount = checkCount(ownerChecks.iOweSuppliers);

  const stockCount = checkCount(ownerChecks.stockToReview);

  if (loading && !payload) {
    return <PageSkeleton />;
  }

  return (
    <main className="svx-owner-dashboard svx-business-reports svx-owner-checks-page">
      <section className="svx-report-hero svx-dashboard-card">
        <div>
          <p className="svx-report-eyebrow">Owner checks</p>
          <h1>See what needs owner attention</h1>
          <span>
            Quick control view for customer money, supplier money, overdue money, and stock issues.
          </span>
        </div>

        <aside>
          <p>Checked</p>
          <strong>{formatDateTime(payload?.checkedAt)}</strong>
          <span>{payload?.branchScope?.label || "Current branch"}</span>
        </aside>
      </section>

      <section className="svx-report-owner-answer svx-dashboard-card">
        <div>
          <p className="svx-report-eyebrow">Owner answer</p>
          <h2>What needs action first</h2>
          <strong>{ownerAnswer(ownerChecks)}</strong>
        </div>

        <Link to="/app/reports" className="svx-report-secondary-link">
          Back to reports
        </Link>
      </section>

      <section className="svx-owner-check-metrics">
        <CheckMetric
          label="Customers owe me"
          value={money(customersOwe)}
          helper={`${numberLabel(customersOweCount)} unpaid credit sale${customersOweCount === 1 ? "" : "s"}`}
          tone={customersOwe > 0 ? "amber" : "green"}
        />
        <CheckMetric
          label="Overdue customer money"
          value={money(overdue)}
          helper={`${numberLabel(overdueCount)} overdue sale${overdueCount === 1 ? "" : "s"}`}
          tone={overdue > 0 ? "red" : "green"}
        />
        <CheckMetric
          label="I owe suppliers"
          value={money(suppliersOwe)}
          helper={`${numberLabel(suppliersOweCount)} supplier bill${suppliersOweCount === 1 ? "" : "s"} unpaid`}
          tone={suppliersOwe > 0 ? "amber" : "green"}
        />
        <CheckMetric
          label="Stock to review"
          value={numberLabel(stockCount)}
          helper="Products at or below stock limit"
          tone={stockCount > 0 ? "amber" : "green"}
        />
      </section>

      <section className="svx-owner-check-grid">
        <article className="svx-dashboard-card svx-owner-check-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Owner next move</p>
              <h2>What to do next</h2>
            </div>
          </div>

          <div className="svx-owner-check-move-list">
            {moves.length > 0 ? (
              moves.map((move) => <MoveCard key={move.title} move={move} />)
            ) : (
              <p className="svx-report-empty-text">No urgent owner action found.</p>
            )}
          </div>
        </article>

        <article className="svx-dashboard-card svx-owner-check-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Stock review</p>
              <h2>Products to check</h2>
            </div>
          </div>

          <div className="svx-owner-check-stock-list">
            {stockList.length > 0 ? (
              stockList.slice(0, 5).map((item, index) => (
                <StockRow
                  key={item.productId || item.id || `${productName(item)}-${index}`}
                  item={item}
                  index={index}
                />
              ))
            ) : (
              <p className="svx-report-empty-text">No stock issue found right now.</p>
            )}
          </div>
        </article>
      </section>

      <section className="svx-dashboard-card svx-owner-check-note">
        <p className="svx-report-eyebrow">Important</p>
        <h2>This is not an accounting page</h2>
        <p>
          This page shows only the checks an owner needs to act on. Full sales, supplier, and stock details stay on their own pages.
        </p>
      </section>
    </main>
  );
}
