import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { listDeliveryNotes, deleteDeliveryNote } from "../../services/deliveryNotesApi";
import { listInvoices } from "../../services/invoicesApi";
import { listProformas, deleteProforma } from "../../services/proformasApi";
import { listReceipts } from "../../services/receiptsApi";
import { listWarranties, deleteWarranty } from "../../services/warrantiesApi";
import { buildDocumentPrintUrl, openDocumentPrint } from "../../services/documentPrint";
import "./DocumentCenterPage.css";

const TYPE_KEYS = ["receipts", "invoices", "delivery-notes", "proformas", "warranties"];
const PAGE_TITLE = "Document Centre - Storvex";

function formatAmount(value) {
  return Number(value || 0).toLocaleString();
}

function formatMoney(value) {
  if (value == null) return null;
  return `Rwf ${formatAmount(value)}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCurrentMonthValue() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(value) {
  if (!value) return "All dates";

  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return "All dates";

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function isSameMonth(value, monthValue) {
  if (!monthValue) return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}` === monthValue;
}

function statusClass(status) {
  const value = String(status || "").toUpperCase();

  if (["PAID", "DELIVERED", "ACTIVE", "COMPLETED", "CONVERTED", "SENT"].includes(value)) {
    return "svx-doc-status is-success";
  }

  if (["PARTIAL", "DRAFT", "PENDING", "EXPIRING", "EXPIRING SOON", "PROFORMA", "INVOICE"].includes(value)) {
    return "svx-doc-status is-warning";
  }

  if (["OVERDUE", "EXPIRED", "CANCELLED", "RETURNED"].includes(value)) {
    return "svx-doc-status is-danger";
  }

  return "svx-doc-status is-neutral";
}

function isFinancialType(type) {
  return type === "receipts" || type === "invoices" || type === "proformas";
}

function getDocumentMeta(document) {
  const pieces = [];

  if (document.customerName) {
    pieces.push({ label: "Customer", value: document.customerName });
  }

  if (document.customerPhone) {
    pieces.push({ label: "Phone", value: document.customerPhone });
  }

  if (document.date) {
    pieces.push({ label: "Date", value: formatDateShort(document.date) });
  }

  return pieces;
}

async function deleteDocument(type, id) {
  if (type === "delivery-notes") return deleteDeliveryNote(id);
  if (type === "proformas") return deleteProforma(id);
  if (type === "warranties") return deleteWarranty(id);

  throw new Error("This document cannot be deleted from this screen");
}

