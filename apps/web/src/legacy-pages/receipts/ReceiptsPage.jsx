import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { listReceipts, getReceiptDetail, getReceiptPrintUrl } from "../../services/receiptsApi";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function formatMoney(value) {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `RWF ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(safeAmount)}`;
}

function safeDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDate(value) {
  const date = safeDate(value);
  return date ? date.toLocaleDateString("en-RW", { dateStyle: "medium" }) : "—";
}

function formatDateTime(value) {
  const date = safeDate(value);
  return date
    ? date.toLocaleString("en-RW", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
}

function strongText() {
  return "text-[var(--color-text)]";
}

function mutedText() {
  return "text-[var(--color-text-muted)]";
}

function softText() {
  return "text-[var(--color-text-soft)]";
}

function shell() {
  return "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function panel() {
  return "rounded-[24px] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return [
    "h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]",
    "px-3.5 text-sm font-medium text-[var(--color-text)] outline-none transition",
    "placeholder:text-[var(--color-text-muted)]",
    "focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ].join(" ");
}

function buttonBase() {
  return "inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
}

function primaryBtn() {
  return cx(
    buttonBase(),
    "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:opacity-95",
  );
}

function secondaryBtn() {
  return cx(
    buttonBase(),
    "bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:opacity-90",
  );
}

function badgeClass(kind = "neutral") {
  if (kind === "success") return "badge-success";
  if (kind === "warning") return "badge-warning";
  if (kind === "danger") return "badge-danger";
  if (kind === "info") return "badge-info";
  return "badge-neutral";
}

function statusKind(status) {
  const value = String(status || "").toUpperCase();

  if (value === "PAID") return "success";
  if (value === "PARTIAL" || value === "UNPAID") return "warning";
  if (value === "OVERDUE" || value === "CANCELLED") return "danger";

  return "neutral";
}

function saleTypeKind(type) {
  const value = String(type || "").toUpperCase();

  if (value === "CASH") return "success";
  if (value === "CREDIT") return "warning";

  return "neutral";
}

function moneyNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function itemQuantity(item) {
  return moneyNumber(item?.quantity, 0);
}

function itemPrice(item) {
  return moneyNumber(item?.price ?? item?.unitPrice ?? item?.sellPrice, 0);
}

function itemSubtotal(item) {
  return moneyNumber(
    item?.subtotal ?? item?.total ?? itemQuantity(item) * itemPrice(item),
    0,
  );
}

function defaultTaxName(taxMode, fallback = "") {
  const clean = cleanString(fallback);
  if (clean) return clean;

  if (taxMode === "VAT_18") return "VAT 18%";
  if (taxMode === "TURNOVER_3_INTERNAL") return "Turnover tax estimate 3%";
  if (taxMode === "VAT_18_PLUS_TURNOVER_3") return "Tax 21%";
  if (taxMode === "CUSTOM") return "Tax";

  return "Tax";
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    const quantity = itemQuantity(item);
    const price = itemPrice(item);

    return {
      ...item,
      quantity,
      price,
      subtotal: itemSubtotal(item),
      productName:
        cleanString(item.productName) ||
        cleanString(item.name) ||
        cleanString(item.product?.name) ||
        "Unnamed product",
      sku: cleanString(item.sku || item.product?.sku),
      barcode: cleanString(item.barcode || item.product?.barcode),
      serial: cleanString(item.serial || item.product?.serial),
    };
  });
}

