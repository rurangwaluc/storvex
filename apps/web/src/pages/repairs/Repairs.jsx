import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  archiveRepair,
  assignTechnician,
  deleteRepair,
  getRepairTechnicians,
  getRepairs,
  updateRepairStatus,
} from "../../services/repairsApi";

const REPAIR_STATUSES = [
  { value: "RECEIVED", label: "Received" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DELIVERED", label: "Delivered" },
];

const PAGE_SIZE = 12;

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

const strong = () => "text-[var(--color-text)]";
const muted = () => "text-[var(--color-text-muted)]";
const soft = () => "text-[var(--color-text-muted)]";
const card = () =>
  "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
const raised = () =>
  "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]";
const panel = () =>
  "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
const input = () => "app-input";

function primaryBtn(disabled = false) {
  return cx(
    "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition hover:opacity-95",
    disabled && "cursor-not-allowed opacity-60",
  );
}

function secondaryBtn(disabled = false) {
  return cx(
    "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90",
    disabled && "cursor-not-allowed opacity-60",
  );
}

function dangerBtn(disabled = false) {
  return cx(
    "inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition",
    disabled
      ? "cursor-not-allowed bg-[rgba(219,80,74,0.08)] text-[var(--color-danger)] opacity-50"
      : "bg-[rgba(219,80,74,0.12)] text-[var(--color-danger)] hover:opacity-90",
  );
}

function warnBtn(disabled = false) {
  return cx(
    "inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition",
    disabled
      ? "cursor-not-allowed bg-[rgba(217,119,6,0.08)] text-[#b45309] opacity-50"
      : "bg-[#fff1c9] text-[#92400e] hover:opacity-90",
  );
}

function getCurrentRole() {
  const token = localStorage.getItem("tenantToken") || localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded?.role ? String(decoded.role).toUpperCase() : null;
  } catch {
    return null;
  }
}

function formatShortDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
}

function statusLabel(status) {
  const value = String(status || "").toUpperCase();
  return REPAIR_STATUSES.find((item) => item.value === value)?.label || value || "Unknown";
}

