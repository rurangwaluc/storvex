import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { cn } from "../../lib/cn";
import { createProforma } from "../../services/proformasApi";

const strong = () => "text-[var(--color-text)]";
const muted = () => "text-[var(--color-text-muted)]";
const soft = () => "text-[var(--color-text-soft)]";
const shell = () => "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
const panel = () => "rounded-[24px] bg-[var(--color-surface-2)]";

function inputClass() {
  return "app-input";
}

function textareaClass() {
  return [
    "w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]",
    "min-h-[120px] resize-y px-4 py-3 text-sm leading-6 text-[var(--color-text)]",
    "outline-none transition placeholder:text-[var(--color-text-muted)]",
    "focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
  ].join(" ");
}

function labelClass() {
  return "mb-1.5 block text-sm font-medium text-[var(--color-text)]";
}

function smallBtn() {
  return "inline-flex h-9 items-center justify-center rounded-xl bg-[var(--color-card)] px-3 text-sm font-medium text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
}

function money(value, currency = "RWF") {
  return `${currency} ${Number(value || 0).toLocaleString()}`;
}

function SummaryRow({ label, value, strongValue = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className={cn("text-sm", muted())}>{label}</span>
      <span
        className={cn(
          "text-right text-sm",
          strongValue ? "font-semibold" : "font-medium",
          strongValue ? strong() : muted()
        )}
      >
        {value}
      </span>
    </div>
  );
}