const TYPE_CONFIG = {
  receipts: {
    label: "Receipts",
    shortLabel: "RC",
    tabLabel: "Receipts",
    resource: "receipts",
    canCreate: false,
    canEdit: false,
    canDelete: false,
    singular: "receipt",
    createTo: null,
    editTo: () => null,
    tone: "success",
    description: "Sales proof and branded payment records.",
    fetch: (query) => listReceipts(query),
    normalize: (response) =>
      (Array.isArray(response?.receipts) ? response.receipts : []).map((item) => ({
        id: item.id,
        type: "receipts",
        number: item.receiptNumber || item.number || item.id?.slice(-8),
        customerName: item.customer?.name || item.customerName || "Walk-in customer",
        customerPhone: item.customer?.phone || item.customerPhone || "",
        status: item.status || item.saleType || "PAID",
        amount: Number(item.total || 0),
        date: item.createdAt || item.date || null,
        note: Number(item.balanceDue || 0) > 0 ? `Balance ${formatMoney(item.balanceDue)}` : null,
      })),
  },
  invoices: {
    label: "Invoices",
    shortLabel: "IN",
    tabLabel: "Invoices",
    resource: "invoices",
    canCreate: false,
    canEdit: false,
    canDelete: false,
    singular: "invoice",
    createTo: null,
    editTo: () => null,
    tone: "info",
    description: "Formal billing records and printable invoice layouts.",
    fetch: (query) => listInvoices(query),
    normalize: (response) =>
      (Array.isArray(response?.invoices) ? response.invoices : []).map((item) => ({
        id: item.id,
        type: "invoices",
        number: item.invoiceNumber || item.number || item.id?.slice(-8),
        customerName: item.customer?.name || item.customerName || "Walk-in customer",
        customerPhone: item.customer?.phone || item.customerPhone || "",
        status: item.status || "INVOICE",
        amount: Number(item.total || 0),
        date: item.createdAt || item.date || null,
        note: Number(item.balanceDue || 0) > 0 ? `Balance ${formatMoney(item.balanceDue)}` : null,
      })),
  },
  "delivery-notes": {
    label: "Delivery Notes",
    shortLabel: "DN",
    tabLabel: "Delivery Notes",
    resource: "delivery-notes",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    singular: "delivery note",
    createTo: "/app/documents/delivery-notes/create",
    editTo: (id) => `/app/documents/delivery-notes/${encodeURIComponent(id)}/edit`,
    tone: "warning",
    description: "Delivered items, receivers, quantities and signatures. No money fields.",
    fetch: (query) => listDeliveryNotes(query),
    normalize: (response) =>
      (Array.isArray(response?.deliveryNotes) ? response.deliveryNotes : []).map((item) => ({
        id: item.id,
        type: "delivery-notes",
        number: item.number || item.id?.slice(-8),
        customerName: item.customerName || item.customer?.name || "Customer",
        customerPhone: item.customerPhone || item.customer?.phone || "",
        status: item.status || "DELIVERED",
        amount: null,
        date: item.createdAt || item.date || null,
        note: item.itemsCount ? `${item.itemsCount} item${Number(item.itemsCount) === 1 ? "" : "s"}` : null,
      })),
  },
  proformas: {
    label: "Proformas",
    shortLabel: "PF",
    tabLabel: "Proformas",
    resource: "proformas",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    singular: "proforma",
    createTo: "/app/documents/proformas/create",
    editTo: (id) => `/app/documents/proformas/${encodeURIComponent(id)}/edit`,
    tone: "purple",
    description: "Pre-sale documents before final billing.",
    fetch: (query) => listProformas(query),
    normalize: (response) =>
      (Array.isArray(response?.proformas) ? response.proformas : []).map((item) => ({
        id: item.id,
        type: "proformas",
        number: item.number || item.id?.slice(-8),
        customerName: item.customerName || item.customer?.name || "Customer",
        customerPhone: item.customerPhone || item.customer?.phone || "",
        status: item.status || "DRAFT",
        amount: Number(item.total || 0),
        date: item.createdAt || null,
        note: item.validUntil ? `Valid until ${formatDate(item.validUntil)}` : null,
      })),
  },
  warranties: {
    label: "Warranties",
    shortLabel: "WR",
    tabLabel: "Warranties",
    resource: "warranties",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    singular: "warranty",
    createTo: "/app/documents/warranties/create",
    editTo: (id) => `/app/documents/warranties/${encodeURIComponent(id)}/edit`,
    tone: "teal",
    description: "After-sales coverage records and warranty proof.",
    fetch: (query) => listWarranties(query),
    normalize: (response) =>
      (Array.isArray(response?.warranties) ? response.warranties : []).map((item) => ({
        id: item.id,
        type: "warranties",
        number: item.number || item.id?.slice(-8),
        customerName: item.customerName || item.customer?.name || "Customer",
        customerPhone: item.customerPhone || item.customer?.phone || "",
        status: item.status || "ACTIVE",
        amount: null,
        date: item.createdAt || null,
        note: item.endsAt ? `Ends ${formatDate(item.endsAt)}` : null,
      })),
  },
};

function IconDocument() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8.5 12h7M8.5 15.5h7M8.5 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconRefresh({ spinning }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={spinning ? "is-spinning" : ""} aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function RowSkeleton({ count = 8 }) {
  return (
    <div className="svx-doc-list-skeleton" aria-label="Loading documents">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="svx-doc-skeleton-row">
          <span />
          <div>
            <i />
            <b />
            <em />
          </div>
          <small />
        </div>
      ))}
    </div>
  );
}

