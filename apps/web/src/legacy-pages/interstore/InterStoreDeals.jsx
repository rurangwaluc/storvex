import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  getDealsWithMeta,
  markReturned,
} from "../../services/interStoreApi";
import "./InterStore.css";

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "BORROWED", label: "Taken" },
  { value: "RECEIVED", label: "Taken" },
  { value: "SOLD", label: "Money due" },
  { value: "PAID", label: "Paid" },
  { value: "RETURNED", label: "Returned" },
];

const DESKTOP_PAGE_SIZE = 20;
const MOBILE_PAGE_SIZE = 10;
const MAX_SERVER_TAKE = 50;

function initialVisibleCount() {
  if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 720px)")?.matches) {
    return MOBILE_PAGE_SIZE;
  }

  return DESKTOP_PAGE_SIZE;
}

function cleanString(value) {
  return String(value || "").trim();
}

function formatMoney(value) {
  const n = Number(value || 0);
  return `RWF ${Math.round(Number.isFinite(n) ? n : 0).toLocaleString("en-US")}`;
}

function toDateLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusMeta(status) {
  const key = cleanString(status).toUpperCase();
  const map = {
    BORROWED: { label: "Taken", className: "borrowed", next: "Collect payment or return" },
    RECEIVED: { label: "Taken", className: "received", next: "Collect payment or return" },
    SOLD: { label: "Money due", className: "sold", next: "Collect payment" },
    PAID: { label: "Paid", className: "paid", next: "Done" },
    RETURNED: { label: "Returned", className: "returned", next: "Done" },
  };
  return map[key] || { label: key || "Unknown", className: "returned", next: "Review" };
}

function transferSource(deal) {
  return (
    cleanString(deal?.resellerName) ||
    cleanString(deal?.externalSupplierName) ||
    (deal?.supplierTenantId ? "Another store" : "Person/customer")
  );
}

function branchParts(deal) {
  const branch = deal?.branch || deal?.borrowerBranch;
  return {
    code: cleanString(branch?.code),
    name: cleanString(branch?.name),
    fallback: deal?.borrowerBranchId ? "Selected branch" : "Workspace-wide",
  };
}

function branchLabel(deal) {
  const branch = branchParts(deal);
  return [branch.code, branch.name].filter(Boolean).join(" ") || branch.fallback;
}

function BranchStack({ deal }) {
  const branch = branchParts(deal);
  if (branch.code || branch.name) {
    return (
      <span className="svx-transfer-branch-stack">
        {branch.code ? <strong>{branch.code}</strong> : null}
        {branch.name ? <em>{branch.name}</em> : null}
      </span>
    );
  }

  return <span>{branch.fallback}</span>;
}

function payableQuantity(deal) {
  const qty = Number(deal?.quantity || 0);
  const sold = Number(deal?.soldQuantity || 0);
  const returned = Number(deal?.returnedQuantity || 0);
  return Math.max(0, sold || qty - returned);
}

function paymentRisk(deal) {
  if (cleanString(deal?.status).toUpperCase() === "RETURNED") return 0;
  const unitPrice = Number(deal?.soldPrice || deal?.agreedPrice || 0);
  const paid = Number(deal?.paidAmount || 0);
  const owed = unitPrice * payableQuantity(deal);
  return Math.max(0, owed - paid);
}

function SummaryCard({ label, value, note, tone = "primary" }) {
  return (
    <article className="svx-transfer-stat-card" style={{ "--stat-color": tone }}>
      <div className="svx-transfer-stat-label">{label}</div>
      <div className="svx-transfer-stat-value">{value}</div>
      <p className="svx-transfer-stat-note">{note}</p>
    </article>
  );
}

function StatusPill({ status }) {
  const meta = statusMeta(status);
  return <span className={`svx-transfer-status ${meta.className}`}>{meta.label}</span>;
}

function QuantityStack({ quantity, soldQuantity, returnedQuantity }) {
  const qty = Number(quantity || 1);
  const payable = Number(soldQuantity || 0);
  const returned = Number(returnedQuantity || 0);

  return (
    <span className="svx-transfer-quantity-stack">
      <strong>Moved {qty}</strong>
      {payable ? <em>Payable {payable}</em> : null}
      {returned ? <em>Returned {returned}</em> : null}
    </span>
  );
}

