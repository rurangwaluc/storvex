import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  closeCashDrawer,
  getCashDrawerMovements,
  getCashDrawerSessions,
  getCashDrawerStatus,
  openCashDrawer,
  recordCashDrawerMovement,
} from "../../services/cashDrawerApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./CashDrawer.css";

const PAGE_SIZE = 10;
const RECENT_SESSION_INITIAL_COUNT = 5;
const RECENT_SESSION_INCREMENT = 5;
const RECENT_SESSION_MAX_COUNT = 15;

const MOVEMENT_TYPES = [
  {
    value: "IN",
    label: "Money in",
    text: "Use when cash is added to the drawer.",
  },
  {
    value: "OUT",
    label: "Money out",
    text: "Use when cash is removed from the drawer.",
  },
];

const MOVEMENT_REASONS = [
  {
    value: "DEPOSIT",
    label: "Customer deposit",
  },
  {
    value: "WITHDRAWAL",
    label: "Cash removed",
  },
  {
    value: "OTHER",
    label: "Other reason",
  },
];

const OPENING_REASONS = [
  {
    value: "NORMAL_FLOAT",
    label: "Normal starting cash",
  },
  {
    value: "OWNER_ADDED_STARTING_CASH",
    label: "Owner added starting cash",
  },
  {
    value: "CASH_LEFT_FROM_PREVIOUS_DAY",
    label: "Cash left from previous day",
  },
  {
    value: "CHANGE_MONEY_PREPARED",
    label: "Change money prepared",
  },
  {
    value: "CORRECTION_FROM_PREVIOUS_DRAWER",
    label: "Correction from previous drawer",
  },
  {
    value: "OTHER_OPENING_REASON",
    label: "Other opening reason",
  },
];

const SHORT_CASH_REASONS = [
  {
    value: "CUSTOMER_PAID_LESS_CASH",
    label: "Customer paid less cash",
  },
  {
    value: "CHANGE_SHORTAGE",
    label: "Change shortage",
  },
  {
    value: "CASH_REMOVED_NOT_RECORDED",
    label: "Cash removed but not recorded",
  },
  {
    value: "EXPENSE_PAID_NOT_RECORDED",
    label: "Expense paid but not recorded",
  },
  {
    value: "COUNTING_MISTAKE",
    label: "Counting mistake",
  },
  {
    value: "OTHER_SHORT_CASH_REASON",
    label: "Other short cash reason",
  },
];

const OVER_CASH_REASONS = [
  {
    value: "CUSTOMER_PAID_EXTRA_CASH",
    label: "Customer paid extra cash",
  },
  {
    value: "CASH_SALE_NOT_RECORDED",
    label: "Cash sale not recorded",
  },
  {
    value: "CASH_ADDED_NOT_RECORDED",
    label: "Cash added but not recorded",
  },
  {
    value: "CHANGE_NOT_GIVEN",
    label: "Change not given",
  },
  {
    value: "COUNTING_MISTAKE",
    label: "Counting mistake",
  },
  {
    value: "OTHER_OVER_CASH_REASON",
    label: "Other over cash reason",
  },
];

function closingReasonOptionsForDifference(difference) {
  const n = Number(difference || 0);

  if (n < 0) return SHORT_CASH_REASONS;
  if (n > 0) return OVER_CASH_REASONS;

  return [];
}

function defaultClosingReasonForDifference(difference) {
  return closingReasonOptionsForDifference(difference)[0]?.value || "";
}

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function normalizeDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
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

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function activeBranchNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

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

function dangerBtn() {
  return cx(
    buttonBase(),
    "bg-red-600 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function softDangerBtn() {
  return cx(
    buttonBase(),
    "bg-red-500/10 text-red-600 shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function branchLabelFromStatus(status) {
  const branch = status?.branch || {};
  const code = cleanString(branch.code);
  const name = cleanString(branch.name);

  if (name) return name;
  if (code) return code;

  return activeBranchNameFromStorage();
}

function openSessionFromStatus(status) {
  return status?.openSession || null;
}

function isDrawerOpen(status) {
  return Boolean(openSessionFromStatus(status)?.id);
}

function drawerOpenedBy(session) {
  return (
    cleanString(session?.openedByUser?.name) ||
    cleanString(session?.openedByName) ||
    cleanString(session?.openedBy) ||
    "—"
  );
}

function sessionOpeningCash(session) {
  return Number(session?.openingCash ?? session?.openingAmount ?? session?.openingBalance ?? 0);
}

function movementAmount(movement) {
  return Number(movement?.amount || 0);
}

function movementType(movement) {
  return String(movement?.type || movement?.direction || "").toUpperCase();
}

function movementReasonLabel(value) {
  const v = String(value || "").toUpperCase();
  return MOVEMENT_REASONS.find((item) => item.value === v)?.label || cleanString(value) || "Other";
}

function optionLabel(options, value, fallback = "Other") {
  const v = String(value || "").toUpperCase();
  return options.find((item) => item.value === v)?.label || cleanString(value) || fallback;
}

function signedMoney(value) {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n === 0) return formatMoney(0);

  return `${n > 0 ? "+" : "−"}${formatMoney(Math.abs(n))}`;
}

function varianceLabel(value) {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n === 0) return "Exact";
  if (n > 0) return "Cash over";
  return "Cash short";
}

