import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  archiveBranch,
  createBranch,
  listBranches,
  reactivateBranch,
  setMainBranch,
  updateBranch,
} from "../../services/branchApi";
import { getUserRole } from "../../utils/role";
import "./Settings.css";
import "./SettingsBranches.css";

const EMPTY_FORM = {
  name: "",
  code: "",
  phone: "",
  email: "",
  district: "",
  sector: "",
  address: "",
};

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function planLabel(value) {
  const raw = cleanString(value);
  if (!raw) return "";

  const normalized = raw
    .replace(/^LAUNCH_/i, "")
    .replace(/_/g, " ")
    .toLowerCase();

  return normalized.replace(
    /\b\w/g,
    (letter) => letter.toUpperCase(),
  );
}

function pageCard() {
  return "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
}

function fieldLabel() {
  return "mb-1.5 block text-sm font-black text-[var(--color-text)]";
}

function fieldHelp() {
  return "mt-1.5 text-xs font-semibold leading-5 text-[var(--color-text-muted)]";
}

function inputClass() {
  return [
    "h-12 w-full rounded-[18px]",
    "border border-[var(--color-border)]",
    "bg-[var(--color-surface-2)]",
    "px-4 text-sm font-bold text-[var(--color-text)]",
    "outline-none transition",
    "placeholder:text-[var(--color-text-muted)]",
    "focus:border-[var(--color-primary)]",
    "focus:ring-4 focus:ring-[var(--color-primary-ring)]",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ].join(" ");
}

function normalizeBranchCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusTone(status) {
  const value = String(status || "").toUpperCase();

  if (value === "ACTIVE") {
    return "bg-[var(--settings-success-soft)] text-[var(--settings-success)]";
  }

  if (value === "CLOSED") {
    return "bg-amber-500/10 text-amber-600";
  }

  if (value === "ARCHIVED") {
    return "bg-red-500/10 text-red-600";
  }

  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SectionHeader({ eyebrow, title, text, action = null }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
          {eyebrow}
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
          {title}
        </h2>

        {text ? (
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            {text}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const accent =
    tone === "warning"
      ? "bg-amber-500"
      : tone === "danger"
        ? "bg-red-500"
        : tone === "success"
          ? "bg-[var(--settings-success)]"
          : "bg-[var(--color-text-muted)]";

  return (
    <article className={cx(pageCard(), "svx-branch-summary-card relative overflow-hidden p-5")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accent)} />

      <div className="pl-2">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {label}
        </p>

        <div className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-text)]">
          {value}
        </div>

        {note ? (
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            {note}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="svx-branch-detail-line flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</span>
      <span className="svx-branch-detail-value max-w-[58%] truncate text-right text-sm font-black text-[var(--color-text)]">
        {value || "—"}
      </span>
    </div>
  );
}


function branchLocation(branch) {
  return [branch?.district, branch?.sector, branch?.address].filter(Boolean).join(", ");
}

function formFromBranch(branch) {
  return {
    name: branch?.name || "",
    code: branch?.code || "",
    phone: branch?.phone || "",
    email: branch?.email || "",
    district: branch?.district || "",
    sector: branch?.sector || "",
    address: branch?.address || "",
  };
}

function payloadFromForm(form) {
  return {
    name: cleanString(form.name),
    code: normalizeBranchCode(form.code),
    phone: cleanString(form.phone) || undefined,
    email: cleanString(form.email) || undefined,
    district: cleanString(form.district) || undefined,
    sector: cleanString(form.sector) || undefined,
    address: cleanString(form.address) || undefined,
  };
}

function BranchRow({
  branch,
  onView,
  onEdit,
  canManage,
}) {
  const location = branchLocation(branch);
  const status = String(
    branch?.status || "",
  ).toUpperCase();

  const canEdit =
    canManage && status !== "ARCHIVED";

  return (
    <article className="svx-branch-row">
      <div className="svx-branch-row-main">
        <div className="svx-branch-code-mark svx-branch-row-mark">
          {String(branch?.code || "BR").slice(0, 2)}
        </div>

        <div className="min-w-0">
          <div className="svx-branch-row-title">
            <strong>{branch?.name || "Branch"}</strong>
            {branch?.isMain ? (
              <Pill className="bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                Main
              </Pill>
            ) : null}
          </div>
        </div>
      </div>

      <div className="svx-branch-row-location">
        <span>Location</span>
        <strong>{location || "Not set"}</strong>
      </div>

      <div className="svx-branch-row-status">
        <Pill className={statusTone(branch?.status)}>{branch?.status || "UNKNOWN"}</Pill>
      </div>

      <div className="svx-branch-row-actions">
        <button type="button" onClick={() => onView(branch)}>
          View
        </button>
        {canEdit ? (
          <button
            type="button"
            onClick={() => onEdit(branch)}
          >
            Edit
          </button>
        ) : null}
      </div>
    </article>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className={cx(softPanel(), "px-5 py-10 text-center")}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] text-2xl shadow-[var(--shadow-soft)]">
        🏬
      </div>

      <h3 className="mt-4 text-lg font-black text-[var(--color-text)]">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>
    </div>
  );
}


function DrawerShell({ open, title, eyebrow, subtitle, onClose, children, footer = null }) {
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
    <div className="svx-branch-drawer-layer">
      <button type="button" className="svx-branch-drawer-backdrop" aria-label="Close branch drawer" onClick={onClose} />

      <aside className="svx-branch-drawer-panel" role="dialog" aria-modal="true" aria-label={title}>
        <header className="svx-branch-drawer-header">
          <div className="min-w-0">
            <span>{eyebrow}</span>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>

          <button type="button" className="svx-branch-drawer-close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="svx-branch-drawer-body">{children}</div>

        {footer ? <footer className="svx-branch-drawer-footer">{footer}</footer> : null}
      </aside>
    </div>,
    document.body,
  );
}

