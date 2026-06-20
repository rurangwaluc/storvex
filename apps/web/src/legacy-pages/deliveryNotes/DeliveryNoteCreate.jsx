import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { createDeliveryNote } from "../../services/deliveryNotesApi";
import { searchProducts } from "../../services/inventoryApi";
import "./DeliveryNotes.css";

function emptyItem() {
  return {
    key: `new-${Math.random().toString(36).slice(2, 10)}`,
    productId: "",
    productName: "",
    serial: "",
    quantity: 1,
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function SmallLink({ to, children, primary = false }) {
  return (
    <Link to={to} className={`svx-delivery-link-button${primary ? " is-primary" : ""}`}>
      {children}
    </Link>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="svx-delivery-summary-row">
      <span>{label}</span>
      <strong>{strong ? value : value || "—"}</strong>
    </div>
  );
}

function ProductSearchResult({ product, onPick }) {
  return (
    <button type="button" onClick={onPick} className="svx-delivery-result-button">
      <strong>{product.name || "Unnamed product"}</strong>
      <span>
        {product.category || "No category"} | Available stock: {product.stockQty ?? 0}
      </span>
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
        productName: cleanText(item.productName),
        serial: cleanText(item.serial) || null,
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.productName);
  }, [items]);

  async function submit(e) {
    e.preventDefault();
    if (saving) return;

    if (!cleanText(customerName)) {
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
        customerName: cleanText(customerName),
        customerPhone: cleanText(customerPhone) || null,
        customerAddress: cleanText(customerAddress) || null,
        deliveredBy: cleanText(deliveredBy) || null,
        receivedBy: cleanText(receivedBy) || null,
        receivedByPhone: cleanText(receivedByPhone) || null,
        notes: cleanText(notes) || null,
        items: normalizedItems,
      });

      toast.success("Delivery note created");

      const noteId = data?.deliveryNote?.id;
      if (noteId) {
        nav(`/app/documents/delivery-notes/${encodeURIComponent(noteId)}/preview`);
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
    <div className="svx-delivery-page">
      <section className="svx-delivery-hero">
        <div className="svx-delivery-hero-inner">
          <div>
            <p className="svx-delivery-eyebrow">Document creation</p>
            <h1 className="svx-delivery-title">New delivery note</h1>
            <p className="svx-delivery-subtitle">
              Create proof that goods moved from your store to the customer. Keep the handover clean,
              traceable, and print-ready. No money, prices, totals, tax, or payment fields belong here.
            </p>
          </div>

          <div className="svx-delivery-actions">
            <SmallLink to="/app/documents/delivery-notes">Delivery notes</SmallLink>
            <SmallLink to="/app/documents">Document center</SmallLink>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="svx-delivery-layout">
        <div className="svx-delivery-main">
          <section className="svx-delivery-panel">
            <div className="svx-delivery-section-head">
              <div>
                <h2>Recipient details</h2>
                <p>These details confirm where the goods went and who received them.</p>
              </div>
              <span className="svx-delivery-badge is-warning">No money fields</span>
            </div>

            <div className="svx-delivery-form-grid">
              <div className="svx-delivery-field svx-delivery-span-2">
                <label>Customer name</label>
                <input
                  className="svx-delivery-input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer or recipient"
                  required
                />
              </div>

              <div className="svx-delivery-field">
                <label>Customer phone</label>
                <input
                  className="svx-delivery-input"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+2507..."
                />
              </div>

              <div className="svx-delivery-field">
                <label>Delivery location</label>
                <input
                  className="svx-delivery-input"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Kigali, shop, site, or customer address"
                />
              </div>

              <div className="svx-delivery-field">
                <label>Delivered by</label>
                <input
                  className="svx-delivery-input"
                  value={deliveredBy}
                  onChange={(e) => setDeliveredBy(e.target.value)}
                  placeholder="Staff member"
                />
              </div>

              <div className="svx-delivery-field">
                <label>Received by</label>
                <input
                  className="svx-delivery-input"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder="Customer or representative"
                />
              </div>

              <div className="svx-delivery-field">
                <label>Receiver phone</label>
                <input
                  className="svx-delivery-input"
                  value={receivedByPhone}
                  onChange={(e) => setReceivedByPhone(e.target.value)}
                  placeholder="Receiver phone"
                />
              </div>

              <div className="svx-delivery-field svx-delivery-span-2">
                <label>Delivery notes</label>
                <textarea
                  className="svx-delivery-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Example: fragile package, signed on arrival, leave with store manager..."
                  rows={5}
                />
              </div>
            </div>
          </section>

          <section className="svx-delivery-panel">
            <div className="svx-delivery-section-head">
              <div>
                <h2>Delivered items</h2>
                <p>Choose the row first, then use search to fill it faster from inventory.</p>
              </div>

              <button type="button" onClick={addRow} className="svx-delivery-button">
                Add item
              </button>
            </div>

            <div className="svx-delivery-search-box">
              <div className="svx-delivery-search-top">
                <div>
                  <label className="svx-delivery-label">Find product</label>
                  <p className="svx-delivery-help">Search fills item #{targetRow + 1}</p>
                </div>
                <span className="svx-delivery-target-pill">Target row {targetRow + 1}</span>
              </div>

              <input
                className="svx-delivery-input"
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
                placeholder="Type product name, model, code, or brand..."
              />

              {canSearch ? (
                <div className="svx-delivery-result-list">
                  {searching ? (
                    <div className="svx-delivery-empty">Searching...</div>
                  ) : results.length === 0 ? (
                    <div className="svx-delivery-empty">No products found.</div>
                  ) : (
                    results.map((product) => (
                      <ProductSearchResult
                        key={product.id}
                        product={product}
                        onPick={() => pickProduct(targetRow, product)}
                      />
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <div className="svx-delivery-lines">
              {items.map((item, index) => (
                <article key={item.key} className="svx-delivery-line-card">
                  <div className="svx-delivery-line-head">
                    <div>
                      <strong>Item {index + 1}</strong>
                      <p>{item.productId ? "Selected from inventory" : "Manual delivery item"}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="svx-delivery-button is-danger"
                      disabled={items.length <= 1}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="svx-delivery-line-grid">
                    <div className="svx-delivery-field">
                      <label>Product name</label>
                      <input
                        className={`svx-delivery-input${index === targetRow ? " is-active" : ""}`}
                        value={item.productName}
                        onFocus={() => setTargetRow(index)}
                        onChange={(e) => setItem(index, "productName", e.target.value)}
                        placeholder="Delivered item name"
                      />
                    </div>

                    <div className="svx-delivery-field">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        className="svx-delivery-input"
                        value={item.quantity}
                        onChange={(e) => setItem(index, "quantity", Number(e.target.value || 1))}
                      />
                    </div>

                    <div className="svx-delivery-field is-full">
                      <label>Serial or identifier</label>
                      <input
                        className="svx-delivery-input"
                        value={item.serial}
                        onChange={(e) => setItem(index, "serial", e.target.value)}
                        placeholder="Only when the item has a serial number or unique identifier"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="svx-delivery-side">
          <section className="svx-delivery-summary">
            <h2>Review before creating</h2>
            <p>Confirm the handover information before saving the delivery note.</p>

            <div className="svx-delivery-summary-list">
              <SummaryRow label="Customer" value={customerName} />
              <SummaryRow label="Customer phone" value={customerPhone} />
              <SummaryRow label="Delivered by" value={deliveredBy} />
              <SummaryRow label="Received by" value={receivedBy} />
              <SummaryRow label="Receiver phone" value={receivedByPhone} />
              <SummaryRow label="Items" value={String(normalizedItems.length)} strong />
            </div>

            <div className="svx-delivery-submit-actions">
              <AsyncButton type="submit" loading={saving} loadingText="Saving..." variant="primary">
                Create delivery note
              </AsyncButton>

              <SmallLink to="/app/documents/delivery-notes">Cancel</SmallLink>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}
