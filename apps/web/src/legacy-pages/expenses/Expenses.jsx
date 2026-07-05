// frontend-stores/src/pages/expenses/Expenses.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  approveExpense,
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
} from "../../services/expensesApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./Expenses.css";

const CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "SALARY", label: "Salary" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((category) => [category.value, category.label]));

const PAID_FROM_OPTIONS = [
  {
    value: "CASH_DRAWER",
    label: "Cash drawer",
    help: "Cash drawer",
  },
  {
    value: "BANK",
    label: "Bank",
    help: "Bank payment",
  },
  {
    value: "MOMO",
    label: "MoMo",
    help: "MoMo payment",
  },
  {
    value: "OWNER_MONEY",
    label: "Owner money",
    help: "Owner paid",
  },
  {
    value: "OTHER",
    label: "Other",
    help: "Other source",
  },
];

const PAID_FROM_LABEL = Object.fromEntries(PAID_FROM_OPTIONS.map((option) => [option.value, option.label]));
const PAID_FROM_HELP = Object.fromEntries(PAID_FROM_OPTIONS.map((option) => [option.value, option.help]));

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

function moneySourceLabel(value) {
  const key = String(value || "CASH_DRAWER").toUpperCase();
  return PAID_FROM_LABEL[key] || "Cash drawer";
}

function moneySourceHelp(value) {
  const key = String(value || "CASH_DRAWER").toUpperCase();
  return PAID_FROM_HELP[key] || PAID_FROM_HELP.CASH_DRAWER;
}

function isCashDrawerExpense(expense) {
  return String(expense?.paidFrom || "CASH_DRAWER").toUpperCase() === "CASH_DRAWER";
}

function movementLabel(expense) {
  const status = String(expense?.status || "").toUpperCase();

  if (status !== "APPROVED") {
    if (isCashDrawerExpense(expense)) return "Needs open drawer";
    return "Waiting approval";
  }

  if (isCashDrawerExpense(expense)) {
    return expense?.cashDrawerMovementId ? "Drawer money out" : "Drawer movement missing";
  }

  return "Recorded money out";
}

function movementTone(expense) {
  const status = String(expense?.status || "").toUpperCase();

  if (status !== "APPROVED") {
    return isCashDrawerExpense(expense) ? "is-warning" : "is-pending";
  }
  if (isCashDrawerExpense(expense) && expense?.cashDrawerMovementId) return "is-primary";
  if (isCashDrawerExpense(expense) && !expense?.cashDrawerMovementId) return "is-danger";
  return "is-neutral";
}

function expenseErrorMessage(error) {
  const code = String(error?.code || error?.data?.code || "");

  if (code === "CASH_DRAWER_NOT_OPEN") {
    return "Open the cash drawer before approving a cash-paid expense.";
  }

  if (code === "CASH_DRAWER_CASH_NOT_ENOUGH") {
    const expected = error?.expectedCash || error?.data?.expectedCash;
    const required = error?.requiredCash || error?.data?.requiredCash;

    if (expected != null && required != null) {
      return `Cash drawer is not enough. Expected cash: ${formatMoney(expected)}. Needed: ${formatMoney(required)}.`;
    }

    return "Cash drawer does not have enough expected cash for this expense.";
  }

  return error?.message || "Expense action failed.";
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

  if (code && name) return `${code} ${name}`;
  if (name) return name;
  if (code) return code;

  return "current store location";
}

function storeLocationNameFromExpense(expense) {
  const location = expense?.branch || expense?.storeLocation || {};
  const code = cleanString(location?.code);
  const name = cleanString(location?.name);

  if (code && name) return `${code} ${name}`;
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
  return "svx-expense-card";
}

function raisedPanel() {
  return "svx-expense-panel";
}

function softPanel() {
  return "svx-expense-panel";
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
      ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
      : "bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:opacity-90"
  );
}

function SkeletonBlock({ className = "" }) {
  return <div className={cx("animate-pulse rounded-[20px] bg-[var(--color-surface-2)]", className)} />;
}

function StatusBadge({ status }) {
  const approved = String(status || "").toUpperCase() === "APPROVED";

  return (
    <span className={cx("svx-expense-badge", approved ? "is-approved" : "is-pending")}>
      {approved ? "Approved" : "Pending"}
    </span>
  );
}

function CategoryPill({ category }) {
  return (
    <span className="svx-expense-pill">
      {CATEGORY_LABEL[category] || category || "Other"}
    </span>
  );
}

