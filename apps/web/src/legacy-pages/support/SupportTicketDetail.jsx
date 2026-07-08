import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  closeMySupportTicket,
  createSupportAttachmentUpload,
  getMySupportTicketById,
  getSupportAttachmentDownloadUrl,
  replyToMySupportTicket,
  uploadSupportFile,
} from "../../services/supportTicketsApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./SupportTickets.css";

const STATUS_LABEL = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_FOR_TENANT: "Waiting for you",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const PRIORITY_LABEL = {
  NORMAL: "Normal",
  URGENT: "Urgent",
  BUSINESS_BLOCKED: "Business blocked",
};

const CATEGORY_LABEL = {
  ACCOUNT_ACCESS: "Account access",
  BILLING_PAYMENT: "Billing or payment",
  ONBOARDING_SETUP: "Setup or onboarding",
  POS_SALES: "Sales or POS",
  INVENTORY_STOCK: "Inventory or stock",
  RECEIPTS_INVOICES: "Receipts or invoices",
  WHATSAPP: "WhatsApp sales",
  STAFF_USERS: "Staff users",
  BUG_REPORT: "System problem",
  OTHER: "General help",
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
  return "svx-support-detail-card";
}

function raisedPanel() {
  return "svx-support-detail-panel";
}

function softPanel() {
  return "svx-support-detail-panel";
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

function successBtn(disabled = false) {
  return cx(
    buttonBase(disabled),
    disabled
      ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
      : "bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:opacity-90"
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

  const tone =
    value === "OPEN"
      ? "is-open"
      : value === "IN_PROGRESS"
        ? "is-progress"
        : value === "WAITING_FOR_TENANT"
          ? "is-waiting"
          : value === "RESOLVED" || value === "CLOSED"
            ? "is-done"
            : "";

  return (
    <span className={cx("svx-support-badge", tone)}>
      {STATUS_LABEL[value] || value || "Unknown"}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const value = String(priority || "").toUpperCase();
  const urgent = value === "URGENT" || value === "BUSINESS_BLOCKED";

  return (
    <span className={cx("svx-support-badge", urgent && "is-urgent")}>
      {PRIORITY_LABEL[value] || value || "Normal"}
    </span>
  );
}

function CategoryPill({ category }) {
  return (
    <span className="svx-support-badge">
      {CATEGORY_LABEL[category] || category || "Other"}
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div className="svx-support-detail-page">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-4 h-10 w-full max-w-xl" />
          <SkeletonBlock className="mt-3 h-5 w-full max-w-2xl" />
        </div>
        <SkeletonBlock className="h-11 w-32 rounded-2xl" />
      </div>

      <div className="svx-support-detail-grid">
        <div className={cx(pageCard(), "p-5 sm:p-6")}>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock
                key={index}
                className={cx(
                  "h-28 max-w-2xl",
                  index % 2 === 0 ? "mr-auto" : "ml-auto"
                )}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <SkeletonBlock className="h-56 rounded-[28px]" />
          <SkeletonBlock className="h-44 rounded-[28px]" />
        </div>
      </div>
    </div>
  );
}

function EmptyConversation() {
  return (
    <div className={cx(softPanel(), "px-4 py-14 text-center")}>
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
        No messages found
      </div>
      <div className={cx("mx-auto mt-2 max-w-md text-sm leading-6", mutedText())}>
        This ticket exists, but no conversation messages were returned.
      </div>
    </div>
  );
}

function AttachmentLink({ attachment, platform }) {
  const [busy, setBusy] = useState(false);

  async function openAttachment() {
    if (!attachment?.id || busy) return;

    setBusy(true);

    try {
      const data = await getSupportAttachmentDownloadUrl(attachment.id);

      if (!data?.downloadUrl) {
        throw new Error("Download link was not returned");
      }

      window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error?.message || "Failed to open attachment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openAttachment}
      disabled={busy}
      className={cx(
        "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
        platform
          ? "bg-[var(--color-card)] text-[var(--color-text)]"
          : "bg-white/10 text-white"
      )}
    >
      <span className="min-w-0 truncate">
        {attachment.fileName || "Attachment"}
      </span>

      <span className="shrink-0">
        {busy
          ? "Opening…"
          : attachment.fileSize
            ? `${formatNumber(attachment.fileSize)}b`
            : "Open"}
      </span>
    </button>
  );
}

function MessageBubble({ message }) {
  const platform = message.senderType === "PLATFORM_USER";
  const senderName = platform
    ? message.platformUser?.name || "Storvex support"
    : message.tenantUser?.name || "Your team";

  return (
    <div className={cx("svx-support-message-row", platform ? "is-platform" : "is-store")}>
      <article className={cx("svx-support-message-bubble", platform ? "is-platform" : "is-store")}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-black">{senderName}</div>
          <div
            className={cx(
              "text-xs font-semibold",
              platform ? mutedText() : "text-white/75"
            )}
          >
            {relativeTime(message.createdAt)}
          </div>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
          {message.message}
        </p>

        {message.attachments?.length ? (
          <div className="mt-4 space-y-2">
            {message.attachments.map((attachment) => (
              <AttachmentLink
                key={attachment.id}
                attachment={attachment}
                platform={platform}
              />
            ))}
          </div>
        ) : null}
      </article>
    </div>
  );
}

function TicketInfoPanel({ ticket }) {
  const messageCount = Number(ticket?._count?.messages || ticket?.messages?.length || 0);
  const attachmentCount = Number(ticket?._count?.attachments || ticket?.attachments?.length || 0);

  return (
    <div className={cx(pageCard(), "p-5 sm:p-6")}>
      <div className={cx("text-base font-bold", strongText())}>
        Ticket details
      </div>

      <div className="mt-4 space-y-3">
        <div className={cx(raisedPanel(), "p-4")}>
          <div
            className={cx(
              "text-[10px] font-semibold uppercase tracking-[0.18em]",
              softText()
            )}
          >
            Status
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={ticket?.status} />
            <PriorityBadge priority={ticket?.priority} />
            <CategoryPill category={ticket?.category} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={cx(raisedPanel(), "p-4")}>
            <div
              className={cx(
                "text-[10px] font-semibold uppercase tracking-[0.18em]",
                softText()
              )}
            >
              Messages
            </div>
            <div className={cx("mt-2.5 text-lg font-black", strongText())}>
              {formatNumber(messageCount)}
            </div>
          </div>

          <div className={cx(raisedPanel(), "p-4")}>
            <div
              className={cx(
                "text-[10px] font-semibold uppercase tracking-[0.18em]",
                softText()
              )}
            >
              Files
            </div>
            <div className={cx("mt-2.5 text-lg font-black", strongText())}>
              {formatNumber(attachmentCount)}
            </div>
          </div>
        </div>

        <div className={cx(softPanel(), "p-4")}>
          <div
            className={cx(
              "text-[10px] font-semibold uppercase tracking-[0.18em]",
              softText()
            )}
          >
            Created
          </div>
          <div className={cx("mt-2.5 text-sm font-bold", strongText())}>
            {formatDate(ticket?.createdAt)}
          </div>
          <div className={cx("mt-1 text-xs", mutedText())}>
            Last message {relativeTime(ticket?.lastMessageAt)}
          </div>
        </div>

        <div className={cx(softPanel(), "p-4")}>
          <div
            className={cx(
              "text-[10px] font-semibold uppercase tracking-[0.18em]",
              softText()
            )}
          >
            Assigned to
          </div>
          <div className={cx("mt-2.5 text-sm font-bold", strongText())}>
            {ticket?.assignedToPlatformUser?.name || "Storvex support"}
          </div>
          <div className={cx("mt-1 text-xs", mutedText())}>
            {ticket?.assignedToPlatformUser?.email || "Support team"}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplyForm({ ticket, onSent }) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const closed = ticket?.status === "CLOSED";
  const canSubmit = Boolean(ticket?.id && !closed && cleanString(message));
  const waitingForYou = String(ticket?.status || "").toUpperCase() === "WAITING_FOR_TENANT";

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

    const cleanMessage = cleanString(message);

    if (!canSubmit || !cleanMessage) return;

    setBusy(true);

    try {
      const attachments = await uploadFiles();

      await replyToMySupportTicket(ticket.id, {
        message: cleanMessage,
        attachments,
      });

      toast.success("Reply sent");
      setMessage("");
      setFiles([]);
      onSent();
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "support-reply-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to send reply");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="svx-support-reply-form border-t border-[var(--color-border)] p-5 sm:p-6">
      <div className={`svx-support-reply-topline ${waitingForYou ? "is-needed" : ""}`}>
        <div className="svx-support-reply-title-block">
          <span>{waitingForYou ? "Your reply is needed" : "Reply to support"}</span>
          <p>
            {waitingForYou
              ? "Storvex support asked for more information. Reply here to continue."
              : "Keep the conversation in this ticket so support can see the full history."}
          </p>
        </div>

        <AsyncButton
          type="submit"
          loading={busy}
          disabled={!canSubmit || busy}
          className={primaryBtn(!canSubmit || busy)}
        >
          {canSubmit ? "Send reply" : "Write reply first"}
        </AsyncButton>
      </div>

      <textarea
        className="svx-support-reply-textarea min-h-[96px] w-full resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)] disabled:cursor-not-allowed disabled:opacity-60"
        placeholder={
          closed
            ? "This ticket is closed."
            : "Write your reply to Storvex support..."
        }
        value={message}
        disabled={closed || busy}
        onChange={(event) => setMessage(event.target.value)}
      />

      {!closed ? (
        <div className="svx-support-attachment-strip">
          <label className={cx(secondaryBtn(busy), "cursor-pointer")}>
            Add proof
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
            <div className="svx-support-selected-files">
              {files.map((file) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="svx-support-selected-file"
                >
                  <span>{file.name}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setFiles((current) => current.filter((item) => item !== file))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={cx("text-xs leading-5", mutedText())}>
              Optional screenshots, payment proof, or files.
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}


export default function SupportTicketDetail() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [closing, setClosing] = useState(false);

  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  const messages = ticket?.messages || [];
  const closed = ticket?.status === "CLOSED";
  const waitingForYou = String(ticket?.status || "").toUpperCase() === "WAITING_FOR_TENANT";

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function load({ silent = false } = {}) {
    if (!id) return;

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (!silent) setLoading(true);

    try {
      const data = await getMySupportTicketById(id);

      if (!mountedRef.current || requestRef.current !== requestId) return;

      setTicket(data?.ticket || null);
    } catch (error) {
      if (!mountedRef.current || requestRef.current !== requestId) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "support-detail-load-blocked" })) {
        toast.error(error?.message || "Failed to load support ticket");
      }

      setTicket(null);
    } finally {
      if (!mountedRef.current || requestRef.current !== requestId) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const subtitle = useMemo(() => {
    if (!ticket) return "Review this support conversation.";

    return `Created ${formatDate(ticket.createdAt)} · last message ${relativeTime(
      ticket.lastMessageAt
    )}`;
  }, [ticket]);

  async function handleClose() {
    if (!ticket?.id || closed) return;

    setClosing(true);

    try {
      await closeMySupportTicket(ticket.id);
      toast.success("Ticket closed");
      await load({ silent: false });
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "support-close-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to close ticket");
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!ticket) {
    return (
      <div className="svx-support-detail-page">
        <SectionHeading
          eyebrow="Support"
          title="Ticket not found"
          subtitle="This ticket may have been removed or you may not have access to it."
        />

        <Link to="/app/support" className={secondaryBtn()}>
          Back to support
        </Link>
      </div>
    );
  }

  return (
    <div className={`svx-support-detail-page ${waitingForYou ? "is-waiting-owner" : ""}`}>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <SectionHeading
            eyebrow="Support ticket"
            title={ticket.title || "Support ticket"}
            subtitle={subtitle}
          />

          <div className="flex flex-wrap gap-2">
            <Link to="/app/support" className={secondaryBtn()}>
              Back
            </Link>

            <AsyncButton loading={loading} onClick={() => load({ silent: false })} className={secondaryBtn()}>
              Refresh
            </AsyncButton>

            {!closed ? (
              <AsyncButton loading={closing} onClick={handleClose} className={successBtn(closing)}>
                Close ticket
              </AsyncButton>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <CategoryPill category={ticket.category} />
        </div>
      </section>

      <div className="svx-support-detail-grid">
        <main className="svx-support-detail-main">
          {waitingForYou ? (
            <section className="svx-support-owner-action-card">
              <div className="svx-support-owner-action-copy">
                <span>Action needed</span>
                <h2>Your reply is needed</h2>
                <p>
                  Storvex support asked for more information. Reply here so the support team can continue helping you.
                </p>
              </div>

              <ReplyForm ticket={ticket} onSent={() => load({ silent: false })} />
            </section>
          ) : null}

          <section className="svx-support-detail-conversation">
            <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className={cx("text-xl font-bold", strongText())}>
                    Conversation history
                  </div>
                  <div className={cx("mt-1.5 text-sm leading-6", mutedText())}>
                    Previous messages between your team and Storvex support.
                  </div>
                </div>

                <span className="inline-flex items-center self-start rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                  {formatNumber(messages.length)} message
                  {messages.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {messages.length ? (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              ) : (
                <EmptyConversation />
              )}
            </div>

            {!waitingForYou ? (
              <ReplyForm ticket={ticket} onSent={() => load({ silent: false })} />
            ) : null}
          </section>
        </main>

        <aside className="svx-support-detail-sidebar">
          <TicketInfoPanel ticket={ticket} />

          <div className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className={cx("text-base font-bold", strongText())}>
              What happens next?
            </div>

            <div className="mt-4 space-y-3">
              <div className={cx(softPanel(), "p-4")}>
                <div
                  className={cx(
                    "text-[11px] font-semibold uppercase tracking-[0.18em]",
                    softText()
                  )}
                >
                  Support rule
                </div>
                <div className={cx("mt-2.5 text-sm leading-6", mutedText())}>
                  Keep all replies and proof inside this ticket so the support
                  team can review the full history.
                </div>
              </div>

              {closed ? (
                <div className="svx-support-next-note">
                  This ticket is closed. Create a new ticket if you need more
                  help.
                </div>
              ) : (
                <div className="svx-support-next-note">
                  Reply here when support asks for more information, payment
                  proof, screenshots, or confirmation.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}