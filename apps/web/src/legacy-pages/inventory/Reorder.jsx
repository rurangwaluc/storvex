import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  adjustStock,
  downloadReorderPdf,
  getProductStockAdjustments,
  getProducts,
} from "../../services/inventoryApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

const PAGE_SIZE = 10;

const LOSS_REASONS = [
  { value: "DAMAGED", label: "Damaged" },
  { value: "STOLEN", label: "Stolen" },
  { value: "LOST", label: "Lost" },
  { value: "EXPIRED", label: "Expired" },
  { value: "INTERNAL_USE", label: "Used inside the business" },
  { value: "COUNTING_ERROR", label: "Counting mistake" },
  { value: "OTHER", label: "Other reason" },
];

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function formatRwf(value) {
  const n = Number(value || 0);

  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatNumber(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-RW").format(Number.isFinite(n) ? n : 0);
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function productStock(product) {
  return Number(product?.effectiveStockQty ?? product?.branchStockQty ?? product?.stockQty ?? 0);
}

function productCategory(product) {
  return [product?.brand, product?.category].filter(Boolean).join(" • ") || "No category";
}

function pageCard() {
  return "rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[24px] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)]";
}

function buttonBase() {
  return "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryButton() {
  return cx(
    buttonBase(),
    "bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function primaryButton() {
  return cx(
    buttonBase(),
    "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function successButton() {
  return cx(
    buttonBase(),
    "bg-emerald-600 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function dangerButton() {
  return cx(
    buttonBase(),
    "bg-red-600 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function warningButton() {
  return cx(
    buttonBase(),
    "bg-amber-500 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function activeBranchNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "this branch";
}

function stockChangeLabel(type) {
  if (type === "RESTOCK") return "Stock added";
  if (type === "LOSS") return "Stock removed";
  if (type === "CORRECTION") return "Count corrected";
  return "Stock changed";
}

function lossReasonLabel(value) {
  return LOSS_REASONS.find((item) => item.value === value)?.label || "Other reason";
}

function StatusBadge({ tone = "neutral", children }) {
  const classes =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600"
      : tone === "danger"
        ? "bg-red-500/10 text-red-600"
        : tone === "warning"
          ? "bg-amber-500/10 text-amber-600"
          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em]",
        classes,
      )}
    >
      {children}
    </span>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v11" strokeLinecap="round" />
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" />
      <path d="M3 11v8l9 5 9-5v-8" />
      <path d="M12 13v8" />
    </svg>
  );
}

function StockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" />
      <path d="M3 11v8l9 5 9-5v-8" />
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

function SkeletonBlock({ className = "" }) {
  return (
    <div className={cx("animate-pulse rounded-[22px] bg-[var(--color-surface-2)]", className)} />
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className={cx(pageCard(), "p-5 sm:p-6")}>
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-4 h-10 w-64 rounded-[18px]" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className={cx(pageCard(), "p-5")}>
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-20" />
          </div>
        ))}
      </div>

      <div className={cx(pageCard(), "p-5")}>
        <SkeletonBlock className="h-12 w-full rounded-[18px]" />
        <div className="mt-5 grid gap-3">
          {[1, 2, 3, 4].map((item) => (
            <SkeletonBlock key={item} className="h-44 w-full rounded-[28px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, note, tone = "neutral" }) {
  const dot =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "danger"
        ? "bg-red-500"
        : tone === "warning"
          ? "bg-amber-500"
          : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[rgba(74,163,255,0.08)] blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <span className={cx("h-2.5 w-2.5 rounded-full", dot)} />
        </div>

        <div className="mt-3 text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">
          {value}
        </div>

        {note ? (
          <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            {note}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function TabButton({ active, tone = "neutral", children, onClick }) {
  const activeClass =
    tone === "danger"
      ? "bg-red-600 text-white"
      : tone === "warning"
        ? "bg-amber-500 text-white"
        : "bg-[var(--color-primary)] text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        buttonBase(),
        active
          ? activeClass
          : "bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
      )}
    >
      {children}
    </button>
  );
}

function AdjustmentTypeCard({ active, tone, title, subtitle, onClick }) {
  const activeClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20"
      : tone === "danger"
        ? "bg-red-500/10 text-red-700 ring-1 ring-red-500/20"
        : "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-[24px] p-4 text-left transition hover:-translate-y-0.5",
        active
          ? activeClass
          : "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:shadow-[var(--shadow-soft)]",
      )}
    >
      <div className="text-sm font-black">{title}</div>
      <div className={cx("mt-2 text-xs font-semibold leading-5", active ? "text-current/80" : "text-[var(--color-text-muted)]")}>
        {subtitle}
      </div>
    </button>
  );
}

function InfoTile({ label, value, tone = "neutral" }) {
  const valueClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "danger"
        ? "text-red-600"
        : tone === "warning"
          ? "text-amber-600"
          : "text-[var(--color-text)]";

  return (
    <div className={cx(softPanel(), "p-4 shadow-[var(--shadow-soft)]")}>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className={cx("mt-2 text-xl font-black tracking-[-0.02em]", valueClass)}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[30px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[26px] bg-[var(--color-card)] text-[var(--color-primary)] shadow-[var(--shadow-soft)]">
        <EmptyIcon />
      </div>

      <h3 className="mt-4 text-lg font-black text-[var(--color-text)]">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-sm font-medium leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>
    </div>
  );
}

function ReorderProductCard({ product, tab, onAdjust }) {
  const qty = productStock(product);
  const isOut = tab === "OUT";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-4 sm:p-5")}>
      <div
        className={cx(
          "absolute left-0 top-0 h-full w-1.5",
          isOut ? "bg-red-500" : "bg-amber-500",
        )}
      />

      <div className="pl-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                {product.name}
              </h3>

              {isOut ? (
                <StatusBadge tone="danger">Out</StatusBadge>
              ) : (
                <StatusBadge tone="warning">Low</StatusBadge>
              )}
            </div>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
              {productCategory(product)}
            </p>

            {product.serial ? (
              <p className="mt-1 break-all text-xs font-semibold text-[var(--color-text-muted)]">
                Serial / IMEI: {product.serial}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onAdjust(product)}
            className={primaryButton()}
          >
            <StockIcon />
            Add stock
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InfoTile label="Available here" value={formatNumber(qty)} tone={qty <= 0 ? "danger" : "warning"} />
          <InfoTile label="Sell price" value={formatRwf(product.sellPrice)} />
          <InfoTile label="Brand" value={product.brand || "Not set"} />
        </div>
      </div>
    </article>
  );
}

function StockChangeModal({
  open,
  product,
  form,
  setForm,
  saving,
  recentChanges,
  recentLoading,
  preview,
  onClose,
  onSubmit,
}) {
  if (!open || !product) return null;

  const isRestock = form.type === "RESTOCK";
  const isLoss = form.type === "LOSS";
  const isCorrection = form.type === "CORRECTION";

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const saveClass = isRestock ? successButton() : isLoss ? dangerButton() : warningButton();
  const saveLabel = isRestock ? "Save stock added" : isLoss ? "Save stock removed" : "Save correction";

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[94dvh] w-full max-w-5xl overflow-hidden rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Stock change
            </p>

            <h2 className="mt-1 truncate text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">
              {product.name}
            </h2>

            <p className="mt-1 text-sm font-medium text-[var(--color-text-muted)]">
              Record what changed and keep the stock count clean.
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
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <section className={cx(softPanel(), "p-4 sm:p-5")}>
                <div className="grid gap-3 md:grid-cols-3">
                  <AdjustmentTypeCard
                    active={isRestock}
                    tone="success"
                    title="Stock arrived"
                    subtitle="Use when new units came into this branch."
                    onClick={() =>
                      setForm({
                        type: "RESTOCK",
                        quantity: 1,
                        newStockQty: productStock(product),
                        lossReason: "DAMAGED",
                        note: "",
                      })
                    }
                  />

                  <AdjustmentTypeCard
                    active={isLoss}
                    tone="danger"
                    title="Stock removed"
                    subtitle="Use for damage, theft, loss, expiry, or internal use."
                    onClick={() =>
                      setForm({
                        type: "LOSS",
                        quantity: 1,
                        newStockQty: productStock(product),
                        lossReason: "DAMAGED",
                        note: "",
                      })
                    }
                  />

                  <AdjustmentTypeCard
                    active={isCorrection}
                    tone="warning"
                    title="Correct count"
                    subtitle="Use after physically counting the stock."
                    onClick={() =>
                      setForm({
                        type: "CORRECTION",
                        quantity: 1,
                        newStockQty: productStock(product),
                        lossReason: "DAMAGED",
                        note: "",
                      })
                    }
                  />
                </div>
              </section>

              <section className={cx(pageCard(), "p-5")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {isCorrection ? (
                    <label className="block">
                      <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                        Correct count to
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={form.newStockQty}
                        onChange={(event) => update("newStockQty", event.target.value)}
                        className={inputClass()}
                        placeholder="Enter the real count"
                      />
                    </label>
                  ) : (
                    <label className="block">
                      <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                        Quantity
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={form.quantity}
                        onChange={(event) => update("quantity", event.target.value)}
                        className={inputClass()}
                        placeholder="How many?"
                      />
                    </label>
                  )}

                  {isLoss ? (
                    <label className="block">
                      <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                        Reason
                      </span>
                      <select
                        value={form.lossReason}
                        onChange={(event) => update("lossReason", event.target.value)}
                        className={inputClass()}
                      >
                        {LOSS_REASONS.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <label className={cx("block", isLoss ? "sm:col-span-2" : "sm:col-span-2")}>
                    <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                      Note
                    </span>
                    <textarea
                      value={form.note}
                      onChange={(event) => update("note", event.target.value)}
                      className="min-h-[110px] w-full rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)]"
                      placeholder={
                        isLoss
                          ? "Example: damaged during delivery check"
                          : isRestock
                            ? "Example: received supplier delivery"
                            : "Example: corrected after physical count"
                      }
                    />
                  </label>
                </div>
              </section>

              <section className={cx(pageCard(), "p-5")}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-black text-[var(--color-text)]">
                      Recent changes for this product
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[var(--color-text-muted)]">
                      Helpful before making another change.
                    </p>
                  </div>

                  {recentLoading ? (
                    <span className="text-sm font-bold text-[var(--color-text-muted)]">
                      Loading...
                    </span>
                  ) : null}
                </div>

                {recentLoading ? (
                  <div className="mt-4 grid gap-2">
                    {[1, 2, 3].map((item) => (
                      <SkeletonBlock key={item} className="h-20 w-full" />
                    ))}
                  </div>
                ) : recentChanges.length === 0 ? (
                  <div className="mt-4 rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-8 text-center text-sm font-medium text-[var(--color-text-muted)]">
                    No recent stock changes for this product.
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {recentChanges.slice(0, 6).map((item) => (
                      <div key={item.id} className={cx(softPanel(), "p-4")}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-[var(--color-text)]">
                              {stockChangeLabel(item.type)} • {formatNumber(item.beforeQty)} → {formatNumber(item.afterQty)}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                              {item.createdAt ? new Date(item.createdAt).toLocaleString("en-RW") : "—"}
                            </p>
                          </div>

                          <StatusBadge
                            tone={
                              item.type === "RESTOCK"
                                ? "success"
                                : item.type === "LOSS"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {stockChangeLabel(item.type)}
                          </StatusBadge>
                        </div>

                        {item.note ? (
                          <p className="mt-2 break-words text-xs font-medium leading-5 text-[var(--color-text-muted)]">
                            {item.note}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-5">
              <section className={cx(pageCard(), "p-5")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-[var(--color-text)]">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
                      {productCategory(product)}
                    </p>
                  </div>

                  {productStock(product) <= 0 ? (
                    <StatusBadge tone="danger">Out</StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">Review</StatusBadge>
                  )}
                </div>

                <div className="mt-5 grid gap-3">
                  <InfoTile label="Current stock here" value={formatNumber(productStock(product))} />
                  <InfoTile label="Sell price" value={formatRwf(product.sellPrice)} />
                </div>
              </section>

              <section className={cx(pageCard(), "p-5")}>
                <h3 className="text-base font-black text-[var(--color-text)]">
                  Before saving
                </h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                  Check the result so the owner can trust the numbers.
                </p>

                <div className="mt-5 grid gap-3">
                  <InfoTile
                    label="Before"
                    value={formatNumber(preview?.before ?? productStock(product))}
                  />
                  <InfoTile
                    label="Change"
                    value={
                      preview
                        ? preview.change > 0
                          ? `+${formatNumber(preview.change)}`
                          : formatNumber(preview.change)
                        : "—"
                    }
                    tone={
                      !preview
                        ? "neutral"
                        : preview.change > 0
                          ? "success"
                          : preview.change < 0
                            ? "danger"
                            : "warning"
                    }
                  />
                  <InfoTile
                    label="After"
                    value={preview ? formatNumber(preview.after) : "—"}
                    tone={!preview ? "neutral" : preview.after <= 0 ? "danger" : "success"}
                  />
                </div>
              </section>

              <section className={cx(pageCard(), "p-5")}>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className={secondaryButton()}
                  >
                    Cancel
                  </button>

                  <AsyncButton
                    loading={saving}
                    onClick={onSubmit}
                    disabled={!preview}
                    className={saveClass}
                  >
                    {saveLabel}
                  </AsyncButton>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Reorder() {
  const navigate = useNavigate();

  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const [outRows, setOutRows] = useState([]);
  const [lowRows, setLowRows] = useState([]);
  const [tab, setTab] = useState("OUT");
  const [downloading, setDownloading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeBranchLabel, setActiveBranchLabel] = useState(() => activeBranchNameFromStorage());

  const [stockOpen, setStockOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockForm, setStockForm] = useState({
    type: "RESTOCK",
    quantity: 1,
    newStockQty: 0,
    lossReason: "DAMAGED",
    note: "",
  });
  const [recentChanges, setRecentChanges] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const safeThreshold =
        Number.isFinite(Number(threshold)) && Number(threshold) >= 0
          ? Math.floor(Number(threshold))
          : 5;

      const [outRes, lowRes] = await Promise.all([
        getProducts({
          outOfStock: true,
          active: true,
          limit: 200,
          sort: "name",
        }),
        getProducts({
          lowStock: true,
          threshold: safeThreshold,
          active: true,
          limit: 200,
          sort: "stock_low",
        }),
      ]);

      setOutRows(Array.isArray(outRes?.products) ? outRes.products : []);
      setLowRows(Array.isArray(lowRes?.products) ? lowRes.products : []);
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "reorder-load-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to load reorder list");
      setOutRows([]);
      setLowRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, threshold, outRows.length, lowRows.length]);

  useEffect(() => {
    function onBranchChanged() {
      setActiveBranchLabel(activeBranchNameFromStorage());
      setVisibleCount(PAGE_SIZE);
      load();
    }

    window.addEventListener("storvex:branch-changed", onBranchChanged);
    window.addEventListener("storvex:workspace-refreshed", onBranchChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onBranchChanged);
      window.removeEventListener("storvex:workspace-refreshed", onBranchChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownloadPdf() {
    if (downloading) return;

    setDownloading(true);

    try {
      await downloadReorderPdf({ threshold });
      toast.success("Reorder list downloaded");
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "reorder-pdf-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to download reorder list");
    } finally {
      setDownloading(false);
    }
  }

  async function openStockModal(product) {
    setStockProduct(product);
    setStockForm({
      type: "RESTOCK",
      quantity: 1,
      newStockQty: productStock(product),
      lossReason: "DAMAGED",
      note: "",
    });
    setRecentChanges([]);
    setStockOpen(true);

    setRecentLoading(true);

    try {
      const data = await getProductStockAdjustments(product.id);
      setRecentChanges(Array.isArray(data?.adjustments) ? data.adjustments : []);
    } catch (error) {
      if (!handleSubscriptionBlockedError(error, { toastId: "product-stock-history-blocked" })) {
        setRecentChanges([]);
      }
    } finally {
      setRecentLoading(false);
    }
  }

  function closeStockModal() {
    if (stockSaving) return;

    setStockOpen(false);
    setStockProduct(null);
  }

  function getPreview() {
    if (!stockProduct) return null;

    const before = productStock(stockProduct);

    if (stockForm.type === "CORRECTION") {
      const after = Number(stockForm.newStockQty);

      if (!Number.isFinite(after) || after < 0) return null;

      const cleanAfter = Math.floor(after);

      return {
        before,
        after: cleanAfter,
        change: cleanAfter - before,
      };
    }

    const quantity = Number(stockForm.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) return null;

    const cleanQuantity = Math.floor(quantity);

    if (stockForm.type === "RESTOCK") {
      return {
        before,
        after: before + cleanQuantity,
        change: cleanQuantity,
      };
    }

    if (stockForm.type === "LOSS") {
      const after = before - cleanQuantity;

      if (after < 0) return null;

      return {
        before,
        after,
        change: -cleanQuantity,
      };
    }

    return null;
  }

  async function submitStockChange() {
    if (!stockProduct) return;

    const preview = getPreview();

    if (!preview) {
      toast.error("Please enter a valid stock number");
      return;
    }

    if (stockForm.type === "LOSS" && !stockForm.lossReason) {
      toast.error("Choose why stock was removed");
      return;
    }

    if (
      stockForm.type === "LOSS" &&
      (stockForm.lossReason === "STOLEN" || stockForm.lossReason === "OTHER") &&
      !cleanString(stockForm.note)
    ) {
      toast.error("Add a note for this stock removal");
      return;
    }

    setStockSaving(true);

    try {
      const payload =
        stockForm.type === "CORRECTION"
          ? {
              type: "CORRECTION",
              newStockQty: preview.after,
              note: cleanString(stockForm.note),
            }
          : {
              type: stockForm.type,
              quantity: Math.abs(preview.change),
              lossReason: stockForm.type === "LOSS" ? stockForm.lossReason : undefined,
              note: cleanString(stockForm.note),
            };

      await adjustStock(stockProduct.id, payload);

      toast.success("Stock updated");
      setStockOpen(false);
      setStockProduct(null);
      await load();
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "reorder-stock-change-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to update stock");
    } finally {
      setStockSaving(false);
    }
  }

  const rows = tab === "OUT" ? outRows : lowRows;
  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;
  const preview = getPreview();

  const summaryCards = useMemo(
    () => [
      {
        label: "Out of stock",
        value: formatNumber(outRows.length),
        note: "Needs action now",
        tone: "danger",
      },
      {
        label: "Low stock",
        value: formatNumber(lowRows.length),
        note: "May run out soon",
        tone: "warning",
      },
      {
        label: "Alert level",
        value: formatNumber(threshold),
        note: "Used to find low stock",
        tone: "neutral",
      },
    ],
    [outRows.length, lowRows.length, threshold],
  );

  if (loading && outRows.length === 0 && lowRows.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5">
      <StockChangeModal
        open={stockOpen}
        product={stockProduct}
        form={stockForm}
        setForm={setStockForm}
        saving={stockSaving}
        recentChanges={recentChanges}
        recentLoading={recentLoading}
        preview={preview}
        onClose={closeStockModal}
        onSubmit={submitStockChange}
      />

      <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Stock control
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
              Reorder list
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              See products that need attention in{" "}
              <span className="font-black text-[var(--color-text)]">{activeBranchLabel}</span>.
              The first 10 items are shown first. Use the buttons below to review more.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <button
              type="button"
              onClick={() => navigate("/app/inventory")}
              className={secondaryButton()}
            >
              <BackIcon />
              Back
            </button>

            <AsyncButton
              loading={loading}
              onClick={load}
              className="bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
            >
              Refresh
            </AsyncButton>

            <AsyncButton
              loading={downloading}
              onClick={handleDownloadPdf}
              className={primaryButton()}
            >
              <DownloadIcon />
              Download
            </AsyncButton>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      <section className={cx(pageCard(), "p-4 sm:p-5")}>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Low stock alert
              </span>
              <input
                type="number"
                min="0"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                className={inputClass()}
              />
            </label>

            <div className="flex items-end gap-2 overflow-x-auto pb-0.5">
              <TabButton active={tab === "OUT"} tone="danger" onClick={() => setTab("OUT")}>
                Out of stock
              </TabButton>

              <TabButton active={tab === "LOW"} tone="warning" onClick={() => setTab("LOW")}>
                Low stock
              </TabButton>
            </div>
          </div>

          <div className="rounded-[24px] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-bold text-[var(--color-text-muted)]">
            {tab === "OUT"
              ? "Products unavailable for sale"
              : "Products close to running out"}
          </div>
        </div>

        <div className="mt-5">
          {rows.length === 0 ? (
            <EmptyState
              title={tab === "OUT" ? "Nothing is out of stock" : "No low stock items"}
              text={
                tab === "OUT"
                  ? "Good. This branch currently has no products fully out of stock."
                  : "Good. With the current alert level, nothing is close to running out."
              }
            />
          ) : (
            <>
              <div className="grid gap-3">
                {visibleRows.map((product) => (
                  <ReorderProductCard
                    key={product.id}
                    product={product}
                    tab={tab}
                    onAdjust={openStockModal}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-[26px] bg-[var(--color-surface-2)] px-4 py-4 sm:flex-row">
                <p className="text-center text-sm font-bold text-[var(--color-text-muted)] sm:text-left">
                  Showing {formatNumber(visibleRows.length)} of {formatNumber(rows.length)} item
                  {rows.length === 1 ? "" : "s"}.
                </p>

                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 sm:w-auto"
                  >
                    Load 10 more
                  </button>
                ) : (
                  <span className="rounded-full bg-[var(--color-card)] px-3 py-2 text-xs font-black text-[var(--color-text-muted)] shadow-[var(--shadow-soft)]">
                    End of list
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}