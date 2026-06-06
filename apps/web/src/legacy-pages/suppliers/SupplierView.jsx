import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  activateSupplier,
  deactivateSupplier,
  getSupplierById,
  listSupplierSupplies,
} from "../../services/suppliersApi";

const PAGE_SIZE = 8;

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
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-danger)] px-5 text-sm font-black text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
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

function formatMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "RWF 0";
  return `RWF ${Math.round(n).toLocaleString("en-US")}`;
}

function prettyEnum(value) {
  const text = cleanString(value).replaceAll("_", " ").toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

function supplierTypeLabel(value) {
  const key = cleanString(value).toUpperCase();

  if (key === "BOUGHT") return "Bought stock";
  if (key === "GIFT") return "Gifted stock";
  if (key === "TRADE_IN") return "Trade-in";
  if (key === "CONSIGNMENT") return "Consignment";
  if (key === "OTHER") return "Other source";

  return prettyEnum(value);
}

function idTypeLabel(value) {
  const key = cleanString(value).toUpperCase();

  if (key === "NATIONAL_ID") return "National ID";
  if (key === "PASSPORT") return "Passport";

  return prettyEnum(value);
}

function branchDisplayName(branch) {
  if (!branch) return "Workspace-wide";
  const name = cleanString(branch.name) || "Branch";
  const code = cleanString(branch.code);

  return code ? `${code} • ${name}` : name;
}

function getSupplyItems(supply) {
  if (Array.isArray(supply?.items)) return supply.items;
  if (Array.isArray(supply?.SupplierSupplyItem)) return supply.SupplierSupplyItem;
  return [];
}

function computeSupplyTotals(supply) {
  const items = getSupplyItems(supply);

  const totalCost = Number.isFinite(Number(supply?.totalCost))
    ? Number(supply.totalCost)
    : items.reduce(
        (sum, item) => sum + Number(item.buyPrice || 0) * Number(item.quantity || 0),
        0
      );

  const totalSell = Number.isFinite(Number(supply?.totalSell))
    ? Number(supply.totalSell)
    : items.reduce(
        (sum, item) => sum + Number(item.sellPrice || 0) * Number(item.quantity || 0),
        0
      );

  return {
    totalCost,
    totalSell,
    itemsCount: Number.isFinite(Number(supply?.itemsCount))
      ? Number(supply.itemsCount)
      : items.length,
    totalQuantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
  };
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

        <div
          className={cx(
            "mt-2 break-words text-[1.35rem] font-black tracking-[-0.04em]",
            strongText()
          )}
        >
          {value || "—"}
        </div>

        {note ? (
          <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</div>
        ) : null}
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

        {tone !== "neutral" ? <Badge tone={tone}>{tone === "success" ? "OK" : "Note"}</Badge> : null}
      </div>

      {note ? (
        <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</div>
      ) : null}
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div className={cx("animate-pulse rounded-[20px] bg-[var(--color-surface-2)]", className)} />
  );
}

function SuppliesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={cx(pageCard(), "p-5")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="mt-3 h-7 w-56" />
              <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
                <SkeletonBlock className="h-20" />
              </div>
            </div>

            <SkeletonBlock className="h-28 w-full lg:w-64" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <section className={cx(pageCard(), "px-5 py-12 text-center")}>
      <div className={cx("text-lg font-black tracking-[-0.03em]", strongText())}>{title}</div>
      <p className={cx("mx-auto mt-2 max-w-md text-sm font-semibold leading-6", mutedText())}>
        {text}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

function SupplyCard({ supply }) {
  const totals = computeSupplyTotals(supply);
  const items = getSupplyItems(supply).slice(0, 3);
  const extraItems = Math.max(0, getSupplyItems(supply).length - items.length);

  return (
    <article className={cx(pageCard(), "overflow-hidden p-5")}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{supplierTypeLabel(supply?.sourceType)}</Badge>
            <Badge tone={supply?.branch ? "success" : "neutral"}>
              {branchDisplayName(supply?.branch)}
            </Badge>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h3 className={cx("text-lg font-black tracking-[-0.03em]", strongText())}>
                Supply recorded on {formatDate(supply?.createdAt)}
              </h3>

              <p className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
                {totals.itemsCount} item{totals.itemsCount === 1 ? "" : "s"} recorded
                {totals.totalQuantity ? ` • ${totals.totalQuantity} unit${totals.totalQuantity === 1 ? "" : "s"}` : ""}
              </p>
            </div>

            {supply?.documentRef ? (
              <Badge tone="info" className="shrink-0">
                Ref: {supply.documentRef}
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfoBlock label="Total cost" value={formatMoney(totals.totalCost)} />
            <InfoBlock label="Expected sales value" value={formatMoney(totals.totalSell)} />
            <InfoBlock label="Branch" value={branchDisplayName(supply?.branch)} />
          </div>

          {items.length ? (
            <div className="mt-4 space-y-2">
              {items.map((item) => (
                <div
                  key={item.id || `${item.productName}-${item.serial}`}
                  className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className={cx("break-words text-sm font-black", strongText())}>
                        {item.productName || "Unnamed product"}
                      </div>

                      <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                        {item.serial ? `Serial: ${item.serial}` : "No serial recorded"}
                      </div>
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      <div className={cx("text-xs font-black", strongText())}>
                        Qty {Number(item.quantity || 0)}
                      </div>
                      <div className={cx("mt-1 text-xs font-semibold", mutedText())}>
                        Buy {formatMoney(item.buyPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {extraItems > 0 ? <Badge tone="neutral">+{extraItems} more item{extraItems === 1 ? "" : "s"}</Badge> : null}
            </div>
          ) : null}

          {supply?.notes ? (
            <div className="mt-4 rounded-[20px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Notes
              </div>
              <div className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
                {supply.notes}
              </div>
            </div>
          ) : null}
        </div>

        <aside className={cx(softPanel(), "h-fit p-4")}>
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
            Supply summary
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <InfoBlock label="Recorded" value={formatDate(supply?.createdAt)} />
            <InfoBlock label="Items" value={String(totals.itemsCount)} />
            <InfoBlock label="Units" value={String(totals.totalQuantity || 0)} />
          </div>
        </aside>
      </div>
    </article>
  );
}

function SupplierStatusActions({ supplier, busy, onActivate, onDeactivate }) {
  if (!supplier) return null;

  if (supplier.isActive === false) {
    return (
      <AsyncButton type="button" loading={busy} onClick={onActivate} className={primaryBtn()}>
        Reactivate supplier
      </AsyncButton>
    );
  }

  return (
    <AsyncButton type="button" loading={busy} onClick={onDeactivate} className={dangerBtn()}>
      Deactivate supplier
    </AsyncButton>
  );
}

export default function SupplierView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState(null);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suppliesLoading, setSuppliesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  async function loadSupplier({ silent = false } = {}) {
    if (!id) return;

    try {
      if (!silent) setLoading(true);

      const data = await getSupplierById(id);
      setSupplier(data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load supplier");
      setSupplier(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadSupplies({ silent = false } = {}) {
    if (!id) return;

    try {
      if (!silent) setSuppliesLoading(true);

      const data = await listSupplierSupplies(id);
      const rows = Array.isArray(data?.supplies) ? data.supplies : Array.isArray(data) ? data : [];
      setSupplies(rows);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load supplier supplies");
      setSupplies([]);
    } finally {
      if (!silent) setSuppliesLoading(false);
    }
  }

  async function refreshAll() {
    try {
      setRefreshing(true);
      await Promise.all([loadSupplier({ silent: true }), loadSupplies({ silent: true })]);
      toast.success("Supplier refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleActivate() {
    if (!supplier?.id) return;

    try {
      setStatusBusy(true);
      await activateSupplier(supplier.id);
      toast.success("Supplier reactivated");
      await loadSupplier({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to reactivate supplier");
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleDeactivate() {
    if (!supplier?.id) return;

    const ok = window.confirm(
      "Deactivate this supplier? Existing supply history will stay preserved."
    );

    if (!ok) return;

    try {
      setStatusBusy(true);
      await deactivateSupplier(supplier.id);
      toast.success("Supplier deactivated");
      await loadSupplier({ silent: true });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to deactivate supplier");
    } finally {
      setStatusBusy(false);
    }
  }

  useEffect(() => {
    let alive = true;

    async function boot() {
      if (!id) return;

      setLoading(true);
      setSuppliesLoading(true);

      try {
        const [supplierData, suppliesData] = await Promise.all([
          getSupplierById(id),
          listSupplierSupplies(id),
        ]);

        if (!alive) return;

        setSupplier(supplierData || null);
        setSupplies(
          Array.isArray(suppliesData?.supplies)
            ? suppliesData.supplies
            : Array.isArray(suppliesData)
              ? suppliesData
              : []
        );
      } catch (err) {
        if (!alive) return;

        console.error(err);
        toast.error(err?.message || "Failed to load supplier");
        setSupplier(null);
        setSupplies([]);
      } finally {
        if (alive) {
          setLoading(false);
          setSuppliesLoading(false);
        }
      }
    }

    boot();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [supplies.length]);

  const visibleSupplies = useMemo(
    () => supplies.slice(0, visibleCount),
    [supplies, visibleCount]
  );

  const hasMore = visibleSupplies.length < supplies.length;

  const supplySummary = useMemo(() => {
    return supplies.reduce(
      (acc, supply) => {
        const totals = computeSupplyTotals(supply);

        acc.totalCost += totals.totalCost;
        acc.totalSell += totals.totalSell;
        acc.items += totals.itemsCount;
        acc.units += totals.totalQuantity;

        if (supply?.branch?.id && !acc.branches.has(supply.branch.id)) {
          acc.branches.set(supply.branch.id, supply.branch);
        }

        return acc;
      },
      {
        totalCost: 0,
        totalSell: 0,
        items: 0,
        units: 0,
        branches: new Map(),
      }
    );
  }, [supplies]);

  if (loading) {
    return <PageSkeleton titleWidth="w-56" lines={4} variant="default" />;
  }

  if (!supplier) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Supplier not found"
          text="This supplier could not be found, or you no longer have access to it."
          action={
            <button type="button" onClick={() => navigate("/app/suppliers")} className={secondaryBtn()}>
              Back to suppliers
            </button>
          }
        />
      </div>
    );
  }

  const statusTone = supplier.isActive === false ? "warning" : "success";
  const statusLabel = supplier.isActive === false ? "Inactive" : "Active";
  const verified = Boolean(supplier.verifiedAt);

  return (
    <div className="space-y-6 overflow-x-hidden">
      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone}>{statusLabel}</Badge>
                <Badge tone={verified ? "success" : "neutral"}>
                  {verified ? "Verified" : "Not verified"}
                </Badge>
                <Badge tone="primary">{supplierTypeLabel(supplier.sourceType)}</Badge>
              </div>

              <SectionHeading
                eyebrow="Supplier profile"
                title={supplier.name || "Supplier"}
                subtitle="Review supplier identity, contact details, and supply history without exposing technical system fields to store users."
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
              <button type="button" onClick={refreshAll} disabled={refreshing} className={secondaryBtn()}>
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <Link to={`/app/suppliers/${supplier.id}/edit`} className={secondaryBtn()}>
                Edit supplier
              </Link>

              <Link to={`/app/suppliers/${supplier.id}/supplies/new`} className={primaryBtn()}>
                Record supply
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Contact"
            value={supplier.phone || "No phone"}
            note={supplier.email || "No email recorded"}
            tone="info"
          />

          <SummaryCard
            label="Identity"
            value={idTypeLabel(supplier.idType)}
            note={supplier.idNumber || "No identity number recorded"}
          />

          <SummaryCard
            label="Total supplies"
            value={String(supplies.length)}
            note={`${supplySummary.items} item${supplySummary.items === 1 ? "" : "s"} recorded`}
            tone="success"
          />

          <SummaryCard
            label="Total cost"
            value={formatMoney(supplySummary.totalCost)}
            note={`${supplySummary.units} unit${supplySummary.units === 1 ? "" : "s"} received`}
            tone="warning"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <div className={cx(pageCard(), "p-5 sm:p-6")}>
          <SectionHeading
            eyebrow="Profile"
            title="Supplier details"
            subtitle="Clean business-readable information for staff and owner review."
          />

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <InfoBlock label="Supplier name" value={supplier.name} />
            <InfoBlock label="Company" value={supplier.companyName || "Not provided"} />
            <InfoBlock label="Phone" value={supplier.phone || "Not provided"} />
            <InfoBlock label="Email" value={supplier.email || "Not provided"} />
            <InfoBlock label="Address" value={supplier.address || "Not provided"} />
            <InfoBlock label="Tax number" value={supplier.taxId || "Not provided"} />
            <InfoBlock label="Source type" value={supplierTypeLabel(supplier.sourceType)} />
            <InfoBlock label="Created" value={formatDate(supplier.createdAt)} />
          </div>

          {supplier.sourceDetails || supplier.notes ? (
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {supplier.sourceDetails ? (
                <InfoBlock label="Source details" value={supplier.sourceDetails} />
              ) : null}

              {supplier.notes ? <InfoBlock label="Notes" value={supplier.notes} /> : null}
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Supplier control"
              title="Status & actions"
              subtitle="Control whether this supplier can continue being used for new supply records."
            />

            <div className="mt-5 space-y-3">
              <InfoBlock
                label="Current status"
                value={statusLabel}
                note={
                  supplier.isActive === false
                    ? "This supplier is blocked from normal new activity."
                    : "This supplier can be used for new supply records."
                }
                tone={statusTone}
              />

              <SupplierStatusActions
                supplier={supplier}
                busy={statusBusy}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
              />
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Branch coverage"
              title="Supply branches"
              subtitle="Branches where this supplier has supplied stock."
            />

            <div className="mt-5 space-y-2">
              {supplySummary.branches.size ? (
                Array.from(supplySummary.branches.values()).map((branch) => (
                  <div key={branch.id} className={cx(softPanel(), "p-4")}>
                    <div className={cx("text-sm font-black", strongText())}>
                      {branchDisplayName(branch)}
                    </div>
                    <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                      {branch.isMain ? "Main branch" : "Branch supply history"}
                    </div>
                  </div>
                ))
              ) : (
                <div className={cx(softPanel(), "p-4")}>
                  <div className={cx("text-sm font-black", strongText())}>No branch history yet</div>
                  <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                    Branches will appear after supplies are recorded.
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>
      </section>

      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="Supply history"
              title="Recorded supplies"
              subtitle="Each record shows what was received, the receiving branch, and the financial value."
            />

            <Link to={`/app/suppliers/${supplier.id}/supplies/new`} className={primaryBtn()}>
              Record new supply
            </Link>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {suppliesLoading ? (
            <SuppliesSkeleton />
          ) : supplies.length === 0 ? (
            <EmptyState
              title="No supplies recorded yet"
              text="Once stock is recorded from this supplier, the supply history will appear here."
              action={
                <Link to={`/app/suppliers/${supplier.id}/supplies/new`} className={primaryBtn()}>
                  Record first supply
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {visibleSupplies.map((supply) => (
                  <SupplyCard key={supply.id} supply={supply} />
                ))}
              </div>

              <div className="mt-5 flex flex-col items-center gap-2">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className={secondaryBtn()}
                  >
                    Load more supplies
                  </button>
                ) : (
                  <div className={cx("text-sm font-semibold", mutedText())}>
                    All supply records loaded
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button type="button" onClick={() => navigate("/app/suppliers")} className={secondaryBtn()}>
          Back to suppliers
        </button>

        <Link to={`/app/suppliers/${supplier.id}/edit`} className={secondaryBtn()}>
          Edit supplier profile
        </Link>
      </div>
    </div>
  );
}