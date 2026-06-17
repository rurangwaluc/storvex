import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import inventoryApi from "../../services/inventoryApi";
import "./Inventory.css";

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

const CATEGORY_LABELS = {
  ELECTRONICS: "Electronics",
  HARDWARE: "Hardware",
  HOME_KITCHEN: "Home & kitchen",
  LIGHTING: "Lighting",
  SPARE_PARTS: "Spare parts",
};

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function formatRwf(value) {
  const n = Number(value || 0);
  const safe = Number.isFinite(n) ? n : 0;

  return `Rwf ${new Intl.NumberFormat("en-RW", {
    maximumFractionDigits: 0,
  }).format(safe)}`;
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

function productImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const primary = images.find((image) => image?.isPrimary) || images[0];

  return primary?.url || "";
}

function productInitial(product) {
  const name = cleanString(product?.name);
  return name ? name.slice(0, 1).toUpperCase() : "P";
}

function categoryText(product) {
  return (
    cleanString(product?.category) ||
    cleanString(product?.listingCategory) ||
    cleanString(product?.subcategory) ||
    "Uncategorized"
  );
}

function productStatus(product) {
  const qty = productStock(product);
  const min = Number(product?.minStockLevel ?? 0);

  if (qty <= 0) {
    return {
      label: "Out of Stock",
      tone: "out",
      alertText: `${formatNumber(qty)} left`,
    };
  }

  if (min > 0 && qty <= min) {
    return {
      label: "Low Stock",
      tone: "low",
      alertText: `${formatNumber(qty)} left`,
    };
  }

  return {
    label: "In Stock",
    tone: "good",
    alertText: `${formatNumber(qty)} left`,
  };
}

function stockPreview(currentQty, form) {
  const qty = Number(currentQty || 0);
  const type = cleanString(form?.type).toUpperCase();
  const quantity = Number(form?.quantity || 0);
  const newStockQty = Number(form?.newStockQty || 0);

  if (type === "RESTOCK") return qty + Math.max(0, quantity);
  if (type === "LOSS") return Math.max(0, qty - Math.max(0, quantity));
  if (type === "CORRECTION") return Math.max(0, newStockQty);

  return qty;
}

function stockActionCopy(type) {
  const value = cleanString(type).toUpperCase();

  if (value === "RESTOCK") {
    return {
      title: "Add stock",
      quantityLabel: "Quantity added",
      quantityPlaceholder: "Example: 10",
      note: "Use this when new stock arrives from a supplier or branch transfer.",
    };
  }

  if (value === "LOSS") {
    return {
      title: "Remove stock",
      quantityLabel: "Quantity removed",
      quantityPlaceholder: "Example: 1",
      note: "Use this for damaged, missing, expired, or written-off stock.",
    };
  }

  return {
    title: "Correct count",
    quantityLabel: "Correct stock count",
    quantityPlaceholder: "Example: 6",
    note: "Use this after a physical count when the system quantity is wrong.",
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

function Sparkline({ tone = "blue" }) {
  return (
    <svg className={cn("svx-inventory-sparkline", `svx-inventory-sparkline--${tone}`)} viewBox="0 0 100 50" aria-hidden="true">
      <polyline
        points="0,40 13,31 25,35 39,20 53,28 68,15 82,9 100,4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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


function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" />
      <path d="M3 11v8l9 5 9-5v-8" />
      <path d="M12 13v8" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
      <path d="M9 13h6" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5" strokeLinecap="round" />
      <path d="M12 17h.01" strokeLinecap="round" />
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


function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function StockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 4v16" strokeLinecap="round" />
      <path d="M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 5h.01M12 12h.01M12 19h.01" strokeLinecap="round" />
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
  return <div className={cn("animate-pulse rounded-full bg-[var(--inventory-line-soft)]", className)} />;
}

function PageSkeleton() {
  return (
    <main className="svx-inventory-page">
      <section className="svx-inventory-shell">
        <SkeletonLine className="h-10 w-72 rounded-[18px]" />
        <SkeletonLine className="mt-4 h-4 w-full max-w-xl" />

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <SkeletonLine key={item} className="h-32 rounded-[22px]" />
          ))}
        </div>

        <div className="mt-6 grid gap-4">
          <SkeletonLine className="h-32 rounded-[22px]" />
        </div>

        <SkeletonLine className="mt-6 h-96 rounded-[22px]" />
      </section>
    </main>
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
      className={cn("svx-inventory-button", className)}
      {...props}
    >
      {loading ? <span className="svx-inventory-spinner" /> : null}
      {children}
    </button>
  );
}