function BranchDetailsDrawer({
  branch,
  open,
  onClose,
  onEdit,
  onSetMain,
  onArchive,
  onReactivate,
  canManage,
  canReactivate,
  action,
}) {
  const [confirmArchive, setConfirmArchive] =
    useState(false);

  useEffect(() => {
    setConfirmArchive(false);
  }, [branch?.id, open]);

  if (!branch) return null;

  const location = branchLocation(branch);
  const status = String(
    branch?.status || "",
  ).toUpperCase();

  const isActive = status === "ACTIVE";
  const isArchived = status === "ARCHIVED";
  const isBusy = Boolean(action);

  const showEdit =
    canManage && !isArchived;

  const showSetMain =
    canManage &&
    isActive &&
    !branch?.isMain;

  const showArchive =
    canManage &&
    !branch?.isMain &&
    !isArchived;

  const showReactivate =
    canManage &&
    !isActive;

  let footer = null;

  if (canManage) {
    if (confirmArchive) {
      footer = (
        <>
          <button
            type="button"
            className="svx-branch-secondary-action"
            disabled={isBusy}
            onClick={() =>
              setConfirmArchive(false)
            }
          >
            Keep branch
          </button>

          <button
            type="button"
            className="svx-branch-danger-action"
            disabled={isBusy}
            onClick={() => onArchive(branch)}
          >
            {action === "archive"
              ? "Archiving..."
              : "Archive branch"}
          </button>
        </>
      );
    } else {
      footer = (
        <>
          {showArchive ? (
            <button
              type="button"
              className="svx-branch-danger-action"
              disabled={isBusy}
              onClick={() =>
                setConfirmArchive(true)
              }
            >
              Archive
            </button>
          ) : null}

          {showSetMain ? (
            <button
              type="button"
              className="svx-branch-secondary-action"
              disabled={isBusy}
              onClick={() =>
                onSetMain(branch)
              }
            >
              {action === "main"
                ? "Updating..."
                : "Set as main"}
            </button>
          ) : null}

          {showReactivate ? (
            <button
              type="button"
              className="svx-branch-primary-action"
              disabled={
                isBusy || !canReactivate
              }
              onClick={() =>
                onReactivate(branch)
              }
            >
              {action === "reactivate"
                ? "Reactivating..."
                : "Reactivate"}
            </button>
          ) : null}

          {showEdit ? (
            <button
              type="button"
              className="svx-branch-primary-action"
              disabled={isBusy}
              onClick={() =>
                onEdit(branch)
              }
            >
              Edit branch
            </button>
          ) : null}
        </>
      );
    }
  }

  return (
    <DrawerShell
      open={open}
      onClose={isBusy ? undefined : onClose}
      eyebrow="Branch details"
      title={branch.name || "Branch"}
      subtitle={
        canManage
          ? "Review this branch and manage how it is used across the business."
          : "Review this branch and its business details."
      }
      footer={footer}
    >
      <div className="svx-branch-drawer-profile">
        <div className="svx-branch-code-mark">{String(branch?.code || "BR").slice(0, 2)}</div>

        <div className="min-w-0">
          <strong>{branch?.name || "Branch"}</strong>
          <span>{branch?.code || "NO_CODE"}</span>
        </div>

        <div className="svx-branch-drawer-pills">
          <Pill className={statusTone(branch?.status)}>{branch?.status || "UNKNOWN"}</Pill>
          {branch?.isMain ? (
            <Pill className="bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              Main branch
            </Pill>
          ) : null}
        </div>
      </div>

      <section className="svx-branch-drawer-section">
        <h4>Contact</h4>
        <DetailLine label="Phone" value={branch?.phone} />
        <DetailLine label="Email" value={branch?.email} />
      </section>

      <section className="svx-branch-drawer-section">
        <h4>Location</h4>
        <DetailLine
          label="Country"
          value={branch?.countryCode || "Not configured"}
        />
        <DetailLine label="District" value={branch?.district} />
        <DetailLine label="Sector" value={branch?.sector} />
        <DetailLine label="Address" value={branch?.address} />
        <DetailLine label="Full location" value={location || "Not set"} />
      </section>

      <section className="svx-branch-drawer-section">
        <h4>Record</h4>
        <DetailLine
          label="Created"
          value={formatDate(branch?.createdAt)}
        />
        <DetailLine
          label="Updated"
          value={formatDate(branch?.updatedAt)}
        />
      </section>

      {confirmArchive ? (
        <section className="svx-branch-drawer-section svx-branch-archive-confirm">
          <h4>Archive this branch?</h4>
          <p>
            This removes staff access to this branch
            and takes it out of active operations.
            You can reactivate it later if your plan
            has branch capacity.
          </p>
        </section>
      ) : null}

      {showReactivate && !canReactivate ? (
        <section className="svx-branch-drawer-section svx-branch-capacity-note">
          <h4>Branch limit reached</h4>
          <p>
            Your current plan has no free branch
            capacity. Add capacity before
            reactivating this branch.
          </p>
        </section>
      ) : null}

      {!canManage ? (
        <section className="svx-branch-drawer-section">
          <h4>View only</h4>
          <p className="svx-branch-drawer-note">
            Branch changes are managed by the
            business owner.
          </p>
        </section>
      ) : null}
    </DrawerShell>
  );
}


