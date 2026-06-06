import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import inventoryApi from "../../services/inventoryApi";

const PAGE_SIZE = 10;

const DEFAULT_STOCK_FORM = {
  type: "RESTOCK",
  quantity: 1,
  newStockQty: 0,
  lossReason: "DAMAGED",
  note: "",
};

const LOSS_REASONS = [
  { value: "DAMAGED", label: "Damaged" },
  { value: "STOLEN", label: "Stolen" },
  { value: "LOST", label: "Lost" },
  { value: "EXPIRED", label: "Expired" },
  { value: "INTERNAL_USE", label: "Used inside the business" },
  { value: "COUNTING_ERROR", label: "Counting mistake" },
  { value: "OTHER", label: "Other reason" },
];

function cn(...xs) {
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

function branchStock(product) {
  return Number(product?.branchStockQty ?? product?.effectiveStockQty ?? product?.stockQty ?? 0);
}

function productStatus(product) {
  const qty = productStock(product);
  const min = Number(product?.minStockLevel ?? 0);

  if (qty <= 0) {
    return {
      label: "Out",
      tone: "danger",
      description: "No stock available here",
    };
  }

  if (min > 0 && qty <= min) {
    return {
      label: "Low",
      tone: "warning",
      description: "Needs attention soon",
    };
  }

  return {
    label: "Good",
    tone: "success",
    description: "Enough stock available",
  };
}

function activeBranchNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "this branch";
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" />
      <path d="M3 11v8l9 5 9-5v-8" />
      <path d="M12 13v8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
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

function SkeletonLine({ className = "" }) {
  return (
    <div className={cn("animate-pulse rounded-full bg-[var(--color-surface-2)]", className)} />
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-[34px] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="mt-4 h-10 w-64 rounded-[18px]" />
        <SkeletonLine className="mt-3 h-4 w-full max-w-xl" />
        <SkeletonLine className="mt-2 h-4 w-4/5 max-w-lg" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="rounded-[28px] bg-[var(--color-card)] p-5 shadow-[var(--shadow-soft)]">
            <SkeletonLine className="h-3.5 w-24" />
            <SkeletonLine className="mt-4 h-8 w-20" />
          </div>
        ))}
      </div>

      <div className="rounded-[34px] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <SkeletonLine className="h-12 w-full rounded-[18px]" />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <SkeletonLine key={item} className="h-48 w-full rounded-[28px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function AsyncButton({
  loading,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : null}
      {children}
    </button>
  );
}

function StatCard({ label, value, sub, tone = "default" }) {
  const dotClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-red-500"
          : "bg-[var(--color-primary)]";

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-soft)]">
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[rgba(74,163,255,0.08)] blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>

          <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} />
        </div>

        <div className="mt-3 text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">
          {value}
        </div>

        {sub ? (
          <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            {sub}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ product }) {
  const status = productStatus(product);

  const classes =
    status.tone === "success"
      ? "bg-emerald-500/10 text-emerald-600"
      : status.tone === "warning"
        ? "bg-amber-500/10 text-amber-600"
        : "bg-red-500/10 text-red-600";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em]",
        classes,
      )}
      title={status.description}
    >
      {status.label}
    </span>
  );
}

