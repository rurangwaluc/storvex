import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BadgeCheck,
  Barcode,
  CheckCircle2,
  ClipboardList,
  ImagePlus,
  Layers3,
  PackagePlus,
  Save,
  Smartphone,
  Store,
  Tags,
} from "lucide-react";

import AsyncButton from "../../components/ui/AsyncButton";
import { createProduct } from "../../services/inventoryApi";
import { getWorkspaceContext } from "../../services/storeApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import {
  getBusinessProductConfig,
  getProductCategoryFields,
  getProductSubcategoryOptions,
  normalizeBusinessCategory,
} from "../../utils/productFormConfig";
import "./InventoryCreate.css";

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
  }).format(Number.isFinite(n) ? Math.round(n) : 0);
}

function activeBranchNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  /*
    Product creation should show the branch name only.
    The branch code/main label is useful internally, but it makes the create screen noisy.
  */
  if (name) return name;
  if (code) return code;

  return "Current branch";
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

function Field({ label, required = false, help, children, wide = false }) {
  return (
    <label className={cx("svx-product-field", wide && "is-wide")}>
      <span className="svx-product-field-label">
        {label}
        {required ? <strong>*</strong> : null}
      </span>
      {children}
      {help ? <span className="svx-product-field-help">{help}</span> : null}
    </label>
  );
}

