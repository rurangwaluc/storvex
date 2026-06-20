import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { getDeliveryNoteById, openDeliveryNotePrint } from "../../services/deliveryNotesApi";
import "./DeliveryNotes.css";

function safeStr(value) {
  return value == null ? "" : String(value);
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

function SmallLink({ to, children, primary = false }) {
  return (
    <Link to={to} className={`svx-delivery-link-button${primary ? " is-primary" : ""}`}>
      {children}
    </Link>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="svx-delivery-summary-row">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function ViewSkeleton() {
  return (
    <div className="svx-delivery-page">
      <section className="svx-delivery-hero">
        <div className="svx-delivery-skeleton">
          <div className="svx-delivery-skeleton-line" style={{ width: 140 }} />
          <div className="svx-delivery-skeleton-line" style={{ width: 280, height: 32 }} />
          <div className="svx-delivery-skeleton-line" style={{ width: "72%" }} />
        </div>
      </section>

      <section className="svx-delivery-print-card">
        <div className="svx-delivery-skeleton-card" />
      </section>
    </div>
  );
}

export default function DeliveryNoteView() {
  const { id } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState(null);
  const [printing, setPrinting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await getDeliveryNoteById(String(id));
      setNote(data?.deliveryNote || data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load delivery note");
      setNote(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNote(null);
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleProfessionalPrint() {
    if (!id || printing) return;

    const token = localStorage.getItem("tenantToken") || localStorage.getItem("token");
    if (!token) {
      toast.error("Please login again");
      nav("/login", { replace: true });
      return;
    }

    try {
      setPrinting(true);
      openDeliveryNotePrint(id);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to open print view");
    } finally {
      setTimeout(() => setPrinting(false), 350);
    }
  }

  const items = useMemo(() => {
    if (Array.isArray(note?.items)) return note.items;
    if (Array.isArray(note?.DeliveryNoteItem)) return note.DeliveryNoteItem;
    return [];
  }, [note]);

  if (loading) return <ViewSkeleton />;

  if (!note) {
    return (
      <div className="svx-delivery-page">
        <section className="svx-delivery-hero">
          <div className="svx-delivery-hero-inner">
            <div>
              <p className="svx-delivery-eyebrow">Delivery document</p>
              <h1 className="svx-delivery-title">Delivery note not found</h1>
              <p className="svx-delivery-subtitle">
                The document may have been removed or is no longer available.
              </p>
            </div>
            <div className="svx-delivery-actions">
              <SmallLink to="/app/documents/delivery-notes">Back to delivery notes</SmallLink>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="svx-delivery-page">
      <section className="svx-delivery-hero svx-delivery-no-print">
        <div className="svx-delivery-hero-inner">
          <div>
            <p className="svx-delivery-eyebrow">Delivery document</p>
            <h1 className="svx-delivery-title">Delivery note preview</h1>
            <p className="svx-delivery-subtitle">
              Review the handover, delivered items, receiver details, and signatures before printing.
            </p>
          </div>

          <div className="svx-delivery-actions">
            <SmallLink to="/app/documents/delivery-notes">Delivery notes</SmallLink>
            <SmallLink to={`/app/documents/delivery-notes/${encodeURIComponent(id)}/edit`}>
              Edit
            </SmallLink>

            <AsyncButton
              type="button"
              loading={printing}
              loadingText="Opening..."
              variant="secondary"
              onClick={handleProfessionalPrint}
            >
              Professional print
            </AsyncButton>

            <AsyncButton type="button" variant="primary" onClick={() => window.print()}>
              Print
            </AsyncButton>
          </div>
        </div>
      </section>

      <section className="svx-delivery-print-card">
        <div className="svx-delivery-print-head">
          <div>
            <div className="svx-delivery-brand-title">Storvex</div>
            <div className="svx-delivery-brand-subtitle">Delivery note</div>
          </div>

          <div className="svx-delivery-print-meta">
            <label>Number</label>
            <strong>{note.number || "—"}</strong>
            <label>Date</label>
            <strong>{formatDate(note.date || note.createdAt)}</strong>
          </div>
        </div>

        <div className="svx-delivery-view-grid">
          <article className="svx-delivery-info-card">
            <p className="svx-delivery-info-label">Deliver to</p>
            <div className="svx-delivery-info-value">{note.customerName || "—"}</div>
            <div className="svx-delivery-info-muted">{note.customerPhone || "—"}</div>
            <div className="svx-delivery-info-muted">{note.customerAddress || "—"}</div>
          </article>

          <article className="svx-delivery-info-card">
            <p className="svx-delivery-info-label">Delivery info</p>
            <div className="svx-delivery-summary-list">
              <SummaryRow label="Delivered by" value={note.deliveredBy} />
              <SummaryRow label="Received by" value={note.receivedBy} />
              <SummaryRow label="Receiver phone" value={note.receivedByPhone} />
            </div>
          </article>
        </div>

        <div className="svx-delivery-items-head">
          <h2>Delivered items</h2>
          <span className="svx-delivery-badge is-success">{items.length} items</span>
        </div>

        <div className="svx-delivery-table-wrap">
          <table className="svx-delivery-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Serial or identifier</th>
                <th className="is-right">Qty</th>
              </tr>
            </thead>

            <tbody>
              {items.length ? (
                items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{index + 1}</td>
                    <td><strong>{safeStr(item.productName) || "—"}</strong></td>
                    <td>{item.serial || "—"}</td>
                    <td className="is-right"><strong>{item.quantity ?? 1}</strong></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="svx-delivery-notes-box">
          <label>Notes</label>
          <div>{note.notes || "—"}</div>
        </div>

        <div className="svx-delivery-signatures">
          <div className="svx-delivery-signature-line">
            <span>Delivered by signature</span>
          </div>

          <div className="svx-delivery-signature-line">
            <span>Received by signature</span>
          </div>
        </div>

        <div className="svx-delivery-footer-note">
          Generated by Storvex. Keep this document as proof of delivery.
        </div>
      </section>
    </div>
  );
}