function BranchCreateDrawer({ open, form, setForm, saving, canCreate, usage, onClose, onSubmit }) {
  const atLimit = usage?.atLimit || usage?.canAddBranch === false;
  const disabled = saving || !canCreate || atLimit;

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <DrawerShell
      open={open}
      onClose={saving ? undefined : onClose}
      eyebrow="New branch"
      title="Add branch"
      subtitle="Create a branch only when the store truly operates from another physical location."
      footer={
        <>
          <button type="button" className="svx-branch-secondary-action" disabled={saving} onClick={onClose}>
            Cancel
          </button>

          <AsyncButton
            type="submit"
            form="svx-branch-create-form"
            loading={saving}
            loadingText="Creating..."
            disabled={disabled}
            className="svx-branch-primary-action"
          >
            Create branch
          </AsyncButton>
        </>
      }
    >
      {atLimit ? (
        <div className="svx-branch-drawer-section">
          <h4>Branch limit reached</h4>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            Your current plan does not allow another active branch.
          </p>
        </div>
      ) : null}

      <form id="svx-branch-create-form" onSubmit={onSubmit} className="svx-branch-drawer-form">
        <div className="svx-branch-form-grid grid gap-4 sm:grid-cols-2">
          <div>
            <label className={fieldLabel()}>Branch name</label>
            <input className={inputClass()} value={form.name} disabled={disabled} onChange={(event) => setField("name", event.target.value)} placeholder="Example: Downtown branch" required />
          </div>

          <div>
            <label className={fieldLabel()}>Branch code</label>
            <input className={inputClass()} value={form.code} disabled={disabled} onChange={(event) => setField("code", normalizeBranchCode(event.target.value))} placeholder="Example: DOWNTOWN" required />
            <p className={fieldHelp()}>Use a short owner-friendly code. Example: MAIN, CBD, WEST.</p>
          </div>

          <div>
            <label className={fieldLabel()}>Phone</label>
            <input className={inputClass()} value={form.phone} disabled={disabled} onChange={(event) => setField("phone", event.target.value)} placeholder="Phone number" />
          </div>

          <div>
            <label className={fieldLabel()}>Email</label>
            <input type="email" className={inputClass()} value={form.email} disabled={disabled} onChange={(event) => setField("email", event.target.value)} placeholder="branch@store.com" />
          </div>

          <div>
            <label className={fieldLabel()}>District</label>
            <input className={inputClass()} value={form.district} disabled={disabled} onChange={(event) => setField("district", event.target.value)} placeholder="Example: Central" />
          </div>

          <div>
            <label className={fieldLabel()}>Sector</label>
            <input className={inputClass()} value={form.sector} disabled={disabled} onChange={(event) => setField("sector", event.target.value)} placeholder="Example: Central" />
          </div>

          <div>
            <label className={fieldLabel()}>Address</label>
            <input className={inputClass()} value={form.address} disabled={disabled} onChange={(event) => setField("address", event.target.value)} placeholder="Street, building or landmark" />
          </div>
        </div>
      </form>
    </DrawerShell>
  );
}

