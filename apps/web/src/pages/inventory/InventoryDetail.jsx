import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import FormPageSkeleton from "../../components/ui/FormPageSkeleton";
import {
  adjustStock,
  getProductById,
  getProductStockAdjustments,
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

const DEFAULT_STOCK_FORM = {
  type: "RESTOCK",
  quantity: 1,
  newStockQty: 0,
  lossReason: "DAMAGED",
  note: "",
};

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
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

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "this branch";
}

function productStock(product) {
  return Number(product?.effectiveStockQty ?? product?.branchStockQty ?? product?.stockQty ?? 0);
}

function productTotalStock(product) {
  return Number(product?.stockQty ?? product?.effectiveStockQty ?? product?.branchStockQty ?? 0);
}

function stockHealth(product) {
  const qty = productStock(product);
  const min = Number(product?.minStockLevel ?? 0);

  if (qty <= 0) {
    return {
      label: "Out of stock",
      tone: "danger",
      text: "This product is not available here.",
    };
  }

  if (min > 0 && qty <= min) {
    return {
      label: "Low stock",
      tone: "warning",
      text: "This product needs attention soon.",
    };
  }

  return {
    label: "Good stock",
    tone: "success",
    text: "This product has enough stock here.",
  };
}

function stockChangeLabel(type) {
  if (type === "RESTOCK") return "Stock added";
  if (type === "LOSS") return "Stock removed";
  if (type === "CORRECTION") return "Count corrected";
  return "Stock changed";
}

function changeValue(row) {
  const value = Number(row?.delta || 0);

  if (value > 0) return `+${formatNumber(value)}`;
  return formatNumber(value);
}

function changeTone(row) {
  const value = Number(row?.delta || 0);

  if (row?.type === "RESTOCK" || value > 0) return "success";
  if (row?.type === "LOSS" || value < 0) return "danger";
  if (row?.type === "CORRECTION") return "warning";

  return "neutral";
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

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
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

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4" strokeLinecap="round" />
      <path d="M12 17h.01" strokeLinecap="round" />
      <path d="M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

function StatusPill({ tone = "neutral", children }) {
  const classes =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-600"
        : tone === "danger"
          ? "bg-red-500/10 text-red-600"
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

function InfoTile({ label, value, note, tone = "neutral" }) {
  const valueClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-red-600"
          : "text-[var(--color-text)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-5")}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[rgba(74,163,255,0.08)] blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <span
            className={cx(
              "h-2.5 w-2.5 rounded-full",
              tone === "success"
                ? "bg-emerald-500"
                : tone === "warning"
                  ? "bg-amber-500"
                  : tone === "danger"
                    ? "bg-red-500"
                    : "bg-[var(--color-primary)]",
            )}
          />
        </div>

        <p className={cx("mt-3 truncate text-2xl font-black tracking-[-0.03em]", valueClass)}>
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

function DetailRow({ label, value }) {
  return (
    <div className={cx(softPanel(), "p-4")}>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-[var(--color-text)]">
        {value || "Not set"}
      </p>
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div className={cx("animate-pulse rounded-[22px] bg-[var(--color-surface-2)]", className)} />
  );
}

function ErrorState({ message, onRetry, onBack }) {
  return (
    <div className="space-y-5">
      <section className={cx(pageCard(), "p-6 text-center")}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[26px] bg-red-500/10 text-red-600 shadow-[var(--shadow-soft)]">
          <WarningIcon />
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)]">
          Product could not be loaded
        </h1>

        <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
          {message || "Something went wrong while loading this product."}
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={onBack} className={secondaryButton()}>
            <BackIcon />
            Back
          </button>

          <button type="button" onClick={onRetry} className={primaryButton()}>
            Try again
          </button>
        </div>
      </section>
    </div>
  );
}

