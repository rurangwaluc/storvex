import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  addSalePayment,
  getOutstandingCredit,
  getOverdueCredit,
  PAYMENT_METHOD_OPTIONS,
} from "../../services/posApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./CreditDashboard.css";

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

function dueTone(value, balance = 0, status = "") {
  const days = daysUntil(value);
  const normalizedStatus = String(status || "").toUpperCase();

  if (Number(balance || 0) <= 0) return "success";
  if (normalizedStatus === "OVERDUE") return "danger";
  if (days !== null && days < 0) return "danger";
  if (days === 0 || days === 1) return "warning";

  return "neutral";
}

function activeBranchNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (name) return name;
  if (code) return code;

  return "this branch";
}

function saleBalance(sale) {
  return Number(sale?.balanceDue ?? sale?.balance ?? 0);
}

function saleTotal(sale) {
  return Number(sale?.total ?? sale?.amount ?? sale?.grandTotal ?? 0);
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

function cashierName(sale) {
  return cleanString(sale?.cashier?.name) || cleanString(sale?.cashierName) || "—";
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

  if (name) return name;
  if (code) return code;

  return activeBranchNameFromStorage();
}

function statusForSale(sale) {
  const balance = saleBalance(sale);
  const days = daysUntil(sale?.dueDate);
  const status = String(sale?.status || "").toUpperCase();

  if (balance <= 0) {
    return {
      label: "Paid off",
      tone: "success",
      text: "No balance left.",
    };
  }

  if (status === "OVERDUE" || (days !== null && days < 0)) {
    return {
      label: "Late",
      tone: "danger",
      text: dueText(sale?.dueDate),
    };
  }

  if (days === 0) {
    return {
      label: "Due today",
      tone: "warning",
      text: "Customer should pay today.",
    };
  }

  if (days === 1) {
    return {
      label: "Due tomorrow",
      tone: "warning",
      text: "Follow up tomorrow.",
    };
  }

  return {
    label: "Open",
    tone: "neutral",
    text: dueText(sale?.dueDate),
  };
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <path d="M2 10h20" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function StatusBadge({ tone = "neutral", children }) {
  return <span className={cx("svx-dues-badge", `is-${tone}`)}>{children}</span>;
}

function SkeletonBlock({ className = "" }) {
  return <div className={cx("svx-dues-skeleton", className)} />;
}

function CreditDashboardSkeleton() {
  return (
    <main className="svx-dues-page">
      <section className="svx-dues-hero">
        <SkeletonBlock className="is-kicker" />
        <SkeletonBlock className="is-title" />
        <SkeletonBlock className="is-copy" />
      </section>

      <section className="svx-dues-metrics">
        {[1, 2, 3, 4].map((item) => (
          <SkeletonBlock key={item} className="is-metric" />
        ))}
      </section>

      <section className="svx-dues-list-card">
        <SkeletonBlock className="is-control" />
        <div className="svx-dues-rows">
          {[1, 2, 3, 4].map((item) => (
            <SkeletonBlock key={item} className="is-row" />
          ))}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  return (
    <article className="svx-dues-metric">
      <span className={cx("svx-dues-metric-dot", `is-${tone}`)} />
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

function EmptyState({ title, text, action = null }) {
  return (
    <div className="svx-dues-empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? <div className="svx-dues-empty-action">{action}</div> : null}
    </div>
  );
}

function MoneyField({ label, value, tone = "neutral" }) {
  return (
    <div className={cx("svx-dues-money-field", `is-${tone}`)}>
      <small>{label}</small>
      <b>{value || "—"}</b>
    </div>
  );
}

function CustomerDueRow({ sale, onOpen, onPay }) {
  const status = statusForSale(sale);
  const balance = saleBalance(sale);
  const total = saleTotal(sale);
  const paid = salePaid(sale);
  const due = dueText(sale?.dueDate);
  const receipt = receiptCode(sale);
  const receiptUrl = `/app/pos/sales/${sale.id}`;
  const returnUrl = `${receiptUrl}?refund=1`;

  function stopRowOpen(event) {
    event.stopPropagation();
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen(sale.id);
  }

  return (
    <article
      className={cx("svx-dues-row", `is-${status.tone}`)}
      role="button"
      tabIndex={0}
      aria-label={`Open dues for ${customerName(sale)}`}
      onClick={() => onOpen(sale.id)}
      onKeyDown={handleKeyDown}
    >
      <div className="svx-dues-field is-customer">
        <small>Customer</small>
        <b>{customerName(sale)}</b>
        <span>{customerPhone(sale)}</span>
      </div>

      <div className="svx-dues-field is-receipt">
        <small>Receipt</small>
        <b>{receipt}</b>
        <span>{branchLabel(sale)}</span>
      </div>

      <div className="svx-dues-field is-follow-up">
        <small>Follow-up</small>
        <b>{status.label}</b>
        <span>{formatDate(sale?.dueDate)}</span>
        <em>{due}</em>
      </div>

      <div className="svx-dues-field is-money">
        <small>Balance</small>
        <b>{formatMoney(balance)}</b>
        <span>Paid {formatMoney(paid)}</span>
        <em>Total {formatMoney(total)}</em>
      </div>

      <div className="svx-dues-row-actions" onClick={stopRowOpen}>
        <button type="button" onClick={() => onPay(sale)} className="svx-dues-button primary">
          <PaymentIcon />
          Record
        </button>

        <Link to={returnUrl} className="svx-dues-button danger">
          Return
        </Link>
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
    <div className="svx-dues-modal-backdrop">
      <div className="svx-dues-modal">
        <header className="svx-dues-modal-head">
          <div>
            <p className="svx-dues-kicker">Customer payment</p>
            <h2>Record payment</h2>
            <p>Record money received from {customerName(sale)}.</p>
          </div>

          <button type="button" onClick={onClose} disabled={saving} className="svx-dues-icon-button">
            <CloseIcon />
          </button>
        </header>

        <div className="svx-dues-modal-body">
          <section className="svx-dues-payment-summary">
            <MoneyField label="Current balance" value={formatMoney(balance)} tone="warning" />
            <MoneyField label="This payment" value={formatMoney(cleanedAmount)} tone={cleanedAmount > 0 ? "success" : "neutral"} />
            <MoneyField label="Balance after" value={formatMoney(afterPayment)} tone={afterPayment > 0 ? "warning" : "success"} />
          </section>

          <section className="svx-dues-payment-form">
            <label>
              <span>Amount received</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
                placeholder="Amount"
                disabled={saving}
              />
            </label>

            <label>
              <span>Payment method</span>
              <select
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

            <label className="is-wide">
              <span>Note</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note, MoMo code, bank slip, or reminder"
                disabled={saving}
              />
            </label>
          </section>

          <footer className="svx-dues-modal-actions">
            <button type="button" onClick={onClose} disabled={saving} className="svx-dues-button secondary">
              Cancel
            </button>

            <AsyncButton loading={saving} onClick={onSubmit} className="svx-dues-button primary">
              Save payment
            </AsyncButton>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default function CreditDashboard() {
  const navigate = useNavigate();

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
    return new Set(overdue.map((sale) => sale.id).filter(Boolean));
  }, [overdue]);

  const allBalances = useMemo(() => {
    const map = new Map();

    for (const sale of outstanding) {
      if (sale?.id) map.set(sale.id, sale);
    }

    for (const sale of overdue) {
      if (sale?.id) map.set(sale.id, sale);
    }

    return Array.from(map.values())
      .filter((sale) => saleBalance(sale) > 0)
      .sort((a, b) => {
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
      const isLate =
        overdueIds.has(sale.id) ||
        String(sale?.status || "").toUpperCase() === "OVERDUE" ||
        dueTone(sale?.dueDate, saleBalance(sale), sale?.status) === "danger";

      const dueToday = daysUntil(sale?.dueDate) === 0;
      const dueSoon = [0, 1, 2, 3].includes(daysUntil(sale?.dueDate));

      if (statusFilter === "LATE" && !isLate) return false;
      if (statusFilter === "DUE_TODAY" && !dueToday) return false;
      if (statusFilter === "DUE_SOON" && !dueSoon) return false;
      if (statusFilter === "OPEN" && isLate) return false;

      if (!search) return true;

      const haystack = [
        sale?.id,
        sale?.receiptNumber,
        sale?.invoiceNumber,
        sale?.number,
        customerName(sale),
        customerPhone(sale),
        sale?.customer?.email,
        branchLabel(sale),
        cashierName(sale),
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
    const overdueList = allBalances.filter((sale) => {
      return (
        overdueIds.has(sale.id) ||
        String(sale?.status || "").toUpperCase() === "OVERDUE" ||
        dueTone(sale?.dueDate, saleBalance(sale), sale?.status) === "danger"
      );
    });

    const dueTodayList = allBalances.filter((sale) => daysUntil(sale?.dueDate) === 0);
    const customerKeys = new Set(
      allBalances.map((sale) => {
        return (
          cleanString(sale?.customer?.id) ||
          cleanString(sale?.customerId) ||
          customerPhone(sale) ||
          customerName(sale)
        );
      }),
    );

    return {
      count: allBalances.length,
      customerCount: customerKeys.size,
      totalBalance,
      overdueCount: overdueList.length,
      overdueBalance: overdueList.reduce((sum, sale) => sum + saleBalance(sale), 0),
      dueTodayBalance: dueTodayList.reduce((sum, sale) => sum + saleBalance(sale), 0),
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
    <main className="svx-dues-page">
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

      <section className="svx-dues-hero">
        <div className="svx-dues-hero-copy">
          <p className="svx-dues-kicker">Collections</p>

          <h1>Customer collections</h1>

          <p>
            Track outstanding invoices in <strong>{activeBranchLabel}</strong>,
            collect customer payments, monitor overdue balances,
            and manage business receivables.
          </p>
        </div>

        <div className="svx-dues-hero-actions">
          <Link to="/app/pos/sales" className="svx-dues-button secondary">
            Sales list
          </Link>

          <AsyncButton loading={refreshing} onClick={() => load({ silent: true })} className="svx-dues-button secondary">
            Refresh
          </AsyncButton>

          <Link to="/app/pos" className="svx-dues-button primary">
            <PlusIcon />
            New sale
          </Link>
        </div>
      </section>

      <section className="svx-dues-metrics">
        <SummaryCard
          label="Customers owing"
          value={formatNumber(summary.count)}
          note={`${formatNumber(summary.customerCount)} customer${summary.customerCount === 1 ? "" : "s"} owing`}
          tone={summary.count > 0 ? "warning" : "success"}
        />

        <SummaryCard
          label="Money owed"
          value={formatMoney(summary.totalBalance)}
          note="Total remaining balance"
          tone={summary.totalBalance > 0 ? "warning" : "success"}
        />

        <SummaryCard
         label="Overdue invoices"
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

      <section className="svx-dues-list-card">
        <div className="svx-dues-toolbar">
          <div className="svx-dues-search">
            <SearchIcon />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search customer, phone, receipt, cashier, or branch..."
            />
          </div>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All dues</option>
            <option value="LATE">Late only</option>
            <option value="DUE_TODAY">Due today</option>
            <option value="DUE_SOON">Due soon</option>
            <option value="OPEN">Open, not late</option>
          </select>
        </div>

        {visibleRows.length === 0 ? (
          <EmptyState
            title="No dues found"
            text="Pay-later sales with unpaid balances will appear here. Try changing the search or filter."
            action={
              <Link to="/app/pos" className="svx-dues-button primary">
                Start sale
              </Link>
            }
          />
        ) : (
          <>
            <div className="svx-dues-table">
              <div className="svx-dues-table-head" aria-hidden="true">
                <span>Customer</span>
                <span>Receipt</span>
                <span>Follow-up</span>
                <span>Balance</span>
                <span>Actions</span>
              </div>

              <div className="svx-dues-rows">
                {visibleRows.map((sale) => (
                  <CustomerDueRow
                    key={sale.id}
                    sale={sale}
                    onOpen={(saleId) => navigate(`/app/pos/sales/${saleId}`)}
                    onPay={openPayModal}
                  />
                ))}
              </div>
            </div>

            <footer className="svx-dues-list-footer">
              <p>
                Showing {formatNumber(visibleRows.length)} of {formatNumber(filtered.length)} due
                {filtered.length === 1 ? "" : "s"}.
              </p>

              {hasMore ? (
                <button type="button" onClick={loadMore} className="svx-dues-button secondary">
                  Load 10 more
                </button>
              ) : (
                <span>End of list</span>
              )}
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
