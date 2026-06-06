// frontend-stores/src/pages/expenses/Expenses.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  approveExpense,
  createExpense,
  deleteExpense,
  getExpenses,
} from "../../services/expensesApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

const CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "SALARY", label: "Salary" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((category) => [category.value, category.label]));

const PAGE_SIZE = 15;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function cleanString(value) {
  const text = String(value || "").trim();
  return text || "";
}

function formatMoney(value) {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `Rwf ${safeAmount.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function formatNumber(value) {
  const number = Number(value || 0);

  return Number.isFinite(number)
    ? number.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : "0";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function relativeTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatDate(value);
}

function activeStoreLocationNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "current store location";
}

function storeLocationNameFromExpense(expense) {
  const location = expense?.branch || expense?.storeLocation || {};
  const code = cleanString(location?.code);
  const name = cleanString(location?.name);

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "Current store location";
}

function storeLocationScopeFromResponse(data) {
  return data?.storeLocationScope || data?.branchScope || null;
}

function isAllStoreLocationsScope(scope) {
  const mode = String(scope?.mode || "").toUpperCase();
  return mode === "ALL_STORE_LOCATIONS" || mode === "ALL_BRANCHES";
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

function raisedPanel() {
  return "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]";
}

function softPanel() {
  return "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "app-input";
}

function buttonBase(disabled = false) {
  return cx(
    "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition",
    disabled && "cursor-not-allowed opacity-60"
  );
}

function primaryBtn(disabled = false) {
  return cx(buttonBase(disabled), "bg-[var(--color-primary)] text-white hover:opacity-95");
}

function secondaryBtn(disabled = false) {
  return cx(
    buttonBase(disabled),
    "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:opacity-90"
  );
}

function dangerBtn(disabled = false) {
  return cx(
    buttonBase(disabled),
    disabled
      ? "bg-[rgba(219,80,74,0.08)] text-[var(--color-danger)]"
      : "bg-[rgba(219,80,74,0.12)] text-[var(--color-danger)] hover:opacity-90"
  );
}

function successBtn(disabled = false) {
  return cx(
    buttonBase(disabled),
    disabled
      ? "bg-[rgba(21,128,61,0.08)] text-[#15803d]"
      : "bg-[#dcfce7] text-[#15803d] hover:opacity-90"
  );
}

function SkeletonBlock({ className = "" }) {
  return <div className={cx("animate-pulse rounded-[20px] bg-[var(--color-surface-2)]", className)} />;
}

function StatusBadge({ status }) {
  const approved = String(status || "").toUpperCase() === "APPROVED";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
        approved ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fff1c9] text-[#b88900]"
      )}
    >
      {approved ? "Approved" : "Pending"}
    </span>
  );
}

function CategoryPill({ category }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
      {CATEGORY_LABEL[category] || category || "Other"}
    </span>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h1 className={cx("mt-3 text-[1.7rem] font-black tracking-tight sm:text-[2rem]", strongText())}>
        {title}
      </h1>

      {subtitle ? <p className={cx("mt-3 max-w-3xl text-sm leading-6", mutedText())}>{subtitle}</p> : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const iconTone =
    tone === "danger"
      ? "bg-[rgba(219,80,74,0.12)] text-[var(--color-danger)]"
      : tone === "warning"
        ? "bg-[#fff1c9] text-[#b88900]"
        : tone === "success"
          ? "bg-[#dcfce7] text-[#15803d]"
          : "bg-[#dff1ff] text-[#4aa8ff]";

  return (
    <article className={cx(pageCard(), "p-5 sm:p-6")}>
      <div className="flex items-start gap-4 sm:gap-5">
        <div
          className={cx(
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] shadow-[var(--shadow-soft)]",
            iconTone
          )}
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.9">
            <rect x="3" y="6" width="18" height="12" rx="2.5" />
            <path d="M7 12h4M15 12h2M12 9v6" strokeLinecap="round" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className={cx("text-sm font-semibold", strongText())}>{label}</div>
          <div className={cx("mt-2 text-[1.7rem] font-black leading-tight tracking-[-0.02em]", strongText())}>
            {value}
          </div>
          {note ? <div className={cx("mt-2 text-sm leading-6", mutedText())}>{note}</div> : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className={cx(softPanel(), "px-4 py-16 text-center")}>
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="6" width="18" height="12" rx="2.5" />
          <path d="M7 12h10M12 9v6" strokeLinecap="round" />
        </svg>
      </div>

      <div className={cx("text-base font-bold", strongText())}>No expenses found</div>
      <div className={cx("mx-auto mt-2 max-w-md text-sm leading-6", mutedText())}>
        Log business expenses for the active store location, then approve only the ones that should become financial records.
      </div>

      {onAdd ? (
        <button type="button" onClick={onAdd} className={cx(primaryBtn(), "mt-5")}>
          Log first expense
        </button>
      ) : null}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={cx(pageCard(), "p-4 sm:p-5")}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBlock className="h-7 w-32 rounded-full" />
              <SkeletonBlock className="h-7 w-20 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
            </div>

            <div className="flex justify-end gap-2">
              <SkeletonBlock className="h-11 w-24 rounded-2xl" />
              <SkeletonBlock className="h-11 w-24 rounded-2xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpenseCard({ expense, onApprove, onDelete, approveBusy, deleteBusy, index, showStoreLocation }) {
  const isApproved = String(expense.status || "").toUpperCase() === "APPROVED";
  const storeLocationName = storeLocationNameFromExpense(expense);

  return (
    <div
      className={cx(
        pageCard(),
        "relative overflow-hidden p-4 sm:p-5",
        index % 2 === 0 ? "bg-[var(--color-card)]" : "bg-[var(--color-surface)]"
      )}
    >
      <div
        className={cx(
          "absolute left-0 top-0 h-full w-1.5 opacity-80",
          isApproved ? "bg-[#15803d]" : "bg-[#b88900]"
        )}
      />

      <div className="absolute inset-x-0 top-0 h-px bg-[var(--color-border)]" />

      <div className="pl-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cx("text-[1.1rem] font-black tracking-tight", strongText())}>
                  {formatMoney(expense.amount)}
                </span>
                <StatusBadge status={expense.status} />
                <CategoryPill category={expense.category} />
              </div>

              <div className={cx("mt-1.5 text-sm font-semibold", strongText())}>
                {expense.title || "Untitled expense"}
              </div>

              {expense.notes ? (
                <div className={cx("mt-1 text-xs leading-5", mutedText())}>{expense.notes}</div>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              {!isApproved ? (
                <button
                  type="button"
                  disabled={approveBusy}
                  onClick={() => onApprove(expense.id)}
                  className={successBtn(approveBusy)}
                  title="Approve this expense and keep it as a financial record"
                >
                  {approveBusy ? "Approving…" : "Approve"}
                </button>
              ) : null}

              <button
                type="button"
                disabled={isApproved || deleteBusy}
                onClick={() => onDelete(expense)}
                className={dangerBtn(isApproved || deleteBusy)}
                title={isApproved ? "Approved expenses cannot be deleted" : "Delete this pending expense"}
              >
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={cx(raisedPanel(), "p-3.5")}>
              <div className={cx("text-[10px] font-semibold uppercase tracking-[0.18em]", softText())}>
                Logged by
              </div>
              <div className={cx("mt-2.5 text-sm font-bold leading-snug", strongText())}>
                {expense.createdBy?.name || "—"}
              </div>
              <div className={cx("mt-0.5 text-xs", mutedText())}>{relativeTime(expense.createdAt)}</div>
            </div>

            <div className={cx(raisedPanel(), "p-3.5")}>
              <div className={cx("text-[10px] font-semibold uppercase tracking-[0.18em]", softText())}>
                Date
              </div>
              <div className={cx("mt-2.5 text-sm font-bold", strongText())}>
                {formatDate(expense.createdAt)}
              </div>
            </div>

            <div className={cx(raisedPanel(), "p-3.5")}>
              <div className={cx("text-[10px] font-semibold uppercase tracking-[0.18em]", softText())}>
                {showStoreLocation ? "Store location" : "Category"}
              </div>
              <div className={cx("mt-2.5 text-sm font-bold", strongText())}>
                {showStoreLocation ? storeLocationName : CATEGORY_LABEL[expense.category] || expense.category || "Other"}
              </div>
            </div>

            <div
              className={cx(
                "rounded-[22px] border p-3.5 shadow-[var(--shadow-soft)]",
                isApproved ? "border-[#bbf7d0] bg-[#dcfce7]" : "border-[#fde68a] bg-[#fff1c9]"
              )}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(15,23,42,0.62)]">
                {isApproved ? "Approved by" : "Awaiting"}
              </div>

              <div className={cx("mt-2.5 text-sm font-bold", isApproved ? "text-[#166534]" : "text-[#92400e]")}>
                {isApproved ? expense.approvedBy?.name || "Owner" : "Owner approval"}
              </div>

              {isApproved && expense.approvedAt ? (
                <div className="mt-0.5 text-xs text-[#166534]">{formatDate(expense.approvedAt)}</div>
              ) : null}
            </div>
          </div>

          {showStoreLocation ? (
            <div className={cx("rounded-[18px] bg-[var(--color-surface-2)] px-4 py-3 text-xs leading-5", mutedText())}>
              This expense belongs to <span className={cx("font-semibold", strongText())}>{storeLocationName}</span>.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  title: "",
  category: "RENT",
  amount: "",
  notes: "",
};

function CreateExpenseForm({ onCreated, onCancel, activeStoreLocationLabel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const title = cleanString(form.title);
    if (!title) {
      toast.error("Expense title is required");
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid positive amount");
      return;
    }

    setBusy(true);

    try {
      const expense = await createExpense({
        title,
        category: form.category,
        amount,
        notes: cleanString(form.notes) || undefined,
      });

      toast.success("Expense logged");
      setForm(EMPTY_FORM);
      onCreated(expense);
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "expense-create-blocked" })) return;

      toast.error(error?.message || "Failed to log expense");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cx(pageCard(), "p-5 sm:p-6")}>
      <div className={cx("text-base font-bold", strongText())}>Log new expense</div>
      <p className={cx("mt-1.5 text-sm leading-6", mutedText())}>
        This expense will be saved under{" "}
        <span className={cx("font-semibold", strongText())}>{activeStoreLocationLabel}</span> and will stay pending until approved.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>
            Title <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            className={inputClass()}
            placeholder="Example: Monthly electricity bill"
            value={form.title}
            onChange={(event) => setField("title", event.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>
              Category <span className="text-[var(--color-danger)]">*</span>
            </label>
            <select
              className={inputClass()}
              value={form.category}
              onChange={(event) => setField("category", event.target.value)}
              required
            >
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>
              Amount (Rwf) <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="any"
              className={inputClass()}
              placeholder="0"
              value={form.amount}
              onChange={(event) => setField("amount", event.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>
            Notes <span className={cx("font-normal", mutedText())}>(optional)</span>
          </label>
          <textarea
            className="min-h-[92px] w-full resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)]"
            placeholder="Add receipt reference, reason, or supporting detail..."
            value={form.notes}
            onChange={(event) => setField("notes", event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {onCancel ? (
            <button type="button" disabled={busy} onClick={onCancel} className={secondaryBtn(busy)}>
              Cancel
            </button>
          ) : null}

          <button type="submit" disabled={busy} className={primaryBtn(busy)}>
            {busy ? "Logging…" : "Log expense"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteConfirmDialog({ expense, busy, onConfirm, onClose }) {
  if (!expense) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
      <div className={cx(pageCard(), "w-full max-w-md p-5 sm:p-6")}>
        <div className={cx("text-lg font-bold", strongText())}>Delete expense?</div>

        <div className={cx("mt-3 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4")}>
          <div className={cx("text-base font-black", strongText())}>{formatMoney(expense.amount)}</div>
          <div className={cx("mt-1 text-sm font-semibold", strongText())}>{expense.title}</div>
          <div className={cx("mt-1 text-xs", mutedText())}>
            {CATEGORY_LABEL[expense.category] || expense.category || "Other"} · {storeLocationNameFromExpense(expense)} · logged{" "}
            {relativeTime(expense.createdAt)}
          </div>
        </div>

        <p className={cx("mt-4 text-sm leading-6", mutedText())}>
          This permanently removes the pending expense. Approved expenses cannot be deleted because they are financial records.
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className={secondaryBtn(busy)}>
            Cancel
          </button>

          <button type="button" disabled={busy} onClick={onConfirm} className={dangerBtn(busy)}>
            {busy ? "Deleting…" : "Delete expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [storeLocationScope, setStoreLocationScope] = useState(null);

  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [scopeMode, setScopeMode] = useState("CURRENT");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showForm, setShowForm] = useState(false);

  const [approveBusy, setApproveBusy] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [activeStoreLocationLabel, setActiveStoreLocationLabel] = useState(() =>
    activeStoreLocationNameFromStorage()
  );

  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    function onStoreLocationChanged() {
      setActiveStoreLocationLabel(activeStoreLocationNameFromStorage());
      setScopeMode("CURRENT");
      setShowForm(false);
      void load({ nextScopeMode: "CURRENT" });
    }

    window.addEventListener("storvex:branch-changed", onStoreLocationChanged);
    window.addEventListener("storvex:workspace-refreshed", onStoreLocationChanged);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("storvex:branch-changed", onStoreLocationChanged);
      window.removeEventListener("storvex:workspace-refreshed", onStoreLocationChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load({ nextScopeMode = scopeMode, silent = false } = {}) {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (!silent) setLoading(true);

    try {
      const data = await getExpenses({
        allStoreLocations: nextScopeMode === "ALL",
      });

      if (!mountedRef.current || requestRef.current !== requestId) return;

      const list = Array.isArray(data?.expenses) ? data.expenses : Array.isArray(data) ? data : [];

      setExpenses(list);
      setStoreLocationScope(storeLocationScopeFromResponse(data));
      setVisibleCount(PAGE_SIZE);
      setActiveStoreLocationLabel(activeStoreLocationNameFromStorage());
    } catch (error) {
      if (!mountedRef.current || requestRef.current !== requestId) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "expenses-load-blocked" })) {
        toast.error(error?.message || "Failed to load expenses");
      }

      setExpenses([]);
      setStoreLocationScope(null);

      if (nextScopeMode === "ALL") {
        setScopeMode("CURRENT");
      }
    } finally {
      if (!mountedRef.current || requestRef.current !== requestId) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usingAllStoreLocations = scopeMode === "ALL" || isAllStoreLocationsScope(storeLocationScope);

  const filtered = useMemo(() => {
    let list = expenses;

    if (filterStatus !== "ALL") {
      list = list.filter((expense) => String(expense.status || "").toUpperCase() === filterStatus);
    }

    const search = q.trim().toLowerCase();
    if (search) {
      list = list.filter((expense) => {
        const haystack = [
          expense.title,
          expense.category,
          CATEGORY_LABEL[expense.category],
          expense.createdBy?.name,
          expense.approvedBy?.name,
          expense.notes,
          storeLocationNameFromExpense(expense),
          expense.status,
        ]
          .map((item) => String(item || "").toLowerCase())
          .join(" ");

        return haystack.includes(search);
      });
    }

    return list;
  }, [expenses, q, filterStatus]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, filterStatus, scopeMode]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const summary = useMemo(() => {
    const total = expenses.length;
    const pending = expenses.filter((expense) => expense.status === "PENDING").length;
    const approved = expenses.filter((expense) => expense.status === "APPROVED").length;
    const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const approvedAmount = expenses
      .filter((expense) => expense.status === "APPROVED")
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const storeLocationNames = new Set(
      expenses.map((expense) => storeLocationNameFromExpense(expense)).filter(Boolean)
    );

    return {
      total,
      pending,
      approved,
      totalAmount,
      approvedAmount,
      storeLocationCount: storeLocationNames.size,
    };
  }, [expenses]);

  async function handleScopeChange(nextScopeMode) {
    setScopeMode(nextScopeMode);
    setShowForm(false);
    await load({ nextScopeMode, silent: false });
  }

  async function handleApprove(id) {
    setApproveBusy(id);

    try {
      const updated = await approveExpense(id, {
        allStoreLocations: scopeMode === "ALL",
      });

      setExpenses((prev) =>
        prev.map((expense) =>
          expense.id === id
            ? {
                ...expense,
                ...updated,
                status: updated?.status || "APPROVED",
                approvedAt: updated?.approvedAt || new Date().toISOString(),
                approvedBy: updated?.approvedBy || expense.approvedBy,
              }
            : expense
        )
      );

      toast.success("Expense approved");
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "expense-approve-blocked" })) return;
      toast.error(error?.message || "Failed to approve expense");
    } finally {
      setApproveBusy("");
    }
  }

  function openDelete(expense) {
    setDeleteTarget(expense);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleteBusy(true);

    try {
      await deleteExpense(deleteTarget.id, {
        allStoreLocations: scopeMode === "ALL",
      });

      setExpenses((prev) => prev.filter((expense) => expense.id !== deleteTarget.id));
      toast.success("Expense deleted");
      setDeleteTarget(null);
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "expense-delete-blocked" })) return;
      toast.error(error?.message || "Failed to delete expense");
    } finally {
      setDeleteBusy(false);
    }
  }

  function handleCreated(expense) {
    setExpenses((prev) => [expense, ...prev]);
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionHeading
            eyebrow="Finance"
            title="Expenses"
            subtitle="Log, review, and approve business cash outflows by store location. Pending expenses need approval before they become permanent financial records."
          />

          <div className="flex flex-wrap gap-2">
            <AsyncButton loading={loading} onClick={() => load({ silent: false })} className={secondaryBtn()}>
              Refresh
            </AsyncButton>

            <button type="button" onClick={() => setShowForm((prev) => !prev)} className={primaryBtn()}>
              {showForm ? "Close form" : "Log expense"}
            </button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total logged" value={formatNumber(summary.total)} note="Expense entries loaded" />
          <SummaryCard label="Pending approval" value={formatNumber(summary.pending)} note="Waiting for review" tone="warning" />
          <SummaryCard label="Approved" value={formatNumber(summary.approved)} note="Confirmed records" tone="success" />
          <SummaryCard label="Approved total" value={formatMoney(summary.approvedAmount)} note="Confirmed money out" tone="danger" />
        </section>
      </section>

      {showForm ? (
        <CreateExpenseForm
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
          activeStoreLocationLabel={activeStoreLocationLabel}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={cx(pageCard(), "h-fit p-5 sm:p-6")}>
          <div className={cx("text-base font-bold", strongText())}>Filter expenses</div>

          <div className="mt-4 space-y-4">
            <div className={cx(softPanel(), "p-4")}>
              <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                Store location view
              </div>

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => handleScopeChange("CURRENT")}
                  className={cx(
                    "rounded-2xl border px-4 py-2.5 text-left text-sm font-semibold transition",
                    scopeMode === "CURRENT"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:opacity-80"
                  )}
                >
                  Current store location
                </button>

                <button
                  type="button"
                  onClick={() => handleScopeChange("ALL")}
                  className={cx(
                    "rounded-2xl border px-4 py-2.5 text-left text-sm font-semibold transition",
                    scopeMode === "ALL"
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:opacity-80"
                  )}
                >
                  All store locations
                </button>
              </div>

              <div className={cx("mt-3 text-xs leading-5", mutedText())}>
                Current: <span className={cx("font-semibold", strongText())}>{activeStoreLocationLabel}</span>
              </div>
            </div>

            <div>
              <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>Search</label>
              <input
                className={inputClass()}
                placeholder="Title, category, staff, location..."
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </div>

            <div>
              <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>Status</label>
              <div className="flex flex-col gap-2">
                {[
                  { value: "ALL", label: "All expenses" },
                  { value: "PENDING", label: "Pending only" },
                  { value: "APPROVED", label: "Approved only" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilterStatus(option.value)}
                    className={cx(
                      "rounded-2xl border px-4 py-2.5 text-left text-sm font-semibold transition",
                      filterStatus === option.value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] hover:opacity-80"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={cx(softPanel(), "p-4")}>
              <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                Showing
              </div>
              <div className={cx("mt-2.5 text-lg font-bold", strongText())}>
                {formatNumber(filtered.length)} expense{filtered.length === 1 ? "" : "s"}
              </div>
              {usingAllStoreLocations ? (
                <div className={cx("mt-1 text-xs", mutedText())}>
                  Across {formatNumber(summary.storeLocationCount)} store location
                  {summary.storeLocationCount === 1 ? "" : "s"}.
                </div>
              ) : null}
            </div>

            <div className={cx(softPanel(), "p-4")}>
              <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                Approval rule
              </div>
              <div className={cx("mt-2.5 text-sm leading-6", mutedText())}>
                Only <span className={cx("font-semibold", strongText())}>pending</span> expenses can be deleted.
                Approved expenses are permanent financial records.
              </div>
            </div>
          </div>
        </aside>

        <section className={cx(pageCard(), "overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className={cx("text-xl font-bold", strongText())}>Expense ledger</div>
                <div className={cx("mt-1.5 text-sm leading-6", mutedText())}>
                  {usingAllStoreLocations
                    ? "Review expenses across store locations and approve only verified records."
                    : "Review expenses for the current store location before they become financial records."}
                </div>
              </div>

              {!loading ? (
                <span className="inline-flex items-center self-start rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                  {formatNumber(visible.length)} of {formatNumber(filtered.length)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <ListSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState onAdd={expenses.length === 0 ? () => setShowForm(true) : null} />
            ) : (
              <>
                <div className="space-y-3">
                  {visible.map((expense, index) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      index={index}
                      onApprove={handleApprove}
                      onDelete={openDelete}
                      approveBusy={approveBusy === expense.id}
                      deleteBusy={deleteBusy && deleteTarget?.id === expense.id}
                      showStoreLocation={usingAllStoreLocations}
                    />
                  ))}
                </div>

                <div className="mt-5 flex justify-center">
                  {hasMore ? (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                      className={secondaryBtn()}
                    >
                      Load more
                    </button>
                  ) : (
                    <div className={cx("text-sm", mutedText())}>
                      All {formatNumber(filtered.length)} expenses shown
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <DeleteConfirmDialog
        expense={deleteTarget}
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}