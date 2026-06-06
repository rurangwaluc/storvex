import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { cn } from "../../lib/cn";
import { getProformaById, updateProforma } from "../../services/proformasApi";

const strong = () => "text-[var(--color-text)]";
const muted = () => "text-[var(--color-text-muted)]";
const soft = () => "text-[var(--color-text-soft)]";
const shell = () => "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
const panel = () => "rounded-[24px] bg-[var(--color-surface-2)]";

function labelClass() {
  return "mb-1.5 block text-sm font-medium text-[var(--color-text)]";
}

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

function smallBtn() {
  return "inline-flex h-9 items-center justify-center rounded-xl bg-[var(--color-card)] px-3 text-sm font-medium text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
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

function badgeClass(kind = "neutral") {
  if (kind === "success") {
    return "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300";
  }

  if (kind === "warning") {
    return "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300";
  }

  if (kind === "danger") {
    return "inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300";
  }

  return "inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]";
}

function statusKind(status) {
  const value = String(status || "").toUpperCase();

  if (["SENT", "CONVERTED", "ACTIVE"].includes(value)) return "success";
  if (["DRAFT", "PENDING"].includes(value)) return "warning";
  if (["CANCELLED", "EXPIRED"].includes(value)) return "danger";

  return "neutral";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function money(value, currency = "RWF") {
  return `${currency} ${Number(value || 0).toLocaleString()}`;
}

function emptyItem() {
  return {
    key: `new-${Math.random().toString(36).slice(2, 10)}`,
    id: null,
    productId: "",
    productName: "",
    serial: "",
    quantity: 1,
    unitPrice: 0,
  };
}

function normalizeProforma(raw) {
  const doc = raw?.proforma || raw || {};
  const items = Array.isArray(doc?.items) ? doc.items : [];

  return {
    id: doc?.id || null,
    number: doc?.number || null,
    status: doc?.status || "DRAFT",
    customerName: doc?.customerName || "",
    customerPhone: doc?.customerPhone || "",
    customerEmail: doc?.customerEmail || "",
    customerAddress: doc?.customerAddress || "",
    currency: doc?.currency || "RWF",
    validUntil: doc?.validUntil || null,
    preparedBy: doc?.preparedBy || "",
    reference: doc?.reference || "",
    notes: doc?.notes || "",
    createdAt: doc?.createdAt || null,
    convertedToSaleId: doc?.convertedToSaleId || null,
    items: items.map((item, index) => ({
      key: item?.id || `row-${index}`,
      id: item?.id || null,
      productId: item?.productId || "",
      productName: item?.productName || item?.product?.name || "",
      serial: item?.serial || item?.product?.serial || "",
      quantity: Number(item?.quantity || 1),
      unitPrice: Number(item?.unitPrice || 0),
    })),
  };
}

function EditSkeleton() {
  return (
    <div className="space-y-6">
      <section className={cn(shell(), "p-5 md:p-6")}>
        <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--color-surface)]" />
        <div className="mt-4 h-8 w-56 animate-pulse rounded-full bg-[var(--color-surface)]" />
        <div className="mt-3 h-4 w-full max-w-[560px] animate-pulse rounded-full bg-[var(--color-surface)]" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <section key={i} className={cn(panel(), "p-4 md:p-5")}>
              <div className="h-5 w-40 animate-pulse rounded-full bg-[var(--color-surface)]" />
              <div className="mt-2 h-4 w-72 animate-pulse rounded-full bg-[var(--color-surface)]" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j}>
                    <div className="mb-2 h-3 w-24 animate-pulse rounded-full bg-[var(--color-surface)]" />
                    <div className="h-11 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className={cn(shell(), "h-[300px] animate-pulse p-4 md:p-5")} />
      </div>
    </div>
  );
}

