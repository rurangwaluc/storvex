import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  createDeal,
  listInternalSuppliers,
  searchCurrentBranchProducts,
} from "../../services/interStoreApi";
import { getActiveBranchId } from "../../services/apiClient";
import "./InterStore.css";

const EMPTY_FORM = {
  supplierType: "EXTERNAL",
  supplierTenantId: "",
  externalSupplierName: "",
  externalSupplierPhone: "",
  productId: "",
  productName: "",
  productCategory: "",
  productColor: "",
  serial: "",
  quantity: "1",
  agreedPrice: "",
  dueDate: "",
  takenAt: "",
  resellerName: "",
  resellerPhone: "",
  resellerStore: "",
  resellerWorkplace: "",
  resellerDistrict: "",
  resellerSector: "",
  resellerAddress: "",
  resellerNationalId: "",
  notes: "",
};

const STORE_SEARCH_MIN_CHARS = 2;

const CATEGORY_FIELD_COPY = {
  ELECTRONICS: {
    businessLabel: "Electronics",
    itemTypeLabel: "Device type",
    itemTypePlaceholder: "Laptop, phone, TV, charger",
    itemTypeHint: "Choose the electronics type. The business category is already Electronics.",
    codeLabel: "Serial / IMEI / item code",
    codePlaceholder: "Serial, IMEI, SKU, barcode",
    codeHint: "Use serial number, IMEI, SKU, barcode, or another short tracking code.",
    variantLabel: "Variant",
    variantPlaceholder: "Color, storage, RAM, model",
  },
  HARDWARE: {
    businessLabel: "Hardware",
    itemTypeLabel: "Item type",
    itemTypePlaceholder: "Cement, pipe, nails, paint",
    itemTypeHint: "Choose the hardware item type. The business category is already Hardware.",
    codeLabel: "SKU / batch / item code",
    codePlaceholder: "SKU, barcode, batch, item code",
    codeHint: "Use SKU, barcode, batch number, or another short tracking code.",
    variantLabel: "Variant",
    variantPlaceholder: "Size, grade, unit, finish",
  },
  HOME_KITCHEN: {
    businessLabel: "Home & kitchen",
    itemTypeLabel: "Item type",
    itemTypePlaceholder: "Cookware, sink, tile, cabinet set",
    itemTypeHint: "Choose the home or kitchen item type. The business category is already Home & kitchen.",
    codeLabel: "Model / SKU / batch",
    codePlaceholder: "Model, SKU, barcode, batch",
    codeHint: "Use model number, SKU, barcode, batch, or another short tracking code.",
    variantLabel: "Variant",
    variantPlaceholder: "Color, size, finish, material",
  },
  LIGHTING: {
    businessLabel: "Lighting",
    itemTypeLabel: "Lighting type",
    itemTypePlaceholder: "LED bulb, ceiling light, flood light",
    itemTypeHint: "Choose the lighting type. Do not enter Lighting again; that is already the business category.",
    codeLabel: "Model / wattage / item code",
    codePlaceholder: "Model, wattage, SKU, barcode",
    codeHint: "Use model number, wattage code, SKU, barcode, or batch.",
    variantLabel: "Variant",
    variantPlaceholder: "Wattage, color temperature, shape, finish",
  },
  SPARE_PARTS: {
    businessLabel: "Spare parts",
    itemTypeLabel: "Part type",
    itemTypePlaceholder: "Screen, battery, brake pad, filter",
    itemTypeHint: "Choose the spare part type. The business category is already Spare parts.",
    codeLabel: "Part number / SKU / item code",
    codePlaceholder: "Part number, SKU, barcode, batch",
    codeHint: "Use part number, SKU, barcode, serial, or batch code.",
    variantLabel: "Variant",
    variantPlaceholder: "Compatibility, size, side, condition",
  },
};

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function formatMoney(value) {
  const n = Number(value || 0);
  return `RWF ${Math.round(Number.isFinite(n) ? n : 0).toLocaleString("en-US")}`;
}

