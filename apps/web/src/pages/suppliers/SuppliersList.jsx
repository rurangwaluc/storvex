// frontend-stores/src/pages/suppliers/SuppliersList.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  activateSupplier,
  deactivateSupplier,
  listSuppliers,
} from "../../services/suppliersApi";

const PAGE_SIZE = 12;

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

function dangerBtn() {
  return "inline-flex h-10 items-center justify-center rounded-2xl bg-[var(--color-danger)] px-4 text-sm font-black text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
}

function successBtn() {
  return "inline-flex h-10 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
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
        className,
      )}
    >
      {children}
    </span>
  );
}

function cleanString(value) {
  return String(value || "").trim();
}

function formatDate(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function prettyEnum(value) {
  const s = cleanString(value).replaceAll("_", " ").toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

function sourceTone(sourceType) {
  const key = cleanString(sourceType).toUpperCase();

  if (key === "BOUGHT") return "success";
  if (key === "CONSIGNMENT") return "warning";
  if (key === "TRADE_IN") return "info";
  if (key === "GIFT") return "primary";

  return "neutral";
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

function SummaryCard({ label, value, note, tone = "neutral" }) {
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

        <div className={cx("mt-2 truncate text-[1.45rem] font-black tracking-[-0.04em]", strongText())}>
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

function InfoStat({ label, value, sub }) {
  return (
    <div className={cx(softPanel(), "p-4")}>
      <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
        {label}
      </div>

      <div className={cx("mt-2 text-sm font-black leading-6", strongText())}>
        {value || "—"}
      </div>

      {sub ? (
        <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
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

function SuppliersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={cx(pageCard(), "p-5")}>
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-3 h-8 w-16" />
            <SkeletonBlock className="mt-3 h-4 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={cx(pageCard(), "p-5")}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex gap-2">
                  <SkeletonBlock className="h-7 w-28 rounded-full" />
                  <SkeletonBlock className="h-7 w-24 rounded-full" />
                </div>

                <SkeletonBlock className="mt-4 h-6 w-56" />
                <SkeletonBlock className="mt-2 h-4 w-72" />

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <SkeletonBlock className="h-20" />
                  <SkeletonBlock className="h-20" />
                  <SkeletonBlock className="h-20" />
                </div>
              </div>

              <SkeletonBlock className="h-12 w-36" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, text, onCreate }) {
  return (
    <div className={cx(pageCard(), "px-5 py-12 text-center")}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M6 7v12h12V7M9 11h6M9 15h4M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className={cx("mt-4 text-lg font-black tracking-tight", strongText())}>
        {title}
      </div>

      <p className={cx("mx-auto mt-3 max-w-md text-sm font-semibold leading-6", mutedText())}>
        {text}
      </p>

      {onCreate ? (
        <button type="button" onClick={onCreate} className={cx(primaryBtn(), "mt-5")}>
          Add supplier
        </button>
      ) : null}
    </div>
  );
}

function SupplierCard({ supplier, busyId, onOpen, onEdit, onActivate, onDeactivate }) {
  const active = supplier.isActive !== false;
  const busy = busyId === supplier.id;

  return (
    <article
      className={cx(
        pageCard(),
        "overflow-hidden p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] sm:p-5",
      )}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={active ? "success" : "warning"}>
              {active ? "Active supplier" : "Inactive supplier"}
            </Badge>

            <Badge tone={sourceTone(supplier.sourceType)}>
              {prettyEnum(supplier.sourceType)}
            </Badge>

            {supplier.verifiedAt ? <Badge tone="primary">Verified</Badge> : null}
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h3 className={cx("truncate text-lg font-black tracking-[-0.03em]", strongText())}>
                {supplier.name || "Unnamed supplier"}
              </h3>

              <div className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
                {supplier.companyName ? supplier.companyName : "Individual supplier"}
              </div>
            </div>

            <div className="shrink-0 lg:text-right">
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Added
              </div>
              <div className={cx("mt-1 text-sm font-black", strongText())}>
                {formatDate(supplier.createdAt)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfoStat
              label="Phone"
              value={supplier.phone || "—"}
              sub="Primary supplier contact"
            />

            <InfoStat
              label="Identity"
              value={supplier.idNumber || "—"}
              sub={supplier.idType ? prettyEnum(supplier.idType) : "No ID type"}
            />

            <InfoStat
              label="Company"
              value={supplier.companyName || "—"}
              sub="Business name if available"
            />
          </div>
        </div>

        <aside className={cx(softPanel(), "p-4")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={cx("text-sm font-black", strongText())}>Supplier actions</div>
              <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                Review, edit, or change supplier access state.
              </div>
            </div>

            <span
              className={cx(
                "mt-1 h-2.5 w-2.5 rounded-full",
                active ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <button type="button" onClick={() => onOpen(supplier.id)} className={primaryBtn()}>
              Open supplier
            </button>

            <button type="button" onClick={() => onEdit(supplier.id)} className={secondaryBtn()}>
              Edit details
            </button>

            {active ? (
              <AsyncButton
                type="button"
                loading={busy}
                onClick={() => onDeactivate(supplier.id)}
                className={dangerBtn()}
              >
                Deactivate
              </AsyncButton>
            ) : (
              <AsyncButton
                type="button"
                loading={busy}
                onClick={() => onActivate(supplier.id)}
                className={successBtn()}
              >
                Reactivate
              </AsyncButton>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}

export default function SuppliersList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState("");

  const [suppliers, setSuppliers] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [filters, setFilters] = useState({
    q: "",
    active: "true",
    sourceType: "ALL",
  });

  async function loadSuppliers({ initial = false } = {}) {
    try {
      if (initial) setLoading(true);
      else setRefreshing(true);

      const data = await listSuppliers({
        q: filters.q,
        active: filters.active,
      });

      const rows = Array.isArray(data?.suppliers)
        ? data.suppliers
        : Array.isArray(data)
          ? data
          : [];

      setSuppliers(rows);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load suppliers");
      setSuppliers([]);
    } finally {
      if (initial) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadSuppliers({ initial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function applyFilters() {
    setVisibleCount(PAGE_SIZE);
    loadSuppliers();
  }

  function clearFilters() {
    setFilters({
      q: "",
      active: "true",
      sourceType: "ALL",
    });

    setVisibleCount(PAGE_SIZE);

    setTimeout(() => {
      loadSuppliers();
    }, 0);
  }

  const filteredSuppliers = useMemo(() => {
    let rows = Array.isArray(suppliers) ? [...suppliers] : [];

    if (filters.sourceType !== "ALL") {
      rows = rows.filter(
        (supplier) => cleanString(supplier.sourceType).toUpperCase() === filters.sourceType,
      );
    }

    return rows;
  }, [suppliers, filters.sourceType]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters.sourceType, suppliers.length]);

  const visibleSuppliers = useMemo(
    () => filteredSuppliers.slice(0, visibleCount),
    [filteredSuppliers, visibleCount],
  );

  const hasMore = visibleSuppliers.length < filteredSuppliers.length;

  const summary = useMemo(() => {
    const rows = Array.isArray(suppliers) ? suppliers : [];

    return {
      total: rows.length,
      active: rows.filter((supplier) => supplier.isActive !== false).length,
      inactive: rows.filter((supplier) => supplier.isActive === false).length,
      verified: rows.filter((supplier) => Boolean(supplier.verifiedAt)).length,
      companies: rows.filter((supplier) => Boolean(cleanString(supplier.companyName))).length,
    };
  }, [suppliers]);

  async function runSupplierStatusAction(id, fn, successMessage) {
    if (!id) return;

    try {
      setBusyId(id);
      await fn(id);
      toast.success(successMessage);
      await loadSuppliers();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to update supplier");
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return <SuppliersSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <SectionHeading
                eyebrow="Suppliers"
                title="Supplier control"
                subtitle="Manage supplier identity, contact details, source type, supply history, and stock intake records from one operational screen."
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <AsyncButton
                type="button"
                loading={refreshing}
                onClick={() => loadSuppliers()}
                className={secondaryBtn()}
              >
                Refresh
              </AsyncButton>

              <Link to="/app/suppliers/new" className={primaryBtn()}>
                Add supplier
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Visible suppliers" value={summary.total} note="Loaded from current filters" />
          <SummaryCard label="Active" value={summary.active} note="Available for supply records" tone="success" />
          <SummaryCard
            label="Inactive"
            value={summary.inactive}
            note="Blocked from normal usage"
            tone={summary.inactive > 0 ? "warning" : "neutral"}
          />
          <SummaryCard label="Verified" value={summary.verified} note="Suppliers with verified date" tone="info" />
          <SummaryCard label="Companies" value={summary.companies} note="Business suppliers" tone="primary" />
        </div>
      </section>

      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-end">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <label className={cx("text-sm font-black", strongText())}>Search</label>
              <input
                className={cx(inputClass(), "mt-2")}
                placeholder="Search name, phone, ID number, or company..."
                value={filters.q}
                onChange={(event) => updateFilter("q", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyFilters();
                }}
              />
            </div>

            <div className="lg:col-span-3">
              <label className={cx("text-sm font-black", strongText())}>Status</label>
              <select
                className={cx(inputClass(), "mt-2")}
                value={filters.active}
                onChange={(event) => updateFilter("active", event.target.value)}
              >
                <option value="true">Active suppliers</option>
                <option value="false">Inactive suppliers</option>
              </select>
            </div>

            <div className="lg:col-span-4">
              <label className={cx("text-sm font-black", strongText())}>Source type</label>
              <select
                className={cx(inputClass(), "mt-2")}
                value={filters.sourceType}
                onChange={(event) => updateFilter("sourceType", event.target.value)}
              >
                <option value="ALL">All source types</option>
                <option value="BOUGHT">Bought</option>
                <option value="GIFT">Gift</option>
                <option value="TRADE_IN">Trade in</option>
                <option value="CONSIGNMENT">Consignment</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className={cx(softPanel(), "p-4")}>
            <div className={cx("text-sm font-black", strongText())}>Matching suppliers</div>

            <div className={cx("mt-2 text-2xl font-black tracking-tight", strongText())}>
              {filteredSuppliers.length}
            </div>

            <div className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
              Suppliers ready for review.
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <FilterChip active={filters.sourceType === "ALL"} onClick={() => updateFilter("sourceType", "ALL")}>
            All
          </FilterChip>

          <FilterChip active={filters.sourceType === "BOUGHT"} onClick={() => updateFilter("sourceType", "BOUGHT")}>
            Bought
          </FilterChip>

          <FilterChip active={filters.sourceType === "CONSIGNMENT"} onClick={() => updateFilter("sourceType", "CONSIGNMENT")}>
            Consignment
          </FilterChip>

          <FilterChip active={filters.sourceType === "TRADE_IN"} onClick={() => updateFilter("sourceType", "TRADE_IN")}>
            Trade in
          </FilterChip>

          <FilterChip active={filters.sourceType === "OTHER"} onClick={() => updateFilter("sourceType", "OTHER")}>
            Other
          </FilterChip>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <AsyncButton
            type="button"
            loading={refreshing}
            onClick={applyFilters}
            className={primaryBtn()}
          >
            Apply filters
          </AsyncButton>

          <button type="button" onClick={clearFilters} className={secondaryBtn()}>
            Clear filters
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {filteredSuppliers.length === 0 ? (
          <EmptyState
            title="No suppliers found"
            text="No supplier records match your current filters."
            onCreate={() => navigate("/app/suppliers/new")}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3">
              {visibleSuppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  busyId={busyId}
                  onOpen={(id) => navigate(`/app/suppliers/${id}`)}
                  onEdit={(id) => navigate(`/app/suppliers/${id}/edit`)}
                  onActivate={(id) =>
                    runSupplierStatusAction(id, activateSupplier, "Supplier reactivated")
                  }
                  onDeactivate={(id) =>
                    runSupplierStatusAction(id, deactivateSupplier, "Supplier deactivated")
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
                  Load {PAGE_SIZE} more
                </button>
              ) : (
                <div className={cx("text-sm font-semibold", mutedText())}>
                  All matching suppliers loaded
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}