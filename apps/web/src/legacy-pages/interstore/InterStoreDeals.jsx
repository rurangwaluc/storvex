// frontend-stores/src/pages/interstore/InterStoreDeals.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";

import CreateDealModal from "./InterStoreCreateModal";
import {
  getDealsWithMeta,
  markReceived,
  markReturned,
  markSold,
} from "../../services/interStoreApi";
import { getActiveBranchId } from "../../services/apiClient";

const PAGE_SIZE = 10;

function getCurrentViewer() {
  const token = localStorage.getItem("tenantToken") || localStorage.getItem("token");

  if (!token) {
    return {
      role: "",
      canViewAllBranches: false,
      allowedBranchIds: [],
    };
  }

  try {
    const decoded = jwtDecode(token);
    const role = String(decoded?.role || decoded?.roles?.[0] || "").toUpperCase();

    const allowedBranchIds = Array.isArray(decoded?.allowedBranchIds)
      ? decoded.allowedBranchIds
      : Array.isArray(decoded?.branchIds)
        ? decoded.branchIds
        : [];

    return {
      role,
      canViewAllBranches:
        Boolean(decoded?.canViewAllBranches) ||
        ["OWNER", "PLATFORM_OWNER", "PLATFORM_ADMIN", "PLATFORM_SUPPORT"].includes(role),
      allowedBranchIds,
    };
  } catch {
    return {
      role: "",
      canViewAllBranches: false,
      allowedBranchIds: [],
    };
  }
}

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
  return "inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 py-2.5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function successBtn() {
  return "inline-flex min-h-10 items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60";
}

function warningBtn() {
  return "inline-flex min-h-10 items-center justify-center rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60";
}

function neutralMiniBtn() {
  return "inline-flex min-h-10 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-black text-[var(--color-text)] transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
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
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black",
        badgeClass(tone),
        className
      )}
    >
      {children}
    </span>
  );
}

function cleanString(value) {
  return String(value || "").trim();
}

function formatMoney(value) {
  const n = Number(value || 0);
  return `RWF ${Math.round(Number.isFinite(n) ? n : 0).toLocaleString("en-US")}`;
}

