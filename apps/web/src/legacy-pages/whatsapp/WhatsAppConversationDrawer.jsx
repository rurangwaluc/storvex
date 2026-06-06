import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  listWhatsAppConversationMessages,
  replyToWhatsAppConversation,
  updateWhatsAppConversationStatus,
} from "../../services/whatsappInboxApi";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
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

function softPanel() {
  return "rounded-[18px] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "h-10 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]";
}

function successBadge() {
  return "bg-[#7cfcc6] text-[#0b3b2e]";
}

function infoBadge() {
  return "bg-[#57b5ff] text-[#06263d]";
}

function warningBadge() {
  return "bg-[#ff9f43] text-[#402100]";
}

function processBadge() {
  return "bg-[#ffe45e] text-[#4a4300]";
}

function neutralBadge() {
  return "bg-[var(--color-surface)] text-[var(--color-text-muted)]";
}

function ProtectionPill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? successBadge()
      : tone === "info"
      ? infoBadge()
      : tone === "warning"
      ? warningBadge()
      : tone === "process"
      ? processBadge()
      : neutralBadge();

  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-semibold",
        cls
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className={cx(softPanel(), "mx-3 my-3 px-4 py-8 text-center")}>
      <div className={cx("text-sm font-semibold", strongText())}>{title}</div>
      <div className={cx("mt-2 text-xs leading-5", mutedText())}>{text}</div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatTimeAgo(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  const diff = Date.now() - d.getTime();
  if (diff < 60 * 1000) return "Just now";

  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  return `${days}d ago`;
}

function normalizeMessage(raw) {
  return {
    id: String(raw?.id || ""),
    direction: String(raw?.direction || "INBOUND").toUpperCase(),
    type: String(raw?.type || "TEXT").toUpperCase(),
    textContent: String(raw?.textContent || ""),
    mediaUrl: String(raw?.mediaUrl || ""),
    messageId: String(raw?.messageId || ""),
    createdAt: raw?.createdAt || null,
    sentById: String(raw?.sentById || ""),
  };
}

function normalizeStaffOption(raw) {
  return {
    id: String(raw?.id || ""),
    name: String(raw?.name || ""),
    email: String(raw?.email || ""),
    role: String(raw?.role || "").toUpperCase(),
    isActive: typeof raw?.isActive === "boolean" ? raw.isActive : true,
  };
}

