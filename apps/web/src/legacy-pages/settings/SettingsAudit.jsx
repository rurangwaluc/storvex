// frontend-stores/src/pages/settings/SettingsAudit.jsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import TableSkeleton from "../../components/ui/TableSkeleton";
import {
  getAuditBranches,
  getAuditLogById,
  getAuditLogs,
  getAuditStats,
} from "../../services/auditApi";
import "./Settings.css";
import "./SettingsAudit.css";

const PAGE_SIZE = 20;
const WORKSPACE_BRANCH_VALUE = "__WORKSPACE__";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function strongText() {
  return "text-[var(--color-text)]";
}

function mutedText() {
  return "text-[var(--color-text-muted)]";
}

function softText() {
  return "text-[var(--color-text-muted)]";
}

function pageCard() {
  return "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "app-input";
}

function primaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function sectionEyebrow() {
  return "text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]";
}

function badgeClass(tone = "neutral") {
  if (tone === "primary") return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
  if (tone === "success") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  if (tone === "warning") return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
  if (tone === "danger") return "bg-red-500/10 text-red-600 dark:text-red-300";
  if (tone === "info") return "bg-sky-500/10 text-sky-600 dark:text-sky-300";
  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span className={cx("inline-flex max-w-full items-center rounded-full px-3 py-1.5 text-xs font-black", badgeClass(tone), className)}>
      <span className="truncate">{children}</span>
    </span>
  );
}

function cleanString(value) {
  return String(value || "").trim();
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function prettifyEnum(value) {
  const s = cleanString(value).replaceAll("_", " ").toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Activity";
}

function normalizeAction(value) {
  return cleanString(value).toUpperCase();
}

function normalizeEntity(value) {
  return cleanString(value).toUpperCase();
}

function actionTone(action) {
  const key = normalizeAction(action);
  if (key.includes("CREATE") || key.includes("CREATED")) return "success";
  if (key.includes("UPDATE") || key.includes("EDIT") || key.includes("ASSIGN")) return "info";
  if (key.includes("DELETE") || key.includes("REMOVE") || key.includes("CANCEL")) return "warning";
  if (key.includes("REFUND") || key.includes("VOID")) return "danger";
  if (key.includes("LOGIN") || key.includes("AUTH")) return "primary";
  return "neutral";
}

function entityTone(entity) {
  const key = normalizeEntity(entity);
  if (key.includes("SALE")) return "info";
  if (key.includes("PAYMENT")) return "success";
  if (key.includes("INVOICE")) return "warning";
  if (key.includes("SUPPLIER")) return "primary";
  if (key.includes("BRANCH")) return "success";
  if (key.includes("USER") || key.includes("EMPLOYEE")) return "primary";
  if (key.includes("PRODUCT")) return "success";
  return "neutral";
}

function actionLabel(action) {
  const key = normalizeAction(action);

  if (key.includes("CREATE") || key.includes("CREATED")) return "Created";
  if (key.includes("UPDATE") || key.includes("EDIT")) return "Updated";
  if (key.includes("ASSIGN")) return "Assigned";
  if (key.includes("DELETE") || key.includes("REMOVE")) return "Removed";
  if (key.includes("CANCEL")) return "Cancelled";
  if (key.includes("REFUND")) return "Refunded";
  if (key.includes("VOID")) return "Voided";
  if (key.includes("LOGIN") || key.includes("SIGN_IN")) return "Signed in";

  return prettifyEnum(action);
}

function areaLabel(entity) {
  const key = normalizeEntity(entity);

  if (key.includes("SALE")) return "Sale";
  if (key.includes("PAYMENT")) return "Payment";
  if (key.includes("PRODUCT")) return "Product";
  if (key.includes("BRANCH")) return "Branch";
  if (key.includes("USER") || key.includes("EMPLOYEE")) return "Staff";
  if (key.includes("SUPPLIER")) return "Supplier";
  if (key.includes("CUSTOMER")) return "Customer";
  if (key.includes("REPAIR")) return "Repair";
  if (key.includes("INVOICE")) return "Invoice";
  if (key.includes("EXPENSE")) return "Expense";
  if (key.includes("LOGIN") || key.includes("AUTH")) return "Sign in";

  return prettifyEnum(entity);
}

function activityTitle(item) {
  if (!item) return "Activity";

  const area = areaLabel(item.entity);
  const action = actionLabel(item.action);

  if (area === "Sign in") return action;
  return `${area} ${action.toLowerCase()}`;
}

function branchName(branch) {
  if (!branch) return "All-store activity";
  return branch.code ? `${branch.code} • ${branch.name || "Branch"}` : branch.name || "Branch";
}

function scopeLabel(item) {
  if (item?.branch) return branchName(item.branch);
  return "All-store activity";
}

function scopeNote(item) {
  if (item?.branch) return "Branch activity";
  return "Store-wide activity";
}

function safeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};

  const blockedWords = [
    "id",
    "token",
    "secret",
    "hash",
    "password",
    "metadata",
    "before",
    "after",
    "raw",
    "payload",
    "request",
    "response",
  ];

  return Object.entries(metadata).reduce((acc, [key, value]) => {
    const normalizedKey = cleanString(key).toLowerCase();
    const isBlocked = blockedWords.some((word) => normalizedKey.includes(word));

    if (isBlocked) return acc;
    if (value === null || value === undefined || value === "") return acc;
    if (typeof value === "object") return acc;

    acc[key] = value;
    return acc;
  }, {});
}

