import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { createBranch, listBranches } from "../../services/branchApi";

const EMPTY_FORM = {
  name: "",
  code: "",
  phone: "",
  email: "",
  countryCode: "RW",
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
    return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
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
          ? "bg-[var(--color-primary)]"
          : "bg-[var(--color-text-muted)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-5")}>
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
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm font-semibold text-[var(--color-text-muted)]">{label}</span>
      <span className="max-w-[58%] truncate text-right text-sm font-black text-[var(--color-text)]">
        {value || "—"}
      </span>
    </div>
  );
}

function BranchCard({ branch }) {
  const location = [branch?.district, branch?.sector, branch?.address]
    .filter(Boolean)
    .join(" • ");

  return (
    <article className={cx(pageCard(), "overflow-hidden p-5")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill className={statusTone(branch?.status)}>{branch?.status || "UNKNOWN"}</Pill>

            {branch?.isMain ? (
              <Pill className="bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                Main branch
              </Pill>
            ) : (
              <Pill className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                Standard branch
              </Pill>
            )}
          </div>

          <h3 className="mt-4 truncate text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
            {branch?.name || "Branch"}
          </h3>

          <p className="mt-1 text-sm font-bold text-[var(--color-text-muted)]">
            {branch?.code || "NO_CODE"}
          </p>
        </div>

        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-lg font-black text-[var(--color-text)] shadow-[var(--shadow-soft)]">
          {String(branch?.code || "BR").slice(0, 2)}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <DetailLine label="Phone" value={branch?.phone} />
        <DetailLine label="Email" value={branch?.email} />
        <DetailLine label="Location" value={location || "Not set"} />
        <DetailLine label="Created" value={formatDate(branch?.createdAt)} />
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

function BranchForm({ form, setForm, saving, canCreate, usage, onSubmit }) {
  const atLimit = usage?.atLimit || usage?.canAddBranch === false;

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form onSubmit={onSubmit} className={cx(pageCard(), "p-5 sm:p-6")}>
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={fieldLabel()}>Branch name</label>
          <input
            className={inputClass()}
            value={form.name}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("name", event.target.value)}
            placeholder="Example: Kigali Downtown Branch"
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
          <p className={fieldHelp()}>Use a short owner-friendly code. Example: MAIN, KACYIRU, CBD.</p>
        </div>

        <div>
          <label className={fieldLabel()}>Phone</label>
          <input
            className={inputClass()}
            value={form.phone}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("phone", event.target.value)}
            placeholder="2507XXXXXXXX"
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
          <label className={fieldLabel()}>Country code</label>
          <input
            className={inputClass()}
            value={form.countryCode}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("countryCode", event.target.value.toUpperCase())}
            placeholder="RW"
          />
        </div>

        <div>
          <label className={fieldLabel()}>District</label>
          <input
            className={inputClass()}
            value={form.district}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("district", event.target.value)}
            placeholder="Example: Nyarugenge"
          />
        </div>

        <div>
          <label className={fieldLabel()}>Sector</label>
          <input
            className={inputClass()}
            value={form.sector}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("sector", event.target.value)}
            placeholder="Example: Nyarugenge"
          />
        </div>

        <div>
          <label className={fieldLabel()}>Address</label>
          <input
            className={inputClass()}
            value={form.address}
            disabled={!canCreate || saving || atLimit}
            onChange={(event) => setField("address", event.target.value)}
            placeholder="Example: Kigali, TCB"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
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
  const [branches, setBranches] = useState([]);
  const [usage, setUsage] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [subscription, setSubscription] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const canCreate = usage?.canAddBranch !== false;

  async function submit(event) {
    event.preventDefault();

    const payload = {
      name: cleanString(form.name),
      code: normalizeBranchCode(form.code),
      phone: cleanString(form.phone) || undefined,
      email: cleanString(form.email) || undefined,
      countryCode: cleanString(form.countryCode) || "RW",
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

  if (loading) {
    return <PageSkeleton titleWidth="w-52" lines={3} showTable={false} />;
  }

  return (
    <div className="space-y-6">
      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <SectionHeader
          eyebrow="Branches"
          title="Branch control"
          text="Manage the physical locations that belong to this store. Every branch must stay clear because sales, inventory, documents, reports, and staff work depend on branch truth."
          action={
            <AsyncButton
              type="button"
              variant="secondary"
              loading={refreshing}
              loadingText="Refreshing..."
              onClick={() => load({ quiet: true })}
            >
              Refresh
            </AsyncButton>
          }
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                ? `${subscription.planKey} plan capacity.`
                : "Current subscription capacity."
            }
            tone={usage?.atLimit ? "warning" : "neutral"}
          />

          <SummaryCard
            label="Main branch"
            value={mainBranch?.code || "—"}
            note={mainBranch?.name || tenant?.name || "Main branch not found."}
            tone={mainBranch ? "success" : "warning"}
          />

          <SummaryCard
            label="Can add branch"
            value={canCreate ? "Yes" : "No"}
            note={canCreate ? "Plan still has branch capacity." : "Plan branch limit is reached."}
            tone={canCreate ? "success" : "warning"}
          />
        </div>
      </section>

      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <SectionHeader
          eyebrow="Current branches"
          title="Store branch list"
          text="This is the branch structure currently attached to the store."
        />

        <div className="mt-6">
          {sortedBranches.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {sortedBranches.map((branch) => (
                <BranchCard key={branch.id} branch={branch} />
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

      <BranchForm
        form={form}
        setForm={setForm}
        saving={saving}
        canCreate={canCreate}
        usage={usage}
        onSubmit={submit}
      />
    </div>
  );
}