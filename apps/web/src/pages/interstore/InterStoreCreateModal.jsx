// frontend-stores/src/pages/interstore/InterStoreCreateModal.jsx
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  createDeal,
  listInternalSuppliers,
  searchInternalSupplierProducts,
} from "../../services/interStoreApi";
import { getActiveBranchId } from "../../services/apiClient";

const EMPTY_FORM = {
  supplierType: "EXTERNAL",
  supplierTenantId: "",
  externalSupplierName: "",
  externalSupplierPhone: "",

  resellerName: "",
  resellerPhone: "",
  resellerStore: "",
  resellerWorkplace: "",
  resellerDistrict: "",
  resellerSector: "",
  resellerAddress: "",
  resellerNationalId: "",

  productId: "",
  productName: "",
  productCategory: "",
  productColor: "",
  serial: "",
  quantity: "1",
  agreedPrice: "",
  dueDate: "",
  takenAt: "",
  notes: "",
};

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function strongText() {
  return "text-[var(--color-text)]";
}

function mutedText() {
  return "text-[var(--color-text-muted)]";
}

function softText() {
  return "text-[var(--color-text-muted)]";
}

function pageCard() {
  return "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "app-input";
}

function textareaClass() {
  return "w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)] disabled:cursor-not-allowed disabled:opacity-60";
}

function primaryBtn() {
  return "inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 py-2.5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function badgeClass(tone = "neutral") {
  if (tone === "primary") {
    return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
  }

  if (tone === "success") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (tone === "warning") {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
  }

  if (tone === "danger") {
    return "bg-red-500/10 text-red-600 dark:text-red-300";
  }

  if (tone === "info") {
    return "bg-sky-500/10 text-sky-600 dark:text-sky-300";
  }

  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black",
        badgeClass(tone),
        className
      )}
    >
      {children}
    </span>
  );
}

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

function activeBranchLabel() {
  const branchName = cleanString(localStorage.getItem("activeBranchName"));
  const branchCode = cleanString(localStorage.getItem("activeBranchCode"));
  const branchId = cleanString(getActiveBranchId?.());

  if (branchCode && branchName) return `${branchCode} • ${branchName}`;
  if (branchName) return branchName;
  if (branchCode) return branchCode;
  if (branchId) return "Selected branch";

  return "No active branch selected";
}

function ModeCard({ active, title, text, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cx(
        "rounded-[22px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-[var(--shadow-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-card)] hover:-translate-y-0.5 hover:border-[var(--color-primary)]"
      )}
    >
      <div className={cx("text-sm font-black", strongText())}>{title}</div>
      <div className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>{text}</div>
    </button>
  );
}