function BranchEditDrawer({ branch, open, form, setForm, saving, onClose, onSubmit }) {
  if (!branch) return null;

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <DrawerShell
      open={open}
      onClose={saving ? undefined : onClose}
      eyebrow="Update branch"
      title={branch.name || "Edit branch"}
      subtitle="Update the contact and location details used across sales, stock, reports, and staff work."
      footer={
        <>
          <button type="button" className="svx-branch-secondary-action" disabled={saving} onClick={onClose}>
            Cancel
          </button>

          <AsyncButton
            type="submit"
            form="svx-branch-edit-form"
            loading={saving}
            loadingText="Saving..."
            className="svx-branch-primary-action"
          >
            Save changes
          </AsyncButton>
        </>
      }
    >
      <form id="svx-branch-edit-form" onSubmit={onSubmit} className="svx-branch-drawer-form">
        <div className="svx-branch-form-grid grid gap-4 sm:grid-cols-2">
          <div>
            <label className={fieldLabel()}>Branch name</label>
            <input className={inputClass()} value={form.name} disabled={saving} onChange={(event) => setField("name", event.target.value)} required />
          </div>

          <div>
            <label className={fieldLabel()}>Branch code</label>
            <input className={inputClass()} value={form.code} disabled={saving || branch?.isMain} onChange={(event) => setField("code", normalizeBranchCode(event.target.value))} required />
            <p className={fieldHelp()}>{branch?.isMain ? "Main branch code is protected." : "Use a short owner-friendly code."}</p>
          </div>

          <div>
            <label className={fieldLabel()}>Phone</label>
            <input className={inputClass()} value={form.phone} disabled={saving} onChange={(event) => setField("phone", event.target.value)} placeholder="Phone number" />
          </div>

          <div>
            <label className={fieldLabel()}>Email</label>
            <input type="email" className={inputClass()} value={form.email} disabled={saving} onChange={(event) => setField("email", event.target.value)} placeholder="branch@store.com" />
          </div>

          <div>
            <label className={fieldLabel()}>District</label>
            <input className={inputClass()} value={form.district} disabled={saving} onChange={(event) => setField("district", event.target.value)} placeholder="Example: Central" />
          </div>

          <div>
            <label className={fieldLabel()}>Sector</label>
            <input className={inputClass()} value={form.sector} disabled={saving} onChange={(event) => setField("sector", event.target.value)} placeholder="Example: Central" />
          </div>

          <div>
            <label className={fieldLabel()}>Address</label>
            <input className={inputClass()} value={form.address} disabled={saving} onChange={(event) => setField("address", event.target.value)} placeholder="Street, building or landmark" />
          </div>
        </div>
      </form>
    </DrawerShell>
  );
}

