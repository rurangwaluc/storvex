import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Barcode,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Edit3,
  Eye,
  ImagePlus,
  Layers3,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Warehouse,
  X,
} from "lucide-react";

import AsyncButton from "../../components/ui/AsyncButton";
import FormPageSkeleton from "../../components/ui/FormPageSkeleton";
import {
  adjustStock,
  getProductById,
  getProductStockAdjustments,
} from "../../services/inventoryApi";
import "./InventoryDetail.css";

const PAGE_SIZE = 6;

const CATEGORY_LABELS = {
  ELECTRONICS: "Electronics",
  HARDWARE: "Hardware",
  HOME_KITCHEN: "Home & kitchen",
  LIGHTING: "Lighting",
  SPARE_PARTS: "Spare parts",
};

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function formatRwf(value) {
  const n = Number(value || 0);

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? Math.round(n) : 0)}`;
}

function formatNumber(value) {
  const n = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function productStock(product) {
  return Number(product?.effectiveStockQty ?? product?.branchStockQty ?? product?.stockQty ?? 0);
}

function productReserved(product) {
  return Number(product?.branchReservedQty ?? product?.reservedQty ?? 0);
}

function productImages(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  return images
    .map((image) => {
      if (typeof image === "string") return { url: image };
      return image;
    })
    .filter((image) => cleanString(image?.url || image?.imageUrl));
}

function primaryImage(product) {
  const images = productImages(product);
  const primary = images.find((image) => image?.isPrimary) || images[0];

  return primary?.url || primary?.imageUrl || "";
}

function productInitials(name) {
  const parts = cleanString(name).split(/\s+/).filter(Boolean);

  if (!parts.length) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function categoryText(product) {
  return (
    cleanString(product?.category) ||
    cleanString(product?.marketplaceCategory) ||
    cleanString(product?.subcategory) ||
    "Uncategorized"
  );
}

function productStatus(product) {
  const qty = productStock(product);
  const min = Number(product?.minStockLevel ?? 0);

  if (qty <= 0) {
    return {
      label: "Out of stock",
      tone: "danger",
      text: "This product is not available in this branch.",
    };
  }

  if (min > 0 && qty <= min) {
    return {
      label: "Low stock",
      tone: "warning",
      text: "This product needs restock attention.",
    };
  }

  return {
    label: "In stock",
    tone: "success",
    text: "This product has enough stock for now.",
  };
}

function productImageStatus(product) {
  const count = productImages(product).length;

  if (count > 0) {
    return {
      label: "Images added",
      tone: "success",
      text: `${count} product image${count === 1 ? "" : "s"} attached.`,
    };
  }

  return {
    label: "No images",
    tone: "warning",
    text: "Add clear product photos so this item is easy to recognize.",
  };
}

function branchLabel(product) {
  const scope = product?.branchScope || {};
  const code = cleanString(scope?.code || scope?.branchCode);
  const name =
    cleanString(scope?.name || scope?.branchName) ||
    cleanString(localStorage.getItem("activeBranchName"));
  const storedCode = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `${code} • ${name}`;
  if (storedCode && name) return `${storedCode} • ${name}`;
  if (name) return name;
  if (code) return code;
  if (storedCode) return storedCode;

  return "Current branch";
}

function normalizedCategoryAttributes(product) {
  const raw =
    product?.categoryAttributes ||
    product?.marketplaceAttributes ||
    product?.attributes ||
    {};

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];

  return Object.entries(raw)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => ({
      key,
      label: friendlyAttributeLabel(key),
      value: friendlyAttributeValue(value),
    }));
}

function friendlyAttributeLabel(key) {
  return String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function friendlyAttributeValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "object") return "Saved";
  return String(value);
}

function stockChangeLabel(type) {
  const value = cleanString(type).toUpperCase();

  if (value === "RESTOCK") return "Stock added";
  if (value === "LOSS") return "Stock removed";
  if (value === "CORRECTION") return "Count corrected";

  return "Stock changed";
}

function stockChangeTone(type, delta) {
  const value = cleanString(type).toUpperCase();
  const change = Number(delta || 0);

  if (value === "RESTOCK" || change > 0) return "success";
  if (value === "LOSS" || change < 0) return "danger";
  if (value === "CORRECTION") return "warning";

  return "neutral";
}

function stockChangeValue(row) {
  const delta = Number(row?.delta ?? row?.quantity ?? 0);

  if (delta > 0) return `+${formatNumber(delta)}`;
  return formatNumber(delta);
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

const LOSS_REASONS = [
  { value: "DAMAGED", label: "Damaged" },
  { value: "MISSING", label: "Missing" },
  { value: "EXPIRED", label: "Expired" },
  { value: "RETURNED_BAD", label: "Returned bad" },
  { value: "OTHER", label: "Other" },
];

function StatusBadge({ tone = "neutral", children }) {
  return <span className={cx("svx-detail-badge", `is-${tone}`)}>{children}</span>;
}

function DetailSection({ icon: Icon, title, text, action, children }) {
  return (
    <section className="svx-detail-card">
      <div className="svx-detail-section-head">
        <span className="svx-detail-section-icon" aria-hidden="true">
          <Icon size={20} strokeWidth={2.25} />
        </span>

        <div>
          <div className="svx-detail-section-title-row">
            <h2>{title}</h2>
            {action ? <div>{action}</div> : null}
          </div>
          {text ? <p>{text}</p> : null}
        </div>
      </div>

      {children}
    </section>
  );
}

function SummaryCard({ icon: Icon, label, value, note, tone = "neutral" }) {
  return (
    <article className={cx("svx-detail-summary-card", `is-${tone}`)}>
      <span aria-hidden="true">
        <Icon size={18} strokeWidth={2.25} />
      </span>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {note ? <small>{note}</small> : null}
      </div>
    </article>
  );
}

function InfoRow({ label, value, tone }) {
  return (
    <div className={cx("svx-detail-info-row", tone && `is-${tone}`)}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function Gallery({ product, onViewImage }) {
  const images = productImages(product);
  const mainImage = images.find((image) => image?.isPrimary) || images[0] || null;
  const main = mainImage?.url || mainImage?.imageUrl || "";

  return (
    <div className="svx-detail-gallery">
      <div className="svx-detail-main-image">
        {main ? (
          <button
            type="button"
            className="svx-detail-main-image-view"
            onClick={() => onViewImage(mainImage)}
            aria-label="View product image"
          >
            <img src={main} alt={product?.name || "Product"} loading="lazy" />
            <span>
              <Eye size={15} strokeWidth={2.35} />
              View product
            </span>
          </button>
        ) : (
          <div className="svx-detail-image-empty">
            <ImagePlus size={30} strokeWidth={2.2} />
            <span>No image yet</span>
          </div>
        )}
      </div>

      {images.length ? (
        <div className="svx-detail-thumb-strip">
          {images.slice(0, 5).map((image, index) => (
            <button
              type="button"
              key={image?.id || image?.url || index}
              className={cx(image?.isPrimary && "is-active")}
              onClick={() => onViewImage(image)}
              aria-label="View product image"
            >
              <img src={image.url || image.imageUrl} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}


function ProductImageViewer({ image, productName, onClose }) {
  useEffect(() => {
    if (!image) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [image, onClose]);

  if (!image) return null;

  const url = image.url || image.imageUrl || "";

  return (
    <div className="svx-detail-product-viewer-layer" role="dialog" aria-modal="true" aria-label="Product image preview">
      <button
        type="button"
        className="svx-detail-product-viewer-backdrop"
        onClick={onClose}
        aria-label="Close product image preview"
      />

      <section className="svx-detail-product-viewer">
        <header>
          <div>
            <StatusBadge tone={image?.isPrimary ? "success" : "neutral"}>
              {image?.isPrimary ? "Feature image" : "Product image"}
            </StatusBadge>
            <h2>{productName || "Product"}</h2>
          </div>

          <button type="button" className="svx-detail-product-viewer-close" onClick={onClose} aria-label="Close image preview">
            <X size={18} strokeWidth={2.5} />
          </button>
        </header>

        <div className="svx-detail-product-viewer-frame">
          <img src={url} alt={image?.altText || productName || "Product"} />
        </div>
      </section>
    </div>
  );
}


function StockUpdateDrawer({
  open,
  product,
  form,
  saving,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!open || !product) return null;

  const qty = productStock(product);
  const copy = stockActionCopy(form.type);
  const type = cleanString(form.type).toUpperCase();
  const preview = stockPreview(qty, form);
  const change = preview - qty;

  return (
    <div className="svx-stock-drawer-layer" role="dialog" aria-modal="true" aria-label="Update stock">
      <button
        type="button"
        className="svx-stock-drawer-backdrop"
        aria-label="Close stock drawer"
        onClick={onClose}
        disabled={saving}
      />

      <form className="svx-stock-drawer" onSubmit={onSubmit}>
        <header className="svx-stock-drawer-head">
          <div>
            <span className="svx-stock-drawer-kicker">Stock movement</span>
            <h2>Update stock</h2>
            <p>{product?.name || "Product"}</p>
          </div>

          <button type="button" className="svx-stock-drawer-close" onClick={onClose} disabled={saving}>
            <X size={18} strokeWidth={2.4} />
          </button>
        </header>

        <section className="svx-stock-drawer-current">
          <div>
            <span>Current stock</span>
            <strong>{formatNumber(qty)}</strong>
          </div>

          <ChevronRight size={18} strokeWidth={2.4} />

          <div>
            <span>After update</span>
            <strong>{formatNumber(preview)}</strong>
          </div>
        </section>

        <section className="svx-stock-mode-grid" aria-label="Stock action type">
          {[
            { value: "RESTOCK", label: "Restock", text: "New stock arrived" },
            { value: "LOSS", label: "Loss", text: "Stock left without sale" },
            { value: "CORRECTION", label: "Correction", text: "Fix counted stock" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={cx("svx-stock-mode", type === item.value && "is-active")}
              onClick={() => onChange("type", item.value)}
              disabled={saving}
            >
              <strong>{item.label}</strong>
              <span>{item.text}</span>
            </button>
          ))}
        </section>

        <div className="svx-stock-drawer-note">
          <AlertTriangle size={17} strokeWidth={2.35} />
          <span>{copy.note}</span>
        </div>

        <div className="svx-stock-form-grid">
          {type === "CORRECTION" ? (
            <label className="svx-stock-field">
              <span>{copy.quantityLabel}</span>
              <input
                type="number"
                min="0"
                className="svx-stock-input"
                value={form.newStockQty}
                onChange={(event) => onChange("newStockQty", event.target.value)}
                placeholder={copy.quantityPlaceholder}
                disabled={saving}
              />
            </label>
          ) : (
            <label className="svx-stock-field">
              <span>{copy.quantityLabel}</span>
              <input
                type="number"
                min="1"
                className="svx-stock-input"
                value={form.quantity}
                onChange={(event) => onChange("quantity", event.target.value)}
                placeholder={copy.quantityPlaceholder}
                disabled={saving}
              />
            </label>
          )}

          {type === "LOSS" ? (
            <label className="svx-stock-field">
              <span>Reason</span>
              <select
                className="svx-stock-input"
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

          <label className="svx-stock-field is-wide">
            <span>Note</span>
            <textarea
              className="svx-stock-textarea"
              value={form.note}
              onChange={(event) => onChange("note", event.target.value)}
              placeholder="Example: Supplier delivery received, damaged item removed, or physical count corrected."
              disabled={saving}
            />
          </label>
        </div>

        <section className="svx-stock-impact">
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

        <footer className="svx-stock-drawer-actions">
          <button type="button" className="svx-detail-secondary-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>

          <AsyncButton
            type="submit"
            loading={saving}
            loadingText="Saving movement..."
            className="svx-detail-primary-button"
          >
            <Warehouse size={16} strokeWidth={2.35} />
            <span>Save stock update</span>
          </AsyncButton>
        </footer>
      </form>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="svx-detail-empty">
      <p>{title}</p>
      <span>{text}</span>
    </div>
  );
}

export default function InventoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [stockRows, setStockRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stockDrawerOpen, setStockDrawerOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockForm, setStockForm] = useState({
    type: "RESTOCK",
    quantity: "",
    newStockQty: "",
    lossReason: "DAMAGED",
    note: "",
  });

  const loadProduct = useCallback(
    async ({ quiet = false } = {}) => {
      if (!id) return;

      if (!quiet) setLoading(true);

      try {
        const response = await getProductById(id);
        const nextProduct = response?.product || response?.data?.product || response?.data || response;

        setProduct(nextProduct || null);
      } catch (error) {
        console.error("Product detail load failed:", error);
        toast.error(error?.message || "Failed to load product");
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [id],
  );

  const loadMovements = useCallback(async () => {
    if (!id) return;

    setLoadingMovements(true);

    try {
      const response = await getProductStockAdjustments(id, { limit: PAGE_SIZE });
      const rows =
        response?.adjustments ||
        response?.stockAdjustments ||
        response?.items ||
        response?.data?.adjustments ||
        response?.data ||
        [];

      setStockRows(Array.isArray(rows) ? rows.slice(0, PAGE_SIZE) : []);
    } catch (error) {
      console.error("Product stock movement load failed:", error);
      setStockRows([]);
    } finally {
      setLoadingMovements(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
    loadMovements();
  }, [loadProduct, loadMovements]);

  useEffect(() => {
    if (!stockDrawerOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setStockDrawerOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [stockDrawerOpen]);


  async function handleRefresh() {
    setRefreshing(true);

    try {
      await Promise.all([loadProduct({ quiet: true }), loadMovements()]);
      toast.success("Product refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  function openStockDrawer(defaultType = "RESTOCK") {
    setStockForm({
      type: defaultType,
      quantity: "",
      newStockQty: "",
      lossReason: "DAMAGED",
      note: "",
    });
    setStockDrawerOpen(true);
  }

  function updateStockForm(name, value) {
    setStockForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "type"
        ? {
            quantity: "",
            newStockQty: "",
            lossReason: value === "LOSS" ? current.lossReason || "DAMAGED" : current.lossReason,
          }
        : {}),
    }));
  }

  function validateStockForm() {
    const type = cleanString(stockForm.type).toUpperCase();
    const qty = Number(stockForm.quantity);
    const newQty = Number(stockForm.newStockQty);
    const currentQty = productStock(product);

    if (!["RESTOCK", "LOSS", "CORRECTION"].includes(type)) {
      toast.error("Choose a stock movement type");
      return false;
    }

    if (type === "CORRECTION") {
      if (!Number.isFinite(newQty) || newQty < 0) {
        toast.error("Enter the correct stock count");
        return false;
      }

      return true;
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return false;
    }

    if (type === "LOSS" && qty > currentQty) {
      toast.error("You cannot remove more stock than available");
      return false;
    }

    return true;
  }

  async function handleStockSubmit(event) {
    event.preventDefault();

    if (!validateStockForm()) return;

    const type = cleanString(stockForm.type).toUpperCase();

    setStockSaving(true);

    try {
      await adjustStock(id, {
        type,
        quantity: type === "CORRECTION" ? undefined : Number(stockForm.quantity),
        newStockQty: type === "CORRECTION" ? Number(stockForm.newStockQty) : undefined,
        lossReason: type === "LOSS" ? stockForm.lossReason : undefined,
        note: stockForm.note,
      });

      toast.success("Stock updated");
      setStockDrawerOpen(false);
      await Promise.all([loadProduct({ quiet: true }), loadMovements()]);
    } catch (error) {
      console.error("Stock update failed:", error);
      toast.error(error?.message || "Failed to update stock");
    } finally {
      setStockSaving(false);
    }
  }


  const status = productStatus(product);
  const imageStatus = productImageStatus(product);
  const attributes = useMemo(() => normalizedCategoryAttributes(product), [product]);
  const images = productImages(product);

  const qty = productStock(product);
  const reserved = productReserved(product);
  const costPrice = Number(product?.costPrice || 0);
  const sellPrice = Number(product?.sellPrice || product?.price || 0);
  const minStockLevel = Number(product?.minStockLevel || 0);
  const stockSellValue = qty * sellPrice;
  const stockCostValue = qty * costPrice;
  const profitPerItem = sellPrice - costPrice;
  const possibleProfit = qty * profitPerItem;
  const category = categoryText(product);

  if (loading && !product) {
    return <FormPageSkeleton title="Loading product" />;
  }

  if (!product) {
    return (
      <main className="svx-detail-page">
        <div className="svx-detail-shell">
          <button type="button" className="svx-detail-back" onClick={() => navigate("/app/inventory")}>
            <ArrowLeft size={18} strokeWidth={2.4} />
            <span>Inventory</span>
          </button>

          <section className="svx-detail-card">
            <EmptyState title="Product not found" text="The product may have been removed or you may not have access to it." />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="svx-detail-page">
      <div className="svx-detail-shell">
        <header className="svx-detail-hero">
          <div className="svx-detail-hero-copy">
            <button type="button" className="svx-detail-back" onClick={() => navigate("/app/inventory")}>
              <ArrowLeft size={18} strokeWidth={2.4} />
              <span>Inventory</span>
            </button>

            <div className="svx-detail-kicker-row">
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <StatusBadge tone={imageStatus.tone}>{imageStatus.label}</StatusBadge>
            </div>

            <h1>{product?.name || "Product"}</h1>

            <div className="svx-detail-hero-meta">
              <span>{product?.brand || "No brand"}</span>
              <span>{category}</span>
              <span>{branchLabel(product)}</span>
            </div>

            <p>{status.text}</p>
          </div>

          <div className="svx-detail-hero-actions">
            <AsyncButton
              type="button"
              loading={refreshing}
              loadingText="Refreshing..."
              className="svx-detail-secondary-button"
              onClick={handleRefresh}
            >
              <RefreshCw size={16} strokeWidth={2.35} />
              <span>Refresh</span>
            </AsyncButton>

            <Link to={`/app/inventory/${product.id}/edit`} className="svx-detail-primary-button">
              <Edit3 size={16} strokeWidth={2.35} />
              <span>Edit product</span>
            </Link>
          </div>
        </header>

        <section className="svx-detail-summary-grid" aria-label="Product summary">
          <SummaryCard
            icon={Warehouse}
            label="Current stock"
            value={formatNumber(qty)}
            note={reserved > 0 ? `${formatNumber(reserved)} reserved` : branchLabel(product)}
            tone={status.tone}
          />
          <SummaryCard
            icon={DollarSign}
            label="Selling price"
            value={formatRwf(sellPrice)}
            note={`Profit per item ${formatRwf(profitPerItem)}`}
            tone={profitPerItem >= 0 ? "success" : "danger"}
          />
          <SummaryCard
            icon={Tags}
            label="Stock value"
            value={formatRwf(stockSellValue)}
            note={`Cost value ${formatRwf(stockCostValue)}`}
            tone="success"
          />
          <SummaryCard
            icon={ImagePlus}
            label="Product photos"
            value={imageStatus.label}
            note={images.length ? `${images.length} image${images.length === 1 ? "" : "s"} attached` : "Click Add images below"}
            tone={imageStatus.tone}
          />
        </section>

        <div className="svx-detail-layout">
          <div className="svx-detail-main">
            <DetailSection
              icon={PackageCheck}
              title="Product overview"
              text="Clear product information for sales, stock control, and product image preparation."
              action={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
            >
              <div className="svx-detail-overview-grid">
                <Gallery product={product} onViewImage={setImagePreview} />

                <div className="svx-detail-info-grid">
                  <InfoRow label="Product name" value={product?.name} />
                  <InfoRow label="Brand" value={product?.brand || "Not set"} />
                  <InfoRow label="Category" value={category} />
                  <InfoRow label="Type" value={product?.subcategory || product?.subcategoryOther || "Not set"} />
                  <InfoRow label="SKU" value={product?.sku || "Not set"} />
                  <InfoRow label="Barcode" value={product?.barcode || "Not set"} />
                  <InfoRow label="Serial / IMEI" value={product?.serial || "Not tracked"} />
                  <InfoRow label="Status" value={product?.isActive === false ? "Inactive" : "Active"} tone={product?.isActive === false ? "danger" : "success"} />
                </div>
              </div>
            </DetailSection>

            <DetailSection
              icon={Layers3}
              title="Category details"
              text="Category-aware product details saved for this product."
            >
              {attributes.length ? (
                <div className="svx-detail-attribute-grid">
                  {attributes.map((item) => (
                    <InfoRow key={item.key} label={item.label} value={item.value} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No category details yet" text="Edit the product to add processor, memory, condition, unit, size, or other category-specific details." />
              )}
            </DetailSection>

            <DetailSection
              icon={ClipboardList}
              title="Recent stock movement"
              text="Latest restocks, losses, and corrections for this product."
              action={<Link to={`/app/inventory/${product.id}/stock-adjustments`} className="svx-detail-text-link">View history</Link>}
            >
              {loadingMovements ? (
                <div className="svx-detail-movement-loading">
                  {[1, 2, 3].map((item) => (
                    <span key={item} />
                  ))}
                </div>
              ) : stockRows.length ? (
                <div className="svx-detail-movement-list">
                  {stockRows.map((row, index) => {
                    const tone = stockChangeTone(row?.type, row?.delta);

                    return (
                      <div key={row?.id || index} className="svx-detail-movement-row">
                        <div>
                          <strong>{stockChangeLabel(row?.type)}</strong>
                          <span>{formatDateTime(row?.createdAt || row?.date)}</span>
                        </div>

                        <div>
                          <StatusBadge tone={tone}>{stockChangeValue(row)}</StatusBadge>
                          {row?.note ? <small>{row.note}</small> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="No stock movement yet" text="Restocks, losses, and count corrections will appear here." />
              )}
            </DetailSection>
          </div>

          <aside className="svx-detail-side">
            <DetailSection
              icon={Boxes}
              title="Stock control"
              text="Stock quantity can only be changed through stock movement."
            >
              <div className="svx-detail-side-stack">
                <InfoRow label="Current stock" value={formatNumber(qty)} tone={status.tone} />
                <InfoRow label="Low stock alert" value={minStockLevel > 0 ? formatNumber(minStockLevel) : "Not set"} />
                <InfoRow label="Reserved" value={formatNumber(reserved)} />
                <InfoRow label="Branch" value={branchLabel(product)} />
              </div>
            </DetailSection>

            <DetailSection
              icon={DollarSign}
              title="Price and value"
              text="Owner-facing money summary for this product."
            >
              <div className="svx-detail-side-stack">
                <InfoRow label="Cost price" value={formatRwf(costPrice)} />
                <InfoRow label="Selling price" value={formatRwf(sellPrice)} />
                <InfoRow label="Profit per item" value={formatRwf(profitPerItem)} tone={profitPerItem >= 0 ? "success" : "danger"} />
                <InfoRow label="Possible profit" value={formatRwf(possibleProfit)} tone={possibleProfit >= 0 ? "success" : "danger"} />
              </div>
            </DetailSection>

            <DetailSection
              icon={ImagePlus}
              title="Product photos"
              text="Add, view, set primary, or delete images for this product."
            >
              <div className="svx-detail-marketplace-box svx-detail-product-photos-box">
                <div>
                  <StatusBadge tone={imageStatus.tone}>{imageStatus.label}</StatusBadge>
                  <p>{images.length ? `${images.length} image${images.length === 1 ? "" : "s"} attached` : "No product images yet"}</p>
                </div>

                <span>
                  Start here when you want to add photos. Use clear JPG, PNG, or WEBP images up to 5MB each.
                </span>

                {images.length ? (
                  <button
                    type="button"
                    className="svx-detail-marketplace-button"
                    onClick={() => setImagePreview(images.find((image) => image?.isPrimary) || images[0])}
                  >
                    <Eye size={16} strokeWidth={2.35} />
                    <span>View product</span>
                  </button>
                ) : null}

                <Link to={`/app/inventory/${product.id}/images`} className="svx-detail-marketplace-button is-secondary">
                  <ImagePlus size={16} strokeWidth={2.35} />
                  <span>{images.length ? "Manage images" : "Add images"}</span>
                </Link>
              </div>
            </DetailSection>

            <section className="svx-detail-action-card">
              <Link to={`/app/inventory/${product.id}/edit`} className="svx-detail-primary-button">
                <Edit3 size={16} strokeWidth={2.35} />
                <span>Edit product</span>
              </Link>

              <button
                type="button"
                className="svx-detail-secondary-button"
                onClick={() => openStockDrawer("RESTOCK")}
              >
                <Warehouse size={16} strokeWidth={2.35} />
                <span>Update stock</span>
              </button>

              <Link to="/app/inventory" className="svx-detail-muted-link">
                Back to products
                <ChevronRight size={15} strokeWidth={2.4} />
              </Link>
            </section>
          </aside>
        </div>

        <section className="svx-detail-sr-only" aria-label="Product facts">
          <p>{product?.name}</p>
          <p>{category}</p>
          <p>{formatNumber(qty)}</p>
        </section>

        <ProductImageViewer
          image={imagePreview}
          productName={product?.name || "Product"}
          onClose={() => setImagePreview(null)}
        />

        <StockUpdateDrawer
          open={stockDrawerOpen}
          product={product}
          form={stockForm}
          saving={stockSaving}
          onClose={() => setStockDrawerOpen(false)}
          onChange={updateStockForm}
          onSubmit={handleStockSubmit}
        />
      </div>
    </main>
  );
}
