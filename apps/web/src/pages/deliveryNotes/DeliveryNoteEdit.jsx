import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { cn } from "../../lib/cn";
import { getDeliveryNoteById, updateDeliveryNote } from "../../services/deliveryNotesApi";

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
    "min-h-[132px] resize-y px-4 py-3 text-sm leading-6 text-[var(--color-text)]",
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

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function badgeClass(kind = "neutral") {
  if (kind === "success") {
    return "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300";
  }

  if (kind === "warning") {
    return "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300";
  }

  return "inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]";
}

function normalizeDeliveryNote(raw) {
  const note = raw?.deliveryNote || raw || {};
  const items = Array.isArray(note?.items) ? note.items : [];

  return {
    id: note?.id || null,
    number: note?.number || null,
    date: note?.date || null,
    createdAt: note?.createdAt || null,
    saleId: note?.saleId || null,
    customerName: note?.customerName || "",
    customerPhone: note?.customerPhone || "",
    customerAddress: note?.customerAddress || "",
    deliveredBy: note?.deliveredBy || "",
    receivedBy: note?.receivedBy || "",
    receivedByPhone: note?.receivedByPhone || "",
    notes: note?.notes || "",
    items: items.map((item, index) => ({
      key: item?.id || `row-${index}`,
      productId: item?.productId || "",
      productName: item?.productName || "",
      serial: item?.serial || "",
      quantity: Number(item?.quantity || 1),
    })),
  };
}

