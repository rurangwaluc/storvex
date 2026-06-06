import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { cn } from "../../lib/cn";
import { listDeliveryNotes, deleteDeliveryNote } from "../../services/deliveryNotesApi";
import { listInvoices } from "../../services/invoicesApi";
import { listProformas, deleteProforma } from "../../services/proformasApi";
import { listReceipts } from "../../services/receiptsApi";
import { listWarranties, deleteWarranty } from "../../services/warrantiesApi";
import { buildDocumentPrintUrl, openDocumentPrint } from "../../services/documentPrint";

const TYPE_KEYS = ["receipts", "invoices", "delivery-notes", "proformas", "warranties"];
const PAGE_TITLE = "Document Centre • Storvex";

function textStrong() {
  return "text-[var(--color-text)]";
}

function textMuted() {
  return "text-[var(--color-text-muted)]";
}

function cardClass() {
  return "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString();
}

function formatMoney(value) {
  if (value == null) return null;
  return `${formatAmount(value)} RWF`;
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

function formatDateShort(value) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status) {
  const value = String(status || "").toUpperCase();

  if (["PAID", "DELIVERED", "ACTIVE", "COMPLETED", "CONVERTED", "SENT"].includes(value)) {
    return "badge-success";
  }

  if (["PARTIAL", "DRAFT", "PENDING", "EXPIRING", "EXPIRING SOON", "PROFORMA", "INVOICE"].includes(value)) {
    return "badge-warning";
  }

  if (["OVERDUE", "EXPIRED", "CANCELLED", "RETURNED"].includes(value)) {
    return "badge-danger";
  }

  return "badge-neutral";
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
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-600 dark:text-emerald-400",
    resource: "receipts",
    canCreate: false,
    canEdit: false,
    canDelete: false,
    singular: "receipt",
    createTo: null,
    editTo: () => null,
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
        note: Number(item.balanceDue || 0) > 0 ? `Balance: ${formatAmount(item.balanceDue)} RWF` : null,
      })),
  },
  invoices: {
    label: "Invoices",
    shortLabel: "IN",
    tabLabel: "Invoices",
    iconBg: "bg-[var(--color-primary-soft)]",
    iconText: "text-[var(--color-primary)]",
    resource: "invoices",
    canCreate: false,
    canEdit: false,
    canDelete: false,
    singular: "invoice",
    createTo: null,
    editTo: () => null,
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
        note: Number(item.balanceDue || 0) > 0 ? `Balance: ${formatAmount(item.balanceDue)} RWF` : null,
      })),
  },
  "delivery-notes": {
    label: "Delivery Notes",
    shortLabel: "DN",
    tabLabel: "Delivery",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-600 dark:text-amber-400",
    resource: "delivery-notes",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    singular: "delivery note",
    createTo: "/app/documents/delivery-notes/create",
    editTo: (id) => `/app/documents/delivery-notes/${encodeURIComponent(id)}/edit`,
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
        note: item.itemsCount ? `${item.itemsCount} item(s)` : null,
      })),
  },
  proformas: {
    label: "Proformas",
    shortLabel: "PF",
    tabLabel: "Proformas",
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-600 dark:text-purple-400",
    resource: "proformas",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    singular: "proforma",
    createTo: "/app/documents/proformas/create",
    editTo: (id) => `/app/documents/proformas/${encodeURIComponent(id)}/edit`,
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
    tabLabel: "Warranty",
    iconBg: "bg-teal-500/10",
    iconText: "text-teal-600 dark:text-teal-400",
    resource: "warranties",
    canCreate: true,
    canEdit: true,
    canDelete: true,
    singular: "warranty",
    createTo: "/app/documents/warranties/create",
    editTo: (id) => `/app/documents/warranties/${encodeURIComponent(id)}/edit`,
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

function RowSkeleton({ count = 8 }) {
  return (
    <div className="divide-y divide-[var(--color-border)]">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex animate-pulse items-start gap-3 px-4 py-4 sm:px-5">
          <div className="h-[38px] w-[38px] shrink-0 rounded-[10px] bg-[var(--color-surface)]" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <div className="h-3.5 w-32 rounded-full bg-[var(--color-surface)]" />
            <div className="h-3 w-44 max-w-full rounded-full bg-[var(--color-surface)]" />
            <div className="h-5 w-16 rounded-full bg-[var(--color-surface)]" />
          </div>
          <div className="w-20 shrink-0 space-y-2 pt-0.5 text-right">
            <div className="ml-auto h-3.5 w-20 rounded-full bg-[var(--color-surface)]" />
            <div className="ml-auto h-3 w-14 rounded-full bg-[var(--color-surface)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentRow({ document, selected, onClick }) {
  const config = TYPE_CONFIG[document.type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full min-w-0 items-start gap-3 border-b border-[var(--color-border)] px-4 py-4 text-left transition-colors sm:px-5",
        selected ? "bg-[var(--color-primary-soft)]" : "hover:bg-[var(--color-surface-2)]"
      )}
    >
      {selected ? (
        <div className="absolute left-0 top-0 h-full w-[3px] rounded-r-full bg-[var(--color-primary)]" />
      ) : null}

      <div
        className={cn(
          "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-[11px] font-black",
          config.iconBg,
          config.iconText
        )}
      >
        {config.shortLabel}
      </div>

      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[13.5px] font-bold leading-snug", textStrong())}>
          {document.number}
        </div>

        <div className={cn("mt-0.5 truncate text-xs leading-snug", textMuted())}>
          {document.customerName}
          {document.customerPhone ? ` · ${document.customerPhone}` : ""}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={statusClass(document.status)}>{document.status}</span>
          {document.note ? (
            <span className={cn("text-[11px] font-medium", textMuted())}>{document.note}</span>
          ) : null}
        </div>
      </div>

      <div className="w-[92px] shrink-0 text-right">
        {document.amount != null && document.amount > 0 ? (
          <div className={cn("truncate text-sm font-bold tabular-nums", textStrong())}>
            {formatMoney(document.amount)}
          </div>
        ) : document.note && document.amount == null ? (
          <div className={cn("truncate text-[12px] font-semibold", textMuted())}>{document.note}</div>
        ) : null}

        <div className={cn("mt-0.5 text-[11px]", textMuted())}>{formatDateShort(document.date)}</div>
      </div>
    </button>
  );
}

