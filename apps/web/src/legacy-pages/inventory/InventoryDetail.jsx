import { useEffect, useMemo, useState } from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  defaultStockAdjustmentReason,
  stockAdjustmentReasons,
} from "../../lib/stockAdjustmentReasons";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  ChevronRight,
  ClipboardList,
  Edit3,
  Eye,
  ImagePlus,
  Layers3,
  PackageCheck,
  ShoppingCart,
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
  publishProductListing,
  unpublishProductListing,
  updateProductListingDraft,
} from "../../services/inventoryApi";
import { useAuthRole } from "../../auth/useAuthRole";
import { getActiveBranchId } from "../../services/apiClient";
import {
  inventoryQueryKeys,
  unwrapProductResponse,
} from "../../lib/inventoryQueryKeys";
import {
  marketplaceQueryKeys,
} from "../../lib/marketplaceQueryKeys";
import {
  internalWorkspaceQueryOptions,
} from "../../lib/internalWorkspaceQuery";
import {
  evaluateMarketplaceListingQuality,
} from "../../lib/marketplaceListingQuality";
import {
  getMarketplaceCatalogue,
} from "../../services/marketplaceApi";
import {
  normalizeBusinessCategory,
} from "../../utils/productFormConfig";
import {
  getApprovedProductImages,
  getProductImageUrl,
} from "../../utils/productImages";
import "./InventoryDetail.css";

const PAGE_SIZE = 6;
const MARKETPLACE_DEPARTMENT_BY_BUSINESS_CATEGORY = {
  ELECTRONICS: "electronics",
  HARDWARE: "hardware",
  HOME_KITCHEN: "home-and-kitchen",
  LIGHTING: "lighting",
  SPARE_PARTS: "spare-parts",
};

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function normalizeMarketplaceNodeValue(value) {
  return cleanString(value).toLowerCase();
}

function workspaceBusinessCategory(workspace) {
  return normalizeBusinessCategory(
    workspace?.tenant?.shopType ||
    workspace?.tenant?.businessCategory ||
    workspace?.tenant?.category ||
    workspace?.business?.shopType ||
    workspace?.business?.businessCategory ||
    workspace?.business?.category ||
    workspace?.shopType ||
    workspace?.businessCategory ||
    workspace?.category,
  );
}

function marketplaceNodeValue(node) {
  return cleanString(
    node?.slug ||
    node?.key ||
    node?.label,
  );
}

function findMarketplaceNode(nodes, value) {
  const wanted =
    normalizeMarketplaceNodeValue(value);

  if (!wanted || !Array.isArray(nodes)) {
    return null;
  }

  return (
    nodes.find((node) => {
      const values = [
        node?.slug,
        node?.key,
        node?.label,
      ]
        .map(normalizeMarketplaceNodeValue)
        .filter(Boolean);

      return values.includes(wanted);
    }) || null
  );
}

function marketplaceDepartmentForBusiness(
  businessCategory,
) {
  return (
    MARKETPLACE_DEPARTMENT_BY_BUSINESS_CATEGORY[
      businessCategory
    ] || ""
  );
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
  return getApprovedProductImages(product);
}

