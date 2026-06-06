import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import {
  addSalePayment,
  getSaleReceipt,
  cancelSale as cancelSaleApi,
  createSaleRefund,
  getPaymentMethodLabel,
  PAYMENT_METHOD_OPTIONS,
} from "../../services/posApi";
import { getReceiptPrintUrl } from "../../services/receiptsApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

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

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
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

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "this branch";
}

function pageCard() {
  return "rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[24px] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)] disabled:cursor-not-allowed disabled:opacity-60";
}

function textareaClass() {
  return "min-h-[110px] w-full rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)] disabled:cursor-not-allowed disabled:opacity-60";
}

function buttonBase() {
  return "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60";
}

function primaryBtn() {
  return cx(
    buttonBase(),
    "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function secondaryBtn() {
  return cx(
    buttonBase(),
    "bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function successBtn() {
  return cx(
    buttonBase(),
    "bg-emerald-600 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function warningBtn() {
  return cx(
    buttonBase(),
    "bg-amber-500 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function dangerBtn() {
  return cx(
    buttonBase(),
    "bg-red-600 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function softDangerBtn() {
  return cx(
    buttonBase(),
    "bg-red-500/10 text-red-600 shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
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

function paymentLabel(value) {
  return getPaymentMethodLabel
    ? getPaymentMethodLabel(value)
    : cleanString(value) || "Not recorded";
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

    pricesIncludeTax: Boolean(
      sale.pricesIncludeTax ??
        data.pricesIncludeTax ??
        false,
    ),

    showTaxOnCustomerDocuments: Boolean(
      sale.showTaxOnCustomerDocuments ??
        data.showTaxOnCustomerDocuments ??
        false,
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
  const taxRateBps = toMoneyNumber(receipt?.taxRateBps, 0);
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
    taxMode,
    taxDisplayMode,
    taxRateBps,
    taxAmount,
    pricesIncludeTax,
    showTaxOnCustomerDocuments,
    showTaxLine,
    total,
    paid,
    balance,
  };
}

function MoneyBreakdownCard({ receipt, items }) {
  const tax = taxSnapshotFromReceipt(receipt, items);

  return (
    <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6 print:shadow-none")}>
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl print:hidden" />

      <div className="relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Money summary
            </p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
              Sale breakdown
            </h2>
            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Stored sale amounts from the saved receipt. These values should match the printed document.
            </p>
          </div>

          {tax.showTaxLine ? (
            <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-amber-600">
              Tax shown
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              No customer tax
            </span>
          )}
        </div>

        <div className="mt-5 rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          {tax.showTaxLine && tax.pricesIncludeTax ? (
            <>
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <div className="text-sm font-black text-[var(--color-text)]">
                    Subtotal before tax
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                    Tax is already included in item prices
                  </div>
                </div>

                <div className="text-right text-base font-black text-[var(--color-text)]">
                  {formatMoney(tax.taxableAmount)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] py-3">
                <div>
                  <div className="text-sm font-black text-[var(--color-text)]">
                    {tax.taxName}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                    Included tax amount
                  </div>
                </div>

                <div className="text-right text-base font-black text-amber-600">
                  {formatMoney(tax.taxAmount)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] py-3">
                <div>
                  <div className="text-sm font-black text-[var(--color-text)]">
                    Products subtotal
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                    Total item price including tax
                  </div>
                </div>

                <div className="text-right text-base font-black text-[var(--color-text)]">
                  {formatMoney(tax.subtotalAmount)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <div className="text-sm font-black text-[var(--color-text)]">
                    Products subtotal
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                    Before customer-facing tax
                  </div>
                </div>

                <div className="text-right text-base font-black text-[var(--color-text)]">
                  {formatMoney(tax.subtotalAmount)}
                </div>
              </div>

              {tax.showTaxLine ? (
                <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] py-3">
                  <div>
                    <div className="text-sm font-black text-[var(--color-text)]">
                      {tax.taxName}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                      Added to final total
                    </div>
                  </div>

                  <div className="text-right text-base font-black text-amber-600">
                    {formatMoney(tax.taxAmount)}
                  </div>
                </div>
              ) : null}
            </>
          )}

          <div className="mt-2 grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-3">
            <div className="rounded-[22px] bg-[var(--color-card)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Final total
              </p>
              <p className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                {formatMoney(tax.total)}
              </p>
            </div>

            <div className="rounded-[22px] bg-[var(--color-card)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Paid
              </p>
              <p className="mt-2 text-lg font-black tracking-[-0.02em] text-emerald-600">
                {formatMoney(tax.paid)}
              </p>
            </div>

            <div className="rounded-[22px] bg-[var(--color-card)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Balance
              </p>
              <p
                className={cx(
                  "mt-2 text-lg font-black tracking-[-0.02em]",
                  tax.balance > 0 ? "text-amber-600" : "text-[var(--color-text)]",
                )}
              >
                {formatMoney(tax.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ tone = "neutral", children }) {
  const cls =
    tone === "danger"
      ? "bg-red-500/10 text-red-600"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-600"
        : tone === "success"
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em]",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function StoreBadge({ store }) {
  const storeName = cleanString(store?.name) || activeBranchNameFromStorage();
  const initials = initialsFromName(storeName);

  if (store?.logoUrl) {
    return (
      <img
        src={store.logoUrl}
        alt={`${storeName} logo`}
        className="h-16 w-16 shrink-0 rounded-[22px] border border-[var(--color-border)] bg-white object-contain p-2 shadow-[var(--shadow-soft)]"
      />
    );
  }

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-[rgba(74,163,255,0.28)] bg-[linear-gradient(135deg,rgba(74,163,255,0.24),rgba(16,185,129,0.12))] shadow-[var(--shadow-soft)]">
      <div className="pointer-events-none absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/10 blur-xl" />
      <span className="relative text-base font-black tracking-[-0.02em] text-[var(--color-text)]">
        {initials}
      </span>
    </div>
  );
}

function StoreHeader({ store, receipt, status }) {
  const branchCode = cleanString(store?.branchCode);
  const branchName = cleanString(store?.branchName);
  const branchLocation = cleanString(store?.branchLocation);
  const branchLine = [branchCode, branchLocation].filter(Boolean).join(" • ");

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <StoreBadge store={store} />

        <div className="min-w-0">
          <h2 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
            {branchName || store?.name || activeBranchNameFromStorage()}
          </h2>

          <p className="mt-1 text-sm font-bold text-[var(--color-text-muted)]">
            {branchLine || store?.name || "Official sale receipt"}
          </p>

          <div className="mt-3 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
            {store?.receiptHeader ? (
              <div className="whitespace-pre-wrap">{store.receiptHeader}</div>
            ) : (
              <div>Official sale receipt and payment record.</div>
            )}

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {store?.phone ? <span>Tel: {store.phone}</span> : null}
              {store?.email ? <span>Email: {store.email}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 text-left lg:text-right">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Receipt
        </p>

        <div className="mt-3 flex flex-wrap gap-2 lg:justify-end">
          <StatusBadge tone={receipt.saleType === "CREDIT" ? "warning" : "success"}>
            {receipt.saleType === "CREDIT" ? "Pay later" : "Paid now"}
          </StatusBadge>

          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>

        <div className="mt-3 space-y-1 text-sm font-semibold text-[var(--color-text-muted)]">
          <div>{receipt.number || receipt.id || "Receipt"}</div>
          <div>Date: {formatDateTime(receipt.date || receipt.createdAt)}</div>
          <div>Cashier: {receipt.cashierName || "—"}</div>
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-[22px] bg-[var(--color-surface-2)]",
        className,
      )}
    />
  );
}

function ReceiptSkeleton() {
  return (
    <div className="space-y-5">
      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-4 h-10 w-72 max-w-full rounded-[18px]" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className={cx(pageCard(), "p-5")}>
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-28" />
            <SkeletonBlock className="mt-2 h-4 w-36" />
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={cx(pageCard(), "p-5")}>
          <SkeletonBlock className="h-8 w-44" />
          <div className="mt-5 space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <SkeletonBlock key={item} className="h-24 w-full" />
            ))}
          </div>
        </section>

        <section className={cx(pageCard(), "p-5")}>
          <SkeletonBlock className="h-8 w-32" />
          <SkeletonBlock className="mt-5 h-36 w-full" />
        </section>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 8V3h10v5" />
      <path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v7H7z" />
    </svg>
  );
}

function RefundIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 14 4 9l5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const dot =
    tone === "danger"
      ? "bg-red-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "success"
          ? "bg-emerald-500"
          : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-5")}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[rgba(74,163,255,0.08)] blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <span className={cx("h-2.5 w-2.5 rounded-full", dot)} />
        </div>

        <p className="mt-3 truncate text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">
          {value}
        </p>

        {note ? (
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
            {note}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className={cx(softPanel(), "p-4")}>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-[var(--color-text)]">
        {value || "—"}
      </p>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[30px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center">
      <h3 className="text-lg font-black text-[var(--color-text)]">{title}</h3>
      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>
    </div>
  );
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
    cleanString(item?.serial) ||
    cleanString(item?.product?.sku) ||
    cleanString(item?.product?.barcode) ||
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
  return Number(
    item?.subtotal ?? item?.total ?? itemQuantity(item) * itemPrice(item),
  );
}

function ReceiptItemCard({ item }) {
  return (
    <article className={cx(softPanel(), "p-4")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-black text-[var(--color-text)]">
            {itemName(item)}
          </h3>

          <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
            {itemCode(item) || "No code shown"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge>{formatNumber(itemQuantity(item))} sold</StatusBadge>
            <StatusBadge>{formatMoney(itemPrice(item))} each</StatusBadge>
          </div>
        </div>

        <div className="text-left lg:text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
            Line total
          </p>
          <p className="mt-1 text-xl font-black tracking-[-0.02em] text-[var(--color-text)]">
            {formatMoney(itemSubtotal(item))}
          </p>
        </div>
      </div>
    </article>
  );
}

function WarrantyBlock({ receipt, saleDate, store }) {
  const warranties = Array.isArray(receipt?.warranties)
    ? receipt.warranties
    : [];
  const hasWarranty = warranties.length > 0;

  return (
    <section className={cx(pageCard(), "p-5 sm:p-6")}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Warranty
          </p>
          <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
            Warranty coverage
          </h2>
          <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
            Keep this record for product support and service verification.
          </p>
        </div>

        <div className="text-sm font-semibold leading-6 text-[var(--color-text-muted)] md:text-right">
          {store?.branchName ? (
            <div className="font-black text-[var(--color-text)]">
              {store.branchName}
            </div>
          ) : null}
          <div>Receipt: {receipt?.number || receipt?.id || "—"}</div>
          <div>Date: {saleDate ? saleDate.toLocaleDateString() : "—"}</div>
        </div>
      </div>

      {!hasWarranty ? (
        <div className={cx(softPanel(), "mt-5 p-5")}>
          <div className="text-sm font-black text-[var(--color-text)]">
            No warranty recorded
          </div>
          <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
            When warranties are added, this section will show reference number,
            active dates, and support notes.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {warranties.map((warranty, index) => {
            const starts = safeDate(warranty.startsAt);
            const ends = safeDate(warranty.endsAt);

            return (
              <div
                key={warranty.id || index}
                className={cx(softPanel(), "p-5")}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-base font-black text-[var(--color-text)]">
                      {warranty.warrantyNumber || `Warranty ${index + 1}`}
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--color-text-muted)]">
                      Support coverage recorded for this sale.
                    </p>
                  </div>

                  <div className="text-sm font-semibold leading-6 text-[var(--color-text-muted)] md:text-right">
                    <div>
                      Start: {starts ? starts.toLocaleDateString() : "—"}
                    </div>
                    <div>End: {ends ? ends.toLocaleDateString() : "—"}</div>
                  </div>
                </div>

                {warranty.policy ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                    <span className="font-black text-[var(--color-text)]">
                      Policy:
                    </span>{" "}
                    {warranty.policy}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
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
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[94dvh] w-full max-w-5xl overflow-hidden rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Refund
            </p>

            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
              Return items from this sale
            </h2>

            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Choose returned quantities and how money is given back.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="max-h-[calc(94dvh-96px)] overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-3">
              {items.map((item, index) => {
                const key = itemKey(item, index);
                const max = itemQuantity(item);
                const current = clampInt(quantities[key] ?? 0, 0, max);

                return (
                  <article key={key} className={cx(softPanel(), "p-4")}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-[var(--color-text)]">
                          {itemName(item)}
                        </h3>

                        <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                          Sold: {formatNumber(max)} •{" "}
                          {formatMoney(itemPrice(item))} each
                        </p>

                        {!itemProductId(item) ? (
                          <p className="mt-2 text-xs font-bold text-red-600">
                            Refund cannot be saved for this item because product
                            reference is missing.
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={secondaryBtn()}
                          disabled={saving}
                          onClick={() =>
                            setQty(item, index, Math.max(0, current - 1))
                          }
                        >
                          −
                        </button>

                        <input
                          inputMode="numeric"
                          className="h-11 w-20 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-center text-sm font-black text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)]"
                          value={String(current)}
                          onChange={(event) =>
                            setQty(item, index, event.target.value)
                          }
                          disabled={saving}
                        />

                        <button
                          type="button"
                          className={secondaryBtn()}
                          disabled={saving}
                          onClick={() =>
                            setQty(item, index, Math.min(max, current + 1))
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="space-y-4">
              <section className={cx(pageCard(), "p-5")}>
                <h3 className="text-base font-black text-[var(--color-text)]">
                  Refund summary
                </h3>

                <div className="mt-4 grid gap-3">
                  <DetailLine
                    label="Units selected"
                    value={formatNumber(selectedCount)}
                  />
                  <DetailLine
                    label="Money to return"
                    value={formatMoney(selectedTotal)}
                  />
                </div>
              </section>

              <section className={cx(pageCard(), "p-5")}>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Return method
                  </span>
                  <select
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                    className={inputClass()}
                    disabled={saving}
                  >
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Reason
                  </span>
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className={inputClass()}
                    placeholder="Example: customer returned item"
                    disabled={saving}
                  />
                </label>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Note
                  </span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className={textareaClass()}
                    placeholder="Optional note"
                    disabled={saving}
                  />
                </label>
              </section>

              <section className={cx(pageCard(), "p-5")}>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className={secondaryBtn()}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={onSubmit}
                    className={dangerBtn()}
                  >
                    {saving ? "Saving..." : "Save refund"}
                  </button>
                </div>
              </section>
            </aside>
          </div>
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
      <div className="space-y-5">
        <section className={cx(pageCard(), "p-6 text-center")}>
          <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--color-text)]">
            Receipt not found
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
            This receipt could not be loaded.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/app/pos/sales" className={secondaryBtn()}>
              Sales list
            </Link>

            <Link to="/app/pos" className={primaryBtn()}>
              New sale
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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

      <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6 print:shadow-none")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl print:hidden" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Sales
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
                Receipt detail
              </h1>

              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              {receipt.number || receipt.id || "Receipt"} •{" "}
              {formatDateTime(receipt.date || receipt.createdAt)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end print:hidden">
            <Link to="/app/pos/sales" className={secondaryBtn()}>
              <BackIcon />
              Sales list
            </Link>

            <Link to={previewRoute} className={secondaryBtn()}>
              Preview
            </Link>

            <a href={printUrl} target="_blank" rel="noreferrer" className={successBtn()}>
              <PrintIcon />
              Print
            </a>

            <button
              type="button"
              onClick={openRefund}
              disabled={!canRefund}
              className={canRefund ? softDangerBtn() : secondaryBtn()}
            >
              <RefundIcon />
              Refund
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total"
          value={formatMoney(total)}
          note={`${formatNumber(itemCount)} unit${itemCount === 1 ? "" : "s"} sold`}
          tone="success"
        />

        <SummaryCard
          label="Paid"
          value={formatMoney(paid)}
          note={paymentNote}
          tone={paid > 0 ? "success" : "neutral"}
        />

        <SummaryCard
          label="Balance"
          value={formatMoney(balance)}
          note={balance > 0 ? "Still unpaid" : "Nothing left to pay"}
          tone={balance > 0 ? "warning" : "success"}
        />

        <SummaryCard
          label="Refunded"
          value={formatMoney(refundedTotal)}
          note={refundedTotal > 0 ? "Returned to customer" : "No refund yet"}
          tone={refundedTotal > 0 ? "danger" : "neutral"}
        />
      </section>

      <MoneyBreakdownCard receipt={receipt} items={items} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <section className={cx(pageCard(), "overflow-hidden print:shadow-none")}>
            <div className="border-b border-[var(--color-border)] p-5 sm:p-6">
              <StoreHeader store={store} receipt={receipt} status={status} />
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className={cx(softPanel(), "p-5")}>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Customer
                  </p>

                  {receipt.customer ? (
                    <div className="mt-3">
                      <div className="text-base font-black text-[var(--color-text)]">
                        {receipt.customer.name}
                      </div>
                      <div className="mt-1 text-sm font-medium text-[var(--color-text-muted)]">
                        {receipt.customer.phone || "No phone"}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <div className="text-base font-black text-[var(--color-text)]">
                        Walk-in customer
                      </div>
                      <div className="mt-1 text-sm font-medium text-[var(--color-text-muted)]">
                        No saved customer record was attached.
                      </div>
                    </div>
                  )}
                </div>

                <div className={cx(softPanel(), "p-5")}>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Payment
                  </p>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-text-muted)]">Paid</span>
                      <span className="font-black text-[var(--color-text)]">
                        {formatMoney(paid)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-text-muted)]">Balance</span>
                      <span className="font-black text-[var(--color-text)]">
                        {formatMoney(balance)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-text-muted)]">Pay-by date</span>
                      <span className="font-black text-[var(--color-text)]">
                        {receipt.dueDate ? formatDateOnly(receipt.dueDate) : "Not needed"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                      Sold items
                    </h2>
                    <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                      Products included in this sale.
                    </p>
                  </div>

                  <StatusBadge>{formatNumber(items.length)} line{items.length === 1 ? "" : "s"}</StatusBadge>
                </div>

                {items.length === 0 ? (
                  <div className="mt-5">
                    <EmptyState
                      title="No items found"
                      text="This receipt did not return any sale items."
                    />
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {items.map((item, index) => (
                      <ReceiptItemCard key={itemKey(item, index)} item={item} />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-[28px] bg-[var(--color-primary)] p-5 text-white shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/75">
                      Final total
                    </p>
                    <p className="mt-1 text-xs font-semibold text-white/75">
                      {moneyBreakdown.showTaxLine
                        ? `${moneyBreakdown.taxName} ${
                            moneyBreakdown.pricesIncludeTax ? "included" : "added"
                          }`
                        : status.note}
                    </p>
                  </div>

                  <p className="text-2xl font-black tracking-[-0.04em]">
                    {formatMoney(total)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Notes
            </p>

            <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
              Terms and support
            </h2>

            <div className="mt-4 space-y-3 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              <div>Keep this receipt for warranty and service support.</div>

              {receipt.cancelNote ? (
                <div className="rounded-[18px] bg-red-500/10 px-4 py-3 text-red-600">
                  <span className="font-black">Cancel note:</span>{" "}
                  {receipt.cancelNote}
                </div>
              ) : null}

              {store?.receiptFooter ? (
                <div className="whitespace-pre-wrap">{store.receiptFooter}</div>
              ) : null}
            </div>
          </section>

          <WarrantyBlock receipt={receipt} saleDate={saleDate} store={store} />
        </section>

        <aside className="space-y-5 xl:sticky xl:top-[96px] xl:self-start print:static">
          <section className={cx(pageCard(), "p-5 sm:p-6 print:hidden")}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Actions
            </p>

            <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
              Sale controls
            </h2>

            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Keep this sale safe. Refund and cancel only when necessary.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <Link to="/app/pos" className={primaryBtn()}>
                New sale
              </Link>

              {canRefund ? (
                <button type="button" onClick={openRefund} className={secondaryBtn()}>
                  Refund
                </button>
              ) : null}

              {canCancel ? (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className={softDangerBtn()}
                >
                  Cancel sale
                </button>
              ) : null}
            </div>
          </section>

          {payments.length ? (
            <section className={cx(pageCard(), "p-5 sm:p-6")}>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                Payments
              </p>

              <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                Payment timeline
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                Recorded payments for this sale.
              </p>

              <div className="mt-5 space-y-3">
                {payments.map((payment, index) => (
                  <div key={payment.id || index} className={cx(softPanel(), "p-4")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-black text-[var(--color-text)]">
                          {formatMoney(payment.amount)}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
                          {paymentLabel(payment.method)}
                        </div>
                      </div>

                      <StatusBadge tone="success">Recorded</StatusBadge>
                    </div>

                    <div className="mt-3 text-xs font-semibold leading-6 text-[var(--color-text-muted)]">
                      {formatDateTime(payment.createdAt)}
                    </div>

                    {payment.note ? (
                      <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                        Note: {payment.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : paid > 0 ? (
            <section className={cx(pageCard(), "p-5 sm:p-6")}>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                Payment
              </p>

              <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                Payment received
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                This receipt is paid, but no separate payment timeline was returned by the server.
              </p>

              <div className="mt-5">
                <DetailLine label="Paid amount" value={formatMoney(paid)} />
              </div>
            </section>
          ) : null}

          {canAddPayment ? (
            <section className={cx(pageCard(), "p-5 sm:p-6")}>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                Payment
              </p>

              <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                Add customer payment
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                Record money received against the remaining balance.
              </p>

              <form onSubmit={submitPayment} className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Amount
                  </span>
                  <input
                    inputMode="numeric"
                    className={inputClass()}
                    placeholder="Amount"
                    value={payAmount}
                    onChange={(event) =>
                      setPayAmount(event.target.value.replace(/[^\d]/g, ""))
                    }
                    disabled={paymentBusy}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Method
                  </span>
                  <select
                    className={inputClass()}
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

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Note
                  </span>
                  <input
                    className={inputClass()}
                    placeholder="Optional note"
                    value={payNote}
                    onChange={(event) => setPayNote(event.target.value)}
                    disabled={paymentBusy}
                  />
                </label>

                <button
                  className={cx(warningBtn(), "w-full")}
                  type="submit"
                  disabled={paymentBusy}
                >
                  {paymentBusy ? "Recording..." : "Record payment"}
                </button>
              </form>
            </section>
          ) : null}
        </aside>
      </div>

      {cancelOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className={cx(pageCard(), "w-full max-w-md p-5 sm:p-6")}>
            <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
              Cancel sale
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              This will return items to stock and mark the sale as cancelled.
            </p>

            <textarea
              className={cx(textareaClass(), "mt-4")}
              placeholder="Reason or note"
              value={cancelNote}
              onChange={(event) => setCancelNote(event.target.value)}
              disabled={cancelBusy}
            />

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={cancelBusy}
                className={secondaryBtn()}
              >
                Close
              </button>

              <button
                type="button"
                disabled={cancelBusy}
                onClick={confirmCancel}
                className={dangerBtn()}
              >
                {cancelBusy ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}