function makeEmptyItem() {
  return {
    key: `new-${Math.random().toString(36).slice(2, 10)}`,
    productName: "",
    serial: "",
    quantity: 1,
    unitPrice: "",
  };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function ProformaCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    validUntil: "",
    preparedBy: "",
    reference: "",
    notes: "",
    currency: "RWF",
    status: "DRAFT",
  });

  const [items, setItems] = useState([makeEmptyItem()]);
  const [saving, setSaving] = useState(false);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateItem(index, key, value) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  }

  function addItem() {
    setItems((prev) => [...prev, makeEmptyItem()]);
  }

  function removeItem(index) {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  const normalizedItems = useMemo(() => {
    return items.map((item) => {
      const quantity = Math.max(1, parseInt(item.quantity || 1, 10) || 1);
      const unitPrice = Math.max(0, toNumber(item.unitPrice));

      return {
        ...item,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    });
  }, [items]);

  const validItemsCount = useMemo(() => {
    return normalizedItems.filter((item) => String(item.productName || "").trim()).length;
  }, [normalizedItems]);

  const subtotal = useMemo(() => {
    return normalizedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  }, [normalizedItems]);

  async function onSubmit(e) {
    e.preventDefault();

    if (!form.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    const validItems = normalizedItems
      .filter((item) => String(item.productName || "").trim())
      .map((item) => ({
        productName: item.productName.trim(),
        serial: String(item.serial || "").trim() || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

    if (!validItems.length) {
      toast.error("Add at least one valid item");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || undefined,
        customerEmail: form.customerEmail.trim() || undefined,
        customerAddress: form.customerAddress.trim() || undefined,
        validUntil: form.validUntil || undefined,
        preparedBy: form.preparedBy.trim() || undefined,
        reference: form.reference.trim() || undefined,
        notes: form.notes.trim() || undefined,
        currency: form.currency.trim() || "RWF",
        status: form.status || "DRAFT",
        items: validItems,
      };

      const result = await createProforma(payload);
      const createdId = result?.proforma?.id;

      toast.success("Proforma created");

      if (createdId) {
        navigate(`/app/documents/proformas/${encodeURIComponent(createdId)}/preview`);
        return;
      }

      navigate("/app/documents/proformas");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to create proforma");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={cn(shell(), "relative overflow-hidden p-5 md:p-6")}>
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", soft())}>
              Document creation
            </div>

            <h1 className={cn("mt-2 text-2xl font-semibold tracking-tight md:text-3xl", strong())}>
              Create Proforma
            </h1>

            <p className={cn("mt-3 max-w-3xl text-sm leading-6 md:text-[15px]", muted())}>
              Build a branded quotation that can be previewed, printed, and shared with a
              customer before final payment.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/app/documents/proformas" className={smallBtn()}>
              Back to Proformas
            </Link>
            <Link to="/app/documents" className={smallBtn()}>
              Document Centre
            </Link>
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <section className={cn(panel(), "p-4 md:p-5")}>
            <h2 className={cn("text-base font-semibold", strong())}>Customer details</h2>
            <p className={cn("mt-1 text-sm", muted())}>
              Add only the details that matter for the quotation.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass()}>Customer name</label>
                <input
                  value={form.customerName}
                  onChange={(e) => updateField("customerName", e.target.value)}
                  className={inputClass()}
                  placeholder="Customer name"
                  required
                />
              </div>

              <div>
                <label className={labelClass()}>Phone</label>
                <input
                  value={form.customerPhone}
                  onChange={(e) => updateField("customerPhone", e.target.value)}
                  className={inputClass()}
                  placeholder="Customer phone"
                />
              </div>

              <div>
                <label className={labelClass()}>Email</label>
                <input
                  value={form.customerEmail}
                  onChange={(e) => updateField("customerEmail", e.target.value)}
                  className={inputClass()}
                  placeholder="Customer email"
                  type="email"
                />
              </div>

              <div>
                <label className={labelClass()}>Valid until</label>
                <input
                  value={form.validUntil}
                  onChange={(e) => updateField("validUntil", e.target.value)}
                  className={inputClass()}
                  type="date"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass()}>Address</label>
                <textarea
                  value={form.customerAddress}
                  onChange={(e) => updateField("customerAddress", e.target.value)}
                  className={textareaClass()}
                  placeholder="Customer address"
                  rows={3}
                />
              </div>
            </div>
          </section>

          <section className={cn(panel(), "p-4 md:p-5")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className={cn("text-base font-semibold", strong())}>Items</h2>
                <p className={cn("mt-1 text-sm", muted())}>
                  Build the quotation lines clearly and cleanly.
                </p>
              </div>

              <button type="button" onClick={addItem} className={smallBtn()}>
                Add item
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {normalizedItems.map((item, index) => (
                <div
                  key={item.key || index}
                  className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className={cn("text-sm font-semibold", strong())}>
                      Item {index + 1}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className={smallBtn()}
                      disabled={normalizedItems.length === 1}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className={labelClass()}>Product name</label>
                      <input
                        value={item.productName}
                        onChange={(e) => updateItem(index, "productName", e.target.value)}
                        className={inputClass()}
                        placeholder="Product name"
                      />
                    </div>

                    <div>
                      <label className={labelClass()}>Serial / identifier</label>
                      <input
                        value={item.serial}
                        onChange={(e) => updateItem(index, "serial", e.target.value)}
                        className={inputClass()}
                        placeholder="Serial, IMEI, or identifier"
                      />
                    </div>

                    <div>
                      <label className={labelClass()}>Quantity</label>
                      <input
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className={inputClass()}
                        type="number"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className={labelClass()}>Unit price</label>
                      <input
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                        className={inputClass()}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className={labelClass()}>Line total</label>
                      <div className="flex h-11 items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 text-sm font-medium text-[var(--color-text)]">
                        {money(item.total, form.currency || "RWF")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={cn(panel(), "p-4 md:p-5")}>
            <h2 className={cn("text-base font-semibold", strong())}>Document details</h2>
            <p className={cn("mt-1 text-sm", muted())}>
              These fields help owners and staff track context cleanly.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass()}>Prepared by</label>
                <input
                  value={form.preparedBy}
                  onChange={(e) => updateField("preparedBy", e.target.value)}
                  className={inputClass()}
                  placeholder="Prepared by"
                />
              </div>

              <div>
                <label className={labelClass()}>Reference</label>
                <input
                  value={form.reference}
                  onChange={(e) => updateField("reference", e.target.value)}
                  className={inputClass()}
                  placeholder="Reference"
                />
              </div>

              <div>
                <label className={labelClass()}>Currency</label>
                <input
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value.toUpperCase())}
                  className={inputClass()}
                  placeholder="RWF"
                />
              </div>

              <div>
                <label className={labelClass()}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className={inputClass()}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="SENT">SENT</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass()}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className={textareaClass()}
                  placeholder="Notes or quotation terms"
                  rows={5}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className={cn(shell(), "p-4 md:p-5 xl:sticky xl:top-5")}>
            <div>
              <h2 className={cn("text-base font-semibold", strong())}>Summary</h2>
              <p className={cn("mt-1 text-sm", muted())}>
                Review before creating the proforma.
              </p>
            </div>

            <div className="mt-5 divide-y divide-[var(--color-border)]">
              <SummaryRow label="Items" value={String(validItemsCount)} />
              <SummaryRow label="Currency" value={form.currency || "RWF"} />
              <SummaryRow label="Prepared by" value={form.preparedBy || "—"} />
              <SummaryRow label="Valid until" value={form.validUntil || "—"} />
              <SummaryRow label="Status" value={form.status || "DRAFT"} />
              <SummaryRow label="Subtotal" value={money(subtotal, form.currency || "RWF")} strongValue />
              <SummaryRow label="Total" value={money(subtotal, form.currency || "RWF")} strongValue />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <AsyncButton type="submit" loading={saving} loadingText="Creating..." variant="primary">
                Create Proforma
              </AsyncButton>

              <Link
                to="/app/documents/proformas"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-5 text-sm font-medium text-[var(--color-text)] transition hover:opacity-90"
              >
                Cancel
              </Link>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}