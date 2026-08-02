import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BadgeCheck,
  Barcode,
  ChevronRight,
  Boxes,
  ClipboardList,
  ImagePlus,
  Layers3,
  PackageCheck,
  Save,
  Tags,
} from "lucide-react";

import AsyncButton from "../../components/ui/AsyncButton";
import FormPageSkeleton from "../../components/ui/FormPageSkeleton";
import {
  getProductById,
  updateProduct,
} from "../../services/inventoryApi";
import { getWorkspaceContext } from "../../services/storeApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import {
  getBusinessProductConfig,
  getKnownProductCategories,
  getProductCategoryFields,
  getProductSubcategoryOptions,
  normalizeBusinessCategory,
} from "../../utils/productFormConfig";
import "./InventoryEdit.css";

const WORKSPACE_CACHE_KEY = "storvex_me_cache_v2";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function skuToken(value) {
  return cleanString(value)
    .toUpperCase()
    .replace(/['"]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeSku({ brand, category, name }) {
  const parts = [
    skuToken(brand).slice(0, 8),
    skuToken(category).slice(0, 8),
    skuToken(name).slice(0, 16),
  ].filter(Boolean);

  return parts.join("-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function isOtherCategory(value) {
  return cleanString(value).toLowerCase() === "other";
}

function allKnownCategoryOptions() {
  return getKnownProductCategories();
}

function categorySelectValue(category, options = allKnownCategoryOptions()) {
  const clean = cleanString(category);
  if (!clean) return "";
  return options.includes(clean) ? clean : "Other";
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



function productStatus(product) {
  const qty = productStock(product);
  const min = Number(product?.minStockLevel ?? 0);

  if (qty <= 0) return { label: "Out of stock", tone: "danger" };
  if (min > 0 && qty <= min) return { label: "Low stock", tone: "warning" };

  return { label: "In stock", tone: "success" };
}

function listingStatus(product) {
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
    customCategory: "",
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
        category: categorySelectValue(cleanString(nextProduct.category)),
        customCategory: allKnownCategoryOptions().includes(cleanString(nextProduct.category))
          ? ""
          : cleanString(nextProduct.category),
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
  const meta = getBusinessProductConfig(businessCategory);
  const trackingCopy = meta.tracking;
  const productCategoryOptions = meta.categories;
  const selectedCategory = isOtherCategory(form.category)
    ? cleanString(form.customCategory)
    : cleanString(form.category);
  const displayCategory = selectedCategory || form.category || meta.label;
  const generatedSku = makeSku({
    brand: form.brand,
    category: selectedCategory || meta.label,
    name: form.name,
  });
  const subcategoryOptions =
    getProductSubcategoryOptions(
      businessCategory,
      selectedCategory || form.category,
    );

  const attributeFields = useMemo(
    () =>
      getProductCategoryFields(
        businessCategory,
        selectedCategory || form.category,
      ),
    [
      businessCategory,
      selectedCategory,
      form.category,
    ],
  );

  const status = productStatus(product);
  const listing = listingStatus(product);
  const qty = productStock(product);
  const costPrice = parseNumber(form.costPrice);
  const sellPrice = parseNumber(form.sellPrice);
  const minStockLevel = parseNumber(form.minStockLevel);

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
      customCategory: "",
      subcategory: "",
      subcategoryOther: "",
      categoryAttributes: {},
    }));
  }

  function validateForm() {
    const name = cleanString(form.name);
    const category = selectedCategory;

    if (!name) {
      toast.error(`${meta.itemLabel} name is required`);
      return false;
    }

    if (!category) {
      toast.error("Choose the product category");
      return false;
    }

    if (trackSerial && !cleanString(form.serial)) {
      toast.error(trackingCopy.requiredMessage);
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
        sku: generatedSku || cleanString(form.sku),
        barcode: cleanString(form.barcode),
        serial: trackSerial ? cleanString(form.serial) : "",
        brand: cleanString(form.brand),
        category: selectedCategory,
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
          <Link
            to={`/app/inventory/${product.id}`}
            className="svx-edit-back"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
            <span>Product details</span>
          </Link>

          <div className="svx-edit-hero-copy">
            <p className="svx-edit-kicker">
              {meta.eyebrow}
            </p>

            <h1>
              Edit {meta.itemLabelLower}.
            </h1>

            <p>
              Update its information and price. Stock quantity
              remains protected and is changed through Update stock.
            </p>

            <div
              className="svx-edit-status-line"
              aria-label="Product status"
            >
              <span className={`is-${status.tone}`}>
                {status.label}
              </span>

              <span className={`is-${listing.tone}`}>
                {listing.label}
              </span>

              <span>{displayCategory}</span>
            </div>
          </div>
        </header>

        <div className="svx-edit-layout">
          <div className="svx-edit-main">
            <section className="svx-edit-card">
              <SectionHeader
                icon={PackageCheck}
                title={`${meta.itemLabel} details`}
                text={`Update the main information used to find and sell this ${meta.itemLabelLower}.`}
              />

              <div className="svx-edit-grid">
                <Field label={`${meta.itemLabel} name`} required wide>
                  <input
                    className="svx-edit-input"
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    placeholder={meta.productNamePlaceholder}
                    disabled={saving}
                  />
                </Field>

                <Field label={`${meta.itemLabel} category`} required>
                  <select
                    className="svx-edit-input"
                    value={form.category}
                    onChange={(event) => handleCategoryChange(event.target.value)}
                    disabled={saving}
                  >
                    <option value="">
                      {meta.categoryPrompt}
                    </option>
                    {productCategoryOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>

                {isOtherCategory(form.category) ? (
                  <Field label="Custom category" required>
                    <input
                      className="svx-edit-input"
                      value={form.customCategory}
                      onChange={(event) => setField("customCategory", event.target.value)}
                      placeholder={`Write the ${meta.itemLabelLower} category`}
                      disabled={saving}
                    />
                  </Field>
                ) : null}

                <Field label="Brand">
                  <input
                    className="svx-edit-input"
                    value={form.brand}
                    onChange={(event) => setField("brand", event.target.value)}
                    placeholder={meta.brandPlaceholder}
                    disabled={saving}
                  />
                </Field>

                {subcategoryOptions.length ? (
                  <Field label={`${meta.itemLabel} type`}>
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

                <Field label="SKU" help="Generated automatically from brand, category, and product name.">
                  <input
                    className="svx-edit-input"
                    value={generatedSku || cleanString(form.sku) || "Auto-generated after product name"}
                    readOnly
                    disabled
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
                title={`${meta.itemLabel} specifications`}
                text={`Only details relevant to this ${meta.itemLabelLower} category are shown.`}
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
                title={trackingCopy.title}
                text={trackingCopy.question}
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
                  <strong>{trackingCopy.normalTitle}</strong>
                  <span>{trackingCopy.normalText}</span>
                </button>

                <button
                  type="button"
                  className={cx("svx-edit-choice", trackSerial && "is-active")}
                  onClick={() => setTrackSerial(true)}
                  disabled={saving}
                >
                  <strong>{trackingCopy.trackedTitle}</strong>
                  <span>{trackingCopy.trackedText}</span>
                </button>
              </div>

              {trackSerial ? (
                <div className="svx-edit-grid is-single">
                  <Field label={trackingCopy.inputLabel} required>
                    <input
                      className="svx-edit-input"
                      value={form.serial}
                      onChange={(event) => setField("serial", event.target.value)}
                      placeholder={trackingCopy.inputPlaceholder}
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
                title={`${meta.itemLabel} review`}
                text="Confirm the essential details before saving."
              />

              <div className="svx-edit-summary">
                <SummaryRow
                  label={meta.itemLabel}
                  value={form.name || `Unnamed ${meta.itemLabelLower}`}
                />
                <SummaryRow
                  label="Category"
                  value={displayCategory}
                />
                <SummaryRow
                  label="Selling price"
                  value={formatRwf(sellPrice || 0)}
                />
                <SummaryRow
                  label="Current stock"
                  value={formatPlain(qty)}
                  tone={status.tone}
                />
                <SummaryRow
                  label="Listing"
                  value={listing.label}
                  tone={listing.tone}
                />
              </div>

              <Link
                to={`/app/inventory/${id}/images`}
                className="svx-edit-photo-action"
              >
                <ImagePlus size={17} strokeWidth={2.35} />
                <span>Manage photos and marketplace</span>
                <ChevronRight size={16} strokeWidth={2.4} />
              </Link>

              <p className="svx-edit-photo-help">
                Photos and marketplace visibility are managed
                separately from product information.
              </p>
            </section>

            <section className="svx-edit-save-card">
              <AsyncButton
                type="submit"
                loading={saving}
                loadingText="Saving changes..."
                className="svx-edit-primary"
              >
                <Save size={17} strokeWidth={2.4} />
                <span>Save changes</span>
              </AsyncButton>

              <button
                type="button"
                className="svx-edit-secondary"
                onClick={() => navigate(`/app/inventory/${id}`)}
                disabled={saving}
              >
                Cancel
              </button>
            </section>
          </aside>
        </div>
      </form>
    </main>
  );
}