function roleLabel(role) {
  const v = String(role || "").toUpperCase();
  if (v === "OWNER") return "Owner";
  if (v === "MANAGER") return "Manager";
  if (v === "CASHIER") return "Cashier";
  if (v === "SELLER") return "Seller";
  if (v === "STOREKEEPER") return "Storekeeper";
  if (v === "TECHNICIAN") return "Technician";
  return "Staff";
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12a8 8 0 10-2.34 5.66M20 12V6m0 6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M22 2L15 22l-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssignIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="9.5" cy="7" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M20 8v6M17 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cx("transition-transform duration-200", open ? "rotate-180" : "")}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CustomerAvatar({ conversation }) {
  const label = String(
    conversation?.customer?.name || conversation?.customer?.phone || conversation?.phone || "?"
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-white/14 text-[11px] font-bold text-white ring-1 ring-white/20">
      {label}
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-2 px-2 py-2.5 sm:px-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className={cx("flex", i % 2 ? "justify-end" : "justify-start")}>
          <div
            className={cx(
              "max-w-[82%] rounded-[16px] px-3 py-2 sm:max-w-[78%]",
              i % 2
                ? "rounded-br-[5px] bg-[var(--color-primary-soft)]"
                : "rounded-bl-[5px] border border-[var(--color-border)] bg-[var(--color-card)]"
            )}
          >
            <div className="h-2.5 w-16 rounded bg-[var(--color-surface)]" />
            <div className="mt-2 h-3 w-36 rounded bg-[var(--color-surface)]" />
            <div className="mt-1.5 h-3 w-28 rounded bg-[var(--color-surface)]" />
            <div className="mt-2 ml-auto h-2.5 w-10 rounded bg-[var(--color-surface)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ item }) {
  const outbound = item.direction === "OUTBOUND";

  return (
    <div className={cx("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "relative max-w-[82%] rounded-[16px] px-3 py-2 sm:max-w-[78%]",
          outbound
            ? "rounded-br-[5px] bg-[var(--color-primary)] text-white"
            : "rounded-bl-[5px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)]"
        )}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={cx(
              "text-[9px] font-semibold uppercase tracking-[0.14em]",
              outbound ? "text-white/70" : "text-[var(--color-text-muted)]"
            )}
          >
            {outbound ? "Store" : "Customer"}
          </span>

          {item.type && item.type !== "TEXT" ? (
            <span
              className={cx(
                "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                outbound
                  ? "bg-white/12 text-white/80"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
              )}
            >
              {item.type}
            </span>
          ) : null}
        </div>

        <div
          className={cx(
            "mt-1 whitespace-pre-wrap break-words text-[14px] leading-[1.45]",
            outbound ? "text-white" : "text-[var(--color-text)]"
          )}
        >
          {item.textContent || "No text content"}
        </div>

        {item.mediaUrl ? (
          <div
            className={cx(
              "mt-1.5 break-all text-[11px] leading-5",
              outbound ? "text-white/75" : "text-[var(--color-text-muted)]"
            )}
          >
            {item.mediaUrl}
          </div>
        ) : null}

        <div className="mt-1 flex items-center justify-end">
          <span
            className={cx(
              "text-[10px]",
              outbound ? "text-white/70" : "text-[var(--color-text-muted)]"
            )}
          >
            {formatTimeAgo(item.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function AssignmentStrip({
  canManageAssignment,
  staffOptions,
  assignedUserId,
  assignedStaffName,
  assignedStaffRole,
  onAssign,
  onClear,
}) {
  const [nextUserId, setNextUserId] = useState(assignedUserId || "");
  const [assigning, setAssigning] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const normalizedStaff = useMemo(
    () => (Array.isArray(staffOptions) ? staffOptions.map(normalizeStaffOption) : []),
    [staffOptions]
  );

  useEffect(() => {
    setNextUserId(assignedUserId || "");
  }, [assignedUserId]);

  if (!canManageAssignment) return null;

  async function handleAssign() {
    if (!nextUserId) {
      toast.error("Choose a staff member first");
      return;
    }

    if (typeof onAssign !== "function") {
      toast.error("Assignment action is not connected yet");
      return;
    }

    try {
      setAssigning(true);
      await onAssign(nextUserId);
      setExpanded(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to assign conversation");
    } finally {
      setAssigning(false);
    }
  }

  async function handleClear() {
    if (typeof onClear !== "function") {
      toast.error("Clear action is not connected yet");
      return;
    }

    try {
      setClearing(true);
      await onClear();
      setNextUserId("");
      setExpanded(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to clear assignment");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 sm:px-4">
      <div className="flex items-center justify-between gap-3 rounded-[16px] bg-[var(--color-bg)]/70 px-3 py-2">
        <div className="min-w-0">
          <div className={cx("text-[11px] font-semibold uppercase tracking-[0.14em]", softText())}>
            Owner
          </div>
          <div className={cx("mt-0.5 truncate text-[13px] font-medium", strongText())}>
            {assignedStaffName || "Unassigned"}
          </div>
          <div className={cx("truncate text-[11px]", mutedText())}>
            {assignedStaffRole ? roleLabel(assignedStaffRole) : "No staff member selected"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex h-[32px] items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3 text-[12px] font-semibold text-[var(--color-text)] transition hover:opacity-90"
        >
          {expanded ? "Hide" : "Assign"}
          <ChevronDownIcon open={expanded} />
        </button>
      </div>

      {expanded ? (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <select
            className={inputClass()}
            value={nextUserId}
            onChange={(e) => setNextUserId(e.target.value)}
          >
            <option value="">Choose staff member</option>
            {normalizedStaff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name} • {roleLabel(staff.role)}
              </option>
            ))}
          </select>

          <AsyncButton
            type="button"
            loading={assigning}
            loadingText="Assigning..."
            onClick={handleAssign}
            className="inline-flex h-[34px] items-center justify-center rounded-full bg-[var(--color-surface-2)] px-3 text-[12px] font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save
          </AsyncButton>

          <AsyncButton
            type="button"
            loading={clearing}
            loadingText="Clearing..."
            onClick={handleClear}
            className="inline-flex h-[34px] items-center justify-center rounded-full bg-[var(--color-surface-2)] px-3 text-[12px] font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </AsyncButton>
        </div>
      ) : null}
    </div>
  );
}

export default function WhatsAppConversationDrawer({
  open,
  conversation,
  onClose,
  onConversationPatched,
  draftsByConversationId = {},
  staffOptions = [],
  canManageAssignment = false,
  onAssignConversation = null,
  onClearConversationAssignment = null,
}) {
  const nav = useNavigate();
  const mountedRef = useRef(true);
  const closeTimerRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(open);
  const [minimized, setMinimized] = useState(false);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const conversationId = conversation?.id || "";
  const linkedDraft = conversationId ? draftsByConversationId[conversationId] || null : null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setMinimized(false);
      requestAnimationFrame(() => setVisible(true));
      return;
    }

    setVisible(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setRendered(false);
    }, 220);
  }, [open]);

  useEffect(() => {
    if (!rendered) return undefined;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!sending && !minimized) void handleReply();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rendered, onClose, sending, minimized, replyText]);

  useEffect(() => {
    if (!open || !conversationId || minimized) return;
    void loadMessages();
  }, [open, conversationId, minimized]);

  useEffect(() => {
    if (!rendered || minimized) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, rendered, minimized]);

  useEffect(() => {
    if (!open || minimized) return;
    const timer = setTimeout(() => textareaRef.current?.focus(), 140);
    return () => clearTimeout(timer);
  }, [open, conversationId, minimized]);

  async function loadMessages(showToast = false) {
    try {
      if (!messages.length) setLoading(true);
      else setRefreshing(true);

      const res = await listWhatsAppConversationMessages(conversationId);
      if (!mountedRef.current) return;

      const list = Array.isArray(res?.messages)
        ? res.messages.map(normalizeMessage).filter(Boolean)
        : [];

      list.sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );

      setMessages(list);

      if (showToast) toast.success("Conversation refreshed");
    } catch (err) {
      console.error(err);
      if (!mountedRef.current) return;
      toast.error(err?.message || "Failed to load conversation");
      setMessages([]);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleReply() {
    const text = String(replyText || "").trim();

    if (!conversationId) {
      toast.error("Conversation not found");
      return;
    }

    if (!text) {
      toast.error("Reply message is required");
      return;
    }

    try {
      setSending(true);

      const res = await replyToWhatsAppConversation(conversationId, { text });

      const saved = res?.message
        ? normalizeMessage({
            id: res.message.id,
            direction: "OUTBOUND",
            type: "TEXT",
            textContent: text,
            mediaUrl: "",
            messageId: res.message.messageId || "",
            createdAt: res.message.createdAt || new Date().toISOString(),
            sentById: res.message.sentById || "",
          })
        : null;

      if (saved) {
        setMessages((prev) => [...prev, saved]);
      } else {
        await loadMessages();
      }

      setReplyText("");
      toast.success("Reply sent");

      onConversationPatched?.({
        ...conversation,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(nextStatus) {
    if (!conversationId) return;

    try {
      setStatusSaving(true);

      await updateWhatsAppConversationStatus(conversationId, { status: nextStatus });

      onConversationPatched?.({
        ...conversation,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });

      toast.success(nextStatus === "CLOSED" ? "Conversation closed" : "Conversation reopened");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to update conversation");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleAssignConversation(userId) {
    if (typeof onAssignConversation !== "function") return;

    const pickedStaff = Array.isArray(staffOptions)
      ? staffOptions.map(normalizeStaffOption).find((staff) => staff.id === String(userId))
      : null;

    await onAssignConversation(conversationId, userId);

    onConversationPatched?.({
      ...conversation,
      assignedToId: String(userId || ""),
      assignedTo: pickedStaff
        ? {
            id: pickedStaff.id,
            name: pickedStaff.name,
            email: pickedStaff.email,
            role: pickedStaff.role,
            isActive: pickedStaff.isActive,
          }
        : conversation?.assignedTo || null,
      updatedAt: new Date().toISOString(),
    });
  }

  async function handleClearConversationAssignment() {
    if (typeof onClearConversationAssignment !== "function") return;

    await onClearConversationAssignment(conversationId);

    onConversationPatched?.({
      ...conversation,
      assignedToId: "",
      assignedTo: null,
      updatedAt: new Date().toISOString(),
    });
  }

  const staffNameById = useMemo(() => {
    const map = {};
    for (const raw of Array.isArray(staffOptions) ? staffOptions : []) {
      const staff = normalizeStaffOption(raw);
      if (!staff.id) continue;
      map[staff.id] = staff.name || roleLabel(staff.role);
    }
    return map;
  }, [staffOptions]);

  const staffRoleById = useMemo(() => {
    const map = {};
    for (const raw of Array.isArray(staffOptions) ? staffOptions : []) {
      const staff = normalizeStaffOption(raw);
      if (!staff.id) continue;
      map[staff.id] = staff.role || "";
    }
    return map;
  }, [staffOptions]);

  const assignedStaffName =
    conversation?.assignedTo?.name ||
    (conversation?.assignedToId ? staffNameById[String(conversation.assignedToId)] || "" : "");

  const assignedStaffRole =
    conversation?.assignedTo?.role ||
    (conversation?.assignedToId ? staffRoleById[String(conversation.assignedToId)] || "" : "");

  const stats = useMemo(() => {
    const total = messages.length;
    const inbound = messages.filter((m) => m.direction === "INBOUND").length;
    const outbound = messages.filter((m) => m.direction === "OUTBOUND").length;
    return { total, inbound, outbound };
  }, [messages]);

  if (!rendered || !conversation) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      <button
        type="button"
        aria-label="Close conversation drawer"
        className={cx(
          "pointer-events-auto absolute inset-0 transition duration-200",
          visible ? "bg-black/20 opacity-100" : "bg-black/0 opacity-0"
        )}
        onClick={onClose}
      />

      <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-auto sm:right-4">
        <div
          className={cx(
            "pointer-events-auto ml-auto w-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl transition-all duration-200",
            minimized
              ? "max-w-[360px] rounded-[22px]"
              : "max-w-[620px] rounded-[22px] sm:max-w-[660px]",
            visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          )}
        >
          <div className="bg-[var(--color-primary)] px-3 py-1.5 text-white sm:px-4">
            <div className="flex items-center gap-2.5">
              <CustomerAvatar conversation={conversation} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold leading-5">
                      {conversation.customer?.name || conversation.phone || "Unknown customer"}
                    </div>
                    <div className="truncate text-[11px] leading-4 text-white/75">
                      {conversation.customer?.phone || conversation.phone || "—"}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMinimized((v) => !v)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/16"
                      aria-label={minimized ? "Expand chat" : "Minimize chat"}
                    >
                      <MinimizeIcon />
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/16"
                      aria-label="Close chat"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <ProtectionPill tone={conversation.status === "OPEN" ? "success" : "warning"}>
                    {conversation.status === "OPEN" ? "Open" : "Closed"}
                  </ProtectionPill>

                  <ProtectionPill tone="info">{stats.total} messages</ProtectionPill>

                  {assignedStaffName ? (
                    <ProtectionPill tone="info">{assignedStaffName}</ProtectionPill>
                  ) : null}

                  {linkedDraft ? (
                    <ProtectionPill tone="process">
                      Draft #{String(linkedDraft.id).slice(-6).toUpperCase()}
                    </ProtectionPill>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {!minimized ? (
            <>
              <AssignmentStrip
                canManageAssignment={canManageAssignment}
                staffOptions={staffOptions}
                assignedUserId={conversation.assignedToId || ""}
                assignedStaffName={assignedStaffName}
                assignedStaffRole={assignedStaffRole}
                onAssign={handleAssignConversation}
                onClear={handleClearConversationAssignment}
              />

              <div className="border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 sm:px-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <AsyncButton
                    type="button"
                    loading={refreshing}
                    loadingText=""
                    onClick={() => loadMessages(true)}
                    className="inline-flex h-[34px] items-center justify-center rounded-full bg-[var(--color-surface-2)] px-3 text-[12px] font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className={cx("mr-1.5 inline-flex", refreshing ? "animate-spin" : "")}>
                      <RefreshIcon />
                    </span>
                    Refresh
                  </AsyncButton>

                  <AsyncButton
                    type="button"
                    loading={statusSaving}
                    loadingText=""
                    onClick={() => handleStatusChange("OPEN")}
                    className="inline-flex h-[34px] items-center justify-center rounded-full bg-[var(--color-surface-2)] px-3 text-[12px] font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={conversation.status === "OPEN"}
                  >
                    Reopen
                  </AsyncButton>

                  <AsyncButton
                    type="button"
                    loading={statusSaving}
                    loadingText=""
                    onClick={() => handleStatusChange("CLOSED")}
                    className="inline-flex h-[34px] items-center justify-center rounded-full bg-[var(--color-surface-2)] px-3 text-[12px] font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={conversation.status === "CLOSED"}
                  >
                    Close
                  </AsyncButton>

                  {linkedDraft ? (
                    <button
                      type="button"
                      onClick={() => nav("/app/whatsapp/drafts")}
                      className="inline-flex h-[34px] items-center justify-center rounded-full bg-[var(--color-surface-2)] px-3 text-[12px] font-semibold text-[var(--color-text)] transition hover:opacity-90"
                    >
                      Draft
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="h-[220px] overflow-y-auto bg-[var(--color-bg)] px-2 py-2.5 sm:h-[245px] sm:px-3">
                {loading ? (
                  <MessageSkeleton />
                ) : messages.length === 0 ? (
                  <EmptyState
                    title="No messages yet"
                    text="This conversation exists, but no messages were returned."
                  />
                ) : (
                  <div className="space-y-2">
                    {messages.map((item) => (
                      <MessageBubble key={item.id} item={item} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 sm:px-4">
                <div className={cx(softPanel(), "p-2.5")}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <textarea
                        ref={textareaRef}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type a message"
                        rows={1}
                        className="max-h-32 min-h-[46px] w-full resize-none rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm leading-5 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]"
                        onInput={(e) => {
                          e.target.style.height = "46px";
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 sm:shrink-0">
                      {replyText ? (
                        <button
                          type="button"
                          onClick={() => setReplyText("")}
                          className="inline-flex h-11 items-center justify-center rounded-full px-3 text-xs font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-card)] hover:text-[var(--color-text)] disabled:opacity-60"
                          disabled={sending}
                        >
                          Clear
                        </button>
                      ) : null}

                      <AsyncButton
                        type="button"
                        loading={sending}
                        loadingText=""
                        onClick={handleReply}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Send message"
                      >
                        <SendIcon />
                      </AsyncButton>
                    </div>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] leading-5 text-[var(--color-text-muted)]">
                  <span>Ctrl/Cmd + Enter</span>
                  <span className="truncate">
                    {formatDateTime(conversation.updatedAt || conversation.createdAt)}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}