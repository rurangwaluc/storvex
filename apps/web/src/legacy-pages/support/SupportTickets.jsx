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
import "./SupportTickets.css";

const CATEGORY_OPTIONS = [
  { label: "General help", value: "OTHER" },
  { label: "Account access", value: "ACCOUNT_ACCESS" },
  { label: "Billing or payment", value: "BILLING_PAYMENT" },
  { label: "Setup or onboarding", value: "ONBOARDING_SETUP" },
  { label: "Sales or POS", value: "POS_SALES" },
  { label: "Inventory or stock", value: "INVENTORY_STOCK" },
  { label: "Receipts or invoices", value: "RECEIPTS_INVOICES" },
  { label: "WhatsApp sales", value: "WHATSAPP" },
  { label: "Staff users", value: "STAFF_USERS" },
  { label: "System problem", value: "BUG_REPORT" },
];

const PRIORITY_OPTIONS = [
  { label: "Normal", value: "NORMAL" },
  { label: "Urgent", value: "URGENT" },
  { label: "Business blocked", value: "BUSINESS_BLOCKED" },
];

const STATUS_FILTERS = [
  { label: "All requests", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Waiting for you", value: "WAITING_FOR_TENANT" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
];

const CATEGORY_LABEL = Object.fromEntries(
  CATEGORY_OPTIONS.map((item) => [item.value, item.label])
);

const PRIORITY_LABEL = Object.fromEntries(
  PRIORITY_OPTIONS.map((item) => [item.value, item.label])
);

const STATUS_LABEL = Object.fromEntries(
  STATUS_FILTERS.filter((item) => item.value !== "ALL").map((item) => [
    item.value,
    item.label,
  ])
);

const EMPTY_FORM = {
  title: "",
  category: "OTHER",
  priority: "NORMAL",
  message: "",
};

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

function statusClass(status) {
  const value = String(status || "").toUpperCase();

  if (value === "OPEN") return "is-open";
  if (value === "IN_PROGRESS") return "is-progress";
  if (value === "WAITING_FOR_TENANT") return "is-waiting";
  if (value === "RESOLVED" || value === "CLOSED") return "is-done";

  return "";
}

function priorityClass(priority) {
  const value = String(priority || "").toUpperCase();

  return value === "URGENT" || value === "BUSINESS_BLOCKED" ? "is-urgent" : "";
}

function SupportBadge({ children, className = "" }) {
  return <span className={`svx-support-badge ${className}`}>{children}</span>;
}

function SupportStat({ label, value, note, tone = "" }) {
  return (
    <article className={`svx-support-stat ${tone ? `is-${tone}` : ""}`}>
      <p className="svx-support-stat-label">{label}</p>
      <div className="svx-support-stat-value">{value}</div>
      <div className="svx-support-stat-note">{note}</div>
    </article>
  );
}

function LoadingList() {
  return (
    <div className="svx-support-loading">
      <div className="svx-support-skeleton">
        <div className="svx-support-skeleton-row" />
        <div className="svx-support-skeleton-row" />
        <div className="svx-support-skeleton-row" />
      </div>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="svx-support-empty">
      <div className="svx-support-empty-card">
        <div className="svx-support-empty-icon">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v7.4a2.8 2.8 0 0 1-2.8 2.8H9l-5 3V6.8Z" />
            <path d="M8 9h8M8 12.5h5" strokeLinecap="round" />
          </svg>
        </div>

        <h3 className="svx-support-empty-title">No support requests yet</h3>
        <p className="svx-support-empty-copy">
          Create a request when you need help with access, payments, stock,
          sales, receipts, WhatsApp sales, or a system problem.
        </p>

        {onAdd ? (
          <button type="button" className="svx-support-btn svx-support-btn-primary" onClick={onAdd}>
            Create request
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TicketCard({ ticket }) {
  const messageCount = Number(ticket?._count?.messages || 0);
  const attachmentCount = Number(ticket?._count?.attachments || 0);
  const status = String(ticket?.status || "").toUpperCase();
  const priority = String(ticket?.priority || "").toUpperCase();

  return (
    <Link to={`/app/support/${ticket.id}`} className="svx-support-ticket">
      <div className="svx-support-ticket-main">
        <div className="svx-support-ticket-tags">
          <SupportBadge className={statusClass(status)}>
            {STATUS_LABEL[status] || "Open"}
          </SupportBadge>
          <SupportBadge className={priorityClass(priority)}>
            {PRIORITY_LABEL[priority] || "Normal"}
          </SupportBadge>
          <SupportBadge>{CATEGORY_LABEL[ticket.category] || "General help"}</SupportBadge>
        </div>

        <h3 className="svx-support-ticket-title">
          {ticket.title || "Support request"}
        </h3>

        <div className="svx-support-ticket-meta">
          <span>Last reply {relativeTime(ticket.lastMessageAt)}</span>
          <span>Created {formatDate(ticket.createdAt)}</span>
          <span>{formatNumber(messageCount)} message{messageCount === 1 ? "" : "s"}</span>
          <span>{formatNumber(attachmentCount)} file{attachmentCount === 1 ? "" : "s"}</span>
        </div>
      </div>

      <div className="svx-support-ticket-side">
        <span>{ticket.assignedToPlatformUser?.name || "Storvex support"}</span>
        <span className="svx-support-open">Open</span>
      </div>
    </Link>
  );
}

function CreateTicketModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

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
      toast.error("Add a clear title");
      return;
    }

    if (message.length < 5) {
      toast.error("Explain the problem");
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

      toast.success("Support request created");
      setForm(EMPTY_FORM);
      setFiles([]);
      onCreated();
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "support-create-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to create support request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="svx-support-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close support form"
        className="svx-support-modal-backdrop"
        onClick={busy ? undefined : onClose}
      />

      <section className="svx-support-modal-card">
        <div className="svx-support-modal-head">
          <div>
            <h2 className="svx-support-modal-title">New support request</h2>
            <p className="svx-support-modal-copy">
              Explain the issue clearly. Add a screenshot or payment proof when it helps.
            </p>
          </div>

          <button type="button" className="svx-support-close" onClick={onClose} disabled={busy}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="svx-support-form">
          <div className="svx-support-field">
            <label className="svx-support-label">Title</label>
            <input
              className="svx-support-input"
              placeholder="Example: Payment was made but access is still blocked"
              value={form.title}
              onChange={(event) => setField("title", event.target.value)}
              required
            />
          </div>

          <div className="svx-support-form-grid">
            <div className="svx-support-field">
              <label className="svx-support-label">Issue type</label>
              <select
                className="svx-support-select"
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

            <div className="svx-support-field">
              <label className="svx-support-label">How serious is it?</label>
              <select
                className="svx-support-select"
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

          <div className="svx-support-field">
            <label className="svx-support-label">What happened?</label>
            <textarea
              className="svx-support-textarea"
              placeholder="Tell us what happened, what you expected, and what you need help with."
              value={form.message}
              onChange={(event) => setField("message", event.target.value)}
              required
            />
          </div>

          <div className="svx-support-upload">
            <label className="svx-support-upload-label">
              Add screenshot or proof
              <input
                type="file"
                multiple
                disabled={busy}
                hidden
                onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files || []);
                  setFiles(selectedFiles.slice(0, 5));
                  event.currentTarget.value = "";
                }}
              />
            </label>

            <p className="svx-support-upload-note">
              Optional. Add up to 5 files when support needs proof or screenshots.
            </p>

            {files.length ? (
              <div className="svx-support-file-list">
                {files.map((file) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="svx-support-file"
                  >
                    <span>{file.name}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="svx-support-form-actions">
            <button
              type="button"
              className="svx-support-btn svx-support-btn-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>

            <AsyncButton
              type="submit"
              loading={busy}
              disabled={busy}
              className="svx-support-btn svx-support-btn-primary"
            >
              Send request
            </AsyncButton>
          </div>
        </form>
      </section>
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
      const data = await listMySupportTickets({ take: 100 });

      if (!mountedRef.current || requestRef.current !== requestId) return;

      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
    } catch (error) {
      if (!mountedRef.current || requestRef.current !== requestId) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "support-load-blocked" })) {
        toast.error(error?.message || "Failed to load support requests");
      }

      setTickets([]);
    } finally {
      if (!mountedRef.current || requestRef.current !== requestId) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
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
    <div className="svx-support-page">
      <section className="svx-support-hero">
        <div>
          <p className="svx-support-eyebrow">Storvex support</p>
          <h1 className="svx-support-title">Get help fast</h1>
          <p className="svx-support-copy">
            Send an issue to Storvex, attach proof when needed, and keep every reply in one clean request.
          </p>
        </div>

        <div className="svx-support-actions">
          <AsyncButton
            loading={loading}
            onClick={() => load({ silent: false })}
            className="svx-support-btn svx-support-btn-secondary"
          >
            Refresh
          </AsyncButton>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="svx-support-btn svx-support-btn-primary"
          >
            New request
          </button>
        </div>
      </section>

      <section className="svx-support-summary">
        <SupportStat label="All requests" value={formatNumber(summary.total)} note="Every issue sent to Storvex" />
        <SupportStat label="Open" value={formatNumber(summary.open)} note="Waiting for support review" />
        <SupportStat label="Waiting for you" value={formatNumber(summary.waiting)} note="Needs your reply" tone="warning" />
        <SupportStat label="Done" value={formatNumber(summary.closed)} note="Resolved or closed" tone="success" />
      </section>

      <section className="svx-support-panel">
        <div className="svx-support-toolbar">
          <div className="svx-support-field">
            <label className="svx-support-label">Search requests</label>
            <input
              className="svx-support-input"
              placeholder="Search title, status, or issue type"
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </div>

          <div className="svx-support-field">
            <label className="svx-support-label">Status</label>
            <select
              className="svx-support-select"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="svx-support-count">
            {formatNumber(filtered.length)} shown
          </div>
        </div>

        <div className="svx-support-list">
          {loading ? (
            <LoadingList />
          ) : filtered.length === 0 ? (
            <EmptyState onAdd={tickets.length === 0 ? () => setShowForm(true) : null} />
          ) : (
            filtered.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </div>
      </section>

      <CreateTicketModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
