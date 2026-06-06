import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { cn } from "../../lib/cn";
import { deleteDeliveryNote } from "../../services/deliveryNotesApi";
import { deleteProforma } from "../../services/proformasApi";
import { deleteWarranty } from "../../services/warrantiesApi";
import { openDocumentPrint } from "../../services/documentPrint";

function textStrong() {
  return "text-[var(--color-text)]";
}

function textMuted() {
  return "text-[var(--color-text-muted)]";
}

function cardClass() {
  return "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function panelClass() {
  return "rounded-[22px] bg-[var(--color-surface-2)]";
}

function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatDate(value) {
  const date = safeDate(value);
  return date ? date.toLocaleDateString() : "—";
}

function formatMoney(value, currency = "RWF") {
  return `${currency} ${Number(value || 0).toLocaleString()}`;
}

function statusKind(status) {
  const value = String(status || "").toUpperCase();

  if (["PAID", "COMPLETED", "CONVERTED", "ACTIVE", "SENT", "DELIVERED"].includes(value)) {
    return "success";
  }

  if (["PARTIAL", "DRAFT", "PENDING", "UNPAID", "EXPIRING"].includes(value)) {
    return "warning";
  }

  if (["CANCELLED", "EXPIRED", "OVERDUE", "RETURNED"].includes(value)) {
    return "danger";
  }

  return "neutral";
}

function BadgePill({ status }) {
  const kind = statusKind(status);
  const className =
    {
      success: "badge-success",
      warning: "badge-warning",
      danger: "badge-danger",
      neutral: "badge-neutral",
    }[kind] || "badge-neutral";

  return <span className={className}>{status || "—"}</span>;
}

function DocumentSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={cn(panelClass(), "animate-pulse p-4")}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-36 rounded-full bg-[var(--color-surface-3)]" />
                <div className="h-5 w-16 rounded-full bg-[var(--color-surface-3)]" />
              </div>
              <div className="h-4 w-48 rounded-full bg-[var(--color-surface-3)]" />
              <div className="h-4 w-64 rounded-full bg-[var(--color-surface-3)]" />
            </div>

            <div className="flex shrink-0 items-center gap-2 xl:justify-end">
              <div className="h-11 w-24 rounded-2xl bg-[var(--color-surface-3)]" />
              <div className="h-11 w-24 rounded-2xl bg-[var(--color-surface-3)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function KpiStrip({ total, active, flagged, label, loading }) {
  function StatBlock({ label: statLabel, value, tone }) {
    return (
      <div className={cn(panelClass(), "relative overflow-hidden p-3")}>
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-1.5",
            tone === "success"
              ? "bg-emerald-500"
              : tone === "warning"
              ? "bg-amber-500"
              : tone === "danger"
              ? "bg-[var(--color-danger)]"
              : "bg-[var(--color-primary)]"
          )}
        />

        <div className="pl-2">
          <div className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", textMuted())}>
            {statLabel}
          </div>

          {loading ? (
            <div className="mt-2 h-7 w-16 animate-pulse rounded bg-[var(--color-surface-3)]" />
          ) : (
            <div className={cn("mt-2 text-2xl font-black", textStrong())}>{value}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatBlock label={label} value={total} tone="info" />
      <StatBlock label="Active / valid" value={active} tone="success" />
      <StatBlock label="Needs attention" value={flagged} tone={flagged > 0 ? "warning" : "neutral"} />
    </div>
  );
}