function ChangeCard({ row }) {
  const tone = changeTone(row);

  return (
    <article className={cx(softPanel(), "p-4 shadow-[var(--shadow-soft)]")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-[var(--color-text)]">
              {stockChangeLabel(row?.type)}
            </p>
            <StatusPill tone={tone}>{changeValue(row)}</StatusPill>
          </div>

          <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            {formatDateTime(row?.createdAt)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-right sm:min-w-[170px]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Before
            </p>
            <p className="mt-1 text-sm font-black text-[var(--color-text)]">
              {formatNumber(row?.beforeQty)}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              After
            </p>
            <p className="mt-1 text-sm font-black text-[var(--color-text)]">
              {formatNumber(row?.afterQty)}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 break-words text-sm font-medium leading-6 text-[var(--color-text-muted)]">
        {row?.note || "No note was added."}
      </p>
    </article>
  );
}

function StockChangeModal({
  open,
  product,
  form,
  setForm,
  saving,
  preview,
  onClose,
  onSubmit,
}) {
  if (!open || !product) return null;

  const isRestock = form.type === "RESTOCK";
  const isLoss = form.type === "LOSS";
  const isCorrection = form.type === "CORRECTION";

  const saveClass = isRestock ? successButton() : isLoss ? dangerButton() : warningButton();
  const saveLabel = isRestock ? "Save stock added" : isLoss ? "Save stock removed" : "Save correction";

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectType(type) {
    setForm({
      type,
      quantity: 1,
      newStockQty: productStock(product),
      lossReason: "DAMAGED",
      note: "",
    });
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[94dvh] w-full max-w-4xl overflow-hidden rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Stock change
            </p>

            <h2 className="mt-1 truncate text-xl font-black tracking-[-0.03em] text-[var(--color-text)] sm:text-2xl">
              {product.name}
            </h2>

            <p className="mt-1 text-sm font-medium text-[var(--color-text-muted)]">
              Record what changed and keep the stock count clear.
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
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <section className={cx(softPanel(), "p-4 sm:p-5")}>
                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => selectType("RESTOCK")}
                    className={cx(
                      "rounded-[24px] p-4 text-left transition hover:-translate-y-0.5",
                      isRestock
                        ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20"
                        : "bg-[var(--color-card)] text-[var(--color-text)]",
                    )}
                  >
                    <span className="block text-sm font-black">Stock arrived</span>
                    <span className="mt-2 block text-xs font-semibold leading-5 text-current/75">
                      Use when new units came into this branch.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectType("LOSS")}
                    className={cx(
                      "rounded-[24px] p-4 text-left transition hover:-translate-y-0.5",
                      isLoss
                        ? "bg-red-500/10 text-red-700 ring-1 ring-red-500/20"
                        : "bg-[var(--color-card)] text-[var(--color-text)]",
                    )}
                  >
                    <span className="block text-sm font-black">Stock removed</span>
                    <span className="mt-2 block text-xs font-semibold leading-5 text-current/75">
                      Use for damage, theft, loss, expiry, or internal use.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectType("CORRECTION")}
                    className={cx(
                      "rounded-[24px] p-4 text-left transition hover:-translate-y-0.5",
                      isCorrection
                        ? "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20"
                        : "bg-[var(--color-card)] text-[var(--color-text)]",
                    )}
                  >
                    <span className="block text-sm font-black">Correct count</span>
                    <span className="mt-2 block text-xs font-semibold leading-5 text-current/75">
                      Use after physically counting the stock.
                    </span>
                  </button>
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

                  <label className="block sm:col-span-2">
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
            </div>

            <aside className="space-y-5">
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

export default function InventoryDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [changesLoading, setChangesLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [changes, setChanges] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeBranchLabel, setActiveBranchLabel] = useState(() => activeBranchNameFromStorage());

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockForm, setStockForm] = useState(DEFAULT_STOCK_FORM);

  const health = useMemo(() => stockHealth(product), [product]);

  const profitPerItem = useMemo(() => {
    const sellPrice = Number(product?.sellPrice || 0);
    const costPrice = Number(product?.costPrice || 0);
    return sellPrice - costPrice;
  }, [product]);

  const preview = useMemo(() => {
    if (!product) return null;

    const before = productStock(product);

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
  }, [product, stockForm]);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const loadedProduct = await getProductById(String(id || ""));
      setProduct(loadedProduct || null);
      setActiveBranchLabel(activeBranchNameFromStorage());
    } catch (err) {
      if (!handleSubscriptionBlockedError(err, { toastId: "inventory-detail-load-blocked" })) {
        setError(err?.message || "Failed to load product");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadChanges = useCallback(async () => {
    setChangesLoading(true);

    try {
      const data = await getProductStockAdjustments(String(id || ""), {
        limit: 200,
      });

      setChanges(Array.isArray(data?.adjustments) ? data.adjustments : []);
    } catch (err) {
      if (!handleSubscriptionBlockedError(err, { toastId: "inventory-detail-changes-blocked" })) {
        setChanges([]);
      }
    } finally {
      setChangesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
    loadChanges();
  }, [loadProduct, loadChanges]);

  useEffect(() => {
    function onBranchChanged() {
      setActiveBranchLabel(activeBranchNameFromStorage());
      setVisibleCount(PAGE_SIZE);
      loadProduct();
      loadChanges();
    }

    window.addEventListener("storvex:branch-changed", onBranchChanged);
    window.addEventListener("storvex:workspace-refreshed", onBranchChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onBranchChanged);
      window.removeEventListener("storvex:workspace-refreshed", onBranchChanged);
    };
  }, [loadProduct, loadChanges]);

  function openStockModal() {
    setStockForm({
      type: "RESTOCK",
      quantity: 1,
      newStockQty: productStock(product),
      lossReason: "DAMAGED",
      note: "",
    });
    setStockModalOpen(true);
  }

  async function submitStockChange() {
    if (!product) return;

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

      await adjustStock(product.id, payload);

      toast.success("Stock updated");
      setStockModalOpen(false);

      await Promise.all([loadProduct(), loadChanges()]);
    } catch (err) {
      if (handleSubscriptionBlockedError(err, { toastId: "inventory-detail-stock-blocked" })) {
        return;
      }

      toast.error(err?.message || "Failed to update stock");
    } finally {
      setStockSaving(false);
    }
  }

  if (loading) {
    return <FormPageSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          loadProduct();
          loadChanges();
        }}
        onBack={() => navigate("/app/inventory")}
      />
    );
  }

  const visibleChanges = changes.slice(0, visibleCount);
  const hasMore = visibleCount < changes.length;

  return (
    <div className="space-y-5">
      <StockChangeModal
        open={stockModalOpen}
        product={product}
        form={stockForm}
        setForm={setStockForm}
        saving={stockSaving}
        preview={preview}
        onClose={() => {
          if (!stockSaving) setStockModalOpen(false);
        }}
        onSubmit={submitStockChange}
      />

      <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Stock control
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
                {product?.name || "Product"}
              </h1>

              <StatusPill tone={health.tone}>{health.label}</StatusPill>
            </div>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              View this product in{" "}
              <span className="font-black text-[var(--color-text)]">{activeBranchLabel}</span>.
              See stock, price, product details, and recent changes in one place.
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

            <button
              type="button"
              onClick={() => navigate(`/app/inventory/${product?.id}/edit`)}
              className={secondaryButton()}
            >
              <EditIcon />
              Edit
            </button>

            <button
              type="button"
              onClick={openStockModal}
              className={primaryButton()}
            >
              <StockIcon />
              Change stock
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoTile
          label="Available here"
          value={formatNumber(productStock(product))}
          note={health.text}
          tone={health.tone}
        />

        <InfoTile
          label="Total stock"
          value={formatNumber(productTotalStock(product))}
          note="Across the business"
        />

        <InfoTile
          label="Sell price"
          value={formatRwf(product?.sellPrice)}
          note="Current selling price"
          tone="success"
        />

        <InfoTile
          label="Profit per item"
          value={formatRwf(profitPerItem)}
          note="Sell price minus cost price"
          tone={profitPerItem > 0 ? "success" : profitPerItem < 0 ? "danger" : "neutral"}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className={cx(pageCard(), "p-5 sm:p-6")}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                Recent stock changes
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                The first 10 changes are shown first. Load more when you need the full history.
              </p>
            </div>

            {changesLoading ? (
              <span className="text-sm font-bold text-[var(--color-text-muted)]">
                Loading...
              </span>
            ) : null}
          </div>

          {changesLoading ? (
            <div className="mt-5 grid gap-3">
              {[1, 2, 3, 4].map((item) => (
                <SkeletonBlock key={item} className="h-28 w-full" />
              ))}
            </div>
          ) : changes.length === 0 ? (
            <div className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-[30px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[26px] bg-[var(--color-card)] text-[var(--color-primary)] shadow-[var(--shadow-soft)]">
                <EmptyIcon />
              </div>

              <h3 className="mt-4 text-lg font-black text-[var(--color-text)]">
                No stock changes yet
              </h3>

              <p className="mt-1 max-w-md text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                When stock is added, removed, or corrected, it will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-3">
                {visibleChanges.map((row) => (
                  <ChangeCard key={row.id} row={row} />
                ))}
              </div>

              <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-[26px] bg-[var(--color-surface-2)] px-4 py-4 sm:flex-row">
                <p className="text-center text-sm font-bold text-[var(--color-text-muted)] sm:text-left">
                  Showing {formatNumber(visibleChanges.length)} of {formatNumber(changes.length)} change
                  {changes.length === 1 ? "" : "s"}.
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
        </section>

        <aside className="space-y-5 xl:sticky xl:top-[96px] xl:self-start">
          <section className={cx(pageCard(), "p-5")}>
            <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
              Product details
            </h2>

            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Details your staff can use when searching, selling, or checking this item.
            </p>

            <div className="mt-5 grid gap-3">
              <DetailRow label="Brand" value={product?.brand} />
              <DetailRow label="Category" value={product?.category} />
              <DetailRow label="Accessory type" value={product?.subcategoryOther || product?.subcategory} />
              <DetailRow label="Product code" value={product?.sku} />
              <DetailRow label="Serial / IMEI" value={product?.serial} />
              <DetailRow label="Barcode" value={product?.barcode} />
              <DetailRow label="Low stock alert" value={formatNumber(product?.minStockLevel)} />
            </div>
          </section>

          <section className={cx(pageCard(), "p-5")}>
            <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
              Money view
            </h2>

            <div className="mt-5 grid gap-3">
              <DetailRow label="Cost price" value={formatRwf(product?.costPrice)} />
              <DetailRow label="Sell price" value={formatRwf(product?.sellPrice)} />
              <DetailRow
                label="Stock cost here"
                value={formatRwf(productStock(product) * Number(product?.costPrice || 0))}
              />
              <DetailRow
                label="Possible sales value here"
                value={formatRwf(productStock(product) * Number(product?.sellPrice || 0))}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}