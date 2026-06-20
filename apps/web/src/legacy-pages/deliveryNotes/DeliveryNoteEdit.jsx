import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { getDeliveryNoteById, updateDeliveryNote } from "../../services/deliveryNotesApi";
import "./DeliveryNotes.css";

function cleanText(value) {
  return String(value || "").trim();
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function EditSkeleton() {
  return (
    <div className="svx-delivery-page">
      <section className="svx-delivery-hero">
        <div className="svx-delivery-skeleton">
          <div className="svx-delivery-skeleton-line" style={{ width: 120 }} />
          <div className="svx-delivery-skeleton-line" style={{ width: 260, height: 32 }} />
          <div className="svx-delivery-skeleton-line" style={{ width: "70%" }} />
        </div>
      </section>

      <div className="svx-delivery-layout">
        <div className="svx-delivery-main">
          <div className="svx-delivery-skeleton-card" />
          <div className="svx-delivery-skeleton-card" />
          <div className="svx-delivery-skeleton-card" />
        </div>
        <div className="svx-delivery-skeleton-card" />
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
        cleanText(item.productName) &&
        Number(item.quantity || 0) > 0
    );
  }, [items]);

  async function onSubmit(e) {
    e.preventDefault();

    if (!cleanText(form.customerName)) {
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
        customerName: cleanText(form.customerName),
        customerPhone: cleanText(form.customerPhone) || undefined,
        customerAddress: cleanText(form.customerAddress) || undefined,
        deliveredBy: cleanText(form.deliveredBy) || undefined,
        receivedBy: cleanText(form.receivedBy) || undefined,
        receivedByPhone: cleanText(form.receivedByPhone) || undefined,
        notes: cleanText(form.notes) || undefined,
        saleId: documentData?.saleId || undefined,
        items: normalizedItems.map((item) => ({
          productId: item.productId || undefined,
          productName: cleanText(item.productName),
          serial: cleanText(item.serial) || undefined,
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

  if (loading) return <EditSkeleton />;

  return (
    <div className="svx-delivery-page">
      <section className="svx-delivery-hero">
        <div className="svx-delivery-hero-inner">
          <div>
            <p className="svx-delivery-eyebrow">Document editing</p>
            <h1 className="svx-delivery-title">Edit delivery note</h1>
            <p className="svx-delivery-subtitle">
              Update the handover details and delivered items while keeping this document clean,
              traceable, and separate from payment information.
            </p>
          </div>

          <div className="svx-delivery-actions">
            <SmallLink to="/app/documents/delivery-notes">Delivery notes</SmallLink>
            <SmallLink to={`/app/documents/delivery-notes/${encodeURIComponent(id)}/preview`}>
              Preview
            </SmallLink>
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className="svx-delivery-layout">
        <div className="svx-delivery-main">
          <section className="svx-delivery-panel">
            <div className="svx-delivery-section-head">
              <div>
                <h2>Document reference</h2>
                <p>Review the delivery note reference before saving changes.</p>
              </div>
              <span className="svx-delivery-badge is-success">Delivery</span>
            </div>

            <div className="svx-delivery-reference-card">
              <div className="svx-delivery-reference-main">
                <div>
                  <strong>{documentData?.number || "Delivery note"}</strong>
                  <p>{documentData?.saleId ? "Connected to a sale" : "Standalone delivery"}</p>
                  <div className="svx-delivery-reference-meta">
                    <span>Date: {formatDate(documentData?.date || documentData?.createdAt)}</span>
                  </div>
                </div>
                <span className="svx-delivery-badge is-success">Active</span>
              </div>
            </div>
          </section>

          <section className="svx-delivery-panel">
            <div className="svx-delivery-section-head">
              <div>
                <h2>Recipient details</h2>
                <p>Keep the handover information accurate and customer-friendly.</p>
              </div>
            </div>

            <div className="svx-delivery-form-grid">
              <div className="svx-delivery-field svx-delivery-span-2">
                <label>Customer name</label>
                <input
                  value={form.customerName}
                  onChange={(e) => updateField("customerName", e.target.value)}
                  className="svx-delivery-input"
                  placeholder="Customer or recipient"
                  required
                />
              </div>

              <div className="svx-delivery-field">
                <label>Customer phone</label>
                <input
                  value={form.customerPhone}
                  onChange={(e) => updateField("customerPhone", e.target.value)}
                  className="svx-delivery-input"
                  placeholder="Phone number"
                />
              </div>

              <div className="svx-delivery-field">
                <label>Delivery location</label>
                <input
                  value={form.customerAddress}
                  onChange={(e) => updateField("customerAddress", e.target.value)}
                  className="svx-delivery-input"
                  placeholder="Delivery address"
                />
              </div>

              <div className="svx-delivery-field">
                <label>Delivered by</label>
                <input
                  value={form.deliveredBy}
                  onChange={(e) => updateField("deliveredBy", e.target.value)}
                  className="svx-delivery-input"
                  placeholder="Staff member"
                />
              </div>

              <div className="svx-delivery-field">
                <label>Received by</label>
                <input
                  value={form.receivedBy}
                  onChange={(e) => updateField("receivedBy", e.target.value)}
                  className="svx-delivery-input"
                  placeholder="Receiver name"
                />
              </div>

              <div className="svx-delivery-field">
                <label>Receiver phone</label>
                <input
                  value={form.receivedByPhone}
                  onChange={(e) => updateField("receivedByPhone", e.target.value)}
                  className="svx-delivery-input"
                  placeholder="Receiver phone"
                />
              </div>

              <div className="svx-delivery-field svx-delivery-span-2">
                <label>Delivery notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className="svx-delivery-textarea"
                  placeholder="Optional delivery note comments"
                  rows={5}
                />
              </div>
            </div>
          </section>

          <section className="svx-delivery-panel">
            <div className="svx-delivery-section-head">
              <div>
                <h2>Delivered items</h2>
                <p>Keep delivered items accurate so the printed note matches reality.</p>
              </div>

              <button type="button" onClick={addItem} className="svx-delivery-button">
                Add item
              </button>
            </div>

            <div className="svx-delivery-lines">
              {items.map((item, index) => (
                <article key={item.key} className="svx-delivery-line-card">
                  <div className="svx-delivery-line-head">
                    <div>
                      <strong>Item {index + 1}</strong>
                      <p>This row appears on the delivery note.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
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
                        value={item.productName}
                        onChange={(e) => updateItem(index, "productName", e.target.value)}
                        className="svx-delivery-input"
                        placeholder="Delivered item name"
                      />
                    </div>

                    <div className="svx-delivery-field">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="svx-delivery-input"
                        placeholder="1"
                      />
                    </div>

                    <div className="svx-delivery-field is-full">
                      <label>Serial or identifier</label>
                      <input
                        value={item.serial}
                        onChange={(e) => updateItem(index, "serial", e.target.value)}
                        className="svx-delivery-input"
                        placeholder="Serial number or identifier"
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
            <h2>Review before saving</h2>
            <p>Confirm the delivery note before saving changes.</p>

            <div className="svx-delivery-summary-list">
              <SummaryRow label="Document" value={documentData?.number} />
              <SummaryRow label="Customer" value={form.customerName} />
              <SummaryRow label="Delivered by" value={form.deliveredBy} />
              <SummaryRow label="Received by" value={form.receivedBy} />
              <SummaryRow label="Receiver phone" value={form.receivedByPhone} />
              <SummaryRow label="Items" value={String(normalizedItems.length)} />
              <SummaryRow label="Date" value={formatDate(documentData?.date || documentData?.createdAt)} strong />
            </div>

            <div className="svx-delivery-submit-actions">
              <AsyncButton type="submit" loading={saving} loadingText="Saving..." variant="primary">
                Save delivery note
              </AsyncButton>

              <SmallLink to={`/app/documents/delivery-notes/${encodeURIComponent(id)}/preview`}>
                Cancel
              </SmallLink>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}