function toDateLabel(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateTimeLabel(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusMeta(status) {
  const key = String(status || "").toUpperCase();

  const map = {
    BORROWED: {
      label: "Borrowed",
      tone: "warning",
      dot: "bg-amber-500",
      chip:
        "border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    RECEIVED: {
      label: "Received",
      tone: "info",
      dot: "bg-sky-500",
      chip: "border border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    },
    SOLD: {
      label: "Sold",
      tone: "primary",
      dot: "bg-[var(--color-primary)]",
      chip:
        "border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
    },
    PAID: {
      label: "Paid",
      tone: "success",
      dot: "bg-emerald-500",
      chip:
        "border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    RETURNED: {
      label: "Returned",
      tone: "neutral",
      dot: "bg-[var(--color-text-muted)]",
      chip:
        "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
    },
  };

  return (
    map[key] || {
      label: key || "Unknown",
      tone: "neutral",
      dot: "bg-[var(--color-text-muted)]",
      chip:
        "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)]",
    }
  );
}

function StatusPill({ status }) {
  const meta = statusMeta(status);

  return (
    <span
      className={cx(
        "inline-flex min-h-[2rem] items-center justify-center rounded-full px-4 py-1.5 text-xs font-black tracking-[0.01em]",
        meta.chip
      )}
    >
      {meta.label}
    </span>
  );
}

function SupplierPill({ deal }) {
  const isInternal = Boolean(deal?.supplierTenantId);

  return (
    <Badge tone={isInternal ? "primary" : "info"}>
      {isInternal ? "Internal store" : "External supplier"}
    </Badge>
  );
}

function BranchPill({ deal }) {
  const branchId = cleanString(deal?.borrowerBranchId || deal?.branchId);

  if (!branchId) {
    return <Badge tone="neutral">Workspace-wide</Badge>;
  }

  return <Badge tone="neutral">Branch-linked</Badge>;
}

function ScopeBadge({ branchScope }) {
  const mode = cleanString(branchScope?.mode).toUpperCase();

  if (mode === "ALL_BRANCHES") {
    return <Badge tone="primary">All branches</Badge>;
  }

  if (branchScope?.branchId) {
    return <Badge tone="info">Current branch</Badge>;
  }

  return <Badge tone="neutral">Branch scope</Badge>;
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-300"
        : tone === "danger"
          ? "text-[var(--color-danger)]"
          : tone === "info"
            ? "text-sky-600 dark:text-sky-300"
            : strongText();

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

        <div className={cx("mt-2 text-[1.45rem] font-black tracking-[-0.04em]", toneClass)}>
          {value}
        </div>

        {note ? (
          <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>
            {note}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h2
        className={cx(
          "mt-3 text-[1.55rem] font-black tracking-[-0.04em] sm:text-[1.9rem]",
          strongText()
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

function FilterChip({ active, children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex min-h-10 items-center justify-center rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]"
          : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:border-[var(--color-primary)]"
      )}
    >
      {children}
    </button>
  );
}

function InfoStat({ label, value, sub }) {
  return (
    <div className={cx(softPanel(), "min-w-0 p-4")}>
      <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
        {label}
      </div>

      <div className={cx("mt-2 break-words text-sm font-black leading-6", strongText())}>
        {value || "—"}
      </div>

      {sub ? (
        <div className={cx("mt-1 break-words text-xs font-semibold leading-5", mutedText())}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={cx("animate-pulse rounded-[20px] bg-[var(--color-surface-2)]", className)}
    />
  );
}

function DealsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cx(pageCard(), "overflow-hidden p-4 sm:p-5")}>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
            <div className="space-y-4">
              <div className="flex gap-2">
                <SkeletonBlock className="h-7 w-24 rounded-full" />
                <SkeletonBlock className="h-7 w-28 rounded-full" />
              </div>

              <div className="space-y-2">
                <SkeletonBlock className="h-6 w-64 max-w-full" />
                <SkeletonBlock className="h-4 w-44 max-w-full" />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <SkeletonBlock className="h-24 w-full" />
                <SkeletonBlock className="h-24 w-full" />
                <SkeletonBlock className="h-24 w-full" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SkeletonBlock className="h-16 w-full" />
                <SkeletonBlock className="h-16 w-full" />
                <SkeletonBlock className="h-16 w-full" />
                <SkeletonBlock className="h-16 w-full" />
              </div>
            </div>

            <SkeletonBlock className="h-[220px] w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className={cx(pageCard(), "px-5 py-12 text-center")}>
      <div className={cx("text-base font-black", strongText())}>{title}</div>

      <div className={cx("mx-auto mt-2 max-w-md text-sm font-semibold leading-6", mutedText())}>
        {text}
      </div>

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function getDealBranchId(deal) {
  return cleanString(deal?.borrowerBranchId || deal?.branchId);
}

function DealCard({ deal, busyKey, onOpen, onReceive, onReturn, onSold }) {
  const supplierLabel = deal.supplierTenantId
    ? "Internal store"
    : deal.externalSupplierName || "External supplier";

  const busy = (key) => busyKey === `${deal.id}:${key}`;
  const meta = statusMeta(deal.status);
  const branchId = getDealBranchId(deal);

  return (
    <article
      className={cx(
        pageCard(),
        "min-w-0 overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] sm:p-5"
      )}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={deal.status} />
            <SupplierPill deal={deal} />
            <BranchPill deal={deal} />
          </div>

          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h3
                className={cx(
                  "break-words text-lg font-black tracking-[-0.03em]",
                  strongText()
                )}
              >
                {deal.productName || "Unnamed product"}
              </h3>

              <div className={cx("mt-1 break-words text-sm font-semibold", mutedText())}>
                Serial:{" "}
                <span className={cx("font-black", strongText())}>{deal.serial || "—"}</span>
              </div>
            </div>

            <div className="shrink-0 text-left xl:text-right">
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Agreed price
              </div>
              <div className={cx("mt-1 text-base font-black tracking-tight", strongText())}>
                {formatMoney(deal.agreedPrice)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfoStat label="Supplier" value={supplierLabel} />
            <InfoStat
              label="Reseller"
              value={deal.resellerName || "—"}
              sub={deal.resellerPhone || "No phone"}
            />
            <InfoStat
              label="Timeline"
              value={`Created ${toDateLabel(deal.createdAt)}`}
              sub={`Due ${toDateLabel(deal.dueDate)}`}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoStat label="Qty" value={String(deal.quantity ?? "—")} />
            <InfoStat label="Sold" value={String(deal.soldQuantity ?? 0)} />
            <InfoStat label="Returned" value={String(deal.returnedQuantity ?? 0)} />
            <InfoStat label="Branch" value={branchId ? "Branch deal" : "Workspace"} />
          </div>

          {deal.notes ? (
            <div className="mt-4 break-words rounded-[22px] border border-dashed border-[var(--color-border)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
              {deal.notes}
            </div>
          ) : null}
        </div>

        <aside className="min-w-0">
          <div className={cx(softPanel(), "h-full p-4")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={cx("text-sm font-black", strongText())}>Actions</div>
                <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                  Open the full record or move this deal to the next valid stage.
                </div>
              </div>

              <span className={cx("mt-1 h-2.5 w-2.5 rounded-full", meta.dot)} />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button type="button" onClick={() => onOpen(deal.id)} className={primaryBtn()}>
                Open details
              </button>

              {deal.status === "BORROWED" ? (
                <>
                  <button
                    type="button"
                    onClick={() => onReceive(deal.id)}
                    disabled={busy("receive")}
                    className={successBtn()}
                  >
                    {busy("receive") ? "Receiving..." : "Receive"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onReturn(deal.id)}
                    disabled={busy("return")}
                    className={neutralMiniBtn()}
                  >
                    {busy("return") ? "Returning..." : "Return"}
                  </button>
                </>
              ) : null}

              {deal.status === "RECEIVED" ? (
                <button
                  type="button"
                  onClick={() => onSold(deal.id)}
                  disabled={busy("sold")}
                  className={warningBtn()}
                >
                  {busy("sold") ? "Saving..." : "Record sale"}
                </button>
              ) : null}
            </div>

            <div className="mt-4 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Last updated
              </div>

              <div className={cx("mt-2 text-sm font-black leading-6", strongText())}>
                {toDateTimeLabel(deal.updatedAt)}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

function ScopeControl({ scopeMode, setScopeMode, viewer, branchScope, loading }) {
  const canRequestAllBranches = viewer.canViewAllBranches;

  return (
    <div className={cx(pageCard(), "p-5 sm:p-6")}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
        <div>
          <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
            Branch view
          </div>

          <h3 className={cx("mt-2 text-xl font-black tracking-[-0.04em]", strongText())}>
            Control which branch records are visible
          </h3>

          <p className={cx("mt-2 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
            Current branch shows operational records for the selected branch. Owners can switch to
            all branches for a full workspace view.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={() => setScopeMode("CURRENT")}
            className={cx(
              scopeMode === "CURRENT" ? primaryBtn() : secondaryBtn(),
              "w-full sm:w-auto"
            )}
          >
            Current branch
          </button>

          <button
            type="button"
            disabled={loading || !canRequestAllBranches}
            onClick={() => setScopeMode("ALL")}
            className={cx(scopeMode === "ALL" ? primaryBtn() : secondaryBtn(), "w-full sm:w-auto")}
            title={!canRequestAllBranches ? "Only owners can view all branches here" : undefined}
          >
            All branches
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ScopeBadge branchScope={branchScope} />
        <Badge tone="neutral">
          Active branch: {cleanString(getActiveBranchId?.()) || "Not selected"}
        </Badge>
        {!canRequestAllBranches ? <Badge tone="warning">Assigned branch access</Badge> : null}
      </div>
    </div>
  );
}

export default function InterStoreDeals() {
  const navigate = useNavigate();
  const viewer = useMemo(() => getCurrentViewer(), []);

  const [deals, setDeals] = useState([]);
  const [branchScope, setBranchScope] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [scopeMode, setScopeMode] = useState("CURRENT");

  const [filters, setFilters] = useState({
    q: "",
    status: "ALL",
    supplier: "ALL",
  });

  const requestScope = useMemo(() => {
    if (scopeMode === "ALL") return { allBranches: true };
    return { branchId: getActiveBranchId?.() || undefined };
  }, [scopeMode]);

  async function loadDeals({ silent = false } = {}) {
    try {
      if (!silent) setLoading(true);

      const data = await getDealsWithMeta(requestScope);

      setDeals(Array.isArray(data?.deals) ? data.deals : []);
      setBranchScope(data?.branchScope || null);
    } catch (err) {
      console.error(err);

      const message = err?.message || "Failed to load inter-store deals";

      if (String(message).toUpperCase().includes("BRANCH_ACCESS_DENIED")) {
        toast.error("You do not have access to that branch view.");
        setScopeMode("CURRENT");
      } else {
        toast.error(message);
      }

      setDeals([]);
      setBranchScope(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeMode]);

  const filteredDeals = useMemo(() => {
    let data = [...deals];
    const q = cleanString(filters.q).toLowerCase();

    if (filters.status !== "ALL") {
      data = data.filter((d) => String(d.status || "").toUpperCase() === filters.status);
    }

    if (filters.supplier === "INTERNAL") {
      data = data.filter((d) => Boolean(d.supplierTenantId));
    }

    if (filters.supplier === "EXTERNAL") {
      data = data.filter((d) => Boolean(d.externalSupplierName));
    }

    if (q) {
      data = data.filter((d) => {
        const product = String(d.productName || "").toLowerCase();
        const serial = String(d.serial || "").toLowerCase();
        const reseller = String(d.resellerName || "").toLowerCase();
        const phone = String(d.resellerPhone || "").toLowerCase();
        const supplier = String(d.externalSupplierName || "").toLowerCase();
        const branchId = String(d.borrowerBranchId || d.branchId || "").toLowerCase();

        return (
          product.includes(q) ||
          serial.includes(q) ||
          reseller.includes(q) ||
          phone.includes(q) ||
          supplier.includes(q) ||
          branchId.includes(q)
        );
      });
    }

    return data;
  }, [deals, filters]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters.q, filters.status, filters.supplier, deals.length, scopeMode]);

  const visibleDeals = useMemo(
    () => filteredDeals.slice(0, visibleCount),
    [filteredDeals, visibleCount]
  );

  const hasMore = visibleDeals.length < filteredDeals.length;

  const summary = useMemo(() => {
    return {
      total: deals.length,
      borrowed: deals.filter((d) => d.status === "BORROWED").length,
      received: deals.filter((d) => d.status === "RECEIVED").length,
      sold: deals.filter((d) => d.status === "SOLD").length,
      paid: deals.filter((d) => d.status === "PAID").length,
    };
  }, [deals]);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function exportCSV() {
    try {
      const rows = [
        [
          "Product",
          "Serial Number",
          "Supplier",
          "Reseller",
          "Reseller Phone",
          "Agreed Price",
          "Stage",
          "Branch ID",
          "Created Date",
        ],
        ...filteredDeals.map((d) => [
          d.productName || "",
          d.serial || "",
          d.supplierTenantId ? "Internal store" : d.externalSupplierName || "",
          d.resellerName || "",
          d.resellerPhone || "",
          d.agreedPrice ?? "",
          statusMeta(d.status).label,
          d.borrowerBranchId || d.branchId || "",
          d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "",
        ]),
      ];

      const csv = rows
        .map((row) =>
          row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = scopeMode === "ALL" ? "interstore-deals-all-branches.csv" : "interstore-deals.csv";
      a.click();

      URL.revokeObjectURL(url);

      toast.success("CSV exported");
    } catch {
      toast.error("Failed to export CSV");
    }
  }

  async function runAction(actionKey, fn, successMessage) {
    try {
      setBusyKey(actionKey);
      await fn();
      toast.success(successMessage);
      await loadDeals({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Action failed");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <>
      <CreateDealModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => loadDeals({ silent: true })}
      />

      <div className="min-w-0 space-y-6">
        <section className={cx(pageCard(), "overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <SectionHeading
                  eyebrow="Inter-store"
                  title="Inter-store deals"
                  subtitle="Manage borrowed electronics, receipt confirmation, sales progress, returns, supplier settlement, and branch visibility from one controlled screen."
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={exportCSV} className={secondaryBtn()}>
                  Export CSV
                </button>

                <button type="button" onClick={() => setModalOpen(true)} className={primaryBtn()}>
                  New deal
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Total deals" value={summary.total} note="Visible in this branch view" />
            <SummaryCard
              label="Borrowed"
              value={summary.borrowed}
              note="Waiting for receipt"
              tone="warning"
            />
            <SummaryCard
              label="Received"
              value={summary.received}
              note="Inside your store"
              tone="info"
            />
            <SummaryCard
              label="Sold"
              value={summary.sold}
              note="Awaiting supplier settlement"
              tone="primary"
            />
            <SummaryCard label="Paid" value={summary.paid} note="Closed successfully" tone="success" />
          </div>
        </section>

        <ScopeControl
          scopeMode={scopeMode}
          setScopeMode={setScopeMode}
          viewer={viewer}
          branchScope={branchScope}
          loading={loading}
        />

        <section className={cx(pageCard(), "p-5 sm:p-6")}>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <label className={cx("text-sm font-black", strongText())}>Search</label>
                <input
                  className={cx(inputClass(), "mt-2")}
                  placeholder="Search product, serial, reseller, phone, supplier, branch..."
                  value={filters.q}
                  onChange={(e) => setFilter("q", e.target.value)}
                />
              </div>

              <div className="lg:col-span-3">
                <label className={cx("text-sm font-black", strongText())}>Stage</label>
                <select
                  className={cx(inputClass(), "mt-2")}
                  value={filters.status}
                  onChange={(e) => setFilter("status", e.target.value)}
                >
                  <option value="ALL">All stages</option>
                  <option value="BORROWED">Borrowed</option>
                  <option value="RECEIVED">Received</option>
                  <option value="SOLD">Sold</option>
                  <option value="PAID">Paid</option>
                  <option value="RETURNED">Returned</option>
                </select>
              </div>

              <div className="lg:col-span-3">
                <label className={cx("text-sm font-black", strongText())}>Supplier type</label>
                <select
                  className={cx(inputClass(), "mt-2")}
                  value={filters.supplier}
                  onChange={(e) => setFilter("supplier", e.target.value)}
                >
                  <option value="ALL">All suppliers</option>
                  <option value="INTERNAL">Internal store</option>
                  <option value="EXTERNAL">External supplier</option>
                </select>
              </div>
            </div>

            <div className={cx(softPanel(), "p-4")}>
              <div className={cx("text-sm font-black", strongText())}>Visible results</div>
              <div className={cx("mt-2 text-2xl font-black tracking-tight", strongText())}>
                {filteredDeals.length}
              </div>
              <div className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
                Matching deals ready for action.
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <FilterChip active={filters.status === "ALL"} onClick={() => setFilter("status", "ALL")}>
              All
            </FilterChip>
            <FilterChip
              active={filters.status === "BORROWED"}
              onClick={() => setFilter("status", "BORROWED")}
            >
              Borrowed
            </FilterChip>
            <FilterChip
              active={filters.status === "RECEIVED"}
              onClick={() => setFilter("status", "RECEIVED")}
            >
              Received
            </FilterChip>
            <FilterChip active={filters.status === "SOLD"} onClick={() => setFilter("status", "SOLD")}>
              Sold
            </FilterChip>
            <FilterChip active={filters.status === "PAID"} onClick={() => setFilter("status", "PAID")}>
              Paid
            </FilterChip>
            <FilterChip
              active={filters.supplier === "INTERNAL"}
              onClick={() => setFilter("supplier", filters.supplier === "INTERNAL" ? "ALL" : "INTERNAL")}
            >
              Internal
            </FilterChip>
            <FilterChip
              active={filters.supplier === "EXTERNAL"}
              onClick={() => setFilter("supplier", filters.supplier === "EXTERNAL" ? "ALL" : "EXTERNAL")}
            >
              External
            </FilterChip>
          </div>
        </section>

        <section className="space-y-4">
          {loading ? (
            <DealsSkeleton />
          ) : filteredDeals.length === 0 ? (
            <EmptyState
              title="No inter-store deals found"
              text="No deals match your current branch view, search, and filters."
              action={
                <button type="button" onClick={() => setModalOpen(true)} className={primaryBtn()}>
                  Create first deal
                </button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {visibleDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    busyKey={busyKey}
                    onOpen={(dealId) => navigate(`/app/interstore/${dealId}`)}
                    onReceive={(dealId) =>
                      runAction(
                        `${dealId}:receive`,
                        () => markReceived(dealId, requestScope),
                        "Deal marked as received"
                      )
                    }
                    onReturn={(dealId) =>
                      runAction(
                        `${dealId}:return`,
                        () => markReturned(dealId, {}, requestScope),
                        "Return recorded"
                      )
                    }
                    onSold={(dealId) =>
                      runAction(
                        `${dealId}:sold`,
                        () => markSold(dealId, {}, requestScope),
                        "Sale recorded"
                      )
                    }
                  />
                ))}
              </div>

              <div className="flex flex-col items-center gap-2 pt-1">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className={secondaryBtn()}
                  >
                    Load 10 more
                  </button>
                ) : (
                  <div className={cx("text-sm font-semibold", mutedText())}>
                    All matching deals loaded
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}