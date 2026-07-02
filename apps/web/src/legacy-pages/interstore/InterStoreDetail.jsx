import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import {
  addDealPayment,
  getDeal,
  getDealPayments,
  markReturned,
} from "../../services/interStoreApi";
import {
  getCashDrawerStatus,
  isDrawerOpen,
} from "../../services/cashDrawerApi";
import "./InterStore.css";

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

function toDateTimeLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusMeta(status) {
  const key = cleanString(status).toUpperCase();
  const map = {
    BORROWED: {
      label: "Taken",
      className: "borrowed",
      next: "Collect payment, return stock, or keep watching this transfer.",
      actionLabel: "Collect or return",
    },
    RECEIVED: {
      label: "Taken",
      className: "received",
      next: "Collect payment, return stock, or keep watching this transfer.",
      actionLabel: "Collect or return",
    },
    SOLD: {
      label: "Money due",
      className: "sold",
      next: "Collect payment and close this transfer.",
      actionLabel: "Collect payment",
    },
    PAID: {
      label: "Paid",
      className: "paid",
      next: "This transfer is closed and fully paid.",
      actionLabel: "Closed",
    },
    RETURNED: {
      label: "Returned",
      className: "returned",
      next: "This transfer is closed because the products came back.",
      actionLabel: "Closed",
    },
  };

  return map[key] || {
    label: key || "Unknown",
    className: "returned",
    next: "Review this transfer.",
    actionLabel: "Review",
  };
}

