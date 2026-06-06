import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { getWarranty } from "../../services/warrantiesApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

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

function formatDateTime(value) {
  const date = safeDate(value);
  if (!date) return "—";

  return date.toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
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

function initialsFromName(value) {
  const words = cleanString(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) return "ST";

  return words
    .map((word) => word[0])
    .join("")
    .toUpperCase();
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

function customerEmail(warranty) {
  return (
    cleanString(warranty?.customer?.email) ||
    cleanString(warranty?.sale?.customer?.email) ||
    cleanString(warranty?.customerEmail) ||
    ""
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

function storeLocationName(warranty) {
  const location = warranty?.branch || warranty?.sale?.branch || {};
  return cleanString(location?.name) || activeStoreLocationFromStorage();
}

function storeName(warranty) {
  return (
    cleanString(warranty?.store?.name) ||
    cleanString(warranty?.business?.name) ||
    cleanString(warranty?.tenant?.name) ||
    cleanString(warranty?.sale?.store?.name) ||
    storeLocationName(warranty) ||
    "Store"
  );
}

function storeLogoUrl(warranty) {
  return (
    cleanString(warranty?.store?.logoUrl) ||
    cleanString(warranty?.business?.logoUrl) ||
    cleanString(warranty?.tenant?.logoUrl) ||
    cleanString(warranty?.sale?.store?.logoUrl) ||
    cleanString(warranty?.logoUrl) ||
    ""
  );
}

function storePhone(warranty) {
  return (
    cleanString(warranty?.store?.phone) ||
    cleanString(warranty?.business?.phone) ||
    cleanString(warranty?.tenant?.phone) ||
    cleanString(warranty?.sale?.store?.phone) ||
    ""
  );
}

function storeEmail(warranty) {
  return (
    cleanString(warranty?.store?.email) ||
    cleanString(warranty?.business?.email) ||
    cleanString(warranty?.tenant?.email) ||
    cleanString(warranty?.sale?.store?.email) ||
    ""
  );
}

function storeAddress(warranty) {
  return (
    cleanString(warranty?.store?.address) ||
    cleanString(warranty?.business?.address) ||
    cleanString(warranty?.tenant?.address) ||
    cleanString(warranty?.sale?.store?.address) ||
    cleanString(warranty?.branch?.address) ||
    cleanString(warranty?.sale?.branch?.address) ||
    ""
  );
}

function createdByName(warranty) {
  return (
    cleanString(warranty?.createdBy?.name) ||
    cleanString(warranty?.createdByUser?.name) ||
    cleanString(warranty?.createdByName) ||
    cleanString(warranty?.cashierName) ||
    cleanString(warranty?.sale?.cashier?.name) ||
    "—"
  );
}

function warrantyUnits(warranty) {
  if (Array.isArray(warranty?.units)) return warranty.units;
  if (Array.isArray(warranty?.warrantyUnits)) return warranty.warrantyUnits;
  return [];
}

function unitName(unit) {
  return (
    cleanString(unit?.unitLabel) ||
    cleanString(unit?.product?.name) ||
    cleanString(unit?.productName) ||
    "Covered product"
  );
}

function unitSerial(unit) {
  return cleanString(unit?.serial) || "—";
}

function unitImei1(unit) {
  return cleanString(unit?.imei1) || "";
}

function unitImei2(unit) {
  return cleanString(unit?.imei2) || "";
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

function normalizeWarranty(raw) {
  const warranty = raw?.warranty || raw || {};

  return {
    ...warranty,
    id: warranty?.id || null,
    warrantyNumber: warranty?.warrantyNumber || warranty?.number || null,
    number: warranty?.number || warranty?.warrantyNumber || null,
    saleId: warranty?.saleId || warranty?.sale?.id || null,
    policy: warranty?.policy || "",
    startsAt: warranty?.startsAt || warranty?.startDate || null,
    endsAt: warranty?.endsAt || warranty?.endDate || null,
    durationMonths: warranty?.durationMonths ?? "",
    durationDays: warranty?.durationDays ?? "",
    createdAt: warranty?.createdAt || null,
    units: Array.isArray(warranty?.units)
      ? warranty.units
      : Array.isArray(warranty?.warrantyUnits)
        ? warranty.warrantyUnits
        : [],
  };
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
    <div
      className={cx(
        "animate-pulse rounded-[22px] bg-[var(--color-surface-2)]",
        className
      )}
    />
  );
}

function PreviewSkeleton() {
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

      <section className={cx(pageCard(), "p-5 sm:p-8")}>
        <SkeletonBlock className="h-16 w-16" />
        <SkeletonBlock className="mt-6 h-10 w-80 max-w-full" />
        <SkeletonBlock className="mt-4 h-4 w-full max-w-xl" />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <SkeletonBlock key={item} className="h-24 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}

function PrintIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M7 8V3h10v5" />
      <path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v7H7z" />
    </svg>
  );
}

function StoreMark({ warranty }) {
  const name = storeName(warranty);
  const logo = storeLogoUrl(warranty);

  if (logo) {
    return (
      <img
        src={logo}
        alt={`${name} logo`}
        className="h-16 w-16 shrink-0 rounded-[22px] border border-[var(--color-border)] bg-white object-contain p-2 shadow-[var(--shadow-soft)] print:h-14 print:w-14"
      />
    );
  }

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-[rgba(74,163,255,0.28)] bg-[linear-gradient(135deg,rgba(74,163,255,0.24),rgba(16,185,129,0.12))] shadow-[var(--shadow-soft)] print:h-14 print:w-14">
      <span className="relative text-base font-black tracking-[-0.02em] text-[var(--color-text)]">
        {initialsFromName(name)}
      </span>
    </div>
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
    <article className={cx(pageCard(), "relative overflow-hidden p-5 print:shadow-none")}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[rgba(74,163,255,0.08)] blur-2xl print:hidden" />

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
    <div className={cx(softPanel(), "p-4 shadow-[var(--shadow-soft)] print:shadow-none")}>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
        {label}
      </p>

      <p className={cx("mt-2 break-words text-sm font-black leading-6", valueClass)}>
        {value || "—"}
      </p>
    </div>
  );
}

function CoveredUnitCard({ unit, index }) {
  return (
    <article className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)] print:shadow-none">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-[var(--color-text)]">
              {unitName(unit)}
            </h3>

            <StatusBadge tone="success">Covered</StatusBadge>
          </div>

          <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
            Item {index + 1}
          </p>
        </div>

        <div className="text-left lg:text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
            Serial
          </p>

          <p className="mt-1 text-sm font-black text-[var(--color-text)]">
            {unitSerial(unit)}
          </p>
        </div>
      </div>

      {unitImei1(unit) || unitImei2(unit) ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {unitImei1(unit) ? <InfoTile label="IMEI 1" value={unitImei1(unit)} /> : null}
          {unitImei2(unit) ? <InfoTile label="IMEI 2" value={unitImei2(unit)} /> : null}
        </div>
      ) : null}
    </article>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center">
      <h3 className="text-base font-black text-[var(--color-text)]">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>
    </div>
  );
}

