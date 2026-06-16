import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Download,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  Warehouse,
  X,
} from "lucide-react";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  adjustStock,
  downloadReorderPdf,
  getProducts,
} from "../../services/inventoryApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./Reorder.css";

const PAGE_SIZE = 10;

const LOSS_REASONS = [
  { value: "DAMAGED", label: "Damaged" },
  { value: "MISSING", label: "Missing" },
  { value: "EXPIRED", label: "Expired" },
  { value: "RETURNED_BAD", label: "Returned bad" },
  { value: "OTHER", label: "Other" },
];

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function formatNumber(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
}

function formatRwf(value) {
  const n = Number(value || 0);
  return `Rwf ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number.isFinite(n) ? Math.round(n) : 0)}`;
}

function productStock(product) {
  return Number(product?.effectiveStockQty ?? product?.branchStockQty ?? product?.stockQty ?? 0);
}

function productName(product) {
  return cleanString(product?.name) || "Unnamed product";
}

function productCategory(product) {
  return [cleanString(product?.brand), cleanString(product?.category)].filter(Boolean).join(" • ") || "No category";
}

function branchLabelFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "Current branch";
}

function reorderTone(product) {
  const qty = productStock(product);
  return qty <= 0 ? "danger" : "warning";
}

function reorderLabel(product) {
  return productStock(product) <= 0 ? "Out of stock" : "Low stock";
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

  if (value === "LOSS") {
    return {
      title: "Remove stock",
      quantityLabel: "Quantity removed",
      quantityPlaceholder: "Example: 1",
      note: "Use this for damaged, missing, expired, or written-off stock.",
    };
  }

  if (value === "CORRECTION") {
    return {
      title: "Correct count",
      quantityLabel: "Correct stock count",
      quantityPlaceholder: "Example: 6",
      note: "Use this after a physical count when the system quantity is wrong.",
    };
  }

  return {
    title: "Add stock",
    quantityLabel: "Quantity added",
    quantityPlaceholder: "Example: 10",
    note: "Use this when new stock arrives from a supplier or branch transfer.",
  };
}

function StatusBadge({ tone = "neutral", children }) {
  return <span className={cx("svx-restock-badge", `is-${tone}`)}>{children}</span>;
}

function MetricCard({ icon: Icon, label, value, note, tone = "neutral" }) {
  return (
    <article className={cx("svx-restock-metric", `is-${tone}`)}>
      <span aria-hidden="true">
        <Icon size={18} strokeWidth={2.35} />
      </span>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {note ? <small>{note}</small> : null}
      </div>
    </article>
  );
}

function RestockCard({ product, onRestock, onView }) {
  const qty = productStock(product);
  const tone = reorderTone(product);
  const lowAlert = Number(product?.minStockLevel ?? product?.lowStockAlert ?? 0);
  const suggestedQty = Math.max(1, lowAlert > 0 ? lowAlert * 2 - qty : qty <= 0 ? 5 : 1);

  return (
    <article className={cx("svx-restock-product", `is-${tone}`)}>
      <button type="button" className="svx-restock-product-main" onClick={() => onView(product)}>
        <span className="svx-restock-product-icon" aria-hidden="true">
          <Boxes size={20} strokeWidth={2.25} />
        </span>

        <span>
          <strong>{productName(product)}</strong>
          <small>{productCategory(product)}</small>
        </span>
      </button>

      <div className="svx-restock-product-data">
        <div>
          <span>Available</span>
          <strong className={cx(qty <= 0 && "is-danger")}>{formatNumber(qty)}</strong>
        </div>

        <div>
          <span>Alert level</span>
          <strong>{lowAlert > 0 ? formatNumber(lowAlert) : "Not set"}</strong>
        </div>

        <div>
          <span>Selling price</span>
          <strong>{formatRwf(product?.sellPrice || product?.price || 0)}</strong>
        </div>

        <div>
          <span>Suggested add</span>
          <strong>{formatNumber(suggestedQty)}</strong>
        </div>
      </div>

      <div className="svx-restock-product-actions">
        <StatusBadge tone={tone}>{reorderLabel(product)}</StatusBadge>

        <button type="button" className="svx-restock-secondary-action" onClick={() => onView(product)}>
          View
        </button>

        <button type="button" className="svx-restock-primary-action" onClick={() => onRestock(product, suggestedQty)}>
          <Warehouse size={16} strokeWidth={2.35} />
          Add stock
        </button>
      </div>
    </article>
  );
}