function TransferCard({ deal, busyAction, onOpen, onReturn }) {
  const statusKey = cleanString(deal.status).toUpperCase();
  const meta = statusMeta(deal.status);
  const risk = paymentRisk(deal);
  const canReturn = ["BORROWED", "RECEIVED"].includes(statusKey);

  function openDeal() {
    onOpen?.(deal);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDeal();
    }
  }

  function stopAction(event) {
    event.stopPropagation();
  }

  return (
    <article
      className="svx-transfer-list-card svx-transfer-register-card is-clickable"
      role="button"
      tabIndex={0}
      onClick={openDeal}
      onKeyDown={handleKeyDown}
      aria-label={`Open transfer ${deal.productName || "item"}`}
    >
      <div className="svx-transfer-register-primary">
        <StatusPill status={deal.status} />
        <div className="svx-transfer-register-item-copy">
          <h3 title={deal.productName || "Unnamed item"}>{deal.productName || "Unnamed item"}</h3>
          <QuantityStack
            quantity={deal.quantity}
            soldQuantity={deal.soldQuantity}
            returnedQuantity={deal.returnedQuantity}
          />
        </div>
      </div>

      <span className="svx-transfer-register-cell">
        <small>Taking stock</small>
        <strong title={transferSource(deal)}>{transferSource(deal)}</strong>
      </span>

      <span className="svx-transfer-register-cell">
        <small>Shop branch</small>
        <strong><BranchStack deal={deal} /></strong>
      </span>

      <span className="svx-transfer-register-cell">
        <small>Tracking</small>
        <strong title={deal.serial || "No code"}>{deal.serial || "No code"}</strong>
      </span>

      <span className="svx-transfer-register-cell svx-transfer-register-money">
        <small>Money at risk</small>
        <strong>{formatMoney(risk)}</strong>
        <em>Due {toDateLabel(deal.dueDate)}</em>
      </span>

      <span className="svx-transfer-register-cell svx-transfer-register-next">
        <small>Next action</small>
        <strong>{meta.next}</strong>
      </span>

      <div className="svx-transfer-row-actions" onClick={stopAction}>
        {canReturn ? (
          <button
            type="button"
            className="svx-transfer-warning"
            disabled={busyAction === deal.id}
            onClick={() => onReturn(deal)}
          >
            Return stock
          </button>
        ) : null}
        <button type="button" className="svx-transfer-secondary" onClick={openDeal}>
          Details
        </button>
      </div>
    </article>
  );
}

function SkeletonList() {
  return (
    <div className="svx-transfer-list">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="svx-transfer-list-card">
          <div className="svx-transfer-skeleton" style={{ height: 64 }} />
          <div className="svx-transfer-skeleton" style={{ height: 46 }} />
          <div className="svx-transfer-skeleton" style={{ height: 46 }} />
          <div className="svx-transfer-skeleton" style={{ height: 38 }} />
        </div>
      ))}
    </div>
  );
}