export default function WarrantyPreview() {
  const { id } = useParams();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warranty, setWarranty] = useState(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function load({ silent = false } = {}) {
    if (!id) return;

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await getWarranty(id);

      if (!mountedRef.current) return;

      setWarranty(normalizeWarranty(data));
    } catch (error) {
      if (!mountedRef.current) return;

      console.error(error);

      if (!handleSubscriptionBlockedError(error, { toastId: "warranty-preview-load-blocked" })) {
        toast.error(error?.message || "Failed to load warranty");
      }

      setWarranty(null);
    } finally {
      if (!mountedRef.current) return;

      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function printPage() {
    window.print();
  }

  const status = useMemo(() => warrantyStatus(warranty), [warranty]);
  const units = useMemo(() => warrantyUnits(warranty), [warranty]);
  const total = saleTotal(warranty);

  if (loading) {
    return <PreviewSkeleton />;
  }

  if (!warranty) {
    return (
      <div className="space-y-5">
        <section className={cx(pageCard(), "p-6 text-center")}>
          <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--color-text)]">
            Warranty could not be loaded
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
            This warranty was not found or cannot be opened from the current store location.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/app/documents/warranties" className={secondaryBtn()}>
              Warranties
            </Link>

            <button type="button" onClick={() => load({ silent: true })} className={primaryBtn()}>
              Try again
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 print:bg-white print:text-slate-950">
      <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6 print:hidden")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Warranty
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
                Warranty certificate
              </h1>

              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              {warrantyReference(warranty)} • {storeLocationLabel(warranty)} • {status.note}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <Link to="/app/documents/warranties" className={secondaryBtn()}>
              Warranties
            </Link>

            <Link
              to={`/app/documents/warranties/${encodeURIComponent(id)}/edit`}
              className={secondaryBtn()}
            >
              Edit
            </Link>

            <AsyncButton
              loading={refreshing}
              onClick={() => load({ silent: true })}
              className={secondaryBtn()}
            >
              Refresh
            </AsyncButton>

            <button type="button" onClick={printPage} className={successBtn()}>
              <PrintIcon />
              Print
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:hidden">
        <SummaryCard
          label="Warranty"
          value={warrantyReference(warranty)}
          note={status.note}
          tone={status.tone}
        />

        <SummaryCard
          label="Customer"
          value={customerName(warranty)}
          note={customerPhone(warranty)}
        />

        <SummaryCard
          label="Covered"
          value={formatNumber(units.length)}
          note="Products on this certificate"
          tone={units.length > 0 ? "success" : "warning"}
        />

        <SummaryCard
          label="Sale value"
          value={total ? formatMoney(total) : "Not shown"}
          note={saleReference(warranty)}
        />
      </section>

      <section
        className={cx(
          pageCard(),
          "overflow-hidden print:rounded-none print:border-0 print:bg-white print:shadow-none"
        )}
      >
        <div className="border-b border-[var(--color-border)] p-5 sm:p-8 print:border-slate-200 print:p-0 print:pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <StoreMark warranty={warranty} />

              <div className="min-w-0">
                <h2 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)] print:text-slate-950">
                  {storeLocationName(warranty)}
                </h2>

                <p className="mt-1 text-sm font-bold text-[var(--color-text-muted)] print:text-slate-600">
                  {storeName(warranty)}
                </p>

                <div className="mt-3 text-sm font-medium leading-6 text-[var(--color-text-muted)] print:text-slate-600">
                  <div>{storeAddress(warranty) || "Official warranty certificate"}</div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {storePhone(warranty) ? <span>Tel: {storePhone(warranty)}</span> : null}
                    {storeEmail(warranty) ? <span>Email: {storeEmail(warranty)}</span> : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-left lg:text-right">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)] print:text-slate-500">
                Certificate
              </p>

              <div className="mt-3 flex flex-wrap gap-2 lg:justify-end">
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>

              <div className="mt-3 space-y-1 text-sm font-semibold text-[var(--color-text-muted)] print:text-slate-600">
                <div>{warrantyReference(warranty)}</div>
                <div>Created: {formatDateTime(warranty.createdAt)}</div>
                <div>Issued by: {createdByName(warranty)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8 print:p-0 print:pt-6">
          <div className="rounded-[30px] bg-[linear-gradient(135deg,rgba(74,163,255,0.14),rgba(16,185,129,0.10))] p-6 print:rounded-none print:bg-white print:p-0">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)] print:text-slate-500">
                  Warranty certificate
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--color-text)] sm:text-4xl print:text-3xl print:text-slate-950">
                  Product warranty
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)] print:text-slate-600">
                  This certificate confirms warranty coverage for the products listed below,
                  based on the sale and terms shown on this document.
                </p>
              </div>

              <div className="rounded-[24px] bg-[var(--color-card)] p-5 shadow-[var(--shadow-soft)] print:border print:border-slate-200 print:bg-white print:shadow-none">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)] print:text-slate-500">
                  Valid period
                </p>

                <p className="mt-2 text-lg font-black text-[var(--color-text)] print:text-slate-950">
                  {formatDate(warranty.startsAt)} → {formatDate(warranty.endsAt)}
                </p>

                <p className="mt-1 text-xs font-bold text-[var(--color-text-muted)] print:text-slate-600">
                  {status.note}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoTile label="Customer" value={`${customerName(warranty)} • ${customerPhone(warranty)}`} />
            <InfoTile label="Email" value={customerEmail(warranty) || "Not shown"} />
            <InfoTile label="Sale" value={saleReference(warranty)} />
            <InfoTile label="Store location" value={storeLocationLabel(warranty)} />
            <InfoTile label="Starts" value={formatDate(warranty.startsAt)} />
            <InfoTile label="Ends" value={formatDate(warranty.endsAt)} tone={status.tone} />
          </div>

          <div className="mt-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)] print:text-slate-950">
                  Covered products
                </h2>

                <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)] print:text-slate-600">
                  These products are included on this warranty certificate.
                </p>
              </div>

              <StatusBadge tone={units.length > 0 ? "success" : "warning"}>
                {formatNumber(units.length)} product{units.length === 1 ? "" : "s"}
              </StatusBadge>
            </div>

            {units.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  title="No covered products found"
                  text="This warranty does not currently show any covered products."
                />
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {units.map((unit, index) => (
                  <CoveredUnitCard
                    key={unit.id || `${unitName(unit)}-${index}`}
                    unit={unit}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)] print:text-slate-950">
              Warranty terms
            </h2>

            <div className="mt-4 rounded-[28px] bg-[var(--color-surface-2)] p-5 print:border print:border-slate-200 print:bg-white">
              {cleanString(warranty.policy) ? (
                <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-[var(--color-text-muted)] print:text-slate-700">
                  {warranty.policy}
                </p>
              ) : (
                <p className="text-sm font-medium leading-7 text-[var(--color-text-muted)] print:text-slate-700">
                  No warranty terms were saved for this certificate.
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 print:border-slate-200 print:bg-white">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)] print:text-slate-500">
                Customer signature
              </p>

              <div className="mt-10 border-t border-[var(--color-border)] pt-3 text-sm font-semibold text-[var(--color-text-muted)] print:border-slate-300 print:text-slate-600">
                Name and signature
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 print:border-slate-200 print:bg-white">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)] print:text-slate-500">
                Store confirmation
              </p>

              <div className="mt-10 border-t border-[var(--color-border)] pt-3 text-sm font-semibold text-[var(--color-text-muted)] print:border-slate-300 print:text-slate-600">
                Stamp or authorized signature
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 14mm;
            }

            body {
              background: white !important;
            }

            a[href]:after {
              content: "";
            }
          }
        `}
      </style>
    </div>
  );
}