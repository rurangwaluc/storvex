import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { cn } from "../../lib/cn";
import { createDeliveryNote } from "../../services/deliveryNotesApi";
import { searchProducts } from "../../services/inventoryApi";

const strong = () => "text-[var(--color-text)]";
const muted = () => "text-[var(--color-text-muted)]";
const soft = () => "text-[var(--color-text-soft)]";
const shell = () => "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
const panel = () => "rounded-[24px] bg-[var(--color-surface-2)]";

function labelClass() {
  return cn("mb-1.5 block text-sm font-medium", strong());
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
  return "inline-flex h-9 items-center justify-center rounded-xl bg-[var(--color-card)] px-3 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
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

function ProductSearchResult({ product, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="block w-full border-b border-[var(--color-border)] px-4 py-3 text-left transition last:border-b-0 hover:bg-[var(--color-surface-2)]"
    >
      <div className={cn("text-sm font-semibold", strong())}>{product.name}</div>
      <div className={cn("mt-1 text-xs", muted())}>
        {product.category || "No category"} • Available stock: {product.stockQty ?? 0}
      </div>
    </button>
  );
}

export default function DeliveryNoteCreate() {
  const nav = useNavigate();
  const debounceRef = useRef(null);

  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [receivedByPhone, setReceivedByPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState([emptyItem()]);

  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [targetRow, setTargetRow] = useState(0);

  const canSearch = useMemo(() => searchQ.trim().length > 0, [searchQ]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function runSearch(q) {
    try {
      setSearching(true);
      const data = await searchProducts(q, 20);
      setResults(Array.isArray(data?.products) ? data.products : []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function setItem(index, key, value) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  }

  function addRow() {
    setItems((prev) => {
      const nextIndex = prev.length;
      setTargetRow(nextIndex);
      return [...prev, emptyItem()];
    });
  }

  function removeRow(index) {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });

    setTargetRow((prev) => {
      if (prev === index) return 0;
      if (prev > index) return prev - 1;
      return prev;
    });
  }

  function pickProduct(index, product) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId: product.id || "",
              productName: product.name || "",
            }
          : item
      )
    );

    setSearchQ("");
    setResults([]);
  }

  const normalizedItems = useMemo(() => {
    return items
      .map((item) => ({
        productId: item.productId || null,
        productName: String(item.productName || "").trim(),
        serial: String(item.serial || "").trim() || null,
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.productName);
  }, [items]);

  async function submit(e) {
    e.preventDefault();
    if (saving) return;

    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (normalizedItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    for (const item of normalizedItems) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        toast.error("Quantity must be greater than 0");
        return;
      }
    }

    try {
      setSaving(true);

      const data = await createDeliveryNote({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        customerAddress: customerAddress.trim() || null,
        deliveredBy: deliveredBy.trim() || null,
        receivedBy: receivedBy.trim() || null,
        receivedByPhone: receivedByPhone.trim() || null,
        notes: notes.trim() || null,
        items: normalizedItems,
      });

      toast.success("Delivery note created");

      const id = data?.deliveryNote?.id;
      if (id) {
        nav(`/app/documents/delivery-notes/${encodeURIComponent(id)}/preview`);
        return;
      }

      nav("/app/documents/delivery-notes");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to create delivery note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={cn(shell(), "overflow-hidden p-5 md:p-6")}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", soft())}>
              Document creation
            </div>

            <h1 className={cn("mt-2 text-2xl font-semibold tracking-tight md:text-3xl", strong())}>
              New Delivery Note
            </h1>

            <p className={cn("mt-3 max-w-3xl text-sm leading-6 md:text-[15px]", muted())}>
              Create proof that goods moved from your store to the customer. Keep the
              handover clean, traceable, and print-ready.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/app/documents/delivery-notes" className={smallBtn()}>
              Back to Delivery Notes
            </Link>
            <Link to="/app/documents" className={smallBtn()}>
              Document Centre
            </Link>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <section className={cn(panel(), "p-4 md:p-5")}>
            <h2 className={cn("text-base font-semibold", strong())}>Recipient details</h2>
            <p className={cn("mt-1 text-sm", muted())}>
              These details appear on the delivery note and confirm who received the goods.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass()}>Customer name</label>
                <input
                  className={inputClass()}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer or recipient"
                  required
                />
              </div>

              <div>
                <label className={labelClass()}>Customer phone</label>
                <input
                  className={inputClass()}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+2507..."
                />
              </div>

              <div>
                <label className={labelClass()}>Customer address</label>
                <input
                  className={inputClass()}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Kigali..."
                />
              </div>

              <div>
                <label className={labelClass()}>Delivered by</label>
                <input
                  className={inputClass()}
                  value={deliveredBy}
                  onChange={(e) => setDeliveredBy(e.target.value)}
                  placeholder="Staff member"
                />
              </div>

              <div>
                <label className={labelClass()}>Received by</label>
                <input
                  className={inputClass()}
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder="Customer or representative"
                />
              </div>

              <div>
                <label className={labelClass()}>Receiver phone</label>
                <input
                  className={inputClass()}
                  value={receivedByPhone}
                  onChange={(e) => setReceivedByPhone(e.target.value)}
                  placeholder="Receiver phone"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass()}>Notes</label>
                <textarea
                  className={textareaClass()}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Example: deliver before 5pm, fragile package, signed on arrival..."
                  rows={5}
                />
              </div>
            </div>
          </section>

          <section className={cn(panel(), "p-4 md:p-5")}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className={cn("text-base font-semibold", strong())}>Items</h2>
                <p className={cn("mt-1 text-sm", muted())}>
                  Choose the row first, then use search to fill it faster from inventory.
                </p>
              </div>

              <button type="button" onClick={addRow} className={smallBtn()}>
                Add item
              </button>
            </div>

            <div className="mt-5 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div>
                <label className={labelClass()}>Find product</label>
                <div className={cn("-mt-1 text-xs", soft())}>
                  Fill item <span className="font-semibold">#{targetRow + 1}</span>
                </div>
              </div>

              <input
                className={cn(inputClass(), "mt-3")}
                value={searchQ}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQ(value);

                  const trimmed = value.trim();
                  if (!trimmed) {
                    setResults([]);
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    return;
                  }

                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  debounceRef.current = setTimeout(() => runSearch(trimmed), 250);
                }}
                placeholder="Type product name, model, or brand..."
              />

              {canSearch ? (
                <div className="mt-3">
                  {searching ? (
                    <div className={cn("text-sm", muted())}>Searching...</div>
                  ) : results.length === 0 ? (
                    <div className={cn("text-sm", muted())}>No results.</div>
                  ) : (
                    <div className="max-h-56 overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]">
                      {results.map((product) => (
                        <ProductSearchResult
                          key={product.id}
                          product={product}
                          onPick={() => pickProduct(targetRow, product)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
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
                        This line will appear on the delivery note.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeRow(index)}
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
                        className={cn(
                          inputClass(),
                          index === targetRow &&
                            "border-emerald-400 ring-2 ring-emerald-100 dark:ring-emerald-900/20"
                        )}
                        value={item.productName}
                        onFocus={() => setTargetRow(index)}
                        onChange={(e) => setItem(index, "productName", e.target.value)}
                        placeholder="Delivered item name"
                      />
                      <div className={cn("mt-1 text-xs", soft())}>
                        {item.productId ? "Selected from inventory" : "Manual item"}
                      </div>
                    </div>

                    <div>
                      <label className={labelClass()}>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        className={inputClass()}
                        value={item.quantity}
                        onChange={(e) => setItem(index, "quantity", Number(e.target.value || 1))}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className={labelClass()}>Serial / identifier</label>
                      <input
                        className={inputClass()}
                        value={item.serial}
                        onChange={(e) => setItem(index, "serial", e.target.value)}
                        placeholder="Only if item has serial or unique identifier"
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
                Review before creating the delivery note.
              </p>
            </div>

            <div className="mt-5 divide-y divide-[var(--color-border)]">
              <SummaryRow label="Customer" value={customerName || "—"} />
              <SummaryRow label="Customer phone" value={customerPhone || "—"} />
              <SummaryRow label="Delivered by" value={deliveredBy || "—"} />
              <SummaryRow label="Received by" value={receivedBy || "—"} />
              <SummaryRow label="Receiver phone" value={receivedByPhone || "—"} />
              <SummaryRow label="Items" value={String(normalizedItems.length)} strongValue />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <AsyncButton type="submit" loading={saving} loadingText="Saving..." variant="primary">
                Create Delivery Note
              </AsyncButton>

              <Link
                to="/app/documents/delivery-notes"
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