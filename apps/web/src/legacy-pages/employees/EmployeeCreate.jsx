import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";

import { createEmployee } from "../../services/employeesApi";
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

function passwordStrengthLabel(password) {
  const p = String(password || "");

  if (!p) return { label: "Not set", tone: "neutral" };
  if (p.length < 6) return { label: "Too short", tone: "warning" };
  if (p.length < 8) return { label: "Basic", tone: "warning" };

  if (/[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p)) {
    return { label: "Strong", tone: "success" };
  }

  return { label: "Good", tone: "primary" };
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

function branchDisplayName(branch) {
  if (!branch) return "Branch";
  return branch.code ? `${branch.code} • ${branch.name}` : branch.name;
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 3l18 18M10.58 10.59A2 2 0 0012 14a2 2 0 001.41-.59M9.88 5.09A9.77 9.77 0 0112 4c5.23 0 8.56 3.66 9.62 5.04a1.5 1.5 0 010 1.92 16.13 16.13 0 01-4.04 3.72M6.1 6.1A16.2 16.2 0 002.38 9.04a1.5 1.5 0 000 1.92C3.44 12.34 6.77 16 12 16c1.67 0 3.16-.37 4.49-.95"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.38 10.96a1.5 1.5 0 010-1.92C3.44 7.66 6.77 4 12 4s8.56 3.66 9.62 5.04a1.5 1.5 0 010 1.92C20.56 12.34 17.23 16 12 16S3.44 12.34 2.38 10.96z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 14a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function EmployeeCreate({ onSaved, onCancel, canCreate = true }) {
  const viewer = useMemo(() => resolveViewer(), []);
  const ownerAllowed = Boolean(canCreate && viewer.isOwner);

  const [saving, setSaving] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [branches, setBranches] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "CASHIER",
    branchIds: [],
    defaultBranchId: "",
  });

  const selectedRole = useMemo(
    () => ROLE_OPTIONS.find((role) => role.value === form.role) || ROLE_OPTIONS[1],
    [form.role],
  );

  const passwordState = useMemo(() => passwordStrengthLabel(form.password), [form.password]);

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

        if (normalized.length === 1) {
          setForm((prev) => ({
            ...prev,
            branchIds: [normalized[0].id],
            defaultBranchId: normalized[0].id,
          }));
        } else {
          const main = normalized.find((branch) => branch.isMain) || normalized[0] || null;

          if (main) {
            setForm((prev) => ({
              ...prev,
              branchIds: prev.branchIds.length ? prev.branchIds : [main.id],
              defaultBranchId: prev.defaultBranchId || main.id,
            }));
          }
        }
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

    if (saving || !ownerAllowed) return;

    if (!form.name.trim() || !form.email.trim() || !form.password.trim() || !form.role) {
      toast.error("Please fill name, email, password, and role");
      return;
    }

    if (form.password.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
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
      await createEmployee({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
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

      toast.success("Team member added");

      setForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "CASHIER",
        branchIds: branches.length === 1 ? [branches[0].id] : [],
        defaultBranchId: branches.length === 1 ? branches[0].id : "",
      });

      setShowPassword(false);
      onSaved?.();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to add team member");
    } finally {
      setSaving(false);
    }
  }

  if (!ownerAllowed) {
    return (
      <div className={cx(pageCard(), "p-6")}>
        <div className={cx("text-lg font-black tracking-tight", strongText())}>
          Owner-only action
        </div>
        <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
          Managers can review staff, but only the owner can create staff accounts.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cx(pageCard(), "overflow-hidden")}>
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <SectionHeading
              eyebrow="New team member"
              title="Create a staff account"
              subtitle="Add a secure employee profile, assign the right role, and connect the person to the branches they can operate from."
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {onCancel ? (
              <button type="button" onClick={onCancel} disabled={saving} className={secondaryBtn()}>
                Close
              </button>
            ) : null}

            <button type="submit" disabled={saving || loadingBranches} className={primaryBtn()}>
              {saving ? "Creating..." : "Create member"}
            </button>
          </div>
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
                {form.name.trim() || "New team member"}
              </div>
              <div className={cx("truncate text-xs font-semibold", mutedText())}>
                {form.email.trim() || "employee@example.com"}
              </div>
            </div>

            <span className={cx("ml-auto", sectionBadge(roleTone(form.role)))}>
              {selectedRole.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={cx("text-sm font-black", strongText())}>Full name</label>
            <input
              className={cx(inputClass(), "mt-2")}
              placeholder="Example: Jules Uwase"
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={cx("text-sm font-black", strongText())}>Email address</label>
            <input
              className={cx(inputClass(), "mt-2")}
              placeholder="employee@example.com"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
            />
          </div>

          <div>
            <label className={cx("text-sm font-black", strongText())}>Temporary password</label>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                className={cx(inputClass(), "pr-12")}
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(event) => setField("password", event.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>

            <div className="mt-2">
              <span className={sectionBadge(passwordState.tone)}>{passwordState.label}</span>
            </div>
          </div>

          <div>
            <label className={cx("text-sm font-black", strongText())}>Phone number</label>
            <input
              className={cx(inputClass(), "mt-2")}
              placeholder="Optional"
              value={form.phone}
              onChange={(event) => setField("phone", event.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={cx("text-sm font-black", strongText())}>Role</label>
            <select
              className={cx(inputClass(), "mt-2")}
              value={form.role}
              onChange={(event) => setField("role", event.target.value)}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <p className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>
              {selectedRole.short}
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
                      onClick={() => setField("defaultBranchId", branch.id)}
                      className={cx(
                        "mt-3 inline-flex h-9 items-center justify-center rounded-2xl px-3 text-xs font-black transition",
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
              No branches found. Create the main branch first before adding staff.
            </p>
          ) : null}
        </div>

        <div className={cx(softPanel(), "p-4")}>
          <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
            Access rule
          </div>
          <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
            Staff should only receive the access they need for daily work. Owner-only powers stay locked to the owner account.
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

          <button type="submit" disabled={saving || loadingBranches} className={primaryBtn()}>
            {saving ? "Creating..." : "Create member"}
          </button>
        </div>
      </div>
    </form>
  );
}