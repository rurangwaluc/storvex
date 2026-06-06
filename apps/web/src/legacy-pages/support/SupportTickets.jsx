import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  createSupportAttachmentUpload,
  createSupportTicket,
  listMySupportTickets,
  uploadSupportFile,
} from "../../services/supportTicketsApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

const CATEGORY_OPTIONS = [
  { label: "General help", value: "GENERAL" },
  { label: "Billing or payment", value: "BILLING_PAYMENT" },
  { label: "Account access", value: "ACCOUNT_ACCESS" },
  { label: "Sales or POS", value: "SALES_POS" },
  { label: "Inventory or stock", value: "INVENTORY_STOCK" },
  { label: "Reports", value: "REPORTS" },
  { label: "Bug or technical issue", value: "BUG_TECHNICAL" },
  { label: "Other", value: "OTHER" },
];

const PRIORITY_OPTIONS = [
  { label: "Normal", value: "NORMAL" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
  { label: "Business blocked", value: "BUSINESS_BLOCKED" },
];

const STATUS_FILTERS = [
  { label: "All tickets", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Waiting for us", value: "WAITING_FOR_TENANT" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
];

const CATEGORY_LABEL = Object.fromEntries(
  CATEGORY_OPTIONS.map((item) => [item.value, item.label])
);

const STATUS_LABEL = Object.fromEntries(
  STATUS_FILTERS.filter((item) => item.value !== "ALL").map((item) => [
    item.value,
    item.label,
  ])
);

const PRIORITY_LABEL = Object.fromEntries(
  PRIORITY_OPTIONS.map((item) => [item.value, item.label])
);

const EMPTY_FORM = {
  title: "",
  category: "GENERAL",
  priority: "NORMAL",
  message: "",
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function cleanString(value) {
  const text = String(value || "").trim();
  return text || "";
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
  return cx(
    buttonBase(disabled),
    "bg-[var(--color-primary)] text-white hover:opacity-95"
  );
}

function secondaryBtn(disabled = false) {
  return cx(
    buttonBase(disabled),
    "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:opacity-90"
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-[20px] bg-[var(--color-surface-2)]",
        className
      )}
    />
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div
          className={cx(
            "text-[11px] font-semibold uppercase tracking-[0.18em]",
            softText()
          )}
        >
          {eyebrow}
        </div>
      ) : null}

      <h1
        className={cx(
          "mt-3 text-[1.7rem] font-black tracking-tight sm:text-[2rem]",
          strongText()
        )}
      >
        {title}
      </h1>

      {subtitle ? (
        <p className={cx("mt-3 max-w-3xl text-sm leading-6", mutedText())}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "").toUpperCase();

  const style =
    value === "OPEN"
      ? "bg-[rgba(219,80,74,0.12)] text-[var(--color-danger)]"
      : value === "IN_PROGRESS"
        ? "bg-[#dff1ff] text-[#077dcb]"
        : value === "WAITING_FOR_TENANT"
          ? "bg-[#fff1c9] text-[#b88900]"
          : value === "RESOLVED"
            ? "bg-[#dcfce7] text-[#15803d]"
            : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
        style
      )}
    >
      {STATUS_LABEL[value] || value || "Unknown"}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const value = String(priority || "").toUpperCase();

  const style =
    value === "URGENT" || value === "BUSINESS_BLOCKED"
      ? "bg-[rgba(219,80,74,0.12)] text-[var(--color-danger)]"
      : value === "HIGH"
        ? "bg-[#fff1c9] text-[#b88900]"
        : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
        style
      )}
    >
      {PRIORITY_LABEL[value] || value || "Normal"}
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

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const iconTone =
    tone === "danger"
      ? "bg-[rgba(219,80,74,0.12)] text-[var(--color-danger)]"
      : tone === "warning"
        ? "bg-[#fff1c9] text-[#b88900]"
        : tone === "success"
          ? "bg-[#dcfce7] text-[#15803d]"
          : "bg-[#dff1ff] text-[#077dcb]";

  return (
    <article className={cx(pageCard(), "p-5 sm:p-6")}>
      <div className="flex items-start gap-4 sm:gap-5">
        <div
          className={cx(
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] shadow-[var(--shadow-soft)]",
            iconTone
          )}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
          >
            <path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v7.4a2.8 2.8 0 0 1-2.8 2.8H9l-5 3V6.8Z" />
            <path d="M8 9h8M8 12.5h5" strokeLinecap="round" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className={cx("text-sm font-semibold", strongText())}>
            {label}
          </div>
          <div
            className={cx(
              "mt-2 text-[1.7rem] font-black leading-tight tracking-[-0.02em]",
              strongText()
            )}
          >
            {value}
          </div>
          {note ? (
            <div className={cx("mt-2 text-sm leading-6", mutedText())}>
              {note}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={cx(pageCard(), "p-4 sm:p-5")}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBlock className="h-7 w-36 rounded-full" />
              <SkeletonBlock className="h-7 w-24 rounded-full" />
              <SkeletonBlock className="h-7 w-28 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className={cx(softPanel(), "px-4 py-16 text-center")}>
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8 text-[var(--color-text-muted)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v7.4a2.8 2.8 0 0 1-2.8 2.8H9l-5 3V6.8Z" />
          <path d="M8 9h8M8 12.5h5" strokeLinecap="round" />
        </svg>
      </div>

      <div className={cx("text-base font-bold", strongText())}>
        No support tickets found
      </div>
      <div className={cx("mx-auto mt-2 max-w-md text-sm leading-6", mutedText())}>
        Create a ticket when your business needs help with billing, access,
        stock, sales, reports, or a technical issue.
      </div>

      {onAdd ? (
        <button type="button" onClick={onAdd} className={cx(primaryBtn(), "mt-5")}>
          Create first ticket
        </button>
      ) : null}
    </div>
  );
}

function TicketCard({ ticket, index }) {
  const messageCount = Number(ticket?._count?.messages || 0);
  const attachmentCount = Number(ticket?._count?.attachments || 0);

  return (
    <Link
      to={`/app/support/${ticket.id}`}
      className={cx(
        pageCard(),
        "relative block overflow-hidden p-4 transition hover:opacity-95 sm:p-5",
        index % 2 === 0 ? "bg-[var(--color-card)]" : "bg-[var(--color-surface)]"
      )}
    >
      <div
        className={cx(
          "absolute left-0 top-0 h-full w-1.5 opacity-80",
          ticket.status === "OPEN"
            ? "bg-[var(--color-danger)]"
            : ticket.status === "WAITING_FOR_TENANT"
              ? "bg-[#b88900]"
              : ticket.status === "RESOLVED"
                ? "bg-[#15803d]"
                : "bg-[var(--color-primary)]"
        )}
      />

      <div className="absolute inset-x-0 top-0 h-px bg-[var(--color-border)]" />

      <div className="pl-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cx(
                    "text-[1.1rem] font-black tracking-tight",
                    strongText()
                  )}
                >
                  {ticket.title || "Untitled support ticket"}
                </span>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <CategoryPill category={ticket.category} />
              </div>

              <div className={cx("mt-2 text-sm leading-6", mutedText())}>
                Last message {relativeTime(ticket.lastMessageAt)} · created{" "}
                {formatDate(ticket.createdAt)}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className={cx(secondaryBtn(), "pointer-events-none h-10 px-4")}>
                Open
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={cx(raisedPanel(), "p-3.5")}>
              <div
                className={cx(
                  "text-[10px] font-semibold uppercase tracking-[0.18em]",
                  softText()
                )}
              >
                Messages
              </div>
              <div className={cx("mt-2.5 text-sm font-bold", strongText())}>
                {formatNumber(messageCount)}
              </div>
            </div>

            <div className={cx(raisedPanel(), "p-3.5")}>
              <div
                className={cx(
                  "text-[10px] font-semibold uppercase tracking-[0.18em]",
                  softText()
                )}
              >
                Files
              </div>
              <div className={cx("mt-2.5 text-sm font-bold", strongText())}>
                {formatNumber(attachmentCount)}
              </div>
            </div>

            <div className={cx(raisedPanel(), "p-3.5")}>
              <div
                className={cx(
                  "text-[10px] font-semibold uppercase tracking-[0.18em]",
                  softText()
                )}
              >
                Assigned to
              </div>
              <div className={cx("mt-2.5 text-sm font-bold", strongText())}>
                {ticket.assignedToPlatformUser?.name || "Storvex support"}
              </div>
            </div>

            <div className={cx(raisedPanel(), "p-3.5")}>
              <div
                className={cx(
                  "text-[10px] font-semibold uppercase tracking-[0.18em]",
                  softText()
                )}
              >
                Created by
              </div>
              <div className={cx("mt-2.5 text-sm font-bold", strongText())}>
                {ticket.createdBy?.name || "Your team"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CreateTicketForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadFiles() {
    const uploaded = [];

    for (const file of files) {
      const uploadResult = await createSupportAttachmentUpload({
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
      });

      await uploadSupportFile(uploadResult.upload.uploadUrl, file);
      uploaded.push(uploadResult.attachment);
    }

    return uploaded;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const title = cleanString(form.title);
    const message = cleanString(form.message);

    if (title.length < 4) {
      toast.error("Ticket title must be at least 4 characters");
      return;
    }

    if (message.length < 5) {
      toast.error("Explain the issue with at least 5 characters");
      return;
    }

    setBusy(true);

    try {
      const attachments = await uploadFiles();

      await createSupportTicket({
        title,
        category: form.category,
        priority: form.priority,
        message,
        attachments,
      });

      toast.success("Support ticket created");
      setForm(EMPTY_FORM);
      setFiles([]);
      onCreated();
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "support-create-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to create support ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cx(pageCard(), "p-5 sm:p-6")}>
      <div className={cx("text-base font-bold", strongText())}>
        Create support ticket
      </div>
      <p className={cx("mt-1.5 text-sm leading-6", mutedText())}>
        Share the problem, add screenshots or payment proof, and Storvex support
        will reply inside this ticket.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>
            Title <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            className={inputClass()}
            placeholder="Example: Payment completed but account is still read-only"
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
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>
              Priority <span className="text-[var(--color-danger)]">*</span>
            </label>
            <select
              className={inputClass()}
              value={form.priority}
              onChange={(event) => setField("priority", event.target.value)}
              required
            >
              {PRIORITY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>
            Message <span className="text-[var(--color-danger)]">*</span>
          </label>
          <textarea
            className="min-h-[120px] w-full resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)]"
            placeholder="Explain what happened, what you expected, and what you need support to do..."
            value={form.message}
            onChange={(event) => setField("message", event.target.value)}
            required
          />
        </div>

        <div className={cx(softPanel(), "p-4")}>
          <div
            className={cx(
              "text-[11px] font-semibold uppercase tracking-[0.18em]",
              softText()
            )}
          >
            Attachments
          </div>

          <label className={cx(secondaryBtn(busy), "mt-3 cursor-pointer")}>
            Add screenshots or proof
            <input
              type="file"
              multiple
              disabled={busy}
              className="hidden"
              onChange={(event) => {
                const selectedFiles = Array.from(event.target.files || []);
                setFiles(selectedFiles.slice(0, 5));
                event.currentTarget.value = "";
              }}
            />
          </label>

          {files.length ? (
            <div className="mt-3 space-y-2">
              {files.map((file) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-sm font-semibold text-[var(--color-text)]"
                >
                  <span className="min-w-0 truncate">{file.name}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setFiles((current) => current.filter((item) => item !== file))
                    }
                    className="rounded-xl px-2 py-1 text-xs font-bold text-[var(--color-danger)] disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={cx("mt-3 text-xs leading-5", mutedText())}>
              Optional. Upload up to 5 files.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {onCancel ? (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className={secondaryBtn(busy)}
            >
              Cancel
            </button>
          ) : null}

          <AsyncButton
            type="submit"
            loading={busy}
            disabled={busy}
            className={primaryBtn(busy)}
          >
            Create ticket
          </AsyncButton>
        </div>
      </form>
    </div>
  );
}

export default function SupportTickets() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showForm, setShowForm] = useState(false);

  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function load({ silent = false } = {}) {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (!silent) setLoading(true);

    try {
      const data = await listMySupportTickets({
        take: 100,
      });

      if (!mountedRef.current || requestRef.current !== requestId) return;

      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
    } catch (error) {
      if (!mountedRef.current || requestRef.current !== requestId) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "support-load-blocked" })) {
        toast.error(error?.message || "Failed to load support tickets");
      }

      setTickets([]);
    } finally {
      if (!mountedRef.current || requestRef.current !== requestId) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = tickets;

    if (filterStatus !== "ALL") {
      list = list.filter(
        (ticket) => String(ticket.status || "").toUpperCase() === filterStatus
      );
    }

    const search = q.trim().toLowerCase();

    if (search) {
      list = list.filter((ticket) => {
        const haystack = [
          ticket.title,
          ticket.category,
          CATEGORY_LABEL[ticket.category],
          ticket.priority,
          PRIORITY_LABEL[ticket.priority],
          ticket.status,
          STATUS_LABEL[ticket.status],
          ticket.createdBy?.name,
          ticket.assignedToPlatformUser?.name,
        ]
          .map((item) => String(item || "").toLowerCase())
          .join(" ");

        return haystack.includes(search);
      });
    }

    return list;
  }, [filterStatus, q, tickets]);

  const summary = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === "OPEN").length;
    const waiting = tickets.filter(
      (ticket) => ticket.status === "WAITING_FOR_TENANT"
    ).length;
    const active = tickets.filter((ticket) =>
      ["OPEN", "IN_PROGRESS", "WAITING_FOR_TENANT"].includes(ticket.status)
    ).length;
    const closed = tickets.filter((ticket) =>
      ["RESOLVED", "CLOSED"].includes(ticket.status)
    ).length;

    return {
      total: tickets.length,
      open,
      waiting,
      active,
      closed,
    };
  }, [tickets]);

  function handleCreated() {
    setShowForm(false);
    void load({ silent: false });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionHeading
            eyebrow="Support"
            title="Support tickets"
            subtitle="Ask for help, send payment proof, attach screenshots, and keep every reply in one clear conversation."
          />

          <div className="flex flex-wrap gap-2">
            <AsyncButton loading={loading} onClick={() => load({ silent: false })} className={secondaryBtn()}>
              Refresh
            </AsyncButton>

            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className={primaryBtn()}
            >
              {showForm ? "Close form" : "New ticket"}
            </button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total tickets" value={formatNumber(summary.total)} note="All support requests" />
          <SummaryCard label="Open" value={formatNumber(summary.open)} note="Waiting for review" tone="danger" />
          <SummaryCard label="Waiting for you" value={formatNumber(summary.waiting)} note="Needs your reply" tone="warning" />
          <SummaryCard label="Resolved or closed" value={formatNumber(summary.closed)} note="Completed requests" tone="success" />
        </section>
      </section>

      {showForm ? (
        <CreateTicketForm
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={cx(pageCard(), "h-fit p-5 sm:p-6")}>
          <div className={cx("text-base font-bold", strongText())}>
            Filter tickets
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>
                Search
              </label>
              <input
                className={inputClass()}
                placeholder="Title, status, category..."
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </div>

            <div>
              <label className={cx("mb-1.5 block text-sm font-medium", strongText())}>
                Status
              </label>
              <div className="flex flex-col gap-2">
                {STATUS_FILTERS.map((option) => (
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
              <div
                className={cx(
                  "text-[11px] font-semibold uppercase tracking-[0.18em]",
                  softText()
                )}
              >
                Showing
              </div>
              <div className={cx("mt-2.5 text-lg font-bold", strongText())}>
                {formatNumber(filtered.length)} ticket
                {filtered.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className={cx(softPanel(), "p-4")}>
              <div
                className={cx(
                  "text-[11px] font-semibold uppercase tracking-[0.18em]",
                  softText()
                )}
              >
                Best use
              </div>
              <div className={cx("mt-2.5 text-sm leading-6", mutedText())}>
                Use support tickets for billing proof, account access issues,
                blocked work, bugs, or questions that need the Storvex team.
              </div>
            </div>
          </div>
        </aside>

        <section className={cx(pageCard(), "overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className={cx("text-xl font-bold", strongText())}>
                  Ticket inbox
                </div>
                <div className={cx("mt-1.5 text-sm leading-6", mutedText())}>
                  Open a ticket to read replies, send more information, or add
                  proof files.
                </div>
              </div>

              {!loading ? (
                <span className="inline-flex items-center self-start rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                  {formatNumber(filtered.length)} shown
                </span>
              ) : null}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <ListSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState onAdd={tickets.length === 0 ? () => setShowForm(true) : null} />
            ) : (
              <div className="space-y-3">
                {filtered.map((ticket, index) => (
                  <TicketCard key={ticket.id} ticket={ticket} index={index} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}