function Field({ label, required, children, className = "" }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function StockAdjustmentModal({
  open,
  product,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}) {
  if (!open || !product) return null;

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const currentQty = branchStock(product);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Stock change
            </p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
              {product.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-[var(--color-text-muted)]">
              Current stock here:{" "}
              <span className="font-black text-[var(--color-text)]">{formatNumber(currentQty)}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text)] transition hover:-translate-y-0.5"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What happened?">
              <select
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className="input-premium"
              >
                <option value="RESTOCK">New stock arrived</option>
                <option value="LOSS">Stock was lost or damaged</option>
                <option value="CORRECTION">Correct the count</option>
              </select>
            </Field>

            {form.type === "CORRECTION" ? (
              <Field label="Correct stock count">
                <input
                  type="number"
                  min="0"
                  value={form.newStockQty}
                  onChange={(e) => update("newStockQty", e.target.value)}
                  className="input-premium"
                />
              </Field>
            ) : (
              <Field label="Quantity">
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => update("quantity", e.target.value)}
                  className="input-premium"
                />
              </Field>
            )}

            {form.type === "LOSS" ? (
              <Field label="Reason">
                <select
                  value={form.lossReason}
                  onChange={(e) => update("lossReason", e.target.value)}
                  className="input-premium"
                >
                  {LOSS_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label="Note" className={form.type === "LOSS" ? "" : "sm:col-span-2"}>
              <input
                value={form.note}
                onChange={(e) => update("note", e.target.value)}
                className="input-premium"
                placeholder="Example: Added from supplier delivery"
              />
            </Field>
          </div>

          <div className="mt-5 rounded-[24px] bg-[var(--color-surface-2)] p-4">
            <p className="text-[12px] font-bold text-[var(--color-text-muted)]">
              This changes stock for this branch and keeps the business total correct.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-[var(--color-surface-2)] px-4 py-2.5 text-sm font-black text-[var(--color-text)] transition hover:-translate-y-0.5"
            >
              Cancel
            </button>

            <AsyncButton
              type="submit"
              loading={saving}
              className="bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
            >
              Save stock change
            </AsyncButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductCard({ product, onView, onEdit, onAdjust }) {
  const qty = productStock(product);
  const hereQty = branchStock(product);
  const status = productStatus(product);

  return (
    <article className="group rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
      <button
        type="button"
        onClick={() => onView(product)}
        className="block w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[15px] font-black tracking-[-0.01em] text-[var(--color-text)]">
                {product.name}
              </h3>
              <StatusBadge product={product} />
            </div>

            <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text-muted)]">
              {[product.brand, product.category, product.sku].filter(Boolean).join(" • ") || "No category"}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xl font-black text-[var(--color-text)]">{formatNumber(qty)}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              available
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] bg-[var(--color-surface-2)] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
              Stock here
            </p>
            <p className="mt-1 text-lg font-black text-[var(--color-text)]">
              {formatNumber(hereQty)}
            </p>
          </div>

          <div className="rounded-[20px] bg-[var(--color-surface-2)] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
              Sell price
            </p>
            <p className="mt-1 truncate text-lg font-black text-[var(--color-text)]">
              {formatRwf(product.sellPrice)}
            </p>
          </div>
        </div>
      </button>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="truncate text-xs font-semibold text-[var(--color-text-muted)]">
          {status.description}
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onView(product)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text)] transition hover:-translate-y-0.5"
            title="View product"
          >
            <EyeIcon />
          </button>

          <button
            type="button"
            onClick={() => onEdit(product)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text)] transition hover:-translate-y-0.5"
            title="Edit product"
          >
            <EditIcon />
          </button>

          <button
            type="button"
            onClick={() => onAdjust(product)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            title="Change stock"
          >
            <StockIcon />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function InventoryList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [stockFilter, setStockFilter] = useState("all");
  const [activeBranchLabel, setActiveBranchLabel] = useState(() => activeBranchNameFromStorage());

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockForm, setStockForm] = useState(DEFAULT_STOCK_FORM);
  const [savingStock, setSavingStock] = useState(false);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);

    try {
      const data = await inventoryApi.getInventorySummary();
      setSummary(data?.summary || null);
    } catch (error) {
      toast.error(error?.message || "Failed to load stock summary");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadProducts = useCallback(
    async ({ append = false, cursor = null } = {}) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = {
          q: query,
          sort,
          lowStock: stockFilter === "low",
          outOfStock: stockFilter === "out",
          limit: PAGE_SIZE,
          cursor: append ? cursor : undefined,
        };

        const data = await inventoryApi.getProducts(params);
        const nextProducts = Array.isArray(data?.products) ? data.products : [];

        setProducts((prev) => (append ? [...prev, ...nextProducts] : nextProducts));
        setNextCursor(data?.nextCursor || null);
      } catch (error) {
        toast.error(error?.message || "Failed to load products");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, sort, stockFilter],
  );

  useEffect(() => {
    loadSummary();
    loadProducts({ append: false });
  }, [loadSummary, loadProducts]);

  useEffect(() => {
    function onBranchChanged() {
      setActiveBranchLabel(activeBranchNameFromStorage());
      loadSummary();
      loadProducts({ append: false });
    }

    window.addEventListener("storvex:branch-changed", onBranchChanged);
    window.addEventListener("storvex:workspace-refreshed", onBranchChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onBranchChanged);
      window.removeEventListener("storvex:workspace-refreshed", onBranchChanged);
    };
  }, [loadSummary, loadProducts]);

  function openCreatePage() {
    navigate("/app/inventory/new");
  }

  function openDetailPage(product) {
    if (!product?.id) return;
    navigate(`/app/inventory/${product.id}`);
  }

  function openEditPage(product) {
    if (!product?.id) return;
    navigate(`/app/inventory/${product.id}/edit`);
  }

  function openStockModal(product) {
    setSelectedProduct(product);
    setStockForm({
      ...DEFAULT_STOCK_FORM,
      newStockQty: branchStock(product),
    });
    setStockModalOpen(true);
  }

  async function handleStockSubmit(event) {
    event.preventDefault();

    if (!selectedProduct?.id) return;

    setSavingStock(true);

    try {
      const payload =
        stockForm.type === "CORRECTION"
          ? {
              type: "CORRECTION",
              newStockQty: stockForm.newStockQty,
              note: stockForm.note,
            }
          : {
              type: stockForm.type,
              quantity: stockForm.quantity,
              lossReason: stockForm.type === "LOSS" ? stockForm.lossReason : undefined,
              note: stockForm.note,
            };

      await inventoryApi.adjustStock(selectedProduct.id, payload);
      toast.success("Stock updated");

      setStockModalOpen(false);
      await Promise.all([loadSummary(), loadProducts({ append: false })]);
    } catch (error) {
      toast.error(error?.message || "Failed to update stock");
    } finally {
      setSavingStock(false);
    }
  }

  function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    loadProducts({ append: true, cursor: nextCursor });
  }

  const statCards = [
    {
      label: "Products",
      value: summaryLoading ? "—" : formatNumber(summary?.totalActiveProducts || 0),
      sub: "Items you sell",
      tone: "default",
    },
    {
      label: "Stock here",
      value: summaryLoading ? "—" : formatNumber(summary?.totalStockUnits || 0),
      sub: "Available in this branch",
      tone: "success",
    },
    {
      label: "Needs attention",
      value: summaryLoading ? "—" : formatNumber(summary?.lowStockCount || 0),
      sub: "Low stock items",
      tone: "warning",
    },
    {
      label: "Stock value",
      value: summaryLoading ? "—" : formatRwf(summary?.stockSellValue || 0),
      sub: "Expected selling value",
      tone: "default",
    },
  ];

  if (loading && products.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5">
      <style>{`
        .input-premium {
          width: 100%;
          border-radius: 18px;
          border: 1px solid var(--color-border);
          background: var(--color-surface-2);
          color: var(--color-text);
          padding: 0.78rem 0.9rem;
          outline: none;
          font-size: 0.92rem;
          font-weight: 700;
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .input-premium:focus {
          border-color: rgba(74, 163, 255, 0.6);
          box-shadow: 0 0 0 4px rgba(74, 163, 255, 0.12);
        }

        .input-premium::placeholder {
          color: var(--color-text-muted);
          opacity: 0.75;
        }
      `}</style>

      <section className="relative overflow-hidden rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Stock control
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
              Inventory
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              See what is available in{" "}
              <span className="font-black text-[var(--color-text)]">{activeBranchLabel}</span>.
              The first 10 items are shown first. Use search, filters, or load more to find the rest.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <AsyncButton
              loading={loading}
              onClick={() => {
                loadSummary();
                loadProducts({ append: false });
              }}
              className="bg-[var(--color-surface-2)] text-[var(--color-text)] hover:-translate-y-0.5"
            >
              Refresh
            </AsyncButton>

            <button
              type="button"
              onClick={openCreatePage}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            >
              <PlusIcon />
              Add product
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              <SearchIcon />
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-premium pl-11"
              placeholder="Search by product, code, barcode, serial, or brand..."
            />
          </div>

          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
            className="input-premium"
          >
            <option value="all">All stock</option>
            <option value="low">Needs attention</option>
            <option value="out">Out of stock</option>
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="input-premium"
          >
            <option value="newest">Newest first</option>
            <option value="name">Name A-Z</option>
            <option value="stock_low">Lowest stock</option>
            <option value="stock_high">Highest stock</option>
          </select>
        </div>

        {products.length === 0 ? (
          <div className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-[30px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-[var(--color-card)] text-[var(--color-primary)] shadow-[var(--shadow-soft)]">
              <EmptyIcon />
            </div>
            <h3 className="mt-4 text-lg font-black text-[var(--color-text)]">
              No products found
            </h3>
            <p className="mt-1 max-w-md text-sm font-medium text-[var(--color-text-muted)]">
              Add your first product, or change the search and filters.
            </p>

            <button
              type="button"
              onClick={openCreatePage}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            >
              <PlusIcon />
              Add product
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={openDetailPage}
                  onEdit={openEditPage}
                  onAdjust={openStockModal}
                />
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-[26px] bg-[var(--color-surface-2)] px-4 py-4 sm:flex-row">
              <p className="text-center text-sm font-bold text-[var(--color-text-muted)] sm:text-left">
                Showing {formatNumber(products.length)} product{products.length === 1 ? "" : "s"}.
                Search or filter to find something faster.
              </p>

              {nextCursor ? (
                <AsyncButton
                  loading={loadingMore}
                  onClick={handleLoadMore}
                  className="w-full bg-[var(--color-card)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5 sm:w-auto"
                >
                  Load more
                </AsyncButton>
              ) : (
                <span className="rounded-full bg-[var(--color-card)] px-3 py-2 text-xs font-black text-[var(--color-text-muted)] shadow-[var(--shadow-soft)]">
                  End of list
                </span>
              )}
            </div>
          </>
        )}
      </section>

      <StockAdjustmentModal
        open={stockModalOpen}
        product={selectedProduct}
        form={stockForm}
        setForm={setStockForm}
        saving={savingStock}
        onClose={() => setStockModalOpen(false)}
        onSubmit={handleStockSubmit}
      />
    </div>
  );
}