function parseJsonSafe(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function readJwtPayload(token) {
  const raw = cleanString(token);
  if (!raw || !raw.includes(".")) return null;

  try {
    const payload = raw.split(".")[1] || "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function normalizeBusinessCategory(value) {
  const key = cleanString(value)
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[\s-]+/g, "_");

  if (["ELECTRONICS", "ELECTRONIC"].includes(key)) return "ELECTRONICS";
  if (["HARDWARE", "QUINCAILLERIE"].includes(key)) return "HARDWARE";
  if (["HOME_KITCHEN", "HOME_AND_KITCHEN", "HOME_KITCHEN_MATERIALS", "HOME_AND_KITCHEN_MATERIALS"].includes(key)) return "HOME_KITCHEN";
  if (["LIGHTING", "LIGHTS"].includes(key)) return "LIGHTING";
  if (["SPARE_PARTS", "SPAREPARTS", "AUTO_PARTS", "PARTS"].includes(key)) return "SPARE_PARTS";

  return "";
}

function firstCategoryCandidate(...values) {
  for (const value of values) {
    const normalized = normalizeBusinessCategory(value);
    if (normalized) return normalized;
  }

  return "";
}

function registeredBusinessCategory() {
  if (typeof window === "undefined") return "ELECTRONICS";

  const workspace =
    parseJsonSafe(localStorage.getItem("workspaceContext")) ||
    parseJsonSafe(localStorage.getItem("workspace")) ||
    parseJsonSafe(localStorage.getItem("tenant")) ||
    parseJsonSafe(localStorage.getItem("business")) ||
    {};

  const tokenPayload =
    readJwtPayload(localStorage.getItem("tenantToken")) ||
    readJwtPayload(localStorage.getItem("token")) ||
    {};

  return (
    firstCategoryCandidate(
      localStorage.getItem("businessCategory"),
      localStorage.getItem("tenantCategory"),
      localStorage.getItem("storeCategory"),
      workspace?.businessCategory,
      workspace?.category,
      workspace?.tenant?.businessCategory,
      workspace?.tenant?.category,
      workspace?.business?.businessCategory,
      workspace?.business?.category,
      tokenPayload?.businessCategory,
      tokenPayload?.category,
    ) || "ELECTRONICS"
  );
}

function categoryFieldCopy() {
  const category = registeredBusinessCategory();
  return CATEGORY_FIELD_COPY[category] || CATEGORY_FIELD_COPY.ELECTRONICS;
}

function registeredBusinessCategoryKey() {
  return registeredBusinessCategory() || "ELECTRONICS";
}

function activeBranchParts() {
  const branchName = cleanString(localStorage.getItem("activeBranchName"));
  const branchCode = cleanString(localStorage.getItem("activeBranchCode"));
  const branchId = cleanString(getActiveBranchId?.());

  return {
    code: branchCode,
    name: branchName,
    label: [branchCode, branchName].filter(Boolean).join(" ") || (branchId ? "Selected branch" : "No active branch selected"),
  };
}

function activeBranchLabel() {
  return activeBranchParts().label;
}

function supplierPhoneValue(supplier) {
  return cleanString(
    supplier?.phone ||
      supplier?.contactPhone ||
      supplier?.businessPhone ||
      supplier?.ownerPhone ||
      supplier?.primaryPhone ||
      supplier?.mobile ||
      "",
  );
}

function supplierEmailValue(supplier) {
  return cleanString(supplier?.email || supplier?.businessEmail || supplier?.ownerEmail || "");
}

function Field({ label, hint, children, full = false }) {
  return (
    <div className={`svx-transfer-form-field ${full ? "is-full" : ""}`}>
      <label>{label}</label>
      {children}
      {hint ? <p className="svx-transfer-field-hint">{hint}</p> : null}
    </div>
  );
}

function ModeCard({ active, title, text, onClick }) {
  return (
    <button type="button" className={`svx-transfer-mode-card ${active ? "is-active" : ""}`} onClick={onClick}>
      <strong>{title}</strong>
      <span>{text}</span>
    </button>
  );
}

function SearchResult({ active, title, subtitle, onClick }) {
  return (
    <button type="button" className={`svx-transfer-result-card ${active ? "is-active" : ""}`} onClick={onClick}>
      <strong>{title}</strong>
      {subtitle ? <span>{subtitle}</span> : null}
    </button>
  );
}

function StepSection({ number, kicker, title, text, children }) {
  return (
    <section className="svx-transfer-create-section">
      <header className="svx-transfer-create-section-head">
        <span className="svx-transfer-create-step-number">{number}</span>
        <div>
          <span className="svx-transfer-kicker">{kicker}</span>
          <h3>{title}</h3>
          {text ? <p>{text}</p> : null}
        </div>
      </header>
      <div className="svx-transfer-create-section-body">{children}</div>
    </section>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="svx-transfer-create-summary-item">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function ReadyCheck({ ready, text }) {
  return (
    <div className={`svx-transfer-create-check ${ready ? "is-ready" : ""}`}>
      <span aria-hidden="true">{ready ? "✓" : "•"}</span>
      <strong>{text}</strong>
    </div>
  );
}


export default function InterStoreCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [productQuery, setProductQuery] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [supplierProducts, setSupplierProducts] = useState([]);

  const isInternal = form.supplierType === "INTERNAL";
  const activeBranchId = cleanString(getActiveBranchId?.());
  const businessCategory = useMemo(() => registeredBusinessCategoryKey(), []);
  const fieldCopy = useMemo(() => CATEGORY_FIELD_COPY[businessCategory] || CATEGORY_FIELD_COPY.ELECTRONICS, [businessCategory]);

  const summary = useMemo(() => {
    const quantity = Math.max(0, Number(form.quantity || 0));
    const price = Math.max(0, Number(form.agreedPrice || 0));

    return {
      quantity,
      value: quantity * price,
      source: isInternal
        ? cleanString(form.externalSupplierName || supplierQuery) || "Store not selected"
        : cleanString(form.externalSupplierName) || "Person not entered",
      sourcePhone: cleanString(form.externalSupplierPhone),
      item: cleanString(form.productName) || "Item not entered",
      responsible: cleanString(form.resellerName || form.externalSupplierName) || "Follow-up contact not entered",
      phoneReady: normalizeDigits(form.resellerPhone).length >= 7,
      itemReady: Boolean(cleanString(form.productName) && cleanString(form.serial)),
      valueReady: quantity > 0 && price > 0,
      sourceReady: isInternal ? Boolean(form.supplierTenantId) : Boolean(cleanString(form.externalSupplierName)),
    };
  }, [form, isInternal, supplierQuery]);

  useEffect(() => {
    setError("");
  }, []);

  useEffect(() => {
    if (!isInternal) {
      setSuppliers([]);
      setSuppliersLoading(false);
      return;
    }

    if (form.supplierTenantId) {
      setSuppliers([]);
      setSuppliersLoading(false);
      return;
    }

    const searchTerm = cleanString(supplierQuery);
    if (searchTerm.length < STORE_SEARCH_MIN_CHARS) {
      setSuppliers([]);
      setSuppliersLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void loadSuppliers(searchTerm);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [isInternal, supplierQuery, form.supplierTenantId, businessCategory]);

  useEffect(() => {
    const searchTerm = cleanString(productQuery);
    if (searchTerm.length < STORE_SEARCH_MIN_CHARS) {
      setSupplierProducts([]);
      setProductsLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void loadSupplierProducts(null, searchTerm);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [productQuery, businessCategory]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setError("");
    setSupplierQuery("");
    setSuppliers([]);
    setProductQuery("");
    setSupplierProducts([]);
  }

  async function loadSuppliers(search = "") {
    const searchTerm = cleanString(search);
    if (searchTerm.length < STORE_SEARCH_MIN_CHARS) {
      setSuppliers([]);
      setSuppliersLoading(false);
      return;
    }

    try {
      setSuppliersLoading(true);
      const rows = await listInternalSuppliers({
        q: searchTerm,
        take: 12,
        businessCategory,
      });
      setSuppliers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setSuppliers([]);
      toast.error(err?.message || "Failed to load stores");
    } finally {
      setSuppliersLoading(false);
    }
  }

  async function loadSupplierProducts(_unusedSupplierTenantId, search = "") {
    const searchTerm = cleanString(search);
    if (searchTerm.length < STORE_SEARCH_MIN_CHARS) {
      setSupplierProducts([]);
      setProductsLoading(false);
      return;
    }

    try {
      setProductsLoading(true);
      const rows = await searchCurrentBranchProducts({
        q: searchTerm,
        take: 12,
        businessCategory,
      });
      setSupplierProducts(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setSupplierProducts([]);
      toast.error(err?.message || "Failed to load current shop stock");
    } finally {
      setProductsLoading(false);
    }
  }

  function switchSourceType(type) {
    setForm((current) => ({
      ...current,
      supplierType: type,
      supplierTenantId: "",
      externalSupplierName: "",
      externalSupplierPhone: "",
      productId: "",
      productName: "",
      productCategory: "",
      productColor: "",
      serial: "",
      agreedPrice: "",
    }));
    setSupplierQuery("");
    setSuppliers([]);
    setProductQuery("");
    setSupplierProducts([]);
  }

  function chooseSupplier(supplier) {
    const phone = supplierPhoneValue(supplier);
    const name = supplier.name || "";

    setForm((current) => ({
      ...current,
      supplierTenantId: supplier.id || "",
      externalSupplierName: name,
      externalSupplierPhone: phone,
      resellerName: current.resellerName || name,
      resellerPhone: current.resellerPhone || phone,
      resellerStore: current.resellerStore || name,
      resellerWorkplace: current.resellerWorkplace || name,
    }));
    setSupplierQuery(name);
    setSuppliers([]);
  }

  function chooseProduct(product) {
    setForm((current) => ({
      ...current,
      productId: product.id || "",
      productName: product.name || "",
      productCategory: product.category || "",
      serial: product.serial || current.serial,
      agreedPrice: product.suggestedPrice != null ? String(product.suggestedPrice) : current.agreedPrice,
    }));
    setProductQuery(product.name || "");
  }

  function validate() {
    if (!activeBranchId) return "Select an active branch before creating a transfer.";
    if (isInternal && !form.supplierTenantId) return "Choose the store taking the stock.";
    if (!isInternal && !cleanString(form.externalSupplierName)) return "Enter the person or customer taking the stock.";
    if (!cleanString(form.productName)) return "Enter the item being moved.";
    if (!cleanString(form.serial)) return `Enter the ${fieldCopy.codeLabel.toLowerCase()}.`;
    if (Number(form.quantity || 0) <= 0) return "Quantity must be greater than zero.";
    if (Number(form.agreedPrice || 0) <= 0) return "Enter the agreed value so the owner can track money at risk.";
    if (!cleanString(form.resellerName || form.externalSupplierName)) return "Enter who is responsible for paying later.";
    if (normalizeDigits(form.resellerPhone || form.externalSupplierPhone).length < 7) return "Enter a valid phone number for the person or store taking the stock.";
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      supplierTenantId: isInternal ? form.supplierTenantId : null,
      externalSupplierName: isInternal ? cleanString(form.externalSupplierName || supplierQuery) : cleanString(form.externalSupplierName),
      externalSupplierPhone: cleanString(form.externalSupplierPhone),
      productId: cleanString(form.productId) || null,
      productName: cleanString(form.productName),
      productCategory: cleanString(form.productCategory),
      productColor: cleanString(form.productColor),
      serial: cleanString(form.serial),
      quantity: Number(form.quantity || 1),
      agreedPrice: Number(form.agreedPrice || 0),
      dueDate: cleanString(form.dueDate) || null,
      takenAt: cleanString(form.takenAt) || null,
      resellerName: cleanString(form.resellerName || form.externalSupplierName || supplierQuery),
      resellerPhone: cleanString(form.resellerPhone || form.externalSupplierPhone),
      resellerStore: cleanString(form.resellerStore),
      resellerWorkplace: cleanString(form.resellerWorkplace),
      resellerDistrict: cleanString(form.resellerDistrict),
      resellerSector: cleanString(form.resellerSector),
      resellerAddress: cleanString(form.resellerAddress),
      resellerNationalId: cleanString(form.resellerNationalId),
      notes: cleanString(form.notes),
    };

    try {
      setLoading(true);
      setError("");
      const deal = await createDeal(payload);
      toast.success("Store transfer created");
      resetForm();

      if (deal?.id) {
        navigate(`/app/interstore/${deal.id}`);
      } else {
        navigate("/app/interstore");
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to create transfer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="svx-transfer-page svx-transfer-create-page svx-transfer-create-page-simple">
      <form className="svx-transfer-create-shell" onSubmit={handleSubmit}>
        <section className="svx-transfer-create-hero svx-transfer-create-hero-simple">
          <div className="svx-transfer-create-hero-copy">
            <span className="svx-transfer-eyebrow">Pay later stock</span>
            <h1>Products taken on pay later</h1>
            <p>
              Use this when a person or another same-category store takes products from this branch and will pay later.
              Keep the record simple: who took it, what they took, and how much money must come back.
            </p>
          </div>

          <div className="svx-transfer-create-hero-actions is-back-only">
            <button type="button" className="svx-transfer-secondary" onClick={() => navigate("/app/interstore")} disabled={loading}>
              Back to transfers
            </button>
          </div>
        </section>

        {error ? <div className="svx-transfer-error">{error}</div> : null}

        <section className="svx-transfer-create-overview svx-transfer-create-overview-simple" aria-label="Transfer overview">
          <SummaryItem label="From branch" value={activeBranchLabel()} />
          <SummaryItem label="Who took it" value={summary.source} />
          <SummaryItem label="Product" value={summary.item} />
          <SummaryItem label="Amount to collect" value={formatMoney(summary.value)} />
        </section>

        <div className="svx-transfer-create-layout svx-transfer-create-layout-simple">
          <main className="svx-transfer-create-main">
            <StepSection
              number="1"
              kicker="Who took it"
              title="Who took the products?"
              text="Start here. Choose a person/customer or a same-category store that took products and will pay later."
            >
              <div className="svx-transfer-mode-grid svx-transfer-create-mode-grid">
                <ModeCard
                  active={!isInternal}
                  title="Person / customer"
                  text="One person takes products now and pays later."
                  onClick={() => switchSourceType("EXTERNAL")}
                />
                <ModeCard
                  active={isInternal}
                  title="Another store"
                  text="A same-category store takes products from this branch."
                  onClick={() => switchSourceType("INTERNAL")}
                />
              </div>

              {isInternal ? (
                <div className="svx-transfer-form-grid svx-transfer-create-grid">
                  <Field label="Search store" hint={`Only ${fieldCopy.businessLabel} stores are shown. Stores appear after typing at least ${STORE_SEARCH_MIN_CHARS} characters.`} full>
                    <input
                      className="svx-transfer-input"
                      value={supplierQuery}
                      onChange={(event) => {
                        const next = event.target.value;
                        setSupplierQuery(next);
                        setForm((current) => ({
                          ...current,
                          supplierTenantId: "",
                          externalSupplierName: "",
                          externalSupplierPhone: "",
                          resellerName: "",
                          resellerPhone: "",
                          resellerStore: "",
                          resellerWorkplace: "",
                        }));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (cleanString(supplierQuery).length >= STORE_SEARCH_MIN_CHARS && !form.supplierTenantId) {
                            void loadSuppliers(supplierQuery);
                          }
                        }
                      }}
                      placeholder={`Type ${fieldCopy.businessLabel} store name or phone`}
                    />
                  </Field>

                  {form.supplierTenantId ? (
                    <div className="svx-transfer-selected-card is-full">
                      <span>Selected store</span>
                      <strong>{supplierQuery || form.externalSupplierName}</strong>
                      <em>{form.externalSupplierPhone || "No phone saved for this store"}</em>
                      <button
                        type="button"
                        className="svx-transfer-inline-link"
                        onClick={() => {
                          setSupplierQuery("");
                          setForm((current) => ({
                            ...current,
                            supplierTenantId: "",
                            externalSupplierName: "",
                            externalSupplierPhone: "",
                            resellerName: "",
                            resellerPhone: "",
                            resellerStore: "",
                            resellerWorkplace: "",
                          }));
                        }}
                      >
                        Change store
                      </button>
                    </div>
                  ) : null}

                  {!form.supplierTenantId && cleanString(supplierQuery).length > 0 && cleanString(supplierQuery).length < STORE_SEARCH_MIN_CHARS ? (
                    <div className="svx-transfer-search-state is-full">Type at least {STORE_SEARCH_MIN_CHARS} characters to search stores.</div>
                  ) : null}
                  {!form.supplierTenantId && suppliersLoading ? (
                    <div className="svx-transfer-search-state is-full">Searching stores...</div>
                  ) : null}
                  {!form.supplierTenantId && !suppliersLoading && cleanString(supplierQuery).length >= STORE_SEARCH_MIN_CHARS && !suppliers.length ? (
                    <div className="svx-transfer-search-state is-full">No matching {fieldCopy.businessLabel} stores found.</div>
                  ) : null}
                  {!form.supplierTenantId && suppliers.length ? (
                    <div className="svx-transfer-search-results is-full">
                      {suppliers.map((supplier) => (
                        <SearchResult
                          key={supplier.id}
                          active={form.supplierTenantId === supplier.id}
                          title={supplier.name || "Unnamed store"}
                          subtitle={[supplierPhoneValue(supplier), supplierEmailValue(supplier)].filter(Boolean).join("  ")}
                          onClick={() => chooseSupplier(supplier)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="svx-transfer-form-grid svx-transfer-create-grid">
                  <Field label="Person / customer name">
                    <input
                      className="svx-transfer-input"
                      value={form.externalSupplierName}
                      onChange={(event) => {
                        const next = event.target.value;
                        updateField("externalSupplierName", next);
                        updateField("resellerName", next);
                      }}
                      placeholder="Example: Eric, Jean, Remera customer"
                    />
                  </Field>
                  <Field label="Phone number" hint="Required. This is who the owner will call if payment is late.">
                    <input
                      className="svx-transfer-input"
                      value={form.externalSupplierPhone}
                      onChange={(event) => {
                        const next = event.target.value;
                        updateField("externalSupplierPhone", next);
                        updateField("resellerPhone", next);
                      }}
                      placeholder="+250..."
                    />
                  </Field>
                </div>
              )}
            </StepSection>

            <StepSection
              number="2"
              kicker="Products"
              title="What did they take?"
              text={`Search this branch's ${fieldCopy.businessLabel} stock first, then confirm the quantity and tracking code.`}
            >
              <div className="svx-transfer-form-grid svx-transfer-create-grid">
                <Field label="Search product from this branch" hint={`Search current ${fieldCopy.businessLabel} stock only. Type at least ${STORE_SEARCH_MIN_CHARS} characters.`} full>
                  <input
                    className="svx-transfer-input"
                    value={productQuery}
                    onChange={(event) => setProductQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void loadSupplierProducts(null, productQuery);
                      }
                    }}
                    placeholder={`Type product name, serial, SKU, or barcode`}
                  />
                </Field>
                {productsLoading ? (
                  <div className="svx-transfer-search-state is-full">Searching this branch stock...</div>
                ) : null}
                {!productsLoading && cleanString(productQuery).length >= STORE_SEARCH_MIN_CHARS && !supplierProducts.length ? (
                  <div className="svx-transfer-search-state is-full">No matching {fieldCopy.businessLabel} stock found in this branch.</div>
                ) : null}
                {supplierProducts.length ? (
                  <div className="svx-transfer-search-results is-full">
                    {supplierProducts.map((product) => (
                      <SearchResult
                        key={product.id}
                        active={form.productId === product.id}
                        title={product.name || "Unnamed item"}
                        subtitle={[product.serial || product.sku || product.barcode, `Stock: ${product.stockQty ?? 0}`, product.branch?.name].filter(Boolean).join("  ")}
                        onClick={() => chooseProduct(product)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="svx-transfer-form-grid svx-transfer-create-grid svx-transfer-create-product-grid">
                <Field label="Product name">
                  <input className="svx-transfer-input" value={form.productName} onChange={(event) => updateField("productName", event.target.value)} placeholder="Example: HP Pavilion 15 Laptop" />
                </Field>
                <Field label="Quantity">
                  <input className="svx-transfer-input" type="number" min="1" value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} />
                </Field>
                <Field label={fieldCopy.codeLabel} hint={fieldCopy.codeHint}>
                  <input className="svx-transfer-input" value={form.serial} onChange={(event) => updateField("serial", event.target.value)} placeholder={fieldCopy.codePlaceholder} />
                </Field>
                <Field label={fieldCopy.itemTypeLabel} hint={fieldCopy.itemTypeHint}>
                  <input className="svx-transfer-input" value={form.productCategory} onChange={(event) => updateField("productCategory", event.target.value)} placeholder={fieldCopy.itemTypePlaceholder} />
                </Field>
                <Field label={fieldCopy.variantLabel} full>
                  <input className="svx-transfer-input" value={form.productColor} onChange={(event) => updateField("productColor", event.target.value)} placeholder={fieldCopy.variantPlaceholder} />
                </Field>
              </div>
            </StepSection>

            <StepSection
              number="3"
              kicker="Payment"
              title="How much should come back?"
              text="Add the amount to collect, due date, and a short note. Supplier purchasing will be handled separately later."
            >
              <div className="svx-transfer-branch-callout">
                <span>Products leave this branch</span>
                <strong>{activeBranchLabel()}</strong>
                <p>Change the active branch before creating this transfer if this branch is wrong.</p>
              </div>

              <div className="svx-transfer-create-pay-strip">
                <SummaryItem label="Follow up" value={summary.responsible} />
                <SummaryItem label="Phone" value={form.resellerPhone || form.externalSupplierPhone} />
                <SummaryItem label="Item" value={summary.item} />
              </div>

              <div className="svx-transfer-form-grid svx-transfer-create-grid">
                <Field label="Amount to collect" hint="This is the money the owner should keep watching until paid or returned.">
                  <input className="svx-transfer-input" type="number" min="0" value={form.agreedPrice} onChange={(event) => updateField("agreedPrice", event.target.value)} placeholder="0" />
                </Field>
                <Field label="Due date">
                  <input className="svx-transfer-input" type="date" value={form.dueDate} onChange={(event) => updateField("dueDate", event.target.value)} />
                </Field>
                <Field label="Place / counter" hint="Optional. Use this for a branch counter, store area, or outside workplace.">
                  <input
                    className="svx-transfer-input"
                    value={form.resellerStore || form.resellerWorkplace}
                    onChange={(event) => {
                      updateField("resellerStore", event.target.value);
                      updateField("resellerWorkplace", event.target.value);
                    }}
                    placeholder="Example: Main counter, repair desk, Remera shop"
                  />
                </Field>
                <Field label="Taken date">
                  <input className="svx-transfer-input" type="date" value={form.takenAt} onChange={(event) => updateField("takenAt", event.target.value)} />
                </Field>
                <Field label="Owner note" hint="Keep it short. Example: promised to pay Friday after delivery." full>
                  <textarea className="svx-transfer-textarea" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Optional note" />
                </Field>
              </div>
            </StepSection>
          </main>

          <aside className="svx-transfer-create-side" aria-label="Ready to save">
            <div className="svx-transfer-create-side-card svx-transfer-create-side-card-simple">
              <span className="svx-transfer-kicker">Ready check</span>
              <h2>Ready to save?</h2>
              <p>Save only when these four things are clear.</p>

              <div className="svx-transfer-create-checks">
                <ReadyCheck ready={summary.sourceReady} text="Who took it" />
                <ReadyCheck ready={summary.itemReady} text="What they took" />
                <ReadyCheck ready={summary.valueReady} text="Amount to collect" />
                <ReadyCheck ready={Boolean(cleanString(form.resellerName || form.externalSupplierName)) && summary.phoneReady} text="Phone for follow-up" />
              </div>

              <div className="svx-transfer-create-side-summary svx-transfer-create-side-summary-simple">
                <SummaryItem label="Taker" value={summary.source} />
                {summary.sourcePhone ? <SummaryItem label="Phone" value={summary.sourcePhone} /> : null}
                <SummaryItem label="Product" value={summary.item} />
                <SummaryItem label="Amount" value={formatMoney(summary.value)} />
              </div>

              <button type="submit" className="svx-transfer-primary" disabled={loading}>
                {loading ? "Saving..." : "Save transfer"}
              </button>
            </div>
          </aside>
        </div>

        <footer className="svx-transfer-create-footer">
          <button type="button" className="svx-transfer-secondary" onClick={() => navigate("/app/interstore")} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="svx-transfer-primary" disabled={loading}>
            {loading ? "Saving..." : "Save transfer"}
          </button>
        </footer>
      </form>
    </div>
  );
}
