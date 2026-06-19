import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import {
  addSalePayment,
  cancelSale as cancelSaleApi,
  createSaleRefund,
  getPaymentMethodLabel,
  getSaleReceipt,
  PAYMENT_METHOD_OPTIONS,
} from "../../services/posApi";
import { getReceiptPrintUrl } from "../../services/receiptsApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./PosReceipt.css";

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

function safeDate(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateTime(value) {
  const d = safeDate(value);
  if (!d) return "—";

  return d.toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateOnly(value) {
  const d = safeDate(value);
  if (!d) return "—";

  return d.toLocaleDateString("en-RW", {
    dateStyle: "medium",
  });
}

function clampInt(n, min, max) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function firstLogoUrl(...sources) {
  for (const source of sources) {
    const value =
      source?.logoUrl ||
      source?.logo ||
      source?.businessLogoUrl ||
      source?.branchLogoUrl ||
      source?.receiptLogoUrl ||
      source?.imageUrl;

    if (cleanString(value)) return cleanString(value);
  }

  return "";
}

function initialsFromName(value) {
  const words = cleanString(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) return "ST";

  return words
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function activeBranchNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (name) return name;
  if (code) return code;

  return "this branch";
}

function paymentLabel(value) {
  return getPaymentMethodLabel
    ? getPaymentMethodLabel(value)
    : cleanString(value) || "Not recorded";
}

function normalizeReceiptResponse(data) {
  if (!data) return null;

  const sale = data.sale || data.receipt || data;
  const storeSource = data.store || sale.store || data.business || sale.business || {};
  const branchSource = data.branch || sale.branch || {};
  const tenantSource = data.tenant || sale.tenant || {};

  const paymentList = Array.isArray(data.payments)
    ? data.payments
    : Array.isArray(sale.payments)
      ? sale.payments
      : data.payment
        ? [data.payment]
        : [];

  const branchCode =
    branchSource.code ||
    sale.branchCode ||
    data.branchCode ||
    cleanString(localStorage.getItem("activeBranchCode"));

  const branchName =
    branchSource.name ||
    sale.branchName ||
    data.branchName ||
    cleanString(localStorage.getItem("activeBranchName"));

  const businessName =
    storeSource.name ||
    storeSource.displayName ||
    storeSource.businessName ||
    tenantSource.name ||
    tenantSource.displayName ||
    sale.businessName ||
    data.businessName ||
    "Store";

  const logoUrl = firstLogoUrl(storeSource, branchSource, tenantSource, sale, data);

  return {
    ...sale,

    id: sale.id || data.id || data.receiptId,

    number:
      sale.receiptNumber ||
      sale.number ||
      data.receiptNumber ||
      data.number ||
      sale.id ||
      data.id,

    date: sale.createdAt || data.createdAt || data.date,
    createdAt: sale.createdAt || data.createdAt,

    total: sale.total || data.total || 0,

    subtotalAmount:
      sale.subtotalAmount ??
      data.subtotalAmount ??
      sale.subtotal ??
      data.subtotal ??
      null,

    taxableAmount:
      sale.taxableAmount ??
      data.taxableAmount ??
      null,

    taxName:
      sale.taxName ??
      data.taxName ??
      null,

    taxMode:
      sale.taxMode ??
      data.taxMode ??
      "NONE",

    taxDisplayMode:
      sale.taxDisplayMode ??
      data.taxDisplayMode ??
      "HIDDEN",

    taxRateBps:
      sale.taxRateBps ??
      data.taxRateBps ??
      0,

    taxAmount:
      sale.taxAmount ??
      data.taxAmount ??
      0,

    pricesIncludeTax: Boolean(sale.pricesIncludeTax ?? data.pricesIncludeTax ?? false),

    showTaxOnCustomerDocuments: Boolean(
      sale.showTaxOnCustomerDocuments ?? data.showTaxOnCustomerDocuments ?? false,
    ),

    amountPaid:
      sale.amountPaid ??
      data.amountPaid ??
      data.payment?.amount ??
      0,

    balanceDue: sale.balanceDue ?? data.balanceDue ?? 0,
    refundedTotal: sale.refundedTotal ?? data.refundedTotal ?? 0,

    saleType: sale.saleType || data.saleType || "CASH",
    status: sale.status || data.status || "PAID",
    dueDate: sale.dueDate || data.dueDate || null,

    customer: sale.customer || data.customer || null,

    cashierName:
      sale.cashier?.name ||
      sale.cashierName ||
      data.cashier?.name ||
      data.cashierName ||
      "—",

    store: {
      ...storeSource,
      name: businessName,
      logoUrl,
      branchCode,
      branchName,
      branchLocation:
        branchSource.location ||
        branchSource.address ||
        sale.branchLocation ||
        data.branchLocation ||
        "",
      phone:
        storeSource.phone ||
        branchSource.phone ||
        sale.businessPhone ||
        data.businessPhone ||
        "",
      email:
        storeSource.email ||
        branchSource.email ||
        sale.businessEmail ||
        data.businessEmail ||
        "",
      receiptHeader: storeSource.receiptHeader || data.receiptHeader || "",
      receiptFooter: storeSource.receiptFooter || data.receiptFooter || "",
    },

    items: Array.isArray(data.items)
      ? data.items
      : Array.isArray(sale.items)
        ? sale.items
        : [],

    payments: paymentList,

    warranties: Array.isArray(data.warranties)
      ? data.warranties
      : Array.isArray(sale.warranties)
        ? sale.warranties
        : [],

    cashMovement: data.cashMovement || null,
    depositMovement: data.depositMovement || null,
  };
}

function toMoneyNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function itemKey(item, index) {
  return (
    cleanString(item?.saleItemId) ||
    cleanString(item?.id) ||
    `${cleanString(item?.productId)}-${index}`
  );
}

function itemProductId(item) {
  return cleanString(item?.productId || item?.product?.id);
}

function itemName(item) {
  return (
    cleanString(item?.product?.name) ||
    cleanString(item?.productName) ||
    cleanString(item?.name) ||
    "Product"
  );
}

function itemCode(item) {
  return (
    cleanString(item?.sku) ||
    cleanString(item?.barcode) ||
    cleanString(item?.partNumber) ||
    cleanString(item?.partNo) ||
    cleanString(item?.product?.sku) ||
    cleanString(item?.product?.barcode) ||
    cleanString(item?.product?.partNumber) ||
    cleanString(item?.product?.partNo) ||
    cleanString(item?.serial) ||
    cleanString(item?.product?.serial) ||
    ""
  );
}

function itemQuantity(item) {
  return Number(item?.quantity || 0);
}

function itemPrice(item) {
  return Number(item?.price ?? item?.unitPrice ?? item?.sellPrice ?? 0);
}

function itemSubtotal(item) {
  return Number(item?.subtotal ?? item?.total ?? itemQuantity(item) * itemPrice(item));
}

function taxSnapshotFromReceipt(receipt, items = []) {
  const itemSubtotal = items.reduce((sum, item) => {
    const quantity = Number(itemQuantity(item) || 0);
    const unitPrice = Number(itemPrice(item) || 0);
    const lineTotal = Number(item?.total ?? item?.subtotal ?? quantity * unitPrice);

    return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
  }, 0);

  const taxMode = String(receipt?.taxMode || "NONE").trim().toUpperCase();
  const taxDisplayMode = String(receipt?.taxDisplayMode || "HIDDEN").trim().toUpperCase();
  const taxAmount = toMoneyNumber(receipt?.taxAmount, 0);
  const pricesIncludeTax = Boolean(receipt?.pricesIncludeTax);
  const showTaxOnCustomerDocuments = Boolean(receipt?.showTaxOnCustomerDocuments);

  const subtotalAmount =
    receipt?.subtotalAmount !== undefined && receipt?.subtotalAmount !== null
      ? toMoneyNumber(receipt.subtotalAmount, itemSubtotal)
      : receipt?.subtotal !== undefined && receipt?.subtotal !== null
        ? toMoneyNumber(receipt.subtotal, itemSubtotal)
        : itemSubtotal;

  const taxableAmount =
    receipt?.taxableAmount !== undefined && receipt?.taxableAmount !== null
      ? toMoneyNumber(receipt.taxableAmount, subtotalAmount)
      : pricesIncludeTax
        ? Math.max(0, subtotalAmount - taxAmount)
        : subtotalAmount;

  const total = toMoneyNumber(
    receipt?.total,
    pricesIncludeTax ? subtotalAmount : subtotalAmount + taxAmount,
  );

  const paid = toMoneyNumber(receipt?.amountPaid, 0);
  const balance = toMoneyNumber(receipt?.balanceDue, Math.max(0, total - paid));

  const showTaxLine =
    taxMode !== "NONE" &&
    taxDisplayMode === "CUSTOMER_FACING" &&
    showTaxOnCustomerDocuments &&
    taxAmount > 0;

  const taxName =
    cleanString(receipt?.taxName) ||
    (taxMode === "VAT_18"
      ? "VAT 18%"
      : taxMode === "TURNOVER_3_INTERNAL"
        ? "Turnover tax estimate 3%"
        : taxMode === "VAT_18_PLUS_TURNOVER_3"
          ? "Tax 21%"
          : taxMode === "CUSTOM"
            ? "Tax"
            : "Tax");

  return {
    subtotalAmount,
    taxableAmount,
    taxName,
    taxAmount,
    pricesIncludeTax,
    showTaxLine,
    total,
    paid,
    balance,
  };
}

function saleStatus(receipt) {
  const status = String(receipt?.status || "").toUpperCase();
  const saleType = String(receipt?.saleType || "").toUpperCase();
  const balance = Number(receipt?.balanceDue || 0);

  if (receipt?.isCancelled || status === "CANCELLED") {
    return {
      label: "Cancelled",
      tone: "danger",
      note: "This sale was cancelled.",
    };
  }

  if (status === "OVERDUE") {
    return {
      label: "Overdue",
      tone: "danger",
      note: "This customer needs follow-up.",
    };
  }

  if (balance > 0 || saleType === "CREDIT") {
    return {
      label: balance > 0 ? "Balance due" : "Pay later",
      tone: "warning",
      note:
        balance > 0
          ? `${formatMoney(balance)} still unpaid.`
          : "Customer will pay later.",
    };
  }

  return {
    label: "Paid",
    tone: "success",
    note: "Payment is complete.",
  };
}

function creditFollowUpMeta(receipt, balance) {
  if (!receipt || receipt.saleType !== "CREDIT") {
    return {
      label: "Not needed",
      tone: "neutral",
      dueText: "Not needed",
      message: "This sale was paid now.",
    };
  }

  if (Number(balance || 0) <= 0) {
    return {
      label: "Fully paid",
      tone: "success",
      dueText: "Paid off",
      message: "This pay-later sale is fully paid.",
    };
  }

  const dueDate = receipt.dueDate;
  if (!dueDate) {
    return {
      label: "No due date",
      tone: "warning",
      dueText: "No due date saved",
      message: `${formatMoney(balance)} is still unpaid.`,
    };
  }

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    return {
      label: "Check due date",
      tone: "warning",
      dueText: "Invalid due date",
      message: `${formatMoney(balance)} is still unpaid.`,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const days = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (days < 0) {
    return {
      label: `${Math.abs(days)}d overdue`,
      tone: "danger",
      dueText: formatDateOnly(dueDate),
      message: `${formatMoney(balance)} is overdue. Follow up with the customer.`,
    };
  }

  if (days === 0) {
    return {
      label: "Due today",
      tone: "warning",
      dueText: formatDateOnly(dueDate),
      message: `${formatMoney(balance)} is due today.`,
    };
  }

  if (days === 1) {
    return {
      label: "Due tomorrow",
      tone: "warning",
      dueText: formatDateOnly(dueDate),
      message: `${formatMoney(balance)} is due tomorrow.`,
    };
  }

  return {
    label: `Due in ${days}d`,
    tone: "neutral",
    dueText: formatDateOnly(dueDate),
    message: `${formatMoney(balance)} is still unpaid.`,
  };
}

function CreditFollowUpCard({ receipt, balance, paid, customerNameValue, meta }) {
  if (!receipt || receipt.saleType !== "CREDIT") return null;

  return (
    <section className={cx("svx-receipt-credit-alert", `is-${meta.tone}`)}>
      <div className="svx-receipt-credit-alert-copy">
        <p className="svx-receipt-kicker">Pay later follow-up</p>
        <h2>{meta.label}</h2>
        <p>{meta.message}</p>
      </div>

      <div className="svx-receipt-credit-alert-grid">
        <DetailLine label="Customer" value={customerNameValue || "Walk-in customer"} />
        <DetailLine label="Due date" value={meta.dueText} />
        <DetailLine label="Paid so far" value={formatMoney(paid)} />
        <DetailLine label="Balance" value={formatMoney(balance)} />
      </div>
    </section>
  );
}

function StatusBadge({ tone = "neutral", children }) {
  return <span className={cx("svx-receipt-badge", `is-${tone}`)}>{children}</span>;
}

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 8V3h10v5" />
      <path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v7H7z" />
    </svg>
  );
}

function IconRefund() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function StoreMark({ store }) {
  const storeName = cleanString(store?.name) || activeBranchNameFromStorage();

  if (store?.logoUrl) {
    return (
      <img
        src={store.logoUrl}
        alt={`${storeName} logo`}
        className="svx-receipt-store-logo"
      />
    );
  }

  return <div className="svx-receipt-store-mark">{initialsFromName(storeName)}</div>;
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  return (
    <article className="svx-receipt-metric">
      <span className={cx("svx-receipt-dot", `is-${tone}`)} />
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="svx-receipt-detail-line">
      <small>{label}</small>
      <b>{value || "—"}</b>
    </div>
  );
}

function ReceiptSkeleton() {
  return (
    <main className="svx-receipt-page">
      <section className="svx-receipt-skeleton is-hero" />
      <section className="svx-receipt-metrics">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="svx-receipt-skeleton is-metric" />
        ))}
      </section>
      <section className="svx-receipt-skeleton is-main" />
    </main>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="svx-receipt-empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function ReceiptItem({ item }) {
  const quantity = itemQuantity(item);
  const price = itemPrice(item);
  const total = itemSubtotal(item);

  return (
    <article className="svx-receipt-item">
      <div className="svx-receipt-item-main">
        <h3>{itemName(item)}</h3>
        <p>{itemCode(item) || "No item reference shown"}</p>

        <div className="svx-receipt-item-tags">
          <span>{formatNumber(quantity)} sold</span>
          <span>{formatMoney(price)} each</span>
        </div>
      </div>

      <div className="svx-receipt-item-money">
        <small>Line total</small>
        <b>{formatMoney(total)}</b>
      </div>
    </article>
  );
}