function sourceLabel(deal) {
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

function BranchValue({ deal }) {
  const branch = branchParts(deal);

  if (branch.code || branch.name) {
    return (
      <span className="svx-transfer-branch-value">
        {branch.code ? <strong>{branch.code}</strong> : null}
        {branch.name ? <span>{branch.name}</span> : null}
      </span>
    );
  }

  return branch.fallback;
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
  return Math.max(0, unitPrice * payableQuantity(deal) - paid);
}

function StatusPill({ status }) {
  const meta = statusMeta(status);
  return <span className={`svx-transfer-status ${meta.className}`}>{meta.label}</span>;
}

function InfoCard({ label, value, note, strong = false }) {
  return (
    <div className={`svx-transfer-info-card ${strong ? "is-strong" : ""}`}>
      <div className="svx-transfer-label">{label}</div>
      <strong>{value || "—"}</strong>
      {note ? <p className="svx-transfer-field-hint">{note}</p> : null}
    </div>
  );
}

function TimelineStep({ done, index, title, text, tone }) {
  return (
    <div className={`svx-transfer-timeline-step ${done ? "is-done" : ""} ${tone ? `is-${tone}` : ""}`}>
      <div className="svx-transfer-timeline-mark">{done ? "✓" : index}</div>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function ActionModal({
  open,
  title,
  text,
  children,
  confirmLabel,
  loading,
  tone = "primary",
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  const buttonClass =
    tone === "danger"
      ? "svx-transfer-danger"
      : tone === "warning"
        ? "svx-transfer-warning"
        : tone === "success"
          ? "svx-transfer-success"
          : "svx-transfer-primary";

  return (
    <div className="svx-transfer-modal is-open">
      <div className="svx-transfer-modal-backdrop" onClick={loading ? undefined : onClose} />
      <div className="svx-transfer-modal-scroll">
        <div className="svx-transfer-modal-card" style={{ maxWidth: 720 }}>
          <div className="svx-transfer-modal-head">
            <div>
              <span className="svx-transfer-eyebrow">Store transfer</span>
              <h2>{title}</h2>
              {text ? <p>{text}</p> : null}
            </div>
            <button type="button" className="svx-transfer-secondary" onClick={onClose} disabled={loading}>
              Close
            </button>
          </div>
          <div className="svx-transfer-modal-body">{children}</div>
          <div className="svx-transfer-modal-actions">
            <button type="button" className="svx-transfer-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="button" className={buttonClass} onClick={onConfirm} disabled={loading}>
              {loading ? "Saving..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="svx-transfer-page svx-transfer-detail-page">
      <div className="svx-transfer-shell">
        <div className="svx-transfer-skeleton" style={{ height: 220 }} />
        <div className="svx-transfer-skeleton" style={{ height: 360 }} />
      </div>
    </div>
  );
}

export default function InterStoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [cashDrawerStatus, setCashDrawerStatus] = useState(null);
  const [cashDrawerLoading, setCashDrawerLoading] = useState(false);
  const [action, setAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [returnForm, setReturnForm] = useState({ returnedQuantity: "1", notes: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "CASH", note: "" });

  async function loadCashDrawerStatus(row) {
    try {
      setCashDrawerLoading(true);

      const branchId =
        row?.borrowerBranchId ||
        row?.borrowerBranch?.id ||
        row?.branch?.id ||
        null;

      const drawerStatus = await getCashDrawerStatus(branchId ? { branchId } : {});
      setCashDrawerStatus(drawerStatus);
    } catch (error) {
      console.warn("Failed to load cash drawer status", error);
      setCashDrawerStatus(null);
    } finally {
      setCashDrawerLoading(false);
    }
  }

  async function loadDetail() {
    try {
      setLoading(true);

      const row = await getDeal(id);
      setDeal(row);

      const paymentData = await getDealPayments(id);
      setPayments(Array.isArray(paymentData.payments) ? paymentData.payments : []);
      setPaymentSummary(paymentData.summary || null);
      setReturnForm((current) => ({ ...current, returnedQuantity: String(row?.quantity || 1) }));

      await loadCashDrawerStatus(row);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to load transfer");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) void loadDetail();
  }, [id]);

  async function runAction(callback, successMessage) {
    try {
      setActionLoading(true);
      await callback();
      toast.success(successMessage);
      setAction(null);
      await loadDetail();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  const statusKey = cleanString(deal?.status).toUpperCase();
  const meta = statusMeta(deal?.status);
  const quantity = Number(deal?.quantity || 0);
  const payableQty = payableQuantity(deal);
  const returnedQuantity = Number(deal?.returnedQuantity || 0);
  const closed = ["PAID", "RETURNED"].includes(statusKey);
  const risk = closed ? 0 : paymentRisk(deal);
  const expectedAmount =
    statusKey === "RETURNED"
      ? 0
      : paymentSummary?.owed ?? Number(deal?.soldPrice || deal?.agreedPrice || 0) * payableQty;
  const balanceDue = closed ? 0 : paymentSummary?.balanceDue ?? risk;
  const canAddPayment = ["BORROWED", "RECEIVED", "SOLD"].includes(statusKey);
  const canReturn = ["BORROWED", "RECEIVED"].includes(statusKey);

  const paymentMethodKey = cleanString(paymentForm.method).toUpperCase();
  const paymentAmount = Number(paymentForm.amount || 0);
  const isCashPayment = paymentMethodKey === "CASH";
  const cashDrawerIsOpen = isDrawerOpen(cashDrawerStatus);
  const cashPaymentBlocked = isCashPayment && !cashDrawerIsOpen;

  const paymentButtonDisabled =
    actionLoading ||
    paymentAmount <= 0 ||
    (isCashPayment && cashDrawerLoading) ||
    cashPaymentBlocked;

  async function submitPayment(event) {
    event.preventDefault();

    const amount = Number(paymentForm.amount || 0);
    if (amount <= 0) {
      toast.error("Enter payment amount");
      return;
    }

    if (cashPaymentBlocked) {
      toast.error("Open cash drawer before taking cash.");
      return;
    }

    await runAction(
      () => addDealPayment(deal.id, { amount, method: paymentForm.method, note: paymentForm.note }),
      "Payment added",
    );

    setPaymentForm({ amount: "", method: "CASH", note: "" });
  }

  const steps = useMemo(() => {
    return [
      {
        title: "Recorded",
        text: toDateTimeLabel(deal?.createdAt || deal?.borrowedAt),
        done: Boolean(deal?.createdAt || deal?.borrowedAt),
      },
      {
        title: "Taken",
        text: toDateTimeLabel(deal?.takenAt || deal?.borrowedAt || deal?.createdAt),
        done: Boolean(deal?.takenAt || deal?.borrowedAt || deal?.createdAt),
      },
      {
        title:
          statusKey === "RETURNED"
            ? "Returned"
            : statusKey === "PAID"
              ? "Paid"
              : statusKey === "SOLD"
                ? "Money due"
                : "Next action",
        text:
          statusKey === "RETURNED"
            ? toDateTimeLabel(deal?.returnedAt)
            : statusKey === "PAID"
              ? toDateTimeLabel(deal?.paidAt)
              : statusKey === "SOLD"
                ? "Waiting for remaining payment"
                : meta.next,
        done: ["SOLD", "PAID", "RETURNED"].includes(statusKey),
        tone: statusKey === "SOLD" ? "warning" : undefined,
      },
    ];
  }, [deal, meta.next, statusKey]);

  if (loading) return <PageSkeleton />;

  if (!deal) {
    return (
      <div className="svx-transfer-page svx-transfer-detail-page">
        <div className="svx-transfer-shell">
          <div className="svx-transfer-empty">
            <h3>Transfer not found</h3>
            <p>This transfer may have been removed or you may not have access to it.</p>
            <button type="button" className="svx-transfer-primary" onClick={() => navigate("/app/interstore")}>
              Back to transfers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="svx-transfer-page svx-transfer-detail-page">
      <div className="svx-transfer-shell">
        <section className="svx-transfer-card svx-transfer-detail-hero svx-transfer-detail-hero-clean">
          <div className="svx-transfer-detail-topbar">
            <Link className="svx-transfer-secondary" to="/app/interstore">
              Back
            </Link>
            <StatusPill status={deal.status} />
          </div>

          <div className="svx-transfer-detail-mainline">
            <div>
              <span className="svx-transfer-eyebrow">Store transfer</span>
              <h1>{deal.productName || "Unnamed item"}</h1>
              <p className="svx-transfer-subtitle">{meta.next}</p>
            </div>
            <div className="svx-transfer-next-card">
              <div className="svx-transfer-label">Next action</div>
              <strong>{meta.actionLabel}</strong>
              <span>{closed ? "Nothing else is required." : "Keep the owner view focused on this step."}</span>
            </div>
          </div>

          <div className="svx-transfer-detail-actions">
            {canReturn ? (
              <button type="button" className="svx-transfer-warning" onClick={() => setAction("return")}>
                Return stock
              </button>
            ) : null}
          </div>

          <div className="svx-transfer-owner-summary">
            <InfoCard label="Money at risk" value={formatMoney(risk)} note={closed ? "Closed transfer" : "Amount owner should keep watching"} strong />
            <InfoCard label="Shop branch" value={<BranchValue deal={deal} />} note="Current shop branch" />
            <InfoCard label="Taking stock" value={sourceLabel(deal)} note={deal.externalSupplierPhone || "Person or store taking the stock"} />
            <InfoCard label="Responsible person" value={deal.resellerName} note={deal.resellerPhone || "Person or place accountable"} />
            <InfoCard label="Tracking" value={deal.serial} note={deal.productCategory || deal.productColor || "Serial, SKU, batch or code"} />
            <InfoCard label="Quantity" value={`${quantity} moved`} note={`Payable: ${payableQty}  Returned: ${returnedQuantity}`} />
          </div>
        </section>

        <section className="svx-transfer-detail-grid svx-transfer-detail-grid-clean">
          <main className="svx-transfer-detail-main">
            <div className="svx-transfer-panel svx-transfer-movement-panel">
              <div className="svx-transfer-panel-headline">
                <div>
                  <span className="svx-transfer-kicker">Movement</span>
                  <h2>What happened</h2>
                </div>
                <span className={`svx-transfer-status ${meta.className}`}>{meta.label}</span>
              </div>
              <div className="svx-transfer-timeline-clean">
                {steps.map((step, index) => (
                  <TimelineStep key={step.title} index={index + 1} {...step} />
                ))}
              </div>
            </div>

            <div className="svx-transfer-panel">
              <span className="svx-transfer-kicker">Owner notes</span>
              <h2>Dates and values</h2>
              <div className="svx-transfer-info-grid svx-transfer-owner-grid">
                <InfoCard label="Agreed value" value={formatMoney(deal.agreedPrice)} note="Original value recorded" />
                <InfoCard label="Payable value" value={formatMoney(deal.soldPrice || deal.agreedPrice)} note="Amount expected from the receiver" />
                <InfoCard label="Paid so far" value={formatMoney(paymentSummary?.totalPaid ?? deal.paidAmount)} note="Collected against this transfer" />
                <InfoCard label="Due date" value={toDateLabel(deal.dueDate)} note="When payment or return is expected" />
                <InfoCard label="Taken date" value={toDateLabel(deal.takenAt)} note="When stock left the source" />
                <InfoCard label="Notes" value={deal.notes || "No notes"} note="Internal owner note" />
              </div>
            </div>
          </main>

          <aside className="svx-transfer-detail-side">
            <div className="svx-transfer-panel svx-transfer-settlement-panel">
              <span className="svx-transfer-kicker">Settlement</span>
              <h2>Money position</h2>
              <div className="svx-transfer-side-list">
                <div className="svx-transfer-side-item">
                  <strong>{formatMoney(expectedAmount)}</strong>
                  <span>Expected amount</span>
                </div>
                <div className="svx-transfer-side-item">
                  <strong>{formatMoney(paymentSummary?.totalPaid ?? deal.paidAmount)}</strong>
                  <span>Paid so far</span>
                </div>
                <div className="svx-transfer-side-item">
                  <strong>{formatMoney(balanceDue)}</strong>
                  <span>Balance due</span>
                </div>
              </div>

              {canAddPayment ? (
                <form className="svx-transfer-form-grid svx-transfer-payment-form" onSubmit={submitPayment}>
                  <div className="svx-transfer-form-field">
                    <label>Amount</label>
                    <input
                      className="svx-transfer-input"
                      type="number"
                      min="0"
                      value={paymentForm.amount}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="svx-transfer-form-field">
                    <label>Method</label>
                    <select
                      className="svx-transfer-select"
                      value={paymentForm.method}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))}
                    >
                      <option value="CASH">Cash</option>
                      <option value="MOMO">MoMo</option>
                      <option value="BANK">Bank</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="svx-transfer-form-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Note</label>
                    <input
                      className="svx-transfer-input"
                      value={paymentForm.note}
                      onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))}
                      placeholder="Optional"
                    />
                  </div>

                  {cashPaymentBlocked ? (
                    <p className="svx-transfer-field-hint" style={{ gridColumn: "1 / -1" }}>
                      Open cash drawer before taking cash.
                    </p>
                  ) : null}

                  <button type="submit" className="svx-transfer-primary" disabled={paymentButtonDisabled}>
                    {cashPaymentBlocked ? "Open cash drawer first" : actionLoading ? "Saving..." : "Add payment"}
                  </button>
                </form>
              ) : (
                <div className="svx-transfer-quiet-note">
                  {statusKey === "RETURNED"
                    ? "No payment action is needed because this transfer was returned."
                    : statusKey === "PAID"
                      ? "This transfer is fully paid."
                      : "Add payment when the receiver brings money back."}
                </div>
              )}

              <div className="svx-transfer-payments">
                {payments.length ? (
                  payments.map((payment) => (
                    <div key={payment.id} className="svx-transfer-payment-row">
                      <div>
                        <strong>{formatMoney(payment.amount)}</strong>
                        <span>{payment.method}</span>
                        <span>{toDateTimeLabel(payment.createdAt)}</span>
                      </div>
                      <span className="svx-transfer-status paid">Paid</span>
                    </div>
                  ))
                ) : (
                  <p className="svx-transfer-field-hint">No payments recorded yet.</p>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>

      <ActionModal
        open={action === "return"}
        title="Return this stock?"
        text="Use this when the products come back to this shop instead of being paid for."
        confirmLabel="Return stock"
        tone="warning"
        loading={actionLoading}
        onClose={() => setAction(null)}
        onConfirm={() =>
          runAction(
            () =>
              markReturned(deal.id, {
                returnedQuantity: Number(returnForm.returnedQuantity || 1),
                notes: returnForm.notes,
              }),
            "Transfer returned",
          )
        }
      >
        <div className="svx-transfer-form-grid">
          <div className="svx-transfer-form-field">
            <label>Returned quantity</label>
            <input
              className="svx-transfer-input"
              type="number"
              min="1"
              value={returnForm.returnedQuantity}
              onChange={(event) => setReturnForm((current) => ({ ...current, returnedQuantity: event.target.value }))}
            />
          </div>
          <div className="svx-transfer-form-field" style={{ gridColumn: "1 / -1" }}>
            <label>Note</label>
            <textarea
              className="svx-transfer-textarea"
              value={returnForm.notes}
              onChange={(event) => setReturnForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Optional return note"
            />
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
