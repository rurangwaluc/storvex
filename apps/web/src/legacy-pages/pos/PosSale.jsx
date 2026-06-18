import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import InlineSpinner from "../../components/ui/InlineSpinner";

import {
  createSale,
  getPosContext,
  getQuickPicks,
  PAYMENT_METHOD_OPTIONS,
  paymentMethodTouchesCashDrawer,
} from "../../services/posApi";
import { searchProducts } from "../../services/inventoryApi";
import { listCustomers } from "../../services/customersApi";
import { getCashDrawerStatus } from "../../services/cashDrawerApi";
import { getDocumentSettings } from "../../services/storeApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./PosSale.css";

const PAGE_SIZE = 10;
const DEFAULT_PRODUCT_DISPLAY_LIMIT = 6;
const WORKSPACE_CACHE_KEY = "storvex_me_cache_v2";

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

function normalizeDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function normalizeTaxMode(value) {
  const mode = String(value || "NONE").trim().toUpperCase();

  if (
    mode === "NONE" ||
    mode === "VAT_18" ||
    mode === "TURNOVER_3_INTERNAL" ||
    mode === "VAT_18_PLUS_TURNOVER_3" ||
    mode === "CUSTOM"
  ) {
    return mode;
  }

  return "NONE";
}

function normalizeTaxDisplayMode(value) {
  const mode = String(value || "HIDDEN").trim().toUpperCase();

  if (mode === "HIDDEN" || mode === "CUSTOMER_FACING" || mode === "INTERNAL_ONLY") {
    return mode;
  }

  return "HIDDEN";
}

function defaultTaxRateBps(mode, fallback = 0) {
  if (mode === "VAT_18") return 1800;
  if (mode === "TURNOVER_3_INTERNAL") return 300;
  if (mode === "VAT_18_PLUS_TURNOVER_3") return 2100;

  const n = Number(fallback || 0);
  return Number.isFinite(n) ? Math.max(0, Math.min(10000, Math.floor(n))) : 0;
}

function defaultTaxName(mode, fallback = "") {
  const clean = cleanString(fallback);
  if (clean) return clean;

  if (mode === "VAT_18") return "VAT 18% included";
  if (mode === "TURNOVER_3_INTERNAL") return "Turnover tax estimate 3% included";
  if (mode === "VAT_18_PLUS_TURNOVER_3") return "Tax 21% included";
  if (mode === "CUSTOM") return "Tax included";

  return "Tax";
}

function computeTaxPreview(subtotal, settings) {
  const safeSubtotal = Math.max(0, Number(subtotal || 0));
  const taxMode = normalizeTaxMode(settings?.taxMode);
  const taxDisplayMode = normalizeTaxDisplayMode(settings?.taxDisplayMode);
  const taxRateBps = defaultTaxRateBps(taxMode, settings?.taxRateBps);
  const showTaxOnCustomerDocuments = Boolean(settings?.showTaxOnCustomerDocuments);

  const pricesIncludeTax = taxMode !== "NONE" && taxRateBps > 0;

  const showTaxLine =
    taxMode !== "NONE" &&
    taxDisplayMode === "CUSTOMER_FACING" &&
    showTaxOnCustomerDocuments &&
    taxRateBps > 0;

  let taxableSubtotal = safeSubtotal;
  let taxAmount = 0;
  let total = safeSubtotal;

  if (showTaxLine) {
    taxAmount = Math.round((safeSubtotal * taxRateBps) / (10000 + taxRateBps));
    taxableSubtotal = Math.max(0, safeSubtotal - taxAmount);
    total = safeSubtotal;
  }

  return {
    subtotal: safeSubtotal,
    taxableSubtotal,
    taxAmount,
    total,
    taxName: defaultTaxName(taxMode, settings?.taxName),
    taxMode,
    taxDisplayMode,
    taxRateBps,
    pricesIncludeTax,
    showTaxLine,
    customerFacing: showTaxLine,
  };
}

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function productStock(product) {
  return Number(product?.effectiveStockQty ?? product?.branchStockQty ?? product?.stockQty ?? 0);
}

function productPrice(product) {
  return Number(product?.sellPrice ?? product?.price ?? 0);
}


function paymentMethodName(value) {
  const option = PAYMENT_METHOD_OPTIONS.find((item) => item.value === value);
  return option?.label || cleanString(value) || "This payment";
}

function drawerCopyForPayment(method, touchesDrawer) {
  const label = paymentMethodName(method);

  if (touchesDrawer) {
    return {
      summaryValue: "Needed",
      summaryNote: "Open drawer before taking cash",
      note: "Open the drawer before finishing this cash sale.",
      sideNote: "Cash will be recorded in the drawer.",
    };
  }

  return {
    summaryValue: "Not needed",
    summaryNote: `${label} does not need the drawer`,
    note: `No cash drawer needed for ${label}.`,
    sideNote: `No cash drawer needed for ${label}.`,
  };
}

const BUSINESS_CATEGORY_COPY = {
  ELECTRONICS: {
    label: "Electronics",
    sellerHint: "Show product details only when they help the seller choose the right item.",
    productHint: "Use model, storage, and warranty details when needed.",
  },
  HARDWARE: {
    label: "Hardware",
    sellerHint: "Fast quantity selling with unit, size, material, and grade details.",
    productHint: "Use unit, size, material, and grade to avoid selling the wrong item.",
  },
  HOME_KITCHEN: {
    label: "Home & kitchen",
    sellerHint: "Use color, material, size, and set details to identify similar products.",
    productHint: "Show material, size, color, and set pieces when useful.",
  },
  LIGHTING: {
    label: "Lighting",
    sellerHint: "Show wattage, voltage, fitting, and light color for fast product matching.",
    productHint: "Use wattage, fitting, voltage, and light color to avoid wrong sales.",
  },
  SPARE_PARTS: {
    label: "Spare parts",
    sellerHint: "Compatibility matters. Show part number and compatible model clearly.",
    productHint: "Use part number, compatibility, condition, and warranty details.",
  },
};