export default function InterStoreDeals() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [branchScope, setBranchScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [allBranches, setAllBranches] = useState(false);
  const [page, setPage] = useState(null);
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [cursor, setCursor] = useState("");

  async function loadTransfers({ append = false, nextCursor = "" } = {}) {
    try {
      setLoading(!append);
      const result = await getDealsWithMeta({
        allBranches: allBranches ? "true" : undefined,
        take: MAX_SERVER_TAKE,
        cursor: nextCursor || undefined,
        status: status !== "ALL" ? status : undefined,
        q: query || undefined,
      });
      const incoming = Array.isArray(result.deals) ? result.deals : [];
      setDeals((current) => (append ? [...current, ...incoming] : incoming));
      setBranchScope(result.branchScope || null);
      setPage(result.page || null);
      setCursor(result.page?.nextCursor || "");
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to load store transfers");
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setVisibleCount(initialVisibleCount());
    void loadTransfers();
  }, [allBranches, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisibleCount(initialVisibleCount());
      void loadTransfers();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const filteredDeals = useMemo(() => {
    const q = cleanString(query).toLowerCase();
    return deals.filter((deal) => {
      const statusOk = status === "ALL" || cleanString(deal.status).toUpperCase() === status;
      if (!statusOk) return false;
      if (!q) return true;
      return [
        deal.productName,
        deal.serial,
        deal.productCategory,
        deal.externalSupplierName,
        deal.resellerName,
        deal.resellerPhone,
        branchLabel(deal),
      ]
        .map((item) => cleanString(item).toLowerCase())
        .some((item) => item.includes(q));
    });
  }, [deals, query, status]);

  const displayedDeals = useMemo(() => filteredDeals.slice(0, visibleCount), [filteredDeals, visibleCount]);
  const hasHiddenLocalDeals = filteredDeals.length > displayedDeals.length;
  const canLoadMore = hasHiddenLocalDeals || Boolean(page?.hasNextPage);

  const summary = useMemo(() => {
    const active = deals.filter((deal) => ["BORROWED", "RECEIVED", "SOLD"].includes(deal.status));
    const needAction = deals.filter((deal) => ["BORROWED", "RECEIVED", "SOLD"].includes(deal.status));
    const moneyDue = deals.reduce((sum, deal) => {
      const statusKey = cleanString(deal.status).toUpperCase();
      return ["BORROWED", "RECEIVED", "SOLD"].includes(statusKey) ? sum + paymentRisk(deal) : sum;
    }, 0);
    const itemsMoving = deals.reduce((sum, deal) => sum + Number(deal.quantity || 0), 0);
    return { active: active.length, needAction: needAction.length, moneyDue, itemsMoving };
  }, [deals]);

  async function runAction(deal, action, successMessage) {
    try {
      setBusyAction(deal.id);
      await action();
      toast.success(successMessage);
      await loadTransfers();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Action failed");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="svx-transfer-page">
      <div className="svx-transfer-shell">
        <section className="svx-transfer-hero">
          <div className="svx-transfer-hero-inner">
            <div>
              <span className="svx-transfer-eyebrow">Store transfers</span>
              <h1 className="svx-transfer-title">Store transfers</h1>
              <p className="svx-transfer-subtitle">
                Track products taken by a person or another store, with money due, returns, and final payment under control.
              </p>
              <div className="svx-transfer-category-pill">Operations</div>
            </div>
            <div className="svx-transfer-hero-side">
              <button type="button" className="svx-transfer-create-button" onClick={() => navigate("/app/interstore/new")}>
                <span className="svx-transfer-create-plus" aria-hidden="true">+</span>
                <span>New transfer</span>
              </button>
              <div className="svx-transfer-hero-tabs">
                <button type="button" className="svx-transfer-tab is-active">Transfers list</button>
                <button type="button" className="svx-transfer-tab">Taken stock</button>
                <button type="button" className="svx-transfer-tab">Money due</button>
              </div>
            </div>
          </div>
        </section>

        <section className="svx-transfer-summary-grid" aria-label="Transfer summary">
          <SummaryCard label="Active transfers" value={summary.active} note="Stock taken or awaiting payment" tone="#159cff" />
          <SummaryCard label="Needs action" value={summary.needAction} note="Collect payment or return stock" tone="#f59e0b" />
          <SummaryCard label="Money due" value={formatMoney(summary.moneyDue)} note="Open transfers not fully paid" tone="#10b981" />
          <SummaryCard label="Items moved" value={summary.itemsMoving} note="Total quantity in current view" tone="#8b5cf6" />
        </section>

        <section className="svx-transfer-toolbar">
          <div className="svx-transfer-search-wrap">
            <input
              className="svx-transfer-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search item, serial, person, store or branch"
            />
            <select
              className="svx-transfer-select"
              value={allBranches ? "ALL" : "CURRENT"}
              onChange={(event) => setAllBranches(event.target.value === "ALL")}
            >
              <option value="CURRENT">Current branch</option>
              <option value="ALL">All branches</option>
            </select>
            <button type="button" className="svx-transfer-secondary" onClick={() => navigate("/app/inventory")}>Stock</button>
          </div>
          <label className="svx-transfer-mobile-status-control">
            <span>Status view</span>
            <select
              className="svx-transfer-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter transfers by status"
            >
              {STATUS_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="svx-transfer-filter-row" aria-label="Transfer status filters">
            {STATUS_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`svx-transfer-filter ${status === item.value ? "is-active" : ""}`}
                onClick={() => setStatus(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="svx-transfer-content-grid is-list-only">
          <div>
            <div className="svx-transfer-section-head">
              <div>
                <span className="svx-transfer-kicker">Transfers</span>
                <h2>Transfer register</h2>
                <p>{displayedDeals.length} shown now. Tap any transfer to view the full details.</p>
              </div>
            </div>

            {loading ? (
              <SkeletonList />
            ) : filteredDeals.length ? (
              <>
                <div className="svx-transfer-register-head" aria-hidden="true">
                  <span>Transfer</span>
                  <span>Taking stock</span>
                  <span>Branch</span>
                  <span>Tracking</span>
                  <span>Qty</span>
                  <span>Money</span>
                  <span>Next</span>
                  <span></span>
                </div>
                <div className="svx-transfer-list svx-transfer-register-list">
                  {displayedDeals.map((deal) => (
                    <TransferCard
                      key={deal.id}
                      deal={deal}
                      busyAction={busyAction}
                      onReturn={(row) => runAction(row, () => markReturned(row.id, { returnedQuantity: row.quantity || 1 }, { allBranches }), "Transfer returned")}
                      onOpen={(row) => navigate(`/app/interstore/${row.id}`)}
                    />
                  ))}
                </div>
                {canLoadMore ? (
                  <div className="svx-transfer-load-more">
                    <button
                      type="button"
                      className="svx-transfer-secondary"
                      onClick={() => {
                        if (hasHiddenLocalDeals) {
                          setVisibleCount((count) => count + initialVisibleCount());
                          return;
                        }

                        if (page?.hasNextPage && cursor) {
                          void loadTransfers({ append: true, nextCursor: cursor });
                        }
                      }}
                    >
                      Load more transfers
                    </button>
                    <span>Showing {displayedDeals.length} of {filteredDeals.length}{page?.hasNextPage ? "+" : ""}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="svx-transfer-empty">
                <h3>No transfers found</h3>
                <p>Create a transfer when a person or another store takes products now and promises to pay later.</p>
                <button type="button" className="svx-transfer-primary" onClick={() => navigate("/app/interstore/new")}>Create transfer</button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
