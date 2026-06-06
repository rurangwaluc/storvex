// frontend-stores/src/pages/employees/EmployeesList.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";

import EmployeeCreate from "./EmployeeCreate";
import EmployeeEdit from "./EmployeeEdit";

import {
  deleteEmployee,
  getEmployees,
  resetEmployeePassword,
  setEmployeeActiveStatus,
} from "../../services/employeesApi";

import AsyncButton from "../../components/ui/AsyncButton";
import TableSkeleton from "../../components/ui/TableSkeleton";

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

function primaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function dangerBtn() {
  return "inline-flex h-10 items-center justify-center rounded-2xl bg-[var(--color-danger)] px-4 text-sm font-black text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
}

function menuBtn() {
  return "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function menuItemClass(tone = "neutral") {
  return cx(
    "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition",
    tone === "danger"
      ? "text-[var(--color-danger)] hover:bg-red-500/10"
      : "text-[var(--color-text)] hover:bg-[var(--color-surface-2)]",
  );
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

  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black",
        badgeClass(tone),
        className,
      )}
    >
      {children}
    </span>
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
          "mt-3 text-[1.6rem] font-black tracking-[-0.04em] sm:text-[1.9rem]",
          strongText(),
        )}
      >
        {title}
      </h2>

      {subtitle ? (
        <p className={cx("mt-3 text-sm font-semibold leading-6", mutedText())}>{subtitle}</p>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-300"
        : tone === "danger"
          ? "text-[var(--color-danger)]"
          : strongText();

  const accentClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-[var(--color-danger)]"
          : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accentClass)} />

      <div className="pl-2">
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {label}
        </div>

        <div className={cx("mt-2 text-[1.7rem] font-black tracking-tight", toneClass)}>
          {value}
        </div>

        {note ? (
          <div className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>{note}</div>
        ) : null}
      </div>
    </article>
  );
}

function InfoStat({ label, value, sub }) {
  return (
    <div className={cx(softPanel(), "p-4")}>
      <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
        {label}
      </div>

      <div className={cx("mt-2 text-sm font-black leading-6", strongText())}>
        {value || "—"}
      </div>

      {sub ? (
        <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>{sub}</div>
      ) : null}
    </div>
  );
}

function roleMeta(role) {
  const r = String(role || "").toUpperCase();

  if (r === "OWNER") return { label: "Owner", tone: "primary" };
  if (r === "MANAGER") return { label: "Manager", tone: "primary" };
  if (r === "CASHIER") return { label: "Cashier", tone: "success" };
  if (r === "SELLER") return { label: "Seller", tone: "warning" };
  if (r === "STOREKEEPER") return { label: "Storekeeper", tone: "neutral" };
  if (r === "TECHNICIAN") return { label: "Technician", tone: "success" };

  return { label: r || "Unknown", tone: "neutral" };
}

function RoleBadge({ role }) {
  const meta = roleMeta(role);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

function StatusBadge({ active }) {
  return <Badge tone={active ? "success" : "warning"}>{active ? "Active" : "Inactive"}</Badge>;
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-black transition",
        active
          ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]"
          : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:border-[var(--color-primary)]",
      )}
    >
      {children}
    </button>
  );
}

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "TM";
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function resolveViewer() {
  const token = localStorage.getItem("tenantToken") || localStorage.getItem("token");
  if (!token) return { role: "", canView: false, canManage: false };

  try {
    const decoded = jwtDecode(token);
    const role = normalizeRole(decoded?.role || decoded?.roles?.[0] || "");

    return {
      role,
      canView: ["OWNER", "MANAGER", "PLATFORM_ADMIN"].includes(role),
      canManage: ["OWNER", "PLATFORM_ADMIN"].includes(role),
    };
  } catch {
    return { role: "", canView: false, canManage: false };
  }
}

