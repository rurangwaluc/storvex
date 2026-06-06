// frontend-stores/src/pages/settings/SettingsAudit.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import TableSkeleton from "../../components/ui/TableSkeleton";
import {
  getAuditBranches,
  getAuditLogById,
  getAuditLogs,
  getAuditStats,
} from "../../services/auditApi";

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
  if (tone === "primary") {
    return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
  }

  if (tone === "success") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (tone === "warning") {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
  }

  if (tone === "danger") {
    return "bg-red-500/10 text-red-600 dark:text-red-300";
  }

  if (tone === "info") {
    return "bg-sky-500/10 text-sky-600 dark:text-sky-300";
  }

  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center rounded-full px-3 py-1.5 text-xs font-black",
        badgeClass(tone),
        className,
      )}
    >
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
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown";
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

  return "neutral";
}

function branchName(branch) {
  if (!branch) return "Workspace-wide";
  return branch.code ? `${branch.code} • ${branch.name || "Branch"}` : branch.name || "Branch";
}

function scopeLabel(item) {
  if (item?.branch) return branchName(item.branch);
  return "Workspace-wide";
}

function scopeNote(item) {
  if (item?.branch) return "Branch activity";
  return "Applies to the whole workspace";
}

function readableMetadataKey(key) {
  const normalized = cleanString(key)
    .replace(/Id$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase();

  if (!normalized) return "Detail";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function readableMetadataValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();

  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map(readableMetadataValue).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function summarizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];

  return Object.entries(metadata)
    .filter(([key]) => {
      const k = cleanString(key).toLowerCase();
      return !["password", "token", "secret", "hash"].some((unsafe) => k.includes(unsafe));
    })
    .slice(0, 8)
    .map(([key, value]) => ({
      key: readableMetadataKey(key),
      value: readableMetadataValue(value),
    }));
}

function AuditBadge({ value, tone = "neutral" }) {
  const finalTone =
    tone === "entity" ? entityTone(value) : tone === "action" ? actionTone(value) : tone;

  return <Badge tone={finalTone}>{prettifyEnum(value)}</Badge>;
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? <div className={sectionEyebrow()}>{eyebrow}</div> : null}

      <h2
        className={cx(
          "mt-3 text-[1.55rem] font-black tracking-[-0.04em] sm:text-[1.9rem]",
          strongText(),
        )}
      >
        {title}
      </h2>

      {subtitle ? (
        <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
          {subtitle}
        </p>
      ) : null}
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

function StatCard({ label, value, note, tone = "neutral" }) {
  const accentClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-[var(--color-danger)]"
          : tone === "info"
            ? "bg-sky-500"
            : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative min-h-[132px] overflow-hidden p-5")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accentClass)} />

      <div className="pl-2">
        <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
          {label}
        </div>

        <div className={cx("mt-2 truncate text-[1.35rem] font-black tracking-[-0.04em]", strongText())}>
          {value}
        </div>

        {note ? <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</div> : null}
      </div>
    </article>
  );
}