function EmptyState({ title, note, linkTo, linkLabel }) {
  return (
    <div className={cn(cardClass(), "px-5 py-12 text-center")}>
      <div className={cn("text-base font-black tracking-tight", textStrong())}>{title}</div>
      <div className={cn("mt-2 text-sm leading-6", textMuted())}>{note}</div>

      {linkTo && linkLabel ? (
        <div className="mt-5">
          <Link
            to={linkTo}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90"
          >
            {linkLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function ConfirmDeleteModal({ open, title, body, deleting, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={deleting ? undefined : onCancel} />

      <div className={cn(cardClass(), "relative z-10 w-full max-w-md space-y-4 p-6")}>
        <div className={cn("text-base font-black tracking-tight", textStrong())}>{title}</div>
        <div className={cn("text-sm leading-6", textMuted())}>{body}</div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AsyncButton variant="secondary" onClick={onCancel} disabled={deleting}>
            Cancel
          </AsyncButton>

          <AsyncButton
            loading={deleting}
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

function normalizeListResponse(type, data) {
  if (type === "receipts") return Array.isArray(data?.receipts) ? data.receipts : [];
  if (type === "invoices") return Array.isArray(data?.invoices) ? data.invoices : [];
  if (type === "proformas") return Array.isArray(data?.proformas) ? data.proformas : [];
  if (type === "warranties") return Array.isArray(data?.warranties) ? data.warranties : [];
  if (type === "delivery-notes") return Array.isArray(data?.deliveryNotes) ? data.deliveryNotes : [];
  return [];
}

function getTypeMeta(type) {
  if (type === "receipts") {
    return {
      actionLabel: "Open sales",
      actionTo: "/app/pos/sales",
      statLabel: "Payment records",
      canCreate: false,
      canEdit: false,
      canDelete: false,
      singularLabel: "receipt",
    };
  }

  if (type === "invoices") {
    return {
      actionLabel: "Open sales",
      actionTo: "/app/pos/sales",
      statLabel: "Billing records",
      canCreate: false,
      canEdit: false,
      canDelete: false,
      singularLabel: "invoice",
    };
  }

  if (type === "delivery-notes") {
    return {
      actionLabel: "Create delivery note",
      actionTo: "/app/documents/delivery-notes/create",
      statLabel: "Goods handover",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      singularLabel: "delivery note",
    };
  }

  if (type === "proformas") {
    return {
      actionLabel: "Create proforma",
      actionTo: "/app/documents/proformas/create",
      statLabel: "Quotations",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      singularLabel: "proforma",
    };
  }

  if (type === "warranties") {
    return {
      actionLabel: "Create warranty",
      actionTo: "/app/documents/warranties/create",
      statLabel: "After-sales proof",
      canCreate: true,
      canEdit: true,
      canDelete: true,
      singularLabel: "warranty",
    };
  }

  return {
    actionLabel: null,
    actionTo: null,
    statLabel: "Documents",
    canCreate: false,
    canEdit: false,
    canDelete: false,
    singularLabel: "document",
  };
}

function buildCards(type, rows) {
  if (type === "warranties") {
    return rows.map((item) => ({
      id: item.id,
      title: item.number || "Warranty",
      subtitle: item.customerName || item.customer?.name || "Walk-in customer",
      contact: item.customerPhone || item.customer?.phone || "—",
      staff: item.cashierName || item.issuedBy || "—",
      status: item.policy || item.status || "Warranty",
      amount: item.endsAt ? `Ends ${formatDate(item.endsAt)}` : "No end date",
      createdAt: item.createdAt,
      note: item.unitsCount ? `${item.unitsCount} covered unit(s)` : "Coverage record",
    }));
  }

  if (type === "proformas") {
    return rows.map((item) => ({
      id: item.id,
      title: item.number || "Proforma",
      subtitle: item.customerName || item.customer?.name || "Customer",
      contact: item.customerPhone || item.customer?.phone || item.customerEmail || "—",
      staff: item.preparedBy || item.cashierName || "—",
      status: item.status || "DRAFT",
      amount: formatMoney(item.total, item.currency || "RWF"),
      createdAt: item.createdAt,
      note: item.validUntil ? `Valid until ${formatDate(item.validUntil)}` : "No validity date",
    }));
  }

  if (type === "delivery-notes") {
    return rows.map((item) => ({
      id: item.id,
      title: item.number || "Delivery Note",
      subtitle: item.customerName || item.customer?.name || "Customer",
      contact: item.customerPhone || item.customer?.phone || "—",
      staff: item.deliveredBy || item.cashierName || "—",
      status: item.status || "DELIVERED",
      amount: item.itemsCount ? `${item.itemsCount} item(s)` : "Document",
      createdAt: item.createdAt || item.date,
      note: item.receivedBy ? `Received by ${item.receivedBy}` : "Delivery proof",
    }));
  }

  return rows.map((item) => ({
    id: item.id,
    title: item.number || `${type.slice(0, -1)} document`,
    subtitle: item.customerName || item.customer?.name || "Walk-in customer",
    contact: item.customerPhone || item.customer?.phone || "—",
    staff: item.cashierName || item.preparedBy || "—",
    status: item.status || item.saleType || "—",
    amount: formatMoney(item.total, item.currency || "RWF"),
    createdAt: item.date || item.createdAt,
    note: item.receiptNumber ? `Reference ${item.receiptNumber}` : "Print-ready document",
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
    <div className={cn(panelClass(), "p-4 transition hover:ring-1 hover:ring-[var(--color-primary-ring)]")}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn("truncate text-base font-bold", textStrong())}>{row.title}</h3>
            <BadgePill status={row.status} />
          </div>

          <div className={cn("mt-1 text-sm", textMuted())}>{row.subtitle}</div>

          <div className={cn("mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs", textMuted())}>
            <span>Contact: {row.contact}</span>
            <span>Staff: {row.staff}</span>
            <span>Date: {formatDate(row.createdAt)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:w-auto xl:items-end">
          <div className="text-left xl:text-right">
            <div className={cn("text-lg font-bold", textStrong())}>{row.amount}</div>
            <div className={cn("mt-1 text-xs", textMuted())}>{row.note}</div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Link
              to={previewPath}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Preview
            </Link>

            <button
              type="button"
              onClick={() => openDocumentPrint(type, row.id)}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-4 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90"
            >
              Print
            </button>

            {typeMeta.canEdit ? (
              <Link
                to={editPath}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-4 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90"
              >
                Edit
              </Link>
            ) : null}

            {typeMeta.canDelete ? (
              <AsyncButton
                loading={deleting}
                loadingText=""
                onClick={() => onDelete(row)}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[rgba(219,80,74,0.12)] px-4 text-sm font-semibold text-[var(--color-danger)] transition hover:opacity-90 disabled:opacity-60"
              >
                Delete
              </AsyncButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
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
  const activeCount = cards.filter((item) =>
    ["PAID", "SENT", "CONVERTED", "ACTIVE", "COMPLETED", "DELIVERED"].includes(
      String(item.status || "").toUpperCase()
    )
  ).length;
  const flaggedCount = cards.filter((item) =>
    ["PARTIAL", "UNPAID", "PENDING", "EXPIRED", "OVERDUE"].includes(String(item.status || "").toUpperCase())
  ).length;

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

  return (
    <div className="space-y-6">
      <div className={cn(cardClass(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", textMuted())}>
                Document Centre
              </div>
              <h1 className={cn("mt-3 text-[1.6rem] font-black tracking-tight sm:text-[1.9rem]", textStrong())}>
                {title}
              </h1>
              <p className={cn("mt-2 text-sm leading-6", textMuted())}>{subtitle}</p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <AsyncButton loading={refreshing} loadingText="" variant="secondary" onClick={() => load(query, { silent: true })}>
                <svg
                  width="15"
                  height="15"
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
                Refresh
              </AsyncButton>

              {typeMeta.canCreate && typeMeta.actionTo ? (
                <Link
                  to={typeMeta.actionTo}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  + {typeMeta.actionLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <KpiStrip
            total={totalCount}
            active={activeCount}
            flagged={flaggedCount}
            label={typeMeta.statLabel}
            loading={loading}
          />
        </div>
      </div>

      <div className={cn(cardClass(), "px-5 py-4 sm:px-6")}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(draftQuery);
            void load(draftQuery);
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <input
            className="app-input max-w-sm"
            placeholder={`Search ${title.toLowerCase()} by name, number, or phone…`}
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />

          <div className="flex gap-2">
            <AsyncButton type="submit" loading={loading && Boolean(draftQuery)} loadingText="Searching…" variant="primary">
              Search
            </AsyncButton>

            {draftQuery ? (
              <AsyncButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setDraftQuery("");
                  setQuery("");
                  void load("");
                }}
              >
                Clear
              </AsyncButton>
            ) : null}
          </div>
        </form>
      </div>

      {loading ? (
        <DocumentSkeleton rows={6} />
      ) : cards.length === 0 ? (
        <EmptyState
          title={`No ${title.toLowerCase()} found`}
          note={query ? `No results for "${query}". Try a different search.` : "When documents exist, they will appear here for preview, printing, and editing."}
          linkTo="/app/documents"
          linkLabel="Back to Document Centre"
        />
      ) : (
        <div className="space-y-3">
          {cards.map((row) => (
            <DocumentRow
              key={row.id}
              row={row}
              typeMeta={typeMeta}
              type={type}
              onDelete={setDeleteTarget}
              deleting={deletingId === row.id}
            />
          ))}
        </div>
      )}

      {!loading && cards.length > 0 ? (
        <div className={cn("px-1 text-xs", textMuted())}>
          {cards.length} {title.toLowerCase()} · Click Preview to see the full branded document · Click Print for the printable layout
        </div>
      ) : null}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={`Delete ${typeMeta.singularLabel}?`}
        body={`"${deleteTarget?.title || "This document"}" will be permanently removed. This cannot be undone.`}
        deleting={Boolean(deletingId)}
        onCancel={() => {
          if (!deletingId) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}