function MoneySourcePill({ paidFrom }) {
  return (
    <span className="svx-expense-pill is-source">
      {moneySourceLabel(paidFrom)}
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

function SummaryCard({ label, value, note }) {
  return (
    <article className={cx(pageCard(), "p-4 sm:p-5")}>
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className="mt-3 text-[1.45rem] font-black leading-tight tracking-[-0.02em] text-[var(--color-text)]">
        {value}
      </div>
      {note ? <div className="mt-2 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">{note}</div> : null}
    </article>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className={cx(softPanel(), "px-4 py-12 text-center sm:py-14")}>
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--color-surface-2)]">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="6" width="18" height="12" rx="2.5" />
          <path d="M7 12h10M12 9v6" strokeLinecap="round" />
        </svg>
      </div>

      <div className={cx("text-base font-bold", strongText())}>No expenses found</div>
      <div className={cx("mx-auto mt-2 max-w-md text-sm leading-6", mutedText())}>
        Log expenses, approve verified records, and track where the money came from.
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

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
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

function ExpenseCard({ expense, onApprove, onEdit, onDelete, approveBusy, deleteBusy, index, showStoreLocation }) {
  const isApproved = String(expense.status || "").toUpperCase() === "APPROVED";
  const storeLocationName = storeLocationNameFromExpense(expense);

  return (
    <div
      className={cx(pageCard(), "relative overflow-hidden p-4 sm:p-5")}
    >

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
                <MoneySourcePill paidFrom={expense.paidFrom} />
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
                  onClick={() => onEdit(expense)}
                  className={secondaryBtn()}
                  title="Edit this pending expense"
                >
                  Edit
                </button>
              ) : null}

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
                Paid from
              </div>
              <div className={cx("mt-2.5 text-sm font-bold", strongText())}>
                {moneySourceLabel(expense.paidFrom)}
              </div>
              {expense.paymentReference ? (
                <div className={cx("mt-0.5 truncate text-xs", mutedText())}>{expense.paymentReference}</div>
              ) : null}
            </div>

            <div className={cx(raisedPanel(), "svx-expense-card-movement p-3.5")}>
              <div className={cx("text-[10px] font-semibold uppercase tracking-[0.18em]", softText())}>
                Money movement
              </div>
              <div className={cx("mt-2.5 svx-expense-movement", movementTone(expense))}>
                {movementLabel(expense)}
              </div>
              {expense.cashDrawerMovementId ? (
                <div className={cx("mt-0.5 truncate text-xs", mutedText())}>
                  {expense.cashDrawerMovementId}
                </div>
              ) : null}
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

            <div className={cx(raisedPanel(), "p-3.5")}>
              <div className={cx("text-[10px] font-semibold uppercase tracking-[0.18em]", softText())}>
                {isApproved ? "Approved by" : "Awaiting"}
              </div>

              <div className={cx("mt-2.5 text-sm font-bold", strongText())}>
                {isApproved ? expense.approvedBy?.name || "Owner" : "Owner approval"}
              </div>

              {isApproved && expense.approvedAt ? (
                <div className={cx("mt-0.5 text-xs", mutedText())}>{formatDate(expense.approvedAt)}</div>
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

function ExpenseTable({
  expenses,
  onApprove,
  onEdit,
  onDelete,
  approveBusy,
  deleteBusy,
  deleteTarget,
  openActionMenuId,
  setOpenActionMenuId,
}) {
  const [actionMenuPosition, setActionMenuPosition] = useState(null);

  const activeExpense = useMemo(
    () => expenses.find((expense) => expense.id === openActionMenuId) || null,
    [expenses, openActionMenuId]
  );

  const activeExpenseIsApproved = String(activeExpense?.status || "").toUpperCase() === "APPROVED";

  function toggleActionMenu(event, expense) {
    event.stopPropagation();

    const expenseId = expense?.id;
    if (!expenseId) return;

    if (openActionMenuId === expenseId) {
      setOpenActionMenuId("");
      setActionMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const isApproved = String(expense?.status || "").toUpperCase() === "APPROVED";

    const menuWidth = 176;
    const menuHeight = isApproved ? 48 : 126;
    const gap = 4;
    const rowBorderLift = 18;
    const safePadding = 10;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < menuHeight + gap + safePadding && spaceAbove > menuHeight + gap + safePadding;

    const top = openUp
      ? rect.top - menuHeight - gap
      : rect.bottom + gap - rowBorderLift;
    const left = rect.right - menuWidth + 2;

    setActionMenuPosition({
      top: Math.max(safePadding, Math.min(top, window.innerHeight - menuHeight - safePadding)),
      left: Math.max(safePadding, Math.min(left, window.innerWidth - menuWidth - safePadding)),
      openUp,
    });
    setOpenActionMenuId(expenseId);
  }

  return (
    <>
      <table className="svx-expense-table w-full table-fixed">
      <thead>
        <tr>
          {["Expense", "Paid from", "Movement", "Status", "Amount", "Actions"].map((label) => (
            <th key={label} className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              {label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {expenses.map((expense) => {
          const isApproved = String(expense.status || "").toUpperCase() === "APPROVED";

          return (
            <tr key={expense.id} className="border-t border-[var(--color-border)]">
              <td className="px-5 py-4 align-middle">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-[var(--color-text)]">
                    {expense.title || "Untitled expense"}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text-muted)]">{formatDate(expense.createdAt)}</span>
                    <CategoryPill category={expense.category} />
                  </div>
                </div>
              </td>

              <td className="px-5 py-4 align-middle">
                <div className="truncate text-sm font-bold text-[var(--color-text)]">
                  {moneySourceLabel(expense.paidFrom)}
                </div>
                {expense.paymentReference ? (
                  <div className="mt-1 truncate text-xs font-semibold text-[var(--color-text-muted)]">
                    {expense.paymentReference}
                  </div>
                ) : null}
              </td>

              <td className="px-5 py-4 align-middle">
                <span className={cx("svx-expense-movement", movementTone(expense))}>
                  {movementLabel(expense)}
                </span>
              </td>

              <td className="px-5 py-4 align-middle">
                <StatusBadge status={expense.status} />
              </td>

              <td className="px-5 py-4 align-middle">
                <div className="truncate text-sm font-black text-[var(--color-text)]">
                  {formatMoney(expense.amount)}
                </div>
              </td>

              <td className="px-5 py-4 align-middle">
                <div className="svx-expense-action-menu-wrap">
                  <button
                    type="button"
                    className={cx("svx-expense-kebab", openActionMenuId === expense.id && "is-open")}
                    aria-label="Expense actions"
                    aria-expanded={openActionMenuId === expense.id}
                    onClick={(event) => toggleActionMenu(event, expense)}
                  >
                    <span />
                    <span />
                    <span />
                  </button>


                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
      </table>

      {activeExpense && actionMenuPosition
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close expense actions"
                className="svx-expense-action-backdrop"
                onClick={() => {
                  setOpenActionMenuId("");
                  setActionMenuPosition(null);
                }}
              />

              <div
                className={cx("svx-expense-action-menu", actionMenuPosition.openUp && "opens-up")}
                style={{
                  top: `${actionMenuPosition.top}px`,
                  left: `${actionMenuPosition.left}px`,
                }}
              >
                {!activeExpenseIsApproved ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionMenuId("");
                      setActionMenuPosition(null);
                      onEdit(activeExpense);
                    }}
                  >
                    Edit expense
                  </button>
                ) : null}

                {!activeExpenseIsApproved ? (
                  <button
                    type="button"
                    disabled={approveBusy === activeExpense.id}
                    onClick={() => {
                      setOpenActionMenuId("");
                      setActionMenuPosition(null);
                      onApprove(activeExpense.id);
                    }}
                  >
                    {approveBusy === activeExpense.id ? "Approving..." : "Approve"}
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={activeExpenseIsApproved || (deleteBusy && deleteTarget?.id === activeExpense.id)}
                  onClick={() => {
                    setOpenActionMenuId("");
                    setActionMenuPosition(null);
                    onDelete(activeExpense);
                  }}
                  className="is-danger"
                >
                  Delete
                </button>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}

const EMPTY_FORM = {
  title: "",
  category: "RENT",
  amount: "",
  paidFrom: "CASH_DRAWER",
  paymentReference: "",
  notes: "",
};

function CreateExpenseForm({ onCreated, onUpdated, onCancel, activeStoreLocationLabel, expense = null }) {
  const [form, setForm] = useState(() =>
    expense
      ? {
          title: expense.title || "",
          category: expense.category || "RENT",
          amount: expense.amount == null ? "" : String(expense.amount),
          paidFrom: expense.paidFrom || "CASH_DRAWER",
          paymentReference: expense.paymentReference || "",
          notes: expense.notes || "",
        }
      : EMPTY_FORM
  );
  const [busy, setBusy] = useState(false);
  const isEditMode = Boolean(expense?.id);

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
      const payload = {
        title,
        category: form.category,
        amount,
        paidFrom: form.paidFrom,
        paymentReference: cleanString(form.paymentReference) || undefined,
        notes: cleanString(form.notes) || undefined,
      };

      if (isEditMode) {
        const updated = await updateExpense(expense.id, payload);
        toast.success("Expense updated");
        onUpdated(updated);
      } else {
        const created = await createExpense(payload);
        toast.success("Expense logged");
        setForm(EMPTY_FORM);
        onCreated(created);
      }
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "expense-create-blocked" })) return;

      toast.error(error?.message || (isEditMode ? "Failed to update expense" : "Failed to log expense"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cx(pageCard(), "p-5 sm:p-6")}>
      <div className={cx("text-base font-bold", strongText())}>{isEditMode ? "Edit expense" : "Log new expense"}</div>
      <p className={cx("mt-1.5 text-sm leading-6", mutedText())}>
        {isEditMode ? "Only pending expenses can be edited." : "This expense will be saved under"}{" "}
        {!isEditMode ? <span className={cx("font-semibold", strongText())}>{activeStoreLocationLabel}</span> : null}
        {!isEditMode ? " and will stay pending until approved." : ""}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>
              Paid from <span className="text-[var(--color-danger)]">*</span>
            </label>
            <select
              className={inputClass()}
              value={form.paidFrom}
              onChange={(event) => setField("paidFrom", event.target.value)}
              required
            >
              {PAID_FROM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className={cx("mt-2 text-xs leading-5", mutedText())}>{moneySourceHelp(form.paidFrom)}</div>
          </div>

          <div>
            <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>
              Payment reference <span className={cx("font-normal", mutedText())}>(optional)</span>
            </label>
            <input
              className={inputClass()}
              placeholder="MoMo code, bank slip, receipt number..."
              value={form.paymentReference}
              onChange={(event) => setField("paymentReference", event.target.value)}
            />
            <div className={cx("mt-2 text-xs leading-5", mutedText())}>
              Add only when available.
            </div>
          </div>
        </div>

        <div className={cx("rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-xs leading-5", mutedText())}>
          {form.paidFrom === "CASH_DRAWER"
            ? "Approval will record drawer money out."
            : "Approval records the expense without changing drawer cash."}
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
            {busy ? (isEditMode ? "Saving…" : "Logging…") : isEditMode ? "Save changes" : "Log expense"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ExpenseFormModal({ open, expense, onCreated, onUpdated, onClose, activeStoreLocationLabel }) {
  if (!open) return null;

  return (
    <div className="svx-expense-modal-backdrop">
      <div className="svx-expense-modal-panel">
        <CreateExpenseForm
          key={expense?.id || "new-expense"}
          expense={expense}
          onCreated={onCreated}
          onUpdated={onUpdated}
          onCancel={onClose}
          activeStoreLocationLabel={activeStoreLocationLabel}
        />
      </div>
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
          <div className={cx("mt-2 space-y-1 text-xs", mutedText())}>
            <div>{CATEGORY_LABEL[expense.category] || expense.category || "Other"}</div>
            <div>{storeLocationNameFromExpense(expense)}</div>
            <div>Logged {relativeTime(expense.createdAt)}</div>
            <div>Paid from {moneySourceLabel(expense.paidFrom)}</div>
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
  const [editingExpense, setEditingExpense] = useState(null);

  const [approveBusy, setApproveBusy] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState("");

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
          expense.paidFrom,
          moneySourceLabel(expense.paidFrom),
          expense.paymentReference,
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

    const cashDrawerApprovedAmount = expenses
      .filter((expense) => expense.status === "APPROVED" && isCashDrawerExpense(expense))
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
      cashDrawerApprovedAmount,
      storeLocationCount: storeLocationNames.size,
    };
  }, [expenses]);

  async function handleScopeChange(nextScopeMode) {
    setScopeMode(nextScopeMode);
    setShowForm(false);
    await load({ nextScopeMode, silent: false });
  }

  async function handleApprove(id) {
    setOpenActionMenuId("");
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
      toast.error(expenseErrorMessage(error));
    } finally {
      setApproveBusy("");
    }
  }

  function openDelete(expense) {
    setOpenActionMenuId("");
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
    setEditingExpense(null);
  }

  function openCreateForm() {
    setEditingExpense(null);
    setShowForm(true);
  }

  function openEditForm(expense) {
    setOpenActionMenuId("");
    setEditingExpense(expense);
    setShowForm(true);
  }

  function handleUpdated(updated) {
    setExpenses((prev) => prev.map((expense) => (expense.id === updated.id ? { ...expense, ...updated } : expense)));
    setShowForm(false);
    setEditingExpense(null);
  }

  function closeExpenseForm() {
    setShowForm(false);
    setEditingExpense(null);
  }

  return (
    <div className="svx-expenses-page space-y-6">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionHeading
            eyebrow="Finance"
            title="Expenses"
            subtitle="Track money out, approval, branch, and payment source in one clean owner view."
          />

          <div className="flex flex-wrap gap-2">
            <AsyncButton loading={loading} onClick={() => load({ silent: false })} className={secondaryBtn()}>
              Refresh
            </AsyncButton>

            <button type="button" onClick={openCreateForm} className={primaryBtn()}>
              Log expense
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

      <ExpenseFormModal
        open={showForm}
        expense={editingExpense}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        onClose={closeExpenseForm}
        activeStoreLocationLabel={activeStoreLocationLabel}
      />

      <div className="svx-expense-ledger-layout grid grid-cols-1 gap-6">

        <section className={cx(pageCard(), "svx-expense-ledger overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className={cx("text-xl font-bold", strongText())}>Expense ledger</div>
                <div className={cx("mt-1.5 text-sm leading-6", mutedText())}>
                  {usingAllStoreLocations
                    ? "Review money out across store locations."
                    : "Review money out before it becomes a financial record."}
                </div>
              </div>

              {!loading ? (
                <span className="inline-flex items-center self-start rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                  {formatNumber(visible.length)} of {formatNumber(filtered.length)}
                </span>
              ) : null}
            </div>

            <div className="svx-expense-toolbar mt-5">
              <div className="svx-expense-control">
                <div className={cx("mb-2 text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                  Store location
                </div>
                <div className="svx-expense-segment">
                  <button
                    type="button"
                    onClick={() => handleScopeChange("CURRENT")}
                    className={cx("svx-expense-segment-button", scopeMode === "CURRENT" && "is-active")}
                  >
                    Current
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScopeChange("ALL")}
                    className={cx("svx-expense-segment-button", scopeMode === "ALL" && "is-active")}
                  >
                    All locations
                  </button>
                </div>
                <div className={cx("mt-2 truncate text-xs font-semibold", mutedText())}>
                  {activeStoreLocationLabel}
                </div>
              </div>

              <div className="svx-expense-control">
                <label className={cx("mb-2 block text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                  Search
                </label>
                <input
                  className={inputClass()}
                  placeholder="Title, category, staff, location..."
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                />
              </div>

              <div className="svx-expense-control">
                <div className={cx("mb-2 text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                  Status
                </div>
                <div className="svx-expense-segment is-three">
                  {[
                    { value: "ALL", label: "All" },
                    { value: "PENDING", label: "Pending" },
                    { value: "APPROVED", label: "Approved" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilterStatus(option.value)}
                      className={cx("svx-expense-segment-button", filterStatus === option.value && "is-active")}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="svx-expense-count-card">
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                  Showing
                </div>
                <div className={cx("mt-2 text-base font-black", strongText())}>
                  {formatNumber(filtered.length)} expense{filtered.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <ListSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState onAdd={expenses.length === 0 ? openCreateForm : null} />
            ) : (
              <>
                <div className="hidden overflow-hidden lg:block">
                  <ExpenseTable
                    expenses={visible}
                    onApprove={handleApprove}
                    onEdit={openEditForm}
                    onDelete={openDelete}
                    approveBusy={approveBusy}
                    deleteBusy={deleteBusy}
                    deleteTarget={deleteTarget}
                    openActionMenuId={openActionMenuId}
                    setOpenActionMenuId={setOpenActionMenuId}
                  />
                </div>

                <div className="space-y-3 lg:hidden">
                  {visible.map((expense, index) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      index={index}
                      onApprove={handleApprove}
                      onEdit={openEditForm}
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