function InfoBlock({ label, value, note, tone = "neutral" }) {
  return (
    <div className={cx(softPanel(), "min-w-0 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
            {label}
          </div>
          <div className={cx("mt-2 break-words text-sm font-black leading-6", strongText())}>
            {value || "—"}
          </div>
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
      <div className={cx("mx-auto mt-2 max-w-md text-sm font-semibold leading-6", mutedText())}>
        {text}
      </div>
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
  const metadataSummary = summarizeMetadata(item.metadata);

  return (
    <article
      className={cx(
        pageCard(),
        "overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] sm:p-5",
      )}
    >
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_190px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <AuditBadge value={item.action} tone="action" />
            <AuditBadge value={item.entity} tone="entity" />
            <Badge tone={item.branch ? "success" : "neutral"}>{scopeLabel(item)}</Badge>
          </div>

          <div className="mt-4">
            <h3 className={cx("break-words text-lg font-black tracking-[-0.03em]", strongText())}>
              {prettifyEnum(item.action)}
            </h3>

            <div className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
              {prettifyEnum(item.entity)} • {scopeNote(item)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfoBlock
              label="Done by"
              value={item.user?.name || "System"}
              note={item.user?.role ? prettifyEnum(item.user.role) : "Automatic system action"}
            />

            <InfoBlock
              label="Branch"
              value={scopeLabel(item)}
              note={item.branch ? "Branch-specific record" : "Workspace-wide record"}
              tone={item.branch ? "success" : "neutral"}
            />

            <InfoBlock
              label="Time"
              value={formatDate(item.createdAt)}
              note={formatDateTime(item.createdAt)}
            />
          </div>

          {metadataSummary.length ? (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {metadataSummary.slice(0, 4).map((row) => (
                <div key={row.key} className="min-w-0 rounded-2xl bg-[var(--color-surface-2)] px-3 py-2">
                  <div className={cx("text-[10px] font-black uppercase tracking-[0.14em]", softText())}>
                    {row.key}
                  </div>
                  <div className={cx("mt-1 truncate text-xs font-bold", strongText())}>
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="min-w-0">
          <div className={cx(softPanel(), "h-full p-4")}>
            <div className={cx("text-sm font-black", strongText())}>Review</div>
            <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
              See the full activity record in a cleaner view.
            </div>

            <button type="button" onClick={() => onOpen(item.id)} className={cx(primaryBtn(), "mt-4 w-full")}>
              Open activity
            </button>
          </div>
        </aside>
      </div>
    </article>
  );
}

function ActivityDetailModal({ open, item, loading, onClose }) {
  const metadataRows = useMemo(() => summarizeMetadata(item?.metadata), [item?.metadata]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={loading ? undefined : onClose} />

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
        <div className="mx-auto flex min-h-full w-full max-w-4xl items-start justify-center">
          <div className={cx(pageCard(), "relative w-full max-w-4xl p-5 sm:p-6")}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className={sectionEyebrow()}>Activity details</div>

                <h3 className={cx("mt-3 break-words text-2xl font-black tracking-[-0.04em]", strongText())}>
                  {loading ? "Loading activity..." : prettifyEnum(item?.action)}
                </h3>

                {!loading && item ? (
                  <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
                    Clear record of what happened, who did it, when it happened, and where it applied.
                  </p>
                ) : null}
              </div>

              <button type="button" onClick={onClose} disabled={loading} className={secondaryBtn()}>
                Close
              </button>
            </div>

            {loading ? (
              <div className="mt-6 space-y-4">
                <SkeletonBlock className="h-24 w-full" />
                <SkeletonBlock className="h-24 w-full" />
                <SkeletonBlock className="h-44 w-full" />
              </div>
            ) : item ? (
              <div className="mt-6 space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <AuditBadge value={item.action} tone="action" />
                  <AuditBadge value={item.entity} tone="entity" />
                  <Badge tone={item.branch ? "success" : "neutral"}>{scopeLabel(item)}</Badge>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <InfoBlock
                    label="Done by"
                    value={item.user?.name || "System"}
                    note={item.user?.email || item.user?.role || "Automatic system action"}
                  />

                  <InfoBlock
                    label="Branch"
                    value={scopeLabel(item)}
                    note={item.branch ? "Branch-specific activity" : "Workspace-wide activity"}
                    tone={item.branch ? "success" : "neutral"}
                  />

                  <InfoBlock label="Time" value={formatDateTime(item.createdAt)} />

                  <InfoBlock
                    label="Record reference"
                    value={item.entityId || "—"}
                    note="Internal reference for support or investigation"
                  />
                </div>

                <div className={cx(softPanel(), "p-4")}>
                  <div className={cx("text-sm font-black", strongText())}>Recorded details</div>
                  <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
                    These are the useful details saved with this activity. Technical fields are softened for store users.
                  </p>

                  {metadataRows.length ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {metadataRows.map((row) => (
                        <div key={row.key} className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                          <div className={cx("text-[10px] font-black uppercase tracking-[0.16em]", softText())}>
                            {row.key}
                          </div>
                          <div className={cx("mt-2 break-words text-sm font-bold leading-6", strongText())}>
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={cx("mt-4 text-sm font-semibold leading-6", mutedText())}>
                      No extra details were recorded for this activity.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={cx("mt-6 text-sm font-semibold leading-6", mutedText())}>
                Activity record not available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BranchSelect({ branches, value, onChange, viewerAccess }) {
  const canViewAllBranches = Boolean(viewerAccess?.canViewAllBranches);

  return (
    <select className="app-input mt-2" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="ALL">{canViewAllBranches ? "All branches and workspace" : "My branches and workspace"}</option>
      <option value={WORKSPACE_BRANCH_VALUE}>Workspace-wide only</option>

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

  const topAction = stats?.topActions?.[0];
  const topEntity = stats?.topEntities?.[0];
  const topBranch = stats?.topBranches?.[0];

  if (loading) {
    return <AuditSkeleton />;
  }

  return (
    <>
      <ActivityDetailModal
        open={detailOpen}
        item={detailItem}
        loading={detailLoading}
        onClose={() => {
          if (detailLoading) return;
          setDetailOpen(false);
          setDetailItem(null);
        }}
      />

      <div className="space-y-6 overflow-x-hidden">
        <section className={cx(pageCard(), "overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <SectionHeading
                eyebrow="Settings"
                title="Activity history"
                subtitle="Review important store actions by user, branch, date, and area of the system without exposing raw technical language to tenants."
              />

              <div className="flex flex-wrap gap-2">
                <Badge tone={viewerAccess?.canViewAllBranches ? "primary" : "neutral"}>
                  {viewerAccess?.canViewAllBranches ? "All branches" : "Assigned branches"}
                </Badge>
                <Badge tone="success">{branches.length} branches</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total activity" value={stats?.total ?? 0} note="Recorded store actions" />
            <StatCard label="Last 24 hours" value={stats?.last24h ?? 0} note="Recent activity" tone="info" />
            <StatCard label="Last 7 days" value={stats?.last7d ?? 0} note="Weekly activity" tone="success" />
            <StatCard
              label="Top area"
              value={topEntity ? prettifyEnum(topEntity.entity) : "—"}
              note={
                topBranch
                  ? `Most active branch: ${branchName(topBranch.branch)}`
                  : topAction
                    ? `Top action: ${prettifyEnum(topAction.action)}`
                    : "No trend yet"
              }
              tone="warning"
            />
          </div>
        </section>

        <section className={cx(pageCard(), "p-5 sm:p-6")}>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-end">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <label className={cx("text-sm font-black", strongText())}>Search</label>
                <input
                  className={cx(inputClass(), "mt-2")}
                  placeholder="Search user, branch, or reference..."
                  value={filters.q}
                  onChange={(event) => updateFilter("q", event.target.value)}
                />
              </div>

              <div className="lg:col-span-3">
                <label className={cx("text-sm font-black", strongText())}>Branch</label>
                <BranchSelect
                  branches={branches}
                  value={filters.branchId}
                  viewerAccess={viewerAccess}
                  onChange={(value) => updateFilter("branchId", value)}
                />
              </div>

              <div className="lg:col-span-2">
                <label className={cx("text-sm font-black", strongText())}>Action</label>
                <input
                  className={cx(inputClass(), "mt-2")}
                  placeholder="CREATE"
                  value={filters.action}
                  onChange={(event) => updateFilter("action", event.target.value)}
                />
              </div>

              <div className="lg:col-span-3">
                <label className={cx("text-sm font-black", strongText())}>Area</label>
                <input
                  className={cx(inputClass(), "mt-2")}
                  placeholder="SALE, INVOICE, BRANCH..."
                  value={filters.entity}
                  onChange={(event) => updateFilter("entity", event.target.value)}
                />
              </div>

              <div className="lg:col-span-3">
                <label className={cx("text-sm font-black", strongText())}>From</label>
                <input
                  type="date"
                  className={cx(inputClass(), "mt-2")}
                  value={filters.from}
                  onChange={(event) => updateFilter("from", event.target.value)}
                />
              </div>

              <div className="lg:col-span-3">
                <label className={cx("text-sm font-black", strongText())}>To</label>
                <input
                  type="date"
                  className={cx(inputClass(), "mt-2")}
                  value={filters.to}
                  onChange={(event) => updateFilter("to", event.target.value)}
                />
              </div>

              <div className="lg:col-span-6">
                <label className={cx("text-sm font-black", strongText())}>Workspace-wide records</label>
                <select
                  className={cx(inputClass(), "mt-2")}
                  value={filters.includeWorkspaceWide ? "YES" : "NO"}
                  onChange={(event) => updateFilter("includeWorkspaceWide", event.target.value === "YES")}
                >
                  <option value="YES">Include workspace-wide records</option>
                  <option value="NO">Only branch-specific records</option>
                </select>
              </div>
            </div>

            <div className={cx(softPanel(), "p-4")}>
              <div className={cx("text-sm font-black", strongText())}>Visible results</div>
              <div className={cx("mt-2 text-2xl font-black tracking-[-0.04em]", strongText())}>{total}</div>
              <div className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
                Matching activity records.
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <FilterChip active={!filters.action} onClick={() => updateFilter("action", "")}>
              All
            </FilterChip>
            <FilterChip active={filters.action === "CREATE"} onClick={() => updateFilter("action", "CREATE")}>
              Create
            </FilterChip>
            <FilterChip active={filters.action === "UPDATE"} onClick={() => updateFilter("action", "UPDATE")}>
              Update
            </FilterChip>
            <FilterChip active={filters.action === "DELETE"} onClick={() => updateFilter("action", "DELETE")}>
              Delete
            </FilterChip>
            <FilterChip active={filters.action === "LOGIN"} onClick={() => updateFilter("action", "LOGIN")}>
              Login
            </FilterChip>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <AsyncButton type="button" loading={refreshing} onClick={applyFilters} className={primaryBtn()}>
              Apply filters
            </AsyncButton>

            <button type="button" onClick={clearFilters} className={secondaryBtn()}>
              Clear filters
            </button>
          </div>
        </section>

        <section className="space-y-4">
          {list.length === 0 ? (
            <EmptyState title="No activity found" text="No activity records match the current filters." />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {list.map((item) => (
                  <AuditRowCard key={item.id} item={item} onOpen={openDetail} />
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <div className={cx("text-sm font-semibold", mutedText())}>
                  Page {page} of {totalPages}
                </div>

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
            </>
          )}
        </section>
      </div>
    </>
  );
}