function normalizeBusinessCategory(value) {
  const raw = cleanString(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (raw === "HOME_AND_KITCHEN" || raw === "HOME_KITCHEN_APPLIANCES") return "HOME_KITCHEN";
  if (raw === "SPARE_PART" || raw === "SPARES" || raw === "PARTS") return "SPARE_PARTS";
  if (raw === "QUINCAILLERIE") return "HARDWARE";

  return BUSINESS_CATEGORY_COPY[raw] ? raw : "ELECTRONICS";
}


function readWorkspaceCache() {
  if (typeof window === "undefined") return null;

  try {
    const session = window.sessionStorage?.getItem(WORKSPACE_CACHE_KEY);
    if (session) return JSON.parse(session);
  } catch {}

  try {
    const local = window.localStorage?.getItem(WORKSPACE_CACHE_KEY);
    if (local) return JSON.parse(local);
  } catch {}

  return null;
}

function businessCategoryFromWorkspace(workspace) {
  const tenant = workspace?.tenant || workspace?.business || workspace?.store || {};

  return normalizeBusinessCategory(
    tenant?.businessCategory ||
      tenant?.category ||
      tenant?.businessType ||
      workspace?.businessCategory ||
      workspace?.category ||
      workspace?.businessType,
  );
}

function categoryCopy(context, workspace) {
  const workspaceKey = businessCategoryFromWorkspace(workspace);
  const apiKey = normalizeBusinessCategory(context?.businessCategory);
  const hasSpecificApiCategory = Boolean(context?.businessCategory) && apiKey !== "ELECTRONICS";
  const key = hasSpecificApiCategory ? apiKey : workspaceKey;

  return {
    key,
    label:
      (hasSpecificApiCategory ? context?.businessCategoryLabel : "") ||
      BUSINESS_CATEGORY_COPY[key]?.label ||
      "Electronics",
    sellerHint: BUSINESS_CATEGORY_COPY[key]?.sellerHint || BUSINESS_CATEGORY_COPY.ELECTRONICS.sellerHint,
    productHint: BUSINESS_CATEGORY_COPY[key]?.productHint || BUSINESS_CATEGORY_COPY.ELECTRONICS.productHint,
  };
}

function normalizedProductAttributes(product) {
  const raw =
    product?.categoryAttributes ||
    product?.listingAttributes ||
    product?.marketplaceAttributes ||
    product?.attributes ||
    {};

  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function friendlyAttributeLabel(key) {
  const labels = {
    unit: "Unit",
    size: "Size",
    material: "Material",
    grade: "Grade",
    color: "Color",
    setPieces: "Pieces",
    wattage: "Wattage",
    voltage: "Voltage",
    fitting: "Fitting",
    lightColor: "Light color",
    partNumber: "Part no.",
    compatibleModel: "Fits",
    condition: "Condition",
    warranty: "Warranty",
    ram: "RAM",
    storage: "Storage",
    processor: "Processor",
  };

  if (labels[key]) return labels[key];

  return String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function friendlyAttributeValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value && typeof value === "object") return "";
  return cleanString(value);
}

function categoryAwareProductFacts(product, limit = 3) {
  const attributes = normalizedProductAttributes(product);
  const preferredKeys = [
    "unit",
    "size",
    "material",
    "grade",
    "color",
    "setPieces",
    "wattage",
    "voltage",
    "fitting",
    "lightColor",
    "partNumber",
    "compatibleModel",
    "condition",
    "warranty",
    "ram",
    "storage",
    "processor",
  ];

  const facts = [];

  preferredKeys.forEach((key) => {
    const value = friendlyAttributeValue(attributes[key]);
    if (!value) return;

    facts.push({
      key,
      label: friendlyAttributeLabel(key),
      value,
    });
  });

  Object.entries(attributes).forEach(([key, value]) => {
    if (preferredKeys.includes(key)) return;

    const displayValue = friendlyAttributeValue(value);
    if (!displayValue) return;

    facts.push({
      key,
      label: friendlyAttributeLabel(key),
      value: displayValue,
    });
  });

  return facts.slice(0, limit);
}

function productMetaLine(product) {
  return [product.brand, product.category, product.sku].filter(Boolean).join(" ") || "No category";
}

function productMetaItems(product) {
  const items = [];

  if (cleanString(product?.brand)) {
    items.push({ key: "brand", label: "Brand", value: cleanString(product.brand) });
  }

  if (cleanString(product?.category)) {
    items.push({ key: "category", label: "Category", value: cleanString(product.category) });
  }

  if (cleanString(product?.sku)) {
    items.push({ key: "code", label: "Code", value: cleanString(product.sku) });
  }

  return items;
}

function cartItemMetaParts(product) {
  const facts = categoryAwareProductFacts(product, 3).map((item) => ({
    key: item.key,
    label: item.label,
    value: item.value,
  }));

  if (facts.length) return facts;

  return productMetaItems(product).slice(0, 3);
}

function productTrackingText(product) {
  if (!cleanString(product?.serial)) return "";
  return "Tracked item";
}

function productImages(product) {
  return Array.isArray(product?.images) ? product.images : [];
}

function productImageUrl(product) {
  const images = productImages(product);
  const primary = images.find((image) => image?.isPrimary) || images[0];

  return (
    cleanString(primary?.url) ||
    cleanString(primary?.imageUrl) ||
    cleanString(primary?.publicUrl)
  );
}

function cartItemMeta(product) {
  const facts = categoryAwareProductFacts(product, 2)
    .map((item) => `${item.label}: ${item.value}`)
    .join(" • ");

  return cleanString(facts || productMetaLine(product));
}

function activeBranchNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (name) return name;
  if (code) return code;

  return "this branch";
}

function pageCard() {
  return "svx-pos-card";
}


function softPanel() {
  return "svx-pos-soft-panel";
}


function inputClass() {
  return "svx-pos-input";
}


function textareaClass() {
  return "svx-pos-textarea";
}


function buttonBase() {
  return "svx-pos-button";
}


function secondaryButton(className = "") {
  return cx("svx-pos-button", className);
}


function primaryButton(className = "") {
  return cx("svx-pos-button svx-pos-button--primary", className);
}


function warningButton(className = "") {
  return cx("svx-pos-button svx-pos-button--warning", className);
}


function dangerButton(className = "") {
  return cx("svx-pos-button svx-pos-button--danger", className);
}


function StatusBadge({ tone = "neutral", children }) {
  const classes =
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
        classes,
      )}
    >
      {children}
    </span>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div className={cx("animate-pulse rounded-[22px] bg-[var(--color-surface-2)]", className)} />
  );
}

