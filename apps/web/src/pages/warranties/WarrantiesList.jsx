import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { listWarranties } from "../../services/warrantiesApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

const PAGE_SIZE = 10;

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function cleanString(value) {
  const text = String(value || "").trim();
  return text || "";
}

function formatMoney(value) {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `RWF ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(safeAmount)}`;
}

function formatNumber(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function safeDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDate(value) {
  const date = safeDate(value);
  if (!date) return "—";

  return date.toLocaleDateString("en-RW", {
    dateStyle: "medium",
  });
}

function daysUntil(value) {
  const date = safeDate(value);
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(0, 0, 0, 0);

  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

function activeStoreLocationFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "current store location";
}

function pageCard() {
  return "rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[24px] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)] disabled:cursor-not-allowed disabled:opacity-60";
}

function buttonBase() {
  return "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60";
}

function primaryBtn() {
  return cx(
    buttonBase(),
    "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
  );
}

function secondaryBtn() {
  return cx(
    buttonBase(),
    "bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
  );
}

function successBtn() {
  return cx(
    buttonBase(),
    "bg-emerald-600 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
  );
}

function warrantyReference(warranty) {
  return (
    cleanString(warranty?.warrantyNumber) ||
    cleanString(warranty?.number) ||
    cleanString(warranty?.reference) ||
    cleanString(warranty?.id).slice(-8).toUpperCase() ||
    "Warranty"
  );
}

function saleReference(warranty) {
  return (
    cleanString(warranty?.sale?.receiptNumber) ||
    cleanString(warranty?.sale?.invoiceNumber) ||
    cleanString(warranty?.receiptNumber) ||
    cleanString(warranty?.invoiceNumber) ||
    cleanString(warranty?.saleRef) ||
    "Sale"
  );
}

function customerName(warranty) {
  return (
    cleanString(warranty?.customer?.name) ||
    cleanString(warranty?.sale?.customer?.name) ||
    cleanString(warranty?.customerName) ||
    "Walk-in customer"
  );
}

function customerPhone(warranty) {
  return (
    cleanString(warranty?.customer?.phone) ||
    cleanString(warranty?.sale?.customer?.phone) ||
    cleanString(warranty?.customerPhone) ||
    "No phone saved"
  );
}

function storeLocationLabel(warranty) {
  const location = warranty?.branch || warranty?.sale?.branch || {};
  const code = cleanString(location?.code);
  const name = cleanString(location?.name);

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return activeStoreLocationFromStorage();
}

function createdByName(warranty) {
  return (
    cleanString(warranty?.createdBy?.name) ||
    cleanString(warranty?.createdByUser?.name) ||
    cleanString(warranty?.createdByName) ||
    "—"
  );
}

function warrantyUnits(warranty) {
  if (Array.isArray(warranty?.units)) return warranty.units;
  if (Array.isArray(warranty?.warrantyUnits)) return warranty.warrantyUnits;
  return [];
}

function saleTotal(warranty) {
  return Number(warranty?.sale?.total ?? warranty?.saleTotal ?? warranty?.total ?? 0);
}

function warrantyStatus(warranty) {
  const rawStatus = String(warranty?.status || "").toUpperCase();

  if (rawStatus === "CANCELLED" || rawStatus === "VOID") {
    return {
      label: "Cancelled",
      tone: "danger",
      note: "This warranty is no longer active.",
    };
  }

  const endDate = warranty?.endsAt || warranty?.endDate;
  const days = daysUntil(endDate);

  if (days === null) {
    return {
      label: "Active",
      tone: "success",
      note: "No end date shown.",
    };
  }

  if (days < 0) {
    return {
      label: "Expired",
      tone: "danger",
      note: `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago.`,
    };
  }

  if (days <= 14) {
    return {
      label: "Ending soon",
      tone: "warning",
      note: days === 0 ? "Ends today." : `Ends in ${days} day${days === 1 ? "" : "s"}.`,
    };
  }

  return {
    label: "Active",
    tone: "success",
    note: `Ends in ${days} days.`,
  };
}

function matchesWarrantyQuery(warranty, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const coveredProductsText = warrantyUnits(warranty)
    .map((unit) =>
      [
        unit?.unitLabel,
        unit?.serial,
        unit?.imei1,
        unit?.imei2,
        unit?.product?.name,
        unit?.productName,
      ]
        .filter(Boolean)
        .join(" ")
    )
    .join(" ");

  const haystack = [
    warrantyReference(warranty),
    saleReference(warranty),
    customerName(warranty),
    customerPhone(warranty),
    storeLocationLabel(warranty),
    createdByName(warranty),
    warranty?.policy,
    coveredProductsText,
  ]
    .map((item) => String(item || "").toLowerCase())
    .join(" ");

  return haystack.includes(q);
}

function StatusBadge({ tone = "neutral", children }) {
  const cls =
    tone === "danger"
      ? "bg-red-500/10 text-red-600"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-600"
        : tone === "success"
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em]",
        cls
      )}
    >
      {children}
    </span>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div className={cx("animate-pulse rounded-[22px] bg-[var(--color-surface-2)]", className)} />
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-5">
      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-4 h-10 w-72 max-w-full rounded-[18px]" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className={cx(pageCard(), "p-5")}>
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-28" />
            <SkeletonBlock className="mt-2 h-4 w-36" />
          </div>
        ))}
      </section>

      <section className={cx(pageCard(), "p-5")}>
        <SkeletonBlock className="h-12 w-full rounded-[18px]" />

        <div className="mt-5 grid gap-3">
          {[1, 2, 3, 4].map((item) => (
            <SkeletonBlock key={item} className="h-48 w-full rounded-[28px]" />
          ))}
        </div>
      </section>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const dot =
    tone === "danger"
      ? "bg-red-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "success"
          ? "bg-emerald-500"
          : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-5")}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[rgba(74,163,255,0.08)] blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <span className={cx("h-2.5 w-2.5 rounded-full", dot)} />
        </div>

        <p className="mt-3 truncate text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">
          {value}
        </p>

        {note ? (
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
            {note}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function InfoTile({ label, value, tone = "neutral" }) {
  const valueClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "success"
          ? "text-emerald-600"
          : "text-[var(--color-text)]";

  return (
    <div className={cx(softPanel(), "p-4 shadow-[var(--shadow-soft)]")}>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
        {label}
      </p>

      <p className={cx("mt-2 break-words text-sm font-black leading-6", valueClass)}>
        {value || "—"}
      </p>
    </div>
  );
}

function EmptyState({ title, text, action = null }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[30px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center">
      <h3 className="text-lg font-black text-[var(--color-text)]">{title}</h3>

      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function WarrantyCard({ warranty }) {
  const status = warrantyStatus(warranty);
  const units = warrantyUnits(warranty);
  const total = saleTotal(warranty);

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-4 sm:p-5")}>
      <div
        className={cx(
          "absolute left-0 top-0 h-full w-1.5",
          status.tone === "danger"
            ? "bg-red-500"
            : status.tone === "warning"
              ? "bg-amber-500"
              : "bg-emerald-500"
        )}
      />

      <div className="pl-3">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
                {warrantyReference(warranty)}
              </h3>

              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>

            <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">
              {customerName(warranty)} • {customerPhone(warranty)}
            </p>

            <p className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">
              Sale: {saleReference(warranty)}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
            <Link
              to={`/app/documents/warranties/${encodeURIComponent(warranty.id)}/preview`}
              className={secondaryBtn()}
            >
              Preview
            </Link>

            <Link
              to={`/app/documents/warranties/${encodeURIComponent(warranty.id)}/edit`}
              className={primaryBtn()}
            >
              Edit
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoTile label="Covered products" value={formatNumber(units.length)} tone="success" />
          <InfoTile label="Starts" value={formatDate(warranty?.startsAt)} />
          <InfoTile
            label="Ends"
            value={`${formatDate(warranty?.endsAt)} • ${status.note}`}
            tone={status.tone}
          />
          <InfoTile label="Sale value" value={total ? formatMoney(total) : "Not shown"} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <InfoTile label="Store location" value={storeLocationLabel(warranty)} />
          <InfoTile
            label="Created by"
            value={`${createdByName(warranty)} • ${formatDate(warranty?.createdAt)}`}
          />
        </div>

        {cleanString(warranty?.policy) ? (
          <div className="mt-3 rounded-[22px] bg-[var(--color-surface-2)] px-4 py-3">
            <p className="line-clamp-2 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              {warranty.policy}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function WarrantiesList() {
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [warranties, setWarranties] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeStoreLocation, setActiveStoreLocation] = useState(() =>
    activeStoreLocationFromStorage()
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function load({ silent = false } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await listWarranties();

      if (!mountedRef.current) return;

      const rows = Array.isArray(data?.warranties)
        ? data.warranties
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];

      setWarranties(rows);
      setVisibleCount(PAGE_SIZE);
      setActiveStoreLocation(activeStoreLocationFromStorage());
    } catch (error) {
      if (!mountedRef.current) return;

      console.error(error);

      if (!handleSubscriptionBlockedError(error, { toastId: "warranties-list-blocked" })) {
        toast.error(error?.message || "Failed to load warranties");
      }

      setWarranties([]);
      setVisibleCount(PAGE_SIZE);
    } finally {
      if (!mountedRef.current) return;

      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();

    function onStoreLocationChanged() {
      setActiveStoreLocation(activeStoreLocationFromStorage());
      void load({ silent: true });
    }

    window.addEventListener("storvex:branch-changed", onStoreLocationChanged);
    window.addEventListener("storvex:workspace-refreshed", onStoreLocationChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onStoreLocationChanged);
      window.removeEventListener("storvex:workspace-refreshed", onStoreLocationChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return warranties.filter((warranty) => {
      const status = warrantyStatus(warranty);

      if (
        statusFilter !== "ALL" &&
        status.label.toUpperCase().replace(/\s+/g, "_") !== statusFilter
      ) {
        return false;
      }

      return matchesWarrantyQuery(warranty, q);
    });
  }, [warranties, q, statusFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, statusFilter]);

  const visibleRows = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const summary = useMemo(() => {
    const active = warranties.filter((item) => warrantyStatus(item).label === "Active").length;
    const endingSoon = warranties.filter(
      (item) => warrantyStatus(item).label === "Ending soon"
    ).length;
    const expired = warranties.filter((item) => warrantyStatus(item).label === "Expired").length;
    const coveredUnits = warranties.reduce((sum, item) => sum + warrantyUnits(item).length, 0);

    return {
      total: warranties.length,
      active,
      endingSoon,
      expired,
      coveredUnits,
    };
  }, [warranties]);

  function loadMore() {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <div className="space-y-5">
      <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Warranty
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
              Warranties
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Track product support records for{" "}
              <span className="font-black text-[var(--color-text)]">{activeStoreLocation}</span>.
              The first 10 warranties are shown first. Search, filter, or load more to find the
              rest.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <Link to="/app/documents" className={secondaryBtn()}>
              Documents
            </Link>

            <AsyncButton loading={refreshing} onClick={() => load({ silent: true })} className={secondaryBtn()}>
              Refresh
            </AsyncButton>

            <Link to="/app/documents/warranties/new" className={successBtn()}>
              <PlusIcon />
              New warranty
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Warranties" value={formatNumber(summary.total)} note="Loaded here" />

        <SummaryCard
          label="Active"
          value={formatNumber(summary.active)}
          note="Still covered"
          tone="success"
        />

        <SummaryCard
          label="Ending soon"
          value={formatNumber(summary.endingSoon)}
          note="Needs attention"
          tone={summary.endingSoon > 0 ? "warning" : "neutral"}
        />

        <SummaryCard
          label="Covered products"
          value={formatNumber(summary.coveredUnits)}
          note={`${formatNumber(summary.expired)} expired warranty${summary.expired === 1 ? "" : "ies"}`}
          tone={summary.expired > 0 ? "warning" : "success"}
        />
      </section>

      <section className={cx(pageCard(), "p-4 sm:p-5")}>
        <div className="grid gap-3 xl:grid-cols-[1fr_190px]">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              <SearchIcon />
            </span>

            <input
              className={cx(inputClass(), "pl-11")}
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search by customer, phone, warranty, receipt, product, serial, IMEI, or store location..."
            />
          </div>

          <select
            className={inputClass()}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All warranties</option>
            <option value="ACTIVE">Active</option>
            <option value="ENDING_SOON">Ending soon</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="mt-5">
          {visibleRows.length === 0 ? (
            <EmptyState
              title="No warranties found"
              text="Try changing the search or filter. New warranties will appear here after they are created from real sales."
              action={
                <Link to="/app/documents/warranties/new" className={primaryBtn()}>
                  <ShieldIcon />
                  Create warranty
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid gap-3">
                {visibleRows.map((warranty) => (
                  <WarrantyCard key={warranty.id} warranty={warranty} />
                ))}
              </div>

              <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-[26px] bg-[var(--color-surface-2)] px-4 py-4 sm:flex-row">
                <p className="text-center text-sm font-bold text-[var(--color-text-muted)] sm:text-left">
                  Showing {formatNumber(visibleRows.length)} of {formatNumber(filtered.length)} warranty
                  {filtered.length === 1 ? "" : "ies"}.
                </p>

                {hasMore ? (
                  <button
                    type="button"
                    onClick={loadMore}
                    className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 sm:w-auto"
                  >
                    Load 10 more
                  </button>
                ) : (
                  <span className="rounded-full bg-[var(--color-card)] px-3 py-2 text-xs font-black text-[var(--color-text-muted)] shadow-[var(--shadow-soft)]">
                    End of list
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}