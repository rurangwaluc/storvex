import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { cancelSale as cancelSaleApi, listSales } from "../../services/posApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

const PAGE_SIZE = 10;

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function formatMoney(value) {
  const n = Number(value || 0);
  const safe = Number.isFinite(n) ? n : 0;

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(safe)}`;
}

function formatNumber(value) {
  const n = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
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

function relativeTime(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;

  return d.toLocaleDateString("en-RW", {
    dateStyle: "medium",
  });
}

function activeBranchNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "this branch";
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

function textareaClass() {
  return "min-h-[110px] w-full rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)] disabled:cursor-not-allowed disabled:opacity-60";
}

function buttonBase() {
  return "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60";
}

function primaryBtn() {
  return cx(
    buttonBase(),
    "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function secondaryBtn() {
  return cx(
    buttonBase(),
    "bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function dangerBtn() {
  return cx(
    buttonBase(),
    "bg-red-600 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function disabledBtn() {
  return cx(
    buttonBase(),
    "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] opacity-60",
  );
}

function saleTotal(sale) {
  return Number(sale?.total ?? sale?.amount ?? sale?.grandTotal ?? 0);
}

function salePaid(sale) {
  return Number(sale?.amountPaid ?? sale?.paid ?? 0);
}

function saleBalance(sale) {
  return Number(sale?.balanceDue ?? sale?.balance ?? 0);
}

function saleStatus(sale) {
  const status = String(sale?.status || "").toUpperCase();
  const saleType = String(sale?.saleType || "").toUpperCase();
  const balance = saleBalance(sale);

  if (sale?.isCancelled || status === "CANCELLED") {
    return {
      label: "Cancelled",
      tone: "danger",
      note: "This sale was cancelled.",
    };
  }

  if (status === "OVERDUE") {
    return {
      label: "Overdue",
      tone: "danger",
      note: "Customer needs follow-up.",
    };
  }

  if (balance > 0 || saleType === "CREDIT") {
    return {
      label: balance > 0 ? "Balance due" : "Pay later",
      tone: "warning",
      note: balance > 0 ? `${formatMoney(balance)} still unpaid.` : "Customer will pay later.",
    };
  }

  return {
    label: "Paid",
    tone: "success",
    note: "Payment complete.",
  };
}

function saleTypeLabel(value) {
  const v = String(value || "").toUpperCase();
  if (v === "CREDIT") return "Pay later";
  return "Paid now";
}

function customerName(sale) {
  return (
    cleanString(sale?.customer?.name) ||
    cleanString(sale?.customerName) ||
    "Walk-in customer"
  );
}

function customerPhone(sale) {
  return (
    cleanString(sale?.customer?.phone) ||
    cleanString(sale?.customerPhone) ||
    "No phone attached"
  );
}

function cashierName(sale) {
  return (
    cleanString(sale?.cashier?.name) ||
    cleanString(sale?.cashierName) ||
    "—"
  );
}

function receiptCode(sale) {
  return (
    cleanString(sale?.receiptNumber) ||
    cleanString(sale?.number) ||
    cleanString(sale?.id).slice(-8).toUpperCase() ||
    "—"
  );
}

function canCancelFromList(sale) {
  if (!sale) return false;
  if (sale?.isCancelled) return false;
  if (String(sale?.saleType || "").toUpperCase() !== "CASH") return false;
  if (Number(sale?.refundedTotal || 0) > 0) return false;

  return true;
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
        cls,
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

function SalesListSkeleton() {
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
            <SkeletonBlock className="mt-4 h-8 w-24" />
            <SkeletonBlock className="mt-2 h-4 w-36" />
          </div>
        ))}
      </section>

      <section className={cx(pageCard(), "p-5")}>
        <SkeletonBlock className="h-12 w-full rounded-[18px]" />
        <div className="mt-5 grid gap-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <SkeletonBlock key={item} className="h-48 w-full rounded-[28px]" />
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ title, text, action }) {
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

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
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

function SaleCard({ sale, onOpenCancel, cancelBusy }) {
  const status = saleStatus(sale);
  const cancelEnabled = canCancelFromList(sale);
  const total = saleTotal(sale);
  const paid = salePaid(sale);
  const balance = saleBalance(sale);
  const saleType = String(sale?.saleType || "").toUpperCase();

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-4 sm:p-5")}>
      <div
        className={cx(
          "absolute left-0 top-0 h-full w-1.5",
          status.tone === "danger"
            ? "bg-red-500"
            : status.tone === "warning"
              ? "bg-amber-500"
              : "bg-emerald-500",
        )}
      />

      <div className="pl-3">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
                {formatMoney(total)}
              </h3>

              <StatusBadge tone={saleType === "CREDIT" ? "warning" : "success"}>
                {saleTypeLabel(saleType)}
              </StatusBadge>

              <StatusBadge tone={status.tone}>
                {status.label}
              </StatusBadge>
            </div>

            <p className="mt-2 text-xs font-bold text-[var(--color-text-muted)]">
              Receipt: {receiptCode(sale)}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
            <Link to={`/app/pos/sales/${sale.id}`} className={secondaryBtn()}>
              View receipt
            </Link>

            <button
              type="button"
              onClick={() => onOpenCancel(sale.id)}
              disabled={!cancelEnabled || cancelBusy}
              className={cancelEnabled && !cancelBusy ? dangerBtn() : disabledBtn()}
              title={!cancelEnabled ? "Only active paid-now sales can be cancelled here." : ""}
            >
              <CancelIcon />
              Cancel
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile
              label="Customer"
              value={`${customerName(sale)}${customerPhone(sale) ? ` • ${customerPhone(sale)}` : ""}`}
            />

            <InfoTile
              label="Cashier"
              value={`${cashierName(sale)} • ${formatDateTime(sale.createdAt)}`}
            />
          </div>

          <div className={cx(softPanel(), "p-4 shadow-[var(--shadow-soft)]")}>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
              Sale state
            </p>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-[var(--color-text-muted)]">Updated</span>
                <span className="text-xs font-black text-[var(--color-text)]">
                  {relativeTime(sale.updatedAt || sale.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-[var(--color-text-muted)]">
                  {balance > 0 ? "Still unpaid" : "Paid"}
                </span>
                <span
                  className={cx(
                    "text-sm font-black",
                    balance > 0 ? "text-amber-600" : "text-emerald-600",
                  )}
                >
                  {balance > 0 ? formatMoney(balance) : formatMoney(paid || total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <InfoTile label="Total" value={formatMoney(total)} />
          <InfoTile label="Paid" value={formatMoney(paid)} tone={paid > 0 ? "success" : "neutral"} />
          <InfoTile label="Balance" value={formatMoney(balance)} tone={balance > 0 ? "warning" : "success"} />
        </div>
      </div>
    </article>
  );
}

export default function SalesList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeBranchLabel, setActiveBranchLabel] = useState(() => activeBranchNameFromStorage());

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelSaleId, setCancelSaleId] = useState("");
  const [cancelNote, setCancelNote] = useState("");

  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  async function load() {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const data = await listSales({}, { signal: controller.signal });

      if (!mountedRef.current || controller.signal.aborted) return;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.sales)
          ? data.sales
          : [];

      setSales(list);
      setVisibleCount(PAGE_SIZE);
      setActiveBranchLabel(activeBranchNameFromStorage());
    } catch (error) {
      if (controller.signal.aborted) return;

      console.error(error);

      if (!handleSubscriptionBlockedError(error, { toastId: "sales-list-blocked" })) {
        toast.error(error?.message || "Failed to load sales");
      }

      if (!mountedRef.current) return;

      setSales([]);
      setVisibleCount(PAGE_SIZE);
    } finally {
      if (!mountedRef.current || controller.signal.aborted) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onBranchChanged() {
      setActiveBranchLabel(activeBranchNameFromStorage());
      setVisibleCount(PAGE_SIZE);
      void load();
    }

    window.addEventListener("storvex:branch-changed", onBranchChanged);
    window.addEventListener("storvex:workspace-refreshed", onBranchChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onBranchChanged);
      window.removeEventListener("storvex:workspace-refreshed", onBranchChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    return sales.filter((sale) => {
      const status = String(sale?.status || "").toUpperCase();
      const type = String(sale?.saleType || "").toUpperCase();

      if (statusFilter !== "ALL") {
        if (statusFilter === "BALANCE") {
          if (saleBalance(sale) <= 0) return false;
        } else if (status !== statusFilter) {
          return false;
        }
      }

      if (typeFilter !== "ALL" && type !== typeFilter) {
        return false;
      }

      if (!search) return true;

      const haystack = [
        sale?.id,
        sale?.receiptNumber,
        sale?.number,
        customerName(sale),
        customerPhone(sale),
        cashierName(sale),
        sale?.customer?.email,
      ]
        .map((item) => String(item || "").toLowerCase())
        .join(" ");

      return haystack.includes(search);
    });
  }, [sales, q, statusFilter, typeFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, statusFilter, typeFilter]);

  const visibleSales = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const summary = useMemo(() => {
    const total = sales.length;
    const paid = sales.filter((sale) => saleBalance(sale) <= 0 && !sale?.isCancelled).length;
    const withBalance = sales.filter((sale) => saleBalance(sale) > 0 && !sale?.isCancelled).length;
    const overdue = sales.filter((sale) => String(sale?.status || "").toUpperCase() === "OVERDUE").length;
    const totalMoney = sales.reduce((sum, sale) => sum + saleTotal(sale), 0);

    return {
      total,
      paid,
      withBalance,
      overdue,
      totalMoney,
    };
  }, [sales]);

  function openCancel(saleId) {
    setCancelSaleId(String(saleId || ""));
    setCancelNote("");
    setCancelOpen(true);
  }

  async function confirmCancel() {
    if (!cancelSaleId) return;

    setCancelBusy(true);

    try {
      await cancelSaleApi(cancelSaleId, {
        note: cleanString(cancelNote) || null,
      });

      toast.success("Sale cancelled");
      setCancelOpen(false);
      setCancelSaleId("");
      setCancelNote("");
      await load();
    } catch (error) {
      console.error(error);

      if (handleSubscriptionBlockedError(error, { toastId: "sale-list-cancel-blocked" })) {
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || "Failed to cancel sale");
    } finally {
      setCancelBusy(false);
    }
  }

  function handleLoadMore() {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }

  if (loading && sales.length === 0) {
    return <SalesListSkeleton />;
  }

  return (
    <div className="space-y-5">
      <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Sales
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
              Sales history
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Review sales from{" "}
              <span className="font-black text-[var(--color-text)]">{activeBranchLabel}</span>.
              The first 10 sales are shown first. Use search, filters, or load more to find the rest.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <button
              type="button"
              onClick={() => navigate("/app/pos")}
              className={secondaryBtn()}
            >
              <BackIcon />
              New sale
            </button>

            <AsyncButton
              loading={loading}
              onClick={load}
              className={secondaryBtn()}
            >
              Refresh
            </AsyncButton>

            <Link to="/app/pos" className={primaryBtn()}>
              <PlusIcon />
              Start sale
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Sales"
          value={formatNumber(summary.total)}
          note="Loaded in this branch view"
        />

        <SummaryCard
          label="Sales value"
          value={formatMoney(summary.totalMoney)}
          note="Total value shown"
          tone="success"
        />

        <SummaryCard
          label="Paid"
          value={formatNumber(summary.paid)}
          note="No balance left"
          tone="success"
        />

        <SummaryCard
          label="Need follow-up"
          value={formatNumber(summary.withBalance + summary.overdue)}
          note="Balance or overdue sales"
          tone={summary.withBalance + summary.overdue > 0 ? "warning" : "neutral"}
        />
      </section>

      <section className={cx(pageCard(), "p-4 sm:p-5")}>
        <div className="grid gap-3 xl:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              <SearchIcon />
            </span>

            <input
              className={cx(inputClass(), "pl-11")}
              placeholder="Search by customer, phone, cashier, or receipt..."
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </div>

          <select
            className={inputClass()}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="PAID">Paid</option>
            <option value="BALANCE">Balance due</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            className={inputClass()}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="ALL">All sale types</option>
            <option value="CASH">Paid now</option>
            <option value="CREDIT">Pay later</option>
          </select>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((item) => (
                <SkeletonBlock key={item} className="h-48 w-full rounded-[28px]" />
              ))}
            </div>
          ) : visibleSales.length === 0 ? (
            <EmptyState
              title="No sales found"
              text="Try changing the search text or filters. New sales will appear here after they are completed."
              action={
                <Link to="/app/pos" className={primaryBtn()}>
                  Start sale
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid gap-3">
                {visibleSales.map((sale) => (
                  <SaleCard
                    key={sale.id}
                    sale={sale}
                    onOpenCancel={openCancel}
                    cancelBusy={cancelBusy}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-[26px] bg-[var(--color-surface-2)] px-4 py-4 sm:flex-row">
                <p className="text-center text-sm font-bold text-[var(--color-text-muted)] sm:text-left">
                  Showing {formatNumber(visibleSales.length)} of {formatNumber(filtered.length)} sale
                  {filtered.length === 1 ? "" : "s"}.
                </p>

                {hasMore ? (
                  <button
                    type="button"
                    onClick={handleLoadMore}
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

      {cancelOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className={cx(pageCard(), "w-full max-w-md p-5 sm:p-6")}>
            <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
              Cancel sale
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              This will return the sold items to stock and mark the sale as cancelled. Use this only when the sale truly should not stand.
            </p>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Reason
              </span>

              <textarea
                className={textareaClass()}
                placeholder="Example: customer changed their mind before leaving"
                value={cancelNote}
                onChange={(event) => setCancelNote(event.target.value)}
                disabled={cancelBusy}
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={cancelBusy}
                className={secondaryBtn()}
              >
                Keep sale
              </button>

              <button
                type="button"
                disabled={cancelBusy}
                onClick={confirmCancel}
                className={dangerBtn()}
              >
                {cancelBusy ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}