function PosSaleSkeleton() {
  return (
    <main className="svx-pos-page">
      <section className="svx-pos-shell">
        <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-4 h-10 w-72 max-w-full rounded-[18px]" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
      </section>

      <section className="svx-pos-metric-grid">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className={cx(pageCard(), "p-5")}>
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-24" />
            <SkeletonBlock className="mt-2 h-4 w-36" />
          </div>
        ))}
      </section>

      <div className="svx-pos-layout">
        <div className="svx-pos-main">
          {[1, 2, 3].map((item) => (
            <div key={item} className={cx(pageCard(), "p-5")}>
              <SkeletonBlock className="h-7 w-40" />
              <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />
              <SkeletonBlock className="mt-5 h-12 w-full" />
            </div>
          ))}
        </div>

        <div className={cx(pageCard(), "p-5")}>
          <SkeletonBlock className="h-7 w-28" />
          <SkeletonBlock className="mt-4 h-28 w-full" />
          <SkeletonBlock className="mt-4 h-14 w-full" />
        </div>
      </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value, note, tone = "neutral", loading = false }) {
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
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[var(--color-surface-3)] opacity-45 blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <span className={cx("h-2.5 w-2.5 rounded-full", dot)} />
        </div>

        {loading ? (
          <>
            <SkeletonBlock className="mt-4 h-8 w-28" />
            <SkeletonBlock className="mt-2 h-4 w-36" />
          </>
        ) : (
          <>
            <p className="mt-3 truncate text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">
              {value}
            </p>

            {note ? (
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
                {note}
              </p>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="flex min-h-[170px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 text-center">
      <h3 className="text-base font-black text-[var(--color-text)]">{title}</h3>
      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>
    </div>
  );
}


function SaleModeButton({ active, tone, title, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("svx-pos-sale-mode-button", active && "is-active", tone === "warning" && "is-warning")}
    >
      <strong>{title}</strong>
      <span>{text}</span>
    </button>
  );
}



function ProductRow({ product, onAdd }) {
  const stock = productStock(product);
  const disabled = !Number.isFinite(stock) || stock <= 0;
  const facts = categoryAwareProductFacts(product, 3);
  const trackingText = productTrackingText(product);
  const imageUrl = productImageUrl(product);
  const metaItems = productMetaItems(product);

  function handleAdd(event) {
    event?.stopPropagation?.();
    if (disabled) return;
    onAdd(product);
  }

  function handleKeyDown(event) {
    if (disabled) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onAdd(product);
  }

  return (
    <article
      className={cx("svx-pos-product-row", disabled && "is-disabled")}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={disabled ? `${product.name} is unavailable` : `Add ${product.name} to sale`}
      onClick={handleAdd}
      onKeyDown={handleKeyDown}
    >
      <div className="svx-pos-product-main">
        <span className={cx("svx-pos-product-thumb", imageUrl && "has-image")}>
          {imageUrl ? (
            <img src={imageUrl} alt={product?.name || "Product image"} loading="lazy" />
          ) : (
            String(product?.name || "P").slice(0, 1).toUpperCase()
          )}
        </span>

        <div className="svx-pos-product-copy">
          <strong>{product.name}</strong>

          {metaItems.length ? (
            <div className="svx-pos-product-meta-stack" aria-label="Product details">
              {metaItems.map((item) => (
                <span key={item.key}>
                  <small>{item.label}</small>
                  <b>{item.value}</b>
                </span>
              ))}
            </div>
          ) : (
            <span>No category saved</span>
          )}

          {facts.length ? (
            <div className="svx-pos-product-facts">
              {facts.map((fact) => (
                <em key={fact.key}>
                  {fact.label}: <b>{fact.value}</b>
                </em>
              ))}
            </div>
          ) : null}

          <div className="svx-pos-product-badges">
            <StatusBadge tone={stock <= 0 ? "danger" : "success"}>
              {stock <= 0 ? "Out" : `${formatNumber(stock)} available`}
            </StatusBadge>
            {trackingText ? <StatusBadge>{trackingText}</StatusBadge> : null}
          </div>
        </div>
      </div>

      <div className="svx-pos-product-action">
        <strong>{formatMoney(productPrice(product))}</strong>

        <button type="button" onClick={handleAdd} disabled={disabled} className="svx-pos-add-button">
          {disabled ? "Unavailable" : "Add"}
        </button>
      </div>
    </article>
  );
}

function CustomerCard({ customer, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-[24px] p-4 text-left transition",
        active
          ? "border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{customer.name}</div>
          <div
            className={cx(
              "mt-1 text-xs font-semibold",
              active
                ? "text-[var(--color-primary-contrast)] opacity-80"
                : "text-[var(--color-text-muted)]",
            )}
          >
            {customer.phone || "No phone saved"}
          </div>

          {customer.email ? (
            <div
              className={cx(
                "mt-1 truncate text-xs font-semibold",
                active
                  ? "text-[var(--color-primary-contrast)] opacity-80"
                  : "text-[var(--color-text-muted)]",
              )}
            >
              {customer.email}
            </div>
          ) : null}
        </div>

        {active ? (
          <span className="rounded-full border border-[var(--color-primary-contrast)]/20 bg-[var(--color-primary-contrast)]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-primary-contrast)]">
            Selected
          </span>
        ) : null}
      </div>
    </button>
  );
}

function CartItemCard({ item, onDec, onInc, onRemove }) {
  const metaParts = Array.isArray(item.metaParts) ? item.metaParts : [];

  return (
    <article className="svx-pos-cart-item">
      <div className="svx-pos-cart-head">
        <div className="min-w-0">
          <strong>{item.name}</strong>

          {metaParts.length ? (
            <div className="svx-pos-cart-meta-pills" aria-label="Cart item details">
              {metaParts.map((part) => (
                <span key={`${part.label}-${part.value}`}>
                  <small>{part.label}</small>
                  <b>{part.value}</b>
                </span>
              ))}
            </div>
          ) : item.meta ? (
            <span>{item.meta}</span>
          ) : null}

          <small>
            Price: <b>{formatMoney(item.price)}</b>
          </small>
          <small>
            Available: <b>{formatNumber(item.stockQty)}</b>
          </small>
        </div>

        <button type="button" onClick={() => onRemove(item.productId)}>
          Remove
        </button>
      </div>

      <div className="svx-pos-cart-controls">
        <div className="svx-pos-qty-stepper">
          <button type="button" onClick={() => onDec(item.productId)}>−</button>
          <span>{item.quantity}</span>
          <button type="button" onClick={() => onInc(item.productId)}>+</button>
        </div>

        <div className="svx-pos-cart-total">
          <span>Total</span>
          <strong>{formatMoney(item.price * item.quantity)}</strong>
        </div>
      </div>
    </article>
  );
}

export default function PosSale() {
  const navigate = useNavigate();

  const [bootLoading, setBootLoading] = useState(true);
  const [activeBranchLabel, setActiveBranchLabel] = useState(() => activeBranchNameFromStorage());
  const [posContext, setPosContext] = useState(null);
  const [workspaceContext, setWorkspaceContext] = useState(() => readWorkspaceCache());

  const [productResults, setProductResults] = useState([]);
  const [productQuery, setProductQuery] = useState("");
  const [selectedProductCategory, setSelectedProductCategory] = useState("ALL");
  const [searching, setSearching] = useState(false);

  const [quickBest, setQuickBest] = useState([]);
  const [quickLatest, setQuickLatest] = useState([]);
  const [quickLoading, setQuickLoading] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customersLoading, setCustomersLoading] = useState(true);

  const [cart, setCart] = useState([]);
  const [savingSale, setSavingSale] = useState(false);

  const [saleType, setSaleType] = useState("CASH");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");

  const [customerMode, setCustomerMode] = useState("WALKIN");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    tinNumber: "",
    idNumber: "",
    notes: "",
  });

  const [dueDate, setDueDate] = useState("");
  const [amountPaid, setAmountPaid] = useState("");

  const [drawerLoading, setDrawerLoading] = useState(true);
  const [drawerStatus, setDrawerStatus] = useState(null);
  const [drawerRefreshBusy, setDrawerRefreshBusy] = useState(false);

  const [documentSettings, setDocumentSettings] = useState(null);
  const [documentSettingsLoading, setDocumentSettingsLoading] = useState(true);

  const searchTimer = useRef(null);
  const mountedRef = useRef(true);
  const productReqIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  async function loadDrawerStatus({ silent = false } = {}) {
    if (!silent) setDrawerRefreshBusy(true);
    setDrawerLoading(true);

    try {
      const status = await getCashDrawerStatus();
      if (!mountedRef.current) return;

      setDrawerStatus(status);
    } catch (error) {
      if (!mountedRef.current) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "drawer-status-blocked" })) {
        setDrawerStatus(null);
      }
    } finally {
      if (!mountedRef.current) return;

      setDrawerLoading(false);
      setDrawerRefreshBusy(false);
    }
  }

  async function loadDocumentSettings() {
    setDocumentSettingsLoading(true);

    try {
      const data = await getDocumentSettings();
      if (!mountedRef.current) return;

      setDocumentSettings(data?.documentSettings || null);
    } catch (error) {
      if (!mountedRef.current) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "document-settings-load-blocked" })) {
        setDocumentSettings(null);
      }
    } finally {
      if (!mountedRef.current) return;
      setDocumentSettingsLoading(false);
    }
  }

  async function loadCustomers() {
    setCustomersLoading(true);

    try {
      const result = await listCustomers();
      if (!mountedRef.current) return;

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.customers)
          ? result.customers
          : [];

      setCustomers(list);
    } catch (error) {
      if (!mountedRef.current) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "customers-load-blocked" })) {
        toast.error(error?.message || "Failed to load customers");
      }

      setCustomers([]);
    } finally {
      if (!mountedRef.current) return;
      setCustomersLoading(false);
    }
  }

  async function loadPosContext() {
    setWorkspaceContext(readWorkspaceCache());

    try {
      const data = await getPosContext();
      if (!mountedRef.current) return;
      setPosContext(data || null);
    } catch (error) {
      if (!mountedRef.current) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "pos-context-blocked" })) {
        setPosContext(null);
      }
    }
  }

  async function loadQuickPicks() {
    setQuickLoading(true);

    try {
      const data = await getQuickPicks({
        periodDays: 7,
        limit: PAGE_SIZE,
      });

      if (!mountedRef.current) return;

      setQuickBest(Array.isArray(data?.bestSellers) ? data.bestSellers.slice(0, PAGE_SIZE) : []);
      setQuickLatest(Array.isArray(data?.latest) ? data.latest.slice(0, PAGE_SIZE) : []);
    } catch (error) {
      if (!mountedRef.current) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "quick-picks-blocked" })) {
        setQuickBest([]);
        setQuickLatest([]);
      }
    } finally {
      if (!mountedRef.current) return;
      setQuickLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBootLoading(true);

      try {
        await Promise.all([
          loadPosContext(),
          loadQuickPicks(),
          loadCustomers(),
          loadDrawerStatus({ silent: true }),
          loadDocumentSettings(),
        ]);
      } finally {
        if (!cancelled && mountedRef.current) setBootLoading(false);
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onBranchChanged() {
      setActiveBranchLabel(activeBranchNameFromStorage());
      setCart([]);
      setProductResults([]);
      setProductQuery("");
      setSelectedProductCategory("ALL");
      loadPosContext();
      loadQuickPicks();
      loadDrawerStatus({ silent: true });
      loadDocumentSettings();
    }

    window.addEventListener("storvex:branch-changed", onBranchChanged);
    window.addEventListener("storvex:workspace-refreshed", onBranchChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onBranchChanged);
      window.removeEventListener("storvex:workspace-refreshed", onBranchChanged);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const q = productQuery.trim();

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!q) {
      setProductResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const myReqId = ++productReqIdRef.current;

    searchTimer.current = setTimeout(async () => {
      try {
        const result = await searchProducts({
          q,
          limit: PAGE_SIZE,
        });

        if (cancelled || !mountedRef.current) return;
        if (myReqId !== productReqIdRef.current) return;

        setProductResults(Array.isArray(result?.products) ? result.products.slice(0, PAGE_SIZE) : []);
      } catch (error) {
        if (cancelled || !mountedRef.current) return;
        if (myReqId !== productReqIdRef.current) return;

        if (!handleSubscriptionBlockedError(error, { toastId: "product-search-blocked" })) {
          setProductResults([]);
        }
      } finally {
        if (cancelled || !mountedRef.current) return;
        if (myReqId !== productReqIdRef.current) return;

        setSearching(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [productQuery]);

  useEffect(() => {
    if (saleType === "CASH") {
      setDueDate("");
      setAmountPaid("");
    }

    if (saleType === "CREDIT" && customerMode === "WALKIN") {
      setCustomerMode("PICK");
    }
  }, [saleType, customerMode]);

  function onProductKeyDown(event) {
    if (event.key !== "Enter") return;

    const first = productResults[0];
    if (!first) return;

    event.preventDefault();
    addToCart(first);
  }

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();

    const source = q
      ? customers.filter((customer) => {
          const name = String(customer.name || "").toLowerCase();
          const phone = String(customer.phone || "").toLowerCase();
          const email = String(customer.email || "").toLowerCase();
          const tinNumber = String(customer.tinNumber || "").toLowerCase();
          const idNumber = String(customer.idNumber || "").toLowerCase();

          return (
            name.includes(q) ||
            phone.includes(q) ||
            email.includes(q) ||
            tinNumber.includes(q) ||
            idNumber.includes(q)
          );
        })
      : customers;

    return source.slice(0, PAGE_SIZE);
  }, [customers, customerQuery]);

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  }, [cart]);

  const taxPreview = useMemo(() => {
    return computeTaxPreview(subtotal, documentSettings);
  }, [subtotal, documentSettings]);

  const total = taxPreview.total;
  const depositPaidToday = saleType === "CREDIT" ? Number(amountPaid || 0) : total;
  const safeDepositPaidToday = Number.isFinite(depositPaidToday)
    ? Math.max(0, Math.min(total, depositPaidToday))
    : 0;
  const payLaterBalance = saleType === "CREDIT" ? Math.max(0, total - safeDepositPaidToday) : 0;
  const payLaterCustomerLabel =
    customerMode === "PICK"
      ? selectedCustomer?.name || "Choose customer"
      : customerMode === "NEW"
        ? cleanString(customerForm.name) || "New customer"
        : "Customer needed";
  const payLaterCustomerReady =
    saleType !== "CREDIT" ||
    (customerMode === "PICK" && Boolean(selectedCustomerId)) ||
    (customerMode === "NEW" && Boolean(cleanString(customerForm.name)) && Boolean(cleanString(customerForm.phone)));

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [cart]);

  const showQuickPicks = !productQuery.trim();
  const quickList = quickBest.length > 0 ? quickBest : quickLatest;
  const quickTitle = quickBest.length > 0 ? "Best sellers" : "Latest products";
  const salesDeskCategory = categoryCopy(posContext, workspaceContext);

  const productSourceList = showQuickPicks
    ? quickList.slice(0, DEFAULT_PRODUCT_DISPLAY_LIMIT)
    : productResults;

  const productCategoryTabs = useMemo(() => {
    const seen = new Set();

    productSourceList.forEach((product) => {
      const category = cleanString(product?.category);
      if (category) seen.add(category);
    });

    return ["ALL", ...Array.from(seen).slice(0, 6)];
  }, [productSourceList]);

  const visibleProducts = useMemo(() => {
    if (selectedProductCategory === "ALL") return productSourceList;

    return productSourceList.filter((product) => cleanString(product?.category) === selectedProductCategory);
  }, [productSourceList, selectedProductCategory]);

  const drawerOpen = Boolean(drawerStatus?.openSession?.id);
  const blockCashSales = Boolean(drawerStatus?.settings?.blockCashSales ?? true);
  const selectedMethodTouchesDrawer = paymentMethodTouchesCashDrawer(paymentMethod);

  const drawerCopy = drawerCopyForPayment(paymentMethod, selectedMethodTouchesDrawer);

  const selectedPaymentOption =
    PAYMENT_METHOD_OPTIONS.find((option) => option.value === paymentMethod) ||
    PAYMENT_METHOD_OPTIONS[0];

  const cashAmountTakenNow = selectedMethodTouchesDrawer
    ? saleType === "CASH"
      ? total
      : Number(amountPaid || 0)
    : 0;

  const hasCashDrawerRisk =
    selectedMethodTouchesDrawer &&
    blockCashSales &&
    !drawerOpen &&
    cashAmountTakenNow > 0;

  const drawerSummary = selectedMethodTouchesDrawer
    ? {
        value: drawerLoading ? "Checking..." : drawerOpen ? "Open" : "Closed",
        note: blockCashSales ? drawerCopy.summaryNote : "Cash can be recorded",
        tone: drawerOpen ? "success" : "danger",
      }
    : {
        value: drawerCopy.summaryValue,
        note: drawerCopy.summaryNote,
        tone: "neutral",
      };

  const saleModeLabel = saleType === "CREDIT" ? "Pay later" : "Paid now";

  const activeStep = useMemo(() => {
    if (cart.length > 0) return 4;
    if (productQuery.trim() || quickList.length > 0 || productResults.length > 0) return 3;
    if (customerMode !== "WALKIN" || selectedCustomerId || customerForm.name) return 2;
    return 1;
  }, [
    cart.length,
    productQuery,
    quickList.length,
    productResults.length,
    customerMode,
    selectedCustomerId,
    customerForm.name,
  ]);

  function setCustomerField(key, value) {
    setCustomerForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetCustomerSelection() {
    setSelectedCustomerId("");
    setCustomerQuery("");
  }

  function resetCustomerForm() {
    setCustomerForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      tinNumber: "",
      idNumber: "",
      notes: "",
    });
  }

  function addToCart(product) {
    const stock = productStock(product);

    if (!Number.isFinite(stock) || stock <= 0) {
      toast.error("This product is out of stock");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);

      if (existing) {
        if (existing.quantity + 1 > stock) {
          toast.error("You cannot sell more than available stock");
          return prev;
        }

        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: productPrice(product),
          quantity: 1,
          stockQty: stock,
          meta: cartItemMeta(product),
          metaParts: cartItemMetaParts(product),
        },
      ];
    });
  }

  function increaseQty(productId) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;

        if (item.quantity + 1 > Number(item.stockQty || 0)) {
          toast.error("You cannot sell more than available stock");
          return item;
        }

        return { ...item, quantity: item.quantity + 1 };
      }),
    );
  }

  function decreaseQty(productId) {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
      ),
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  function validateCustomerForSale() {
    if (customerMode === "WALKIN") {
      if (saleType === "CREDIT") {
        return { ok: false, message: "Choose an existing customer or save a new customer for pay later." };
      }

      return { ok: true };
    }

    if (customerMode === "PICK") {
      if (!selectedCustomerId) {
        return { ok: false, message: "Choose a customer first." };
      }

      return { ok: true };
    }

    const name = cleanString(customerForm.name);
    const phone = cleanString(customerForm.phone);

    if (!name || !phone) {
      return { ok: false, message: "Customer name and phone are required." };
    }

    return { ok: true };
  }

  function buildCustomerPayload() {
    if (customerMode === "PICK" && selectedCustomerId) {
      return { customerId: selectedCustomerId };
    }

    if (customerMode === "NEW") {
      const customerPayload = {
        name: cleanString(customerForm.name),
        phone: cleanString(customerForm.phone),
        email: cleanString(customerForm.email) || null,
        address: cleanString(customerForm.address) || null,
        tinNumber: cleanString(customerForm.tinNumber) || null,
        idNumber: cleanString(customerForm.idNumber) || null,
        notes: cleanString(customerForm.notes) || null,
      };

      return {
        customer: customerPayload,
        customerName: customerPayload.name,
        customerPhone: customerPayload.phone,
        customerEmail: customerPayload.email,
        customerAddress: customerPayload.address,
        customerTinNumber: customerPayload.tinNumber,
        customerIdNumber: customerPayload.idNumber,
        customerNotes: customerPayload.notes,
      };
    }

    return {};
  }

  async function completeSale() {
    if (cart.length === 0) {
      toast.error("Add at least one product");
      return;
    }

    if (hasCashDrawerRisk) {
      toast.error("Open the cash drawer before taking cash.");
      return;
    }

    const customerValidation = validateCustomerForSale();

    if (!customerValidation.ok) {
      toast.error(customerValidation.message);
      return;
    }

    if (saleType === "CREDIT" && !dueDate) {
      toast.error("Choose when the customer should pay.");
      return;
    }

    const paid = Number(amountPaid || 0);

    if (saleType === "CREDIT" && paid > total) {
      toast.error("Deposit cannot be more than the final sale total.");
      return;
    }

    setSavingSale(true);

    try {
      const payload = {
        saleType,
        paymentMethod,
        paymentReference: cleanString(paymentReference),
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        ...buildCustomerPayload(),
      };

      if (saleType === "CREDIT") {
        payload.dueDate = dueDate;
        payload.amountPaid = Number.isFinite(paid) && paid > 0 ? paid : 0;
      }

      const result = await createSale(payload);
      const saleId = result?.sale?.id || result?.saleId;

      if (!saleId) {
        toast.error("Sale was saved, but the receipt could not be opened.");
        return;
      }

      clearCart();
      resetCustomerSelection();
      resetCustomerForm();
      setCustomerMode("WALKIN");
      setDueDate("");
      setAmountPaid("");
      setPaymentMethod("CASH");
      setPaymentReference("");

      toast.success("Sale completed");
      await loadCustomers();
      void loadDrawerStatus({ silent: true });

      navigate(`/app/pos/sales/${saleId}`);
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "sale-create-blocked" })) {
        return;
      }

      if (
        error?.code === "CASH_DRAWER_CLOSED" ||
        String(error?.message || "").toLowerCase().includes("cash drawer")
      ) {
        toast.error("Open the cash drawer before taking cash.");
        void loadDrawerStatus({ silent: true });
        return;
      }

      toast.error(error?.message || "Failed to complete sale");
    } finally {
      setSavingSale(false);
    }
  }

  if (bootLoading) {
    return <PosSaleSkeleton />;
  }

  return (
    <main className="svx-pos-page">
      <section className="svx-pos-shell">
        <section className="svx-pos-hero">
        <div className="svx-pos-hero-glow" />

        <div className="svx-pos-hero-inner">
          <div className="svx-pos-hero-copy">
            <p className="svx-pos-kicker">Sales desk</p>

            <h1>Sales desk</h1>

            <p>
              Sell from <strong>{activeBranchLabel}</strong>. {salesDeskCategory.sellerHint}
            </p>

            <div className="svx-pos-hero-badges">
              <StatusBadge tone="success">{salesDeskCategory.label}</StatusBadge>
            </div>
          </div>

          <div className="svx-pos-hero-actions">
            <button type="button" onClick={() => navigate("/app/pos/sales")} className={secondaryButton()}>
              Sales list
            </button>

            <button type="button" onClick={() => navigate("/app/pos/credit")} className={secondaryButton()}>
              Pay later
            </button>

            <button type="button" onClick={() => navigate("/app/pos/drawer")} className={primaryButton()}>
              Cash drawer
            </button>
          </div>
        </div>
      </section>

        <section className="svx-pos-metric-grid">
        <SummaryCard label="Products" value={formatNumber(cartItemsCount)} note="Units in this sale" tone="neutral" />

        <SummaryCard
          label="Sale total"
          value={formatMoney(total)}
          note={
            documentSettingsLoading
              ? "Checking document rules"
              : taxPreview.showTaxLine
                ? taxPreview.taxName
                : saleModeLabel
          }
          tone={saleType === "CREDIT" ? "warning" : "success"}
          loading={documentSettingsLoading}
        />

        <SummaryCard
          label="Customer"
          value={
            customerMode === "WALKIN"
              ? "Walk-in"
              : customerMode === "PICK"
                ? selectedCustomer?.name || "Choose customer"
                : customerForm.name || "New customer"
          }
          note={
            customerMode === "WALKIN"
              ? "Quick paid-now sale"
              : customerMode === "PICK"
                ? selectedCustomer?.phone || "Saved customer"
                : customerForm.phone || "Will be saved during sale"
          }
          tone={saleType === "CREDIT" && customerMode === "WALKIN" ? "danger" : "neutral"}
          loading={customersLoading}
        />

        <SummaryCard
          label="Cash drawer"
          value={drawerSummary.value}
          note={drawerSummary.note}
          tone={drawerSummary.tone}
          loading={drawerLoading && selectedMethodTouchesDrawer}
        />
      </section>

        <div className="svx-pos-terminal-layout">
          <div className="svx-pos-terminal-main">
            <section className="svx-pos-card svx-pos-catalog">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                  Products
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                  {salesDeskCategory.productHint}
                </p>
              </div>

              <div className="w-full max-w-md">
                <input
                  className={inputClass()}
                  placeholder="Search product name, code, barcode, category, or brand..."
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  onKeyDown={onProductKeyDown}
                />
              </div>
            </div>

            <div className="svx-pos-product-tabs">
              {productCategoryTabs.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedProductCategory(category)}
                  className={selectedProductCategory === category ? "is-active" : ""}
                >
                  {category === "ALL" ? "All" : category}
                </button>
              ))}
            </div>

            {!showQuickPicks && searching ? (
              <div className="mt-4">
                <InlineSpinner label="Searching products..." />
              </div>
            ) : null}

            {showQuickPicks ? (
              quickLoading ? (
                <div className="mt-5 grid gap-3">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <SkeletonBlock key={item} className="h-28 w-full" />
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <div className="svx-pos-products-heading-row">
                    <div>
                      <div className="text-sm font-black text-[var(--color-text)]">{quickTitle}</div>
                      {showQuickPicks ? (
                        <p>Showing the best {Math.min(DEFAULT_PRODUCT_DISPLAY_LIMIT, visibleProducts.length)} products for a clean selling view.</p>
                      ) : null}
                    </div>
                    <StatusBadge tone="success">Tap to add</StatusBadge>
                  </div>

                  {visibleProducts.length === 0 ? (
                    <div className="mt-4">
                      <EmptyState
                        title="No suggestions yet"
                        text="Products will appear here after you create products or start selling."
                      />
                    </div>
                  ) : (
                    <div className="svx-pos-product-grid">
                      {visibleProducts.map((product) => (
                        <ProductRow key={product.id} product={product} onAdd={addToCart} />
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : visibleProducts.length === 0 && !searching ? (
              <div className="mt-5">
                <EmptyState title="No products found" text="Try another product name, code, barcode, category, or brand." />
              </div>
            ) : (
              <div className="svx-pos-product-grid">
                {visibleProducts.map((product) => (
                  <ProductRow key={product.id} product={product} onAdd={addToCart} />
                ))}
              </div>
            )}
          </section>
          </div>

          <aside className="svx-pos-terminal-side">
            <section className="svx-pos-checkout-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                  Checkout
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                  Review the cart, payment, and customer before finishing.
                </p>
              </div>

              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-black text-[var(--color-text-muted)] transition hover:text-red-600 disabled:opacity-50"
                disabled={!cart.length}
              >
                Clear
              </button>
            </div>

            {!cart.length ? (
              <div className="mt-5">
                <EmptyState title="Cart is empty" text="Add products to start the sale." />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {cart.map((item) => (
                  <CartItemCard
                    key={item.productId}
                    item={item}
                    onDec={decreaseQty}
                    onInc={increaseQty}
                    onRemove={removeItem}
                  />
                ))}
              </div>
            )}

            <div className="svx-pos-checkout-setup svx-pos-checkout-setup--minimal">
              <section className="svx-pos-checkout-subcard svx-pos-checkout-subcard--minimal">
                <div className="svx-pos-setup-head">
                  <div>
                    <h2>Sale setup</h2>
                    <p>
                      {saleType === "CREDIT"
                        ? "Save who owes, when they should pay, and any deposit received today."
                        : "Choose only what this sale needs."}
                    </p>
                  </div>
                </div>

                <div className="svx-pos-setup-grid">
                  <label className="svx-pos-setup-field">
                    <span>Sale type</span>
                    <select
                      value={saleType}
                      onChange={(event) => {
                        const nextType = event.target.value;
                        setSaleType(nextType);

                        if (nextType === "CREDIT" && customerMode === "WALKIN") {
                          setCustomerMode("PICK");
                          resetCustomerForm();
                        }
                      }}
                      className="svx-pos-input"
                    >
                      <option value="CASH">Paid now</option>
                      <option value="CREDIT">Pay later</option>
                    </select>
                  </label>

                  <label className="svx-pos-setup-field">
                    <span>{saleType === "CREDIT" ? "Deposit method" : "Payment"}</span>
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                      className="svx-pos-input"
                    >
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="svx-pos-setup-field">
                    <span>Customer</span>
                    <select
                      value={customerMode}
                      onChange={(event) => {
                        const nextMode = event.target.value;

                        if (nextMode === "WALKIN" && saleType === "CREDIT") {
                          toast.error("Choose an existing customer or save a new customer for pay later.");
                          return;
                        }

                        setCustomerMode(nextMode);

                        if (nextMode === "WALKIN") {
                          resetCustomerSelection();
                        } else if (nextMode === "PICK") {
                          resetCustomerForm();
                        } else {
                          resetCustomerSelection();
                        }
                      }}
                      className="svx-pos-input"
                    >
                      <option value="WALKIN" disabled={saleType === "CREDIT"}>
                        Walk-in
                      </option>
                      <option value="PICK">Existing customer</option>
                      <option value="NEW">New customer</option>
                    </select>
                  </label>

                  <label className="svx-pos-setup-field">
                    <span>Payment note</span>
                    <input
                      className={inputClass()}
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder={saleType === "CREDIT" ? "Deposit note or reference" : "MoMo code or bank slip"}
                    />
                  </label>
                </div>

                {selectedMethodTouchesDrawer ? (
                  <div className="svx-pos-drawer-compact">
                    <span>{drawerCopy.note}</span>

                    <div>
                      <AsyncButton loading={drawerRefreshBusy} onClick={() => loadDrawerStatus({ silent: false })} variant="secondary">
                        Check drawer
                      </AsyncButton>

                      {!drawerOpen ? (
                        <button type="button" onClick={() => navigate("/app/pos/drawer")} className={dangerButton()}>
                          Open drawer
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="svx-pos-drawer-compact is-muted">
                    <span>{drawerCopy.note}</span>
                  </div>
                )}

                {saleType === "CREDIT" ? (
                  <div className="svx-pos-pay-later-panel">
                    <div className="svx-pos-pay-later-head">
                      <div>
                        <strong>Pay later</strong>
                        <span>Use this only when a known customer will pay after leaving with the products.</span>
                      </div>
                      <StatusBadge tone={payLaterCustomerReady ? "success" : "warning"}>
                        {payLaterCustomerReady ? "Customer ready" : "Choose customer"}
                      </StatusBadge>
                    </div>

                    <div className="svx-pos-setup-grid svx-pos-setup-grid--two">
                      <label className="svx-pos-setup-field">
                        <span>Deposit paid today</span>
                        <input
                          inputMode="numeric"
                          className={inputClass()}
                          value={amountPaid}
                          onChange={(event) => setAmountPaid(normalizeDigits(event.target.value))}
                          placeholder="0"
                        />
                      </label>

                      <label className="svx-pos-setup-field">
                        <span>Pay-by date</span>
                        <input
                          type="date"
                          className={inputClass()}
                          value={dueDate}
                          onChange={(event) => setDueDate(event.target.value)}
                        />
                      </label>
                    </div>

                    <div className="svx-pos-pay-later-summary" aria-label="Pay later summary">
                      <div>
                        <small>Customer</small>
                        <b>{payLaterCustomerLabel}</b>
                      </div>
                      <div>
                        <small>Paid today</small>
                        <b>{formatMoney(safeDepositPaidToday)}</b>
                      </div>
                      <div>
                        <small>Balance due</small>
                        <b>{formatMoney(payLaterBalance)}</b>
                      </div>
                    </div>
                  </div>
                ) : null}

                {hasCashDrawerRisk ? (
                  <div className="svx-pos-warning-strip">
                    Cash is being received, but the drawer is closed.
                  </div>
                ) : null}
              </section>

              {customerMode === "PICK" ? (
                <section className="svx-pos-checkout-subcard svx-pos-checkout-subcard--minimal">
                  <div className="svx-pos-setup-head">
                    <div>
                      <h2>Choose customer</h2>
                      <p>Search saved customer records.</p>
                    </div>
                  </div>

                  <label className="svx-pos-setup-field">
                    <span>Find customer</span>
                    <input
                      className={inputClass()}
                      placeholder="Name, phone, email, TIN, or ID"
                      value={customerQuery}
                      onChange={(event) => setCustomerQuery(event.target.value)}
                    />
                  </label>

                  <div className="svx-pos-customer-results">
                    {customersLoading ? (
                      <SkeletonBlock className="h-20 w-full" />
                    ) : filteredCustomers.length === 0 ? (
                      <EmptyState title="No customer found" text="Try another name, phone, or email." />
                    ) : (
                      filteredCustomers.slice(0, 4).map((customer) => (
                        <CustomerCard
                          key={customer.id}
                          customer={customer}
                          active={selectedCustomerId === customer.id}
                          onClick={() => setSelectedCustomerId(customer.id)}
                        />
                      ))
                    )}
                  </div>
                </section>
              ) : null}

              {customerMode === "NEW" ? (
                <section className="svx-pos-checkout-subcard svx-pos-checkout-subcard--minimal">
                  <div className="svx-pos-setup-head">
                    <div>
                      <h2>New customer</h2>
                      <p>Only name and phone are required.</p>
                    </div>
                  </div>

                  <div className="svx-pos-setup-grid svx-pos-setup-grid--two">
                    <label className="svx-pos-setup-field">
                      <span>Full name</span>
                      <input
                        className={inputClass()}
                        value={customerForm.name}
                        onChange={(event) => setCustomerField("name", event.target.value)}
                        placeholder="Customer name"
                      />
                    </label>

                    <label className="svx-pos-setup-field">
                      <span>Phone</span>
                      <input
                        className={inputClass()}
                        value={customerForm.phone}
                        onChange={(event) => setCustomerField("phone", event.target.value)}
                        placeholder="Phone number"
                      />
                    </label>

                    <label className="svx-pos-setup-field">
                      <span>Email</span>
                      <input
                        className={inputClass()}
                        value={customerForm.email}
                        onChange={(event) => setCustomerField("email", event.target.value)}
                        placeholder="Optional"
                      />
                    </label>

                    <label className="svx-pos-setup-field">
                      <span>Address</span>
                      <input
                        className={inputClass()}
                        value={customerForm.address}
                        onChange={(event) => setCustomerField("address", event.target.value)}
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                </section>
              ) : null}
            </div>

            <div className="mt-5 border-t border-[var(--color-border)] pt-5">
              <div className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                      Products subtotal
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                      Customer selling price
                    </div>
                  </div>

                  <div className="text-right text-base font-black text-[var(--color-text)]">
                    {formatMoney(taxPreview.subtotal)}
                  </div>
                </div>

                {taxPreview.showTaxLine ? (
                  <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-[var(--color-text)]">
                          Subtotal before tax
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                          Tax is already included in prices
                        </div>
                      </div>

                      <div className="text-right text-sm font-black text-[var(--color-text)]">
                        {formatMoney(taxPreview.taxableSubtotal)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-[var(--color-text)]">
                          {taxPreview.taxName}
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                          Shown as included tax
                        </div>
                      </div>

                      <div className="text-right text-sm font-black text-amber-600">
                        {formatMoney(taxPreview.taxAmount)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-[20px] bg-[var(--color-card)] px-4 py-3 text-xs font-bold leading-5 text-[var(--color-text-muted)]">
                    No tax line will be printed on this receipt.
                  </div>
                )}

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-[var(--color-border)] pt-4">
                  <div>
                    <div className="text-sm font-bold text-[var(--color-text-muted)]">Final total</div>
                    <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                      {saleModeLabel} — {paymentMethod}
                    </div>
                  </div>

                  <div className="text-right text-[1.8rem] font-black tracking-[-0.04em] text-[var(--color-text)]">
                    {formatMoney(total)}
                  </div>
                </div>
              </div>

              {saleType === "CREDIT" ? (
                <div className="mt-3 rounded-[22px] bg-[var(--color-surface-2)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-[var(--color-text)]">Deposit paid now</div>
                      <div className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                        Remaining balance after deposit
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-[var(--color-text)]">
                        {formatMoney(Number(amountPaid || 0))}
                      </div>
                      <div className="mt-1 text-xs font-black text-amber-600">
                        {formatMoney(Math.max(0, total - Number(amountPaid || 0)))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className={cx("svx-pos-final-actions", hasCashDrawerRisk && "has-drawer-risk")}>
                <AsyncButton
                  loading={savingSale}
                  onClick={completeSale}
                  disabled={!cart.length || hasCashDrawerRisk}
                  className={saleType === "CREDIT" ? warningButton() : primaryButton()}
                >
                  {saleType === "CREDIT" ? "Finish pay-later sale" : "Finish sale"}
                </AsyncButton>

                {hasCashDrawerRisk ? (
                  <button type="button" onClick={() => navigate("/app/pos/drawer")} className={dangerButton()}>
                    Open cash drawer
                  </button>
                ) : null}
              </div>

              <p className="svx-pos-stock-note">
                Stock will reduce from {activeBranchLabel} after the sale is completed.
              </p>
            </div>
          </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

