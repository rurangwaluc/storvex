import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  downloadStockAdjustmentsExcel,
  getStockAdjustments,
} from "../../services/inventoryApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

const PAGE_SIZE = 10;

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function toISODate(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatNumber(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-RW").format(Number.isFinite(n) ? n : 0);
}

function formatDateTime(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("en-RW", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function stockTypeLabel(type) {
  if (type === "RESTOCK") return "Stock added";
  if (type === "LOSS") return "Stock removed";
  if (type === "CORRECTION") return "Stock corrected";
  return "Stock changed";
}

function stockTypeShortLabel(type) {
  if (type === "RESTOCK") return "Added";
  if (type === "LOSS") return "Removed";
  if (type === "CORRECTION") return "Corrected";
  return "Changed";
}

function changeText(row) {
  const value = Number(row?.delta || 0);

  if (value > 0) return `+${formatNumber(value)}`;
  return formatNumber(value);
}

function changeTone(row) {
  const value = Number(row?.delta || 0);

  if (row?.type === "RESTOCK" || value > 0) return "success";
  if (row?.type === "LOSS" || value < 0) return "danger";
  if (row?.type === "CORRECTION") return "warning";

  return "neutral";
}

function pageCard() {
  return "rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[24px] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)]";
}

function buttonBase() {
  return "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryButton() {
  return cx(
    buttonBase(),
    "bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function primaryButton() {
  return cx(
    buttonBase(),
    "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function AsyncButton({
  loading,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(buttonBase(), className)}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : null}
      {children}
    </button>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v11" strokeLinecap="round" />
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-4-2-3 2-3-2-4 2V5a2 2 0 0 1 2-2Z" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

function StatusBadge({ tone = "neutral", children }) {
  const classes =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600"
      : tone === "danger"
        ? "bg-red-500/10 text-red-600"
        : tone === "warning"
          ? "bg-amber-500/10 text-amber-600"
          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em]",
        classes,
      )}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, note, tone = "neutral" }) {
  const dot =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "danger"
        ? "bg-red-500"
        : tone === "warning"
          ? "bg-amber-500"
          : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[rgba(74,163,255,0.08)] blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <span className={cx("h-2.5 w-2.5 rounded-full", dot)} />
        </div>

        <div className="mt-3 text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">
          {value}
        </div>

        {note ? (
          <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            {note}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div className={cx("animate-pulse rounded-[22px] bg-[var(--color-surface-2)]", className)} />
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className={cx(pageCard(), "p-5 sm:p-6")}>
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-4 h-10 w-64 rounded-[18px]" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className={cx(pageCard(), "p-5")}>
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-20" />
          </div>
        ))}
      </div>

      <div className={cx(pageCard(), "p-5")}>
        <SkeletonBlock className="h-12 w-full rounded-[18px]" />
        <div className="mt-5 space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <SkeletonBlock key={item} className="h-44 w-full rounded-[28px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChangeCard({ row }) {
  const tone = changeTone(row);
  const before = Number(row?.beforeQty ?? 0);
  const after = Number(row?.afterQty ?? 0);
  const productName = row?.product?.name || "Unknown product";
  const category = row?.product?.category || "No category";
  const changedBy = row?.createdBy?.name || "System";

  const sideBar =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "danger"
        ? "bg-red-500"
        : tone === "warning"
          ? "bg-amber-500"
          : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-4 sm:p-5")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", sideBar)} />

      <div className="pl-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                {productName}
              </h3>
              <StatusBadge tone={tone}>{stockTypeShortLabel(row?.type)}</StatusBadge>
            </div>

            <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
              {category}
            </p>

            <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
              {formatDateTime(row?.createdAt)}
            </p>
          </div>

          <div className="rounded-[22px] bg-[var(--color-surface-2)] px-4 py-3 text-right shadow-[var(--shadow-soft)]">
            <div
              className={cx(
                "text-2xl font-black tracking-[-0.03em]",
                tone === "success"
                  ? "text-emerald-600"
                  : tone === "danger"
                    ? "text-red-600"
                    : tone === "warning"
                      ? "text-amber-600"
                      : "text-[var(--color-text)]",
              )}
            >
              {changeText(row)}
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              change
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={cx(softPanel(), "p-4 shadow-[var(--shadow-soft)]")}>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
              Before
            </p>
            <p className="mt-2 text-xl font-black text-[var(--color-text)]">
              {formatNumber(before)}
            </p>
          </div>

          <div className={cx(softPanel(), "p-4 shadow-[var(--shadow-soft)]")}>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
              After
            </p>
            <p className="mt-2 text-xl font-black text-[var(--color-text)]">
              {formatNumber(after)}
            </p>
          </div>

          <div className={cx(softPanel(), "p-4 shadow-[var(--shadow-soft)]")}>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
              Done by
            </p>
            <p className="mt-2 truncate text-sm font-black text-[var(--color-text)]">
              {changedBy}
            </p>
          </div>

          <div className={cx(softPanel(), "p-4 shadow-[var(--shadow-soft)]")}>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
              Reason
            </p>
            <p className="mt-2 truncate text-sm font-black text-[var(--color-text)]">
              {stockTypeLabel(row?.type)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
            Note
          </p>
          <p className="mt-2 break-words text-sm font-medium leading-6 text-[var(--color-text-muted)]">
            {row?.note || "No note was added."}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function StockAdjustments() {
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(
    () => new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
    [today],
  );

  const [from, setFrom] = useState(toISODate(sevenDaysAgo));
  const [to, setTo] = useState(toISODate(today));
  const [type, setType] = useState("");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const data = await getStockAdjustments({
        from,
        to,
        type: type || undefined,
        q: q.trim() || undefined,
        limit: 200,
      });

      setRows(Array.isArray(data?.adjustments) ? data.adjustments : []);
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "stock-history-load-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to load stock history");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadExcel() {
    if (downloadingExcel) return;

    setDownloadingExcel(true);

    try {
      await downloadStockAdjustmentsExcel({
        from,
        to,
        type: type || undefined,
        q: q.trim() || undefined,
      });

      toast.success("Stock history downloaded");
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "stock-history-export-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to download stock history");
    } finally {
      setDownloadingExcel(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, type, q]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [from, to, type, q, rows.length]);

  useEffect(() => {
    function onBranchChanged() {
      setVisibleCount(PAGE_SIZE);
      load();
    }

    window.addEventListener("storvex:branch-changed", onBranchChanged);
    window.addEventListener("storvex:workspace-refreshed", onBranchChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onBranchChanged);
      window.removeEventListener("storvex:workspace-refreshed", onBranchChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addedCount = rows.filter((row) => row.type === "RESTOCK").length;
  const removedCount = rows.filter((row) => row.type === "LOSS").length;
  const correctedCount = rows.filter((row) => row.type === "CORRECTION").length;

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;

  const stats = [
    {
      label: "Total changes",
      value: loading ? "—" : formatNumber(rows.length),
      note: "Based on your current filters",
      tone: "neutral",
    },
    {
      label: "Stock added",
      value: loading ? "—" : formatNumber(addedCount),
      note: "New stock received",
      tone: "success",
    },
    {
      label: "Stock removed",
      value: loading ? "—" : formatNumber(removedCount),
      note: "Lost, damaged, or removed",
      tone: "danger",
    },
    {
      label: "Counts corrected",
      value: loading ? "—" : formatNumber(correctedCount),
      note: "Physical count fixes",
      tone: "warning",
    },
  ];

  if (loading && rows.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5">
      <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Stock control
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
              Stock history
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Review every stock change: what changed, who changed it, and the note behind it.
              The first 10 changes are shown first. Use filters or load more to see the rest.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <button
              type="button"
              onClick={() => navigate("/app/inventory")}
              className={secondaryButton()}
            >
              <BackIcon />
              Back
            </button>

            <AsyncButton
              loading={loading}
              onClick={load}
              className="bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
            >
              Refresh
            </AsyncButton>

            <AsyncButton
              loading={downloadingExcel}
              onClick={handleDownloadExcel}
              className={primaryButton()}
            >
              <DownloadIcon />
              Download
            </AsyncButton>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className={cx(pageCard(), "p-4 sm:p-5")}>
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_160px]">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              <SearchIcon />
            </span>
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className={cx(inputClass(), "pl-11")}
              placeholder="Search by product, code, barcode, or serial..."
            />
          </div>

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={inputClass()}
          >
            <option value="">All changes</option>
            <option value="RESTOCK">Stock added</option>
            <option value="LOSS">Stock removed</option>
            <option value="CORRECTION">Count corrected</option>
          </select>

          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={inputClass()}
            aria-label="From date"
          />

          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={inputClass()}
            aria-label="To date"
          />
        </div>

        <div className="mt-5">
          {rows.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[30px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[26px] bg-[var(--color-card)] text-[var(--color-primary)] shadow-[var(--shadow-soft)]">
                <EmptyIcon />
              </div>

              <h3 className="mt-4 text-lg font-black text-[var(--color-text)]">
                No stock changes found
              </h3>

              <p className="mt-1 max-w-md text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                Try a wider date range, remove the search text, or choose another change type.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {visibleRows.map((row) => (
                  <ChangeCard key={row.id} row={row} />
                ))}
              </div>

              <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-[26px] bg-[var(--color-surface-2)] px-4 py-4 sm:flex-row">
                <p className="text-center text-sm font-bold text-[var(--color-text-muted)] sm:text-left">
                  Showing {formatNumber(visibleRows.length)} of {formatNumber(rows.length)} change
                  {rows.length === 1 ? "" : "s"}.
                </p>

                {hasMore ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
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