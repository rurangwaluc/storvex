// frontend-stores/src/pages/suppliers/SupplierSupplyCreate.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  createSupplierSupply,
  getSupplierById,
} from "../../services/suppliersApi";

const SOURCE_TYPES = [
  { value: "BOUGHT", label: "Bought stock" },
  { value: "GIFT", label: "Gifted stock" },
  { value: "TRADE_IN", label: "Trade-in" },
  { value: "CONSIGNMENT", label: "Consignment" },
  { value: "OTHER", label: "Other source" },
];

const EMPTY_ITEM = {
  productId: "",
  productName: "",
  category: "",
  subcategory: "",
  subcategoryOther: "",
  brand: "",
  serial: "",
  quantity: "1",
  buyPrice: "",
  sellPrice: "",
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

function primaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function dangerBtn() {
  return "inline-flex h-10 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-4 text-xs font-black uppercase tracking-[0.12em] text-red-600 transition hover:border-red-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300";
}

function inputClass() {
  return "app-input";
}

function textareaClass() {
  return "w-full min-h-[110px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm leading-6 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]";
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

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "RWF 0";
  return `RWF ${Math.round(n).toLocaleString("en-US")}`;
}

function sourceLabel(value) {
  return SOURCE_TYPES.find((item) => item.value === value)?.label || "Other source";
}

function getCurrentBranchName() {
  return (
    cleanString(localStorage.getItem("activeBranchName")) ||
    cleanString(localStorage.getItem("activeBranchCode")) ||
    cleanString(localStorage.getItem("tenantName")) ||
    "Current branch"
  );
}

function getCurrentLocationLabel() {
  return cleanString(localStorage.getItem("workspaceLocation"));
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h1
        className={cx(
          "mt-3 text-[1.55rem] font-black tracking-[-0.04em] sm:text-[1.95rem]",
          strongText()
        )}
      >
        {title}
      </h1>

      {subtitle ? (
        <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function Field({ label, required = false, hint, children }) {
  return (
    <div className="min-w-0">
      <label className={cx("mb-1.5 block text-sm font-black", strongText())}>
        {label}
        {required ? <span className="text-[var(--color-danger)]"> *</span> : null}
      </label>

      {children}

      {hint ? (
        <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{hint}</div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const accentClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-[var(--color-danger)]"
          : tone === "info"
            ? "bg-sky-500"
            : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative min-h-[124px] overflow-hidden p-5")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accentClass)} />

      <div className="pl-2">
        <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
          {label}
        </div>

        <div className={cx("mt-2 break-words text-lg font-black tracking-[-0.03em]", strongText())}>
          {value || "—"}
        </div>

        {note ? (
          <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</div>
        ) : null}
      </div>
    </article>
  );
}

function MiniStat({ label, value, note, tone = "neutral" }) {
  return (
    <div className={cx(softPanel(), "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
            {label}
          </div>
          <div className={cx("mt-2 break-words text-sm font-black leading-6", strongText())}>
            {value || "—"}
          </div>
        </div>

        {tone !== "neutral" ? (
          <Badge tone={tone}>{tone === "success" ? "OK" : "Check"}</Badge>
        ) : null}
      </div>

      {note ? (
        <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</div>
      ) : null}
    </div>
  );
}

function ItemCard({ item, index, canRemove, onChange, onRemove }) {
  const quantity = toNumber(item.quantity, 0);
  const buyPrice = toNumber(item.buyPrice, 0);
  const sellPrice = toNumber(item.sellPrice, 0);
  const totalCost = quantity * buyPrice;
  const expectedSales = quantity * sellPrice;

  function setField(key, value) {
    onChange(index, { ...item, [key]: value });
  }

  return (
    <section className={cx(pageCard(), "overflow-hidden")}>
      <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">Item {index + 1}</Badge>
              {cleanString(item.serial) ? <Badge tone="success">Serial saved</Badge> : null}
            </div>

            <div className={cx("mt-3 text-lg font-black tracking-[-0.03em]", strongText())}>
              {cleanString(item.productName) || "New stock item"}
            </div>

            <div className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
              Record product, quantity, buying cost, selling price, and proof details.
            </div>
          </div>

          {canRemove ? (
            <button type="button" onClick={() => onRemove(index)} className={dangerBtn()}>
              Remove item
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Product name" required hint="Use the exact product name staff will recognize.">
              <input
                className={inputClass()}
                value={item.productName}
                onChange={(event) => setField("productName", event.target.value)}
                placeholder="Example: Samsung Galaxy A15 128GB"
                required
              />
            </Field>
          </div>

          <Field label="Category">
            <input
              className={inputClass()}
              value={item.category}
              onChange={(event) => setField("category", event.target.value)}
              placeholder="Phone, Laptop, TV..."
            />
          </Field>

          <Field label="Brand">
            <input
              className={inputClass()}
              value={item.brand}
              onChange={(event) => setField("brand", event.target.value)}
              placeholder="Samsung, HP, Lenovo..."
            />
          </Field>

          <Field label="Serial / IMEI" hint="Recommended for phones, laptops, and high-value electronics.">
            <input
              className={inputClass()}
              value={item.serial}
              onChange={(event) => setField("serial", event.target.value)}
              placeholder="Optional, but recommended"
            />
          </Field>

          <Field label="Quantity" required>
            <input
              type="number"
              min="1"
              className={inputClass()}
              value={item.quantity}
              onChange={(event) => setField("quantity", event.target.value)}
              required
            />
          </Field>

          <Field label="Buying price" required hint="Amount paid per item.">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass()}
              value={item.buyPrice}
              onChange={(event) => setField("buyPrice", event.target.value)}
              placeholder="0"
              required
            />
          </Field>

          <Field label="Selling price" required hint="Expected selling price per item.">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass()}
              value={item.sellPrice}
              onChange={(event) => setField("sellPrice", event.target.value)}
              placeholder="0"
              required
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Item notes">
              <textarea
                className={textareaClass()}
                value={item.notes}
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Condition, warranty note, packaging, supplier promise..."
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MiniStat
            label="Quantity"
            value={quantity || "—"}
            note="Units being recorded"
            tone={quantity > 0 ? "success" : "warning"}
          />
          <MiniStat
            label="Total cost"
            value={formatMoney(totalCost)}
            note="Quantity × buying price"
            tone={totalCost > 0 ? "warning" : "neutral"}
          />
          <MiniStat
            label="Expected sales"
            value={formatMoney(expectedSales)}
            note="Quantity × selling price"
            tone={expectedSales > 0 ? "success" : "neutral"}
          />
        </div>
      </div>
    </section>
  );
}

function PreviewPanel({
  supplier,
  currentBranchName,
  currentLocationLabel,
  sourceType,
  documentRef,
  items,
  alsoUpdateStock,
}) {
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + Math.max(0, toNumber(item.quantity, 0)), 0);
  const totalCost = items.reduce((sum, item) => {
    const qty = Math.max(0, toNumber(item.quantity, 0));
    const buy = Math.max(0, toNumber(item.buyPrice, 0));
    return sum + qty * buy;
  }, 0);

  const expectedSales = items.reduce((sum, item) => {
    const qty = Math.max(0, toNumber(item.quantity, 0));
    const sell = Math.max(0, toNumber(item.sellPrice, 0));
    return sum + qty * sell;
  }, 0);

  const missingNames = items.filter((item) => !cleanString(item.productName)).length;

  return (
    <aside className={cx(pageCard(), "h-fit p-5 sm:p-6")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={missingNames ? "warning" : "success"}>
          {missingNames ? "Needs review" : "Ready"}
        </Badge>
        <Badge tone="primary">{sourceLabel(sourceType)}</Badge>
      </div>

      <div className={cx("mt-5 text-lg font-black tracking-[-0.03em]", strongText())}>
        Supply snapshot
      </div>

      <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
        Review what will be added to the current selling location before saving.
      </p>

      <div className="mt-5 space-y-3">
        <MiniStat
          label="Supplier"
          value={supplier?.name || "Supplier"}
          note={supplier?.phone || supplier?.companyName || "Supplier profile"}
          tone="info"
        />

        <MiniStat
          label="Receiving location"
          value={currentBranchName}
          note={currentLocationLabel || "Stock will be recorded for the current location"}
          tone="success"
        />

        <MiniStat
          label="Document reference"
          value={cleanString(documentRef) || "Not added"}
          note="Invoice, receipt, or purchase note"
        />

        <MiniStat
          label="Stock update"
          value={alsoUpdateStock ? "Add to stock now" : "Record only"}
          note={
            alsoUpdateStock
              ? "Stock quantities will be updated immediately"
              : "Supply will be saved without changing stock"
          }
          tone={alsoUpdateStock ? "success" : "warning"}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3">
        <SummaryCard label="Lines" value={totalItems} note="Different items in this supply" />
        <SummaryCard label="Units" value={totalQuantity} note="Total quantity received" tone="info" />
        <SummaryCard label="Total cost" value={formatMoney(totalCost)} note="Expected purchase cost" tone="warning" />
        <SummaryCard
          label="Expected sales"
          value={formatMoney(expectedSales)}
          note="Potential selling value"
          tone="success"
        />
      </div>
    </aside>
  );
}

export default function SupplierSupplyCreate() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplier, setSupplier] = useState(null);

  const [form, setForm] = useState({
    sourceType: "BOUGHT",
    sourceDetails: "",
    documentRef: "",
    notes: "",
    alsoUpdateStock: true,
    items: [{ ...EMPTY_ITEM }],
  });

  const currentBranchName = useMemo(() => getCurrentBranchName(), []);
  const currentLocationLabel = useMemo(() => getCurrentLocationLabel(), []);

  const totals = useMemo(() => {
    const items = Array.isArray(form.items) ? form.items : [];

    const totalQuantity = items.reduce(
      (sum, item) => sum + Math.max(0, toNumber(item.quantity, 0)),
      0
    );

    const totalCost = items.reduce((sum, item) => {
      const qty = Math.max(0, toNumber(item.quantity, 0));
      const buy = Math.max(0, toNumber(item.buyPrice, 0));
      return sum + qty * buy;
    }, 0);

    const expectedSales = items.reduce((sum, item) => {
      const qty = Math.max(0, toNumber(item.quantity, 0));
      const sell = Math.max(0, toNumber(item.sellPrice, 0));
      return sum + qty * sell;
    }, 0);

    return {
      itemLines: items.length,
      totalQuantity,
      totalCost,
      expectedSales,
    };
  }, [form.items]);

  useEffect(() => {
    let alive = true;

    async function loadSupplier() {
      setLoading(true);

      try {
        const data = await getSupplierById(String(id));

        if (!alive) return;

        setSupplier(data || null);
      } catch (err) {
        console.error(err);

        if (!alive) return;

        setSupplier(null);
        toast.error(err?.response?.data?.message || err?.message || "Failed to load supplier");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadSupplier();

    return () => {
      alive = false;
    };
  }, [id]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setItem(index, nextItem) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
    }));
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }],
    }));
  }

  function removeItem(index) {
    setForm((prev) => {
      const nextItems = prev.items.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        items: nextItems.length ? nextItems : [{ ...EMPTY_ITEM }],
      };
    });
  }

  function validatePayload(payload) {
    if (!payload.items.length) {
      toast.error("Add at least one item.");
      return false;
    }

    for (let index = 0; index < payload.items.length; index += 1) {
      const item = payload.items[index];
      const row = index + 1;

      if (!item.productName) {
        toast.error(`Item ${row}: product name is required.`);
        return false;
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        toast.error(`Item ${row}: quantity must be more than 0.`);
        return false;
      }

      if (!Number.isFinite(item.buyPrice) || item.buyPrice < 0) {
        toast.error(`Item ${row}: buying price must be 0 or more.`);
        return false;
      }

      if (!Number.isFinite(item.sellPrice) || item.sellPrice < 0) {
        toast.error(`Item ${row}: selling price must be 0 or more.`);
        return false;
      }
    }

    return true;
  }

  async function submit(event) {
    event.preventDefault();

    if (saving) return;

    const payload = {
      sourceType: form.sourceType,
      sourceDetails: cleanString(form.sourceDetails) || null,
      documentRef: cleanString(form.documentRef) || null,
      notes: cleanString(form.notes) || null,
      alsoUpdateStock: Boolean(form.alsoUpdateStock),
      items: form.items.map((item) => ({
        productId: cleanString(item.productId) || null,
        productName: cleanString(item.productName),
        category: cleanString(item.category) || null,
        subcategory: cleanString(item.subcategory) || null,
        subcategoryOther: cleanString(item.subcategoryOther) || null,
        brand: cleanString(item.brand) || null,
        serial: cleanString(item.serial) || null,
        quantity: Math.floor(toNumber(item.quantity, 0)),
        buyPrice: toNumber(item.buyPrice, NaN),
        sellPrice: toNumber(item.sellPrice, NaN),
        notes: cleanString(item.notes) || null,
      })),
    };

    if (!validatePayload(payload)) return;

    setSaving(true);

    try {
      await createSupplierSupply(String(id), payload);

      toast.success(
        payload.alsoUpdateStock
          ? "Supply saved and stock updated"
          : "Supply saved"
      );

      navigate(`/app/suppliers/${id}`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save supplier supply");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageSkeleton titleWidth="w-56" lines={4} variant="default" />;
  }

  if (!supplier) {
    return (
      <div className="space-y-6 overflow-x-hidden">
        <section className={cx(pageCard(), "p-6 text-center")}>
          <div className={cx("text-lg font-black tracking-[-0.03em]", strongText())}>
            Supplier not found
          </div>

          <p className={cx("mx-auto mt-2 max-w-md text-sm font-semibold leading-6", mutedText())}>
            This supplier could not be found, or you no longer have access to it.
          </p>

          <div className="mt-5">
            <button type="button" onClick={() => navigate("/app/suppliers")} className={secondaryBtn()}>
              Back to suppliers
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">Supplier stock</Badge>
                <Badge tone="success">{currentBranchName}</Badge>
                <Badge tone={form.alsoUpdateStock ? "success" : "warning"}>
                  {form.alsoUpdateStock ? "Stock will be updated" : "Record only"}
                </Badge>
              </div>

              <SectionHeading
                eyebrow="Suppliers"
                title="Record supplier stock"
                subtitle="Save items received from this supplier and choose whether the received quantities should be added to the current selling location immediately."
              />
            </div>

            <button
              type="button"
              onClick={() => navigate(`/app/suppliers/${id}`)}
              className={secondaryBtn()}
              disabled={saving}
            >
              Back to supplier
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-4">
          <SummaryCard
            label="Supplier"
            value={supplier.name || "Supplier"}
            note={supplier.phone || supplier.companyName || "Supplier profile"}
            tone="info"
          />
          <SummaryCard
            label="Receiving location"
            value={currentBranchName}
            note={currentLocationLabel || "Current selling location"}
            tone="success"
          />
          <SummaryCard
            label="Units"
            value={totals.totalQuantity}
            note={`${totals.itemLines} item line${totals.itemLines === 1 ? "" : "s"}`}
            tone="primary"
          />
          <SummaryCard
            label="Total cost"
            value={formatMoney(totals.totalCost)}
            note={`Expected sales: ${formatMoney(totals.expectedSales)}`}
            tone="warning"
          />
        </div>
      </section>

      <form onSubmit={submit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className={cx(pageCard(), "overflow-hidden")}>
            <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
              <SectionHeading
                eyebrow="Supply details"
                title="Source and document proof"
                subtitle="Attach receipt, invoice, or purchase reference so the stock origin remains clear later."
              />
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className={cx(softPanel(), "p-5 sm:p-6")}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="How this stock came in">
                    <select
                      className={inputClass()}
                      value={form.sourceType}
                      onChange={(event) => setField("sourceType", event.target.value)}
                    >
                      {SOURCE_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Receipt or invoice reference" hint="Optional, but useful for proof.">
                    <input
                      className={inputClass()}
                      value={form.documentRef}
                      onChange={(event) => setField("documentRef", event.target.value)}
                      placeholder="Example: INV-2026-001"
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Source details">
                      <input
                        className={inputClass()}
                        value={form.sourceDetails}
                        onChange={(event) => setField("sourceDetails", event.target.value)}
                        placeholder="Example: bought from supplier shop, received by manager..."
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <label className={cx(softPanel(), "flex cursor-pointer items-start gap-3 p-4")}>
                      <input
                        type="checkbox"
                        checked={Boolean(form.alsoUpdateStock)}
                        onChange={(event) => setField("alsoUpdateStock", event.target.checked)}
                        className="mt-1 h-4 w-4 rounded"
                      />

                      <div>
                        <div className={cx("text-sm font-black", strongText())}>
                          Add these quantities to stock now
                        </div>
                        <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                          Keep this enabled when the items have physically arrived at the current selling location.
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <Field label="Supply notes">
                      <textarea
                        className={textareaClass()}
                        value={form.notes}
                        onChange={(event) => setField("notes", event.target.value)}
                        placeholder="Supplier promise, payment note, warranty terms, or receiving note..."
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {form.items.map((item, index) => (
            <ItemCard
              key={index}
              item={item}
              index={index}
              canRemove={form.items.length > 1}
              onChange={setItem}
              onRemove={removeItem}
            />
          ))}

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className={cx("text-sm font-black", strongText())}>Need to add another item?</div>
                <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                  Add another line when the supplier delivered more than one product.
                </div>
              </div>

              <button type="button" onClick={addItem} className={secondaryBtn()} disabled={saving}>
                Add another item
              </button>
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate(`/app/suppliers/${id}`)}
                className={secondaryBtn()}
                disabled={saving}
              >
                Cancel
              </button>

              <AsyncButton type="submit" loading={saving} loadingText="Saving..." className={primaryBtn()}>
                Save supplier stock
              </AsyncButton>
            </div>
          </section>
        </div>

        <PreviewPanel
          supplier={supplier}
          currentBranchName={currentBranchName}
          currentLocationLabel={currentLocationLabel}
          sourceType={form.sourceType}
          documentRef={form.documentRef}
          items={form.items}
          alsoUpdateStock={form.alsoUpdateStock}
        />
      </form>
    </div>
  );
}