function MetricCard({ label, value, sub, tone = "blue", icon }) {
  return (
    <article className="svx-inventory-metric">
      <div className="svx-inventory-metric-left">
        <div className={cn("svx-inventory-icon-box", `svx-inventory-icon-box--${tone}`)}>
          {icon}
        </div>

        <div className="min-w-0">
          <p className="svx-inventory-metric-label">{label}</p>
          <div className="svx-inventory-metric-value">{value}</div>
          {sub ? (
            <p
              className={cn(
                "svx-inventory-metric-change",
                tone === "blue" && "is-blue",
                tone === "green" && "is-up",
                tone === "orange" && "is-orange",
                tone === "red" && "is-down",
              )}
            >
              {sub}
            </p>
          ) : null}
        </div>
      </div>

      <Sparkline tone={tone} />
    </article>
  );
}

function StatusBadge({ product }) {
  const status = productStatus(product);

  return (
    <span className={cn("svx-inventory-status", `svx-inventory-status--${status.tone}`)}>
      {status.label}
    </span>
  );
}

function ProductThumb({ product }) {
  const image = productImage(product);

  if (image) {
    return (
      <span className="svx-inventory-product-thumb">
        <img src={image} alt={product?.name || "Product"} />
      </span>
    );
  }

  return <span className="svx-inventory-product-thumb">{productInitial(product)}</span>;
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
  if (!open || !product || typeof document === "undefined") return null;

  function update(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "type"
        ? {
            quantity: value === "CORRECTION" ? prev.quantity : prev.quantity || 1,
            newStockQty: value === "CORRECTION" ? branchStock(product) : prev.newStockQty,
            lossReason: value === "LOSS" ? prev.lossReason || "DAMAGED" : prev.lossReason,
          }
        : {}),
    }));
  }

  const currentQty = branchStock(product);
  const type = cleanString(form.type).toUpperCase();
  const copy = stockActionCopy(type);
  const previewQty = stockPreview(currentQty, form);
  const change = previewQty - currentQty;

  return createPortal(
    <div className="svx-inventory-stock-drawer-layer" role="dialog" aria-modal="true" aria-label="Update stock">
      <button
        type="button"
        className="svx-inventory-stock-backdrop"
        aria-label="Close stock drawer"
        onClick={onClose}
        disabled={saving}
      />

      <form className="svx-inventory-stock-drawer" onSubmit={onSubmit}>
        <header className="svx-inventory-stock-head">
          <div>
            <span>Stock movement</span>
            <h2>Update stock</h2>
            <p>{product.name}</p>
          </div>

          <button type="button" onClick={onClose} className="svx-inventory-stock-close" disabled={saving}>
            <CloseIcon />
          </button>
        </header>

        <section className="svx-inventory-stock-current">
          <div>
            <span>Current stock</span>
            <strong>{formatNumber(currentQty)}</strong>
          </div>

          <div className="svx-inventory-stock-arrow">›</div>

          <div>
            <span>After update</span>
            <strong>{formatNumber(previewQty)}</strong>
          </div>
        </section>

        <section className="svx-inventory-stock-mode-grid" aria-label="Stock movement type">
          {[
            { value: "RESTOCK", label: "Restock", text: "New stock arrived" },
            { value: "LOSS", label: "Loss", text: "Stock left without sale" },
            { value: "CORRECTION", label: "Correction", text: "Fix counted stock" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn("svx-inventory-stock-mode", type === item.value && "is-active")}
              onClick={() => update("type", item.value)}
              disabled={saving}
            >
              <strong>{item.label}</strong>
              <span>{item.text}</span>
            </button>
          ))}
        </section>

        <div className="svx-inventory-stock-note">
          <AlertIcon />
          <span>{copy.note}</span>
        </div>

        <div className="svx-inventory-stock-form-grid">
          {type === "CORRECTION" ? (
            <Field label={copy.quantityLabel} required>
              <input
                type="number"
                min="0"
                value={form.newStockQty}
                onChange={(e) => update("newStockQty", e.target.value)}
                className="input-premium"
                placeholder={copy.quantityPlaceholder}
              />
            </Field>
          ) : (
            <Field label={copy.quantityLabel} required>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => update("quantity", e.target.value)}
                className="input-premium"
                placeholder={copy.quantityPlaceholder}
              />
            </Field>
          )}

          {type === "LOSS" ? (
            <Field label="Reason" required>
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

          <Field label="Note" className={type === "LOSS" ? "" : "sm:col-span-2"}>
            <textarea
              value={form.note}
              onChange={(e) => update("note", e.target.value)}
              className="svx-inventory-stock-textarea"
              placeholder="Example: Supplier delivery received, damaged item removed, or physical count corrected."
            />
          </Field>
        </div>

        <section className="svx-inventory-stock-impact">
          <div>
            <span>Stock change</span>
            <strong className={cn(change > 0 && "is-success", change < 0 && "is-danger")}>
              {change > 0 ? `+${formatNumber(change)}` : formatNumber(change)}
            </strong>
          </div>

          <div>
            <span>Movement type</span>
            <strong>{copy.title}</strong>
          </div>
        </section>

        <footer className="svx-inventory-stock-actions">
          <button
            type="button"
            onClick={onClose}
            className="svx-inventory-stock-cancel"
            disabled={saving}
          >
            Cancel
          </button>

          <AsyncButton
            type="submit"
            loading={saving}
            className="svx-inventory-button--primary"
          >
            Save stock update
          </AsyncButton>
        </footer>
      </form>
    </div>,
    document.body,
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
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeBranchLabel, setActiveBranchLabel] = useState(() => activeBranchNameFromStorage());

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockForm, setStockForm] = useState(DEFAULT_STOCK_FORM);
  const [savingStock, setSavingStock] = useState(false);
  const [actionsMenu, setActionsMenu] = useState(null);

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
          category: categoryFilter,
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
    [categoryFilter, query, sort, stockFilter],
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

  useEffect(() => {
    if (!actionsMenu) return undefined;

    function closeActions(event) {
      if (event?.target?.closest?.("[data-inventory-actions-menu]")) return;
      setActionsMenu(null);
    }

    function onEscape(event) {
      if (event.key === "Escape") setActionsMenu(null);
    }

    document.addEventListener("click", closeActions);
    window.addEventListener("scroll", closeActions, true);
    window.addEventListener("resize", closeActions);
    window.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("click", closeActions);
      window.removeEventListener("scroll", closeActions, true);
      window.removeEventListener("resize", closeActions);
      window.removeEventListener("keydown", onEscape);
    };
  }, [actionsMenu]);

  useEffect(() => {
    if (!stockModalOpen) return undefined;

    function onEscape(event) {
      if (event.key === "Escape") setStockModalOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [stockModalOpen]);


  function openActionsMenu(event, product) {
    event.stopPropagation();

    if (!product?.id || typeof window === "undefined") return;

    const button = event.currentTarget;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = Math.min(304, window.innerWidth - 24);
    const menuHeight = 202;
    const gap = 10;
    const edge = 12;

    const hasRoomBelow = window.innerHeight - rect.bottom >= menuHeight + gap + edge;
    const top = hasRoomBelow
      ? Math.min(rect.bottom + gap, window.innerHeight - menuHeight - edge)
      : Math.max(edge, rect.top - menuHeight - gap);

    const preferredLeft = rect.right - menuWidth;
    const left = Math.min(
      Math.max(edge, preferredLeft),
      window.innerWidth - menuWidth - edge,
    );

    setActionsMenu((current) => {
      if (current?.productId === product.id) return null;

      return {
        productId: product.id,
        top,
        left,
        width: menuWidth,
      };
    });
  }

  function openCreatePage() {
    navigate("/app/inventory/new");
  }

  function openDetailPage(product) {
    if (!product?.id) return;
    setActionsMenu(null);
    navigate(`/app/inventory/${product.id}`);
  }

  function openEditPage(product) {
    if (!product?.id) return;
    setActionsMenu(null);
    navigate(`/app/inventory/${product.id}/edit`);
  }

  function openStockModal(product) {
    setActionsMenu(null);
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

    const type = cleanString(stockForm.type).toUpperCase();
    const quantity = Number(stockForm.quantity);
    const newStockQty = Number(stockForm.newStockQty);
    const currentQty = branchStock(selectedProduct);

    if (!["RESTOCK", "LOSS", "CORRECTION"].includes(type)) {
      toast.error("Choose a stock movement type");
      return;
    }

    if (type === "CORRECTION") {
      if (!Number.isFinite(newStockQty) || newStockQty < 0) {
        toast.error("Enter the correct stock count");
        return;
      }
    } else if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }

    if (type === "LOSS" && quantity > currentQty) {
      toast.error("You cannot remove more stock than available");
      return;
    }

    setSavingStock(true);

    try {
      const payload =
        type === "CORRECTION"
          ? {
              type: "CORRECTION",
              newStockQty,
              note: stockForm.note,
            }
          : {
              type,
              quantity,
              lossReason: type === "LOSS" ? stockForm.lossReason : undefined,
              note: stockForm.note,
            };

      await inventoryApi.adjustStock(selectedProduct.id, payload);
      toast.success("Stock updated");

      setActionsMenu(null);
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

  const visibleStats = useMemo(() => {
    const totalProducts = Number(summary?.totalActiveProducts || products.length || 0);
    const totalUnits = Number(summary?.totalStockUnits || 0);
    const lowStockCount = Number(summary?.lowStockCount || 0);
    const outOfStockCount = products.filter((product) => productStock(product) <= 0).length;
    const stockValue = Number(summary?.stockSellValue || 0);

    return {
      totalProducts,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      stockValue,
    };
  }, [products, summary]);

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => productStatus(product).tone !== "good")
      .slice(0, 5);
  }, [products]);


  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((product) => {
      const value = cleanString(product.category);
      if (value) set.add(value);
    });
    return Array.from(set).sort();
  }, [products]);



  if (loading && products.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <main className="svx-inventory-page">
      <section className="svx-inventory-shell">
        <header className="svx-inventory-header">
          <div>
            <h1 className="svx-inventory-title">Inventory</h1>
            <p className="svx-inventory-subtitle">
              Real-time stock overview and product management.
            </p>
          </div>

          <div className="svx-inventory-actions">
            <button type="button" onClick={openCreatePage} className="svx-inventory-button svx-inventory-button--primary">
              <PlusIcon />
              Add Product
            </button>
          </div>
        </header>

        <section className="svx-inventory-metric-grid">
          <MetricCard
            label="Total Products"
            value={summaryLoading ? "—" : formatNumber(visibleStats.totalProducts)}
            sub="Catalog"
            tone="blue"
            icon={<BoxIcon />}
          />
          <MetricCard
            label="Total Stock Value"
            value={summaryLoading ? "—" : formatRwf(visibleStats.stockValue)}
            sub="Value"
            tone="green"
            icon={<BagIcon />}
          />
          <MetricCard
            label="Low Stock Items"
            value={summaryLoading ? "—" : formatNumber(visibleStats.lowStockCount)}
            sub="Low"
            tone="orange"
            icon={<LockIcon />}
          />
          <MetricCard
            label="Out of Stock"
            value={formatNumber(visibleStats.outOfStockCount)}
            sub="Empty"
            tone="red"
            icon={<AlertIcon />}
          />
        </section>

        <section className="svx-inventory-dashboard-grid svx-inventory-dashboard-grid--focused">
          <article className="svx-inventory-panel svx-inventory-panel--alerts">
            <div className="svx-inventory-panel-header">
              <h2 className="svx-inventory-panel-title">Low Stock Alerts</h2>
              <button type="button" onClick={() => setStockFilter("low")} className="svx-inventory-link-button">
                View All ({formatNumber(visibleStats.lowStockCount)})
              </button>
            </div>

            <div className="svx-inventory-list">
              {lowStockProducts.length ? lowStockProducts.map((product) => {
                const qty = productStock(product);
                const tone = qty <= 0 ? "danger" : "warning";

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openDetailPage(product)}
                    className="svx-inventory-alert-row"
                  >
                    <ProductThumb product={product} />
                    <span className="min-w-0">
                      <span className="svx-inventory-product-name">{product.name}</span>
                      <span className="svx-inventory-product-meta">{categoryText(product)}</span>
                    </span>
                    <span className={tone === "danger" ? "svx-inventory-danger-text" : "svx-inventory-warning-text"}>
                      {formatNumber(qty)} left
                    </span>
                  </button>
                );
              }) : (
                <p className="svx-inventory-empty-line">No low stock items in this view.</p>
              )}
            </div>
          </article>
        </section>

        <section className="svx-inventory-table-card">
          <div className="svx-inventory-toolbar">
            <div className="svx-inventory-search-wrap">
              <SearchIcon />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="svx-inventory-filter svx-inventory-search"
                placeholder="Search product, SKU or barcode..."
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="svx-inventory-filter"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category] || category}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
              className="svx-inventory-filter"
            >
              <option value="all">All Status</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="svx-inventory-filter"
            >
              <option value="newest">Sort: Latest</option>
              <option value="name">Name A-Z</option>
              <option value="stock_low">Lowest stock</option>
              <option value="stock_high">Highest stock</option>
            </select>
          </div>

          {products.length === 0 ? (
            <div className="svx-inventory-empty">
              <div>
                <div className="svx-inventory-empty-icon">
                  <BoxIcon />
                </div>
                <h3>No products found</h3>
                <p>Add your first product, or change the search and filters.</p>
                <button
                  type="button"
                  onClick={openCreatePage}
                  className="svx-inventory-button svx-inventory-button--primary"
                >
                  <PlusIcon />
                  Add Product
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="svx-inventory-table-scroll">
                <table className="svx-inventory-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Selling Price</th>
                      <th>Stock Value</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map((product) => {
                      const qty = productStock(product);
                      const stockValue = qty * Number(product.sellPrice || 0);
                      const status = productStatus(product);

                      return (
                        <tr
                          key={product.id}
                          className="svx-inventory-clickable-row"
                          onClick={() => openDetailPage(product)}
                        >
                          <td>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetailPage(product);
                              }}
                              className="svx-inventory-product-cell"
                            >
                              <ProductThumb product={product} />
                              <span className="min-w-0">
                                <strong>{product.name}</strong>
                                <span>{product.brand || cleanString(product.barcode) || cleanString(product.serial) || ""}</span>
                              </span>
                            </button>
                          </td>
                          <td>{categoryText(product)}</td>
                          <td>
                            <span className={cn("svx-inventory-stock-pill", `svx-inventory-stock-pill--${status.tone}`)}>
                              {formatNumber(qty)}
                            </span>
                          </td>
                          <td>{formatRwf(product.sellPrice)}</td>
                          <td>{formatRwf(stockValue)}</td>
                          <td><StatusBadge product={product} /></td>
                          <td>
                            <div
                              className="svx-inventory-row-actions"
                              data-inventory-actions-menu
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(event) => openActionsMenu(event, product)}
                                className="svx-inventory-icon-button svx-inventory-icon-button--menu"
                                title="Product actions"
                                aria-label={`Open actions for ${product.name}`}
                                aria-expanded={actionsMenu?.productId === product.id}
                              >
                                <MoreIcon />
                              </button>

                              {actionsMenu?.productId === product.id && typeof document !== "undefined"
                                ? createPortal(
                                    <div
                                      className="svx-inventory-actions-menu"
                                      role="menu"
                                      data-inventory-actions-menu
                                      style={{
                                        top: actionsMenu.top,
                                        left: actionsMenu.left,
                                        width: actionsMenu.width,
                                      }}
                                    >
                                      <button type="button" onClick={() => openDetailPage(product)} role="menuitem">
                                        <ViewIcon />
                                        <span>
                                          <strong>View product</strong>
                                          <small>Open full product details</small>
                                        </span>
                                      </button>

                                      <button type="button" onClick={() => openEditPage(product)} role="menuitem">
                                        <EditIcon />
                                        <span>
                                          <strong>Edit product</strong>
                                          <small>Change price, category, and images</small>
                                        </span>
                                      </button>

                                      <button type="button" onClick={() => openStockModal(product)} role="menuitem">
                                        <StockIcon />
                                        <span>
                                          <strong>Update stock</strong>
                                          <small>Restock, loss, or correction</small>
                                        </span>
                                      </button>
                                    </div>,
                                    document.body,
                                  )
                                : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <footer className="svx-inventory-footer">
                <div>
                  Showing {formatNumber(products.length)} product{products.length === 1 ? "" : "s"}
                  {activeBranchLabel ? ` in ${activeBranchLabel}` : ""}.
                </div>

                {nextCursor ? (
                  <AsyncButton
                    loading={loadingMore}
                    onClick={handleLoadMore}
                    className="svx-inventory-button"
                  >
                    Load more
                  </AsyncButton>
                ) : (
                  <span>End of list</span>
                )}
              </footer>
            </>
          )}
        </section>
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
    </main>
  );
}