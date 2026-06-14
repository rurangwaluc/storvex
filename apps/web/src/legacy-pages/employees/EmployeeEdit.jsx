import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";

import { updateEmployee } from "../../services/employeesApi";
import { listBranches } from "../../services/branchApi";

const ROLE_OPTIONS = [
  { value: "MANAGER", label: "Manager", short: "Supervises operations, but not owner-only controls" },
  { value: "CASHIER", label: "Cashier", short: "Handles checkout and payments" },
  { value: "SELLER", label: "Seller", short: "Focuses on selling" },
  { value: "STOREKEEPER", label: "Storekeeper", short: "Manages stock flow" },
  { value: "TECHNICIAN", label: "Technician", short: "Handles repairs and service" },
];

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

function sectionBadge(tone = "neutral") {
  if (tone === "primary") {
    return "inline-flex items-center rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-black text-[var(--color-primary)]";
  }

  if (tone === "success") {
    return "inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-600 dark:text-emerald-300";
  }

  if (tone === "warning") {
    return "inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-600 dark:text-amber-300";
  }

  return "inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-black text-[var(--color-text-muted)]";
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
        <p className={cx("mt-3 text-sm font-semibold leading-6", mutedText())}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "TM";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function resolveViewer() {
  const token = localStorage.getItem("tenantToken") || localStorage.getItem("token");

  if (!token) {
    return {
      role: "",
      isOwner: false,
    };
  }

  try {
    const decoded = jwtDecode(token);
    const role = normalizeRole(decoded?.role || decoded?.roles?.[0] || "");

    return {
      role,
      isOwner: role === "OWNER" || role === "PLATFORM_ADMIN",
    };
  } catch {
    return {
      role: "",
      isOwner: false,
    };
  }
}

function roleTone(role) {
  const r = normalizeRole(role);

  if (r === "MANAGER") return "primary";
  if (r === "CASHIER") return "success";
  if (r === "SELLER") return "warning";
  if (r === "STOREKEEPER") return "neutral";
  if (r === "TECHNICIAN") return "success";

  return "neutral";
}

function normalizeBranch(branch) {
  if (!branch?.id) return null;

  return {
    id: String(branch.id).trim(),
    name: String(branch.name || "Branch").trim(),
    code: String(branch.code || "").trim(),
    status: String(branch.status || "ACTIVE").trim(),
    isMain: Boolean(branch.isMain),
  };
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
  if (!branch) return "Branch";
  return branch.code ? `${branch.code} • ${branch.name}` : branch.name;
}

export default function EmployeeEdit({ employee, onSaved, onCancel, canEdit = true }) {
  const viewer = useMemo(() => resolveViewer(), []);
  const ownerAllowed = Boolean(canEdit && viewer.isOwner);

  const [saving, setSaving] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [branches, setBranches] = useState([]);

  const [form, setForm] = useState({
    id: null,
    name: "",
    email: "",
    phone: "",
    role: "CASHIER",
    branchIds: [],
    defaultBranchId: "",
  });

  const isProtectedOwner = normalizeRole(employee?.role) === "OWNER";

  useEffect(() => {
    if (!employee) return;

    const assignedBranches = normalizeEmployeeBranches(employee);
    const defaultBranch =
      assignedBranches.find((branch) => branch.isDefault) ||
      assignedBranches.find((branch) => branch.isMain) ||
      assignedBranches[0] ||
      null;

    setForm({
      id: employee.id,
      name: employee.name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      role: employee.role || "CASHIER",
      branchIds: assignedBranches.map((branch) => branch.id),
      defaultBranchId: defaultBranch?.id || "",
    });
  }, [employee]);

  useEffect(() => {
    let alive = true;

    async function loadBranches() {
      setLoadingBranches(true);

      try {
        const data = await listBranches();
        if (!alive) return;

        const nextBranches = Array.isArray(data)
          ? data
          : Array.isArray(data?.branches)
            ? data.branches
            : [];

        const normalized = nextBranches.map(normalizeBranch).filter(Boolean);
        setBranches(normalized);
      } catch (error) {
        console.error(error);
        toast.error(error?.message || "Failed to load branches");
      } finally {
        if (alive) setLoadingBranches(false);
      }
    }

    loadBranches();

    return () => {
      alive = false;
    };
  }, []);

  const selectedRole = useMemo(
    () => ROLE_OPTIONS.find((role) => role.value === form.role) || ROLE_OPTIONS[1],
    [form.role],
  );

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleBranch(branchId) {
    setForm((prev) => {
      const exists = prev.branchIds.includes(branchId);
      const branchIds = exists
        ? prev.branchIds.filter((id) => id !== branchId)
        : [...prev.branchIds, branchId];

      const defaultBranchId = branchIds.includes(prev.defaultBranchId)
        ? prev.defaultBranchId
        : branchIds[0] || "";

      return {
        ...prev,
        branchIds,
        defaultBranchId,
      };
    });
  }

  async function submit(event) {
    event.preventDefault();

    if (!employee || saving || !ownerAllowed) return;

    if (isProtectedOwner) {
      toast.error("OWNER account cannot be modified here");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.role) {
      toast.error("Please fill name, email, and role");
      return;
    }

    if (branches.length > 0 && form.branchIds.length === 0) {
      toast.error("Assign this member to at least one branch");
      return;
    }

    if (form.branchIds.length > 0 && !form.defaultBranchId) {
      toast.error("Choose a default branch");
      return;
    }

    setSaving(true);

    try {
      await updateEmployee(form.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || "",
        role: form.role,
        branchIds: form.branchIds,
        defaultBranchId: form.defaultBranchId || form.branchIds[0] || null,
        branchAssignments: form.branchIds.map((branchId) => ({
          branchId,
          isDefault: branchId === form.defaultBranchId,
          canOperate: true,
          canViewReports: ["MANAGER", "OWNER"].includes(form.role),
        })),
      });

      toast.success("Team member updated");
      onSaved?.();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to update team member");
    } finally {
      setSaving(false);
    }
  }

  if (!employee) return null;

  if (!ownerAllowed) {
    return (
      <div className={cx(pageCard(), "p-6")}>
        <div className={cx("text-lg font-black tracking-tight", strongText())}>
          Owner-only action
        </div>
        <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
          Managers can review staff, but only the owner can edit staff accounts and branch access.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cx(pageCard(), "svx-member-editor-form overflow-hidden")}>
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <SectionHeading
              eyebrow="Edit team member"
              title="Update staff access"
              subtitle="Adjust account details, operational role, and branch access without touching the protected owner account."
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {onCancel ? (
              <button type="button" onClick={onCancel} disabled={saving} className={secondaryBtn()}>
                Close
              </button>
            ) : null}          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div className={cx(softPanel(), "p-4")}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-sm font-black text-[var(--color-primary-contrast)]">
              {initialsFromName(form.name)}
            </div>

            <div className="min-w-0">
              <div className={cx("truncate text-sm font-black", strongText())}>
                {form.name.trim() || "Team member"}
              </div>
              <div className={cx("truncate text-xs font-semibold", mutedText())}>
                {form.email.trim() || "employee@example.com"}
              </div>
            </div>

            <span className={cx("ml-auto", sectionBadge(isProtectedOwner ? "neutral" : roleTone(form.role)))}>
              {isProtectedOwner ? "Owner" : selectedRole.label}
            </span>
          </div>
        </div>

        {isProtectedOwner ? (
          <div className={cx(softPanel(), "p-4")}>
            <div className={cx("text-sm font-black", strongText())}>Protected account</div>
            <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
              The OWNER account cannot be changed from this screen. This prevents accidental lockout or privilege mistakes.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={cx("text-sm font-black", strongText())}>Full name</label>
            <input
              className={cx(inputClass(), "mt-2")}
              placeholder="Example: Jules Uwase"
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              disabled={isProtectedOwner}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={cx("text-sm font-black", strongText())}>Email address</label>
            <input
              className={cx(inputClass(), "mt-2")}
              placeholder="employee@example.com"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              disabled={isProtectedOwner}
            />
          </div>

          <div>
            <label className={cx("text-sm font-black", strongText())}>Phone number</label>
            <input
              className={cx(inputClass(), "mt-2")}
              placeholder="Optional"
              value={form.phone}
              onChange={(event) => setField("phone", event.target.value)}
              disabled={isProtectedOwner}
            />
          </div>

          <div>
            <label className={cx("text-sm font-black", strongText())}>Role</label>
            <select
              className={cx(inputClass(), "mt-2")}
              value={form.role}
              onChange={(event) => setField("role", event.target.value)}
              disabled={isProtectedOwner}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>
              {isProtectedOwner ? "OWNER role cannot be changed here." : selectedRole.short}
            </p>
          </div>
        </div>

        <div className={cx(softPanel(), "p-4")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className={cx("text-sm font-black", strongText())}>Branch access</div>
              <p className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
                Select where this staff member can operate. One branch must be marked as default.
              </p>
            </div>

            <span className={sectionBadge(form.branchIds.length ? "success" : "warning")}>
              {loadingBranches ? "Loading branches" : `${form.branchIds.length} selected`}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {branches.map((branch) => {
              const selected = form.branchIds.includes(branch.id);
              const isDefault = form.defaultBranchId === branch.id;

              return (
                <div
                  key={branch.id}
                  className={cx(
                    "rounded-[22px] border p-4 transition",
                    selected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-card)]",
                  )}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={isProtectedOwner}
                      onChange={() => toggleBranch(branch.id)}
                      className="mt-1 h-4 w-4 rounded border-[var(--color-border)]"
                    />

                    <span className="min-w-0 flex-1">
                      <span className={cx("block text-sm font-black", strongText())}>
                        {branchDisplayName(branch)}
                      </span>
                      <span className={cx("mt-1 block text-xs font-semibold", mutedText())}>
                        {branch.isMain ? "Main branch" : "Standard branch"} • {branch.status}
                      </span>
                    </span>
                  </label>

                  {selected ? (
                    <button
                      type="button"
                      disabled={isProtectedOwner}
                      onClick={() => setField("defaultBranchId", branch.id)}
                      className={cx(
                        "mt-3 inline-flex h-9 items-center justify-center rounded-2xl px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-70",
                        isDefault
                          ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                          : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)]",
                      )}
                    >
                      {isDefault ? "Default branch" : "Set as default"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!loadingBranches && branches.length === 0 ? (
            <p className={cx("mt-4 text-sm font-semibold leading-6", mutedText())}>
              No branches found. Create the main branch first before assigning staff.
            </p>
          ) : null}
        </div>

        <div className={cx(softPanel(), "p-4")}>
          <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
            Password changes
          </div>
          <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
            Password reset is handled from the member actions menu. This keeps profile edits separate from credential resets.
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel ? (
            <button type="button" onClick={onCancel} disabled={saving} className={secondaryBtn()}>
              Cancel
            </button>
          ) : null}

          <button
            type="submit"
            disabled={saving || isProtectedOwner || loadingBranches}
            className={primaryBtn()}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}