function statusToneClass(status) {
  const value = String(status || "").toUpperCase();

  if (value === "DELIVERED") return "bg-[#dcfce7] text-[#15803d]";
  if (value === "COMPLETED") return "bg-[#dff1ff] text-[#1d75b9]";
  if (value === "IN_PROGRESS") return "bg-[#fff1c9] text-[#92400e]";

  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-[18px] bg-[var(--color-surface-2)]",
        className,
      )}
    />
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
        statusToneClass(status),
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", soft())}>
          {eyebrow}
        </div>
      ) : null}

      <h1 className={cx("mt-3 text-[1.7rem] font-black tracking-tight sm:text-[2rem]", strong())}>
        {title}
      </h1>

      {subtitle ? (
        <p className={cx("mt-3 text-sm leading-6", muted())}>{subtitle}</p>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const iconTone =
    tone === "success"
      ? "bg-[#dcfce7] text-[#15803d]"
      : tone === "warning"
        ? "bg-[#fff1c9] text-[#92400e]"
        : tone === "danger"
          ? "bg-[rgba(219,80,74,0.12)] text-[var(--color-danger)]"
          : "bg-[#dff1ff] text-[#1d75b9]";

  return (
    <article className={cx(card(), "p-5 sm:p-6")}>
      <div className="flex items-start gap-4">
        <div
          className={cx(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] shadow-[var(--shadow-soft)]",
            iconTone,
          )}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M14 7l3-3 3 3-3 3zM3 21l7-7" />
            <path d="m11 13-4-4 2-2 4 4" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className={cx("text-sm font-semibold", strong())}>{label}</div>
          <div className={cx("mt-1.5 text-[1.6rem] font-black leading-tight tracking-tight", strong())}>
            {value}
          </div>
          {note ? <div className={cx("mt-1.5 text-sm", muted())}>{note}</div> : null}
        </div>
      </div>
    </article>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={cx(card(), "p-4 sm:p-5")}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBlock className="h-7 w-24 rounded-full" />
              <SkeletonBlock className="h-7 w-20 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SkeletonBlock className="h-14" />
              <SkeletonBlock className="h-14" />
              <SkeletonBlock className="h-14" />
              <SkeletonBlock className="h-14" />
            </div>

            <div className="flex justify-end gap-2">
              <SkeletonBlock className="h-11 w-24 rounded-2xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ canAdd }) {
  return (
    <div className={cx(panel(), "px-4 py-16 text-center")}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M14 7l3-3 3 3-3 3zM3 21l7-7" />
          <path d="m11 13-4-4 2-2 4 4" />
        </svg>
      </div>

      <div className={cx("text-base font-bold", strong())}>No repairs yet</div>
      <div className={cx("mt-2 text-sm leading-6", muted())}>
        Repairs logged here track device intake, technician assignment, and customer handover.
      </div>

      {canAdd ? (
        <Link to="/app/repairs/new" className={cx(primaryBtn(), "mt-5")}>
          Log first repair
        </Link>
      ) : null}
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  body,
  busy,
  confirmLabel,
  confirmClass,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
      <div className={cx(card(), "w-full max-w-md p-5 sm:p-6")}>
        <div className={cx("text-lg font-bold", strong())}>{title}</div>
        <p className={cx("mt-3 text-sm leading-6", muted())}>{body}</p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className={secondaryBtn(busy)}>
            Cancel
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={confirmClass || dangerBtn(busy)}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RepairCard({
  repair,
  technicians,
  canChangeStatus,
  canAssign,
  canArchive,
  canDelete,
  onStatusChange,
  onAssign,
  onOpenArchive,
  onOpenDelete,
  statusBusy,
  assignBusy,
  index,
}) {
  const status = String(repair.status || "").toUpperCase();

  return (
    <div
      className={cx(
        card(),
        "relative overflow-hidden p-4 sm:p-5",
        index % 2 === 0 ? "bg-[var(--color-card)]" : "bg-[var(--color-surface)]",
      )}
    >
      <div
        className={cx(
          "absolute left-0 top-0 h-full w-1.5 opacity-80",
          status === "DELIVERED"
            ? "bg-[#15803d]"
            : status === "COMPLETED"
              ? "bg-[#4aa8ff]"
              : status === "IN_PROGRESS"
                ? "bg-[#b88900]"
                : "bg-[var(--color-border)]",
        )}
      />

      <div className="absolute inset-x-0 top-0 h-px bg-[var(--color-border)]" />

      <div className="pl-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cx("text-base font-black tracking-tight", strong())}>
                  {repair.device || "Unknown device"}
                </span>
                <StatusBadge status={repair.status} />
              </div>

              {repair.serial ? (
                <div className={cx("mt-0.5 text-xs", muted())}>Serial / IMEI: {repair.serial}</div>
              ) : null}

              {repair.issue ? (
                <div className={cx("mt-1 text-sm leading-5", muted())}>{repair.issue}</div>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {canArchive ? (
                <button type="button" onClick={() => onOpenArchive(repair)} className={warnBtn()}>
                  Archive
                </button>
              ) : null}

              {canDelete ? (
                <button type="button" onClick={() => onOpenDelete(repair)} className={dangerBtn()}>
                  Delete
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={cx(raised(), "p-3")}>
              <div className={cx("text-[10px] font-semibold uppercase tracking-[0.18em]", soft())}>
                Customer
              </div>
              <div className={cx("mt-2 text-sm font-bold leading-snug", strong())}>
                {repair.customer?.name || "—"}
              </div>
              <div className={cx("text-xs", muted())}>{repair.customer?.phone || ""}</div>
            </div>

            <div className={cx(raised(), "p-3")}>
              <div className={cx("text-[10px] font-semibold uppercase tracking-[0.18em]", soft())}>
                Received
              </div>
              <div className={cx("mt-2 text-sm font-bold", strong())}>
                {formatShortDate(repair.createdAt)}
              </div>
              {repair.warrantyEnd ? (
                <div className={cx("text-xs", muted())}>
                  Warranty: {formatDate(repair.warrantyEnd)}
                </div>
              ) : null}
            </div>

            <div className={cx(raised(), "p-3")}>
              <div className={cx("text-[10px] font-semibold uppercase tracking-[0.18em]", soft())}>
                Technician
              </div>

              {canAssign ? (
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-xs font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                  value={repair.technicianId || ""}
                  onChange={(event) => onAssign(repair.id, event.target.value)}
                  disabled={assignBusy === repair.id}
                >
                  <option value="">Unassigned</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={cx("mt-2 text-sm font-bold", strong())}>
                  {repair.technician?.name || "Unassigned"}
                </div>
              )}
            </div>

            <div className={cx(raised(), "p-3")}>
              <div className={cx("text-[10px] font-semibold uppercase tracking-[0.18em]", soft())}>
                Status
              </div>

              {canChangeStatus ? (
                <select
                  className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-xs font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                  value={repair.status || ""}
                  onChange={(event) => onStatusChange(repair.id, event.target.value)}
                  disabled={statusBusy === repair.id}
                >
                  {REPAIR_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-2">
                  <StatusBadge status={repair.status} />
                </div>
              )}
            </div>
          </div>

          {repair.storeLocation?.label ? (
            <div className={cx("text-xs", muted())}>
              Store location: {repair.storeLocation.label}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function Repairs() {
  const role = useMemo(() => getCurrentRole(), []);

  const canCreate = role === "OWNER" || role === "CASHIER";
  const canChangeStatus = role === "OWNER" || role === "TECHNICIAN";
  const canAssign = role === "OWNER";
  const canArchive = role === "OWNER";
  const canDelete = role === "OWNER";

  const [repairs, setRepairs] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [statusBusy, setStatusBusy] = useState("");
  const [assignBusy, setAssignBusy] = useState("");

  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function loadRepairs() {
    const data = await getRepairs();
    if (!mountedRef.current) return;
    setRepairs(Array.isArray(data?.repairs) ? data.repairs : []);
  }

  async function loadTechnicians() {
    try {
      const data = await getRepairTechnicians();
      if (!mountedRef.current) return;
      setTechnicians(Array.isArray(data?.technicians) ? data.technicians : []);
    } catch {
      if (!mountedRef.current) return;
      setTechnicians([]);
    }
  }

  async function refreshAll() {
    setLoading(true);

    try {
      await Promise.all([loadRepairs(), loadTechnicians()]);
    } catch (error) {
      toast.error(error?.message || "Failed to load repairs");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = repairs;

    if (filterStatus !== "ALL") {
      list = list.filter((repair) => repair.status === filterStatus);
    }

    const search = q.trim().toLowerCase();

    if (search) {
      list = list.filter((repair) => {
        const haystack = [
          repair.device,
          repair.customer?.name,
          repair.customer?.phone,
          repair.serial,
          repair.issue,
          repair.technician?.name,
          repair.storeLocation?.label,
        ]
          .map((item) => String(item || "").toLowerCase())
          .join(" ");

        return haystack.includes(search);
      });
    }

    return list;
  }, [repairs, q, filterStatus]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, filterStatus]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const hasMore = visibleCount < filtered.length;

  const summary = useMemo(
    () => ({
      total: repairs.length,
      received: repairs.filter((repair) => repair.status === "RECEIVED").length,
      inProgress: repairs.filter((repair) => repair.status === "IN_PROGRESS").length,
      completed: repairs.filter((repair) => repair.status === "COMPLETED").length,
      delivered: repairs.filter((repair) => repair.status === "DELIVERED").length,
    }),
    [repairs],
  );

  async function handleStatusChange(id, status) {
    setStatusBusy(id);

    try {
      const updated = await updateRepairStatus(id, status);

      setRepairs((prev) =>
        prev.map((repair) =>
          repair.id === id
            ? {
                ...repair,
                ...updated,
                status: updated?.status || status,
              }
            : repair,
        ),
      );
    } catch (error) {
      toast.error(error?.message || "Failed to update status");
    } finally {
      setStatusBusy("");
    }
  }

  async function handleAssign(repairId, technicianId) {
    setAssignBusy(repairId);

    const value = technicianId === "" ? null : technicianId;

    try {
      const updated = await assignTechnician(repairId, value);
      const technician = technicians.find((item) => item.id === value) || null;

      setRepairs((prev) =>
        prev.map((repair) =>
          repair.id === repairId
            ? {
                ...repair,
                ...updated,
                technicianId: updated?.technicianId ?? value,
                technician: updated?.technician || (technician ? { name: technician.name } : null),
              }
            : repair,
        ),
      );
    } catch (error) {
      toast.error(error?.message || "Failed to assign technician");
    } finally {
      setAssignBusy("");
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return;

    setArchiveBusy(true);

    try {
      await archiveRepair(archiveTarget.id);
      setRepairs((prev) => prev.filter((repair) => repair.id !== archiveTarget.id));
      toast.success("Repair archived");
      setArchiveTarget(null);
    } catch (error) {
      toast.error(error?.message || "Failed to archive repair");
    } finally {
      setArchiveBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleteBusy(true);

    try {
      await deleteRepair(deleteTarget.id);
      setRepairs((prev) => prev.filter((repair) => repair.id !== deleteTarget.id));
      toast.success("Repair deleted");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error?.message || "Failed to delete repair");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionHeading
            eyebrow="Operations"
            title="Repairs"
            subtitle="Track every device intake, technician assignment, and repair status from intake to customer handover."
          />

          <div className="flex flex-wrap gap-2">
            <AsyncButton loading={loading} onClick={refreshAll} className={secondaryBtn()}>
              Refresh
            </AsyncButton>

            {canCreate ? (
              <Link to="/app/repairs/new" className={primaryBtn()}>
                New repair
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total repairs" value={summary.total} note="All repair records" />
          <SummaryCard label="Received" value={summary.received} note="Awaiting technician" />
          <SummaryCard label="In progress" value={summary.inProgress} note="Under active service" tone="warning" />
          <SummaryCard label="Delivered" value={summary.delivered} note="Completed handovers" tone="success" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={cx(card(), "h-fit p-5 sm:p-6")}>
          <div className={cx("text-base font-bold", strong())}>Filter repairs</div>

          <div className="mt-4 space-y-4">
            <div>
              <label className={cx("mb-1.5 block text-sm font-medium", strong())}>Search</label>
              <input
                className={input()}
                placeholder="Device, customer, serial, issue…"
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </div>

            <div>
              <label className={cx("mb-1.5 block text-sm font-medium", strong())}>Status</label>

              <div className="flex flex-col gap-2">
                {[{ value: "ALL", label: "All repairs" }, ...REPAIR_STATUSES].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilterStatus(option.value)}
                    className={cx(
                      "rounded-2xl border px-4 py-2.5 text-left text-sm font-semibold transition",
                      filterStatus === option.value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] hover:opacity-80",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={cx(panel(), "p-4")}>
              <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", soft())}>
                Showing
              </div>
              <div className={cx("mt-2.5 text-lg font-bold", strong())}>
                {filtered.length} repair{filtered.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </aside>

        <section className={cx(card(), "overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className={cx("text-xl font-bold", strong())}>Repair log</div>
                <div className={cx("mt-1.5 text-sm leading-6", muted())}>
                  Update statuses, assign technicians, and manage repair lifecycle.
                </div>
              </div>

              {!loading ? (
                <span className="inline-flex items-center self-start rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                  {visible.length} of {filtered.length}
                </span>
              ) : null}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <ListSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState canAdd={canCreate} />
            ) : (
              <>
                <div className="space-y-3">
                  {visible.map((repair, index) => (
                    <RepairCard
                      key={repair.id}
                      repair={repair}
                      technicians={technicians}
                      canChangeStatus={canChangeStatus}
                      canAssign={canAssign}
                      canArchive={canArchive}
                      canDelete={canDelete}
                      onStatusChange={handleStatusChange}
                      onAssign={handleAssign}
                      onOpenArchive={setArchiveTarget}
                      onOpenDelete={setDeleteTarget}
                      statusBusy={statusBusy}
                      assignBusy={assignBusy}
                      index={index}
                    />
                  ))}
                </div>

                <div className="mt-5 flex justify-center">
                  {hasMore ? (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                      className={secondaryBtn()}
                    >
                      Load more
                    </button>
                  ) : (
                    <div className={cx("text-sm", muted())}>
                      All {filtered.length} repairs shown
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive repair?"
        body={`Archive the repair for "${archiveTarget?.device || "this device"}"? Archived repairs are removed from the active list.`}
        busy={archiveBusy}
        confirmLabel="Archive repair"
        confirmClass={warnBtn(archiveBusy)}
        onCancel={() => {
          if (!archiveBusy) setArchiveTarget(null);
        }}
        onConfirm={confirmArchive}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete repair?"
        body={`Permanently delete the repair for "${deleteTarget?.device || "this device"}"? This cannot be undone.`}
        busy={deleteBusy}
        confirmLabel="Delete repair"
        confirmClass={dangerBtn(deleteBusy)}
        onCancel={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}