function DocumentTypeCard({ item, active, count, loading, onClick }) {
  return (
    <button
      type="button"
      className={`svx-doc-type-card is-${item.tone}${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      <span className="svx-doc-type-icon">{item.shortLabel}</span>
      <span className="svx-doc-type-copy">
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </span>
      <span className="svx-doc-type-count">{loading ? "…" : count}</span>
    </button>
  );
}

function DocumentRow({ document, selected, onClick }) {
  const config = TYPE_CONFIG[document.type];
  const meta = getDocumentMeta(document);
  const showMoney = isFinancialType(document.type) && document.amount != null && document.amount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`svx-doc-row${selected ? " is-selected" : ""} is-${config.tone}`}
    >
      <span className="svx-doc-row-icon">{config.shortLabel}</span>

      <span className="svx-doc-row-main">
        <strong>{document.number}</strong>
        <span className="svx-doc-row-meta">
          {meta.map((item) => (
            <span key={`${item.label}-${item.value}`}>
              <b>{item.label}</b>
              <i>{item.value}</i>
            </span>
          ))}
        </span>
        <span className="svx-doc-row-status-line">
          <span className={statusClass(document.status)}>{document.status}</span>
          {document.note ? <small>{document.note}</small> : null}
        </span>
      </span>

      <span className="svx-doc-row-side">
        {showMoney ? <strong>{formatMoney(document.amount)}</strong> : <strong className="is-muted">{config.label}</strong>}
        <small>{formatDateShort(document.date)}</small>
      </span>
    </button>
  );
}

function EmptyList({ query }) {
  return (
    <div className="svx-doc-empty-list">
      <span aria-hidden="true">
        <IconDocument />
      </span>
      <strong>{query ? `No results for "${query}"` : "No documents yet"}</strong>
      <p>{query ? "Try another customer name, phone number, or document number." : "Documents will appear here once they are created."}</p>
    </div>
  );
}

function PreviewPlaceholder() {
  return (
    <div className="svx-doc-preview-placeholder">
      <div>
        <span aria-hidden="true">
          <IconDocument />
        </span>
        <strong>Select a document to preview</strong>
        <p>Choose a row from the list to preview the printable document with your store branding.</p>
      </div>
    </div>
  );
}

function ConfirmModal({ open, title, body, loading, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="svx-doc-modal-layer" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="svx-doc-modal-backdrop"
        onClick={() => {
          if (!loading) onCancel();
        }}
        aria-label="Cancel delete"
      />

      <section className="svx-doc-modal-card">
        <h2>{title}</h2>
        <p>{body}</p>

        <div className="svx-doc-modal-actions">
          <AsyncButton variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </AsyncButton>

          <AsyncButton loading={loading} loadingText="Deleting…" onClick={onConfirm} className="svx-doc-danger-button">
            Delete
          </AsyncButton>
        </div>
      </section>
    </div>
  );
}

function PreviewBar({ document, onBack, onDelete, deleting }) {
  const config = TYPE_CONFIG[document.type];
  const editUrl = config.editTo?.(document.id);

  return (
    <div className="svx-doc-preview-bar">
      <div className="svx-doc-preview-title">
        <strong>{document.number}</strong>
        <span>{config.label}</span>
        <span>Printable layout</span>
      </div>

      <div className="svx-doc-preview-actions">
        <button type="button" onClick={onBack} className="svx-doc-secondary-action">
          Back to list
        </button>

        {editUrl ? (
          <Link to={editUrl} className="svx-doc-secondary-action">
            Edit
          </Link>
        ) : null}

        {config.canDelete ? (
          <AsyncButton loading={deleting} loadingText="" onClick={() => onDelete(document)} className="svx-doc-delete-action">
            Delete
          </AsyncButton>
        ) : null}

        <AsyncButton loading={false} variant="primary" onClick={() => openDocumentPrint(config.resource, document.id)} className="svx-doc-print-action">
          <IconPrint />
          <span>Print</span>
        </AsyncButton>
      </div>
    </div>
  );
}

function PreviewPanel({ selected, onBack, onDelete, deleting }) {
  if (!selected) return <PreviewPlaceholder />;

  const config = TYPE_CONFIG[selected.type];
  const printUrl = buildDocumentPrintUrl(config.resource, selected.id);

  return (
    <div className="svx-doc-preview-panel">
      <PreviewBar document={selected} onBack={onBack} onDelete={onDelete} deleting={deleting} />

      <div className="svx-doc-preview-frame-wrap">
        <iframe
          key={printUrl}
          title={`${config.label} ${selected.id}`}
          src={printUrl}
          className="svx-doc-preview-frame"
          loading="lazy"
        />
      </div>
    </div>
  );
}

export default function DocumentCenterPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue());
  const [allDocuments, setAllDocuments] = useState({});
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const mountedRef = useRef(true);
  const selectedRef = useRef(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    mountedRef.current = true;
    document.title = PAGE_TITLE;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const shouldShowFullLoader = !silent && !hasLoadedRef.current;

      if (shouldShowFullLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const results = await Promise.allSettled(TYPE_KEYS.map((key) => TYPE_CONFIG[key].fetch(query)));

        if (!mountedRef.current) return;

        const next = {};

        TYPE_KEYS.forEach((key, index) => {
          const result = results[index];
          next[key] = result.status === "fulfilled" ? TYPE_CONFIG[key].normalize(result.value) : [];
        });

        setAllDocuments(next);
        setCounts(Object.fromEntries(TYPE_KEYS.map((key) => [key, next[key].length])));
        hasLoadedRef.current = true;

        const currentSelected = selectedRef.current;

        if (currentSelected) {
          const freshSelected = TYPE_KEYS.flatMap((key) => next[key]).find(
            (item) => item.id === currentSelected.id && item.type === currentSelected.type
          );

          setSelected(freshSelected || null);
        }
      } catch (error) {
        if (!mountedRef.current) return;
        console.error(error);
        toast.error("Failed to load documents");
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(draftQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [draftQuery]);

  const visibleDocuments = useMemo(() => {
    const source = activeTab === "all" ? TYPE_KEYS.flatMap((key) => allDocuments[key] || []) : allDocuments[activeTab] || [];

    return source
      .filter((document) => isSameMonth(document.date, selectedMonth))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [allDocuments, activeTab, selectedMonth]);

  const totalCount = useMemo(() => TYPE_KEYS.reduce((sum, key) => sum + (counts[key] || 0), 0), [counts]);

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await deleteDocument(deleteTarget.type, deleteTarget.id);
      toast.success(`${TYPE_CONFIG[deleteTarget.type].singular} deleted`);

      if (selected?.id === deleteTarget.id && selected?.type === deleteTarget.type) {
        setSelected(null);
      }

      setDeleteTarget(null);
      await load({ silent: true });
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to delete document");
    } finally {
      if (mountedRef.current) setDeleting(false);
    }
  }

  const tabs = [
    { key: "all", label: "All documents", count: totalCount, description: "Every document type", tone: "neutral" },
    ...TYPE_KEYS.map((key) => ({
      key,
      label: TYPE_CONFIG[key].label,
      count: counts[key] || 0,
      description: TYPE_CONFIG[key].description,
      tone: TYPE_CONFIG[key].tone,
    })),
  ];

  const activeConfig = activeTab !== "all" ? TYPE_CONFIG[activeTab] : null;
  const showCreate = Boolean(activeConfig?.canCreate && activeConfig?.createTo);
  

  const listRoutes = {
    receipts: "/app/documents/receipts",
    invoices: "/app/documents/invoices",
    "delivery-notes": "/app/documents/delivery-notes",
    proformas: "/app/documents/proformas",
    warranties: "/app/documents/warranties",
  };

  const showListButton = activeTab !== "all" && Boolean(listRoutes[activeTab]);


  const monthLabel = formatMonthLabel(selectedMonth);

  const activeTitle = activeTab === "all" ? "All documents" : TYPE_CONFIG[activeTab]?.label || "Documents";
  const activeDescription =
    activeTab === "all"
      ? "Search receipts, invoices, delivery notes, proformas, and warranties from one owner workspace."
      : TYPE_CONFIG[activeTab]?.description || "Search and preview documents.";

  return (
    <main className="svx-doc-center-page">
      <section className="svx-doc-hero">
        <div>
          <span>Document center</span>
          <h1>Document center</h1>
          <p>
            Search, preview, print, and manage receipts, invoices, delivery notes, proformas, and warranties.
            Delivery notes stay focused on goods movement only.
          </p>
        </div>

        <div className="svx-doc-hero-actions">
          <AsyncButton loading={refreshing} loadingText="Refreshing…" variant="secondary" onClick={() => load({ silent: true })}>
            <IconRefresh spinning={refreshing} />
            <span>Refresh</span>
          </AsyncButton>

          <Link to="/app/documents/delivery-notes/create" className="svx-doc-primary-link">
            Create delivery note
          </Link>

          <Link to="/app/documents/proformas/create" className="svx-doc-primary-link">
            Create proforma
          </Link>
        </div>
      </section>

      <section className="svx-doc-type-grid" aria-label="Document type summary">
        {tabs.map((tab) => (
          <DocumentTypeCard
            key={tab.key}
            item={{ ...tab, shortLabel: tab.key === "all" ? "ALL" : TYPE_CONFIG[tab.key]?.shortLabel || "DC" }}
            active={activeTab === tab.key}
            count={tab.count}
            loading={loading}
            onClick={() => {
              setActiveTab(tab.key);
              setSelected(null);
            }}
          />
        ))}
      </section>

      <section className={`svx-doc-workspace${selected ? " has-selection" : ""}`}>
        <div className={`svx-doc-list-panel${selected ? " has-selection" : ""}`}>
          <header className="svx-doc-list-header">
            <div>
              <span>{activeTitle}</span>
              <h2>{activeDescription}</h2>
            </div>

            <div
              className={`svx-doc-list-header-actions${
                activeTab === "delivery-notes" && !selected
                  ? " is-vertical"
                  : ""
              }`}
            >

              {showCreate ? (
                <Link
                  to={activeConfig.createTo}
                  className="svx-doc-compact-primary"
                >
                  New {activeConfig.singular}
                </Link>
              ) : null}

              {showListButton ? (
                <Link
                  to={listRoutes[activeTab]}
                  className="svx-doc-secondary-action"
                >
                  {activeConfig.label} list
                </Link>
              ) : null}

              <button
                type="button"
                className="svx-doc-icon-button"
                onClick={() => load({ silent: true })}
                aria-label="Refresh documents"
              >
                <IconRefresh spinning={refreshing} />
              </button>

            </div>
          </header>

          <div className="svx-doc-filter-row">
            <label className="svx-doc-search-field">
              <IconSearch />
              <input
                placeholder="Search customer, phone, or document number"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
              />
            </label>

            <label className="svx-doc-month-chip" title="Filter documents by month">
              <span>Month</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                aria-label="Filter documents by month"
              />
              <strong>{monthLabel}</strong>
            </label>
          </div>

          <div className="svx-doc-list-body">
            {loading ? (
              <RowSkeleton count={9} />
            ) : visibleDocuments.length === 0 ? (
              <EmptyList query={query} />
            ) : (
              visibleDocuments.map((document) => (
                <DocumentRow
                  key={`${document.type}-${document.id}`}
                  document={document}
                  selected={selected?.id === document.id && selected?.type === document.type}
                  onClick={() => setSelected(document)}
                />
              ))
            )}
          </div>

          {!loading && visibleDocuments.length > 0 ? (
            <footer className="svx-doc-list-footer">
              <span>Showing {visibleDocuments.length} document{visibleDocuments.length === 1 ? "" : "s"}</span>
              <span>{monthLabel}</span>
            </footer>
          ) : null}
        </div>

        <div className={`svx-doc-preview-shell${selected ? " has-selection" : ""}`}>
          <PreviewPanel
            selected={selected}
            onBack={() => setSelected(null)}
            onDelete={setDeleteTarget}
            deleting={deleting && deleteTarget?.id === selected?.id}
          />
        </div>
      </section>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget ? TYPE_CONFIG[deleteTarget.type]?.singular : "document"}?`}
        body={`"${deleteTarget?.number || "This document"}" will be permanently removed. This cannot be undone.`}
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />
    </main>
  );
}

