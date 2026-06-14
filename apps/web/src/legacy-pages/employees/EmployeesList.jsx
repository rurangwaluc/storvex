// frontend-stores/src/pages/employees/EmployeesList.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import "./EmployeesList.css";

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
  useEffect(() => {
    if (!open) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape" && !loading) onCancel?.();
    }

    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open || !employee) return null;

  return createPortal(
    <div className="svx-member-drawer-layer svx-member-reset-layer">
      <button
        type="button"
        className="svx-member-drawer-backdrop"
        aria-label="Close password reset"
        onClick={loading ? undefined : onCancel}
      />

      <aside className="svx-member-drawer-panel svx-member-reset-panel" role="dialog" aria-modal="true" aria-label="Reset member password">
        <div className="svx-member-drawer-header">
          <div className="svx-member-drawer-person">
            <div className="svx-member-avatar is-large">{initialsFromName(employee.name)}</div>
            <div className="min-w-0">
              <p>Password reset</p>
              <h3>{employee.name}</h3>
              <span>{employee.email || "No email recorded"}</span>
            </div>
          </div>

          <button type="button" className="svx-member-drawer-close" onClick={onCancel} disabled={loading}>
            Close
          </button>
        </div>

        <div className="svx-member-drawer-body">
          <section className="svx-member-detail-section">
            <div className="svx-member-detail-title">New temporary password</div>
            <p className="svx-member-detail-copy">
              Set a temporary password and share it privately with this staff member.
            </p>

            <input
              type="text"
              className="app-input svx-member-reset-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              disabled={loading}
            />
          </section>

          <section className="svx-member-detail-section">
            <div className="svx-member-detail-title">Security note</div>
            <p className="svx-member-detail-copy">
              Resetting a password does not change this member’s role or branch access.
            </p>
          </section>
        </div>

        <div className="svx-member-drawer-actions">
          <button type="button" onClick={onCancel} disabled={loading} className={secondaryBtn()}>
            Cancel
          </button>

          <AsyncButton type="button" loading={loading} onClick={onConfirm} className={primaryBtn()}>
            Reset password
          </AsyncButton>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function MemberFormDrawer({ open, mode, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="svx-member-drawer-layer svx-member-form-layer">
      <button type="button" className="svx-member-drawer-backdrop" aria-label="Close member form" onClick={onClose} />

      <aside className="svx-member-form-drawer-panel" role="dialog" aria-modal="true" aria-label={mode === "edit" ? "Update member" : "Create member"}>
        <div className="svx-member-form-drawer-body">{children}</div>
      </aside>
    </div>,
    document.body,
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

function DetailItem({ label, value }) {
  return (
    <div className="svx-member-detail-item">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function MemberDetailsDrawer({
  employee,
  open,
  canManage,
  rowBusy,
  onClose,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
  onDelete,
}) {
  useEffect(() => {
    if (!open) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !employee) return null;

  const inactive = employee.isActive === false;
  const isOwnerRow = String(employee.role || "").toUpperCase() === "OWNER";
  const canManageRow = Boolean(canManage && !isOwnerRow);
  const branches = normalizeEmployeeBranches(employee);
  const defaultBranch = branches.find((branch) => branch.isDefault) || branches.find((branch) => branch.isMain) || branches[0] || null;

  return createPortal(
    <div className="svx-member-drawer-layer">
      <button type="button" className="svx-member-drawer-backdrop" aria-label="Close member details" onClick={onClose} />

      <aside className="svx-member-drawer-panel" aria-label="Member details" role="dialog" aria-modal="true">
        <div className="svx-member-drawer-header">
          <div className="svx-member-drawer-person">
            <div className="svx-member-avatar is-large">{initialsFromName(employee.name)}</div>
            <div className="min-w-0">
              <p>Staff profile</p>
              <h3>{employee.name || "Team member"}</h3>
              <span>{employee.email || "No email recorded"}</span>
            </div>
          </div>

          <button type="button" className="svx-member-drawer-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="svx-member-drawer-body">
          <div className="svx-member-drawer-badges">
            <RoleBadge role={employee.role} />
            <StatusBadge active={!inactive} />
            {isOwnerRow ? <Badge tone="primary">Protected account</Badge> : null}
          </div>

          <section className="svx-member-detail-grid">
            <DetailItem label="Phone" value={employee.phone || "—"} />
            <DetailItem label="Default branch" value={defaultBranch ? branchDisplayName(defaultBranch) : "No branch assigned"} />
            <DetailItem label="Branch count" value={branches.length ? `${branches.length} branch${branches.length === 1 ? "" : "es"}` : "No branches"} />
            <DetailItem label="Account state" value={inactive ? "Inactive" : "Active"} />
          </section>

          <section className="svx-member-detail-section">
            <div className="svx-member-detail-title">Branch access</div>
            <div className="svx-member-branch-list">
              <BranchBadgeList branches={branches} />
            </div>
          </section>

          <section className="svx-member-detail-section">
            <div className="svx-member-detail-title">Access rule</div>
            <p className="svx-member-detail-copy">
              This member can only use the role and branch access assigned here. Owner-only controls remain protected.
            </p>
          </section>
        </div>

        <div className="svx-member-drawer-actions">
          {canManageRow ? (
            <>
              <button type="button" className={primaryBtn()} disabled={rowBusy} onClick={() => onEdit(employee)}>
                Update member
              </button>
              <button type="button" className={secondaryBtn()} disabled={rowBusy} onClick={() => onResetPassword(employee)}>
                Reset password
              </button>
              <button
                type="button"
                className={secondaryBtn()}
                disabled={rowBusy}
                onClick={() => (inactive ? onReactivate(employee) : onDeactivate(employee))}
              >
                {inactive ? "Reactivate" : "Deactivate"}
              </button>
              <button type="button" className={dangerBtn()} disabled={rowBusy} onClick={() => onDelete(employee)}>
                Remove
              </button>
            </>
          ) : (
            <div className={cx("text-sm font-black", mutedText())}>
              {isOwnerRow ? "Owner account is protected. Details are view-only here." : "You can view this member, but only the owner can update access."}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function RowActionsMenu({
  employee,
  inactive,
  rowBusy,
  canManage,
  onView,
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
    return (
      <button type="button" className="svx-member-view-button" onClick={() => onView(employee)}>
        View details
      </button>
    );
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
              onView(employee);
            }}
            className={menuItemClass()}
          >
            <span>View details</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit(employee);
            }}
            className={menuItemClass()}
          >
            <span>Update member</span>
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
  const [detailEmployee, setDetailEmployee] = useState(null);

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

  function openDetail(employee) {
    setDetailEmployee(employee);
  }

  function closeDetail() {
    setDetailEmployee(null);
  }

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

    setDetailEmployee(null);
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
    <div className={cx("svx-members-page", embedded ? "space-y-6" : "space-y-6")}>
      <MemberDetailsDrawer
        open={Boolean(detailEmployee)}
        employee={detailEmployee}
        canManage={canManageMembers}
        rowBusy={Boolean(detailEmployee && busyId === detailEmployee.id)}
        onClose={closeDetail}
        onEdit={openEdit}
        onResetPassword={openResetPassword}
        onDeactivate={(emp) => openConfirm("deactivate", emp)}
        onReactivate={(emp) => openConfirm("reactivate", emp)}
        onDelete={(emp) => openConfirm("delete", emp)}
      />

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

            <MemberFormDrawer open={showForm} mode={editing ? "edit" : "create"} onClose={closeForm}>
        {editing ? (
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
        )}
      </MemberFormDrawer>

      <section className={cx(pageCard(), "svx-members-filter-card p-5 sm:p-6")}>
        <div className="svx-members-filter-head">
          <div className="min-w-0">
            <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
              Staff directory
            </div>
            <div className="svx-members-title-row">
              <h2 className={cx("text-[1.45rem] font-black tracking-[-0.04em]", strongText())}>
                Members
              </h2>
              <Badge tone="neutral">{filtered.length} shown</Badge>
            </div>
            <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
              Search staff, open details, then update access only when needed.
            </p>
          </div>

          <div className="svx-members-filter-actions">
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
                {showForm ? "Close drawer" : "Add member"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="svx-members-filter-body">
          <div className="svx-members-filter-fields">
            <div className="svx-members-search-field">
              <label className={cx("text-sm font-black", strongText())}>Search</label>
              <input
                className="app-input mt-2"
                placeholder="Search name, email, phone, role, or branch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
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

            <div>
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

            <div>
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
        </div>

        <div className="svx-members-filter-chips">
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
          <section className="hidden lg:block svx-members-listing-section">
            <div className={cx(pageCard(), "svx-members-table-card overflow-hidden")}>
              <table className="svx-members-table w-full">
                <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  <tr>
                    <th className={cx("px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em]", softText())}>
                      Member
                    </th>
                    <th className={cx("px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em]", softText())}>
                      Role
                    </th>
                    <th className={cx("px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em]", softText())}>
                      Main branch
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
                    const defaultBranch = branches.find((branch) => branch.isDefault) || branches.find((branch) => branch.isMain) || branches[0] || null;

                    return (
                      <tr
                        key={u.id}
                        className="svx-member-row border-b border-[var(--color-border)] align-middle last:border-b-0"
                      >
                        <td className="px-4 py-4">
                          <button type="button" className="svx-member-person-button" onClick={() => openDetail(u)}>
                            <div className="svx-member-avatar">{initialsFromName(u.name)}</div>
                            <div className="min-w-0 text-left">
                              <div className={cx("truncate font-black", strongText())}>{u.name}</div>
                              <div className={cx("mt-1 truncate text-sm font-semibold", mutedText())}>
                                {u.email}
                              </div>
                            </div>
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <RoleBadge role={u.role} />
                        </td>

                        <td className="px-4 py-4">
                          <div className={cx("text-sm font-black", strongText())}>
                            {defaultBranch ? branchDisplayName(defaultBranch) : "No branch"}
                          </div>
                          <div className={cx("mt-1 text-xs font-semibold", mutedText())}>
                            {branches.length ? `${branches.length} assigned` : "Needs assignment"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge active={!inactive} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <RowActionsMenu
                              employee={u}
                              inactive={inactive}
                              rowBusy={rowBusy}
                              canManage={canManageRow}
                              onView={openDetail}
                              onEdit={openEdit}
                              onResetPassword={openResetPassword}
                              onDeactivate={(emp) => openConfirm("deactivate", emp)}
                              onReactivate={(emp) => openConfirm("reactivate", emp)}
                              onDelete={(emp) => openConfirm("delete", emp)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 lg:hidden">
            {filtered.map((u) => {
              const rowBusy = busyId === u.id;
              const inactive = u.isActive === false;
              const isOwnerRow = String(u.role || "").toUpperCase() === "OWNER";
              const canManageRow = canManageMembers && !isOwnerRow;
              const branches = normalizeEmployeeBranches(u);
              const defaultBranch = branches.find((branch) => branch.isDefault) || branches.find((branch) => branch.isMain) || branches[0] || null;

              return (
                <article key={u.id} className={cx(pageCard(), "svx-member-mobile-card p-4")}>
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" className="svx-member-person-button" onClick={() => openDetail(u)}>
                      <div className="svx-member-avatar">{initialsFromName(u.name)}</div>

                      <div className="min-w-0 text-left">
                        <div className={cx("truncate text-base font-black tracking-tight", strongText())}>
                          {u.name}
                        </div>

                        <div className={cx("mt-1 truncate text-sm font-semibold", mutedText())}>
                          {u.email}
                        </div>
                      </div>
                    </button>

                    <StatusBadge active={!inactive} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <InfoStat label="Role" value={roleMeta(u.role).label} />
                    <InfoStat label="Branch" value={defaultBranch ? branchDisplayName(defaultBranch) : "No branch"} sub={branches.length ? `${branches.length} assigned` : "Needs assignment"} />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button type="button" className="svx-member-view-button" onClick={() => openDetail(u)}>
                      View details
                    </button>

                    <RowActionsMenu
                      employee={u}
                      inactive={inactive}
                      rowBusy={rowBusy}
                      canManage={canManageRow}
                      onView={openDetail}
                      onEdit={openEdit}
                      onResetPassword={openResetPassword}
                      onDeactivate={(emp) => openConfirm("deactivate", emp)}
                      onReactivate={(emp) => openConfirm("reactivate", emp)}
                      onDelete={(emp) => openConfirm("delete", emp)}
                    />
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