export default function ProformaEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [documentData, setDocumentData] = useState(null);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    currency: "RWF",
    validUntil: "",
    preparedBy: "",
    reference: "",
    notes: "",
    status: "DRAFT",
  });
  const [items, setItems] = useState([emptyItem()]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function load() {
      if (!id) return;

      try {
        setLoading(true);

        const raw = await getProformaById(id);
        const doc = normalizeProforma(raw);

        if (!mountedRef.current) return;

        setDocumentData(doc);
        setForm({
          customerName: doc.customerName || "",
          customerPhone: doc.customerPhone || "",
          customerEmail: doc.customerEmail || "",
          customerAddress: doc.customerAddress || "",
          currency: doc.currency || "RWF",
          validUntil: toInputDate(doc.validUntil),
          preparedBy: doc.preparedBy || "",
          reference: doc.reference || "",
          notes: doc.notes || "",
          status: doc.status || "DRAFT",
        });
        setItems(doc.items?.length ? doc.items : [emptyItem()]);
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "Failed to load proforma");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    void load();
  }, [id]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateItem(index, key, value) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]:
                key === "quantity" || key === "unitPrice" ? Number(value || 0) : value,
            }
          : item
      )
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index) {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  const normalizedItems = useMemo(() => {
    return items.filter(
      (item) =>
        String(item.productName || "").trim() &&
        Number(item.quantity || 0) > 0 &&
        Number(item.unitPrice || 0) >= 0
    );
  }, [items]);

  const subtotal = useMemo(() => {
    return normalizedItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    );
  }, [normalizedItems]);

  async function onSubmit(e) {
    e.preventDefault();

    if (!form.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!normalizedItems.length) {
      toast.error("Add at least one valid proforma item");
      return;
    }

    try {
      setSaving(true);

      await updateProforma(id, {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || undefined,
        customerEmail: form.customerEmail.trim() || undefined,
        customerAddress: form.customerAddress.trim() || undefined,
        currency: form.currency.trim() || "RWF",
        validUntil: form.validUntil || null,
        preparedBy: form.preparedBy.trim() || undefined,
        reference: form.reference.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
        items: normalizedItems.map((item) => ({
          productId: item.productId || undefined,
          productName: item.productName.trim(),
          serial: String(item.serial || "").trim() || undefined,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
        })),
      });

      toast.success("Proforma updated");
      navigate(`/app/documents/proformas/${encodeURIComponent(id)}/preview`);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to update proforma");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <EditSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className={cn(shell(), "relative overflow-hidden p-5 md:p-6")}>
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", soft())}>
              Document editing
            </div>

            <h1 className={cn("mt-2 text-2xl font-semibold tracking-tight md:text-3xl", strong())}>
              Edit Proforma
            </h1>

            <p className={cn("mt-3 max-w-3xl text-sm leading-6 md:text-[15px]", muted())}>
              Revise customer details, quotation items, validity, and commercial notes without
              losing the premium document flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/app/documents/proformas" className={smallBtn()}>
              Back to Proformas
            </Link>
            <Link
              to={`/app/documents/proformas/${encodeURIComponent(id)}/preview`}
              className={smallBtn()}
            >
              Preview
            </Link>
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <section className={cn(panel(), "p-4 md:p-5")}>
            <h2 className={cn("text-base font-semibold", strong())}>Document summary</h2>
            <p className={cn("mt-1 text-sm", muted())}>
              Review the quotation reference and current commercial state.
            </p>

            <div className="mt-5 rounded-[20px] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Proforma
                  </div>
                  <div className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">
                    {documentData?.number || "Proforma"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">
                    <span>Date: {formatDate(documentData?.createdAt)}</span>
                    <span>{documentData?.convertedToSaleId ? "Converted: Yes" : "Converted: No"}</span>
                  </div>
                </div>

                <span className={badgeClass(statusKind(form.status))}>
                  {form.status || "DRAFT"}
                </span>
              </div>
            </div>
          </section>

          <section className={cn(panel(), "p-4 md:p-5")}>
            <h2 className={cn("text-base font-semibold", strong())}>
              Customer and commercial details
            </h2>
            <p className={cn("mt-1 text-sm", muted())}>
              Keep the quotation details clear, credible, and ready for approval.
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
                <label className={labelClass()}>Customer phone</label>
                <input
                  value={form.customerPhone}
                  onChange={(e) => updateField("customerPhone", e.target.value)}
                  className={inputClass()}
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className={labelClass()}>Customer email</label>
                <input
                  value={form.customerEmail}
                  onChange={(e) => updateField("customerEmail", e.target.value)}
                  className={inputClass()}
                  placeholder="Email address"
                />
              </div>

              <div>
                <label className={labelClass()}>Valid until</label>
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => updateField("validUntil", e.target.value)}
                  className={inputClass()}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass()}>Customer address</label>
                <input
                  value={form.customerAddress}
                  onChange={(e) => updateField("customerAddress", e.target.value)}
                  className={inputClass()}
                  placeholder="Address"
                />
              </div>

              <div>
                <label className={labelClass()}>Prepared by</label>
                <input
                  value={form.preparedBy}
                  onChange={(e) => updateField("preparedBy", e.target.value)}
                  className={inputClass()}
                  placeholder="Staff member"
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
                <label className={labelClass()}>Notes / terms</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className={textareaClass()}
                  placeholder="Commercial notes or terms"
                  rows={4}
                />
              </div>
            </div>
          </section>

          <section className={cn(panel(), "p-4 md:p-5")}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className={cn("text-base font-semibold", strong())}>Quotation items</h2>
                <p className={cn("mt-1 text-sm", muted())}>
                  Keep the quotation clean, accurate, and easy to validate.
                </p>
              </div>

              <button type="button" onClick={addItem} className={smallBtn()}>
                Add item
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.key}
                  className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className={cn("text-sm font-semibold", strong())}>
                        Item {index + 1}
                      </div>
                      <div className={cn("mt-1 text-xs", soft())}>
                        This line appears on the proforma.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className={smallBtn()}
                      disabled={items.length <= 1}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <div className="md:col-span-2">
                      <label className={labelClass()}>Product name</label>
                      <input
                        value={item.productName}
                        onChange={(e) => updateItem(index, "productName", e.target.value)}
                        className={inputClass()}
                        placeholder="Quoted product"
                      />
                    </div>

                    <div>
                      <label className={labelClass()}>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className={inputClass()}
                        placeholder="1"
                      />
                    </div>

                    <div>
                      <label className={labelClass()}>Unit price</label>
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                        className={inputClass()}
                        placeholder="0"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className={labelClass()}>Serial / identifier</label>
                      <input
                        value={item.serial}
                        onChange={(e) => updateItem(index, "serial", e.target.value)}
                        className={inputClass()}
                        placeholder="Serial number or identifier"
                      />
                    </div>

                    <div>
                      <label className={labelClass()}>Line total</label>
                      <div className="flex h-11 items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3.5 text-sm font-medium text-[var(--color-text)]">
                        {money(
                          Number(item.quantity || 0) * Number(item.unitPrice || 0),
                          form.currency || "RWF"
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className={cn(shell(), "p-4 md:p-5 xl:sticky xl:top-5")}>
            <div>
              <h2 className={cn("text-base font-semibold", strong())}>Summary</h2>
              <p className={cn("mt-1 text-sm", muted())}>
                Review before saving proforma changes.
              </p>
            </div>

            <div className="mt-5 divide-y divide-[var(--color-border)]">
              <SummaryRow label="Document" value={documentData?.number || "—"} />
              <SummaryRow label="Customer" value={form.customerName || "—"} />
              <SummaryRow label="Prepared by" value={form.preparedBy || "—"} />
              <SummaryRow label="Status" value={form.status || "DRAFT"} />
              <SummaryRow label="Validity" value={form.validUntil || "—"} />
              <SummaryRow label="Items" value={String(normalizedItems.length)} />
              <SummaryRow
                label="Subtotal"
                value={money(subtotal, form.currency || "RWF")}
                strongValue
              />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <AsyncButton type="submit" loading={saving} loadingText="Saving..." variant="primary">
                Save Proforma
              </AsyncButton>

              <Link
                to={`/app/documents/proformas/${encodeURIComponent(id)}/preview`}
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