import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { cancelSale as cancelSaleApi, listSales } from "../../services/posApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./SalesList.css";

const PAGE_SIZE = 8;

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function formatMoney(value) {
  const n = Number(value || 0);
  const safe = Number.isFinite(n) ? n : 0;

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(safe)}`;
}

function formatNumber(value) {
  const n = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatDateTime(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("en-RW", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function activeBranchNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (name) return name;
  if (code) return code;

  return "this branch";
}

function saleTotal(sale) {
  return Number(sale?.total ?? sale?.amount ?? sale?.grandTotal ?? 0);
}

function salePaid(sale) {
  return Number(sale?.amountPaid ?? sale?.paid ?? 0);
}

function saleBalance(sale) {
  return Number(sale?.balanceDue ?? sale?.balance ?? 0);
}

function saleStatus(sale) {
  const status = String(sale?.status || "").toUpperCase();
  const saleType = String(sale?.saleType || "").toUpperCase();
  const balance = saleBalance(sale);

  if (sale?.isCancelled || status === "CANCELLED") {
    return {
      label: "Cancelled",
      tone: "danger",
      note: "Cancelled sale",
    };
  }

  if (status === "OVERDUE") {
    return {
      label: "Overdue",
      tone: "danger",
      note: "Needs follow-up",
    };
  }

  if (balance > 0 || saleType === "CREDIT") {
    return {
      label: balance > 0 ? "Balance due" : "Pay later",
      tone: "warning",
      note: balance > 0 ? `${formatMoney(balance)} unpaid` : "Customer will pay later",
    };
  }

  return {
    label: "Paid",
    tone: "success",
    note: "Payment complete",
  };
}

function saleTypeLabel(value) {
  const v = String(value || "").toUpperCase();
  if (v === "CREDIT") return "Pay later";
  return "Paid now";
}

function customerName(sale) {
  return cleanString(sale?.customer?.name) || cleanString(sale?.customerName) || "Walk-in customer";
}

function customerPhone(sale) {
  return cleanString(sale?.customer?.phone) || cleanString(sale?.customerPhone) || "";
}

function cashierName(sale) {
  return cleanString(sale?.cashier?.name) || cleanString(sale?.cashierName) || "—";
}

function receiptCode(sale) {
  return (
    cleanString(sale?.receiptNumber) ||
    cleanString(sale?.number) ||
    cleanString(sale?.id).slice(-8).toUpperCase() ||
    "—"
  );
}

function canCancelFromList(sale) {
  if (!sale) return false;
  if (sale?.isCancelled) return false;
  if (String(sale?.saleType || "").toUpperCase() !== "CASH") return false;
  if (Number(sale?.refundedTotal || 0) > 0) return false;

  return true;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function StatusBadge({ tone = "neutral", children }) {
  return <span className={cx("svx-sales-badge", `is-${tone}`)}>{children}</span>;
}

function EmptyState({ title, text, action }) {
  return (
    <div className="svx-sales-empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <div className="svx-sales-empty-action">{action}</div> : null}
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return <div className={cx("svx-sales-skeleton", className)} />;
}

function MetricCard({ label, value, note, tone = "neutral" }) {
  return (
    <article className="svx-sales-metric">
      <div className={cx("svx-sales-metric-dot", `is-${tone}`)} />
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

function SaleField({ className = "", label, children }) {
  return (
    <div className={cx("svx-sales-field", className)}>
      <small>{label}</small>
      {children}
    </div>
  );
}

function SalesListSkeleton() {
  return (
    <main className="svx-sales-list-page">
      <section className="svx-sales-hero">
        <div className="svx-sales-hero-copy">
          <SkeletonBlock className="is-kicker" />
          <SkeletonBlock className="is-title" />
          <SkeletonBlock className="is-copy" />
        </div>
      </section>

      <section className="svx-sales-metrics">
        {[1, 2, 3, 4].map((item) => (
          <SkeletonBlock key={item} className="is-metric" />
        ))}
      </section>

      <section className="svx-sales-list-card">
        <SkeletonBlock className="is-control" />
        <div className="svx-sales-rows">
          {[1, 2, 3].map((item) => (
            <SkeletonBlock key={item} className="is-row" />
          ))}
        </div>
      </section>
    </main>
  );
}

function SaleRow({ sale, onOpenCancel, cancelBusy }) {
  const status = saleStatus(sale);
  const cancelEnabled = canCancelFromList(sale);
  const total = saleTotal(sale);
  const paid = salePaid(sale) || (saleBalance(sale) <= 0 ? total : 0);
  const balance = saleBalance(sale);
  const saleType = String(sale?.saleType || "").toUpperCase();
  const phone = customerPhone(sale);

  return (
    <article className={cx("svx-sales-row", `is-${status.tone}`)}>
      <SaleField className="is-sale" label="Sale">
        <b>{receiptCode(sale)}</b>
        <span>{status.note}</span>
      </SaleField>

      <SaleField className="is-customer" label="Customer">
        <b>{customerName(sale)}</b>
        <span>{phone || "No phone saved"}</span>
      </SaleField>

      <SaleField className="is-date" label="Date">
        <b>{formatDateTime(sale.createdAt)}</b>
        <span>{cashierName(sale)}</span>
      </SaleField>

      <SaleField className="is-payment" label="Payment">
        <div className="svx-sales-payment-pills">
          <StatusBadge tone={status.tone === "danger" ? "danger" : saleType === "CREDIT" ? "warning" : "success"}>
            {status.tone === "danger" ? status.label : saleTypeLabel(saleType)}
          </StatusBadge>
        </div>
      </SaleField>

      <SaleField className="is-money" label="Amount">
        <b>{formatMoney(total)}</b>
        <span>Paid {formatMoney(paid)}</span>
        {balance > 0 ? <em>Balance {formatMoney(balance)}</em> : <em>Balance Rwf 0</em>}
      </SaleField>

      <div className="svx-sales-actions">
        <Link to={`/app/pos/sales/${sale.id}`} className="svx-sales-button secondary">
          View
        </Link>

        <button
          type="button"
          onClick={() => onOpenCancel(sale.id)}
          disabled={!cancelEnabled || cancelBusy}
          className={cancelEnabled && !cancelBusy ? "svx-sales-button danger" : "svx-sales-button disabled"}
          title={!cancelEnabled ? "Only active paid-now sales can be cancelled here." : ""}
        >
          <CancelIcon />
          Cancel
        </button>
      </div>
    </article>
  );
}

export default function SalesList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeBranchLabel, setActiveBranchLabel] = useState(() => activeBranchNameFromStorage());

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelSaleId, setCancelSaleId] = useState("");
  const [cancelNote, setCancelNote] = useState("");

  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  async function load() {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const data = await listSales({}, { signal: controller.signal });

      if (!mountedRef.current || controller.signal.aborted) return;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.sales)
          ? data.sales
          : [];

      setSales(list);
      setVisibleCount(PAGE_SIZE);
      setActiveBranchLabel(activeBranchNameFromStorage());
    } catch (error) {
      if (controller.signal.aborted) return;

      console.error(error);

      if (!handleSubscriptionBlockedError(error, { toastId: "sales-list-blocked" })) {
        toast.error(error?.message || "Failed to load sales");
      }

      if (!mountedRef.current) return;

      setSales([]);
      setVisibleCount(PAGE_SIZE);
    } finally {
      if (!mountedRef.current || controller.signal.aborted) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onBranchChanged() {
      setActiveBranchLabel(activeBranchNameFromStorage());
      setVisibleCount(PAGE_SIZE);
      void load();
    }

    window.addEventListener("storvex:branch-changed", onBranchChanged);
    window.addEventListener("storvex:workspace-refreshed", onBranchChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onBranchChanged);
      window.removeEventListener("storvex:workspace-refreshed", onBranchChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    return sales.filter((sale) => {
      const status = String(sale?.status || "").toUpperCase();
      const type = String(sale?.saleType || "").toUpperCase();

      if (statusFilter !== "ALL") {
        if (statusFilter === "BALANCE") {
          if (saleBalance(sale) <= 0) return false;
        } else if (status !== statusFilter) {
          return false;
        }
      }

      if (typeFilter !== "ALL" && type !== typeFilter) {
        return false;
      }

      if (!search) return true;

      const haystack = [
        sale?.id,
        sale?.receiptNumber,
        sale?.number,
        customerName(sale),
        customerPhone(sale),
        cashierName(sale),
        sale?.customer?.email,
      ]
        .map((item) => String(item || "").toLowerCase())
        .join(" ");

      return haystack.includes(search);
    });
  }, [sales, q, statusFilter, typeFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, statusFilter, typeFilter]);

  const visibleSales = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const summary = useMemo(() => {
    const total = sales.length;
    const paid = sales.filter((sale) => saleBalance(sale) <= 0 && !sale?.isCancelled).length;
    const withBalance = sales.filter((sale) => saleBalance(sale) > 0 && !sale?.isCancelled).length;
    const overdue = sales.filter((sale) => String(sale?.status || "").toUpperCase() === "OVERDUE").length;
    const totalMoney = sales.reduce((sum, sale) => sum + saleTotal(sale), 0);

    return {
      total,
      paid,
      withBalance,
      overdue,
      totalMoney,
    };
  }, [sales]);

  function openCancel(saleId) {
    setCancelSaleId(String(saleId || ""));
    setCancelNote("");
    setCancelOpen(true);
  }

  async function confirmCancel() {
    if (!cancelSaleId) return;

    setCancelBusy(true);

    try {
      await cancelSaleApi(cancelSaleId, {
        note: cleanString(cancelNote) || null,
      });

      toast.success("Sale cancelled");
      setCancelOpen(false);
      setCancelSaleId("");
      setCancelNote("");
      await load();
    } catch (error) {
      console.error(error);

      if (handleSubscriptionBlockedError(error, { toastId: "sale-list-cancel-blocked" })) {
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || "Failed to cancel sale");
    } finally {
      setCancelBusy(false);
    }
  }

  function handleLoadMore() {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }

  if (loading && sales.length === 0) {
    return <SalesListSkeleton />;
  }

  return (
    <main className="svx-sales-list-page">
      <section className="svx-sales-hero">
        <div className="svx-sales-hero-copy">
          <p className="svx-sales-kicker">Sales list</p>
          <h1>Sales history</h1>
          <p>
            Review sales from <strong>{activeBranchLabel}</strong>. Search by receipt, customer, phone, or cashier.
          </p>
        </div>

        <div className="svx-sales-hero-actions">
          <button type="button" onClick={() => navigate("/app/pos")} className="svx-sales-button secondary">
            <BackIcon />
            Sales desk
          </button>

          <AsyncButton loading={loading} onClick={load} className="svx-sales-button secondary">
            Refresh
          </AsyncButton>

          <Link to="/app/pos" className="svx-sales-button primary">
            <PlusIcon />
            New sale
          </Link>
        </div>
      </section>

      <section className="svx-sales-metrics">
        <MetricCard label="Sales" value={formatNumber(summary.total)} note="Loaded in this branch" />
        <MetricCard label="Sales value" value={formatMoney(summary.totalMoney)} note="Total sales value" tone="success" />
        <MetricCard label="Paid" value={formatNumber(summary.paid)} note="No balance left" tone="success" />
        <MetricCard
          label="Follow up"
          value={formatNumber(summary.withBalance + summary.overdue)}
          note="Balance or overdue"
          tone={summary.withBalance + summary.overdue > 0 ? "warning" : "neutral"}
        />
      </section>

      <section className="svx-sales-list-card">
        <div className="svx-sales-toolbar">
          <div className="svx-sales-search">
            <SearchIcon />
            <input
              placeholder="Search receipt, customer, phone, or cashier..."
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </div>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="PAID">Paid</option>
            <option value="BALANCE">Balance due</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="ALL">All sale types</option>
            <option value="CASH">Paid now</option>
            <option value="CREDIT">Pay later</option>
          </select>
        </div>

        <div className="svx-sales-list-body">
          {loading ? (
            <div className="svx-sales-rows">
              {[1, 2, 3].map((item) => (
                <SkeletonBlock key={item} className="is-row" />
              ))}
            </div>
          ) : visibleSales.length === 0 ? (
            <EmptyState
              title="No sales found"
              text="Try another search or filter. New completed sales will appear here."
              action={
                <Link to="/app/pos" className="svx-sales-button primary">
                  Start sale
                </Link>
              }
            />
          ) : (
            <>
              <div className="svx-sales-table">
                <div className="svx-sales-table-head" aria-hidden="true">
                  <span>Sale</span>
                  <span>Customer</span>
                  <span>Date</span>
                  <span>Payment</span>
                  <span>Amount</span>
                  <span>Actions</span>
                </div>

                <div className="svx-sales-rows">
                  {visibleSales.map((sale) => (
                    <SaleRow
                      key={sale.id}
                      sale={sale}
                      onOpenCancel={openCancel}
                      cancelBusy={cancelBusy}
                    />
                  ))}
                </div>
              </div>

              <div className="svx-sales-list-footer">
                <p>
                  Showing {formatNumber(visibleSales.length)} of {formatNumber(filtered.length)} sale
                  {filtered.length === 1 ? "" : "s"}.
                </p>

                {hasMore ? (
                  <button type="button" onClick={handleLoadMore} className="svx-sales-button secondary">
                    Load 8 more
                  </button>
                ) : (
                  <span>End of list</span>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {cancelOpen ? (
        <div className="svx-sales-modal-backdrop">
          <div className="svx-sales-modal">
            <h2>Cancel sale</h2>
            <p>This returns the sold items to stock and marks the sale as cancelled.</p>

            <label>
              <span>Reason</span>
              <textarea
                placeholder="Example: customer changed their mind before leaving"
                value={cancelNote}
                onChange={(event) => setCancelNote(event.target.value)}
                disabled={cancelBusy}
              />
            </label>

            <div className="svx-sales-modal-actions">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={cancelBusy}
                className="svx-sales-button secondary"
              >
                Keep sale
              </button>

              <button
                type="button"
                disabled={cancelBusy}
                onClick={confirmCancel}
                className="svx-sales-button danger"
              >
                {cancelBusy ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