function EmptyState({ title, text }) {
  return (
    <section className="svx-restock-empty">
      <span aria-hidden="true">
        <PackageCheck size={28} strokeWidth={2.25} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}

function StockDrawer({
  open,
  product,
  form,
  saving,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!open || !product || typeof document === "undefined") return null;

  const currentQty = productStock(product);
  const type = cleanString(form.type).toUpperCase();
  const copy = stockActionCopy(type);
  const previewQty = stockPreview(currentQty, form);
  const change = previewQty - currentQty;

  return createPortal(
    <div className="svx-restock-stock-layer" role="dialog" aria-modal="true" aria-label="Update stock">
      <button
        type="button"
        className="svx-restock-stock-backdrop"
        aria-label="Close update stock"
        onClick={onClose}
        disabled={saving}
      />

      <form className="svx-restock-stock-drawer" onSubmit={onSubmit}>
        <header className="svx-restock-stock-head">
          <div>
            <span>Stock movement</span>
            <h2>Update stock</h2>
            <p>{productName(product)}</p>
          </div>

          <button type="button" onClick={onClose} className="svx-restock-stock-close" disabled={saving}>
            <X size={18} strokeWidth={2.4} />
          </button>
        </header>

        <section className="svx-restock-stock-current">
          <div>
            <span>Current stock</span>
            <strong>{formatNumber(currentQty)}</strong>
          </div>

          <div className="svx-restock-stock-arrow">›</div>

          <div>
            <span>After update</span>
            <strong>{formatNumber(previewQty)}</strong>
          </div>
        </section>

        <section className="svx-restock-mode-grid" aria-label="Stock movement type">
          {[
            { value: "RESTOCK", label: "Restock", text: "New stock arrived" },
            { value: "LOSS", label: "Loss", text: "Stock left without sale" },
            { value: "CORRECTION", label: "Correction", text: "Fix counted stock" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={cx("svx-restock-mode", type === item.value && "is-active")}
              onClick={() => onChange("type", item.value)}
              disabled={saving}
            >
              <strong>{item.label}</strong>
              <span>{item.text}</span>
            </button>
          ))}
        </section>

        <div className="svx-restock-stock-note">
          <AlertTriangle size={17} strokeWidth={2.35} />
          <span>{copy.note}</span>
        </div>

        <div className="svx-restock-stock-form">
          {type === "CORRECTION" ? (
            <label>
              <span>{copy.quantityLabel}</span>
              <input
                type="number"
                min="0"
                value={form.newStockQty}
                onChange={(event) => onChange("newStockQty", event.target.value)}
                placeholder={copy.quantityPlaceholder}
                disabled={saving}
              />
            </label>
          ) : (
            <label>
              <span>{copy.quantityLabel}</span>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(event) => onChange("quantity", event.target.value)}
                placeholder={copy.quantityPlaceholder}
                disabled={saving}
              />
            </label>
          )}

          {type === "LOSS" ? (
            <label>
              <span>Reason</span>
              <select
                value={form.lossReason}
                onChange={(event) => onChange("lossReason", event.target.value)}
                disabled={saving}
              >
                {LOSS_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label>
            <span>Note</span>
            <textarea
              value={form.note}
              onChange={(event) => onChange("note", event.target.value)}
              placeholder="Example: Supplier delivery received."
              disabled={saving}
            />
          </label>
        </div>

        <section className="svx-restock-stock-impact">
          <div>
            <span>Stock change</span>
            <strong className={cx(change > 0 && "is-success", change < 0 && "is-danger")}>
              {change > 0 ? `+${formatNumber(change)}` : formatNumber(change)}
            </strong>
          </div>

          <div>
            <span>Movement type</span>
            <strong>{copy.title}</strong>
          </div>
        </section>

        <footer className="svx-restock-stock-actions">
          <button type="button" onClick={onClose} disabled={saving} className="svx-restock-cancel-button">
            Cancel
          </button>

          <AsyncButton
            type="submit"
            loading={saving}
            loadingText="Saving..."
            className="svx-restock-save-button"
          >
            Save stock update
          </AsyncButton>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

function PageSkeleton() {
  return (
    <div className="svx-restock-page">
      <div className="svx-restock-shell">
        <div className="svx-restock-skeleton is-hero" />
        <div className="svx-restock-skeleton-grid">
          <span />
          <span />
          <span />
        </div>
        <div className="svx-restock-skeleton is-list" />
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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [downloading, setDownloading] = useState(false);
  const [activeBranchLabel, setActiveBranchLabel] = useState(() => branchLabelFromStorage());

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

      toast.error(error?.message || "Failed to load restock list");
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
      setActiveBranchLabel(branchLabelFromStorage());
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

  useEffect(() => {
    if (!stockOpen) return undefined;

    function onEscape(event) {
      if (event.key === "Escape") setStockOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [stockOpen]);

  async function handleDownloadPdf() {
    if (downloading) return;

    setDownloading(true);

    try {
      await downloadReorderPdf({ threshold });
      toast.success("Restock list downloaded");
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "reorder-pdf-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to download restock list");
    } finally {
      setDownloading(false);
    }
  }

  function openStockDrawer(product, suggestedQty = 1) {
    setStockProduct(product);
    setStockForm({
      type: "RESTOCK",
      quantity: Math.max(1, Number(suggestedQty || 1)),
      newStockQty: productStock(product),
      lossReason: "DAMAGED",
      note: "",
    });
    setStockOpen(true);
  }

  function closeStockDrawer() {
    if (stockSaving) return;

    setStockOpen(false);
    setStockProduct(null);
  }

  function updateStockForm(key, value) {
    setStockForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "type"
        ? {
            quantity: value === "CORRECTION" ? current.quantity : current.quantity || 1,
            newStockQty: value === "CORRECTION" && stockProduct ? productStock(stockProduct) : current.newStockQty,
            lossReason: value === "LOSS" ? current.lossReason || "DAMAGED" : current.lossReason,
          }
        : {}),
    }));
  }

  function validateStockForm() {
    if (!stockProduct) return false;

    const type = cleanString(stockForm.type).toUpperCase();
    const quantity = Number(stockForm.quantity);
    const newStockQty = Number(stockForm.newStockQty);
    const currentQty = productStock(stockProduct);

    if (!["RESTOCK", "LOSS", "CORRECTION"].includes(type)) {
      toast.error("Choose a stock movement type");
      return false;
    }

    if (type === "CORRECTION") {
      if (!Number.isFinite(newStockQty) || newStockQty < 0) {
        toast.error("Enter the correct stock count");
        return false;
      }

      return true;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter a valid quantity");
      return false;
    }

    if (type === "LOSS" && quantity > currentQty) {
      toast.error("You cannot remove more stock than available");
      return false;
    }

    return true;
  }

  async function submitStockChange(event) {
    event.preventDefault();

    if (!stockProduct || !validateStockForm()) return;

    const type = cleanString(stockForm.type).toUpperCase();

    setStockSaving(true);

    try {
      const payload =
        type === "CORRECTION"
          ? {
              type: "CORRECTION",
              newStockQty: Number(stockForm.newStockQty),
              note: cleanString(stockForm.note),
            }
          : {
              type,
              quantity: Number(stockForm.quantity),
              lossReason: type === "LOSS" ? stockForm.lossReason : undefined,
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

  function openProduct(product) {
    if (!product?.id) return;
    navigate(`/app/inventory/${product.id}`);
  }

  const rows = tab === "OUT" ? outRows : lowRows;
  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;
  const urgentCount = outRows.length + lowRows.length;

  const summaryCards = useMemo(
    () => [
      {
        icon: AlertTriangle,
        label: "Out of stock",
        value: loading ? "—" : formatNumber(outRows.length),
        note: "Cannot be sold now",
        tone: "danger",
      },
      {
        icon: Boxes,
        label: "Low stock",
        value: loading ? "—" : formatNumber(lowRows.length),
        note: "May run out soon",
        tone: "warning",
      },
      {
        icon: Truck,
        label: "Needs action",
        value: loading ? "—" : formatNumber(urgentCount),
        note: activeBranchLabel,
        tone: urgentCount > 0 ? "blue" : "success",
      },
    ],
    [activeBranchLabel, loading, lowRows.length, outRows.length, urgentCount],
  );

  if (loading && outRows.length === 0 && lowRows.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <main className="svx-restock-page">
      <div className="svx-restock-shell">
        <StockDrawer
          open={stockOpen}
          product={stockProduct}
          form={stockForm}
          saving={stockSaving}
          onClose={closeStockDrawer}
          onChange={updateStockForm}
          onSubmit={submitStockChange}
        />

        <header className="svx-restock-hero">
          <div>
            <button type="button" className="svx-restock-back" onClick={() => navigate("/app/inventory")}>
              <ArrowLeft size={18} strokeWidth={2.4} />
              <span>Inventory</span>
            </button>

            <p className="svx-restock-kicker">Restock list</p>
            <h1>Products that need stock.</h1>
            <p className="svx-restock-hero-text">
              Only products that are out of stock or close to running out in{" "}
              <strong>{activeBranchLabel}</strong>.
            </p>
          </div>

          <div className="svx-restock-hero-actions">
            <AsyncButton
              type="button"
              loading={loading}
              loadingText="Refreshing..."
              className="svx-restock-secondary-button"
              onClick={load}
            >
              <RefreshCw size={16} strokeWidth={2.35} />
              <span>Refresh</span>
            </AsyncButton>

            {urgentCount > 0 ? (
              <AsyncButton
                type="button"
                loading={downloading}
                loadingText="Downloading..."
                className="svx-restock-primary-button"
                onClick={handleDownloadPdf}
              >
                <Download size={16} strokeWidth={2.35} />
                <span>Download</span>
              </AsyncButton>
            ) : null}
          </div>
        </header>

        <section className="svx-restock-metrics" aria-label="Restock summary">
          {summaryCards.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </section>

        <section className="svx-restock-board">
          <div className="svx-restock-board-head">
            <div>
              <h2>Action list</h2>
              <p>Review what needs attention first, then add stock from the same screen.</p>
            </div>

            <label className="svx-restock-threshold">
              <span>Low stock alert</span>
              <input
                type="number"
                min="0"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
              />
            </label>
          </div>

          <div className="svx-restock-tabs" role="tablist" aria-label="Restock filters">
            <button
              type="button"
              className={cx(tab === "OUT" && "is-active is-danger")}
              onClick={() => setTab("OUT")}
            >
              Out of stock
              <span>{formatNumber(outRows.length)}</span>
            </button>

            <button
              type="button"
              className={cx(tab === "LOW" && "is-active is-warning")}
              onClick={() => setTab("LOW")}
            >
              Low stock
              <span>{formatNumber(lowRows.length)}</span>
            </button>
          </div>

          <div className="svx-restock-search-note">
            <Search size={16} strokeWidth={2.35} />
            <span>
              Showing {formatNumber(visibleRows.length)} of {formatNumber(rows.length)} item
              {rows.length === 1 ? "" : "s"}. The list is limited to meaningful stock actions only.
            </span>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title="Nothing needs restocking right now."
              text="All products in this branch are above the current stock alert."
            />
          ) : (
            <>
              <div className="svx-restock-list">
                {visibleRows.map((product) => (
                  <RestockCard
                    key={product.id}
                    product={product}
                    onRestock={openStockDrawer}
                    onView={openProduct}
                  />
                ))}
              </div>

              <footer className="svx-restock-footer">
                <span>
                  Showing {formatNumber(visibleRows.length)} of {formatNumber(rows.length)}
                </span>

                {hasMore ? (
                  <button type="button" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                    Load 10 more
                  </button>
                ) : (
                  <strong>End of list</strong>
                )}
              </footer>
            </>
          )}
        </section>

      </div>
    </main>
  );
}