function emptyItem() {
  return {
    key: `new-${Math.random().toString(36).slice(2, 10)}`,
    productId: "",
    productName: "",
    serial: "",
    quantity: 1,
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

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <section key={i} className={cn(panel(), "p-4 md:p-5")}>
              <div className="h-5 w-40 animate-pulse rounded-full bg-[var(--color-surface)]" />
              <div className="mt-2 h-4 w-72 animate-pulse rounded-full bg-[var(--color-surface)]" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((__, j) => (
                  <div key={j}>
                    <div className="mb-2 h-3 w-24 animate-pulse rounded-full bg-[var(--color-surface)]" />
                    <div className="h-11 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className={cn(shell(), "h-[320px] animate-pulse p-4 md:p-5")} />
      </div>
    </div>
  );
}

export default function DeliveryNoteEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [documentData, setDocumentData] = useState(null);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    deliveredBy: "",
    receivedBy: "",
    receivedByPhone: "",
    notes: "",
  });
  const [items, setItems] = useState([]);

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
        const raw = await getDeliveryNoteById(id);
        const note = normalizeDeliveryNote(raw);

        if (!mountedRef.current) return;

        setDocumentData(note);
        setForm({
          customerName: note.customerName || "",
          customerPhone: note.customerPhone || "",
          customerAddress: note.customerAddress || "",
          deliveredBy: note.deliveredBy || "",
          receivedBy: note.receivedBy || "",
          receivedByPhone: note.receivedByPhone || "",
          notes: note.notes || "",
        });
        setItems(note.items?.length ? note.items : [emptyItem()]);
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "Failed to load delivery note");
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
              [key]: key === "quantity" ? Number(value || 0) : value,
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
        Number(item.quantity || 0) > 0
    );
  }, [items]);

  async function onSubmit(e) {
    e.preventDefault();

    if (!form.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!normalizedItems.length) {
      toast.error("Add at least one valid delivery item");
      return;
    }

    try {
      setSaving(true);

      await updateDeliveryNote(id, {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || undefined,
        customerAddress: form.customerAddress.trim() || undefined,
        deliveredBy: form.deliveredBy.trim() || undefined,
        receivedBy: form.receivedBy.trim() || undefined,
        receivedByPhone: form.receivedByPhone.trim() || undefined,
        notes: form.notes.trim() || undefined,
        saleId: documentData?.saleId || undefined,
        items: normalizedItems.map((item) => ({
          productId: item.productId || undefined,
          productName: item.productName.trim(),
          serial: String(item.serial || "").trim() || undefined,
          quantity: Number(item.quantity || 1),
        })),
      });

      toast.success("Delivery note updated");
      navigate(`/app/documents/delivery-notes/${encodeURIComponent(id)}/preview`);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to update delivery note");
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
              Edit Delivery Note
            </h1>

            <p className={cn("mt-3 max-w-3xl text-sm leading-6 md:text-[15px]", muted())}>
              Update the handover details and delivered items while keeping the document clean and print-ready.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/app/documents/delivery-notes" className={smallBtn()}>
              Back to Delivery Notes
            </Link>
            <Link
              to={`/app/documents/delivery-notes/${encodeURIComponent(id)}/preview`}
              className={smallBtn()}
            >
              Preview
            </Link>
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <section className={cn(panel(), "p-4 md:p-5")}>
            <h2 className={cn("text-base font-semibold", strong())}>Document summary</h2>
            <p className={cn("mt-1 text-sm", muted())}>
              Review the delivery reference before saving changes.
            </p>

            <div className="mt-5 rounded-[20px] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Delivery note
                  </div>
                  <div className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">
                    {documentData?.number || "Delivery Note"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">
                    <span>Date: {formatDate(documentData?.date || documentData?.createdAt)}</span>
                    <span>{documentData?.saleId ? "Connected to a sale" : "Standalone delivery"}</span>
                  </div>
                </div>

                <span className={badgeClass("success")}>Delivery</span>
              </div>
            </div>
          </section>

          <section className={cn(panel(), "p-4 md:p-5")}>
            <h2 className={cn("text-base font-semibold", strong())}>Recipient details</h2>
            <p className={cn("mt-1 text-sm", muted())}>
              Keep the handover information accurate and customer-friendly.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass()}>Customer name</label>
                <input
                  value={form.customerName}
                  onChange={(e) => updateField("customerName", e.target.value)}
                  className={inputClass()}
                  placeholder="Customer or recipient"
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
                <label className={labelClass()}>Customer address</label>
                <input
                  value={form.customerAddress}
                  onChange={(e) => updateField("customerAddress", e.target.value)}
                  className={inputClass()}
                  placeholder="Delivery address"
                />
              </div>

              <div>
                <label className={labelClass()}>Delivered by</label>
                <input
                  value={form.deliveredBy}
                  onChange={(e) => updateField("deliveredBy", e.target.value)}
                  className={inputClass()}
                  placeholder="Staff member"
                />
              </div>

              <div>
                <label className={labelClass()}>Received by</label>
                <input
                  value={form.receivedBy}
                  onChange={(e) => updateField("receivedBy", e.target.value)}
                  className={inputClass()}
                  placeholder="Receiver name"
                />
              </div>

              <div>
                <label className={labelClass()}>Receiver phone</label>
                <input
                  value={form.receivedByPhone}
                  onChange={(e) => updateField("receivedByPhone", e.target.value)}
                  className={inputClass()}
                  placeholder="Receiver phone"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass()}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className={textareaClass()}
                  placeholder="Optional delivery note comments"
                  rows={5}
                />
              </div>
            </div>
          </section>

          <section className={cn(panel(), "p-4 md:p-5")}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className={cn("text-base font-semibold", strong())}>Delivered items</h2>
                <p className={cn("mt-1 text-sm", muted())}>
                  Keep the delivery items accurate so the printed document matches reality.
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
                        This row appears on the delivery note.
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

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <label className={labelClass()}>Product name</label>
                      <input
                        value={item.productName}
                        onChange={(e) => updateItem(index, "productName", e.target.value)}
                        className={inputClass()}
                        placeholder="Delivered item name"
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

                    <div className="md:col-span-3">
                      <label className={labelClass()}>Serial / identifier</label>
                      <input
                        value={item.serial}
                        onChange={(e) => updateItem(index, "serial", e.target.value)}
                        className={inputClass()}
                        placeholder="Serial number or identifier"
                      />
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
                Review before saving delivery note changes.
              </p>
            </div>

            <div className="mt-5 divide-y divide-[var(--color-border)]">
              <SummaryRow label="Document" value={documentData?.number || "—"} />
              <SummaryRow label="Customer" value={form.customerName || "—"} />
              <SummaryRow label="Delivered by" value={form.deliveredBy || "—"} />
              <SummaryRow label="Received by" value={form.receivedBy || "—"} />
              <SummaryRow label="Receiver phone" value={form.receivedByPhone || "—"} />
              <SummaryRow label="Items" value={String(normalizedItems.length)} />
              <SummaryRow
                label="Date"
                value={formatDate(documentData?.date || documentData?.createdAt)}
                strongValue
              />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <AsyncButton type="submit" loading={saving} loadingText="Saving..." variant="primary">
                Save Delivery Note
              </AsyncButton>

              <Link
                to={`/app/documents/delivery-notes/${encodeURIComponent(id)}/preview`}
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