import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  addSalePayment,
  getOutstandingCredit,
  getOverdueCredit,
  PAYMENT_METHOD_OPTIONS,
} from "../../services/posApi";
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

function formatDate(value) {
  if (!value) return "No date";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No date";

  return d.toLocaleDateString("en-RW", {
    dateStyle: "medium",
  });
}

function daysUntil(value) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(d);
  due.setHours(0, 0, 0, 0);

  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function dueText(value) {
  const days = daysUntil(value);

  if (days === null) return "No pay-by date";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} late`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";

  return `Due in ${days} days`;
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

function successBtn() {
  return cx(
    buttonBase(),
    "bg-emerald-600 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function warningBtn() {
  return cx(
    buttonBase(),
    "bg-amber-500 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function saleBalance(sale) {
  return Number(sale?.balanceDue ?? sale?.balance ?? 0);
}

function saleTotal(sale) {
  return Number(sale?.total ?? sale?.amount ?? 0);
}

function salePaid(sale) {
  return Number(sale?.amountPaid ?? sale?.paid ?? 0);
}

function customerName(sale) {
  return (
    cleanString(sale?.customer?.name) ||
    cleanString(sale?.customerName) ||
    "Customer"
  );
}

function customerPhone(sale) {
  return (
    cleanString(sale?.customer?.phone) ||
    cleanString(sale?.customerPhone) ||
    "No phone saved"
  );
}

function receiptCode(sale) {
  return (
    cleanString(sale?.receiptNumber) ||
    cleanString(sale?.invoiceNumber) ||
    cleanString(sale?.number) ||
    cleanString(sale?.id).slice(-8).toUpperCase() ||
    "Receipt"
  );
}

function branchLabel(sale) {
  const code = cleanString(sale?.branch?.code);
  const name = cleanString(sale?.branch?.name);

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return activeBranchNameFromStorage();
}

function statusForSale(sale) {
  const balance = saleBalance(sale);
  const days = daysUntil(sale?.dueDate);
  const status = String(sale?.status || "").toUpperCase();

  if (status === "OVERDUE" || (days !== null && days < 0 && balance > 0)) {
    return {
      label: "Late",
      tone: "danger",
      text: dueText(sale?.dueDate),
    };
  }

  if (days === 0 && balance > 0) {
    return {
      label: "Due today",
      tone: "warning",
      text: "Customer should pay today.",
    };
  }

  return {
    label: "Open",
    tone: "warning",
    text: dueText(sale?.dueDate),
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

function CreditDashboardSkeleton() {
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

function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <path d="M2 10h20" />
    </svg>
  );
}

function CustomerBalanceCard({ sale, onPay }) {
  const status = statusForSale(sale);
  const balance = saleBalance(sale);
  const total = saleTotal(sale);
  const paid = salePaid(sale);

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-4 sm:p-5")}>
      <div
        className={cx(
          "absolute left-0 top-0 h-full w-1.5",
          status.tone === "danger" ? "bg-red-500" : "bg-amber-500",
        )}
      />

      <div className="pl-3">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
                {customerName(sale)}
              </h3>

              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>

            <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">
              {customerPhone(sale)}
            </p>

            <p className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">
              Receipt: {receiptCode(sale)}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
            <Link to={`/app/pos/sales/${sale.id}`} className={secondaryBtn()}>
              View receipt
            </Link>

            <button type="button" onClick={() => onPay(sale)} className={successBtn()}>
              <PaymentIcon />
              Record payment
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoTile label="Balance" value={formatMoney(balance)} tone={status.tone} />
          <InfoTile label="Paid" value={formatMoney(paid)} tone={paid > 0 ? "success" : "neutral"} />
          <InfoTile label="Sale total" value={formatMoney(total)} />
          <InfoTile label="Pay-by date" value={`${formatDate(sale?.dueDate)} • ${status.text}`} tone={status.tone} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <InfoTile label="Branch" value={branchLabel(sale)} />
          <InfoTile label="Created" value={formatDate(sale?.createdAt)} />
        </div>
      </div>
    </article>
  );
}

function PaymentModal({
  open,
  sale,
  amount,
  setAmount,
  method,
  setMethod,
  note,
  setNote,
  saving,
  onClose,
  onSubmit,
}) {
  if (!open || !sale) return null;

  const balance = saleBalance(sale);
  const cleanedAmount = Number(String(amount || "").replace(/[^\d]/g, "") || 0);
  const afterPayment = Math.max(0, balance - cleanedAmount);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[94dvh] w-full max-w-3xl overflow-hidden rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Customer payment
            </p>

            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
              Record payment
            </h2>

            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Record money received from {customerName(sale)}.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            ×
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile label="Current balance" value={formatMoney(balance)} tone="warning" />
            <InfoTile label="This payment" value={formatMoney(cleanedAmount)} tone={cleanedAmount > 0 ? "success" : "neutral"} />
            <InfoTile label="Balance after" value={formatMoney(afterPayment)} tone={afterPayment > 0 ? "warning" : "success"} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Amount received
              </span>
              <input
                inputMode="numeric"
                className={inputClass()}
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
                placeholder="Amount"
                disabled={saving}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Payment method
              </span>
              <select
                className={inputClass()}
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                disabled={saving}
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Note
              </span>
              <textarea
                className={textareaClass()}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note, MoMo code, bank slip, or reminder"
                disabled={saving}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className={secondaryBtn()}>
              Cancel
            </button>

            <AsyncButton loading={saving} onClick={onSubmit} className={successBtn()}>
              Save payment
            </AsyncButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreditDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [outstanding, setOutstanding] = useState([]);
  const [overdue, setOverdue] = useState([]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeBranchLabel, setActiveBranchLabel] = useState(() => activeBranchNameFromStorage());

  const [payOpen, setPayOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNote, setPayNote] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  const mountedRef = useRef(true);

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
      const [outstandingData, overdueData] = await Promise.all([
        getOutstandingCredit(),
        getOverdueCredit(),
      ]);

      if (!mountedRef.current) return;

      const outstandingList = Array.isArray(outstandingData)
        ? outstandingData
        : Array.isArray(outstandingData?.sales)
          ? outstandingData.sales
          : [];

      const overdueList = Array.isArray(overdueData)
        ? overdueData
        : Array.isArray(overdueData?.sales)
          ? overdueData.sales
          : [];

      setOutstanding(outstandingList);
      setOverdue(overdueList);
      setVisibleCount(PAGE_SIZE);
      setActiveBranchLabel(activeBranchNameFromStorage());
    } catch (error) {
      if (!mountedRef.current) return;

      console.error(error);

      if (!handleSubscriptionBlockedError(error, { toastId: "pay-later-dashboard-blocked" })) {
        toast.error(error?.message || "Failed to load customer balances");
      }

      setOutstanding([]);
      setOverdue([]);
    } finally {
      if (!mountedRef.current) return;

      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();

    function onBranchChanged() {
      setActiveBranchLabel(activeBranchNameFromStorage());
      void load({ silent: true });
    }

    window.addEventListener("storvex:branch-changed", onBranchChanged);
    window.addEventListener("storvex:workspace-refreshed", onBranchChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onBranchChanged);
      window.removeEventListener("storvex:workspace-refreshed", onBranchChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overdueIds = useMemo(() => {
    return new Set(overdue.map((sale) => sale.id));
  }, [overdue]);

  const allBalances = useMemo(() => {
    const map = new Map();

    for (const sale of outstanding) {
      if (sale?.id) map.set(sale.id, sale);
    }

    for (const sale of overdue) {
      if (sale?.id) map.set(sale.id, sale);
    }

    return Array.from(map.values()).sort((a, b) => {
      const aLate = overdueIds.has(a.id) ? 1 : 0;
      const bLate = overdueIds.has(b.id) ? 1 : 0;

      if (aLate !== bLate) return bLate - aLate;

      const aDue = a?.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b?.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;

      return aDue - bDue;
    });
  }, [outstanding, overdue, overdueIds]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    return allBalances.filter((sale) => {
      const isLate = overdueIds.has(sale.id) || String(sale?.status || "").toUpperCase() === "OVERDUE";
      const dueToday = daysUntil(sale?.dueDate) === 0;

      if (statusFilter === "LATE" && !isLate) return false;
      if (statusFilter === "DUE_TODAY" && !dueToday) return false;
      if (statusFilter === "OPEN" && isLate) return false;

      if (!search) return true;

      const haystack = [
        sale?.id,
        sale?.receiptNumber,
        sale?.invoiceNumber,
        customerName(sale),
        customerPhone(sale),
        sale?.customer?.email,
        branchLabel(sale),
      ]
        .map((item) => String(item || "").toLowerCase())
        .join(" ");

      return haystack.includes(search);
    });
  }, [allBalances, overdueIds, q, statusFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, statusFilter]);

  const visibleRows = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const summary = useMemo(() => {
    const totalBalance = allBalances.reduce((sum, sale) => sum + saleBalance(sale), 0);
    const overdueBalance = allBalances
      .filter((sale) => overdueIds.has(sale.id) || String(sale?.status || "").toUpperCase() === "OVERDUE")
      .reduce((sum, sale) => sum + saleBalance(sale), 0);

    const dueTodayBalance = allBalances
      .filter((sale) => daysUntil(sale?.dueDate) === 0)
      .reduce((sum, sale) => sum + saleBalance(sale), 0);

    return {
      count: allBalances.length,
      totalBalance,
      overdueCount: overdueIds.size,
      overdueBalance,
      dueTodayBalance,
    };
  }, [allBalances, overdueIds]);

  function openPayModal(sale) {
    setSelectedSale(sale);
    setPayAmount("");
    setPayMethod("CASH");
    setPayNote("");
    setPayOpen(true);
  }

  function closePayModal() {
    if (paySaving) return;

    setPayOpen(false);
    setSelectedSale(null);
    setPayAmount("");
    setPayMethod("CASH");
    setPayNote("");
  }

  async function submitPayment() {
    if (!selectedSale) return;

    const amount = Number(String(payAmount || "").replace(/[^\d]/g, "") || 0);
    const balance = saleBalance(selectedSale);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    if (amount > balance) {
      toast.error("Payment cannot be more than the remaining balance");
      return;
    }

    setPaySaving(true);

    try {
      await addSalePayment(selectedSale.id, {
        amount,
        method: payMethod,
        note: cleanString(payNote) || null,
      });

      toast.success("Payment recorded");
      closePayModal();
      await load({ silent: true });
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "pay-later-payment-blocked" })) {
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || "Failed to record payment");
    } finally {
      setPaySaving(false);
    }
  }

  function loadMore() {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }

  if (loading) {
    return <CreditDashboardSkeleton />;
  }

  return (
    <div className="space-y-5">
      <PaymentModal
        open={payOpen}
        sale={selectedSale}
        amount={payAmount}
        setAmount={setPayAmount}
        method={payMethod}
        setMethod={setPayMethod}
        note={payNote}
        setNote={setPayNote}
        saving={paySaving}
        onClose={closePayModal}
        onSubmit={submitPayment}
      />

      <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Pay later
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
              Customer balances
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Follow up money still owed in{" "}
              <span className="font-black text-[var(--color-text)]">{activeBranchLabel}</span>.
              The first 10 balances are shown first. Search, filter, or load more to find the rest.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <Link to="/app/pos/sales" className={secondaryBtn()}>
              Sales list
            </Link>

            <AsyncButton loading={refreshing} onClick={() => load({ silent: true })} className={secondaryBtn()}>
              Refresh
            </AsyncButton>

            <Link to="/app/pos" className={primaryBtn()}>
              <PlusIcon />
              New sale
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Open balances"
          value={formatNumber(summary.count)}
          note="Customers who still owe money"
          tone={summary.count > 0 ? "warning" : "success"}
        />

        <SummaryCard
          label="Money owed"
          value={formatMoney(summary.totalBalance)}
          note="Total remaining balance"
          tone={summary.totalBalance > 0 ? "warning" : "success"}
        />

        <SummaryCard
          label="Late"
          value={formatNumber(summary.overdueCount)}
          note={formatMoney(summary.overdueBalance)}
          tone={summary.overdueCount > 0 ? "danger" : "success"}
        />

        <SummaryCard
          label="Due today"
          value={formatMoney(summary.dueTodayBalance)}
          note="Needs same-day follow-up"
          tone={summary.dueTodayBalance > 0 ? "warning" : "neutral"}
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
              placeholder="Search by customer, phone, receipt, or branch..."
            />
          </div>

          <select
            className={inputClass()}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All balances</option>
            <option value="LATE">Late only</option>
            <option value="DUE_TODAY">Due today</option>
            <option value="OPEN">Open, not late</option>
          </select>
        </div>

        <div className="mt-5">
          {visibleRows.length === 0 ? (
            <EmptyState
              title="No customer balances found"
              text="Pay-later sales with unpaid balances will appear here. Try changing the search or filter."
              action={
                <Link to="/app/pos" className={primaryBtn()}>
                  Start sale
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid gap-3">
                {visibleRows.map((sale) => (
                  <CustomerBalanceCard key={sale.id} sale={sale} onPay={openPayModal} />
                ))}
              </div>

              <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-[26px] bg-[var(--color-surface-2)] px-4 py-4 sm:flex-row">
                <p className="text-center text-sm font-bold text-[var(--color-text-muted)] sm:text-left">
                  Showing {formatNumber(visibleRows.length)} of {formatNumber(filtered.length)} balance
                  {filtered.length === 1 ? "" : "s"}.
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