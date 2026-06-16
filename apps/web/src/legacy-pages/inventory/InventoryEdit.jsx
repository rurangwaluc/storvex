import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BadgeCheck,
  Barcode,
  Boxes,
  ChevronRight,
  ClipboardList,
  DollarSign,
  ImagePlus,
  Layers3,
  PackageCheck,
  Save,
  ShieldCheck,
  Tags,
  Warehouse,
} from "lucide-react";

import AsyncButton from "../../components/ui/AsyncButton";
import FormPageSkeleton from "../../components/ui/FormPageSkeleton";
import {
  getProductById,
  updateProduct,
} from "../../services/inventoryApi";
import { getWorkspaceContext } from "../../services/storeApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./InventoryEdit.css";

const WORKSPACE_CACHE_KEY = "storvex_me_cache_v2";

const BUSINESS_CATEGORY_META = {
  ELECTRONICS: {
    label: "Electronics",
    eyebrow: "Device-ready stock",
    help: "Use processor, memory, storage, condition, warranty, and device details where they matter.",
    categoryOptions: [
      "Phones",
      "Laptops",
      "Tablets",
      "Desktop Computers",
      "Monitors",
      "Printers",
      "Networking",
      "TV & Audio",
      "Gaming",
      "Cameras",
      "Storage",
      "Accessories",
      "Smart Devices",
      "Components",
      "Other",
    ],
  },
  HARDWARE: {
    label: "Hardware / Quincaillerie",
    eyebrow: "Building materials stock",
    help: "Use unit, size, material, and grade to keep hardware stock clear.",
    categoryOptions: [
      "Cement",
      "Iron sheets",
      "Paint",
      "Plumbing",
      "Electrical",
      "Tools",
      "Locks",
      "Tiles",
      "Timber",
      "Fasteners",
      "Adhesives",
      "Other",
    ],
  },
  HOME_KITCHEN: {
    label: "Home & kitchen",
    eyebrow: "Home product stock",
    help: "Use material, color, set size, and room/use case for clean product records.",
    categoryOptions: [
      "Cookware",
      "Kitchen appliances",
      "Dining",
      "Home appliances",
      "Storage",
      "Cleaning",
      "Furniture",
      "Decor",
      "Bathroom",
      "Bedding",
      "Other",
    ],
  },
  LIGHTING: {
    label: "Lighting",
    eyebrow: "Lighting stock",
    help: "Use wattage, voltage, fitting, and indoor/outdoor details.",
    categoryOptions: [
      "Bulbs",
      "Tubes",
      "Ceiling lights",
      "Wall lights",
      "Outdoor lights",
      "Solar lights",
      "LED strips",
      "Switches",
      "Cables",
      "Accessories",
      "Other",
    ],
  },
  SPARE_PARTS: {
    label: "Spare parts",
    eyebrow: "Compatibility-first stock",
    help: "Use part number, compatible model, condition, and warranty where needed.",
    categoryOptions: [
      "Phone parts",
      "Laptop parts",
      "Printer parts",
      "TV parts",
      "Audio parts",
      "Power parts",
      "Cables",
      "Screens",
      "Batteries",
      "Boards",
      "Other",
    ],
  },
};

const DEFAULT_META = BUSINESS_CATEGORY_META.ELECTRONICS;

const ELECTRONICS_SUBCATEGORIES = {
  Accessories: [
    "Charger",
    "Headphones / Earbuds",
    "Phone cover",
    "Screen protector",
    "Adapter / Dongle",
    "Cable",
    "Power bank",
    "SSD / HDD",
    "RAM",
    "Keyboard / Mouse",
    "Laptop bag",
    "Battery",
    "Remote",
    "Tripod",
    "Microphone",
    "Webcam",
    "Other",
  ],
  Storage: ["SSD", "HDD", "Memory card", "Flash disk", "External drive", "Other"],
  Components: ["RAM", "Motherboard", "Power supply", "Battery", "Screen", "Keyboard", "Fan", "Other"],
};

