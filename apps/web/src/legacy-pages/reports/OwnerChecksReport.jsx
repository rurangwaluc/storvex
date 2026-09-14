import { useEffect, useMemo } from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { getOwnerChecksReport } from "../../services/reportsApi";
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

function cleanNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function numberLabel(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(cleanNumber(value));
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

function ownerAnswer(ownerChecks, money) {
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

  return "Nothing urgent needs your attention right now.";
}

function nextMoves(ownerChecks, money) {
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
  const { formatMoney } = useTenantMoney();
  const { formatDateTime } = useTenantDateTime();

  const money = (value) => formatMoney(cleanNumber(value));

  const activeBranchId =
    useActiveBranchId();

  const explicitBranchId =
    activeBranchId === "default"
      ? undefined
      : activeBranchId;

  const ownerChecksQuery = useQuery({
    queryKey:
      reportQueryKeys.ownerCheck({
        branchId: activeBranchId,
      }),
    queryFn: () =>
      getOwnerChecksReport({
        branchId: explicitBranchId,
      }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const payload =
    ownerChecksQuery.data || null;
  const loading =
    ownerChecksQuery.isPending;

  useEffect(() => {
    if (!ownerChecksQuery.error) return;

    toast.error(
      ownerChecksQuery.error?.response
        ?.data?.message ||
        ownerChecksQuery.error?.message ||
        "Failed to load attention",
      {
        id: "owner-checks-report-load-error",
      },
    );
  }, [ownerChecksQuery.error]);

  const ownerChecks = payload?.ownerChecks || {};
  const stockList = stockProducts(ownerChecks);
  const moves = nextMoves(ownerChecks, money);

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
      <section className="svx-attention-detail-header">
        <div>
          <p className="svx-report-eyebrow">Attention</p>
          <h1>Attention</h1>
          <p>See customer debt, overdue money, supplier bills, and stock issues that need action.</p>
        </div>

        <div className="svx-attention-detail-meta">
          <span>Checked</span>
          <strong>{formatDateTime(payload?.checkedAt)}</strong>
          <p>{payload?.branchScope?.label || "Current branch"}</p>
          <Link to="/app/reports">Back to overview</Link>
        </div>
      </section>

      <section className="svx-attention-result-card">
        <div>
          <p className="svx-report-eyebrow">What matters now</p>
          <h2>What needs action first?</h2>
          <strong>{ownerAnswer(ownerChecks, money)}</strong>
        </div>
      </section>

      <section className="svx-owner-check-metrics">
        <CheckMetric
          label="Customers owe us"
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
          label="We owe suppliers"
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

      {(moves.length > 0 || stockList.length > 0) ? (
        <section className="svx-owner-check-grid">
          {moves.length > 0 ? (
            <article className="svx-dashboard-card svx-owner-check-panel">
              <div className="svx-report-section-head">
                <div>
                  <p className="svx-report-eyebrow">Next actions</p>
                  <h2>What to do next</h2>
                </div>
              </div>

              <div className="svx-owner-check-move-list">
                {moves.slice(0, 4).map((move) => (
                  <MoveCard key={move.title} move={move} />
                ))}
              </div>
            </article>
          ) : null}

          {stockList.length > 0 ? (
            <article className="svx-dashboard-card svx-owner-check-panel">
              <div className="svx-report-section-head">
                <div>
                  <p className="svx-report-eyebrow">Stock review</p>
                  <h2>Products to check</h2>
                </div>
              </div>

              <div className="svx-owner-check-stock-list">
                {stockList.slice(0, 5).map((item, index) => (
                  <StockRow
                    key={item.productId || item.id || `${productName(item)}-${index}`}
                    item={item}
                    index={index}
                  />
                ))}
              </div>
            </article>
          ) : null}
        </section>
      ) : null}

    </main>
  );
}