function BranchForm({ form, setForm, saving, canCreate, usage, onSubmit }) {
  const atLimit = usage?.atLimit || usage?.canAddBranch === false;

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className={cx(pageCard(), "svx-branch-form p-5 sm:p-6")}>
      <SectionHeader
        eyebrow="Create branch"
        title="Add a new branch"
        text="Create a branch only when the store truly operates from another physical location. Branches affect stock, sales, documents, reports, and staff assignments."
      />

      {atLimit ? (
        <div className="mt-5 rounded-[24px] border border-amber-400/25 bg-amber-500/10 p-4">
          <p className="text-sm font-black text-[var(--color-text)]">Branch limit reached</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            Your current plan does not allow another active branch. Upgrade or add branch slot
            before creating a new branch.
          </p>
        </div>
      ) : null}

      <div className="svx-branch-form-grid mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={fieldLabel()}>Branch name</label>
          <input
            className={inputClass()}
            value={form.name}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("name", event.target.value)}
            placeholder="Example: Downtown branch"
            required
          />
        </div>

        <div>
          <label className={fieldLabel()}>Branch code</label>
          <input
            className={inputClass()}
            value={form.code}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("code", normalizeBranchCode(event.target.value))}
            placeholder="Example: DOWNTOWN"
            required
          />
          <p className={fieldHelp()}>Use a short owner-friendly code. Example: MAIN, CBD, WEST.</p>
        </div>

        <div>
          <label className={fieldLabel()}>Phone</label>
          <input
            className={inputClass()}
            value={form.phone}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("phone", event.target.value)}
            placeholder="Phone number"
          />
        </div>

        <div>
          <label className={fieldLabel()}>Email</label>
          <input
            type="email"
            className={inputClass()}
            value={form.email}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("email", event.target.value)}
            placeholder="branch@store.com"
          />
        </div>

        <div>
          <label className={fieldLabel()}>District</label>
          <input
            className={inputClass()}
            value={form.district}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("district", event.target.value)}
            placeholder="Example: Central"
          />
        </div>

        <div>
          <label className={fieldLabel()}>Sector</label>
          <input
            className={inputClass()}
            value={form.sector}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("sector", event.target.value)}
            placeholder="Example: Central"
          />
        </div>

        <div>
          <label className={fieldLabel()}>Address</label>
          <input
            className={inputClass()}
            value={form.address}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("address", event.target.value)}
            placeholder="Street, building or landmark"
          />
        </div>
      </div>

      <div className="svx-branch-create-bar mt-6 flex flex-col gap-3 rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-[var(--color-text)]">After creation</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
            The branch becomes available for inventory, sales, reports, and staff assignment.
          </p>
        </div>

        <AsyncButton
          type="submit"
          loading={saving}
          loadingText="Creating..."
          disabled={!canCreate || atLimit}
          className="w-full sm:w-auto"
        >
          Create branch
        </AsyncButton>
      </div>
    </form>
  );
}