function receiptMoney(receipt) {
  const items = normalizeItems(receipt?.items);
  const itemSubtotal = items.reduce((sum, item) => sum + itemSubtotal(item), 0);

  const taxMode = String(receipt?.taxMode || "NONE").trim().toUpperCase();
  const taxDisplayMode = String(receipt?.taxDisplayMode || "HIDDEN").trim().toUpperCase();
  const taxAmount = moneyNumber(receipt?.taxAmount, 0);
  const deliveryFee = Math.max(
    0,
    moneyNumber(
      receipt?.deliveryFee,
      0,
    ),
  );
  const taxRateBps = moneyNumber(receipt?.taxRateBps, 0);
  const pricesIncludeTax = Boolean(receipt?.pricesIncludeTax);
  const showTaxOnCustomerDocuments = Boolean(receipt?.showTaxOnCustomerDocuments);

  const subtotal =
    receipt?.subtotalAmount !== undefined && receipt?.subtotalAmount !== null
      ? moneyNumber(receipt.subtotalAmount, itemSubtotal)
      : receipt?.subtotal !== undefined && receipt?.subtotal !== null
        ? moneyNumber(receipt.subtotal, itemSubtotal)
        : itemSubtotal;

  const taxableAmount =
    receipt?.taxableAmount !== undefined && receipt?.taxableAmount !== null
      ? moneyNumber(receipt.taxableAmount, subtotal)
      : pricesIncludeTax
        ? Math.max(0, subtotal - taxAmount)
        : subtotal;

  const total = moneyNumber(
    receipt?.total,
    (
      pricesIncludeTax
        ? subtotal
        : subtotal + taxAmount
    ) + deliveryFee,
  );

  const paid = moneyNumber(receipt?.amountPaid, 0);
  const balance = moneyNumber(receipt?.balanceDue, Math.max(0, total - paid));
  const refunded = moneyNumber(receipt?.refundedTotal, 0);

  const showTaxLine =
    taxMode !== "NONE" &&
    taxDisplayMode === "CUSTOMER_FACING" &&
    showTaxOnCustomerDocuments &&
    taxAmount > 0;

  return {
    items,
    itemSubtotal,
    subtotal,
    deliveryFee,
    taxableAmount,
    taxAmount,
    taxRateBps,
    taxMode,
    taxDisplayMode,
    taxName: defaultTaxName(taxMode, receipt?.taxName),
    pricesIncludeTax,
    showTaxOnCustomerDocuments,
    showTaxLine,
    total,
    paid,
    balance,
    refunded,
  };
}

function normalizeReceipt(row = {}) {
  const receipt = row.receipt || row.sale || row;
  const money = receiptMoney(receipt);

  return {
    ...receipt,
    id: receipt.id || row.id || row.receiptId || "",
    number:
      receipt.number ||
      receipt.receiptNumber ||
      row.number ||
      row.receiptNumber ||
      receipt.id ||
      row.id ||
      "Receipt",
    invoiceNumber: receipt.invoiceNumber || row.invoiceNumber || null,
    date: receipt.date || receipt.createdAt || row.date || row.createdAt || null,
    createdAt: receipt.createdAt || row.createdAt || null,
    customerName:
      receipt.customerName ||
      row.customerName ||
      receipt.customer?.name ||
      row.customer?.name ||
      "Walk-in Customer",
    customerPhone:
      receipt.customerPhone ||
      row.customerPhone ||
      receipt.customer?.phone ||
      row.customer?.phone ||
      "",
    cashierName:
      receipt.cashierName ||
      row.cashierName ||
      receipt.cashier?.name ||
      row.cashier?.name ||
      "—",
    saleType: receipt.saleType || row.saleType || "CASH",
    status: receipt.status || row.status || "PAID",
    total: money.total,
    subtotal: money.subtotal,
    subtotalAmount: money.subtotal,
    taxableAmount: money.taxableAmount,
    taxName: money.taxName,
    taxMode: money.taxMode,
    taxDisplayMode: money.taxDisplayMode,
    taxRateBps: money.taxRateBps,
    taxAmount: money.taxAmount,
    pricesIncludeTax: money.pricesIncludeTax,
    showTaxOnCustomerDocuments: money.showTaxOnCustomerDocuments,
    amountPaid: money.paid,
    balanceDue: money.balance,
    refundedTotal: money.refunded,
    items: money.items,
    customer: receipt.customer || row.customer || null,
    payments: Array.isArray(receipt.payments)
      ? receipt.payments
      : Array.isArray(row.payments)
        ? row.payments
        : [],
    store: receipt.store || row.store || {},
  };
}

function SummaryCard({ label, value, note, tone = "neutral", loading = false }) {
  const accent =
    tone === "danger"
      ? "bg-[var(--color-danger)]"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "success"
          ? "bg-emerald-500"
          : "bg-[var(--color-primary)]";

  return (
    <div className={cx(shell(), "relative overflow-hidden p-4")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accent)} />

      <div className="pl-2">
        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.16em]", softText())}>
          {label}
        </div>

        {loading ? (
          <>
            <div className="mt-3 h-8 w-28 animate-pulse rounded bg-[var(--color-surface-2)]" />
            <div className="mt-2 h-4 w-40 animate-pulse rounded bg-[var(--color-surface-2)]" />
          </>
        ) : (
          <>
            <div className={cx("mt-2 text-2xl font-black tracking-[-0.03em]", strongText())}>
              {value}
            </div>
            {note ? <div className={cx("mt-1 text-sm leading-5", mutedText())}>{note}</div> : null}
          </>
        )}
      </div>
    </div>
  );
}