function normalizeEmployeeBranches(employee) {
  const fromBranches = Array.isArray(employee?.branches) ? employee.branches : [];

  const fromAssignments = Array.isArray(employee?.branchAssignments)
    ? employee.branchAssignments
        .map((assignment) => {
          const branch = assignment?.branch || null;
          if (!branch?.id && !assignment?.branchId) return null;

          return {
            id: branch?.id || assignment.branchId,
            name: branch?.name || "Branch",
            code: branch?.code || "",
            status: branch?.status || "ACTIVE",
            isMain: Boolean(branch?.isMain),
            isDefault: Boolean(assignment?.isDefault),
            canOperate: assignment?.canOperate !== false,
            canViewReports: Boolean(assignment?.canViewReports),
          };
        })
        .filter(Boolean)
    : [];

  const source = fromBranches.length ? fromBranches : fromAssignments;
  const seen = new Set();

  return source
    .map((branch) => ({
      id: String(branch?.id || "").trim(),
      name: String(branch?.name || "Branch").trim(),
      code: String(branch?.code || "").trim(),
      status: String(branch?.status || "ACTIVE").trim(),
      isMain: Boolean(branch?.isMain),
      isDefault: Boolean(branch?.isDefault),
      canOperate: branch?.canOperate !== false,
      canViewReports: Boolean(branch?.canViewReports),
    }))
    .filter((branch) => {
      if (!branch.id || seen.has(branch.id)) return false;
      seen.add(branch.id);
      return true;
    });
}

function branchDisplayName(branch) {
  if (!branch) return "—";
  return branch.code ? `${branch.code} • ${branch.name}` : branch.name;
}

function BranchBadgeList({ branches, compact = false }) {
  if (!branches.length) {
    return <Badge tone="warning">No branch assigned</Badge>;
  }

  const visible = compact ? branches.slice(0, 2) : branches.slice(0, 3);
  const extra = branches.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((branch) => (
        <Badge key={branch.id} tone={branch.isDefault ? "primary" : "neutral"}>
          {branchDisplayName(branch)}
          {branch.isDefault ? " • Default" : ""}
        </Badge>
      ))}

      {extra > 0 ? <Badge tone="neutral">+{extra} more</Badge> : null}
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmTone = "danger",
  loading,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
        onClick={loading ? undefined : onCancel}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={cx(pageCard(), "w-full max-w-md p-6")}>
          <div className="flex items-start gap-4">
            <div
              className={cx(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                confirmTone === "danger"
                  ? "bg-red-500/10 text-[var(--color-danger)]"
                  : "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
              )}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 8v5m0 4h.01M10.29 3.86l-8 14A1 1 0 003.16 19h17.68a1 1 0 00.87-1.5l-8-14a1 1 0 00-1.74 0z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <h3 className={cx("text-lg font-black tracking-tight", strongText())}>{title}</h3>

              <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
                {message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={loading} className={secondaryBtn()}>
              Cancel
            </button>

            <AsyncButton
              type="button"
              loading={loading}
              onClick={onConfirm}
              className={confirmTone === "danger" ? dangerBtn() : primaryBtn()}
            >
              {confirmLabel}
            </AsyncButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordResetDialog({
  open,
  employee,
  password,
  setPassword,
  loading,
  onCancel,
  onConfirm,
}) {
  if (!open || !employee) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
        onClick={loading ? undefined : onCancel}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={cx(pageCard(), "w-full max-w-md p-6")}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 11V8a5 5 0 0110 0v3M5 11h14v10H5V11z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <h3 className={cx("text-lg font-black tracking-tight", strongText())}>
                Reset password
              </h3>
              <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
                Set a new temporary password for {employee.name}. Share it privately.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <label className={cx("text-sm font-black", strongText())}>New password</label>
            <input
              type="text"
              className="app-input mt-2"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              disabled={loading}
            />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={loading} className={secondaryBtn()}>
              Cancel
            </button>

            <AsyncButton type="button" loading={loading} onClick={onConfirm} className={primaryBtn()}>
              Reset password
            </AsyncButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd, canManage }) {
  return (
    <div className={cx(pageCard(), "px-6 py-12 text-center")}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className={cx("mt-4 text-lg font-black tracking-tight", strongText())}>
        No team members found
      </div>

      <p className={cx("mx-auto mt-3 max-w-md text-sm font-semibold leading-6", mutedText())}>
        Build a structured team with controlled roles, branch access, and clear accountability.
      </p>

      {canManage ? (
        <button type="button" onClick={onAdd} className={cx(primaryBtn(), "mt-5")}>
          Add first member
        </button>
      ) : null}
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return <div className={cx("animate-pulse rounded-[20px] bg-[var(--color-surface-2)]", className)} />;
}

function SummaryCardsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={cx(pageCard(), "p-5")}>
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-3 h-8 w-16" />
          <SkeletonBlock className="mt-3 h-4 w-32" />
        </div>
      ))}
    </>
  );
}