function categoryText(product) {
  return (
    cleanString(product?.category) ||
    cleanString(product?.listingCategory || product?.marketplaceCategory) ||
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

function productListingStatus(product) {
  const raw = cleanString(product?.listingStatus || product?.marketplaceStatus).toUpperCase();

  if (raw === "PUBLISHED" || raw === "LIVE") {
    return {
      value: "PUBLISHED",
      label: "Published",
      tone: "success",
      text: "This product is marked ready for future public listing flows.",
    };
  }

  if (raw === "DRAFT") {
    return {
      value: "DRAFT",
      label: "Draft",
      tone: "warning",
      text: "Listing details are saved but not published.",
    };
  }

  return {
    value: "INTERNAL",
    label: "Internal only",
    tone: "neutral",
    text: "This product is private to inventory and sales.",
  };
}

function toDateTimeLocalInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(
    date.getTime() - offset * 60 * 1000,
  );

  return localDate.toISOString().slice(0, 16);
}

function listingFormFromProduct(
  product,
  fallbackCategory,
) {
  return {
    title: cleanString(
      product?.listingTitle ||
      product?.marketplaceTitle ||
      product?.name,
    ),
    description: cleanString(
      product?.listingDescription ||
      product?.marketplaceDescription,
    ),
    price: cleanString(
      product?.listingPrice ??
      product?.marketplacePrice ??
      product?.sellPrice ??
      "",
    ),
    salePrice: cleanString(
      product?.listingSalePrice ??
      product?.marketplaceSalePrice ??
      "",
    ),
    saleStartsAt: toDateTimeLocalInput(
      product?.listingSaleStartsAt ??
      product?.marketplaceSaleStartsAt,
    ),
    saleEndsAt: toDateTimeLocalInput(
      product?.listingSaleEndsAt ??
      product?.marketplaceSaleEndsAt,
    ),
    category: cleanString(
      product?.listingCategory ||
      product?.marketplaceCategory,
    ),
    subcategory: cleanString(
      product?.listingSubcategory ||
      product?.marketplaceSubcategory,
    ),
    leafCategory: cleanString(
      product?.listingLeafCategory ||
      product?.marketplaceLeafCategory,
    ),
  };
}

function mergeListingPayloadIntoProduct(
  product,
  payload,
) {
  if (!product || typeof product !== "object") {
    return product;
  }

  return {
    ...product,

    listingTitle: payload.listingTitle,
    marketplaceTitle: payload.listingTitle,

    listingDescription:
      payload.listingDescription,
    marketplaceDescription:
      payload.listingDescription,

    listingPrice: payload.listingPrice,
    marketplacePrice: payload.listingPrice,

    listingCategory: payload.listingCategory,
    marketplaceCategory: payload.listingCategory,

    listingSubcategory:
      payload.listingSubcategory,
    marketplaceSubcategory:
      payload.listingSubcategory,

    listingLeafCategory:
      payload.listingLeafCategory,
    marketplaceLeafCategory:
      payload.listingLeafCategory,

    listingSalePrice:
      payload.listingSalePrice,
    marketplaceSalePrice:
      payload.listingSalePrice,

    listingSaleStartsAt:
      payload.listingSaleStartsAt,
    marketplaceSaleStartsAt:
      payload.listingSaleStartsAt,

    listingSaleEndsAt:
      payload.listingSaleEndsAt,
    marketplaceSaleEndsAt:
      payload.listingSaleEndsAt,
  };
}

function listingPayloadFromForm(
  form,
  { includeSale = false } = {},
) {
  const payload = {
    listingTitle: cleanString(form.title),
    listingDescription: cleanString(
      form.description,
    ),
    listingPrice: Number(form.price || 0),
    listingCategory: cleanString(form.category),
    listingSubcategory:
      cleanString(form.subcategory),
    listingLeafCategory:
      cleanString(form.leafCategory),
  };

  if (!includeSale) {
    return payload;
  }

  payload.listingSalePrice =
    cleanString(form.salePrice) === ""
      ? null
      : Number(form.salePrice);

  payload.listingSaleStartsAt =
    cleanString(form.saleStartsAt) || null;

  payload.listingSaleEndsAt =
    cleanString(form.saleEndsAt) || null;

  return payload;
}

function branchLabel(product) {
  const scope = product?.branchScope || {};
  const code = cleanString(scope?.code || scope?.branchCode);
  const name =
    cleanString(scope?.name || scope?.branchName) ||
    cleanString(localStorage.getItem("activeBranchName"));
  const storedCode = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `Branch: ${code} - ${name}`;
  if (storedCode && name) return `Branch: ${storedCode} - ${name}`;
  if (name) return `Branch: ${name}`;
  if (code) return `Branch: ${code}`;
  if (storedCode) return `Branch: ${storedCode}`;

  return "Current branch";
}

function normalizedCategoryAttributes(product) {
  const raw =
    product?.categoryAttributes ||
    product?.listingAttributes ||
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

  if (!images.length) return null;

  const mainImage = images[0];
  const main = getProductImageUrl(mainImage);

  if (!main) return null;

  return (
    <div className="svx-detail-gallery">
      <div className="svx-detail-main-image">
        <button
          type="button"
          className="svx-detail-main-image-view"
          onClick={() => onViewImage(mainImage)}
          aria-label="View product image"
        >
          <img
            src={main}
            alt={product?.name || "Product"}
            loading="lazy"
          />

          <span>
            <Eye size={15} strokeWidth={2.35} />
            View product image
          </span>
        </button>
      </div>

      {images.length > 1 ? (
        <div className="svx-detail-thumb-strip">
          {images.slice(0, 5).map(
            (image, index) => (
              <button
                type="button"
                key={
                  image?.id ||
                  getProductImageUrl(image) ||
                  index
                }
                className={cx(
                  index === 0 && "is-active",
                )}
                onClick={() =>
                  onViewImage(image)
                }
                aria-label="View product image"
              >
                <img
                  src={getProductImageUrl(image)}
                  alt=""
                  loading="lazy"
                />
              </button>
            ),
          )}
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

  const url = getProductImageUrl(image);

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

          <label className="svx-stock-field">
            <span>
              Reason <b aria-hidden="true">*</b>
            </span>
            <select
              className="svx-stock-input"
              value={form.reason}
              onChange={(event) =>
                onChange(
                  "reason",
                  event.target.value,
                )
              }
              disabled={saving}
              required
            >
              {stockAdjustmentReasons(
                type,
              ).map((reason) => (
                <option
                  key={reason.value}
                  value={reason.value}
                >
                  {reason.label}
                </option>
              ))}
            </select>
          </label>

          <label className="svx-stock-field is-wide">
            <span>Additional details</span>
            <textarea
              className="svx-stock-textarea"
              value={form.note}
              onChange={(event) => onChange("note", event.target.value)}
              placeholder="Example: Supplier delivery received, damaged item removed, or physical count corrected."
              disabled={saving}
            />
          </label>
        </div>

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
  const userRole = useAuthRole();
  const isOwner = userRole === "OWNER";
  const queryClient = useQueryClient();

  const [activeBranchId, setActiveBranchId] = useState(
    () => getActiveBranchId() || "default",
  );

  const productQueryKey = inventoryQueryKeys.product(
    activeBranchId,
    id,
  );

  const productQuery = useQuery({
    queryKey: productQueryKey,
    queryFn: async () => {
      const response = await getProductById(id);
      return unwrapProductResponse(response);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const product = productQuery.data || null;
  const loading = productQuery.isPending;

  const [listingForm, setListingForm] = useState({
    title: "",
    description: "",
    price: "",
    salePrice: "",
    saleStartsAt: "",
    saleEndsAt: "",
    category: "",
    subcategory: "",
    leafCategory: "",
  });

  const workspaceQuery = useQuery({
    ...internalWorkspaceQueryOptions,
  });

  const registeredBusinessCategory =
    workspaceBusinessCategory(
      workspaceQuery.data,
    );

  const marketplaceCatalogueQuery = useQuery({
    queryKey:
      marketplaceQueryKeys.catalogue(),
    queryFn: getMarketplaceCatalogue,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const marketplaceCategories =
    Array.isArray(
      marketplaceCatalogueQuery
        .data?.categories,
    )
      ? marketplaceCatalogueQuery
          .data.categories
      : [];

  const registeredMarketplaceDepartment =
    marketplaceDepartmentForBusiness(
      registeredBusinessCategory,
    );

  const registeredMarketplaceCategory =
    useMemo(
      () =>
        findMarketplaceNode(
          marketplaceCategories,
          registeredMarketplaceDepartment,
        ),
      [
        marketplaceCategories,
        registeredMarketplaceDepartment,
      ],
    );

  const marketplaceCategoryOptions =
    useMemo(
      () =>
        registeredMarketplaceCategory
          ? [registeredMarketplaceCategory]
          : marketplaceCategories,
      [
        registeredMarketplaceCategory,
        marketplaceCategories,
      ],
    );

  const selectedMarketplaceCategory =
    useMemo(
      () =>
        findMarketplaceNode(
          marketplaceCategoryOptions,
          listingForm.category,
        ),
      [
        marketplaceCategoryOptions,
        listingForm.category,
      ],
    );

  const marketplaceSubcategories =
    Array.isArray(
      selectedMarketplaceCategory
        ?.children,
    )
      ? selectedMarketplaceCategory
          .children
      : [];

  const selectedMarketplaceSubcategory =
    useMemo(
      () =>
        findMarketplaceNode(
          marketplaceSubcategories,
          listingForm.subcategory,
        ),
      [
        marketplaceSubcategories,
        listingForm.subcategory,
      ],
    );

  const marketplaceLeafCategories =
    Array.isArray(
      selectedMarketplaceSubcategory
        ?.children,
    )
      ? selectedMarketplaceSubcategory
          .children
      : [];

  const selectedMarketplaceLeafCategory =
    useMemo(
      () =>
        findMarketplaceNode(
          marketplaceLeafCategories,
          listingForm.leafCategory,
        ),
      [
        marketplaceLeafCategories,
        listingForm.leafCategory,
      ],
    );

  const marketplaceCategoryPathComplete =
    Boolean(
      selectedMarketplaceCategory &&
      (
        marketplaceSubcategories.length === 0 ||
        (
          selectedMarketplaceSubcategory &&
          (
            marketplaceLeafCategories.length === 0 ||
            selectedMarketplaceLeafCategory
          )
        )
      ),
    );

  function setProduct(updater) {
    queryClient.setQueryData(
      productQueryKey,
      (currentProduct) =>
        typeof updater === "function"
          ? updater(currentProduct)
          : updater,
    );
  }
  const [stockDrawerOpen, setStockDrawerOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [listingSaving, setListingSaving] = useState("");
  const [listingEditorOpen, setListingEditorOpen] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockForm, setStockForm] = useState({
    type: "RESTOCK",
    quantity: "",
    newStockQty: "",
    reason:
      defaultStockAdjustmentReason("RESTOCK"),
    note: "",
  });

  useEffect(() => {
    function refreshActiveBranch() {
      setActiveBranchId(
        getActiveBranchId() || "default",
      );
    }

    function handleStorage(event) {
      if (
        event.key === "activeBranchId" ||
        event.key === "storvex_activeBranchId" ||
        event.key === "storvex_active_branch_id" ||
        event.key === "storvex_me_cache_v2"
      ) {
        refreshActiveBranch();
      }
    }

    window.addEventListener(
      "storvex:workspace-refreshed",
      refreshActiveBranch,
    );
    window.addEventListener(
      "storage",
      handleStorage,
    );

    return () => {
      window.removeEventListener(
        "storvex:workspace-refreshed",
        refreshActiveBranch,
      );
      window.removeEventListener(
        "storage",
        handleStorage,
      );
    };
  }, []);

  useEffect(() => {
    if (!productQuery.error) return;

    console.error(
      "Product detail load failed:",
      productQuery.error,
    );

    toast.error(
      productQuery.error?.message ||
        "Failed to load product",
      {
        id: `inventory-product-${id}-load-error`,
      },
    );
  }, [id, productQuery.error]);

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

  useEffect(() => {
    if (!product) return;

    const nextForm =
      listingFormFromProduct(product);

    if (registeredMarketplaceCategory) {
      const registeredCategoryValue =
        marketplaceNodeValue(
          registeredMarketplaceCategory,
        );

      const sameDepartment =
        normalizeMarketplaceNodeValue(
          nextForm.category,
        ) ===
        normalizeMarketplaceNodeValue(
          registeredCategoryValue,
        );

      nextForm.category =
        registeredCategoryValue;

      if (!sameDepartment) {
        nextForm.subcategory = "";
        nextForm.leafCategory = "";
      }
    }

    setListingForm(nextForm);
  }, [
    product,
    registeredMarketplaceCategory,
  ]);

  function updateListingField(name, value) {
    setListingForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateMarketplaceCategory(value) {
    setListingForm((current) => ({
      ...current,
      category: value,
      subcategory: "",
      leafCategory: "",
    }));
  }

  function updateMarketplaceSubcategory(value) {
    setListingForm((current) => ({
      ...current,
      subcategory: value,
      leafCategory: "",
    }));
  }

  function updateMarketplaceLeafCategory(value) {
    setListingForm((current) => ({
      ...current,
      leafCategory: value,
    }));
  }

  function openNativeDateTimePicker(event) {
    const input = event.currentTarget;

    if (
      typeof input.showPicker === "function" &&
      !input.disabled
    ) {
      try {
        input.showPicker();
      } catch {
        /*
         * Some browsers restrict showPicker() depending on
         * the interaction context. The native input remains
         * fully usable when that happens.
         */
      }
    }
  }

  function updateListingDateField(name, event) {
    const input = event.currentTarget;

    updateListingField(name, input.value);

    /*
     * Native date pickers close after selection when the
     * input releases focus. Keep this inside the next frame
     * so the selected value is committed first.
     */
    window.requestAnimationFrame(() => {
      input.blur();
    });
  }

  function validateListing({ publishing = false } = {}) {
    const payload = listingPayloadFromForm(
      listingForm,
      {
        includeSale: isOwner,
      },
    );

    if (!payload.listingTitle) {
      toast.error("Listing title is required");
      return null;
    }

    if (marketplaceCatalogueQuery.isPending) {
      toast.error(
        "Marketplace categories are still loading",
      );
      return null;
    }

    if (marketplaceCatalogueQuery.isError) {
      toast.error(
        "Marketplace categories could not be loaded. Try again.",
      );
      return null;
    }

    if (!selectedMarketplaceCategory) {
      toast.error(
        "Choose a Marketplace category",
      );
      return null;
    }

    if (
      publishing &&
      marketplaceSubcategories.length > 0 &&
      !selectedMarketplaceSubcategory
    ) {
      toast.error(
        "Choose a Marketplace subcategory",
      );
      return null;
    }

    if (
      publishing &&
      marketplaceLeafCategories.length > 0 &&
      !selectedMarketplaceLeafCategory
    ) {
      toast.error(
        "Choose the product type",
      );
      return null;
    }

    payload.listingCategory =
      marketplaceNodeValue(
        selectedMarketplaceCategory,
      );

    payload.listingSubcategory =
      selectedMarketplaceSubcategory
        ? marketplaceNodeValue(
            selectedMarketplaceSubcategory,
          )
        : "";

    payload.listingLeafCategory =
      selectedMarketplaceLeafCategory
        ? marketplaceNodeValue(
            selectedMarketplaceLeafCategory,
          )
        : "";

    if (!Number.isFinite(payload.listingPrice) || payload.listingPrice < 0) {
      toast.error("Listing price must be 0 or more");
      return null;
    }

    if (
      isOwner &&
      payload.listingSalePrice !== null &&
      (
        !Number.isFinite(
          payload.listingSalePrice,
        ) ||
        payload.listingSalePrice < 0
      )
    ) {
      toast.error("Sale price must be 0 or more");
      return null;
    }

    if (
      isOwner &&
      payload.listingSalePrice !== null &&
      payload.listingSalePrice >=
        payload.listingPrice
    ) {
      toast.error(
        "Sale price must be lower than the normal listing price",
      );
      return null;
    }

    if (
      isOwner &&
      payload.listingSaleStartsAt &&
      payload.listingSaleEndsAt &&
      new Date(payload.listingSaleEndsAt) <=
        new Date(payload.listingSaleStartsAt)
    ) {
      toast.error(
        "Sale end must be after the sale start",
      );
      return null;
    }

    if (publishing && !payload.listingDescription) {
      toast.error("Listing description is required before publishing");
      return null;
    }

    if (publishing && !images.length) {
      toast.error("Add at least one product image before publishing");
      return null;
    }

    return payload;
  }

  async function saveListingDraft() {
    const payload = validateListing();
    if (!payload) return;

    setListingSaving("draft");

    try {
      const submittedForm = {
        ...listingForm,
      };

      const response =
        await updateProductListingDraft(
          product.id,
          payload,
        );

      const nextProduct =
        response?.product ||
        response?.data?.product ||
        response?.data ||
        response;

      if (nextProduct?.id) {
        setProduct(
          mergeListingPayloadIntoProduct(
            nextProduct,
            payload,
          ),
        );
      } else {
        await productQuery.refetch();
      }

      setListingForm(submittedForm);

      void queryClient.invalidateQueries({
        queryKey: marketplaceQueryKeys.all,
      });

      toast.success("Listing draft saved");
    } catch (error) {
      toast.error(error?.message || "Failed to save listing draft");
    } finally {
      setListingSaving("");
    }
  }

  async function publishListing() {
    const payload = validateListing({ publishing: true });
    if (!payload) return;

    setListingSaving("publish");

    try {
      await publishProductListing(
        product.id,
        payload,
      );

      /*
       * Marketplace operations must never replace branch-aware
       * inventory values. Update listing fields only.
       */
      setProduct((current) => ({
        ...current,
        listingStatus: "PUBLISHED",
        marketplaceStatus: "PUBLISHED",
        listingTitle: payload.listingTitle,
        marketplaceTitle: payload.listingTitle,
        listingDescription: payload.listingDescription,
        marketplaceDescription: payload.listingDescription,
        listingPrice: payload.listingPrice,
        marketplacePrice: payload.listingPrice,
        listingCategory: payload.listingCategory,
        marketplaceCategory: payload.listingCategory,
        listingSubcategory:
          payload.listingSubcategory,
        marketplaceSubcategory:
          payload.listingSubcategory,
        listingLeafCategory:
          payload.listingLeafCategory,
        marketplaceLeafCategory:
          payload.listingLeafCategory,
        listingSalePrice:
          payload.listingSalePrice ?? null,
        marketplaceSalePrice:
          payload.listingSalePrice ?? null,
        listingSaleStartsAt:
          payload.listingSaleStartsAt ?? null,
        marketplaceSaleStartsAt:
          payload.listingSaleStartsAt ?? null,
        listingSaleEndsAt:
          payload.listingSaleEndsAt ?? null,
        marketplaceSaleEndsAt:
          payload.listingSaleEndsAt ?? null,
      }));

      void queryClient.invalidateQueries({
        queryKey: marketplaceQueryKeys.all,
      });

      toast.success("Product published");
    } catch (error) {
      toast.error(
        error?.message ||
          "Failed to publish product"
      );
    } finally {
      setListingSaving("");
    }
  }

  async function unpublishListing() {
    setListingSaving("unpublish");

    try {
      await unpublishProductListing(product.id);

      /*
       * Unpublishing changes marketplace visibility only.
       * Stock, prices, product identity, photos, and branch
       * inventory remain untouched.
       */
      setProduct((current) => ({
        ...current,
        listingStatus: "INTERNAL",
        marketplaceStatus: "INTERNAL",
      }));

      void queryClient.invalidateQueries({
        queryKey: marketplaceQueryKeys.all,
      });

      toast.success("Product unpublished");
    } catch (error) {
      toast.error(
        error?.message ||
          "Failed to unpublish product"
      );
    } finally {
      setListingSaving("");
    }
  }

  function openStockDrawer(defaultType = "RESTOCK") {
    setStockForm({
      type: defaultType,
      quantity: "",
      newStockQty: "",
      reason:
      defaultStockAdjustmentReason("RESTOCK"),
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
            reason:
              defaultStockAdjustmentReason(
                value,
              ),
          }
        : {}),
    }));
  }

  function validateStockForm() {
    const type = cleanString(stockForm.type).toUpperCase();
    const qty = Number(stockForm.quantity);
    const newQty = Number(stockForm.newStockQty);
    const currentQty = productStock(product);

    const reason = cleanString(
      stockForm.reason,
    ).toUpperCase();

    if (!reason) {
      toast.error(
        "Choose a reason for this stock update",
      );
      return false;
    }

    if (
      reason === "OTHER" &&
      !cleanString(stockForm.note)
    ) {
      toast.error(
        "Explain the stock update when Other is selected",
      );
      return false;
    }

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
        reason: stockForm.reason,
        note: stockForm.note,
      });

      toast.success("Stock updated");
      setStockDrawerOpen(false);
      await productQuery.refetch();

      void queryClient.invalidateQueries({
        queryKey:
          marketplaceQueryKeys.ownerSettings(),
      });
    } catch (error) {
      console.error("Stock update failed:", error);
      toast.error(error?.message || "Failed to update stock");
    } finally {
      setStockSaving(false);
    }
  }

  const status = productStatus(product);
  const imageStatus = productImageStatus(product);
  const listingStatus = productListingStatus(product);
  const attributes = useMemo(() => normalizedCategoryAttributes(product), [product]);
  const images = productImages(product);
  const hasApprovedPhoto = images.length > 0;
  const listingQuality = useMemo(
    () => evaluateMarketplaceListingQuality({
      title: listingForm.title,
      description: listingForm.description,
      price: listingForm.price,
      category:
        marketplaceNodeValue(
          selectedMarketplaceCategory,
        ) || listingForm.category,
      subcategory:
        marketplaceNodeValue(
          selectedMarketplaceSubcategory,
        ) || listingForm.subcategory,
      leafCategory:
        marketplaceNodeValue(
          selectedMarketplaceLeafCategory,
        ) || listingForm.leafCategory,
      attributes:
        product?.listingAttributes ||
        product?.marketplaceAttributes ||
        {},
      approvedImageCount: images.length,
    }),
    [
      images.length,
      listingForm,
      product?.listingAttributes,
      product?.marketplaceAttributes,
      selectedMarketplaceCategory,
      selectedMarketplaceLeafCategory,
      selectedMarketplaceSubcategory,
    ],
  );
  const listingPrice = Number(listingForm.price || 0);
  const listingDetailsComplete = Boolean(
    cleanString(listingForm.title) &&
      cleanString(listingForm.category) &&
      cleanString(listingForm.description) &&
      Number.isFinite(listingPrice) &&
      listingPrice >= 0
  );
  const isPublished =
    listingStatus.value === "PUBLISHED";

  const qty = productStock(product);
  const reserved = productReserved(product);
  const costPrice = Number(product?.costPrice || 0);
  const sellPrice = Number(product?.sellPrice || product?.price || 0);
  const minStockLevel = Number(product?.minStockLevel || 0);
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

            <h1 className="svx-detail-product-title">{product?.name || "Product"}</h1>

            <div className="svx-detail-hero-meta">
              <span>Brand: {product?.brand || "No brand"}</span>
              <span>Category: {category}</span>
              <span>{branchLabel(product)}</span>
            </div>

            <p>{status.text}</p>
          </div>

          <div className="svx-detail-hero-actions">
            <button
              type="button"
              className="svx-detail-secondary-button"
              onClick={() => openStockDrawer("RESTOCK")}
            >
              <Warehouse size={16} strokeWidth={2.35} />
              <span>Update stock</span>
            </button>

            <Link
              to={`/app/inventory/${product.id}/edit`}
              className="svx-detail-primary-button"
            >
              <Edit3 size={16} strokeWidth={2.35} />
              <span>Edit product</span>
            </Link>
          </div>
        </header>

        <div className="svx-detail-layout">
          <div className="svx-detail-main">
            <DetailSection
              icon={PackageCheck}
              title="Product overview"
              text="Clear product information for sales, stock control, and product image preparation."
              action={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
            >
              <div
                className={cx(
                  "svx-detail-overview-grid",
                  !images.length &&
                    "is-without-image",
                )}
              >
                {images.length ? (
                  <Gallery
                    product={product}
                    onViewImage={setImagePreview}
                  />
                ) : (
                  <Link
                    to={`/app/inventory/${product.id}/images?setup=1`}
                    className="svx-detail-add-photo"
                  >
                    <span
                      className="svx-detail-add-photo-icon"
                      aria-hidden="true"
                    >
                      <ImagePlus
                        size={22}
                        strokeWidth={2.3}
                      />
                    </span>

                    <span className="svx-detail-add-photo-copy">
                      <strong>Add product photos</strong>
                      <small>
                        Add and prepare a clear photo so staff can
                        recognise this product and it can be published
                        to the marketplace.
                      </small>
                    </span>

                    <ChevronRight
                      size={18}
                      strokeWidth={2.4}
                    />
                  </Link>
                )}

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
              icon={ShoppingCart}
              title="Marketplace readiness"
              text="See what is ready and the next action needed before this product can be published."
            >
              <div className="svx-detail-readiness">
                <div className="svx-detail-marketplace-summary">
                  <div>
                    <div className="svx-detail-marketplace-title-row">
                      <h3>
                        {isPublished
                          ? "Published"
                          : !hasApprovedPhoto
                            ? "Add product photos"
                            : !listingDetailsComplete
                              ? "Complete marketplace details"
                              : "Ready to publish"}
                      </h3>

                      <StatusBadge
                        tone={
                          isPublished
                            ? "success"
                            : hasApprovedPhoto &&
                                listingDetailsComplete
                              ? "success"
                              : "warning"
                        }
                      >
                        {isPublished
                          ? "Published"
                          : hasApprovedPhoto &&
                              listingDetailsComplete
                            ? "Ready"
                            : "Action needed"}
                      </StatusBadge>
                    </div>

                    <p>
                      {isPublished
                        ? "This product is visible in the marketplace."
                        : !hasApprovedPhoto
                          ? "Add and approve one prepared product photo before publishing."
                          : !listingDetailsComplete
                            ? "Add the public title, category, price, and description."
                            : "The product photo and marketplace details are complete."}
                    </p>
                  </div>

                  <div className="svx-detail-marketplace-facts">
                    <span>
                      <strong>{images.length}</strong>
                      {images.length === 1
                        ? " photo ready"
                        : " photos ready"}
                    </span>

                    <span>
                      <strong>
                        {listingDetailsComplete
                          ? "Complete"
                          : "Incomplete"}
                      </strong>
                      Marketplace details
                    </span>
                  </div>
                </div>

                <div className="svx-detail-readiness-actions">
                  {!hasApprovedPhoto ? (
                    <Link
                      to={`/app/inventory/${product.id}/images?setup=1`}
                      className="svx-detail-primary-button"
                    >
                      <ImagePlus size={16} strokeWidth={2.35} />
                      <span>Add product photos</span>
                    </Link>
                  ) : (
                    <Link
                      to={`/app/inventory/${product.id}/images`}
                      className="svx-detail-secondary-button"
                    >
                      <ImagePlus size={16} strokeWidth={2.35} />
                      <span>Manage photos</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    className={
                      listingEditorOpen
                        ? "svx-detail-secondary-button"
                        : "svx-detail-primary-button"
                    }
                    onClick={() =>
                      setListingEditorOpen(
                        (current) => !current
                      )
                    }
                  >
                    <ClipboardList
                      size={16}
                      strokeWidth={2.35}
                    />
                    <span>
                      {listingEditorOpen
                        ? "Close marketplace details"
                        : isPublished
                          ? "Edit marketplace details"
                          : listingDetailsComplete &&
                              marketplaceCategoryPathComplete
                            ? "Edit marketplace details"
                            : "Complete marketplace details"}
                    </span>
                  </button>

                  {!isPublished &&
                  hasApprovedPhoto &&
                  listingDetailsComplete &&
                  marketplaceCategoryPathComplete ? (
                    <AsyncButton
                      type="button"
                      loading={listingSaving === "publish"}
                      loadingText="Publishing..."
                      className="svx-detail-primary-button"
                      onClick={publishListing}
                      disabled={Boolean(listingSaving)}
                    >
                      <ShoppingCart
                        size={16}
                        strokeWidth={2.35}
                      />
                      <span>Publish product</span>
                    </AsyncButton>
                  ) : null}

                  {isPublished ? (
                    <AsyncButton
                      type="button"
                      loading={listingSaving === "unpublish"}
                      loadingText="Unpublishing..."
                      className="svx-detail-secondary-button"
                      onClick={unpublishListing}
                      disabled={Boolean(listingSaving)}
                    >
                      <X size={16} strokeWidth={2.35} />
                      <span>Unpublish</span>
                    </AsyncButton>
                  ) : null}
                </div>

                {listingEditorOpen ? (
                  <div className="svx-detail-listing-editor">
                    <div className="svx-detail-listing-editor-head">
                      <div>
                        <h3>Marketplace details</h3>
                        <p>
                          Edit only the information customers will see.
                        </p>
                      </div>

                      <StatusBadge tone={listingStatus.tone}>
                        {listingStatus.label}
                      </StatusBadge>
                    </div>

                    <div className="svx-detail-listing-compact-form">
                      <label className="svx-detail-listing-field">
                        <span>Marketplace title</span>
                        <input
                          value={listingForm.title}
                          onChange={(event) =>
                            updateListingField(
                              "title",
                              event.target.value
                            )
                          }
                          placeholder="Product name customers will see"
                          disabled={Boolean(listingSaving)}
                        />
                      </label>

                      <div className="svx-detail-listing-field-grid">
                        <label className="svx-detail-listing-field">
                          <span>Marketplace price</span>
                          <input
                            type="number"
                            min="0"
                            value={listingForm.price}
                            onChange={(event) =>
                              updateListingField(
                                "price",
                                event.target.value
                              )
                            }
                            placeholder="0"
                            disabled={Boolean(listingSaving)}
                          />
                        </label>

                        <label className="svx-detail-listing-field">
                          <span>Marketplace category</span>
                          <select
                            value={
                              selectedMarketplaceCategory
                                ? marketplaceNodeValue(
                                    selectedMarketplaceCategory,
                                  )
                                : ""
                            }
                            onChange={(event) =>
                              updateMarketplaceCategory(
                                event.target.value,
                              )
                            }
                            disabled={
                              Boolean(listingSaving) ||
                              workspaceQuery.isPending ||
                              marketplaceCatalogueQuery.isPending ||
                              marketplaceCatalogueQuery.isError ||
                              Boolean(
                                registeredMarketplaceCategory,
                              )
                            }
                          >
                            <option value="">
                              {marketplaceCatalogueQuery.isPending
                                ? "Loading categories..."
                                : marketplaceCatalogueQuery.isError
                                  ? "Categories unavailable"
                                  : "Choose category"}
                            </option>

                            {marketplaceCategoryOptions.map(
                              (category) => (
                                <option
                                  key={
                                    category.key ||
                                    category.slug
                                  }
                                  value={marketplaceNodeValue(
                                    category,
                                  )}
                                >
                                  {category.label}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      </div>

                      {marketplaceSubcategories.length ? (
                        <div className="svx-detail-listing-field-grid">
                          <label className="svx-detail-listing-field">
                            <span>Subcategory</span>
                            <select
                              value={
                                selectedMarketplaceSubcategory
                                  ? marketplaceNodeValue(
                                      selectedMarketplaceSubcategory,
                                    )
                                  : ""
                              }
                              onChange={(event) =>
                                updateMarketplaceSubcategory(
                                  event.target.value,
                                )
                              }
                              disabled={Boolean(listingSaving)}
                            >
                              <option value="">
                                Choose subcategory
                              </option>

                              {marketplaceSubcategories.map(
                                (subcategory) => (
                                  <option
                                    key={
                                      subcategory.key ||
                                      subcategory.slug
                                    }
                                    value={marketplaceNodeValue(
                                      subcategory,
                                    )}
                                  >
                                    {subcategory.label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>

                          <label className="svx-detail-listing-field">
                            <span>Product type</span>
                            <select
                              value={
                                selectedMarketplaceLeafCategory
                                  ? marketplaceNodeValue(
                                      selectedMarketplaceLeafCategory,
                                    )
                                  : ""
                              }
                              onChange={(event) =>
                                updateMarketplaceLeafCategory(
                                  event.target.value,
                                )
                              }
                              disabled={
                                Boolean(listingSaving) ||
                                !selectedMarketplaceSubcategory ||
                                marketplaceLeafCategories.length === 0
                              }
                            >
                              <option value="">
                                {!selectedMarketplaceSubcategory
                                  ? "Choose subcategory first"
                                  : marketplaceLeafCategories.length
                                    ? "Choose product type"
                                    : "No product type needed"}
                              </option>

                              {marketplaceLeafCategories.map(
                                (leafCategory) => (
                                  <option
                                    key={
                                      leafCategory.key ||
                                      leafCategory.slug
                                    }
                                    value={marketplaceNodeValue(
                                      leafCategory,
                                    )}
                                  >
                                    {leafCategory.label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                        </div>
                      ) : null}

                      {isOwner ? (
                        <div className="svx-detail-listing-sale-box">
                          <div className="svx-detail-listing-sale-head">
                            <div>
                              <strong>Optional sale</strong>
                              <span>
                                Set a lower price and optional start and end dates.
                              </span>
                            </div>
                          </div>

                          <div className="svx-detail-listing-field-grid">
                            <label className="svx-detail-listing-field">
                              <span>Sale price</span>
                              <input
                                type="number"
                                min="0"
                                value={listingForm.salePrice}
                                onChange={(event) =>
                                  updateListingField(
                                    "salePrice",
                                    event.target.value
                                  )
                                }
                                placeholder="Leave empty when not on sale"
                                disabled={Boolean(listingSaving)}
                              />
                            </label>

                            <label className="svx-detail-listing-field">
                              <span>Sale starts</span>
                              <input
                                type="datetime-local"
                                className="svx-detail-listing-date-input"
                                value={listingForm.saleStartsAt}
                                onClick={openNativeDateTimePicker}
                                onChange={(event) =>
                                  updateListingDateField(
                                    "saleStartsAt",
                                    event
                                  )
                                }
                                disabled={Boolean(listingSaving)}
                              />
                            </label>

                            <label className="svx-detail-listing-field">
                              <span>Sale ends</span>
                              <input
                                type="datetime-local"
                                className="svx-detail-listing-date-input"
                                value={listingForm.saleEndsAt}
                                onClick={openNativeDateTimePicker}
                                onChange={(event) =>
                                  updateListingDateField(
                                    "saleEndsAt",
                                    event
                                  )
                                }
                                disabled={Boolean(listingSaving)}
                              />
                            </label>

                            <button
                              type="button"
                              className="svx-detail-listing-clear-sale"
                              onClick={() =>
                                setListingForm((current) => ({
                                  ...current,
                                  salePrice: "",
                                  saleStartsAt: "",
                                  saleEndsAt: "",
                                }))
                              }
                              disabled={Boolean(listingSaving)}
                            >
                              Clear sale
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <label className="svx-detail-listing-field">
                        <span>Marketplace description</span>
                        <textarea
                          value={listingForm.description}
                          onChange={(event) =>
                            updateListingField(
                              "description",
                              event.target.value
                            )
                          }
                          placeholder="Describe this product clearly for customers"
                          disabled={Boolean(listingSaving)}
                        />
                      </label>

                      <section
                        className={cx(
                          "svx-detail-listing-quality",
                          `is-${listingQuality.level.toLowerCase().replace(/\s+/g, "-")}`,
                        )}
                        aria-labelledby="marketplace-listing-quality-title"
                        aria-live="polite"
                      >
                        <div className="svx-detail-listing-quality-head">
                          <div>
                            <span>Listing quality</span>
                            <strong id="marketplace-listing-quality-title">
                              {listingQuality.level}
                            </strong>
                          </div>
                          <p>
                            {listingQuality.recommendations.length
                              ? `${listingQuality.recommendations.length} ${listingQuality.recommendations.length === 1 ? "thing can" : "things can"} make this listing stronger.`
                              : "This listing gives customers strong product information."}
                          </p>
                        </div>

                        {listingQuality.recommendations.length ? (
                          <div>
                            <h4>Make this listing stronger</h4>
                            <ul>
                              {listingQuality.recommendations.map((recommendation) => (
                                <li key={recommendation}>{recommendation}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {listingQuality.searchVisibilityRecommendations.length ? (
                          <div className="svx-detail-listing-quality-search">
                            <h4>Improve search visibility</h4>
                            <ul>
                              {listingQuality.searchVisibilityRecommendations.map((recommendation) => (
                                <li key={recommendation}>{recommendation}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </section>
                    </div>

                    <div className="svx-detail-listing-editor-actions">
                      <AsyncButton
                        type="button"
                        loading={listingSaving === "draft"}
                        loadingText="Saving..."
                        className="svx-detail-secondary-button"
                        onClick={saveListingDraft}
                        disabled={Boolean(listingSaving)}
                      >
                        <ClipboardList
                          size={16}
                          strokeWidth={2.35}
                        />
                        <span>Save marketplace details</span>
                      </AsyncButton>

                      {!isPublished ? (
                        <AsyncButton
                          type="button"
                          loading={listingSaving === "publish"}
                          loadingText="Publishing..."
                          className="svx-detail-primary-button"
                          onClick={publishListing}
                          disabled={
                            Boolean(listingSaving) ||
                            !hasApprovedPhoto
                          }
                        >
                          <ShoppingCart
                            size={16}
                            strokeWidth={2.35}
                          />
                          <span>Save and publish</span>
                        </AsyncButton>
                      ) : null}
                    </div>

                    {!hasApprovedPhoto ? (
                      <p className="svx-detail-publish-note">
                        Add and approve a product photo before publishing.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </DetailSection>

          </div>

          <aside className="svx-detail-side">
            <DetailSection
              icon={Boxes}
              title="Stock and pricing"
              text="Current availability and selling information for this branch."
            >
              <div className="svx-detail-side-stack">
                <InfoRow
                  label="Current stock"
                  value={formatNumber(qty)}
                  tone={status.tone}
                />
                <InfoRow
                  label="Reserved"
                  value={formatNumber(reserved)}
                />
                <InfoRow
                  label="Low stock alert"
                  value={
                    minStockLevel > 0
                      ? formatNumber(minStockLevel)
                      : "Not set"
                  }
                />
                <InfoRow
                  label="Cost price"
                  value={formatRwf(costPrice)}
                />
                <InfoRow
                  label="Selling price"
                  value={formatRwf(sellPrice)}
                />
                <InfoRow
                  label="Branch"
                  value={branchLabel(product)}
                />
              </div>

              <button
                type="button"
                className="svx-detail-secondary-button svx-detail-stock-action"
                onClick={() =>
                  openStockDrawer("RESTOCK")
                }
              >
                <Warehouse
                  size={16}
                  strokeWidth={2.35}
                />
                <span>Update stock</span>
              </button>

              <Link
                to={`/app/inventory/stock-history?productId=${encodeURIComponent(product.id)}`}
                className="svx-detail-stock-history-link"
              >
                <ClipboardList
                  size={15}
                  strokeWidth={2.3}
                />
                <span>View stock history</span>
                <ChevronRight
                  size={15}
                  strokeWidth={2.4}
                />
              </Link>
            </DetailSection>
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
