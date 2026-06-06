import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { createProduct } from "../../services/inventoryApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

const CATEGORY_OPTIONS = [
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
];

const ACCESSORY_SUBCATEGORY_OPTIONS = [
  "Charger",
  "Headphones/Earbuds",
  "Phone cover",
  "Screen protector",
  "Adapter/Dongle",
  "Cable",
  "Power bank",
  "SSD/HDD",
  "RAM",
  "Keyboard/Mouse",
  "Laptop bag",
  "Battery",
  "Remote",
  "Tripod",
  "Microphone",
  "Webcam",
  "Other",
];

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function formatRwf(value) {
  const n = Number(value || 0);

  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatNumber(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-RW").format(Number.isFinite(n) ? n : 0);
}

function activeBranchNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "this branch";
}

function normalizeCategory(value) {
  const raw = cleanString(value);
  const low = raw.toLowerCase();

  if (low === "accessory" || low === "accessories") return "Accessories";
  if (low === "phone" || low === "phones") return "Phones";
  if (low === "laptop" || low === "laptops") return "Laptops";
  if (low === "tablet" || low === "tablets") return "Tablets";
  if (low === "desktop" || low === "desktop computers") return "Desktop Computers";
  if (low === "monitor" || low === "monitors") return "Monitors";
  if (low === "printer" || low === "printers") return "Printers";
  if (low === "network" || low === "networking") return "Networking";
  if (low === "tv" || low === "tv & audio") return "TV & Audio";
  if (low === "gaming") return "Gaming";
  if (low === "camera" || low === "cameras") return "Cameras";
  if (low === "storage") return "Storage";
  if (low === "smart devices" || low === "smart device") return "Smart Devices";
  if (low === "component" || low === "components") return "Components";
  if (low === "other") return "Other";

  return CATEGORY_OPTIONS.includes(raw) ? raw : "";
}

function parseMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function parseStock(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.floor(n);
}

function pageCard() {
  return "rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[24px] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)] disabled:cursor-not-allowed disabled:opacity-60";
}