function EmployeesSkeleton() {
  return (
    <div className={cx(pageCard(), "overflow-hidden")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <tr>
              {["Member", "Role", "Branches", "Phone", "Status", "Actions"].map((label) => (
                <th
                  key={label}
                  className={cx(
                    "px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em]",
                    softText(),
                    label === "Actions" ? "text-right" : "",
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <TableSkeleton rows={6} cols={6} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowActionsMenu({
  employee,
  inactive,
  rowBusy,
  canManage,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (!canManage) {
    return <span className={cx("text-xs font-black", mutedText())}>View only</span>;
  }

  return (
    <div ref={wrapRef} className="relative flex justify-end">
      <button
        type="button"
        className={menuBtn()}
        onClick={() => setOpen((v) => !v)}
        disabled={rowBusy}
        aria-label={`Open actions for ${employee.name}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[240px] rounded-[22px] border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-[var(--shadow-card)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit(employee);
            }}
            className={menuItemClass()}
          >
            <span>Edit member</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onResetPassword(employee);
            }}
            className={menuItemClass()}
          >
            <span>Reset password</span>
          </button>

          {inactive ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onReactivate(employee);
              }}
              className={menuItemClass()}
            >
              <span>Reactivate</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDeactivate(employee);
              }}
              className={menuItemClass()}
            >
              <span>Deactivate</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete(employee);
            }}
            className={menuItemClass("danger")}
          >
            <span>Remove member</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function EmployeesList({ embedded = false }) {
  const viewer = useMemo(() => resolveViewer(), []);
  const canViewMembers = viewer.canView;
  const canManageMembers = viewer.canManage;

  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");

  const [busyId, setBusyId] = useState("");

  const [confirmState, setConfirmState] = useState({
    open: false,
    mode: null,
    employee: null,
    loading: false,
  });

  const [resetState, setResetState] = useState({
    open: false,
    employee: null,
    password: "",
    loading: false,
  });

  async function load({ initial = false } = {}) {
    if (!canViewMembers) {
      setLoading(false);
      setRefreshing(false);
      setList([]);
      return;
    }

    try {
      if (initial) setLoading(true);
      else setRefreshing(true);

      const data = await getEmployees();
      const employees = Array.isArray(data) ? data : data?.employees || [];

      setList(
        employees.map((employee) => ({
          ...employee,
          branches: normalizeEmployeeBranches(employee),
        })),
      );
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Failed to load team members");
    } finally {
      if (initial) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load({ initial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewMembers]);

  const branchOptions = useMemo(() => {
    const map = new Map();

    for (const employee of list) {
      const branches = normalizeEmployeeBranches(employee);

      for (const branch of branches) {
        if (!branch?.id || map.has(branch.id)) continue;
        map.set(branch.id, branch);
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      branchDisplayName(a).localeCompare(branchDisplayName(b)),
    );
  }, [list]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();

    return list.filter((emp) => {
      const branches = normalizeEmployeeBranches(emp);
      const branchText = branches.map(branchDisplayName).join(" ");

      const matchesSearch =
        !q ||
        String(emp.name || "").toLowerCase().includes(q) ||
        String(emp.email || "").toLowerCase().includes(q) ||
        String(emp.phone || "").toLowerCase().includes(q) ||
        String(emp.role || "").toLowerCase().includes(q) ||
        branchText.toLowerCase().includes(q);

      const matchesRole =
        roleFilter === "ALL" ? true : String(emp.role || "").toUpperCase() === roleFilter;

      const active = emp.isActive !== false;

      const matchesStatus =
        statusFilter === "ALL" ? true : statusFilter === "ACTIVE" ? active : !active;

      const matchesBranch =
        branchFilter === "ALL"
          ? true
          : branchFilter === "UNASSIGNED"
            ? branches.length === 0
            : branches.some((branch) => branch.id === branchFilter);

      return matchesSearch && matchesRole && matchesStatus && matchesBranch;
    });
  }, [list, search, roleFilter, statusFilter, branchFilter]);

  const activeCount = useMemo(() => list.filter((x) => x.isActive !== false).length, [list]);
  const inactiveCount = useMemo(() => list.filter((x) => x.isActive === false).length, [list]);

  const managersCount = useMemo(
    () => list.filter((x) => String(x.role || "").toUpperCase() === "MANAGER").length,
    [list],
  );

  const assignedCount = useMemo(
    () => list.filter((x) => normalizeEmployeeBranches(x).length > 0).length,
    [list],
  );

  function openCreate() {
    if (!canManageMembers) return;
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(emp) {
    if (!canManageMembers) return;

    if (String(emp.role || "").toUpperCase() === "OWNER") {
      toast.error("Cannot modify OWNER account");
      return;
    }

    setEditing(emp);
    setShowForm(true);
  }

  function closeForm() {
    setEditing(null);
    setShowForm(false);
  }

  function openConfirm(mode, employee) {
    if (!canManageMembers) return;

    if (String(employee?.role || "").toUpperCase() === "OWNER") {
      toast.error("Cannot modify OWNER account");
      return;
    }

    setConfirmState({
      open: true,
      mode,
      employee,
      loading: false,
    });
  }

  function closeConfirm() {
    if (confirmState.loading) return;

    setConfirmState({
      open: false,
      mode: null,
      employee: null,
      loading: false,
    });
  }

  function openResetPassword(employee) {
    if (!canManageMembers) return;

    if (String(employee?.role || "").toUpperCase() === "OWNER") {
      toast.error("Cannot reset OWNER password here");
      return;
    }

    setResetState({
      open: true,
      employee,
      password: "",
      loading: false,
    });
  }

  function closeResetPassword() {
    if (resetState.loading) return;

    setResetState({
      open: false,
      employee: null,
      password: "",
      loading: false,
    });
  }

  async function handleResetPassword() {
    const employee = resetState.employee;
    const password = String(resetState.password || "").trim();

    if (!employee) return;

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setResetState((prev) => ({ ...prev, loading: true }));
    setBusyId(employee.id);

    try {
      await resetEmployeePassword(employee.id, { password });
      toast.success("Password reset successfully");

      setResetState({
        open: false,
        employee: null,
        password: "",
        loading: false,
      });
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Failed to reset password");
      setResetState((prev) => ({ ...prev, loading: false }));
    } finally {
      setBusyId("");
    }
  }

  async function handleConfirmedAction() {
    const employee = confirmState.employee;
    const mode = confirmState.mode;

    if (!employee || !mode) return;

    setConfirmState((prev) => ({ ...prev, loading: true }));
    setBusyId(employee.id);

    try {
      if (mode === "delete") {
        await deleteEmployee(employee.id);
        toast.success("Member removed");
      } else if (mode === "deactivate") {
        await setEmployeeActiveStatus(employee.id, false);
        toast.success("Member deactivated");
      } else if (mode === "reactivate") {
        await setEmployeeActiveStatus(employee.id, true);
        toast.success("Member reactivated");
      }

      setConfirmState({
        open: false,
        mode: null,
        employee: null,
        loading: false,
      });

      await load();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Failed to update member");
      setConfirmState((prev) => ({ ...prev, loading: false }));
    } finally {
      setBusyId("");
    }
  }

  const confirmTitle =
    confirmState.mode === "delete"
      ? "Remove member"
      : confirmState.mode === "reactivate"
        ? "Reactivate member"
        : "Deactivate member";

  const confirmLabel =
    confirmState.mode === "delete"
      ? "Remove member"
      : confirmState.mode === "reactivate"
        ? "Reactivate"
        : "Deactivate";

  const confirmTone = confirmState.mode === "reactivate" ? "primary" : "danger";

  const confirmMessage = confirmState.employee
    ? confirmState.mode === "delete"
      ? `"${confirmState.employee.name}" will be removed from active access. Existing audit history stays preserved.`
      : confirmState.mode === "reactivate"
        ? `"${confirmState.employee.name}" will regain access with the current assigned role and branches.`
        : `"${confirmState.employee.name}" will immediately lose access until reactivated again.`
    : "";

  const branchAssignedTone =
    list.length === 0 ? "neutral" : assignedCount === list.length ? "success" : "warning";

  if (!canViewMembers) {
    return (
      <div className={cx(pageCard(), "p-8 text-center")}>
        <div className={cx("text-lg font-black tracking-tight", strongText())}>
          Access restricted
        </div>

        <p className={cx("mt-3 text-sm font-semibold leading-6", mutedText())}>
          You do not have permission to view staff accounts.
        </p>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "space-y-6"}>
      <ConfirmDialog
        open={confirmState.open}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        confirmTone={confirmTone}
        loading={confirmState.loading}
        onCancel={closeConfirm}
        onConfirm={handleConfirmedAction}
      />

      <PasswordResetDialog
        open={resetState.open}
        employee={resetState.employee}
        password={resetState.password}
        setPassword={(password) => setResetState((prev) => ({ ...prev, password }))}
        loading={resetState.loading}
        onCancel={closeResetPassword}
        onConfirm={handleResetPassword}
      />

      <section className="space-y-5">
        <div className={cx(pageCard(), "overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <SectionHeading
                  eyebrow="Team"
                  title="Staff access control"
                  subtitle={
                    canManageMembers
                      ? "Create staff accounts, assign roles, reset passwords, and control branch access."
                      : "Review staff roles and branch access. Staff changes are owner-only."
                  }
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => load()}
                  disabled={loading || refreshing}
                  className={secondaryBtn()}
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                {canManageMembers ? (
                  <button
                    type="button"
                    onClick={showForm ? closeForm : openCreate}
                    disabled={loading || refreshing}
                    className={primaryBtn()}
                  >
                    {showForm ? "Close form" : "Add member"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              <SummaryCardsSkeleton />
            ) : (
              <>
                <SummaryCard
                  label="Active members"
                  value={activeCount}
                  note="Users who can currently sign in"
                  tone="success"
                />

                <SummaryCard
                  label="Inactive members"
                  value={inactiveCount}
                  note="Accounts currently blocked"
                  tone={inactiveCount > 0 ? "warning" : "neutral"}
                />

                <SummaryCard
                  label="Managers"
                  value={managersCount}
                  note="Operational supervisors without owner-only powers"
                  tone="neutral"
                />

                <SummaryCard
                  label="Branch assigned"
                  value={assignedCount}
                  note="Members connected to at least one branch"
                  tone={branchAssignedTone}
                />
              </>
            )}
          </div>
        </div>
      </section>

      {showForm ? (
        editing ? (
          <EmployeeEdit
            employee={editing}
            canEdit={canManageMembers}
            onSaved={async () => {
              closeForm();
              await load();
            }}
            onCancel={closeForm}
          />
        ) : (
          <EmployeeCreate
            canCreate={canManageMembers}
            onSaved={async () => {
              closeForm();
              await load();
            }}
            onCancel={closeForm}
          />
        )
      ) : null}

      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <label className={cx("text-sm font-black", strongText())}>Search</label>
              <input
                className="app-input mt-2"
                placeholder="Search name, email, phone, role, or branch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="lg:col-span-2">
              <label className={cx("text-sm font-black", strongText())}>Role</label>
              <select
                className="app-input mt-2"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="ALL">All roles</option>
                <option value="OWNER">Owner</option>
                <option value="MANAGER">Manager</option>
                <option value="CASHIER">Cashier</option>
                <option value="SELLER">Seller</option>
                <option value="STOREKEEPER">Storekeeper</option>
                <option value="TECHNICIAN">Technician</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className={cx("text-sm font-black", strongText())}>Branch</label>
              <select
                className="app-input mt-2"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="ALL">All branches</option>
                <option value="UNASSIGNED">No branch assigned</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branchDisplayName(branch)}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className={cx("text-sm font-black", strongText())}>Status</label>
              <select
                className="app-input mt-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All members</option>
                <option value="ACTIVE">Active only</option>
                <option value="INACTIVE">Inactive only</option>
              </select>
            </div>
          </div>

          <div className={cx(softPanel(), "p-4")}>
            <div className={cx("text-sm font-black", strongText())}>Visible results</div>

            <div className={cx("mt-2 text-2xl font-black tracking-tight", strongText())}>
              {filtered.length}
            </div>

            <div className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
              Matching members ready for review.
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <FilterChip active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")}>
            All
          </FilterChip>

          <FilterChip active={statusFilter === "ACTIVE"} onClick={() => setStatusFilter("ACTIVE")}>
            Active
          </FilterChip>

          <FilterChip
            active={statusFilter === "INACTIVE"}
            onClick={() => setStatusFilter("INACTIVE")}
          >
            Inactive
          </FilterChip>

          <FilterChip
            active={branchFilter === "UNASSIGNED"}
            onClick={() => setBranchFilter("UNASSIGNED")}
          >
            Missing branch
          </FilterChip>
        </div>
      </section>

      {loading ? (
        <EmployeesSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={openCreate} canManage={canManageMembers} />
      ) : (
        <>
          <section className="hidden lg:block">
            <div className={cx(pageCard(), "overflow-hidden")}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px]">
                  <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                    <tr>
                      <th className={cx("px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em]", softText())}>
                        Member
                      </th>
                      <th className={cx("px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em]", softText())}>
                        Role
                      </th>
                      <th className={cx("px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em]", softText())}>
                        Branches
                      </th>
                      <th className={cx("px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em]", softText())}>
                        Phone
                      </th>
                      <th className={cx("px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em]", softText())}>
                        Status
                      </th>
                      <th className={cx("px-4 py-3 text-right text-xs font-black uppercase tracking-[0.18em]", softText())}>
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((u) => {
                      const rowBusy = busyId === u.id;
                      const inactive = u.isActive === false;
                      const isOwnerRow = String(u.role || "").toUpperCase() === "OWNER";
                      const canManageRow = canManageMembers && !isOwnerRow;
                      const branches = normalizeEmployeeBranches(u);

                      return (
                        <tr
                          key={u.id}
                          className="border-b border-[var(--color-border)] align-top last:border-b-0"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm font-black text-[var(--color-text)]">
                                {initialsFromName(u.name)}
                              </div>

                              <div className="min-w-0">
                                <div className={cx("font-black", strongText())}>{u.name}</div>
                                <div className={cx("mt-1 text-sm font-semibold", mutedText())}>
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <RoleBadge role={u.role} />
                          </td>

                          <td className="max-w-[360px] px-4 py-4">
                            <BranchBadgeList branches={branches} />
                          </td>

                          <td className="px-4 py-4">
                            <div className={cx("text-sm font-black", strongText())}>
                              {u.phone || "—"}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge active={!inactive} />
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end">
                              {canManageRow ? (
                                <RowActionsMenu
                                  employee={u}
                                  inactive={inactive}
                                  rowBusy={rowBusy}
                                  canManage={canManageRow}
                                  onEdit={openEdit}
                                  onResetPassword={openResetPassword}
                                  onDeactivate={(emp) => openConfirm("deactivate", emp)}
                                  onReactivate={(emp) => openConfirm("reactivate", emp)}
                                  onDelete={(emp) => openConfirm("delete", emp)}
                                />
                              ) : (
                                <span className={cx("text-xs font-black", mutedText())}>
                                  {isOwnerRow ? "Protected account" : "View only"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 lg:hidden">
            {filtered.map((u) => {
              const rowBusy = busyId === u.id;
              const inactive = u.isActive === false;
              const isOwnerRow = String(u.role || "").toUpperCase() === "OWNER";
              const canManageRow = canManageMembers && !isOwnerRow;
              const branches = normalizeEmployeeBranches(u);

              return (
                <article key={u.id} className={cx(pageCard(), "p-5")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm font-black text-[var(--color-text)]">
                        {initialsFromName(u.name)}
                      </div>

                      <div className="min-w-0">
                        <div className={cx("truncate text-base font-black tracking-tight", strongText())}>
                          {u.name}
                        </div>

                        <div className={cx("mt-1 break-all text-sm font-semibold", mutedText())}>
                          {u.email}
                        </div>
                      </div>
                    </div>

                    <StatusBadge active={!inactive} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <RoleBadge role={u.role} />
                  </div>

                  <div className="mt-4 space-y-3">
                    <InfoStat label="Phone" value={u.phone || "—"} />

                    <div className={cx(softPanel(), "p-4")}>
                      <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
                        Branch access
                      </div>

                      <div className="mt-3">
                        <BranchBadgeList branches={branches} compact />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className={cx("text-sm font-black", strongText())}>Actions</div>

                    {canManageRow ? (
                      <RowActionsMenu
                        employee={u}
                        inactive={inactive}
                        rowBusy={rowBusy}
                        canManage={canManageRow}
                        onEdit={openEdit}
                        onResetPassword={openResetPassword}
                        onDeactivate={(emp) => openConfirm("deactivate", emp)}
                        onReactivate={(emp) => openConfirm("reactivate", emp)}
                        onDelete={(emp) => openConfirm("delete", emp)}
                      />
                    ) : (
                      <span className={cx("text-xs font-black", mutedText())}>
                        {isOwnerRow ? "Protected account" : "View only"}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}