function SectionHeader({ icon: Icon, title, text, badge }) {
  return (
    <div className="svx-product-section-head">
      <span className="svx-product-section-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2.2} />
      </span>

      <div>
        <div className="svx-product-section-title-row">
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
    <div className={cx("svx-product-summary-row", tone && `is-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function InventoryCreate() {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(() => readCachedWorkspace());
  const [branchLabel] = useState(() => activeBranchNameFromStorage());
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
    stockQty: "",
    minStockLevel: "",
    categoryAttributes: {},
  });

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
        // Keep cached/default category. Creating products should not be blocked by a failed context refresh.
      }
    }

    loadWorkspace();

    return () => {
      active = false;
    };
  }, []);

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

  const costPrice = parseNumber(form.costPrice);
  const sellPrice = parseNumber(form.sellPrice);
  const stockQty = parseNumber(form.stockQty);
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

    if (stockQty === null || stockQty < 0) {
      toast.error("Enter valid starting stock");
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

    const saveDestination =
      event.nativeEvent?.submitter?.value === "photos"
        ? "photos"
        : "product";

    setSaving(true);

    try {
      const payload = {
        name: cleanString(form.name),
        sku: generatedSku,
        barcode: cleanString(form.barcode),
        serial: trackSerial ? cleanString(form.serial) : "",
        brand: cleanString(form.brand),
        category: selectedCategory,
        subcategory: cleanString(form.subcategory),
        subcategoryOther: cleanString(form.subcategoryOther),
        costPrice: Number(form.costPrice),
        sellPrice: Number(form.sellPrice),
        stockQty: Number(form.stockQty),
        minStockLevel: form.minStockLevel === "" ? undefined : Number(form.minStockLevel),
        categoryAttributes: buildAttributes(),
      };

      const response = await createProduct(payload);
      const product = response?.product || response?.data?.product || response;
      const productId = product?.id;

      toast.success("Product saved");

      if (!productId) {
        navigate("/app/inventory");
        return;
      }

      if (saveDestination === "photos") {
        navigate(
          `/app/inventory/${productId}/images?setup=1`,
        );
        return;
      }

      navigate(`/app/inventory/${productId}`);
    } catch (error) {
      handleSubscriptionBlockedError(error) || toast.error(error?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="svx-product-page">
      <form className="svx-product-shell" onSubmit={handleSubmit}>
        <header className="svx-product-hero">
          <button
            type="button"
            className="svx-product-back"
            onClick={() => navigate("/app/inventory")}
            disabled={saving}
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
            <span>Inventory</span>
          </button>

          <div className="svx-product-hero-copy">
            <p className="svx-product-kicker">
              {meta.eyebrow}
            </p>

            <h1>
              Add {meta.itemLabelLower}.
            </h1>

            <p>{meta.pageDescription}</p>
          </div>
        </header>

        <div className="svx-product-layout">
          <div className="svx-product-main">
            <section className="svx-product-card">
              <SectionHeader
                icon={PackagePlus}
                title={`${meta.itemLabel} details`}
                text={`Enter the main information used to find and sell this ${meta.itemLabelLower}.`}
              />

              <div className="svx-product-grid">
                <Field label={`${meta.itemLabel} name`} required wide>
                  <input
                    className="svx-product-input"
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    placeholder={meta.productNamePlaceholder}
                    disabled={saving}
                  />
                </Field>

                <Field label={`${meta.itemLabel} category`} required>
                  <select
                    className="svx-product-input"
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
                      className="svx-product-input"
                      value={form.customCategory}
                      onChange={(event) => setField("customCategory", event.target.value)}
                      placeholder={`Write the ${meta.itemLabelLower} category`}
                      disabled={saving}
                    />
                  </Field>
                ) : null}

                <Field label="Brand">
                  <input
                    className="svx-product-input"
                    value={form.brand}
                    onChange={(event) => setField("brand", event.target.value)}
                    placeholder={meta.brandPlaceholder}
                    disabled={saving}
                  />
                </Field>

                {subcategoryOptions.length ? (
                  <Field label={`${meta.itemLabel} type`}>
                    <select
                      className="svx-product-input"
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
                      className="svx-product-input"
                      value={form.subcategoryOther}
                      onChange={(event) => setField("subcategoryOther", event.target.value)}
                      placeholder="Write the type"
                      disabled={saving}
                    />
                  </Field>
                ) : null}

                <Field label="SKU" help="Generated automatically from brand, category, and product name.">
                  <input
                    className="svx-product-input"
                    value={generatedSku || "Auto-generated after product name"}
                    readOnly
                    disabled
                  />
                </Field>

                <Field label="Barcode">
                  <input
                    className="svx-product-input"
                    value={form.barcode}
                    onChange={(event) => setField("barcode", event.target.value)}
                    placeholder="Scan or enter barcode"
                    disabled={saving}
                  />
                </Field>
              </div>
            </section>

            <section className="svx-product-card">
              <SectionHeader
                icon={Layers3}
                title={`${meta.itemLabel} specifications`}
                text={`Only details relevant to this ${meta.itemLabelLower} category are shown.`}
              />

              <div className="svx-product-grid">
                {attributeFields.map((field) => (
                  <Field key={field.name} label={field.label}>
                    {field.type === "select" ? (
                      <select
                        className="svx-product-input"
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
                        className="svx-product-input"
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

            <section className="svx-product-card">
              <SectionHeader
                icon={BadgeCheck}
                title={trackingCopy.title}
                text={trackingCopy.question}
              />

              <div className="svx-product-choice-grid">
                <button
                  type="button"
                  className={cx("svx-product-choice", !trackSerial && "is-active")}
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
                  className={cx("svx-product-choice", trackSerial && "is-active")}
                  onClick={() => setTrackSerial(true)}
                  disabled={saving}
                >
                  <strong>{trackingCopy.trackedTitle}</strong>
                  <span>{trackingCopy.trackedText}</span>
                </button>
              </div>

              {trackSerial ? (
                <div className="svx-product-grid is-single">
                  <Field label={trackingCopy.inputLabel} required>
                    <input
                      className="svx-product-input"
                      value={form.serial}
                      onChange={(event) => setField("serial", event.target.value)}
                      placeholder={trackingCopy.inputPlaceholder}
                      disabled={saving}
                    />
                  </Field>
                </div>
              ) : null}
            </section>

            <section className="svx-product-card">
              <SectionHeader
                icon={Tags}
                title="Price and stock"
                text="Set what the product costs, what it sells for, and what is available in this branch."
              />

              <div className="svx-product-grid">
                <Field label="Cost price" required>
                  <input
                    type="number"
                    min="0"
                    className="svx-product-input"
                    value={form.costPrice}
                    onChange={(event) => setField("costPrice", event.target.value)}
                    placeholder="450000"
                    disabled={saving}
                  />
                </Field>

                <Field label="Selling price" required>
                  <input
                    type="number"
                    min="0"
                    className="svx-product-input"
                    value={form.sellPrice}
                    onChange={(event) => setField("sellPrice", event.target.value)}
                    placeholder="530000"
                    disabled={saving}
                  />
                </Field>

                <Field label="Starting stock" required>
                  <input
                    type="number"
                    min="0"
                    className="svx-product-input"
                    value={form.stockQty}
                    onChange={(event) => setField("stockQty", event.target.value)}
                    placeholder="5"
                    disabled={saving}
                  />
                </Field>

                <Field label="Low stock alert">
                  <input
                    type="number"
                    min="0"
                    className="svx-product-input"
                    value={form.minStockLevel}
                    onChange={(event) => setField("minStockLevel", event.target.value)}
                    placeholder="2"
                    disabled={saving}
                  />
                </Field>
              </div>
            </section>
          </div>

          <aside className="svx-product-side">
            <section className="svx-product-card svx-product-side-card">
              <SectionHeader
                icon={ClipboardList}
                title={`${meta.itemLabel} review`}
                text="Confirm the essential details before saving."
              />

              <div className="svx-product-summary">
                <SummaryRow
                  label={meta.itemLabel}
                  value={form.name || `New ${meta.itemLabelLower}`}
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
                  label="Starting stock"
                  value={stockQty === null ? "0" : formatPlain(stockQty)}
                />
                <SummaryRow
                  label="Branch"
                  value={branchLabel}
                />
              </div>

              <p className="svx-product-photo-help">
                Photos are optional for internal stock. Add them when
                this item needs product images or marketplace visibility.
              </p>
            </section>

            <section className="svx-product-save-card">
              <AsyncButton
                type="submit"
                value="photos"
                loading={saving}
                loadingText="Saving product..."
                className="svx-product-primary"
              >
                <ImagePlus size={17} strokeWidth={2.4} />
                <span>Save and add photos</span>
              </AsyncButton>

              <button
                type="submit"
                value="product"
                className="svx-product-secondary"
                disabled={saving}
              >
                <Save size={17} strokeWidth={2.4} />
                <span>Save product only</span>
              </button>

              <button
                type="button"
                className="svx-product-cancel"
                onClick={() => navigate("/app/inventory")}
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