function buttonBase() {
  return "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryButton() {
  return cx(
    buttonBase(),
    "bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function primaryButton() {
  return cx(
    buttonBase(),
    "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProductIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" />
      <path d="M3 11v8l9 5 9-5v-8" />
      <path d="M12 13v8" />
    </svg>
  );
}

function StatusPill({ tone = "neutral", children }) {
  const classes =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-600"
        : tone === "danger"
          ? "bg-red-500/10 text-red-600"
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

function Field({ label, hint, children, required = false, className = "" }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>

      {children}

      {hint ? (
        <span className="mt-2 block text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function MetricCard({ label, value, note, tone = "neutral" }) {
  const dot =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-red-500"
          : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-5")}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[rgba(74,163,255,0.08)] blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <span className={cx("h-2.5 w-2.5 rounded-full", dot)} />
        </div>

        <p className="mt-3 truncate text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
          {value}
        </p>

        {note ? (
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
            {note}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function ChoiceCard({ active, title, text, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "rounded-[24px] p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]",
      )}
    >
      <span className="block text-sm font-black">{title}</span>
      <span className={cx("mt-2 block text-xs font-semibold leading-5", active ? "text-white/80" : "text-[var(--color-text-muted)]")}>
        {text}
      </span>
    </button>
  );
}

export default function InventoryCreate() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [hasSerial, setHasSerial] = useState(false);
  const [activeBranchLabel] = useState(() => activeBranchNameFromStorage());

  const [form, setForm] = useState({
    name: "",
    sku: "",
    serial: "",
    barcode: "",
    costPrice: "",
    sellPrice: "",
    stockQty: "",
    minStockLevel: "",
    category: "",
    subcategory: "",
    subcategoryOther: "",
    brand: "",
  });

  const category = useMemo(() => normalizeCategory(form.category), [form.category]);
  const isAccessories = category === "Accessories";
  const isOtherAccessoryType = isAccessories && form.subcategory === "Other";

  const buyPrice = parseMoney(form.costPrice || 0);
  const sellPrice = parseMoney(form.sellPrice || 0);
  const startingStock = parseStock(form.stockQty || 0);
  const lowStockAlert = form.minStockLevel === "" ? null : parseStock(form.minStockLevel);

  const profitPerItem =
    Number.isFinite(sellPrice) && Number.isFinite(buyPrice)
      ? sellPrice - buyPrice
      : 0;

  const stockCost =
    Number.isFinite(startingStock) && Number.isFinite(buyPrice)
      ? startingStock * buyPrice
      : 0;

  const stockSellValue =
    Number.isFinite(startingStock) && Number.isFinite(sellPrice)
      ? startingStock * sellPrice
      : 0;

  const stockTone =
    !Number.isFinite(startingStock) || startingStock <= 0
      ? "danger"
      : lowStockAlert != null && Number.isFinite(lowStockAlert) && startingStock <= lowStockAlert
        ? "warning"
        : "success";

  const stockLabel =
    !Number.isFinite(startingStock) || startingStock <= 0
      ? "No starting stock"
      : lowStockAlert != null && Number.isFinite(lowStockAlert) && startingStock <= lowStockAlert
        ? "Low starting stock"
        : "Good starting stock";

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCategoryChange(value) {
    const nextCategory = normalizeCategory(value);

    setForm((prev) => {
      const next = {
        ...prev,
        category: nextCategory,
      };

      if (nextCategory !== "Accessories") {
        next.subcategory = "";
        next.subcategoryOther = "";
      }

      return next;
    });
  }

  function handleSerialToggle(nextValue) {
    const checked = Boolean(nextValue);

    setHasSerial(checked);
    setForm((prev) => ({
      ...prev,
      serial: checked ? prev.serial : "",
    }));
  }

  function validatePayload(payload) {
    if (!payload.name) {
      return "Product name is required";
    }

    if (!Number.isFinite(payload.costPrice) || payload.costPrice < 0) {
      return "Cost price must be 0 or more";
    }

    if (!Number.isFinite(payload.sellPrice) || payload.sellPrice < 0) {
      return "Sell price must be 0 or more";
    }

    if (!Number.isFinite(payload.stockQty) || payload.stockQty < 0) {
      return "Starting stock must be 0 or more";
    }

    if (
      payload.minStockLevel !== null &&
      (!Number.isFinite(payload.minStockLevel) || payload.minStockLevel < 0)
    ) {
      return "Low stock alert must be 0 or more";
    }

    if (hasSerial && !payload.serial) {
      return "Serial / IMEI is required when single-item tracking is on";
    }

    if (
      payload.category === "Accessories" &&
      payload.subcategory === "Other" &&
      !payload.subcategoryOther
    ) {
      return "Write the custom accessory type";
    }

    return "";
  }

  async function submit(event) {
    event.preventDefault();

    if (saving) return;

    const payload = {
      name: cleanString(form.name),
      sku: cleanString(form.sku) || null,
      serial: hasSerial ? cleanString(form.serial) || null : null,
      barcode: cleanString(form.barcode) || null,
      category: category || null,
      subcategory: null,
      subcategoryOther: null,
      brand: cleanString(form.brand) || null,
      minStockLevel: form.minStockLevel === "" ? null : parseStock(form.minStockLevel),
      costPrice: parseMoney(form.costPrice),
      sellPrice: parseMoney(form.sellPrice),
      stockQty: parseStock(form.stockQty),
    };

    if (category === "Accessories") {
      payload.subcategory = cleanString(form.subcategory) || null;
      payload.subcategoryOther =
        payload.subcategory === "Other" ? cleanString(form.subcategoryOther) || null : null;
    }

    const validationMessage = validatePayload(payload);

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setSaving(true);

    try {
      await createProduct(payload);

      toast.success("Product added");
      navigate("/app/inventory");
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "inventory-create-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to add product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Stock control
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
              Add product
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Add a product to{" "}
              <span className="font-black text-[var(--color-text)]">{activeBranchLabel}</span>.
              Starting stock will be available for sale in this branch.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <button
              type="button"
              onClick={() => navigate("/app/inventory")}
              disabled={saving}
              className={secondaryButton()}
            >
              <BackIcon />
              Back
            </button>

            <AsyncButton
              loading={saving}
              onClick={submit}
              className={primaryButton()}
            >
              <SaveIcon />
              Save product
            </AsyncButton>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px] bg-[rgba(74,163,255,0.12)] text-[var(--color-primary)] shadow-[var(--shadow-soft)]">
                <ProductIcon />
              </div>

              <div>
                <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                  Product details
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                  Use simple names your team can recognize quickly when selling.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Product name" required>
                <input
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  className={inputClass()}
                  placeholder="Example: Dell Inspiron 15"
                  disabled={saving}
                />
              </Field>

              <Field label="Brand">
                <input
                  value={form.brand}
                  onChange={(event) => setField("brand", event.target.value)}
                  className={inputClass()}
                  placeholder="Example: Dell"
                  disabled={saving}
                />
              </Field>

              <Field label="Product code" hint="Optional. Use it if your shop already has product codes.">
                <input
                  value={form.sku}
                  onChange={(event) => setField("sku", event.target.value)}
                  className={inputClass()}
                  placeholder="Example: DEL-INS15"
                  disabled={saving}
                />
              </Field>

              <Field label="Barcode" hint="Optional. Useful when using barcode search or scanner.">
                <input
                  value={form.barcode}
                  onChange={(event) => setField("barcode", event.target.value)}
                  className={inputClass()}
                  placeholder="Barcode number"
                  disabled={saving}
                />
              </Field>

              <Field label="Category">
                <select
                  value={category}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                  className={inputClass()}
                  disabled={saving}
                >
                  <option value="">Choose category</option>
                  {CATEGORY_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>

              {isAccessories ? (
                <Field label="Accessory type">
                  <select
                    value={form.subcategory}
                    onChange={(event) => setField("subcategory", event.target.value)}
                    className={inputClass()}
                    disabled={saving}
                  >
                    <option value="">Choose accessory type</option>
                    {ACCESSORY_SUBCATEGORY_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {isOtherAccessoryType ? (
                <Field label="Custom accessory type" className="sm:col-span-2">
                  <input
                    value={form.subcategoryOther}
                    onChange={(event) => setField("subcategoryOther", event.target.value)}
                    className={inputClass()}
                    placeholder="Write the accessory type"
                    disabled={saving}
                  />
                </Field>
              ) : null}
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                Serial / IMEI
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                Turn this on only when the item must be identified one by one, like phones and laptops.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <ChoiceCard
                active={!hasSerial}
                title="No single-item tracking"
                text="Best for normal stock where each unit does not need its own serial number."
                disabled={saving}
                onClick={() => handleSerialToggle(false)}
              />

              <ChoiceCard
                active={hasSerial}
                title="Use Serial / IMEI"
                text="Best for phones, laptops, and devices where each unit must be identifiable."
                disabled={saving}
                onClick={() => handleSerialToggle(true)}
              />
            </div>

            {hasSerial ? (
              <div className="mt-5">
                <Field label="Serial / IMEI" required>
                  <input
                    value={form.serial}
                    onChange={(event) => setField("serial", event.target.value)}
                    className={inputClass()}
                    placeholder="Serial or IMEI number"
                    disabled={saving}
                  />
                </Field>
              </div>
            ) : null}
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                Price and stock
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                Set the cost, selling price, and how many units are available here today.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Cost price" required>
                <input
                  type="number"
                  min="0"
                  value={form.costPrice}
                  onChange={(event) => setField("costPrice", event.target.value)}
                  className={inputClass()}
                  placeholder="450000"
                  disabled={saving}
                />
              </Field>

              <Field label="Sell price" required>
                <input
                  type="number"
                  min="0"
                  value={form.sellPrice}
                  onChange={(event) => setField("sellPrice", event.target.value)}
                  className={inputClass()}
                  placeholder="529999"
                  disabled={saving}
                />
              </Field>

              <Field label="Starting stock here" required>
                <input
                  type="number"
                  min="0"
                  value={form.stockQty}
                  onChange={(event) => setField("stockQty", event.target.value)}
                  className={inputClass()}
                  placeholder="5"
                  disabled={saving}
                />
              </Field>

              <Field label="Low stock alert" hint="The system will warn you when stock gets this low.">
                <input
                  type="number"
                  min="0"
                  value={form.minStockLevel}
                  onChange={(event) => setField("minStockLevel", event.target.value)}
                  className={inputClass()}
                  placeholder="2"
                  disabled={saving}
                />
              </Field>
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-[96px] xl:self-start">
          <section className={cx(pageCard(), "p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                  Preview
                </p>

                <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                  Before saving
                </h2>
              </div>

              <StatusPill tone={stockTone}>{stockLabel}</StatusPill>
            </div>

            <div className="mt-5 grid gap-3">
              <MetricCard
                label="Profit per item"
                value={formatRwf(profitPerItem)}
                note="Sell price minus cost price"
                tone={profitPerItem > 0 ? "success" : profitPerItem < 0 ? "danger" : "neutral"}
              />

              <MetricCard
                label="Stock cost"
                value={formatRwf(stockCost)}
                note="Money tied in this starting stock"
                tone="neutral"
              />

              <MetricCard
                label="Possible sales value"
                value={formatRwf(stockSellValue)}
                note="If all starting stock is sold"
                tone="success"
              />
            </div>
          </section>

          <section className={cx(pageCard(), "p-5")}>
            <h3 className="text-base font-black text-[var(--color-text)]">
              Product summary
            </h3>

            <div className="mt-4 space-y-3">
              <div className={cx(softPanel(), "p-4")}>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                  Product
                </p>
                <p className="mt-2 truncate text-sm font-black text-[var(--color-text)]">
                  {form.name || "Not named yet"}
                </p>
              </div>

              <div className={cx(softPanel(), "p-4")}>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                  Available here
                </p>
                <p className="mt-2 text-xl font-black text-[var(--color-text)]">
                  {Number.isFinite(startingStock) ? formatNumber(startingStock) : "—"}
                </p>
              </div>

              <div className={cx(softPanel(), "p-4")}>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                  Branch
                </p>
                <p className="mt-2 truncate text-sm font-black text-[var(--color-text)]">
                  {activeBranchLabel}
                </p>
              </div>
            </div>
          </section>

          <section className={cx(pageCard(), "p-5")}>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate("/app/inventory")}
                disabled={saving}
                className={secondaryButton()}
              >
                Cancel
              </button>

              <AsyncButton
                type="submit"
                loading={saving}
                className={primaryButton()}
              >
                <SaveIcon />
                Save product
              </AsyncButton>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}