export default function SettingsBranches() {
  const role = getUserRole();
  const canManage = role === "OWNER";

  const [branches, setBranches] = useState([]);
  const [usage, setUsage] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [subscription, setSubscription] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingBranch, setViewingBranch] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [branchAction, setBranchAction] =
    useState(null);

  async function load({ quiet = false } = {}) {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await listBranches();

      setBranches(Array.isArray(data?.branches) ? data.branches : []);
      setUsage(data?.usage || null);
      setTenant(data?.tenant || null);
      setSubscription(data?.subscription || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to load branches");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [branches]);

  const activeBranches = useMemo(() => {
    return branches.filter((branch) => String(branch.status || "").toUpperCase() === "ACTIVE");
  }, [branches]);

  const mainBranch = useMemo(() => {
    return branches.find((branch) => branch.isMain) || null;
  }, [branches]);

  const limitLabel =
    usage?.effectiveBranchLimit === null || usage?.effectiveBranchLimit === undefined
      ? "Unlimited"
      : String(usage.effectiveBranchLimit);

  const hasBranchCapacity =
    usage?.canAddBranch !== false;

  const canCreate =
    canManage && hasBranchCapacity;

  const canReactivate =
    hasBranchCapacity;


  function openCreate() {
    if (!canManage) return;
    setViewingBranch(null);
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setShowCreateDrawer(true);
  }

  function openView(branch) {
    setViewingBranch(branch);
    setEditingBranch(null);
  }

  function openEdit(branch) {
    if (!canManage) return;

    if (
      String(
        branch?.status || "",
      ).toUpperCase() === "ARCHIVED"
    ) {
      toast.error(
        "Reactivate this branch before editing it.",
      );
      return;
    }

    setViewingBranch(null);
    setEditingBranch(branch);
    setEditForm(formFromBranch(branch));
  }

  function closeBranchDrawers() {
    if (editSaving || branchAction) return;
    setViewingBranch(null);
    setEditingBranch(null);
    setShowCreateDrawer(false);
    setEditForm(EMPTY_FORM);
    setForm(EMPTY_FORM);
  }

  async function submitEdit(event) {
    event.preventDefault();

    if (!canManage) {
      toast.error(
        "Only the business owner can change branches.",
      );
      return;
    }

    if (!editingBranch?.id) return;

    const payload = payloadFromForm(editForm);

    if (!payload.name) {
      toast.error("Branch name is required");
      return;
    }

    if (!payload.code) {
      toast.error("Branch code is required");
      return;
    }

    setEditSaving(true);

    try {
      await updateBranch(editingBranch.id, payload);
      toast.success("Branch updated");
      closeBranchDrawers();
      await load({ quiet: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to update branch");
    } finally {
      setEditSaving(false);
    }
  }

  async function submit(event) {
    event.preventDefault();

    if (!canManage) {
      toast.error(
        "Only the business owner can add branches.",
      );
      return;
    }

    const payload = {
      name: cleanString(form.name),
      code: normalizeBranchCode(form.code),
      phone: cleanString(form.phone) || undefined,
      email: cleanString(form.email) || undefined,
      district: cleanString(form.district) || undefined,
      sector: cleanString(form.sector) || undefined,
      address: cleanString(form.address) || undefined,
    };

    if (!payload.name) {
      toast.error("Branch name is required");
      return;
    }

    if (!payload.code) {
      toast.error("Branch code is required");
      return;
    }

    setSaving(true);

    try {
      await createBranch(payload);
      toast.success("Branch created");
      setForm(EMPTY_FORM);
      await load({ quiet: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to create branch");
    } finally {
      setSaving(false);
    }
  }

  async function runBranchAction(
    type,
    branch,
    request,
    successMessage,
  ) {
    if (!canManage || !branch?.id || branchAction) {
      return;
    }

    setBranchAction(type);

    try {
      await request(branch.id);
      toast.success(successMessage);
      setViewingBranch(null);
      setEditingBranch(null);
      await load({ quiet: true });
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not update this branch.",
      );
    } finally {
      setBranchAction(null);
    }
  }

  async function handleSetMain(branch) {
    await runBranchAction(
      "main",
      branch,
      setMainBranch,
      "Main branch updated",
    );
  }

  async function handleArchive(branch) {
    await runBranchAction(
      "archive",
      branch,
      archiveBranch,
      "Branch archived",
    );
  }

  async function handleReactivate(branch) {
    if (!canReactivate) {
      toast.error(
        "Your current plan has no free branch capacity.",
      );
      return;
    }

    await runBranchAction(
      "reactivate",
      branch,
      reactivateBranch,
      "Branch reactivated",
    );
  }

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="w-52"
        lines={3}
        showTable={false}
      />
    );
  }

  return (
    <div className="svx-settings-page svx-settings-branches space-y-6">
      <section className={cx(pageCard(), "svx-branch-overview-card p-5 sm:p-6")}>
        <SectionHeader
          eyebrow="Branches"
          title="Branch control"
          text="Manage the physical locations used by your business. Sales, stock, reports, documents and staff access depend on the correct branch."
          action={
            <div className="svx-branch-page-actions">
              <AsyncButton
                type="button"
                variant="secondary"
                loading={refreshing}
                loadingText="Refreshing..."
                onClick={() => load({ quiet: true })}
              >
                Refresh
              </AsyncButton>

              {canManage ? (
                <button
                  type="button"
                  className="svx-branch-primary-action"
                  disabled={!hasBranchCapacity}
                  onClick={openCreate}
                >
                  Add branch
                </button>
              ) : null}
            </div>
          }
        />

        <div className="svx-branch-summary-grid mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Active branches"
            value={usage?.activeBranches ?? activeBranches.length}
            note="Branches currently counted against the plan."
            tone="success"
          />

          <SummaryCard
            label="Branch limit"
            value={limitLabel}
            note={
              subscription?.planKey
                ? `${planLabel(subscription.planKey)} plan capacity.`
                : "Current plan capacity."
            }
            tone={usage?.atLimit ? "warning" : "neutral"}
          />

          <SummaryCard
            label="Main branch"
            value={mainBranch?.name || "—"}
            note={
              mainBranch?.code
                ? `Code ${mainBranch.code}`
                : tenant?.name || "Main branch not found."
            }
            tone={mainBranch ? "success" : "warning"}
          />

          <SummaryCard
            label="Branch capacity"
            value={
              hasBranchCapacity ? "Available" : "Full"
            }
            note={
              hasBranchCapacity
                ? "Plan still has room for another active branch."
                : "Plan branch limit is reached."
            }
            tone={
              hasBranchCapacity
                ? "success"
                : "warning"
            }
          />
        </div>
      </section>

      <section className={cx(pageCard(), "svx-branch-list-card p-5 sm:p-6")}>
        <SectionHeader
          eyebrow="Current branches"
          title="Store branch list"
          text="This is the branch structure currently attached to the store."
        />

        <div className="mt-6">
          {sortedBranches.length ? (
            <div className="svx-branch-list-rows">
              <div className="svx-branch-list-head">
                <span>Branch</span>
                <span>Location</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {sortedBranches.map((branch) => (
                <BranchRow
                  key={branch.id}
                  branch={branch}
                  onView={openView}
                  onEdit={openEdit}
                  canManage={canManage}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No branches found"
              text="The store should have at least one main branch. Refresh first, then check backend branch creation if this remains empty."
            />
          )}
        </div>
      </section>

      <BranchCreateDrawer
        open={showCreateDrawer}
        form={form}
        setForm={setForm}
        saving={saving}
        canCreate={canCreate}
        usage={usage}
        onClose={closeBranchDrawers}
        onSubmit={submit}
      />

      <BranchDetailsDrawer
        branch={viewingBranch}
        open={Boolean(viewingBranch)}
        onClose={closeBranchDrawers}
        onEdit={openEdit}
        onSetMain={handleSetMain}
        onArchive={handleArchive}
        onReactivate={handleReactivate}
        canManage={canManage}
        canReactivate={canReactivate}
        action={branchAction}
      />

      <BranchEditDrawer
        branch={editingBranch}
        open={Boolean(editingBranch)}
        form={editForm}
        setForm={setEditForm}
        saving={editSaving}
        onClose={closeBranchDrawers}
        onSubmit={submitEdit}
      />
    </div>
  );
}