function MoneyLine({ label, value, note, tone = "neutral", large = false }) {
  const valueTone =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-red-600"
          : strongText();

  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-3 last:border-b-0">
      <div>
        <div className={cx(large ? "text-base" : "text-sm", "font-black", strongText())}>
          {label}
        </div>
        {note ? <div className={cx("mt-1 text-xs leading-5", mutedText())}>{note}</div> : null}
      </div>

      <div className={cx(large ? "text-xl" : "text-sm", "text-right font-black", valueTone)}>
        {formatMoney(value)}
      </div>
    </div>
  );
}

function ReceiptMoneyPanel({ receipt }) {
  const money = receiptMoney(receipt);

  return (
    <div className={cx(panel(), "p-4")}>
      <div className={cx("text-xs font-semibold uppercase tracking-[0.14em]", softText())}>
        Sale breakdown
      </div>

      <div className="mt-3 overflow-hidden rounded-[20px] bg-[var(--color-card)] px-4">
        {money.showTaxLine && money.pricesIncludeTax ? (
          <>
            <MoneyLine
              label="Subtotal before tax"
              note="Tax is already included in item prices"
              value={money.taxableAmount}
            />
            <MoneyLine
              label={money.taxName}
              note="Included tax amount"
              value={money.taxAmount}
              tone="warning"
            />
            <MoneyLine
              label="Products subtotal"
              note="Total item price including tax"
              value={money.subtotal}
            />
          </>
        ) : (
          <>
            <MoneyLine
              label="Products subtotal"
              note="Before customer-facing tax"
              value={money.subtotal}
            />

            {money.showTaxLine ? (
              <MoneyLine
                label={money.taxName}
                note="Added to final total"
                value={money.taxAmount}
                tone="warning"
              />
            ) : null}
          </>
        )}

        {money.deliveryFee > 0 ? (
          <MoneyLine
            label="Delivery"
            note="Delivery cost"
            value={money.deliveryFee}
          />
        ) : null}

        {!money.showTaxLine ? (
          <div className="border-b border-[var(--color-border)] py-3">
            <div className={cx("text-sm font-black", strongText())}>Customer-facing tax</div>
            <div className={cx("mt-1 text-xs leading-5", mutedText())}>
              No customer-facing tax is shown for this receipt.
            </div>
          </div>
        ) : null}

        <MoneyLine label="Final total" value={money.total} large />
        <MoneyLine label="Paid" value={money.paid} tone="success" />
        <MoneyLine
          label="Balance"
          value={money.balance}
          tone={money.balance > 0 ? "warning" : "neutral"}
        />

        {money.refunded > 0 ? (
          <MoneyLine label="Refunded" value={money.refunded} tone="danger" />
        ) : null}
      </div>
    </div>
  );
}