function varianceTone(value) {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n === 0) return "success";
  return "warning";
}

function sessionStatus(session) {
  return session?.closedAt || session?.closed_at ? "Closed" : "Open";
}

function sessionStatusTone(session) {
  return sessionStatus(session) === "Open" ? "success" : "neutral";
}

function sessionExpectedCash(session) {
  return Number(
    session?.expectedCash ??
      session?.expected_cash ??
      session?.expectedCashAtClose ??
      session?.expected_cash_at_close ??
      sessionOpeningCash(session),
  );
}

function sessionCountedCash(session) {
  const value = session?.countedCash ?? session?.counted_cash;

  if (value === undefined || value === null || value === "") return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sessionCashDifference(session) {
  const value = session?.cashDifference ?? session?.cash_difference;

  if (value !== undefined && value !== null && value !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  const counted = sessionCountedCash(session);
  if (counted === null) return 0;

  return counted - sessionExpectedCash(session);
}

function sessionOpeningReasonLabel(session) {
  return optionLabel(
    OPENING_REASONS,
    session?.openingReason ?? session?.opening_reason,
    "Not recorded",
  );
}

function sessionClosingReasonLabel(session) {
  const difference = sessionCashDifference(session);
  const options = closingReasonOptionsForDifference(difference);

  return optionLabel(
    options,
    session?.closingReason ?? session?.closing_reason,
    difference === 0 ? "Not needed" : "Not recorded",
  );
}

function sessionOpeningNote(session) {
  return cleanString(session?.openingNote ?? session?.opening_note);
}

function sessionClosingExplanation(session) {
  return cleanString(
    session?.closingExplanation ??
      session?.closing_explanation ??
      session?.closeNote ??
      session?.close_note,
  );
}

function sessionTotalIn(session) {
  return Number(session?.totalIn ?? session?.total_in ?? 0);
}

function sessionTotalOut(session) {
  return Number(session?.totalOut ?? session?.total_out ?? 0);
}

function buildStructuredNote({ title, rows, note }) {
  const lines = [title];

  rows.forEach(([key, value]) => {
    const safeKey = cleanString(key);
    const safeValue = cleanString(value);

    if (safeKey && safeValue) lines.push(`${safeKey}: ${safeValue}`);
  });

  const cleanNote = cleanString(note);
  if (cleanNote) lines.push(`Note: ${cleanNote}`);

  return lines.join("\n");
}

function movementTone(movement) {
  const type = movementType(movement);
  if (type === "IN") return "success";
  if (type === "OUT") return "danger";
  return "neutral";
}

function movementTitle(movement) {
  const type = movementType(movement);
  if (type === "IN") return "Money in";
  if (type === "OUT") return "Money out";
  return "Cash movement";
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

function CashDrawerSkeleton() {
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
            <SkeletonBlock key={item} className="h-32 w-full rounded-[28px]" />
          ))}
        </div>
      </section>

      <section className={cx(pageCard(), "p-5")}>
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="mt-4 h-8 w-64 max-w-full rounded-[18px]" />
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {[1, 2].map((item) => (
            <SkeletonBlock key={item} className="h-44 w-full rounded-[28px]" />
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
    <article className={cx(pageCard(), "relative overflow-hidden p-4")}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[rgba(74,163,255,0.06)] blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[9px] font-black uppercase leading-4 tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <span className={cx("mt-1 h-2 w-2 shrink-0 rounded-full", dot)} />
        </div>

        <p className="mt-2 text-[15px] font-black leading-[1.08] tracking-[-0.025em] text-[var(--color-text)] sm:text-base">
          {value}
        </p>

        {note ? (
          <p className="mt-1.5 text-[10px] font-semibold leading-4 text-[var(--color-text-muted)]">
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

function EmptyState({ title, text }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[30px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center">
      <h3 className="text-lg font-black text-[var(--color-text)]">{title}</h3>

      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
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

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16v10H4z" />
      <path d="M8 12h.01M16 12h.01" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function MovementCard({ movement }) {
  const tone = movementTone(movement);
  const amount = movementAmount(movement);
  const note = cleanString(movement?.note);
  const createdBy =
    cleanString(movement?.createdByUser?.name) ||
    cleanString(movement?.createdByName) ||
    cleanString(movement?.createdBy) ||
    "";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-4 sm:p-5")}>
      <div
        className={cx(
          "absolute left-0 top-0 h-full w-1.5",
          tone === "danger"
            ? "bg-red-500"
            : tone === "success"
              ? "bg-emerald-500"
              : "bg-[var(--color-primary)]",
        )}
      />

      <div className="pl-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--color-text)]">
                {movementTitle(movement)}
              </h3>

              <StatusBadge tone={tone}>
                {movementType(movement) || "Movement"}
              </StatusBadge>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <InfoTile label="Reason" value={movementReasonLabel(movement?.reason)} />
              <InfoTile label="Recorded" value={formatDateTime(movement?.createdAt || movement?.created_at)} />
            </div>

            {note ? (
              <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                {note}
              </p>
            ) : null}
          </div>

          <div className="text-left lg:text-right">
            <p
              className={cx(
                "text-2xl font-black tracking-[-0.04em]",
                tone === "danger"
                  ? "text-red-600"
                  : tone === "success"
                    ? "text-emerald-600"
                    : "text-[var(--color-text)]",
              )}
            >
              {tone === "danger" ? "−" : tone === "success" ? "+" : ""}
              {formatMoney(amount)}
            </p>

            {createdBy ? (
              <p className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">
                By {createdBy}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function RecentSessionCard({ session }) {
  const status = sessionStatus(session);
  const difference = sessionCashDifference(session);
  const counted = sessionCountedCash(session);
  const closingExplanation = sessionClosingExplanation(session);
  const openingNote = sessionOpeningNote(session);

  return (
    <article className={cx(pageCard(), "overflow-hidden p-4 sm:p-5")}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--color-text)]">
              {formatDateTime(session?.openedAt || session?.opened_at)}
            </h3>

            <StatusBadge tone={sessionStatusTone(session)}>{status}</StatusBadge>

            {difference !== 0 ? (
              <StatusBadge tone="warning">{varianceLabel(difference)}</StatusBadge>
            ) : status === "Closed" ? (
              <StatusBadge tone="success">Exact</StatusBadge>
            ) : null}
          </div>

          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            Opening reason:{" "}
            <span className="font-black text-[var(--color-text)]">
              {sessionOpeningReasonLabel(session)}
            </span>
          </p>

          {openingNote ? (
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              {openingNote}
            </p>
          ) : null}

          {status === "Closed" && difference !== 0 ? (
            <div className="mt-3 rounded-[22px] bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-black text-amber-700">
                {sessionClosingReasonLabel(session)}
              </p>

              {closingExplanation ? (
                <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-amber-700/90">
                  {closingExplanation}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[440px]">
          <InfoTile label="Starting cash" value={formatMoney(sessionOpeningCash(session))} />
          <InfoTile label="Expected cash" value={formatMoney(sessionExpectedCash(session))} />
          <InfoTile
            label="Counted cash"
            value={counted === null ? "—" : formatMoney(counted)}
            tone={counted === null ? "neutral" : "success"}
          />
          <InfoTile
            label={varianceLabel(difference)}
            value={signedMoney(difference)}
            tone={varianceTone(difference)}
          />
          <InfoTile label="Money in" value={formatMoney(sessionTotalIn(session))} tone="success" />
          <InfoTile
            label="Money out"
            value={formatMoney(sessionTotalOut(session))}
            tone={sessionTotalOut(session) > 0 ? "danger" : "neutral"}
          />
        </div>
      </div>
    </article>
  );
}

function OpenDrawerModal({
  open,
  amount,
  setAmount,
  reason,
  setReason,
  note,
  setNote,
  saving,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-xl rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[0_30px_100px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Open drawer
            </p>

            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
              Start today’s cash drawer
            </h2>

            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Enter the cash available in the drawer before sales start.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Starting cash
            </span>
            <input
              inputMode="numeric"
              className={inputClass()}
              value={amount}
              onChange={(event) => setAmount(normalizeDigits(event.target.value))}
              placeholder="Example: 50000"
              disabled={saving}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Opening reason
            </span>
            <select
              className={inputClass()}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={saving}
            >
              {OPENING_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Opening note
            </span>
            <textarea
              className={textareaClass()}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Example: money left for customer change"
              disabled={saving}
            />
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className={secondaryBtn()}>
              Cancel
            </button>

            <AsyncButton loading={saving} onClick={onSubmit} className={successBtn()}>
              Open drawer
            </AsyncButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloseDrawerModal({
  open,
  expectedCash,
  countedCash,
  setCountedCash,
  varianceReason,
  setVarianceReason,
  note,
  setNote,
  saving,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  const counted = Number(countedCash || 0);
  const expected = Number(expectedCash || 0);
  const difference = counted - expected;
  const hasVariance = difference !== 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-2xl rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[0_30px_100px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Close drawer
            </p>

            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
              End today’s cash drawer
            </h2>

            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Count the physical cash and save the closing amount.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoTile label="Expected cash" value={formatMoney(expected)} />
          <InfoTile label="Counted cash" value={formatMoney(counted)} />
          <InfoTile
            label={varianceLabel(difference)}
            value={signedMoney(difference)}
            tone={varianceTone(difference)}
          />
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Counted cash
            </span>
            <input
              inputMode="numeric"
              className={inputClass()}
              value={countedCash}
              onChange={(event) => setCountedCash(normalizeDigits(event.target.value))}
              placeholder="Cash physically counted"
              disabled={saving}
            />
          </label>

          {hasVariance ? (
            <div className="rounded-[24px] bg-amber-500/10 px-4 py-3 text-sm font-bold leading-6 text-amber-700">
              Counted cash does not match expected cash. Choose a reason and write a short explanation before closing.
            </div>
          ) : (
            <div className="rounded-[24px] bg-emerald-500/10 px-4 py-3 text-sm font-bold leading-6 text-emerald-700">
              Counted cash matches expected cash. No variance explanation is required.
            </div>
          )}

          {hasVariance ? (
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                {difference < 0 ? "Short cash reason" : "Over cash reason"}
              </span>
              <select
                className={inputClass()}
                value={varianceReason || defaultClosingReasonForDifference(difference)}
                onChange={(event) => setVarianceReason(event.target.value)}
                disabled={saving}
              >
                {closingReasonOptionsForDifference(difference).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {hasVariance ? "Required explanation" : "Closing note"}
            </span>
            <textarea
              className={textareaClass()}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                hasVariance
                  ? "Explain why cash is short or over"
                  : "Optional closing note"
              }
              disabled={saving}
            />
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className={secondaryBtn()}>
              Cancel
            </button>

            <AsyncButton loading={saving} onClick={onSubmit} className={dangerBtn()}>
              Close drawer
            </AsyncButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function MovementModal({
  open,
  type,
  setType,
  reason,
  setReason,
  amount,
  setAmount,
  note,
  setNote,
  saving,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  const selectedType = MOVEMENT_TYPES.find((item) => item.value === type) || MOVEMENT_TYPES[0];

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[94dvh] w-full max-w-3xl overflow-hidden rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Cash movement
            </p>

            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
              Record drawer cash
            </h2>

            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Record cash added or removed outside a normal sale.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="max-h-[calc(94dvh-96px)] overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {MOVEMENT_TYPES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setType(item.value)}
                disabled={saving}
                className={cx(
                  "rounded-[24px] p-4 text-left transition hover:-translate-y-0.5",
                  type === item.value
                    ? item.value === "IN"
                      ? "bg-emerald-600 text-white shadow-[var(--shadow-soft)]"
                      : "bg-red-600 text-white shadow-[var(--shadow-soft)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:shadow-[var(--shadow-soft)]",
                )}
              >
                <span className="block text-sm font-black">{item.label}</span>
                <span
                  className={cx(
                    "mt-2 block text-xs font-semibold leading-5",
                    type === item.value ? "text-white/80" : "text-[var(--color-text-muted)]",
                  )}
                >
                  {item.text}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Reason
              </span>
              <select
                className={inputClass()}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={saving}
              >
                {MOVEMENT_REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Amount
              </span>
              <input
                inputMode="numeric"
                className={inputClass()}
                value={amount}
                onChange={(event) => setAmount(normalizeDigits(event.target.value))}
                placeholder="Amount"
                disabled={saving}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                Note
              </span>
              <textarea
                className={textareaClass()}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={`Explain why this ${selectedType.label.toLowerCase()} was recorded`}
                disabled={saving}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className={secondaryBtn()}>
              Cancel
            </button>

            <AsyncButton loading={saving} onClick={onSubmit} className={type === "IN" ? successBtn() : dangerBtn()}>
              Save movement
            </AsyncButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashDrawer() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [status, setStatus] = useState(null);
  const [movements, setMovements] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [visibleSessionCount, setVisibleSessionCount] = useState(RECENT_SESSION_INITIAL_COUNT);

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [openModal, setOpenModal] = useState(false);
  const [openAmount, setOpenAmount] = useState("");
  const [openReason, setOpenReason] = useState("NORMAL_FLOAT");
  const [openNote, setOpenNote] = useState("");
  const [openSaving, setOpenSaving] = useState(false);

  const [closeModal, setCloseModal] = useState(false);
  const [countedCash, setCountedCash] = useState("");
  const [closeVarianceReason, setCloseVarianceReason] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [closeSaving, setCloseSaving] = useState(false);

  const [movementModal, setMovementModal] = useState(false);
  const [movementTypeValue, setMovementTypeValue] = useState("IN");
  const [movementReasonValue, setMovementReasonValue] = useState("OTHER");
  const [movementAmountValue, setMovementAmountValue] = useState("");
  const [movementNoteValue, setMovementNoteValue] = useState("");
  const [movementSaving, setMovementSaving] = useState(false);

  const [activeBranchLabel, setActiveBranchLabel] = useState(() => activeBranchNameFromStorage());

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
      const [statusData, movementData, sessionData] = await Promise.all([
        getCashDrawerStatus(),
        getCashDrawerMovements({ limit: 100 }),
        getCashDrawerSessions({ limit: RECENT_SESSION_MAX_COUNT }),
      ]);

      if (!mountedRef.current) return;

      const movementList = Array.isArray(movementData)
        ? movementData
        : Array.isArray(movementData?.movements)
          ? movementData.movements
          : Array.isArray(movementData?.items)
            ? movementData.items
            : [];

      const sessionList = Array.isArray(sessionData)
        ? sessionData
        : Array.isArray(sessionData?.sessions)
          ? sessionData.sessions
          : Array.isArray(sessionData?.items)
            ? sessionData.items
            : [];

      setStatus(statusData || null);
      setMovements(movementList);
      setSessions(sessionList);
      setVisibleCount(PAGE_SIZE);
      setVisibleSessionCount(RECENT_SESSION_INITIAL_COUNT);
      setActiveBranchLabel(branchLabelFromStatus(statusData));
    } catch (error) {
      if (!mountedRef.current) return;

      console.error(error);

      if (!handleSubscriptionBlockedError(error, { toastId: "cash-drawer-load-blocked" })) {
        toast.error(error?.message || "Failed to load cash drawer");
      }

      setStatus(null);
      setMovements([]);
      setSessions([]);
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

  const openSession = openSessionFromStatus(status);
  const drawerOpen = isDrawerOpen(status);
  const blockCashSales = Boolean(status?.settings?.blockCashSales ?? true);

  const totalIn = useMemo(() => {
    return movements
      .filter((movement) => movementType(movement) === "IN")
      .reduce((sum, movement) => sum + movementAmount(movement), 0);
  }, [movements]);

  const totalOut = useMemo(() => {
    return movements
      .filter((movement) => movementType(movement) === "OUT")
      .reduce((sum, movement) => sum + movementAmount(movement), 0);
  }, [movements]);

  const expectedCash = useMemo(() => {
    return sessionOpeningCash(openSession) + totalIn - totalOut;
  }, [openSession, totalIn, totalOut]);

  const filteredMovements = useMemo(() => {
    const search = q.trim().toLowerCase();

    return movements.filter((movement) => {
      const type = movementType(movement);

      if (typeFilter !== "ALL" && type !== typeFilter) return false;

      if (!search) return true;

      const haystack = [
        movement?.id,
        movement?.type,
        movement?.direction,
        movement?.reason,
        movement?.note,
        movement?.createdBy,
        movement?.createdByName,
        movement?.createdByUser?.name,
      ]
        .map((item) => String(item || "").toLowerCase())
        .join(" ");

      return haystack.includes(search);
    });
  }, [movements, q, typeFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, typeFilter]);

  const visibleMovements = filteredMovements.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMovements.length;
  const visibleSessions = sessions.slice(0, visibleSessionCount);
  const hasMoreSessions =
    visibleSessionCount < sessions.length && visibleSessionCount < RECENT_SESSION_MAX_COUNT;
  const latestSession = status?.latestSession || sessions[0] || null;
  const latestDifference = latestSession ? sessionCashDifference(latestSession) : 0;
  const currentMovementCount = movements.length;
  const controlWarnings = [
    !drawerOpen && blockCashSales ? "Cash sales are blocked until this branch drawer is opened." : "",
    drawerOpen && expectedCash < 0 ? "Expected cash is below zero. Review money-out entries before closing." : "",
    !drawerOpen && latestSession && latestDifference !== 0
      ? `Last drawer closed ${varianceLabel(latestDifference).toLowerCase()} by ${signedMoney(latestDifference)}.`
      : "",
  ].filter(Boolean);

  function resetOpenForm() {
    setOpenAmount("");
    setOpenReason("NORMAL_FLOAT");
    setOpenNote("");
  }

  function resetCloseForm() {
    setCountedCash("");
    setCloseVarianceReason("");
    setCloseNote("");
  }

  function resetMovementForm() {
    setMovementTypeValue("IN");
    setMovementReasonValue("OTHER");
    setMovementAmountValue("");
    setMovementNoteValue("");
  }

  function openOpenDrawerModal() {
    resetOpenForm();
    setOpenModal(true);
  }

  function openCloseDrawerModal() {
    setCountedCash(String(Math.max(0, Math.round(expectedCash))));
    setCloseVarianceReason("");
    setCloseNote("");
    setCloseModal(true);
  }

  function openMovementDrawerModal(type = "IN") {
    resetMovementForm();
    setMovementTypeValue(type);
    setMovementModal(true);
  }

  async function submitOpenDrawer() {
    const amount = Number(openAmount || 0);

    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid starting cash amount");
      return;
    }

    setOpenSaving(true);

    try {
      const note = buildStructuredNote({
        title: "Drawer opened",
        rows: [
          ["Starting cash", formatMoney(amount)],
          ["Opening reason", optionLabel(OPENING_REASONS, openReason)],
        ],
        note: openNote,
      });

      await openCashDrawer({
        openingCash: amount,
        openingAmount: amount,
        openingReason: openReason,
        openingNote: openNote,
        note,
      });

      toast.success("Cash drawer opened");
      setOpenModal(false);
      resetOpenForm();
      await load({ silent: true });
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "cash-drawer-open-blocked" })) {
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || "Failed to open drawer");
    } finally {
      setOpenSaving(false);
    }
  }

  async function submitCloseDrawer() {
    const amount = Number(countedCash || 0);

    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid counted cash amount");
      return;
    }

    const difference = amount - Number(expectedCash || 0);

    const effectiveClosingReason =
      difference === 0 ? "" : cleanString(closeVarianceReason) || defaultClosingReasonForDifference(difference);

    if (difference !== 0 && !effectiveClosingReason) {
      toast.error(
        difference < 0
          ? "Choose why counted cash is below expected cash."
          : "Choose why counted cash is above expected cash.",
      );
      return;
    }

    if (difference !== 0 && !cleanString(closeNote)) {
      toast.error("Explain why counted cash is different from expected cash.");
      return;
    }

    setCloseSaving(true);

    try {
      const note = buildStructuredNote({
        title: difference === 0 ? "Drawer closed exactly" : "Drawer closed with cash difference",
        rows: [
          ["Expected cash", formatMoney(expectedCash)],
          ["Counted cash", formatMoney(amount)],
          ["Difference", signedMoney(difference)],
          ["Difference type", varianceLabel(difference)],
          ...(difference !== 0
            ? [["Difference reason", optionLabel(closingReasonOptionsForDifference(difference), effectiveClosingReason)]]
            : []),
        ],
        note: closeNote,
      });

      await closeCashDrawer({
        countedCash: amount,
        countedAmount: amount,
        expectedCash,
        closingReason: effectiveClosingReason,
        differenceReason: effectiveClosingReason,
        closingExplanation: closeNote,
        differenceExplanation: closeNote,
        closeNote: note,
        note,
      });

      toast.success("Cash drawer closed");
      setCloseModal(false);
      resetCloseForm();
      await load({ silent: true });
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "cash-drawer-close-blocked" })) {
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || "Failed to close drawer");
    } finally {
      setCloseSaving(false);
    }
  }

  async function submitMovement() {
    const amount = Number(movementAmountValue || 0);

    if (!drawerOpen) {
      toast.error("Open the drawer before recording cash movement");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setMovementSaving(true);

    try {
      await recordCashDrawerMovement({
        type: movementTypeValue,
        direction: movementTypeValue,
        reason: movementReasonValue,
        amount,
        note: cleanString(movementNoteValue) || null,
      });

      toast.success("Cash movement saved");
      setMovementModal(false);
      resetMovementForm();
      await load({ silent: true });
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "cash-movement-save-blocked" })) {
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || "Failed to save movement");
    } finally {
      setMovementSaving(false);
    }
  }

  function loadMore() {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }

  function loadMoreSessions() {
    setVisibleSessionCount((prev) =>
      Math.min(prev + RECENT_SESSION_INCREMENT, RECENT_SESSION_MAX_COUNT, sessions.length),
    );
  }

  if (loading) {
    return <CashDrawerSkeleton />;
  }

  return (
    <div className="svx-cash-page space-y-5">
      <OpenDrawerModal
        open={openModal}
        amount={openAmount}
        setAmount={setOpenAmount}
        reason={openReason}
        setReason={setOpenReason}
        note={openNote}
        setNote={setOpenNote}
        saving={openSaving}
        onClose={() => {
          if (!openSaving) setOpenModal(false);
        }}
        onSubmit={submitOpenDrawer}
      />

      <CloseDrawerModal
        open={closeModal}
        expectedCash={expectedCash}
        countedCash={countedCash}
        setCountedCash={setCountedCash}
        varianceReason={closeVarianceReason}
        setVarianceReason={setCloseVarianceReason}
        note={closeNote}
        setNote={setCloseNote}
        saving={closeSaving}
        onClose={() => {
          if (!closeSaving) setCloseModal(false);
        }}
        onSubmit={submitCloseDrawer}
      />

      <MovementModal
        open={movementModal}
        type={movementTypeValue}
        setType={setMovementTypeValue}
        reason={movementReasonValue}
        setReason={setMovementReasonValue}
        amount={movementAmountValue}
        setAmount={setMovementAmountValue}
        note={movementNoteValue}
        setNote={setMovementNoteValue}
        saving={movementSaving}
        onClose={() => {
          if (!movementSaving) setMovementModal(false);
        }}
        onSubmit={submitMovement}
      />

      <section className={cx(pageCard(), "svx-cash-hero relative overflow-hidden p-5 sm:p-6")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Cash drawer
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
                Drawer control
              </h1>

              <StatusBadge tone={drawerOpen ? "success" : "danger"}>
                {drawerOpen ? "Open" : "Closed"}
              </StatusBadge>
            </div>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Manage physical cash for{" "}
              <span className="font-black text-[var(--color-text)]">{activeBranchLabel}</span>.
              Only real cash payments need an open drawer. MoMo, Card, and Bank do not use this drawer.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <Link to="/app/pos" className={secondaryBtn()}>
              New sale
            </Link>

            <Link to="/app/pos/sales" className={secondaryBtn()}>
              Sales list
            </Link>

            <AsyncButton loading={refreshing} onClick={() => load({ silent: true })} className={secondaryBtn()}>
              Refresh
            </AsyncButton>
          </div>
        </div>
      </section>

      <section className="svx-cash-summary-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Drawer status"
          value={drawerOpen ? "Open" : "Closed"}
          note={drawerOpen ? `Opened ${formatDateTime(openSession?.openedAt)}` : "Open before taking cash"}
          tone={drawerOpen ? "success" : "danger"}
        />

        <SummaryCard
          label="Expected cash"
          value={formatMoney(expectedCash)}
          note={drawerOpen ? "Starting cash plus cash in minus cash out" : "No active drawer"}
          tone={drawerOpen ? "success" : "neutral"}
        />

        <SummaryCard
          label="Money in"
          value={formatMoney(totalIn)}
          note="Cash added during this drawer"
          tone="success"
        />

        <SummaryCard
          label="Money out"
          value={formatMoney(totalOut)}
          note="Cash removed during this drawer"
          tone={totalOut > 0 ? "danger" : "neutral"}
        />
      </section>

      <section className={cx(pageCard(), "svx-cash-control-panel overflow-hidden p-5 sm:p-6")}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-stretch">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Owner control
            </p>

            <h2 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--color-text)]">
              Cash truth before closing
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
              Use this panel to check whether physical drawer cash should match the system before the shop closes.
            </p>

            {controlWarnings.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {controlWarnings.map((warning) => (
                  <div key={warning} className="svx-cash-warning rounded-[22px] px-4 py-3 text-sm font-black leading-6">
                    {warning}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] bg-emerald-500/10 px-4 py-3 text-sm font-black leading-6 text-emerald-700">
                No drawer warning right now. Count cash carefully before closing.
              </div>
            )}
          </div>

          <div className="svx-cash-audit-grid grid gap-3 sm:grid-cols-2">
            <InfoTile label="Opened by" value={drawerOpen ? drawerOpenedBy(openSession) : "—"} />
            <InfoTile label="Opening cash" value={drawerOpen ? formatMoney(sessionOpeningCash(openSession)) : "—"} />
            <InfoTile label="Manual entries" value={formatNumber(currentMovementCount)} />
            <InfoTile label="Expected at count" value={formatMoney(expectedCash)} tone={drawerOpen ? "success" : "neutral"} />
          </div>
        </div>
      </section>

      <section className={cx(pageCard(), "svx-cash-session-card overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                Today’s drawer
              </p>

              <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                Cash session
              </h2>

              <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                Open the drawer at the start of cash selling. Close it after counting physical cash.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
              {drawerOpen ? (
                <>
                  <button
                    type="button"
                    onClick={() => openMovementDrawerModal("IN")}
                    className={successBtn()}
                  >
                    <PlusIcon />
                    Money in
                  </button>

                  <button
                    type="button"
                    onClick={() => openMovementDrawerModal("OUT")}
                    className={softDangerBtn()}
                  >
                    Money out
                  </button>

                  <button
                    type="button"
                    onClick={openCloseDrawerModal}
                    className={dangerBtn()}
                  >
                    Close drawer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={openOpenDrawerModal}
                  className={successBtn()}
                >
                  <CashIcon />
                  Open drawer
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Branch" value={activeBranchLabel} />
            <InfoTile label="Opened by" value={drawerOpen ? drawerOpenedBy(openSession) : "—"} />
            <InfoTile label="Starting cash" value={drawerOpen ? formatMoney(sessionOpeningCash(openSession)) : "—"} />
            <InfoTile
              label="Cash sale rule"
              value={blockCashSales ? "Cash needs open drawer" : "Cash can be recorded"}
              tone={blockCashSales ? "warning" : "neutral"}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid gap-3 xl:grid-cols-[1fr_180px]">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <SearchIcon />
              </span>

              <input
                className={cx(inputClass(), "pl-11")}
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search by note, reason, or person..."
              />
            </div>

            <select
              className={inputClass()}
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="ALL">All movements</option>
              <option value="IN">Money in</option>
              <option value="OUT">Money out</option>
            </select>
          </div>

          <div className="mt-5">
            {visibleMovements.length === 0 ? (
              <EmptyState
                title="No cash movements found"
                text={
                  drawerOpen
                    ? "Cash sales and manual drawer movements will appear here."
                    : "Open the drawer first. Cash movements will appear here after money is added or removed."
                }
              />
            ) : (
              <>
                <div className="grid gap-3">
                  {visibleMovements.map((movement, index) => (
                    <MovementCard key={movement.id || index} movement={movement} />
                  ))}
                </div>

                <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-[26px] bg-[var(--color-surface-2)] px-4 py-4 sm:flex-row">
                  <p className="text-center text-sm font-bold text-[var(--color-text-muted)] sm:text-left">
                    Showing {formatNumber(visibleMovements.length)} of {formatNumber(filteredMovements.length)} movement
                    {filteredMovements.length === 1 ? "" : "s"}.
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
        </div>
      </section>

      <section className={cx(pageCard(), "svx-cash-history-card overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                Recent drawer sessions
              </p>

              <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                Previous cash drawer days
              </h2>

              <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                Review how each drawer started, how it ended, and why cash was short or over.
              </p>
            </div>

            {status?.canReopenSameDay === false ? (
              <StatusBadge tone="warning">Owner reopens same day</StatusBadge>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {sessions.length === 0 ? (
            <EmptyState
              title="No previous drawer sessions"
              text="After you close a drawer, it will appear here with opening cash, expected cash, counted cash, and any cash difference explanation."
            />
          ) : (
            <>
              <div className="grid gap-3">
                {visibleSessions.map((session, index) => (
                  <RecentSessionCard key={session.id || index} session={session} />
                ))}
              </div>

              <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-[26px] bg-[var(--color-surface-2)] px-4 py-4 sm:flex-row">
                <p className="text-center text-sm font-bold text-[var(--color-text-muted)] sm:text-left">
                  Showing {formatNumber(visibleSessions.length)} of {formatNumber(sessions.length)} recent drawer session
                  {sessions.length === 1 ? "" : "s"}.
                </p>

                {hasMoreSessions ? (
                  <button
                    type="button"
                    onClick={loadMoreSessions}
                    className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 sm:w-auto"
                  >
                    View 5 more
                  </button>
                ) : (
                  <span className="rounded-full bg-[var(--color-card)] px-3 py-2 text-xs font-black text-[var(--color-text-muted)] shadow-[var(--shadow-soft)]">
                    End of recent sessions
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
