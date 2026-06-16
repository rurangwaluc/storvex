import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
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
} from "lucide-react";

import AsyncButton from "../../components/ui/AsyncButton";
import FormPageSkeleton from "../../components/ui/FormPageSkeleton";
import {
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

function marketplaceStatus(product) {
  const status = cleanString(product?.marketplaceStatus).toUpperCase();

  if (status === "PUBLISHED") return { label: "Published", tone: "success" };
  if (status === "DRAFT") return { label: "Draft", tone: "warning" };
  if (status === "UNPUBLISHED") return { label: "Unpublished", tone: "neutral" };

  return { label: "Internal only", tone: "neutral" };
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

function Gallery({ product }) {
  const images = productImages(product);
  const main = primaryImage(product);

  return (
    <div className="svx-detail-gallery">
      <div className="svx-detail-main-image">
        {main ? (
          <img src={main} alt={product?.name || "Product"} loading="lazy" />
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
            <span key={image?.id || image?.url || index}>
              <img src={image.url || image.imageUrl} alt="" loading="lazy" />
            </span>
          ))}
        </div>
      ) : null}
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

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await Promise.all([loadProduct({ quiet: true }), loadMovements()]);
      toast.success("Product refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  const status = productStatus(product);
  const marketplace = marketplaceStatus(product);
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
              <StatusBadge tone={marketplace.tone}>{marketplace.label}</StatusBadge>
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
            icon={ShoppingCart}
            label="Marketplace"
            value={marketplace.label}
            note={images.length ? `${images.length} image${images.length === 1 ? "" : "s"} ready` : "No images yet"}
            tone={marketplace.tone}
          />
        </section>

        <div className="svx-detail-layout">
          <div className="svx-detail-main">
            <DetailSection
              icon={PackageCheck}
              title="Product overview"
              text="Clear product information for sales, stock control, and marketplace preparation."
              action={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
            >
              <div className="svx-detail-overview-grid">
                <Gallery product={product} />

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
              title="Marketplace readiness"
              text="Images are only required when publishing this product."
            >
              <div className="svx-detail-marketplace-box">
                <div>
                  <StatusBadge tone={marketplace.tone}>{marketplace.label}</StatusBadge>
                  <p>{images.length ? `${images.length} image${images.length === 1 ? "" : "s"} available` : "No images attached yet"}</p>
                </div>

                <span>
                  Products stay private until the owner reviews images, public details, and chooses to publish.
                </span>
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
                onClick={() => toast("Update stock drawer is next.")}
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
      </div>
    </main>
  );
}
