import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { deleteDeliveryNote } from "../../services/deliveryNotesApi";
import { deleteProforma } from "../../services/proformasApi";
import { deleteWarranty } from "../../services/warrantiesApi";
import { openDocumentPrint } from "../../services/documentPrint";
import "./DocumentListPage.css";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatDate(value) {
  const date = safeDate(value);
  return date
    ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
}

function isToday(value) {
  const date = safeDate(value);
  if (!date) return false;
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function formatMoney(value, currency = "RWF") {
  return `${currency} ${Number(value || 0).toLocaleString()}`;
}

function statusKind(status) {
  const value = String(status || "").toUpperCase();
  if (["PAID", "COMPLETED", "CONVERTED", "ACTIVE", "SENT", "DELIVERED"].includes(value)) return "success";
  if (["PARTIAL", "DRAFT", "PENDING", "UNPAID", "EXPIRING"].includes(value)) return "warning";
  if (["CANCELLED", "EXPIRED", "OVERDUE", "RETURNED"].includes(value)) return "danger";
  return "neutral";
}

function StatusPill({ status, tone }) {
  const finalTone = tone || statusKind(status);
  return <span className={cx("svx-doc-list-status", `is-${finalTone}`)}>{status || "—"}</span>;
}

function DocumentSkeleton({ rows = 6 }) {
  return (
    <section className="svx-doc-list-stack">
      {Array.from({ length: rows }).map((_, index) => (
        <article key={index} className="svx-doc-list-row is-loading">
          <div className="svx-doc-list-skeleton-icon" />
          <div>
            <div className="svx-doc-list-skeleton-line is-title" />
            <div className="svx-doc-list-skeleton-line" />
            <div className="svx-doc-list-skeleton-line is-short" />
          </div>
        </article>
      ))}
    </section>
  );
}

function KpiCard({ label, value, loading, tone = "primary" }) {
  return (
    <article className={cx("svx-doc-list-kpi", `is-${tone}`)}>
      <span>{label}</span>
      {loading ? <i /> : <strong>{value}</strong>}
    </article>
  );
}

function EmptyState({ type, title, query, createTo, createLabel }) {
  const shortCode = type === "delivery-notes" ? "DN" : type === "proformas" ? "PF" : type === "warranties" ? "WR" : "DC";

  return (
    <section className="svx-doc-list-empty">
      <div className="svx-doc-list-empty-icon">{shortCode}</div>
      <h2>{query ? `No ${title.toLowerCase()} found` : `No ${title.toLowerCase()} yet`}</h2>
      <p>
        {query
          ? `No records match "${query}". Try another customer name, phone, or document number.`
          : "When documents exist, they will appear here for preview, printing, editing, and owner review."}
      </p>
      <div className="svx-doc-list-empty-actions">
        {createTo ? <Link to={createTo} className="svx-doc-list-button is-primary">{createLabel || "Create document"}</Link> : null}
        <Link to="/app/documents" className="svx-doc-list-button">Back to document center</Link>
      </div>
    </section>
  );
}

function ConfirmDeleteModal({ open, title, body, deleting, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="svx-doc-list-modal" role="dialog" aria-modal="true">
      <button type="button" className="svx-doc-list-modal-backdrop" aria-label="Close delete confirmation" onClick={deleting ? undefined : onCancel} />
      <div className="svx-doc-list-modal-card">
        <p className="svx-doc-list-eyebrow">Confirm action</p>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="svx-doc-list-modal-actions">
          <AsyncButton variant="secondary" onClick={onCancel} disabled={deleting}>Cancel</AsyncButton>
          <AsyncButton loading={deleting} loadingText="Deleting…" onClick={onConfirm} className="svx-doc-list-button is-danger">Delete</AsyncButton>
        </div>
      </div>
    </div>
  );
}

function normalizeListResponse(type, data) {
  if (type === "receipts") return Array.isArray(data?.receipts) ? data.receipts : [];
  if (type === "invoices") return Array.isArray(data?.invoices) ? data.invoices : [];
  if (type === "proformas") return Array.isArray(data?.proformas) ? data.proformas : [];
  if (type === "warranties") return Array.isArray(data?.warranties) ? data.warranties : [];
  if (type === "delivery-notes") return Array.isArray(data?.deliveryNotes) ? data.deliveryNotes : [];
  return [];
}

function getTypeMeta(type) {
  const meta = {
    receipts: {
      code: "RC", heroTone: "success", actionLabel: "Open sales", actionTo: "/app/pos/sales", statLabel: "Payment records", canCreate: false, canEdit: false, canDelete: false, singularLabel: "receipt", listNote: "Payment proof created from completed sales.",
    },
    invoices: {
      code: "IV", heroTone: "primary", actionLabel: "Open sales", actionTo: "/app/pos/sales", statLabel: "Billing records", canCreate: false, canEdit: false, canDelete: false, singularLabel: "invoice", listNote: "Formal billing records and customer payment proof.",
    },
    "delivery-notes": {
      code: "DN", heroTone: "warning", actionLabel: "Create delivery note", actionTo: "/app/documents/delivery-notes/create", statLabel: "Goods handover", canCreate: true, canEdit: true, canDelete: true, singularLabel: "delivery note", listNote: "Track goods handover proof, receiver details, delivered items, and signatures. Delivery notes do not show money, prices, tax, totals, or payment fields.",
    },
    proformas: {
      code: "PF", heroTone: "primary", actionLabel: "Create proforma", actionTo: "/app/documents/proformas/create", statLabel: "Quotations", canCreate: true, canEdit: true, canDelete: true, singularLabel: "proforma", listNote: "Manage pre-sale quotations, validity, customer requests, and conversion-ready offers.",
    },
    warranties: {
      code: "WR", heroTone: "success", actionLabel: "Create warranty", actionTo: "/app/documents/warranties/create", statLabel: "After-sales proof", canCreate: true, canEdit: true, canDelete: true, singularLabel: "warranty", listNote: "Track after-sales coverage, customer ownership, protected items, and warranty proof.",
    },
  };

  return meta[type] || {
    code: "DC", heroTone: "neutral", actionLabel: null, actionTo: null, statLabel: "Documents", canCreate: false, canEdit: false, canDelete: false, singularLabel: "document", listNote: "Preview, print, and manage business documents.",
  };
}

function getItemCount(item) {
  const direct = Number(item?.itemsCount ?? item?.itemCount ?? item?._count?.items ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  if (Array.isArray(item?.items)) return item.items.length;
  return 0;
}

function buildCards(type, rows) {
  if (type === "warranties") {
    return rows.map((item) => ({
      id: item.id,
      code: "WR",
      title: item.number || "Warranty",
      subtitle: item.customerName || item.customer?.name || "Walk-in customer",
      contact: item.customerPhone || item.customer?.phone || "—",
      staff: item.cashierName || item.issuedBy || "—",
      status: item.policy || item.status || "Warranty",
      amount: item.endsAt ? `Ends ${formatDate(item.endsAt)}` : "No end date",
      createdAt: item.createdAt,
      note: item.unitsCount ? `${item.unitsCount} covered units` : "Coverage record",
      metricLabel: "Coverage",
      metricValue: item.unitsCount ? `${item.unitsCount} units` : "Warranty proof",
      tone: "success",
    }));
  }

  if (type === "proformas") {
    return rows.map((item) => ({
      id: item.id,
      code: "PF",
      title: item.number || "Proforma",
      subtitle: item.customerName || item.customer?.name || "Customer",
      contact: item.customerPhone || item.customer?.phone || item.customerEmail || "—",
      staff: item.preparedBy || item.cashierName || "—",
      status: item.status || "DRAFT",
      amount: formatMoney(item.total, item.currency || "RWF"),
      numericTotal: Number(item.total || 0),
      currency: item.currency || "RWF",
      createdAt: item.createdAt,
      validUntil: item.validUntil || null,
      note: item.validUntil ? `Valid until ${formatDate(item.validUntil)}` : "No validity date",
      metricLabel: "Total",
      metricValue: formatMoney(item.total, item.currency || "RWF"),
      tone: "primary",
    }));
  }

  if (type === "delivery-notes") {
    return rows.map((item) => {
      const receivedBy = item.receivedBy || item.receiverName || "";
      const itemCount = getItemCount(item);
      return {
        id: item.id,
        code: "DN",
        title: item.number || "Delivery note",
        subtitle: item.customerName || item.customer?.name || "Customer",
        contact: item.customerPhone || item.customer?.phone || "—",
        staff: item.deliveredBy || item.cashierName || "—",
        status: item.status || "DELIVERED",
        amount: itemCount ? `${itemCount} items` : "Delivery proof",
        itemCount,
        createdAt: item.date || item.createdAt,
        receiver: receivedBy || "—",
        receiverPhone: item.receivedByPhone || item.receiverPhone || "—",
        location: item.customerAddress || item.deliveryLocation || "—",
        signed: Boolean(receivedBy),
        note: receivedBy ? `Received by ${receivedBy}` : "Receiver not recorded",
        metricLabel: "Items",
        metricValue: itemCount || "—",
        tone: "warning",
      };
    });
  }

  return rows.map((item) => ({
    id: item.id,
    code: type === "receipts" ? "RC" : "IV",
    title: item.number || `${type.slice(0, -1)} document`,
    subtitle: item.customerName || item.customer?.name || "Walk-in customer",
    contact: item.customerPhone || item.customer?.phone || "—",
    staff: item.cashierName || item.preparedBy || "—",
    status: item.status || item.saleType || "—",
    amount: formatMoney(item.total, item.currency || "RWF"),
    numericTotal: Number(item.total || 0),
    currency: item.currency || "RWF",
    createdAt: item.date || item.createdAt,
    note: item.receiptNumber ? `Reference ${item.receiptNumber}` : "Print-ready document",
    metricLabel: "Total",
    metricValue: formatMoney(item.total, item.currency || "RWF"),
    tone: type === "receipts" ? "success" : "primary",
  }));
}

async function deleteByType(type, id) {
  if (type === "delivery-notes") return deleteDeliveryNote(id);
  if (type === "proformas") return deleteProforma(id);
  if (type === "warranties") return deleteWarranty(id);
  throw new Error("This document cannot be deleted from this screen");
}

function DocumentRow({ row, typeMeta, type, onDelete, deleting }) {
  const previewPath = `/app/documents/${type}/${encodeURIComponent(row.id)}/preview`;
  const editPath = `/app/documents/${type}/${encodeURIComponent(row.id)}/edit`;

  return (
    <article className={cx("svx-doc-list-row", `is-${row.tone || "neutral"}`)}>
      <Link to={previewPath} className="svx-doc-list-row-main">
        <div className="svx-doc-list-row-icon">{row.code || typeMeta.code}</div>
        <div className="svx-doc-list-row-content">
          <div className="svx-doc-list-row-top">
            <h3>{row.title}</h3>
            <StatusPill status={type === "delivery-notes" && !row.signed ? "Receiver missing" : row.status} tone={type === "delivery-notes" && !row.signed ? "warning" : undefined} />
          </div>
          <div className="svx-doc-list-row-fields">
            <span><b>Customer</b>{row.subtitle}</span>
            <span><b>Phone</b>{row.contact}</span>
            <span><b>Staff</b>{row.staff}</span>
            <span><b>Date</b>{formatDate(row.createdAt)}</span>
            <span><b>{row.metricLabel || "Value"}</b>{row.metricValue || row.amount}</span>
            <span><b>Note</b>{row.note}</span>
          </div>
          {type === "delivery-notes" ? <div className="svx-doc-list-row-extra"><b>Location</b><span>{row.location}</span></div> : null}
        </div>
      </Link>

      <div className="svx-doc-list-row-actions">
        <Link to={previewPath} className="svx-doc-list-button is-primary">Preview</Link>
        <button type="button" onClick={() => openDocumentPrint(type, row.id)} className="svx-doc-list-button">Print</button>
        {typeMeta.canEdit ? <Link to={editPath} className="svx-doc-list-button">Edit</Link> : null}
        {typeMeta.canDelete ? <AsyncButton loading={deleting} loadingText="" onClick={() => onDelete(row)} className="svx-doc-list-button is-danger">Delete</AsyncButton> : null}
      </div>
    </article>
  );
}

export default function DocumentListPage({ type, title, subtitle, listFn }) {
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState("");

  const mountedRef = useRef(true);
  const typeMeta = useMemo(() => getTypeMeta(type), [type]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function load(search = "", { silent = false } = {}) {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await listFn(search);
      if (!mountedRef.current) return;
      setRows(normalizeListResponse(type, data));
    } catch (error) {
      if (!mountedRef.current) return;
      console.error(error);
      toast.error(error?.message || `Failed to load ${title.toLowerCase()}`);
      setRows([]);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draftQuery !== query) {
        setQuery(draftQuery);
        void load(draftQuery);
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftQuery]);

  const cards = useMemo(() => buildCards(type, rows), [type, rows]);
  const totalCount = cards.length;
  const todayCount = cards.filter((item) => isToday(item.createdAt)).length;
  const activeCount = cards.filter((item) => ["PAID", "SENT", "CONVERTED", "ACTIVE", "COMPLETED", "DELIVERED"].includes(String(item.status || "").toUpperCase())).length;
  const flaggedCount = cards.filter((item) => ["PARTIAL", "UNPAID", "PENDING", "EXPIRED", "OVERDUE", "CANCELLED"].includes(String(item.status || "").toUpperCase())).length;
  const customerCount = new Set(cards.map((item) => String(item.subtitle || "").trim()).filter(Boolean)).size;
  const deliveryUnsignedCount = type === "delivery-notes" ? cards.filter((item) => !item.signed).length : 0;
  const proformaTotal = cards.reduce((sum, item) => (type === "proformas" ? sum + Number(item.numericTotal || 0) : sum), 0);

  async function handleConfirmDelete() {
    if (!deleteTarget?.id) return;
    setDeletingId(deleteTarget.id);

    try {
      await deleteByType(type, deleteTarget.id);
      toast.success(`${deleteTarget.title || typeMeta.singularLabel} deleted`);
      setDeleteTarget(null);
      await load(query, { silent: true });
    } catch (error) {
      console.error(error);
      toast.error(error?.message || `Failed to delete ${typeMeta.singularLabel}`);
    } finally {
      if (mountedRef.current) setDeletingId("");
    }
  }

  const kpis = useMemo(() => {
    if (type === "delivery-notes") {
      return [
        { label: "Total notes", value: totalCount, tone: "primary" },
        { label: "Today's deliveries", value: todayCount, tone: "success" },
        { label: "Unsigned", value: deliveryUnsignedCount, tone: deliveryUnsignedCount > 0 ? "warning" : "neutral" },
        { label: "Customers", value: customerCount, tone: "neutral" },
      ];
    }

    if (type === "proformas") {
      return [
        { label: "Total proformas", value: totalCount, tone: "primary" },
        { label: "Today", value: todayCount, tone: "success" },
        { label: "Draft or cancelled", value: flaggedCount, tone: flaggedCount > 0 ? "warning" : "neutral" },
        { label: "Quoted value", value: formatMoney(proformaTotal, "RWF"), tone: "neutral" },
      ];
    }

    if (type === "warranties") {
      return [
        { label: "Total warranties", value: totalCount, tone: "success" },
        { label: "Today", value: todayCount, tone: "primary" },
        { label: "Active", value: activeCount, tone: "success" },
        { label: "Customers", value: customerCount, tone: "neutral" },
      ];
    }

    return [
      { label: typeMeta.statLabel, value: totalCount, tone: "primary" },
      { label: "Today", value: todayCount, tone: "success" },
      { label: "Active or valid", value: activeCount, tone: "success" },
      { label: "Needs attention", value: flaggedCount, tone: flaggedCount > 0 ? "warning" : "neutral" },
    ];
  }, [activeCount, customerCount, deliveryUnsignedCount, flaggedCount, proformaTotal, todayCount, totalCount, type, typeMeta.statLabel]);

  return (
    <div className="svx-doc-list-page">
      <section className={cx("svx-doc-list-hero", `is-${typeMeta.heroTone}`)}>
        <div className="svx-doc-list-hero-inner">
          <div>
            <Link to="/app/documents" className="svx-doc-list-back-link">← Back to document center</Link>
            <p className="svx-doc-list-eyebrow">Document center</p>
            <h1>{title}</h1>
            <p>{subtitle || typeMeta.listNote}</p>
          </div>
          <div className="svx-doc-list-hero-actions">
            <button type="button" onClick={() => load(query, { silent: true })} className="svx-doc-list-button" disabled={refreshing}>{refreshing ? "Refreshing..." : "Refresh"}</button>
            {typeMeta.canCreate && typeMeta.actionTo ? <Link to={typeMeta.actionTo} className="svx-doc-list-button is-primary">{typeMeta.actionLabel}</Link> : null}
          </div>
        </div>
        <div className="svx-doc-list-kpis">
          {kpis.map((item) => <KpiCard key={item.label} label={item.label} value={item.value} tone={item.tone} loading={loading} />)}
        </div>
      </section>

      <section className="svx-doc-list-search-card">
        <form onSubmit={(event) => { event.preventDefault(); setQuery(draftQuery); void load(draftQuery); }} className="svx-doc-list-search">
          <input className="svx-doc-list-input" placeholder={`Search ${title.toLowerCase()} by number, customer, or phone...`} value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} />
          <div className="svx-doc-list-search-actions">
            <AsyncButton type="submit" loading={loading && Boolean(draftQuery)} loadingText="Searching…" variant="primary">Search</AsyncButton>
            {draftQuery ? <button type="button" className="svx-doc-list-button" onClick={() => { setDraftQuery(""); setQuery(""); void load(""); }}>Clear</button> : null}
          </div>
        </form>
      </section>

      {loading ? <DocumentSkeleton rows={6} /> : cards.length === 0 ? <EmptyState type={type} title={title} query={query} createTo={typeMeta.actionTo} createLabel={typeMeta.actionLabel} /> : (
        <section className="svx-doc-list-stack">
          {cards.map((row) => <DocumentRow key={row.id} row={row} typeMeta={typeMeta} type={type} onDelete={setDeleteTarget} deleting={deletingId === row.id} />)}
        </section>
      )}

      {!loading && cards.length > 0 ? <div className="svx-doc-list-note">{cards.length} {title.toLowerCase()}. Preview opens the branded document. Print opens the printable layout.</div> : null}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={`Delete ${typeMeta.singularLabel}?`}
        body={`"${deleteTarget?.title || "This document"}" will be permanently removed. This cannot be undone.`}
        deleting={Boolean(deletingId)}
        onCancel={() => { if (!deletingId) setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