function SectionHeading({ eyebrow, title, text }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h2 className={cx("mt-3 text-[1.45rem] font-black tracking-[-0.04em]", strongText())}>
        {title}
      </h2>

      {text ? (
        <p className={cx("mt-2 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
          {text}
        </p>
      ) : null}
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div className="min-w-0">
      <label className={cx("text-sm font-black", strongText())}>{label}</label>
      <div className="mt-2">{children}</div>
      {hint ? <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{hint}</div> : null}
    </div>
  );
}

function SummaryStat({ label, value, note, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-300"
        : tone === "danger"
          ? "text-[var(--color-danger)]"
          : strongText();

  return (
    <div className={cx(softPanel(), "min-w-0 p-4")}>
      <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
        {label}
      </div>

      <div className={cx("mt-2 break-words text-xl font-black tracking-[-0.04em]", toneClass)}>
        {value}
      </div>

      {note ? (
        <div className={cx("mt-2 break-words text-xs font-semibold leading-5", mutedText())}>
          {note}
        </div>
      ) : null}
    </div>
  );
}

function SearchResultCard({ active, title, subtitle, meta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full rounded-[22px] border p-4 text-left transition",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-[var(--shadow-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cx("break-words text-sm font-black", strongText())}>{title}</div>

          {subtitle ? (
            <div className={cx("mt-1 break-words text-xs font-semibold leading-5", mutedText())}>
              {subtitle}
            </div>
          ) : null}

          {meta ? (
            <div className={cx("mt-2 break-words text-xs font-semibold leading-5", softText())}>
              {meta}
            </div>
          ) : null}
        </div>

        {active ? <Badge tone="success">Selected</Badge> : null}
      </div>
    </button>
  );
}

function FieldError({ children }) {
  if (!children) return null;

  return (
    <div className="rounded-[22px] bg-red-500/10 px-4 py-3 text-sm font-bold leading-6 text-red-600 dark:text-red-300">
      {children}
    </div>
  );
}

export default function InterStoreCreateModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [supplierQuery, setSupplierQuery] = useState("");
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  const [productQuery, setProductQuery] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [supplierProducts, setSupplierProducts] = useState([]);

  const activeBranchId = cleanString(getActiveBranchId?.());

  const isExternalSupplier = useMemo(() => form.supplierType === "EXTERNAL", [form.supplierType]);
  const isInternalSupplier = useMemo(() => form.supplierType === "INTERNAL", [form.supplierType]);

  const supplierModeLabel = isExternalSupplier ? "External supplier" : "Internal store";
  const quantity = Number(form.quantity || 0);
  const agreedPrice = Number(form.agreedPrice || 0);
  const dueDateSet = Boolean(cleanString(form.dueDate));

  const quantityStatus =
    quantity <= 0 ? "Invalid" : quantity === 1 ? "Single serialized unit" : "Multiple units";

  async function loadSuppliers(search = "") {
    try {
      setSuppliersLoading(true);

      const rows = await listInternalSuppliers({
        q: cleanString(search) || undefined,
        take: 12,
      });

      setSuppliers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setSuppliers([]);
      toast.error(err?.message || "Failed to load suppliers");
    } finally {
      setSuppliersLoading(false);
    }
  }

  async function loadSupplierProducts(supplierTenantId, search = "") {
    if (!supplierTenantId) {
      setSupplierProducts([]);
      return;
    }

    try {
      setProductsLoading(true);

      const rows = await searchInternalSupplierProducts(supplierTenantId, {
        q: cleanString(search) || undefined,
        take: 12,
      });

      setSupplierProducts(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setSupplierProducts([]);
      toast.error(err?.message || "Failed to load supplier products");
    } finally {
      setProductsLoading(false);
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setError("");
    setSupplierQuery("");
    setSuppliers([]);
    setProductQuery("");
    setSupplierProducts([]);
  }

  function closeModal() {
    if (loading) return;

    resetForm();
    onClose?.();
  }

  function switchSupplierType(nextType) {
    setForm((prev) => ({
      ...prev,
      supplierType: nextType,
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
    setForm((prev) => ({
      ...prev,
      supplierTenantId: supplier.id,
      externalSupplierName: "",
      externalSupplierPhone: "",
      productId: "",
      productName: "",
      productCategory: "",
      productColor: "",
      serial: "",
      agreedPrice: "",
    }));

    setSupplierQuery(supplier.name || "");
    setSupplierProducts([]);
    setProductQuery("");

    void loadSupplierProducts(supplier.id, "");
  }

  function chooseSupplierProduct(product) {
    setForm((prev) => ({
      ...prev,
      productId: product.id || "",
      productName: product.name || "",
      productCategory: product.category || "",
      serial: product.serial || "",
      agreedPrice: product.suggestedPrice != null ? String(product.suggestedPrice) : prev.agreedPrice,
    }));

    setProductQuery(product.name || "");
  }

  function validatePayload(payload) {
    if (!activeBranchId) {
      return "Select an active branch before creating an inter-store deal.";
    }

    if (!payload.resellerName) {
      return "Reseller name is required.";
    }

    if (!payload.resellerPhone) {
      return "Reseller phone is required.";
    }

    if (isExternalSupplier && !payload.externalSupplierName) {
      return "External supplier name is required.";
    }

    if (isInternalSupplier && !payload.supplierTenantId) {
      return "Select the internal supplier store.";
    }

    if (!payload.productName) {
      return "Product name is required.";
    }

    if (!payload.serial) {
      return "Serial number is required.";
    }

    if (!Number.isFinite(payload.agreedPrice) || payload.agreedPrice <= 0) {
      return "Agreed price must be more than 0.";
    }

    if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
      return "Quantity must be more than 0.";
    }

    if (payload.quantity !== 1) {
      return "This flow currently supports one serialized item per deal.";
    }

    return "";
  }

  async function submit(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        supplierTenantId:
          form.supplierType === "INTERNAL" ? cleanString(form.supplierTenantId) || null : null,
        externalSupplierName:
          form.supplierType === "EXTERNAL" ? cleanString(form.externalSupplierName) || null : null,
        externalSupplierPhone:
          form.supplierType === "EXTERNAL" ? cleanString(form.externalSupplierPhone) || null : null,

        resellerName: cleanString(form.resellerName),
        resellerPhone: cleanString(form.resellerPhone),
        resellerStore: cleanString(form.resellerStore) || null,
        resellerWorkplace: cleanString(form.resellerWorkplace) || null,
        resellerDistrict: cleanString(form.resellerDistrict) || null,
        resellerSector: cleanString(form.resellerSector) || null,
        resellerAddress: cleanString(form.resellerAddress) || null,
        resellerNationalId: cleanString(form.resellerNationalId) || null,

        productId: cleanString(form.productId) || null,
        productName: cleanString(form.productName),
        productCategory: cleanString(form.productCategory) || null,
        productColor: cleanString(form.productColor) || null,
        serial: cleanString(form.serial),
        quantity: Number(form.quantity || 1),
        agreedPrice: Number(form.agreedPrice),
        dueDate: cleanString(form.dueDate) || null,
        takenAt: cleanString(form.takenAt) || null,
        notes: cleanString(form.notes) || null,
      };

      const validationError = validatePayload(payload);

      if (validationError) {
        setError(validationError);
        toast.error(validationError);
        return;
      }

      await createDeal(payload);

      toast.success("Deal created");

      resetForm();
      onSaved?.();
      onClose?.();
    } catch (err) {
      const msg = err?.message || "Failed to create deal";

      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
        onClick={loading ? undefined : closeModal}
      />

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden p-3 sm:p-5">
        <div className="mx-auto flex min-h-full w-full max-w-7xl items-center justify-center">
          <form onSubmit={submit} className={cx(pageCard(), "w-full min-w-0 overflow-hidden")}>
            <div className="border-b border-[var(--color-border)] px-4 py-5 sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <SectionHeading
                    eyebrow="Inter-store"
                    title="Create new deal"
                    text="Record the supplier, reseller, serialized product, agreed price, active branch, and timing in one disciplined operational flow."
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={closeModal} disabled={loading} className={secondaryBtn()}>
                    Close
                  </button>

                  <button type="submit" disabled={loading || !activeBranchId} className={primaryBtn()}>
                    {loading ? "Creating..." : "Create deal"}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6 px-4 py-6 sm:px-6">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <SummaryStat
                  label="Active branch"
                  value={activeBranchLabel()}
                  note={activeBranchId ? "Deal will be linked to this branch" : "Branch is required"}
                  tone={activeBranchId ? "success" : "danger"}
                />

                <SummaryStat
                  label="Supplier mode"
                  value={supplierModeLabel}
                  note="Choose external trader or internal store"
                />

                <SummaryStat
                  label="Quantity"
                  value={quantity || 0}
                  note={quantityStatus}
                  tone={quantity > 0 && quantity === 1 ? "success" : quantity > 1 ? "warning" : "danger"}
                />

                <SummaryStat
                  label="Agreed price"
                  value={agreedPrice > 0 ? formatMoney(agreedPrice) : "RWF 0"}
                  note="Supplier settlement amount"
                  tone={agreedPrice > 0 ? "warning" : "neutral"}
                />

                <SummaryStat
                  label="Due date"
                  value={dueDateSet ? "Scheduled" : "Open"}
                  note={dueDateSet ? form.dueDate : "No due date set yet"}
                  tone={dueDateSet ? "success" : "neutral"}
                />
              </section>

              {!activeBranchId ? (
                <FieldError>
                  No active branch is selected. Choose a branch in the workspace header before creating
                  an inter-store deal.
                </FieldError>
              ) : null}

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-5">
                  <section className={cx(pageCard(), "p-5 sm:p-6")}>
                    <SectionHeading
                      eyebrow="Supplier"
                      title="Supplier source"
                      text="Choose where the item is coming from before attaching the reseller and product."
                    />

                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                      <ModeCard
                        active={form.supplierType === "EXTERNAL"}
                        title="External supplier"
                        text="Use this for outside traders, outside shops, and direct suppliers."
                        onClick={() => switchSupplierType("EXTERNAL")}
                        disabled={loading}
                      />

                      <ModeCard
                        active={form.supplierType === "INTERNAL"}
                        title="Internal store"
                        text="Use this when the product is borrowed from another store inside your network."
                        onClick={() => {
                          switchSupplierType("INTERNAL");
                          void loadSuppliers("");
                        }}
                        disabled={loading}
                      />
                    </div>

                    {isExternalSupplier ? (
                      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Supplier name" hint="Store name, trader name, or company name.">
                          <input
                            className={inputClass()}
                            value={form.externalSupplierName}
                            onChange={(e) => updateField("externalSupplierName", e.target.value)}
                            placeholder="Example: Kigali Tech Supply"
                            disabled={loading}
                          />
                        </FormField>

                        <FormField label="Supplier phone" hint="Optional but useful for follow-up.">
                          <input
                            className={inputClass()}
                            value={form.externalSupplierPhone}
                            onChange={(e) => updateField("externalSupplierPhone", e.target.value)}
                            placeholder="Optional"
                            disabled={loading}
                          />
                        </FormField>
                      </div>
                    ) : null}

                    {isInternalSupplier ? (
                      <div className="mt-6 space-y-4">
                        <FormField label="Search internal supplier store" hint="Search by store name, email, or phone.">
                          <input
                            className={inputClass()}
                            value={supplierQuery}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSupplierQuery(value);
                              void loadSuppliers(value);
                            }}
                            placeholder="Search internal store..."
                            disabled={loading}
                          />
                        </FormField>

                        {suppliersLoading ? (
                          <div className="grid gap-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className={cx(softPanel(), "h-20 animate-pulse")} />
                            ))}
                          </div>
                        ) : suppliers.length > 0 ? (
                          <div className="grid gap-3">
                            {suppliers.map((supplier) => (
                              <SearchResultCard
                                key={supplier.id}
                                active={form.supplierTenantId === supplier.id}
                                title={supplier.name || "Unnamed store"}
                                subtitle={supplier.phone || supplier.email || "No contact info"}
                                meta={supplier.email && supplier.phone ? `${supplier.phone} • ${supplier.email}` : ""}
                                onClick={() => chooseSupplier(supplier)}
                              />
                            ))}
                          </div>
                        ) : supplierQuery.trim() ? (
                          <div
                            className={cx(
                              "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-4 text-sm font-semibold",
                              mutedText()
                            )}
                          >
                            No matching internal stores found.
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </section>

                  <section className={cx(pageCard(), "p-5 sm:p-6")}>
                    <SectionHeading
                      eyebrow="Reseller"
                      title="Reseller details"
                      text="Capture who is taking the item and how you will reach them later."
                    />

                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField label="Reseller name" hint="Required for every deal.">
                        <input
                          className={inputClass()}
                          value={form.resellerName}
                          onChange={(e) => updateField("resellerName", e.target.value)}
                          placeholder="Example: Jean Luc"
                          disabled={loading}
                        />
                      </FormField>

                      <FormField label="Reseller phone" hint="Required for follow-up and collection.">
                        <input
                          className={inputClass()}
                          value={form.resellerPhone}
                          onChange={(e) => updateField("resellerPhone", e.target.value)}
                          placeholder="Example: 078..."
                          disabled={loading}
                        />
                      </FormField>

                      <FormField label="Store name" hint="Optional reseller business name.">
                        <input
                          className={inputClass()}
                          value={form.resellerStore}
                          onChange={(e) => updateField("resellerStore", e.target.value)}
                          placeholder="Optional"
                          disabled={loading}
                        />
                      </FormField>

                      <FormField label="Workplace" hint="Optional workplace or location note.">
                        <input
                          className={inputClass()}
                          value={form.resellerWorkplace}
                          onChange={(e) => updateField("resellerWorkplace", e.target.value)}
                          placeholder="Optional"
                          disabled={loading}
                        />
                      </FormField>

                      <FormField label="District" hint="Optional administrative location.">
                        <input
                          className={inputClass()}
                          value={form.resellerDistrict}
                          onChange={(e) => updateField("resellerDistrict", e.target.value)}
                          placeholder="Optional"
                          disabled={loading}
                        />
                      </FormField>

                      <FormField label="Sector" hint="Optional administrative location.">
                        <input
                          className={inputClass()}
                          value={form.resellerSector}
                          onChange={(e) => updateField("resellerSector", e.target.value)}
                          placeholder="Optional"
                          disabled={loading}
                        />
                      </FormField>

                      <div className="md:col-span-2">
                        <FormField label="Address" hint="Optional full address or descriptive location.">
                          <input
                            className={inputClass()}
                            value={form.resellerAddress}
                            onChange={(e) => updateField("resellerAddress", e.target.value)}
                            placeholder="Optional"
                            disabled={loading}
                          />
                        </FormField>
                      </div>

                      <div className="md:col-span-2">
                        <FormField label="National ID" hint="Optional extra identity reference.">
                          <input
                            className={inputClass()}
                            value={form.resellerNationalId}
                            onChange={(e) => updateField("resellerNationalId", e.target.value)}
                            placeholder="Optional"
                            disabled={loading}
                          />
                        </FormField>
                      </div>
                    </div>
                  </section>

                  <section className={cx(pageCard(), "p-5 sm:p-6")}>
                    <SectionHeading
                      eyebrow="Product"
                      title="Product and terms"
                      text="Attach the serialized product and define the financial and timing rules of the deal."
                    />

                    {isInternalSupplier && form.supplierTenantId ? (
                      <div className="mt-6 space-y-4">
                        <FormField label="Search supplier products" hint="Use internal stock search to pick the exact product fast.">
                          <input
                            className={inputClass()}
                            value={productQuery}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProductQuery(value);
                              void loadSupplierProducts(form.supplierTenantId, value);
                            }}
                            placeholder="Search supplier products..."
                            disabled={loading}
                          />
                        </FormField>

                        {productsLoading ? (
                          <div className="grid gap-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className={cx(softPanel(), "h-20 animate-pulse")} />
                            ))}
                          </div>
                        ) : supplierProducts.length > 0 ? (
                          <div className="grid gap-3">
                            {supplierProducts.map((product) => (
                              <SearchResultCard
                                key={product.id}
                                active={form.productId === product.id}
                                title={product.name || "Unnamed product"}
                                subtitle={product.serial || product.category || "No extra details"}
                                meta={`Stock ${Number(product.stockQty || 0)} • Suggested ${formatMoney(
                                  product.suggestedPrice
                                )}`}
                                onClick={() => chooseSupplierProduct(product)}
                              />
                            ))}
                          </div>
                        ) : productQuery.trim() ? (
                          <div
                            className={cx(
                              "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-4 text-sm font-semibold",
                              mutedText()
                            )}
                          >
                            No supplier products found for this search.
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-6 grid grid-cols-1 gap-4">
                      <FormField label="Product name" hint="Use the exact product identity staff should recognize.">
                        <input
                          className={inputClass()}
                          value={form.productName}
                          onChange={(e) => updateField("productName", e.target.value)}
                          placeholder="Example: Samsung Galaxy A15 128GB"
                          disabled={loading}
                        />
                      </FormField>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Category" hint="Optional category for clarity.">
                          <input
                            className={inputClass()}
                            value={form.productCategory}
                            onChange={(e) => updateField("productCategory", e.target.value)}
                            placeholder="Phone, Laptop, TV..."
                            disabled={loading}
                          />
                        </FormField>

                        <FormField label="Color" hint="Optional visual product detail.">
                          <input
                            className={inputClass()}
                            value={form.productColor}
                            onChange={(e) => updateField("productColor", e.target.value)}
                            placeholder="Optional"
                            disabled={loading}
                          />
                        </FormField>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Serial number" hint="Required. Use the exact device serial / IMEI.">
                          <input
                            className={inputClass()}
                            value={form.serial}
                            onChange={(e) => updateField("serial", e.target.value)}
                            placeholder="Required"
                            disabled={loading}
                          />
                        </FormField>

                        <FormField label="Quantity" hint="Serialized flow currently supports one item per deal.">
                          <input
                            type="number"
                            min="1"
                            className={inputClass()}
                            value={form.quantity}
                            onChange={(e) => updateField("quantity", normalizeDigits(e.target.value))}
                            disabled={loading}
                          />
                        </FormField>
                      </div>

                      <FormField label="Agreed price" hint="Amount owed to supplier when this deal is settled.">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={inputClass()}
                          value={form.agreedPrice}
                          onChange={(e) => updateField("agreedPrice", e.target.value)}
                          placeholder="0"
                          disabled={loading}
                        />
                      </FormField>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Due date" hint="Optional supplier payment deadline.">
                          <input
                            type="date"
                            className={inputClass()}
                            value={form.dueDate}
                            onChange={(e) => updateField("dueDate", e.target.value)}
                            disabled={loading}
                          />
                        </FormField>

                        <FormField label="Taken at" hint="Optional handover date and time.">
                          <input
                            type="datetime-local"
                            className={inputClass()}
                            value={form.takenAt}
                            onChange={(e) => updateField("takenAt", e.target.value)}
                            disabled={loading}
                          />
                        </FormField>
                      </div>

                      <FormField label="Notes" hint="Anything that should still make sense later without follow-up questions.">
                        <textarea
                          className={cx(textareaClass(), "min-h-[110px]")}
                          value={form.notes}
                          onChange={(e) => updateField("notes", e.target.value)}
                          placeholder="Optional"
                          disabled={loading}
                        />
                      </FormField>
                    </div>
                  </section>

                  <FieldError>{error}</FieldError>

                  <section className={cx(pageCard(), "p-5 sm:p-6")}>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button type="button" onClick={closeModal} disabled={loading} className={secondaryBtn()}>
                        Cancel
                      </button>

                      <button type="submit" disabled={loading || !activeBranchId} className={primaryBtn()}>
                        {loading ? "Creating..." : "Create deal"}
                      </button>
                    </div>
                  </section>
                </div>

                <aside className="min-w-0 space-y-5">
                  <section className={cx(pageCard(), "p-5 sm:p-6")}>
                    <SectionHeading
                      eyebrow="Preview"
                      title="Live deal snapshot"
                      text="A clean owner-level read of what will be saved if you submit now."
                    />

                    <div className="mt-6 space-y-4">
                      <div className={cx(softPanel(), "p-5")}>
                        <div className={cx("break-words text-lg font-black", strongText())}>
                          {form.productName || "Unnamed product"}
                        </div>

                        <div className={cx("mt-1 break-words text-sm font-semibold", mutedText())}>
                          {isExternalSupplier
                            ? form.externalSupplierName || "No external supplier selected"
                            : supplierQuery || "No internal store selected"}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge tone="primary">{supplierModeLabel}</Badge>
                          <Badge tone={activeBranchId ? "success" : "danger"}>
                            {activeBranchId ? "Branch selected" : "No branch"}
                          </Badge>
                          <Badge tone={form.serial ? "success" : "warning"}>
                            {form.serial || "No serial"}
                          </Badge>
                          <Badge tone={agreedPrice > 0 ? "success" : "warning"}>
                            {agreedPrice > 0 ? "Price set" : "Price missing"}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <SummaryStat
                          label="Branch"
                          value={activeBranchLabel()}
                          note="Saved as borrower branch"
                          tone={activeBranchId ? "success" : "danger"}
                        />

                        <SummaryStat
                          label="Reseller"
                          value={form.resellerName || "Not set"}
                          note={form.resellerPhone || "Phone missing"}
                        />

                        <SummaryStat
                          label="Product serial"
                          value={form.serial || "Missing"}
                          tone={form.serial ? "success" : "warning"}
                        />

                        <SummaryStat
                          label="Agreed price"
                          value={agreedPrice > 0 ? formatMoney(agreedPrice) : "Missing"}
                          tone={agreedPrice > 0 ? "warning" : "danger"}
                        />

                        <SummaryStat
                          label="Due date"
                          value={form.dueDate || "Open"}
                          note={form.takenAt || "Taken time not set"}
                          tone={form.dueDate ? "success" : "neutral"}
                        />
                      </div>
                    </div>
                  </section>

                  <section className={cx(pageCard(), "p-5 sm:p-6")}>
                    <SectionHeading
                      eyebrow="Control"
                      title="Operational discipline"
                      text="These rules keep inter-store tracking clean from day one."
                    />

                    <div className="mt-5 space-y-3">
                      {[
                        "Create each inter-store deal from the correct active branch.",
                        "Use the exact serial number of the item. No shortcuts.",
                        "Keep reseller phone accurate for follow-up and collection.",
                        "Use due date when supplier payment has a timeline.",
                        "For internal supplier flow, select the real store and real product first.",
                        "Every next movement should happen through the detail screen.",
                      ].map((item) => (
                        <div
                          key={item}
                          className={cx(softPanel(), "px-4 py-3 text-sm font-semibold leading-6", mutedText())}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}