function PaymentHistory({ payments, paid }) {
  if (!payments.length) {
    return (
      <div className="svx-receipt-payment-empty">
        {paid > 0 ? "Payment was received for this sale." : "No payment recorded."}
      </div>
    );
  }

  return (
    <div className="svx-receipt-payment-list">
      {payments.map((payment, index) => (
        <div key={payment.id || index} className="svx-receipt-payment-row">
          <div>
            <b>{paymentLabel(payment.method || payment.paymentMethod)}</b>
            <span>{formatDateTime(payment.createdAt || payment.date)}</span>
          </div>
          <strong>{formatMoney(payment.amount)}</strong>
        </div>
      ))}
    </div>
  );
}

function MoneyBreakdown({ receipt, items }) {
  const tax = taxSnapshotFromReceipt(receipt, items);

  return (
    <section className="svx-receipt-section">
      <div className="svx-receipt-section-head">
        <div>
          <p className="svx-receipt-kicker">Money summary</p>
          <h2>Sale breakdown</h2>
        </div>
        {tax.showTaxLine ? (
          <StatusBadge tone="warning">Tax shown</StatusBadge>
        ) : (
          <StatusBadge>No customer tax</StatusBadge>
        )}
      </div>

      <div className="svx-receipt-total-box">
        {tax.showTaxLine && tax.pricesIncludeTax ? (
          <>
            <div className="svx-receipt-total-line">
              <span>Subtotal before tax</span>
              <b>{formatMoney(tax.taxableAmount)}</b>
            </div>
            <div className="svx-receipt-total-line">
              <span>{tax.taxName}</span>
              <b>{formatMoney(tax.taxAmount)}</b>
            </div>
          </>
        ) : (
          <>
            <div className="svx-receipt-total-line">
              <span>Items subtotal</span>
              <b>{formatMoney(tax.subtotalAmount)}</b>
            </div>
            {tax.showTaxLine ? (
              <div className="svx-receipt-total-line">
                <span>{tax.taxName}</span>
                <b>{formatMoney(tax.taxAmount)}</b>
              </div>
            ) : null}
          </>
        )}

        <div className="svx-receipt-total-grid">
          <div>
            <small>Final total</small>
            <b>{formatMoney(tax.total)}</b>
          </div>
          <div>
            <small>Paid</small>
            <b className="is-success">{formatMoney(tax.paid)}</b>
          </div>
          <div>
            <small>Balance</small>
            <b className={tax.balance > 0 ? "is-warning" : ""}>{formatMoney(tax.balance)}</b>
          </div>
        </div>
      </div>
    </section>
  );
}