const UNIT_OPTIONS = [
  "Piece",
  "Box",
  "Carton",
  "Pack",
  "Pair",
  "Set",
  "Bag",
  "Kg",
  "Litre",
  "Metre",
  "Roll",
  "Bundle",
];

const CONDITION_OPTIONS = ["New", "Used", "Refurbished", "Open box"];

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function parseNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatRwf(value) {
  const n = Number(value || 0);

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? Math.round(n) : 0)}`;
}

function formatPlain(value) {
  const n = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function normalizeBusinessCategory(value) {
  const raw = cleanString(value).toUpperCase();

  if (["HARDWARE", "QUINCAILLERIE"].includes(raw)) return "HARDWARE";
  if (["HOME_KITCHEN", "HOME_AND_KITCHEN", "HOME & KITCHEN"].includes(raw)) return "HOME_KITCHEN";
  if (raw === "LIGHTING") return "LIGHTING";
  if (["SPARE_PARTS", "SPARE PARTS", "AUTO_PARTS"].includes(raw)) return "SPARE_PARTS";

  return "ELECTRONICS";
}

function readCachedWorkspace() {
  try {
    const session = sessionStorage.getItem(WORKSPACE_CACHE_KEY);
    if (session) return JSON.parse(session);
  } catch {}

  try {
    const local = localStorage.getItem(WORKSPACE_CACHE_KEY);
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
      workspace?.category,
  );
}

function productStock(product) {
  return Number(product?.effectiveStockQty ?? product?.branchStockQty ?? product?.stockQty ?? 0);
}

function productReserved(product) {
  return Number(product?.branchReservedQty ?? product?.reservedQty ?? 0);
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

function productImages(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  return images
    .map((image) => {
      if (typeof image === "string") return { url: image };
      return image;
    })
    .filter((image) => cleanString(image?.url || image?.imageUrl));
}

function productInitials(name) {
  const parts = cleanString(name).split(/\s+/).filter(Boolean);

  if (!parts.length) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function productStatus(product) {
  const qty = productStock(product);
  const min = Number(product?.minStockLevel ?? 0);

  if (qty <= 0) return { label: "Out of stock", tone: "danger" };
  if (min > 0 && qty <= min) return { label: "Low stock", tone: "warning" };

  return { label: "In stock", tone: "success" };
}

function marketplaceStatus(product) {
  const status = cleanString(product?.marketplaceStatus).toUpperCase();

  if (status === "PUBLISHED") return { label: "Published", tone: "success" };
  if (status === "DRAFT") return { label: "Draft", tone: "warning" };
  if (status === "UNPUBLISHED") return { label: "Unpublished", tone: "neutral" };

  return { label: "Internal only", tone: "neutral" };
}

function currentAttributes(product) {
  const raw =
    product?.categoryAttributes ||
    product?.marketplaceAttributes ||
    product?.attributes ||
    {};

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  return raw;
}

function attributeFieldsFor(categoryKey, productCategory) {
  if (categoryKey === "HARDWARE") {
    return [
      { name: "unit", label: "Selling unit", type: "select", options: UNIT_OPTIONS, placeholder: "Piece" },
      { name: "size", label: "Size / measurement", placeholder: "Example: 20L, 12mm, 2m" },
      { name: "material", label: "Material", placeholder: "Example: steel, PVC, wood" },
      { name: "grade", label: "Grade / quality", placeholder: "Example: standard, heavy duty" },
    ];
  }

  if (categoryKey === "HOME_KITCHEN") {
    return [
      { name: "material", label: "Material", placeholder: "Example: stainless steel, glass" },
      { name: "color", label: "Color", placeholder: "Example: black" },
      { name: "size", label: "Size", placeholder: "Example: medium, 2L, queen" },
      { name: "setPieces", label: "Pieces in set", type: "number", placeholder: "Example: 6" },
    ];
  }

  if (categoryKey === "LIGHTING") {
    return [
      { name: "wattage", label: "Wattage", placeholder: "Example: 12W" },
      { name: "voltage", label: "Voltage", placeholder: "Example: 220V" },
      { name: "fitting", label: "Fitting", placeholder: "Example: E27, GU10" },
      { name: "lightColor", label: "Light color", placeholder: "Example: warm white" },
    ];
  }

  if (categoryKey === "SPARE_PARTS") {
    return [
      { name: "partNumber", label: "Part number", placeholder: "Example: A2337-SCREEN" },
      { name: "compatibleModel", label: "Compatible model", placeholder: "Example: iPhone 13, HP 840 G5" },
      { name: "condition", label: "Condition", type: "select", options: CONDITION_OPTIONS, placeholder: "New" },
      { name: "warrantyDays", label: "Warranty days", type: "number", placeholder: "Example: 30" },
    ];
  }

  if (["Phones", "Tablets"].includes(productCategory)) {
    return [
      { name: "storage", label: "Storage", placeholder: "Example: 128GB" },
      { name: "memory", label: "Memory", placeholder: "Example: 6GB RAM" },
      { name: "color", label: "Color", placeholder: "Example: Midnight" },
      { name: "condition", label: "Condition", type: "select", options: CONDITION_OPTIONS, placeholder: "New" },
    ];
  }

  if (["Laptops", "Desktop Computers"].includes(productCategory)) {
    return [
      { name: "processor", label: "Processor", placeholder: "Example: Core i5" },
      { name: "memory", label: "Memory", placeholder: "Example: 8GB RAM" },
      { name: "storage", label: "Storage", placeholder: "Example: 512GB SSD" },
      { name: "condition", label: "Condition", type: "select", options: CONDITION_OPTIONS, placeholder: "New" },
    ];
  }

  if (productCategory === "Accessories") {
    return [
      { name: "compatibility", label: "Compatible with", placeholder: "Example: USB-C phones" },
      { name: "color", label: "Color", placeholder: "Example: black" },
      { name: "warrantyDays", label: "Warranty days", type: "number", placeholder: "Example: 30" },
      { name: "unit", label: "Selling unit", type: "select", options: UNIT_OPTIONS, placeholder: "Piece" },
    ];
  }

  return [
    { name: "model", label: "Model", placeholder: "Example: 2024 model" },
    { name: "specification", label: "Key specification", placeholder: "Example: Bluetooth, 4K, dual-band" },
    { name: "condition", label: "Condition", type: "select", options: CONDITION_OPTIONS, placeholder: "New" },
    { name: "warrantyDays", label: "Warranty days", type: "number", placeholder: "Example: 30" },
  ];
}

function Field({ label, required = false, help, children, wide = false }) {
  return (
    <label className={cx("svx-edit-field", wide && "is-wide")}>
      <span className="svx-edit-field-label">
        {label}
        {required ? <strong>*</strong> : null}
      </span>
      {children}
      {help ? <span className="svx-edit-field-help">{help}</span> : null}
    </label>
  );
}

function SectionHeader({ icon: Icon, title, text, badge }) {
  return (
    <div className="svx-edit-section-head">
      <span className="svx-edit-section-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2.2} />
      </span>

      <div>
        <div className="svx-edit-section-title-row">
          <h2>{title}</h2>
          {badge ? <span>{badge}</span> : null}
        </div>
        <p>{text}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, tone }) {
  return (
    <div className={cx("svx-edit-summary-row", tone && `is-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniCard({ icon: Icon, label, value, tone = "neutral" }) {
  return (
    <div className={cx("svx-edit-mini-card", `is-${tone}`)}>
      <span aria-hidden="true">
        <Icon size={18} strokeWidth={2.25} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function StatusBadge({ tone = "neutral", children }) {
  return <span className={cx("svx-edit-badge", `is-${tone}`)}>{children}</span>;
}

export default function InventoryEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(() => readCachedWorkspace());
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trackSerial, setTrackSerial] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    serial: "",
    brand: "",
    category: "",
    subcategory: "",
    subcategoryOther: "",
    costPrice: "",
    sellPrice: "",
    minStockLevel: "",
    categoryAttributes: {},
  });

  const loadProduct = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    try {
      const response = await getProductById(id);
      const nextProduct = response?.product || response?.data?.product || response?.data || response;

      if (!nextProduct?.id) {
        toast.error("Product not found");
        navigate("/app/inventory");
        return;
      }

      setProduct(nextProduct);
      setTrackSerial(Boolean(cleanString(nextProduct.serial)));

      setForm({
        name: cleanString(nextProduct.name),
        sku: cleanString(nextProduct.sku),
        barcode: cleanString(nextProduct.barcode),
        serial: cleanString(nextProduct.serial),
        brand: cleanString(nextProduct.brand),
        category: cleanString(nextProduct.category),
        subcategory: cleanString(nextProduct.subcategory),
        subcategoryOther: cleanString(nextProduct.subcategoryOther),
        costPrice: nextProduct.costPrice === null || nextProduct.costPrice === undefined ? "" : String(nextProduct.costPrice),
        sellPrice:
          nextProduct.sellPrice === null || nextProduct.sellPrice === undefined
            ? nextProduct.price === null || nextProduct.price === undefined
              ? ""
              : String(nextProduct.price)
            : String(nextProduct.sellPrice),
        minStockLevel:
          nextProduct.minStockLevel === null || nextProduct.minStockLevel === undefined
            ? ""
            : String(nextProduct.minStockLevel),
        categoryAttributes: currentAttributes(nextProduct),
      });
    } catch (error) {
      console.error("Product edit load failed:", error);
      toast.error(error?.message || "Failed to load product");
      navigate("/app/inventory");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      try {
        const data = await getWorkspaceContext();
        if (!active) return;

        if (data) {
          setWorkspace(data);

          try {
            sessionStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(data));
          } catch {}
        }
      } catch {
        // Keep cached/default category if workspace refresh fails.
      }
    }

    loadWorkspace();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const businessCategory = businessCategoryFromWorkspace(workspace);
  const meta = BUSINESS_CATEGORY_META[businessCategory] || DEFAULT_META;
  const productCategoryOptions = meta.categoryOptions;
  const subcategoryOptions = ELECTRONICS_SUBCATEGORIES[form.category] || [];
  const attributeFields = useMemo(
    () => attributeFieldsFor(businessCategory, form.category),
    [businessCategory, form.category],
  );

  const status = productStatus(product);
  const marketplace = marketplaceStatus(product);
  const images = productImages(product);
  const qty = productStock(product);
  const reserved = productReserved(product);
  const costPrice = parseNumber(form.costPrice);
  const sellPrice = parseNumber(form.sellPrice);
  const minStockLevel = parseNumber(form.minStockLevel);
  const profitPerItem =
    costPrice !== null && sellPrice !== null ? sellPrice - costPrice : 0;
  const stockValue =
    sellPrice !== null ? qty * sellPrice : 0;
  const stockCost =
    costPrice !== null ? qty * costPrice : 0;
  const margin =
    sellPrice && sellPrice > 0 ? Math.round((profitPerItem / sellPrice) * 100) : 0;

  function setField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function setAttribute(name, value) {
    setForm((current) => ({
      ...current,
      categoryAttributes: {
        ...(current.categoryAttributes || {}),
        [name]: value,
      },
    }));
  }

  function handleCategoryChange(value) {
    setForm((current) => ({
      ...current,
      category: value,
      subcategory: "",
      subcategoryOther: "",
      categoryAttributes: {},
    }));
  }

  function validateForm() {
    const name = cleanString(form.name);
    const category = cleanString(form.category);

    if (!name) {
      toast.error("Product name is required");
      return false;
    }

    if (!category) {
      toast.error("Choose the product category");
      return false;
    }

    if (trackSerial && !cleanString(form.serial)) {
      toast.error("Serial or IMEI is required when tracking is on");
      return false;
    }

    if (costPrice === null || costPrice < 0) {
      toast.error("Enter a valid cost price");
      return false;
    }

    if (sellPrice === null || sellPrice <= 0) {
      toast.error("Enter a valid selling price");
      return false;
    }

    if (minStockLevel !== null && minStockLevel < 0) {
      toast.error("Low stock alert cannot be negative");
      return false;
    }

    return true;
  }

  function buildAttributes() {
    const out = {};

    for (const field of attributeFields) {
      const value = form.categoryAttributes?.[field.name];
      if (value === undefined || value === null || value === "") continue;
      out[field.name] = field.type === "number" ? Number(value) : cleanString(value);
    }

    return out;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      const payload = {
        name: cleanString(form.name),
        sku: cleanString(form.sku),
        barcode: cleanString(form.barcode),
        serial: trackSerial ? cleanString(form.serial) : "",
        brand: cleanString(form.brand),
        category: cleanString(form.category),
        subcategory: cleanString(form.subcategory),
        subcategoryOther: cleanString(form.subcategoryOther),
        costPrice: Number(form.costPrice),
        sellPrice: Number(form.sellPrice),
        minStockLevel: form.minStockLevel === "" ? undefined : Number(form.minStockLevel),
        categoryAttributes: buildAttributes(),
      };

      await updateProduct(id, payload);

      toast.success("Product updated");
      navigate(`/app/inventory/${id}`);
    } catch (error) {
      handleSubscriptionBlockedError(error) || toast.error(error?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <FormPageSkeleton title="Loading product" />;
  }

  if (!product) {
    return null;
  }

  return (
    <main className="svx-edit-page">
      <form className="svx-edit-shell" onSubmit={handleSubmit}>
        <header className="svx-edit-hero">
          <div className="svx-edit-hero-copy">
            <button
              type="button"
              className="svx-edit-back"
              onClick={() => navigate(`/app/inventory/${id}`)}
              disabled={saving}
            >
              <ArrowLeft size={18} strokeWidth={2.4} />
              <span>Product details</span>
            </button>

            <div className="svx-edit-kicker-row">
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <StatusBadge tone={marketplace.tone}>{marketplace.label}</StatusBadge>
            </div>

            <h1>Edit product.</h1>
            <p>
              Update product information, category details, and prices. Stock quantity changes stay separate through stock movement.
            </p>
          </div>

          <div className="svx-edit-hero-card">
            <span className="svx-edit-avatar" aria-hidden="true">
              {productInitials(form.name)}
            </span>

            <div>
              <p>{form.name || "Product"}</p>
              <span>{form.category || meta.label}</span>
            </div>

            <ChevronRight size={18} strokeWidth={2.5} />
          </div>
        </header>

        <section className="svx-edit-metrics" aria-label="Product edit preview">
          <MiniCard icon={Warehouse} label="Current stock" value={formatPlain(qty)} note={branchLabel(product)} tone={status.tone} />
          <MiniCard icon={DollarSign} label="Stock value" value={formatRwf(stockValue)} tone="green" />
          <MiniCard icon={ShieldCheck} label="Margin" value={`${Number.isFinite(margin) ? margin : 0}%`} tone={profitPerItem >= 0 ? "green" : "red"} />
          <MiniCard icon={ImagePlus} label="Images" value={`${images.length}`} note="Marketplace later" tone="blue" />
        </section>

        <div className="svx-edit-layout">
          <div className="svx-edit-main">
            <section className="svx-edit-card">
              <SectionHeader
                icon={PackageCheck}
                title="Product basics"
                text="Edit what helps the owner find, sell, and control this product."
                badge={meta.eyebrow}
              />

              <div className="svx-edit-grid">
                <Field label="Product name" required wide>
                  <input
                    className="svx-edit-input"
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    placeholder="Example: HP Pavilion 15"
                    disabled={saving}
                  />
                </Field>

                <Field label="Product category" required>
                  <select
                    className="svx-edit-input"
                    value={form.category}
                    onChange={(event) => handleCategoryChange(event.target.value)}
                    disabled={saving}
                  >
                    <option value="">Choose category</option>
                    {productCategoryOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Brand">
                  <input
                    className="svx-edit-input"
                    value={form.brand}
                    onChange={(event) => setField("brand", event.target.value)}
                    placeholder="Example: HP"
                    disabled={saving}
                  />
                </Field>

                {subcategoryOptions.length ? (
                  <Field label="Product type">
                    <select
                      className="svx-edit-input"
                      value={form.subcategory}
                      onChange={(event) => setField("subcategory", event.target.value)}
                      disabled={saving}
                    >
                      <option value="">Choose type</option>
                      {subcategoryOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {form.subcategory === "Other" ? (
                  <Field label="Custom type">
                    <input
                      className="svx-edit-input"
                      value={form.subcategoryOther}
                      onChange={(event) => setField("subcategoryOther", event.target.value)}
                      placeholder="Write the type"
                      disabled={saving}
                    />
                  </Field>
                ) : null}

                <Field label="SKU">
                  <input
                    className="svx-edit-input"
                    value={form.sku}
                    onChange={(event) => setField("sku", event.target.value)}
                    placeholder="Example: HP-PAV15"
                    disabled={saving}
                  />
                </Field>

                <Field label="Barcode">
                  <input
                    className="svx-edit-input"
                    value={form.barcode}
                    onChange={(event) => setField("barcode", event.target.value)}
                    placeholder="Scan or enter barcode"
                    disabled={saving}
                  />
                </Field>
              </div>
            </section>

            <section className="svx-edit-card">
              <SectionHeader
                icon={Layers3}
                title="Category details"
                text={meta.help}
                badge="Category-aware"
              />

              <div className="svx-edit-grid">
                {attributeFields.map((field) => (
                  <Field key={field.name} label={field.label}>
                    {field.type === "select" ? (
                      <select
                        className="svx-edit-input"
                        value={form.categoryAttributes?.[field.name] || ""}
                        onChange={(event) => setAttribute(field.name, event.target.value)}
                        disabled={saving}
                      >
                        <option value="">{field.placeholder || "Choose"}</option>
                        {(field.options || []).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        min={field.type === "number" ? "0" : undefined}
                        className="svx-edit-input"
                        value={form.categoryAttributes?.[field.name] || ""}
                        onChange={(event) => setAttribute(field.name, event.target.value)}
                        placeholder={field.placeholder}
                        disabled={saving}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </section>

            <section className="svx-edit-card">
              <SectionHeader
                icon={BadgeCheck}
                title="Tracking"
                text="Use serial or IMEI only when this product must be identified one by one."
              />

              <div className="svx-edit-choice-grid">
                <button
                  type="button"
                  className={cx("svx-edit-choice", !trackSerial && "is-active")}
                  onClick={() => {
                    setTrackSerial(false);
                    setField("serial", "");
                  }}
                  disabled={saving}
                >
                  <strong>Normal stock</strong>
                  <span>Best for products where every unit is the same.</span>
                </button>

                <button
                  type="button"
                  className={cx("svx-edit-choice", trackSerial && "is-active")}
                  onClick={() => setTrackSerial(true)}
                  disabled={saving}
                >
                  <strong>Serial / IMEI</strong>
                  <span>Best for phones, laptops, and warranty-sensitive items.</span>
                </button>
              </div>

              {trackSerial ? (
                <div className="svx-edit-grid is-single">
                  <Field label="Serial / IMEI" required>
                    <input
                      className="svx-edit-input"
                      value={form.serial}
                      onChange={(event) => setField("serial", event.target.value)}
                      placeholder="Serial or IMEI number"
                      disabled={saving}
                    />
                  </Field>
                </div>
              ) : null}
            </section>

            <section className="svx-edit-card">
              <SectionHeader
                icon={Tags}
                title="Price and alerts"
                text="Edit prices and the low-stock alert. Stock quantity is changed from Update stock only."
              />

              <div className="svx-edit-grid">
                <Field label="Cost price" required>
                  <input
                    type="number"
                    min="0"
                    className="svx-edit-input"
                    value={form.costPrice}
                    onChange={(event) => setField("costPrice", event.target.value)}
                    placeholder="420000"
                    disabled={saving}
                  />
                </Field>

                <Field label="Selling price" required>
                  <input
                    type="number"
                    min="0"
                    className="svx-edit-input"
                    value={form.sellPrice}
                    onChange={(event) => setField("sellPrice", event.target.value)}
                    placeholder="650000"
                    disabled={saving}
                  />
                </Field>

                <Field label="Current stock">
                  <input
                    className="svx-edit-input"
                    value={formatPlain(qty)}
                    disabled
                    readOnly
                  />
                </Field>

                <Field label="Low stock alert">
                  <input
                    type="number"
                    min="0"
                    className="svx-edit-input"
                    value={form.minStockLevel}
                    onChange={(event) => setField("minStockLevel", event.target.value)}
                    placeholder="2"
                    disabled={saving}
                  />
                </Field>
              </div>

              <div className="svx-edit-stock-note">
                <Boxes size={17} strokeWidth={2.35} />
                <span>
                  Current stock is read-only here. Use Update stock to record restocks, losses, or count corrections.
                </span>
              </div>
            </section>
          </div>

          <aside className="svx-edit-side">
            <section className="svx-edit-card svx-edit-side-card">
              <SectionHeader
                icon={ClipboardList}
                title="Before saving"
                text="Quick check for this product."
              />

              <div className="svx-edit-summary">
                <SummaryRow label="Product" value={form.name || "Not named"} />
                <SummaryRow label="Category" value={form.category || meta.label} />
                <SummaryRow label="Current stock" value={formatPlain(qty)} tone={status.tone} />
                <SummaryRow label="Reserved" value={formatPlain(reserved)} />
                <SummaryRow label="Cost" value={formatRwf(costPrice || 0)} />
                <SummaryRow label="Selling price" value={formatRwf(sellPrice || 0)} />
                <SummaryRow label="Profit per item" value={formatRwf(profitPerItem)} tone={profitPerItem >= 0 ? "success" : "danger"} />
                <SummaryRow label="Stock cost" value={formatRwf(stockCost)} />
                <SummaryRow label="Possible sales value" value={formatRwf(stockValue)} tone="success" />
              </div>
            </section>

            <section className="svx-edit-card svx-edit-marketplace-note">
              <SectionHeader
                icon={ImagePlus}
                title="Marketplace"
                text="Marketplace publishing stays separate."
              />

              <div className="svx-edit-marketplace-box">
                <StatusBadge tone={marketplace.tone}>{marketplace.label}</StatusBadge>
                <p>{images.length ? `${images.length} image${images.length === 1 ? "" : "s"} attached` : "No images attached yet"}</p>
                <span>
                  Images and publishing will be managed from the marketplace flow. Editing this product does not force marketplace images.
                </span>
              </div>
            </section>

            <section className="svx-edit-save-card">
              <button
                type="button"
                className="svx-edit-secondary"
                onClick={() => navigate(`/app/inventory/${id}`)}
                disabled={saving}
              >
                Cancel
              </button>

              <AsyncButton
                type="submit"
                loading={saving}
                loadingText="Saving changes..."
                className="svx-edit-primary"
              >
                <Save size={17} strokeWidth={2.4} />
                <span>Save changes</span>
              </AsyncButton>

              <Link to={`/app/inventory/${id}`} className="svx-edit-muted-link">
                Back to product details
                <ChevronRight size={15} strokeWidth={2.4} />
              </Link>
            </section>
          </aside>
        </div>
      </form>
    </main>
  );
}