function CardSkeletonRows({ rows = 6 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={cx(shell(), "animate-pulse p-4")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="h-5 w-40 rounded-full bg-[var(--color-surface-2)]" />
              <div className="mt-3 h-4 w-64 max-w-full rounded-full bg-[var(--color-surface-2)]" />
              <div className="mt-3 h-4 w-52 max-w-full rounded-full bg-[var(--color-surface-2)]" />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <div className="h-10 w-24 rounded-2xl bg-[var(--color-surface-2)]" />
              <div className="h-10 w-24 rounded-2xl bg-[var(--color-surface-2)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, note }) {
  return (
    <div className={cx(shell(), "p-10 text-center")}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5L5 21V5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9 8h6M9 12h6M9 16h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h3 className={cx("mt-4 text-lg font-black tracking-tight", strongText())}>{title}</h3>
      <p className={cx("mt-2 text-sm leading-6", mutedText())}>{note}</p>
    </div>
  );
}

function ReceiptDetailDrawer({ open, onClose, receipt, loading }) {
  if (!open) return null;

  const normalizedReceipt = receipt ? normalizeReceipt(receipt) : null;
  const money = receiptMoney(normalizedReceipt);
  const printUrl = normalizedReceipt?.id ? getReceiptPrintUrl(normalizedReceipt.id) : "#";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close drawer"
        onClick={onClose}
      />

      <div className="relative h-full w-full max-w-3xl overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-card)]/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={cx("text-xs font-semibold uppercase tracking-[0.16em]", softText())}>
                Receipt detail
              </div>

              <div className={cx("mt-1 text-xl font-black tracking-tight", strongText())}>
                {normalizedReceipt?.number || "Receipt"}
              </div>
            </div>

            <div className="flex gap-2">
              {normalizedReceipt?.id ? (
                <a href={printUrl} target="_blank" rel="noreferrer" className={primaryBtn()}>
                  Print
                </a>
              ) : null}

              <button type="button" onClick={onClose} className={secondaryBtn()}>
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <CardSkeletonRows rows={4} />
          ) : !normalizedReceipt ? (
            <EmptyState title="Receipt not found" note="Unable to load receipt details." />
          ) : (
            <div className="space-y-5">
              <section className={cx(shell(), "p-5")}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    {normalizedReceipt.store?.logoUrl ? (
                      <img
                        src={normalizedReceipt.store.logoUrl}
                        alt="Store logo"
                        className="h-12 w-12 rounded-xl border border-[var(--color-border)] bg-white object-contain p-1.5"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-xs font-black text-[var(--color-text-muted)]">
                        LOGO
                      </div>
                    )}

                    <div>
                      <div className={cx("text-lg font-black tracking-tight", strongText())}>
                        {normalizedReceipt.store?.name || "Store"}
                      </div>

                      <div className={cx("mt-1 text-xs leading-5", mutedText())}>
                        {normalizedReceipt.store?.phone ? <div>Tel: {normalizedReceipt.store.phone}</div> : null}
                        {normalizedReceipt.store?.email ? <div>Email: {normalizedReceipt.store.email}</div> : null}
                      </div>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <div className={cx("text-2xl font-black tracking-wide", strongText())}>
                      RECEIPT
                    </div>

                    <div className={cx("mt-1 text-xs leading-5", mutedText())}>
                      <div>Receipt No: {normalizedReceipt.number || "—"}</div>
                      <div>Date: {formatDateTime(normalizedReceipt.date || normalizedReceipt.createdAt)}</div>
                      <div>Staff: {normalizedReceipt.cashierName || "—"}</div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 md:justify-end">
                      <span className={badgeClass(statusKind(normalizedReceipt.status))}>
                        {String(normalizedReceipt.status || "UNKNOWN").toUpperCase()}
                      </span>

                      <span className={badgeClass(saleTypeKind(normalizedReceipt.saleType))}>
                        {String(normalizedReceipt.saleType || "—").toUpperCase()}
                      </span>

                      {money.showTaxLine ? (
                        <span className={badgeClass("warning")}>TAX SHOWN</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className={cx(panel(), "p-4")}>
                    <div className={cx("text-xs font-semibold uppercase tracking-[0.14em]", softText())}>
                      Customer
                    </div>

                    <div className={cx("mt-2 text-sm font-bold", strongText())}>
                      {normalizedReceipt.customer?.name || normalizedReceipt.customerName || "Walk-in Customer"}
                    </div>

                    <div className={cx("mt-1 text-sm", mutedText())}>
                      {normalizedReceipt.customer?.phone || normalizedReceipt.customerPhone || "—"}
                    </div>
                  </div>

                  <ReceiptMoneyPanel receipt={normalizedReceipt} />
                </div>
              </section>

              <section className={cx(shell(), "overflow-hidden")}>
                <div className="border-b border-[var(--color-border)] px-5 py-4">
                  <div className={cx("text-lg font-black tracking-tight", strongText())}>Items</div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--color-surface-2)]">
                      <tr className={mutedText()}>
                        <th className="px-5 py-3 text-left">Item</th>
                        <th className="px-5 py-3 text-left">Details</th>
                        <th className="px-5 py-3 text-right">Qty</th>
                        <th className="px-5 py-3 text-right">Price</th>
                        <th className="px-5 py-3 text-right">Subtotal</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[var(--color-border)]">
                      {(normalizedReceipt.items || []).map((item, index) => (
                        <tr key={item.saleItemId || item.id || index}>
                          <td className="px-5 py-4">
                            <div className={cx("font-bold", strongText())}>
                              {item.productName || "Unnamed product"}
                            </div>
                          </td>

                          <td className={cx("px-5 py-4 text-xs", mutedText())}>
                            {item.sku
                              ? `SKU: ${item.sku}`
                              : item.barcode
                                ? `Barcode: ${item.barcode}`
                                : item.serial
                                  ? `Serial: ${item.serial}`
                                  : "—"}
                          </td>

                          <td className={cx("px-5 py-4 text-right", mutedText())}>
                            {item.quantity}
                          </td>
                          <td className={cx("px-5 py-4 text-right", mutedText())}>
                            {formatMoney(item.price)}
                          </td>

                          <td className={cx("px-5 py-4 text-right font-black", strongText())}>
                            {formatMoney(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {(normalizedReceipt.payments || []).length ? (
                <section className={cx(shell(), "p-5")}>
                  <div className={cx("text-lg font-black tracking-tight", strongText())}>Payments</div>

                  <div className="mt-4 space-y-3">
                    {normalizedReceipt.payments.map((payment, index) => (
                      <div key={payment.id || index} className={cx(panel(), "p-4")}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className={cx("text-sm font-bold", strongText())}>
                              {formatMoney(payment.amount)}
                            </div>

                            <div className={cx("mt-1 text-xs", mutedText())}>
                              Method: {payment.method || "—"}
                            </div>

                            <div className={cx("mt-1 text-xs", mutedText())}>
                              {formatDateTime(payment.createdAt)}
                            </div>
                          </div>

                          {payment.note ? (
                            <div className={cx("max-w-xs text-right text-xs", mutedText())}>
                              {payment.note}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReceiptCard({ row, onView }) {
  const receipt = normalizeReceipt(row);
  const money = receiptMoney(receipt);
  const printUrl = getReceiptPrintUrl(receipt.id);

  return (
    <article className={cx(shell(), "overflow-hidden p-4 transition hover:ring-1 hover:ring-[var(--color-primary-ring)] sm:p-5")}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cx("text-base font-black tracking-tight", strongText())}>
              {receipt.number || "Receipt"}
            </h3>

            <span className={badgeClass(statusKind(receipt.status))}>
              {String(receipt.status || "UNKNOWN").toUpperCase()}
            </span>

            <span className={badgeClass(saleTypeKind(receipt.saleType))}>
              {String(receipt.saleType || "—").toUpperCase()}
            </span>

            {money.showTaxLine ? (
              <span className={badgeClass("warning")}>
                {money.taxName}
              </span>
            ) : null}
          </div>

          {receipt.invoiceNumber ? (
            <div className={cx("mt-1 text-xs font-medium", mutedText())}>
              Invoice: {receipt.invoiceNumber}
            </div>
          ) : null}

          <div className={cx("mt-3 grid gap-1 text-sm sm:grid-cols-2", mutedText())}>
            <div>
              <span className="font-semibold text-[var(--color-text)]">Customer:</span>{" "}
              {receipt.customerName || "Walk-in Customer"}
            </div>

            <div>
              <span className="font-semibold text-[var(--color-text)]">Phone:</span>{" "}
              {receipt.customerPhone || "—"}
            </div>

            <div>
              <span className="font-semibold text-[var(--color-text)]">Staff:</span>{" "}
              {receipt.cashierName || "—"}
            </div>

            <div>
              <span className="font-semibold text-[var(--color-text)]">Date:</span>{" "}
              {formatDate(receipt.date || receipt.createdAt)}
            </div>
          </div>
        </div>

        <div className="shrink-0 xl:min-w-[320px]">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <div className={cx(panel(), "px-3 py-2")}>
              <div className={cx("text-[10px] font-black uppercase tracking-[0.14em]", softText())}>
                Subtotal
              </div>
              <div className={cx("mt-1 text-sm font-black", strongText())}>
                {formatMoney(money.subtotal)}
              </div>
            </div>

            {money.deliveryFee > 0 ? (
              <div className={cx(panel(), "px-3 py-2")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.14em]", softText())}>
                  Delivery
                </div>
                <div className={cx("mt-1 text-sm font-black", strongText())}>
                  {formatMoney(money.deliveryFee)}
                </div>
              </div>
            ) : null}

            {money.showTaxLine ? (
              <div className={cx(panel(), "px-3 py-2")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.14em]", softText())}>
                  {money.taxName}
                </div>
                <div className="mt-1 text-sm font-black text-amber-600">
                  {formatMoney(money.taxAmount)}
                </div>
              </div>
            ) : null}

            <div className={cx(panel(), "px-3 py-2")}>
              <div className={cx("text-[10px] font-black uppercase tracking-[0.14em]", softText())}>
                Final total
              </div>
              <div className={cx("mt-1 text-sm font-black", strongText())}>
                {formatMoney(money.total)}
              </div>
            </div>

            <div className={cx(panel(), "px-3 py-2")}>
              <div className={cx("text-[10px] font-black uppercase tracking-[0.14em]", softText())}>
                Paid
              </div>
              <div className="mt-1 text-sm font-black text-emerald-600">
                {formatMoney(money.paid)}
              </div>
            </div>

            <div className={cx(panel(), "px-3 py-2")}>
              <div className={cx("text-[10px] font-black uppercase tracking-[0.14em]", softText())}>
                Balance
              </div>
              <div
                className={cx(
                  "mt-1 text-sm font-black",
                  money.balance > 0 ? "text-amber-600" : strongText(),
                )}
              >
                {formatMoney(money.balance)}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap justify-start gap-2 xl:justify-end">
            <button type="button" onClick={() => onView(receipt.id)} className={secondaryBtn()}>
              View
            </button>

            <a href={printUrl} target="_blank" rel="noreferrer" className={primaryBtn()}>
              Print
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ReceiptsPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [rows, setRows] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailReceipt, setDetailReceipt] = useState(null);

  async function loadReceipts(search = "", { silent = false } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await listReceipts(search);
      const receipts = Array.isArray(response?.receipts) ? response.receipts : [];

      setRows(receipts.map(normalizeReceipt));
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to load receipts");
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function openDetail(id) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailReceipt(null);

    try {
      const response = await getReceiptDetail(id);
      setDetailReceipt(response?.receipt ? normalizeReceipt(response.receipt) : null);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to load receipt detail");
      setDetailReceipt(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadReceipts(submittedQuery);
  }, [submittedQuery]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const money = receiptMoney(row);

        acc.count += 1;
        acc.subtotal += money.subtotal;
        acc.tax += money.showTaxLine ? money.taxAmount : 0;
        acc.total += money.total;
        acc.paid += money.paid;
        acc.balance += money.balance;

        return acc;
      },
      {
        count: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        paid: 0,
        balance: 0,
      },
    );
  }, [rows]);

  function submitSearch(event) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  function clearSearch() {
    setQuery("");
    setSubmittedQuery("");
  }

  return (
    <>
      <div className="space-y-5">
        <section className={cx(shell(), "overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className={cx("text-xs font-semibold uppercase tracking-[0.16em]", softText())}>
                  Documents
                </div>

                <h1 className={cx("mt-2 text-3xl font-black tracking-tight", strongText())}>
                  Receipts
                </h1>

                <p className={cx("mt-2 text-sm leading-6", mutedText())}>
                  Review generated receipts, inspect payment details clearly, and open print-ready
                  versions for professional customer proof.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AsyncButton
                  type="button"
                  loading={refreshing}
                  loadingText="Refreshing..."
                  onClick={() => loadReceipts(submittedQuery, { silent: true })}
                  className={secondaryBtn()}
                >
                  Refresh
                </AsyncButton>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-4 sm:px-6">
            <SummaryCard
              label="Receipts"
              value={summary.count}
              note="Loaded in current result set"
              loading={loading}
            />

            <SummaryCard
              label="Total value"
              value={formatMoney(summary.total)}
              note={`Subtotal ${formatMoney(summary.subtotal)}`}
              tone="success"
              loading={loading}
            />

            <SummaryCard
              label="Tax shown"
              value={formatMoney(summary.tax)}
              note="Customer-facing tax in loaded receipts"
              tone={summary.tax > 0 ? "warning" : "neutral"}
              loading={loading}
            />

            <SummaryCard
              label="Balance"
              value={formatMoney(summary.balance)}
              note={`Paid ${formatMoney(summary.paid)}`}
              tone={summary.balance > 0 ? "warning" : "neutral"}
              loading={loading}
            />
          </div>
        </section>

        <section className={cx(shell(), "p-4 sm:p-5")}>
          <form onSubmit={submitSearch} className="flex flex-col gap-3 lg:flex-row">
            <input
              className={inputClass()}
              placeholder="Search by receipt number, invoice number, customer, phone, or staff..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <div className="flex gap-2">
              <AsyncButton type="submit" loading={loading && Boolean(query.trim())} variant="primary">
                Search
              </AsyncButton>

              <button type="button" className={secondaryBtn()} onClick={clearSearch}>
                Clear
              </button>
            </div>
          </form>
        </section>

        {loading ? (
          <CardSkeletonRows rows={7} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No receipts found"
            note={
              submittedQuery
                ? "Try another search term."
                : "When sales are completed, receipts will appear here."
            }
          />
        ) : (
          <section className="space-y-3">
            {rows.map((row) => (
              <ReceiptCard key={row.id} row={row} onView={openDetail} />
            ))}
          </section>
        )}
      </div>

      <ReceiptDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        receipt={detailReceipt}
        loading={detailLoading}
      />
    </>
  );
}