function WarrantyBlock({ receipt, saleDate, store }) {
  const warranties = Array.isArray(receipt?.warranties) ? receipt.warranties : [];

  return (
    <section className="svx-receipt-section">
      <div className="svx-receipt-section-head">
        <div>
          <p className="svx-receipt-kicker">Support record</p>
          <h2>Support / warranty coverage</h2>
          <span>Keep this record for after-sale support, warranty, service, or return verification.</span>
        </div>
      </div>

      {!warranties.length ? (
        <div className="svx-receipt-muted-box">
          <b>No support or warranty recorded</b>
          <p>When support terms, warranty, or service notes are added, this section will show reference number, active dates, and notes.</p>
        </div>
      ) : (
        <div className="svx-receipt-warranty-list">
          {warranties.map((warranty, index) => {
            const starts = safeDate(warranty.startsAt);
            const ends = safeDate(warranty.endsAt);

            return (
              <div key={warranty.id || index} className="svx-receipt-warranty-card">
                <div>
                  <b>{warranty.warrantyNumber || `Warranty ${index + 1}`}</b>
                  <p>{warranty.policy || "After-sale support coverage recorded for this sale."}</p>
                </div>
                <div>
                  <span>Start: {starts ? formatDateOnly(starts) : "—"}</span>
                  <span>End: {ends ? formatDateOnly(ends) : "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="svx-receipt-warranty-foot">
        <span>{store?.branchName || store?.name || "Store"}</span>
        <span>Receipt: {receipt?.number || receipt?.id || "—"}</span>
        <span>Date: {saleDate ? formatDateOnly(saleDate) : "—"}</span>
      </div>
    </section>
  );
}

function RefundModal({
  open,
  receipt,
  quantities,
  setQuantities,
  method,
  setMethod,
  reason,
  setReason,
  note,
  setNote,
  saving,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  const items = Array.isArray(receipt?.items) ? receipt.items : [];

  function setQty(item, index, value) {
    const key = itemKey(item, index);
    const max = itemQuantity(item);
    const n = clampInt(value, 0, max);

    setQuantities((prev) => ({
      ...prev,
      [key]: n,
    }));
  }

  const selectedTotal = items.reduce((sum, item, index) => {
    const key = itemKey(item, index);
    return sum + Number(quantities[key] || 0) * itemPrice(item);
  }, 0);

  const selectedCount = items.reduce((sum, item, index) => {
    const key = itemKey(item, index);
    return sum + Number(quantities[key] || 0);
  }, 0);

  return (
    <div className="svx-receipt-modal-backdrop">
      <div className="svx-receipt-modal">
        <header className="svx-receipt-modal-head">
          <div>
            <p className="svx-receipt-kicker">Refund</p>
            <h2>Return items from this sale</h2>
            <p>Choose returned quantities and how money is given back.</p>
          </div>

          <button type="button" onClick={onClose} disabled={saving} className="svx-receipt-icon-button">
            <IconClose />
          </button>
        </header>

        <div className="svx-receipt-modal-body">
          <section className="svx-receipt-refund-items">
            {items.map((item, index) => {
              const key = itemKey(item, index);
              const max = itemQuantity(item);
              const current = clampInt(quantities[key] ?? 0, 0, max);

              return (
                <article key={key} className="svx-receipt-refund-row">
                  <div>
                    <h3>{itemName(item)}</h3>
                    <p>Sold: {formatNumber(max)} — {formatMoney(itemPrice(item))} each</p>
                    {!itemProductId(item) ? (
                      <span>Refund cannot be saved because product reference is missing.</span>
                    ) : null}
                  </div>

                  <div className="svx-receipt-qty-control">
                    <button type="button" disabled={saving} onClick={() => setQty(item, index, current - 1)}>
                      −
                    </button>
                    <input
                      inputMode="numeric"
                      value={String(current)}
                      onChange={(event) => setQty(item, index, event.target.value)}
                      disabled={saving}
                    />
                    <button type="button" disabled={saving} onClick={() => setQty(item, index, current + 1)}>
                      +
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="svx-receipt-refund-side">
            <section className="svx-receipt-modal-card">
              <h3>Refund summary</h3>
              <div className="svx-receipt-refund-summary">
                <DetailLine label="Units selected" value={formatNumber(selectedCount)} />
                <DetailLine label="Money to return" value={formatMoney(selectedTotal)} />
              </div>
            </section>

            <section className="svx-receipt-modal-card">
              <label>
                <span>Return method</span>
                <select value={method} onChange={(event) => setMethod(event.target.value)} disabled={saving}>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Reason</span>
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Example: customer returned item"
                  disabled={saving}
                />
              </label>

              <label>
                <span>Note</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional note"
                  disabled={saving}
                />
              </label>
            </section>

            <section className="svx-receipt-modal-actions">
              <button type="button" onClick={onClose} disabled={saving} className="svx-receipt-button secondary">
                Cancel
              </button>

              <button type="button" disabled={saving} onClick={onSubmit} className="svx-receipt-button danger">
                {saving ? "Saving..." : "Save refund"}
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function PosReceipt() {
  const { id } = useParams();
  const [, setSearchParams] = useSearchParams();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNote, setPayNote] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [refundReason, setRefundReason] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [refundQtyByKey, setRefundQtyByKey] = useState({});

  async function load() {
    setLoading(true);

    try {
      const data = await getSaleReceipt(id);
      setReceipt(normalizeReceiptResponse(data));
    } catch (error) {
      console.error(error);

      if (handleSubscriptionBlockedError(error, { toastId: "receipt-load-blocked" })) {
        setReceipt(null);
      } else {
        toast.error(error?.message || "Failed to load receipt");
        setReceipt(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("refund") === "1") {
      setRefundOpen(true);
      setSearchParams({});
    }
  }, [setSearchParams]);

  const store = receipt?.store || null;
  const saleDate = safeDate(receipt?.date || receipt?.createdAt);
  const items = Array.isArray(receipt?.items) ? receipt.items : [];
  const payments = Array.isArray(receipt?.payments) ? receipt.payments : [];

  const moneyBreakdown = useMemo(() => {
    return taxSnapshotFromReceipt(receipt, items);
  }, [receipt, items]);

  const subtotal = moneyBreakdown.subtotalAmount;
  const paid = moneyBreakdown.paid;
  const balance = moneyBreakdown.balance;
  const refundedTotal = Number(receipt?.refundedTotal || 0);
  const total = moneyBreakdown.total;
  const itemCount = items.reduce((sum, item) => sum + itemQuantity(item), 0);
  const paymentCount = payments.length;

  const paymentNote =
    paymentCount > 0
      ? `${paymentCount} payment${paymentCount === 1 ? "" : "s"} recorded`
      : paid > 0
        ? "Payment received"
        : "No payment recorded";

  const status = saleStatus(receipt);
  const followUp = creditFollowUpMeta(receipt, balance);
  const receiptCustomerName =
    cleanString(receipt?.customer?.name) ||
    cleanString(receipt?.customerName) ||
    "Walk-in customer";

  const canAddPayment = useMemo(() => {
    if (!receipt) return false;

    return (
      receipt.saleType === "CREDIT" &&
      Number(receipt.balanceDue || 0) > 0 &&
      receipt.isCancelled !== true
    );
  }, [receipt]);

  const canCancel = useMemo(() => {
    if (!receipt) return false;
    if (receipt.isCancelled === true) return false;
    if (receipt.saleType !== "CASH") return false;
    if (Number(receipt.refundedTotal || 0) > 0) return false;

    return true;
  }, [receipt]);

  const canRefund = useMemo(() => {
    if (!receipt) return false;
    if (receipt.isCancelled === true) return false;

    const refundable = Math.max(
      0,
      Number(receipt.amountPaid || 0) - Number(receipt.refundedTotal || 0),
    );

    return refundable > 0;
  }, [receipt]);

  async function submitPayment(event) {
    event.preventDefault();

    if (!canAddPayment || paymentBusy) return;

    const amount = Number(String(payAmount || "").replace(/[^\d]/g, ""));

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (amount > balance) {
      toast.error("Payment cannot be more than the remaining balance");
      return;
    }

    setPaymentBusy(true);

    try {
      await addSalePayment(id, {
        amount,
        method: payMethod,
        note: cleanString(payNote) || null,
      });

      toast.success("Payment recorded");
      setPayAmount("");
      setPayNote("");
      await load();
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "sale-payment-blocked" })) {
        return;
      }

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to add payment",
      );
    } finally {
      setPaymentBusy(false);
    }
  }

  async function confirmCancel() {
    setCancelBusy(true);

    try {
      await cancelSaleApi(id, { note: cleanString(cancelNote) || null });

      toast.success("Sale cancelled");
      setCancelOpen(false);
      setCancelNote("");
      await load();
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "sale-cancel-blocked" })) {
        return;
      }

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to cancel sale",
      );
    } finally {
      setCancelBusy(false);
    }
  }

  function openRefund() {
    const initial = {};

    items.forEach((item, index) => {
      initial[itemKey(item, index)] = 0;
    });

    setRefundQtyByKey(initial);
    setRefundMethod("CASH");
    setRefundReason("");
    setRefundNote("");
    setRefundOpen(true);
  }

  const refundPreview = useMemo(() => {
    const chosen = [];
    let refundTotal = 0;

    items.forEach((item, index) => {
      const key = itemKey(item, index);
      const maxQty = itemQuantity(item);
      const quantity = clampInt(refundQtyByKey[key] ?? 0, 0, maxQty);

      if (quantity <= 0) return;

      const unit = itemPrice(item);
      const lineTotal = unit * quantity;

      chosen.push({
        productId: itemProductId(item),
        quantity,
        unit,
        lineTotal,
        productName: itemName(item),
      });

      refundTotal += lineTotal;
    });

    return { items: chosen, total: refundTotal };
  }, [items, refundQtyByKey]);

  async function confirmRefund() {
    if (!receipt) return;

    const refundItems = refundPreview.items
      .filter((item) => item.productId && item.quantity > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

    if (!refundItems.length) {
      toast.error("Choose at least one item to refund");
      return;
    }

    if (!cleanString(refundReason)) {
      toast.error("Add a reason for the refund");
      return;
    }

    setRefundBusy(true);

    try {
      await createSaleRefund(id, {
        items: refundItems,
        method: refundMethod,
        reason: cleanString(refundReason),
        note: cleanString(refundNote) || null,
      });

      toast.success("Refund saved");
      setRefundOpen(false);
      setRefundQtyByKey({});
      setRefundReason("");
      setRefundNote("");
      await load();
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "sale-refund-blocked" })) {
        return;
      }

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save refund",
      );
    } finally {
      setRefundBusy(false);
    }
  }

  const printUrl = receipt?.id ? getReceiptPrintUrl(receipt.id) : "#";
  const previewRoute = receipt?.id
    ? `/app/documents/receipts/${encodeURIComponent(receipt.id)}/preview`
    : "/app/documents/receipts";

  if (loading) return <ReceiptSkeleton />;

  if (!receipt) {
    return (
      <main className="svx-receipt-page">
        <section className="svx-receipt-card svx-receipt-not-found">
          <h1>Receipt not found</h1>
          <p>This receipt could not be loaded.</p>

          <div>
            <Link to="/app/pos/sales" className="svx-receipt-button secondary">
              Sales list
            </Link>
            <Link to="/app/pos" className="svx-receipt-button primary">
              New sale
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="svx-receipt-page">
      <RefundModal
        open={refundOpen}
        receipt={receipt}
        quantities={refundQtyByKey}
        setQuantities={setRefundQtyByKey}
        method={refundMethod}
        setMethod={setRefundMethod}
        reason={refundReason}
        setReason={setRefundReason}
        note={refundNote}
        setNote={setRefundNote}
        saving={refundBusy}
        onClose={() => {
          if (!refundBusy) setRefundOpen(false);
        }}
        onSubmit={confirmRefund}
      />

      <section className="svx-receipt-hero">
        <div className="svx-receipt-hero-copy">
          <p className="svx-receipt-kicker">Sale receipt</p>
          <div className="svx-receipt-title-row">
            <h1>Receipt detail</h1>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </div>
          <p>
            {receipt.number || receipt.id || "Receipt"} — {formatDateTime(receipt.date || receipt.createdAt)}
          </p>
        </div>

        <div className="svx-receipt-hero-actions">
          <Link to="/app/pos/sales" className="svx-receipt-button secondary">
            <IconBack />
            Sales list
          </Link>
          <Link to={previewRoute} className="svx-receipt-button secondary">
            Preview
          </Link>
          <a href={printUrl} target="_blank" rel="noreferrer" className="svx-receipt-button primary">
            <IconPrint />
            Print
          </a>
          <button
            type="button"
            onClick={openRefund}
            disabled={!canRefund}
            className={canRefund ? "svx-receipt-button soft-danger" : "svx-receipt-button secondary"}
          >
            <IconRefund />
            Refund
          </button>
        </div>
      </section>

      <section className="svx-receipt-metrics">
        <SummaryCard
          label="Total"
          value={formatMoney(total)}
          note={`${formatNumber(itemCount)} unit${itemCount === 1 ? "" : "s"} sold`}
          tone="success"
        />
        <SummaryCard label="Paid" value={formatMoney(paid)} note={paymentNote} tone={paid > 0 ? "success" : "neutral"} />
        <SummaryCard label="Balance" value={formatMoney(balance)} note={balance > 0 ? "Still unpaid" : "Nothing left to pay"} tone={balance > 0 ? "warning" : "success"} />
        <SummaryCard label="Refunded" value={formatMoney(refundedTotal)} note={refundedTotal > 0 ? "Returned to customer" : "No refund yet"} tone={refundedTotal > 0 ? "danger" : "neutral"} />
      </section>

      <section className="svx-receipt-card svx-receipt-store-card">
        <div className="svx-receipt-store-info">
          <StoreMark store={store} />
          <div>
            <p className="svx-receipt-kicker">Sold from</p>
            <h2>{store?.branchName || store?.name || activeBranchNameFromStorage()}</h2>
            <p>
              {[store?.branchCode, store?.branchLocation].filter(Boolean).join(" — ") ||
                store?.name ||
                "Official sale receipt"}
            </p>
            <div className="svx-receipt-store-contact">
              {store?.phone ? <span>Tel: {store.phone}</span> : null}
              {store?.email ? <span>Email: {store.email}</span> : null}
            </div>
          </div>
        </div>

        <div className="svx-receipt-store-status">
          <DetailLine label="Sale type" value={receipt.saleType === "CREDIT" ? "Pay later" : "Paid now"} />
          <DetailLine label="Status" value={status.label} />
        </div>
      </section>

      <CreditFollowUpCard
        receipt={receipt}
        balance={balance}
        paid={paid}
        customerNameValue={receiptCustomerName}
        meta={followUp}
      />

      <div className="svx-receipt-main-grid">
        <section className="svx-receipt-left">
          <section className="svx-receipt-section">
            <div className="svx-receipt-section-head">
              <div>
                <p className="svx-receipt-kicker">Items sold</p>
                <h2>Items on this receipt</h2>
                <span>Quantity, selling price, and line total for each item.</span>
              </div>
            </div>

            {items.length ? (
              <div className="svx-receipt-items">
                {items.map((item, index) => (
                  <ReceiptItem key={itemKey(item, index)} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState title="No items shown" text="This receipt does not include item lines." />
            )}
          </section>

          <MoneyBreakdown receipt={receipt} items={items} />

          <WarrantyBlock receipt={receipt} saleDate={saleDate} store={store} />
        </section>

        <aside className="svx-receipt-side">
          <section className="svx-receipt-section">
            <div className="svx-receipt-section-head">
              <div>
                <p className="svx-receipt-kicker">Customer</p>
                <h2>Buyer details</h2>
              </div>
            </div>

            <div className="svx-receipt-detail-grid">
              <DetailLine label="Name" value={receiptCustomerName} />
              <DetailLine label="Phone" value={receipt.customer?.phone || receipt.customerPhone || "Not saved"} />
              <DetailLine label="Email" value={receipt.customer?.email || "Not saved"} />
              <DetailLine label="TIN" value={receipt.customer?.tinNumber || "Not saved"} />
            </div>
          </section>

          <section className="svx-receipt-section">
            <div className="svx-receipt-section-head">
              <div>
                <p className="svx-receipt-kicker">Sale control</p>
                <h2>Sale details</h2>
              </div>
            </div>

            <div className="svx-receipt-detail-grid">
              <DetailLine label="Cashier" value={receipt.cashierName || "—"} />
              <DetailLine label="Branch" value={store?.branchName || activeBranchNameFromStorage()} />
              <DetailLine label="Sale type" value={receipt.saleType === "CREDIT" ? "Pay later" : "Paid now"} />
              <DetailLine label="Due date" value={receipt.dueDate ? formatDateOnly(receipt.dueDate) : "Not needed"} />
            </div>
          </section>

          <section className="svx-receipt-section">
            <div className="svx-receipt-section-head">
              <div>
                <p className="svx-receipt-kicker">Payments</p>
                <h2>Payment record</h2>
              </div>
            </div>

            <PaymentHistory payments={payments} paid={paid} />
          </section>

          {canAddPayment ? (
            <form onSubmit={submitPayment} className="svx-receipt-section">
              <div className="svx-receipt-section-head">
                <div>
                  <p className="svx-receipt-kicker">Later payment</p>
                  <h2>Record customer payment</h2>
                  <span>{receiptCustomerName} still owes {formatMoney(balance)}. Save the money received today.</span>
                </div>
              </div>

              <div className="svx-receipt-form-grid">
                <label>
                  <span>Amount</span>
                  <input
                    value={payAmount}
                    onChange={(event) => setPayAmount(event.target.value)}
                    inputMode="numeric"
                    placeholder={`Up to ${formatMoney(balance)}`}
                    disabled={paymentBusy}
                  />
                </label>

                <label>
                  <span>Method</span>
                  <select
                    value={payMethod}
                    onChange={(event) => setPayMethod(event.target.value)}
                    disabled={paymentBusy}
                  >
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="is-wide">
                  <span>Note</span>
                  <input
                    value={payNote}
                    onChange={(event) => setPayNote(event.target.value)}
                    placeholder="Optional note"
                    disabled={paymentBusy}
                  />
                </label>
              </div>

              <button type="submit" disabled={paymentBusy} className="svx-receipt-button primary is-full">
                {paymentBusy ? "Saving..." : "Save later payment"}
              </button>
            </form>
          ) : null}

          <section className="svx-receipt-section">
            <div className="svx-receipt-section-head">
              <div>
                <p className="svx-receipt-kicker">Actions</p>
                <h2>Manage receipt</h2>
              </div>
            </div>

            <div className="svx-receipt-side-actions">
              <Link to="/app/pos/sales" className="svx-receipt-button secondary">
                Sales list
              </Link>
              <Link to="/app/pos" className="svx-receipt-button primary">
                New sale
              </Link>
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                disabled={!canCancel}
                className={canCancel ? "svx-receipt-button danger" : "svx-receipt-button secondary"}
              >
                Cancel sale
              </button>
            </div>

            {!canCancel ? (
              <p className="svx-receipt-action-note">
                Sale cancellation is available only for active paid-now sales without refunds.
              </p>
            ) : null}
          </section>
        </aside>
      </div>

      {cancelOpen ? (
        <div className="svx-receipt-modal-backdrop">
          <div className="svx-receipt-modal is-small">
            <header className="svx-receipt-modal-head">
              <div>
                <p className="svx-receipt-kicker">Cancel sale</p>
                <h2>Cancel this sale?</h2>
                <p>This returns sold items to stock and marks this receipt as cancelled.</p>
              </div>

              <button type="button" onClick={() => setCancelOpen(false)} disabled={cancelBusy} className="svx-receipt-icon-button">
                <IconClose />
              </button>
            </header>

            <div className="svx-receipt-modal-card">
              <label>
                <span>Reason</span>
                <textarea
                  value={cancelNote}
                  onChange={(event) => setCancelNote(event.target.value)}
                  placeholder="Example: customer changed their mind before leaving"
                  disabled={cancelBusy}
                />
              </label>
            </div>

            <div className="svx-receipt-modal-actions">
              <button type="button" onClick={() => setCancelOpen(false)} disabled={cancelBusy} className="svx-receipt-button secondary">
                Keep sale
              </button>
              <button type="button" onClick={confirmCancel} disabled={cancelBusy} className="svx-receipt-button danger">
                {cancelBusy ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