function friendlyMoney(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return numberValue.toLocaleString();
}

function auditValue(item) {
  const data = safeMetadata(item?.metadata);
  const amount = friendlyMoney(data.total || data.amount || data.paidAmount || data.balance);
  const name = cleanString(data.name || data.productName || data.customerName || data.supplierName || data.branchName);
  const number = cleanString(data.receiptNumber || data.invoiceNumber || data.documentNumber);

  if (amount) return amount;
  if (name) return name;
  if (number) return number;

  return "Saved";
}

function detailSummaryRows(item) {
  if (!item) return [];

  const data = safeMetadata(item.metadata);
  const rows = [];

  const amount = friendlyMoney(data.total || data.amount || data.paidAmount || data.balance);
  const name = cleanString(data.name || data.productName || data.customerName || data.supplierName || data.branchName);
  const number = cleanString(data.receiptNumber || data.invoiceNumber || data.documentNumber);
  const status = cleanString(data.status || data.paymentStatus);
  const quantity = cleanString(data.quantity || data.qty);
  const method = cleanString(data.paymentMethod || data.method);

  if (name) rows.push({ label: "Name", value: name });
  if (amount) rows.push({ label: "Amount", value: amount });
  if (number) rows.push({ label: "Document", value: number });
  if (status) rows.push({ label: "Status", value: prettifyEnum(status) });
  if (quantity) rows.push({ label: "Quantity", value: quantity });
  if (method) rows.push({ label: "Method", value: prettifyEnum(method) });

  if (!rows.length) {
    rows.push({
      label: "Result",
      value: "This activity was saved successfully.",
    });
  }

  return rows.slice(0, 6);
}

function AuditBadge({ value, tone = "neutral" }) {
  const finalTone = tone === "entity" ? entityTone(value) : tone === "action" ? actionTone(value) : tone;
  const label = tone === "action" ? actionLabel(value) : tone === "entity" ? areaLabel(value) : prettifyEnum(value);

  return <Badge tone={finalTone}>{label}</Badge>;
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? <div className={sectionEyebrow()}>{eyebrow}</div> : null}

      <h2 className={cx("mt-3 text-[1.55rem] font-black tracking-[-0.04em] sm:text-[1.9rem]", strongText())}>
        {title}
      </h2>

      {subtitle ? <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>{subtitle}</p> : null}
    </div>
  );
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex h-10 items-center justify-center rounded-2xl px-4 text-xs font-black uppercase tracking-[0.08em] transition",
        active
          ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]"
          : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:border-[var(--color-primary)]",
      )}
    >
      {children}
    </button>
  );
}