function EmptyList({ query }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-2xl">
        📄
      </div>

      <div className={cn("text-sm font-bold", textStrong())}>
        {query ? `No results for "${query}"` : "No documents yet"}
      </div>

      <div className={cn("mt-1 text-xs leading-5", textMuted())}>
        {query ? "Try a different search term." : "Documents will appear here once they are created."}
      </div>
    </div>
  );
}

function PreviewPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-3xl">
          📄
        </div>

        <div className={cn("text-base font-black tracking-tight", textStrong())}>
          Select a document to preview
        </div>

        <div className={cn("mx-auto mt-2 max-w-[260px] text-sm leading-6", textMuted())}>
          Open any row from the list to preview the printable document with your store branding.
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ open, title, body, loading, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />

      <div className={cn(cardClass(), "relative z-10 w-full max-w-md space-y-4 p-6")}>
        <div className={cn("text-base font-black tracking-tight", textStrong())}>{title}</div>
        <div className={cn("text-sm leading-6", textMuted())}>{body}</div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AsyncButton variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </AsyncButton>

          <AsyncButton
            loading={loading}
            loadingText="Deleting…"
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-danger)] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            Delete
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}

function PreviewBar({ document, onBack, onDelete, deleting }) {
  const config = TYPE_CONFIG[document.type];
  const editUrl = config.editTo?.(document.id);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 sm:px-5">
      <div className="mr-auto min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={cn("truncate text-sm font-bold", textStrong())}>{document.number}</span>
          <span className={cn("hidden text-xs md:inline", textMuted())}>
            {config.label} Preview · Printable layout
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-xs font-semibold transition hover:opacity-90",
          textMuted()
        )}
      >
        ← Back to list
      </button>

      {editUrl ? (
        <Link
          to={editUrl}
          className={cn(
            "inline-flex h-9 items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-xs font-semibold transition hover:opacity-90",
            textStrong()
          )}
        >
          Edit
        </Link>
      ) : null}

      {config.canDelete ? (
        <AsyncButton
          loading={deleting}
          loadingText=""
          onClick={() => onDelete(document)}
          className="h-9 rounded-2xl bg-[rgba(219,80,74,0.1)] px-3 text-xs font-semibold text-[var(--color-danger)] transition hover:opacity-90 disabled:opacity-60"
        >
          Delete
        </AsyncButton>
      ) : null}

      <AsyncButton
        loading={false}
        variant="primary"
        onClick={() => openDocumentPrint(config.resource, document.id)}
        className="h-9 gap-1.5 rounded-2xl px-4 text-xs font-semibold"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        Print
      </AsyncButton>
    </div>
  );
}

function PreviewPanel({ selected, onBack, onDelete, deleting }) {
  if (!selected) return <PreviewPlaceholder />;

  const config = TYPE_CONFIG[selected.type];
  const printUrl = buildDocumentPrintUrl(config.resource, selected.id);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <PreviewBar document={selected} onBack={onBack} onDelete={onDelete} deleting={deleting} />

      <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
        <iframe
          key={printUrl}
          title={`${config.label} ${selected.id}`}
          src={printUrl}
          className="h-full w-full rounded-[18px] border border-[var(--color-border)] bg-white"
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
  const [allDocuments, setAllDocuments] = useState({});
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    document.title = PAGE_TITLE;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

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

        if (selected) {
          const freshSelected = TYPE_KEYS.flatMap((key) => next[key]).find(
            (item) => item.id === selected.id && item.type === selected.type
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
    [query, selected]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(draftQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [draftQuery]);

  const visibleDocuments = useMemo(() => {
    const source =
      activeTab === "all"
        ? TYPE_KEYS.flatMap((key) => allDocuments[key] || [])
        : allDocuments[activeTab] || [];

    return [...source].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [allDocuments, activeTab]);

  const totalCount = useMemo(
    () => TYPE_KEYS.reduce((sum, key) => sum + (counts[key] || 0), 0),
    [counts]
  );

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
    { key: "all", label: "All", count: totalCount },
    { key: "receipts", label: "Receipts", count: counts.receipts || 0 },
    { key: "invoices", label: "Invoices", count: counts.invoices || 0 },
    { key: "delivery-notes", label: "Delivery", count: counts["delivery-notes"] || 0 },
    { key: "proformas", label: "Proformas", count: counts.proformas || 0 },
    { key: "warranties", label: "Warranty", count: counts.warranties || 0 },
  ];

  const activeConfig = activeTab !== "all" ? TYPE_CONFIG[activeTab] : null;
  const showCreate = Boolean(activeConfig?.canCreate && activeConfig?.createTo);

  const monthChip = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className={cn(cardClass(), "h-[calc(100vh-84px)] overflow-hidden")}>
      <div className="flex h-full min-w-0 overflow-hidden">
        <div
          className={cn(
            "min-w-0 flex-col border-r border-[var(--color-border)]",
            selected ? "hidden md:flex md:w-[380px] xl:w-[420px]" : "flex w-full md:w-[380px] xl:w-[420px]"
          )}
        >
          <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className={cn("text-xl font-black tracking-tight", textStrong())}>Document Centre</h1>
                <p className={cn("mt-0.5 text-xs", textMuted())}>
                  Receipts, invoices, delivery notes, proformas, and warranties
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <AsyncButton
                  loading={refreshing}
                  loadingText=""
                  variant="secondary"
                  onClick={() => load({ silent: true })}
                  className="h-8 w-8 justify-center rounded-[10px] px-0 text-xs"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={refreshing ? "animate-spin" : ""}
                    aria-hidden="true"
                  >
                    <path
                      d="M20 12a8 8 0 10-2.34 5.66M20 12V6m0 6h-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </AsyncButton>

                {showCreate ? (
                  <Link
                    to={activeConfig.createTo}
                    className="inline-flex h-8 items-center rounded-[10px] bg-[var(--color-primary)] px-3 text-xs font-semibold text-white transition hover:opacity-95"
                  >
                    + New
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-b border-[var(--color-border)] px-3 py-2 sm:px-4">
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex min-w-0 items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-[12px] font-semibold transition",
                    activeTab === tab.key
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  )}
                >
                  <span className="truncate">{tab.label}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      activeTab === tab.key
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-card)] text-[var(--color-text-muted)]"
                    )}
                  >
                    {loading ? "…" : tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-[var(--color-border)] px-4 py-2.5 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <svg
                  className={cn(
                    "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
                    textMuted()
                  )}
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>

                <input
                  className={cn(
                    "h-10 w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] pl-9 pr-3 text-xs",
                    "text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition",
                    "focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]"
                  )}
                  placeholder="Search by customer or document number..."
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                />
              </div>

              <div
                className={cn(
                  "flex shrink-0 items-center justify-center gap-1.5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[11px] font-medium",
                  textMuted()
                )}
              >
                📅 {monthChip}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
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
            <div className={cn("border-t border-[var(--color-border)] px-4 py-2 text-[11px] sm:px-5", textMuted())}>
              {visibleDocuments.length} document(s) · Select any row to preview
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden",
            !selected ? "hidden md:flex md:flex-col" : "flex flex-col"
          )}
        >
          <PreviewPanel
            selected={selected}
            onBack={() => setSelected(null)}
            onDelete={setDeleteTarget}
            deleting={deleting && deleteTarget?.id === selected?.id}
          />
        </div>
      </div>

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
    </div>
  );
}