function InfoBlock({ label, value, note, tone = "neutral" }) {
  return (
    <div className={cx(softPanel(), "min-w-0 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>{label}</div>
          <div className={cx("mt-2 break-words text-sm font-black leading-6", strongText())}>{value || "—"}</div>
        </div>
        {tone !== "neutral" ? <Badge tone={tone}>{tone === "success" ? "OK" : "Info"}</Badge> : null}
      </div>
      {note ? <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>{note}</div> : null}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className={cx(pageCard(), "px-5 py-12 text-center")}>
      <div className={cx("text-base font-black", strongText())}>{title}</div>
      <div className={cx("mx-auto mt-2 max-w-md text-sm font-semibold leading-6", mutedText())}>{text}</div>
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return <div className={cx("animate-pulse rounded-[20px] bg-[var(--color-surface-2)]", className)} />;
}

function AuditSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cx(pageCard(), "p-5")}>
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-3 h-8 w-24" />
            <SkeletonBlock className="mt-2 h-4 w-40" />
          </div>
        ))}
      </div>

      <div className={cx(pageCard(), "overflow-hidden")}>
        <div className="overflow-hidden">
          <table className="w-full table-fixed">
            <tbody>
              <TableSkeleton rows={6} cols={5} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AuditRowCard({ item, onOpen }) {
  const value = auditValue(item);

  return (
    <button type="button" className="svx-audit-row" onClick={() => onOpen(item.id)}>
      <div className="svx-audit-row-cell svx-audit-row-main" data-label="Activity">
        <div className="svx-audit-row-badges">
          <AuditBadge value={item.action} tone="action" />
          <AuditBadge value={item.entity} tone="entity" />
        </div>
        <strong>{activityTitle(item)}</strong>
        <span>{scopeNote(item)}</span>
      </div>

      <div className="svx-audit-row-cell" data-label="Branch">
        <strong>{scopeLabel(item)}</strong>
        <span>{item.branch ? "Branch record" : "Store-wide"}</span>
      </div>

      <div className="svx-audit-row-cell" data-label="Done by">
        <strong>{item.user?.name || "System"}</strong>
        <span>{item.user?.role ? prettifyEnum(item.user.role) : "Automatic action"}</span>
      </div>

      <div className="svx-audit-row-cell" data-label="Time">
        <strong>{formatDate(item.createdAt)}</strong>
        <span>{formatDateTime(item.createdAt)}</span>
      </div>

      <div className="svx-audit-row-cell" data-label="Summary">
        <strong>{value}</strong>
        <span>Saved</span>
      </div>

      <div className="svx-audit-row-cell svx-audit-row-action" data-label="Action">
        <span>View</span>
      </div>
    </button>
  );
}

function ActivityDetailDrawer({ open, item, loading, onClose }) {
  const summaryRows = useMemo(() => detailSummaryRows(item), [item]);

  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="svx-audit-drawer-layer" role="dialog" aria-modal="true" aria-label="Activity details">
      <button
        type="button"
        className="svx-audit-drawer-backdrop"
        aria-label="Close activity details"
        onClick={loading ? undefined : onClose}
      />

      <aside className="svx-audit-drawer-panel">
        <header className="svx-audit-drawer-header">
          <div className="min-w-0">
            <div className={sectionEyebrow()}>Activity details</div>
            <h3>{loading ? "Loading activity..." : activityTitle(item)}</h3>
            {!loading && item ? (
              <p>Clear record of what happened, who did it, when it happened, and where it applied.</p>
            ) : null}
          </div>

          <button type="button" onClick={onClose} disabled={loading} className="svx-audit-drawer-close" aria-label="Close">
            ×
          </button>
        </header>

        <div className="svx-audit-drawer-body">
          {loading ? (
            <div className="svx-audit-drawer-loading">
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-40 w-full" />
            </div>
          ) : item ? (
            <>
              <div className="svx-audit-drawer-badges">
                <AuditBadge value={item.action} tone="action" />
                <AuditBadge value={item.entity} tone="entity" />
                <Badge tone={item.branch ? "success" : "neutral"}>{scopeLabel(item)}</Badge>
              </div>

              <div className="svx-audit-drawer-info-grid">
                <InfoBlock
                  label="Done by"
                  value={item.user?.name || "System"}
                  note={item.user?.email || item.user?.role || "Automatic action"}
                />
                <InfoBlock
                  label="Branch"
                  value={scopeLabel(item)}
                  note={item.branch ? "Branch activity" : "Store-wide activity"}
                  tone={item.branch ? "success" : "neutral"}
                />
                <InfoBlock label="Time" value={formatDateTime(item.createdAt)} />
                <InfoBlock
                  label="Area"
                  value={areaLabel(item.entity)}
                  note={`${actionLabel(item.action)} activity`}
                />
              </div>

              <section className={cx(softPanel(), "svx-audit-recorded-details")}>
                <div className={cx("text-sm font-black", strongText())}>Activity summary</div>
                <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
                  Useful store-friendly details about this activity.
                </p>

                <div className="svx-audit-metadata-grid">
                  {summaryRows.map((row) => (
                    <div key={row.label} className="svx-audit-metadata-card">
                      <div>{row.label}</div>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className={cx("text-sm font-semibold leading-6", mutedText())}>Activity record not available.</div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function BranchSelect({ branches, value, onChange, viewerAccess }) {
  const canViewAllBranches = Boolean(viewerAccess?.canViewAllBranches);

  return (
    <select className="app-input mt-2" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="ALL">{canViewAllBranches ? "All branches and store-wide" : "My branches and store-wide"}</option>
      <option value={WORKSPACE_BRANCH_VALUE}>Store-wide only</option>

      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branchName(branch)}
        </option>
      ))}
    </select>
  );
}

export default function SettingsAudit() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState(null);
  const [branches, setBranches] = useState([]);
  const [viewerAccess, setViewerAccess] = useState(null);

  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    q: "",
    action: "",
    entity: "",
    branchId: "ALL",
    includeWorkspaceWide: true,
    from: "",
    to: "",
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const queryFilters = useMemo(
    () => ({
      q: filters.q,
      action: filters.action,
      entity: filters.entity,
      branchId: filters.branchId === "ALL" ? "" : filters.branchId,
      includeWorkspaceWide: filters.includeWorkspaceWide,
      from: filters.from,
      to: filters.to,
    }),
    [filters],
  );

  async function loadAll({ showMainLoader = false, nextPage = page, nextFilters = queryFilters } = {}) {
    try {
      if (showMainLoader) setLoading(true);
      else setRefreshing(true);

      const [branchRes, statsRes, logsRes] = await Promise.all([
        getAuditBranches(),
        getAuditStats(nextFilters),
        getAuditLogs({
          page: nextPage,
          limit: PAGE_SIZE,
          ...nextFilters,
        }),
      ]);

      setBranches(Array.isArray(branchRes?.branches) ? branchRes.branches : []);
      setViewerAccess(logsRes?.viewerAccess || statsRes?.stats?.viewerAccess || branchRes?.viewerAccess || null);
      setStats(statsRes?.stats || null);
      setList(Array.isArray(logsRes?.items) ? logsRes.items : []);
      setPage(Number(logsRes?.page || nextPage || 1));
      setTotalPages(Number(logsRes?.totalPages || 1));
      setTotal(Number(logsRes?.total || 0));
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load activity history");
      setList([]);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll({ showMainLoader: true, nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function applyFilters() {
    const nextPage = 1;
    setPage(nextPage);
    loadAll({ nextPage });
  }

  function clearFilters() {
    const nextFilters = {
      q: "",
      action: "",
      entity: "",
      branchId: "ALL",
      includeWorkspaceWide: true,
      from: "",
      to: "",
    };

    setFilters(nextFilters);
    setPage(1);

    loadAll({
      nextPage: 1,
      nextFilters: {
        q: "",
        action: "",
        entity: "",
        branchId: "",
        includeWorkspaceWide: true,
        from: "",
        to: "",
      },
    });
  }

  async function goToPage(nextPage) {
    const safePage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(safePage);
    await loadAll({ nextPage: safePage });
  }

  async function openDetail(id) {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailItem(null);

      const data = await getAuditLogById(id);
      setDetailItem(data?.item || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load activity details");
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) {
    return <AuditSkeleton />;
  }

  return (
    <>
      <ActivityDetailDrawer
        open={detailOpen}
        item={detailItem}
        loading={detailLoading}
        onClose={() => {
          if (detailLoading) return;
          setDetailOpen(false);
          setDetailItem(null);
        }}
      />

      <div className="svx-settings-page svx-settings-audit-page">
        <section className={cx(pageCard(), "svx-audit-filter-card")}>
          <div className="svx-audit-filter-head">
            <div>
              <div className={sectionEyebrow()}>Audit filters</div>
              <h2>Find activity</h2>
              <p>Filter by user, branch, activity type, or date without showing internal system data.</p>
            </div>

            <div className="svx-audit-visible-count">
              <span>Visible results</span>
              <strong>{total}</strong>
            </div>
          </div>

          <div className="svx-audit-filter-grid">
            <div className="svx-audit-field is-search">
              <label className={cx("text-sm font-black", strongText())}>Search</label>
              <input
                className={cx(inputClass(), "mt-2")}
                placeholder="Search user, branch, or activity..."
                value={filters.q}
                onChange={(event) => updateFilter("q", event.target.value)}
              />
            </div>

            <div className="svx-audit-field">
              <label className={cx("text-sm font-black", strongText())}>Branch</label>
              <BranchSelect
                branches={branches}
                value={filters.branchId}
                viewerAccess={viewerAccess}
                onChange={(value) => updateFilter("branchId", value)}
              />
            </div>

            <div className="svx-audit-field">
              <label className={cx("text-sm font-black", strongText())}>Action</label>
              <input
                className={cx(inputClass(), "mt-2")}
                placeholder="Created, updated, deleted..."
                value={filters.action}
                onChange={(event) => updateFilter("action", event.target.value)}
              />
            </div>

            <div className="svx-audit-field">
              <label className={cx("text-sm font-black", strongText())}>Area</label>
              <input
                className={cx(inputClass(), "mt-2")}
                placeholder="Sales, products, branches..."
                value={filters.entity}
                onChange={(event) => updateFilter("entity", event.target.value)}
              />
            </div>

            <div className="svx-audit-field">
              <label className={cx("text-sm font-black", strongText())}>From</label>
              <input
                type="date"
                className={cx(inputClass(), "mt-2")}
                value={filters.from}
                onChange={(event) => updateFilter("from", event.target.value)}
              />
            </div>

            <div className="svx-audit-field">
              <label className={cx("text-sm font-black", strongText())}>To</label>
              <input
                type="date"
                className={cx(inputClass(), "mt-2")}
                value={filters.to}
                onChange={(event) => updateFilter("to", event.target.value)}
              />
            </div>

            <div className="svx-audit-field is-wide">
              <label className={cx("text-sm font-black", strongText())}>Store-wide records</label>
              <select
                className={cx(inputClass(), "mt-2")}
                value={filters.includeWorkspaceWide ? "YES" : "NO"}
                onChange={(event) => updateFilter("includeWorkspaceWide", event.target.value === "YES")}
              >
                <option value="YES">Include store-wide records</option>
                <option value="NO">Only branch records</option>
              </select>
            </div>
          </div>

          <div className="svx-audit-filter-chips">
            <FilterChip active={!filters.action} onClick={() => updateFilter("action", "")}>All</FilterChip>
            <FilterChip active={filters.action === "CREATE"} onClick={() => updateFilter("action", "CREATE")}>Create</FilterChip>
            <FilterChip active={filters.action === "UPDATE"} onClick={() => updateFilter("action", "UPDATE")}>Update</FilterChip>
            <FilterChip active={filters.action === "DELETE"} onClick={() => updateFilter("action", "DELETE")}>Delete</FilterChip>
            <FilterChip active={filters.action === "LOGIN"} onClick={() => updateFilter("action", "LOGIN")}>Login</FilterChip>
          </div>

          <div className="svx-audit-filter-actions">
            <AsyncButton type="button" loading={refreshing} onClick={applyFilters} className={primaryBtn()}>
              Apply filters
            </AsyncButton>

            <button type="button" onClick={clearFilters} className={secondaryBtn()}>
              Clear filters
            </button>
          </div>
        </section>

        <section className={cx(pageCard(), "svx-audit-list-card")}>
          <div className="svx-audit-list-head">
            <div>
              <div className={sectionEyebrow()}>Activity list</div>
              <h2>Audit log</h2>
              <p>Compact records showing what happened, where it happened, who did it, and when.</p>
            </div>

            <Badge tone="primary">{total} visible</Badge>
          </div>

          {list.length === 0 ? (
            <EmptyState title="No activity found" text="No activity records match the current filters." />
          ) : (
            <div className="svx-audit-table">
              <div className="svx-audit-table-head">
                <div>Activity</div>
                <div>Branch</div>
                <div>Done by</div>
                <div>Time</div>
                <div>Summary</div>
                <div>Action</div>
              </div>

              {list.map((item) => (
                <AuditRowCard key={item.id} item={item} onOpen={openDetail} />
              ))}
            </div>
          )}

          <div className="svx-audit-pagination">
            <div className={cx("text-sm font-semibold", mutedText())}>Page {page} of {totalPages}</div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || refreshing}
                className={secondaryBtn()}
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages || refreshing}
                className={secondaryBtn()}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}