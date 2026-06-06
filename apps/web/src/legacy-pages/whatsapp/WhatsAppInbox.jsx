import { useEffect, useMemo, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { searchProducts } from "../../services/inventoryApi";
import {
  assignWhatsAppConversationOwner,
  clearWhatsAppConversationOwner,
  createWhatsAppAccount,
  createWhatsAppBroadcast,
  createWhatsAppPromotion,
  createWhatsAppSaleDraft,
  deleteWhatsAppPromotion,
  finalizeWhatsAppSaleDraft,
  listAssignableWhatsAppStaff,
  listWhatsAppAccounts,
  listWhatsAppBroadcasts,
  listWhatsAppConversationMessages,
  listWhatsAppConversations,
  listWhatsAppPromotions,
  listWhatsAppSaleDrafts,
  queueWhatsAppBroadcast,
  replyToWhatsAppConversation,
  sendWhatsAppBroadcastNow,
  setWhatsAppAccountActive,
  updateWhatsAppAccount,
  updateWhatsAppConversationStatus,
  updateWhatsAppPromotion,
} from "../../services/whatsappApi";

const WHATSAPP_WORKSPACE_ROLES = [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "SELLER",
  "STOREKEEPER",
  "TECHNICIAN",
];

const WHATSAPP_MANAGER_ROLES = ["OWNER", "MANAGER"];
const DEFAULT_MESSAGE_FORMAT = "promo_template";
const DEFAULT_MESSAGE_LANGUAGE = "en_US";
const PROMOTION_LIST_LIMIT = 4;
const BROADCAST_LIST_LIMIT = 3;

const AUDIENCE_OPTIONS = [
  {
    value: "ALL_OPTED_IN",
    label: "All WhatsApp customers",
    helper: "Customers who can receive WhatsApp updates.",
  },
  {
    value: "CREDIT_CUSTOMERS",
    label: "Credit customers",
    helper: "Customers with credit purchase history.",
  },
  {
    value: "OVERDUE_CREDIT_CUSTOMERS",
    label: "Overdue credit customers",
    helper: "Customers who need payment follow-up.",
  },
  {
    value: "PRODUCT_BUYERS",
    label: "Product buyers",
    helper: "Customers connected to the selected promotion product.",
  },
];

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function normalizeRole(value) {
  return String(value || "").trim().toUpperCase();
}

function getCurrentUserRole() {
  try {
    const token = localStorage.getItem("tenantToken") || localStorage.getItem("token");
    if (!token) return "";
    const decoded = jwtDecode(token);
    return normalizeRole(decoded?.role || decoded?.roles?.[0] || "");
  } catch {
    return "";
  }
}

function canManageWhatsAppTools(role) {
  return WHATSAPP_MANAGER_ROLES.includes(normalizeRole(role));
}

function canUseWhatsAppInbox(role) {
  return WHATSAPP_WORKSPACE_ROLES.includes(normalizeRole(role));
}

function money(value) {
  const n = Number(value || 0);
  return `${Math.round(Number.isFinite(n) ? n : 0).toLocaleString("en-US")} RWF`;
}

function initials(value) {
  const text = String(value || "").trim();
  if (!text) return "WA";
  return (
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "WA"
  );
}

function cleanPhone(value) {
  return String(value || "").trim() || "No phone";
}

function normalizeProductList(data) {
  const raw = data?.products || data?.data?.products || data?.data || data?.items || data || [];
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => ({
    id: String(item.id || ""),
    name: String(item.name || "Product"),
    sku: String(item.sku || ""),
    serial: String(item.serial || ""),
    sellPrice: Number(item.sellPrice || item.price || 0),
    stockQty: Number(item.stockQty || item.availableQty || item.branchQty || 0),
  }));
}

function safeError(err, fallback) {
  const code = String(err?.response?.data?.code || "").toUpperCase();

  if (code === "WHATSAPP_ACCOUNT_NOT_FOUND") return "No active WhatsApp store number was found.";
  if (code === "WHATSAPP_ACCOUNT_PHONE_NUMBER_ID_MISSING") return "The WhatsApp store number needs setup before sending.";
  if (code === "WHATSAPP_ACCOUNT_ACCESS_TOKEN_MISSING") return "The WhatsApp store number needs setup before sending.";
  if (code === "PRODUCT_ID_REQUIRED_FOR_TARGET") return "This audience needs a promotion connected to a product.";
  if (code === "NO_BROADCAST_RECIPIENTS") return "No matching customers were found for this audience.";
  if (code === "PROMOTION_NOT_FOUND") return "The selected promotion could not be found.";
  if (code === "CASH_DRAWER_CLOSED") return "Open the cash drawer before completing this sale.";

  return err?.response?.data?.message || err?.message || fallback;
}

function statusLabel(value) {
  const status = String(value || "").trim().toUpperCase();
  if (status === "DRAFT") return "Draft";
  if (status === "QUEUED") return "Queued";
  if (status === "SENT") return "Sent";
  if (status === "FAILED") return "Needs attention";
  if (status === "OPEN") return "Open";
  if (status === "CLOSED") return "Closed";
  if (status === "ACTIVE") return "Active";
  if (status === "PAID") return "Paid";
  if (status === "PARTIAL") return "Partial";
  if (status === "CASH") return "Cash";
  if (status === "CREDIT") return "Credit";
  return status || "Record";
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDay(value) {
  if (!value) return "Today";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Today";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function dateLabel(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function customerName(conversation) {
  return conversation?.customer?.name || conversation?.phone || conversation?.assignedTo?.name || "WhatsApp customer";
}

function latestPreview(conversation) {
  const msg = conversation?.latestMessage;
  if (!msg) return "No messages yet";
  return `${msg.direction === "OUTBOUND" ? "You: " : ""}${msg.textContent || "Message"}`;
}

function unreadCount(conversation, active) {
  if (active) return 0;
  const explicit =
    conversation?.unreadCount ??
    conversation?.unreadMessages ??
    conversation?.unreadMessageCount ??
    conversation?.unseenCount ??
    null;
  if (explicit === null || explicit === undefined) return 0;
  const n = Number(explicit);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function markConversationOpened(conversation) {
  if (!conversation) return conversation;
  return {
    ...conversation,
    unreadCount: 0,
    unreadMessages: 0,
    unreadMessageCount: 0,
    unseenCount: 0,
  };
}

function toneForStatus(status) {
  const value = String(status || "").toUpperCase();
  if (["SENT", "PAID", "ACTIVE", "READY", "OPEN"].includes(value)) return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
  if (["PARTIAL", "QUEUED", "DRAFT"].includes(value)) return "bg-amber-50 text-amber-700";
  if (["FAILED", "OVERDUE", "MISSING"].includes(value)) return "bg-rose-50 text-rose-700";
  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function Pill({ children, className = "" }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black", className)}>
      {children}
    </span>
  );
}

function Icon({ children, active = false, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        "flex h-10 w-10 items-center justify-center rounded-lg text-lg transition",
        active ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/70 p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-2xl">💬</div>
        <h3 className="mt-4 text-lg font-black text-[var(--color-text)]">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">{body}</p>
      </div>
    </div>
  );
}

function ConversationRow({ conversation, active, draft, onClick }) {
  const name = customerName(conversation);
  const count = unreadCount(conversation, active);
  const needsLocation = !conversation.branchId;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group w-full border-l-2 px-4 py-3 text-left transition duration-200",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/90"
          : "border-transparent hover:bg-[var(--color-surface-2)]/85",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-[var(--color-primary-contrast)] shadow-sm ring-1 ring-white/5",
            active ? "bg-[var(--color-primary)]" : "bg-[var(--color-primary)]/90",
          )}
        >
          {initials(name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-[-0.01em] text-[var(--color-text)]">{name}</div>
              <div
                className={cx(
                  "mt-1 truncate text-xs leading-5",
                  count ? "font-black text-[var(--color-text)]" : "font-semibold text-[var(--color-text-muted)]",
                )}
              >
                {latestPreview(conversation)}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[11px] font-bold text-[var(--color-text-muted)]">{formatTime(conversation.updatedAt)}</div>
              {count > 0 ? (
                <div className="ml-auto mt-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[10px] font-black text-[var(--color-primary-contrast)] shadow-sm">
                  {count > 99 ? "99+" : count}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill className={cx("border border-[var(--color-border)] px-2 py-0.5 text-[10px]", toneForStatus(conversation.status))}>
              {statusLabel(conversation.status)}
            </Pill>
            {draft ? (
              <Pill className="border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-600 dark:text-amber-300">
                Draft sale
              </Pill>
            ) : null}
            {needsLocation ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/15 bg-amber-500/7 px-2 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500/80" />
                Location needed
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message }) {
  const outbound = message.direction === "OUTBOUND";

  return (
    <div className={cx("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[min(74%,720px)] border px-4 py-3 shadow-[0_10px_26px_rgba(0,0,0,0.10)]",
          outbound
            ? "rounded-2xl rounded-br-md border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] text-[var(--color-text)]"
            : "rounded-2xl rounded-bl-md border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)]",
        )}
      >
        <div className="whitespace-pre-wrap text-[14px] font-semibold leading-6 tracking-[-0.005em]">
          {message.textContent || "Message"}
        </div>
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          {formatTime(message.createdAt)}
          {outbound ? <span className="text-[var(--color-primary)]">✓</span> : null}
        </div>
      </div>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="space-y-5 p-4">
      <div className="mx-auto h-8 w-36 animate-pulse rounded-full bg-[var(--color-card)]" />
      <div className="h-16 w-2/3 animate-pulse rounded-lg bg-[var(--color-card)]" />
      <div className="ml-auto h-20 w-1/2 animate-pulse rounded-lg bg-[var(--color-primary-soft)]" />
      <div className="h-16 w-3/5 animate-pulse rounded-lg bg-[var(--color-card)]" />
    </div>
  );
}

function DraftSummaryCard({ draft, onFinalize, finalizing = false }) {
  if (!draft) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/75 p-4">
        <div className="text-sm font-black text-[var(--color-text)]">No linked draft sale</div>
        <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
          Create a draft only after the customer asks to buy.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
      <Pill className="border border-amber-500/20 bg-amber-500/15 text-amber-700 dark:text-amber-300">Draft pending</Pill>
      <div className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)]">{money(draft.total)}</div>
      <div className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">
        {draft.items?.length || 0} item{draft.items?.length === 1 ? "" : "s"} · {statusLabel(draft.saleType)} sale
      </div>
      <AsyncButton onClick={onFinalize} loading={finalizing} loadingText="Finalizing..." className="mt-4 w-full">
        Finalize sale
      </AsyncButton>
    </div>
  );
}

function WorkspaceTop({ activeTab, setActiveTab, canManageTools, refreshing, onRefresh }) {
  const tabs = [
    ["inbox", "Inbox"],
    ["drafts", "Drafts"],
    ...(canManageTools ? [["broadcasts", "Broadcasts"], ["setup", "Setup"]] : []),
  ];

  return (
    <header className="flex h-12 shrink-0 items-center justify-end border-b border-[var(--color-border)] bg-[var(--color-card)] px-3">
      <nav className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-1">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cx(
              "h-9 rounded-lg px-3.5 text-xs font-black transition duration-200",
              activeTab === key
                ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]",
            )}
          >
            {label}
          </button>
        ))}

        <button
          type="button"
          onClick={onRefresh}
          className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 text-xs font-black text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </nav>
    </header>
  );
}

function LeftRail({ activeTab, setActiveTab, canManageTools }) {
  return (
    <aside className="flex w-[64px] shrink-0 flex-col items-center border-r border-[var(--color-border)] bg-[var(--color-card)] py-4">
      <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)] text-xl font-black text-[var(--color-primary-contrast)]">W</div>
      <div className="flex flex-1 flex-col items-center gap-3">
        <Icon title="Inbox" active={activeTab === "inbox"} onClick={() => setActiveTab("inbox")}>💬</Icon>
        <Icon title="Drafts" active={activeTab === "drafts"} onClick={() => setActiveTab("drafts")}>🧾</Icon>
        {canManageTools ? <Icon title="Broadcasts" active={activeTab === "broadcasts"} onClick={() => setActiveTab("broadcasts")}>📣</Icon> : null}
        {canManageTools ? <Icon title="Setup" active={activeTab === "setup"} onClick={() => setActiveTab("setup")}>⚙️</Icon> : null}
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-sm font-black text-[var(--color-text)]">LR</div>
    </aside>
  );
}

function ConversationList({ conversations, drafts, selectedId, onSelect, search, setSearch }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((item) => {
      if (!q) return true;
      return [customerName(item), item.phone, item.latestMessage?.textContent, item.assignedTo?.name]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [conversations, search]);

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="border-b border-[var(--color-border)] p-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">🔍</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations..."
            className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] pl-11 pr-4 text-sm font-semibold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)]"
          />
        </div>

        <div className="mt-3 flex items-center justify-between border-b border-[var(--color-border)] pb-2">
          <div className="text-sm font-black text-[var(--color-primary)]">Inbox</div>
          <Pill className="bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            {conversations.length}
          </Pill>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {filtered.length ? (
          filtered.map((conversation) => {
            const draft = drafts.find((item) => item.conversationId === conversation.id || (item.customerId && item.customerId === conversation.customerId));
            return (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                draft={draft}
                active={conversation.id === selectedId}
                onClick={() => onSelect(conversation)}
              />
            );
          })
        ) : (
          <div className="p-4 text-sm font-semibold text-[var(--color-text-muted)]">No conversations found.</div>
        )}
      </div>
    </aside>
  );
}

function CustomerProfile({ conversation, draft, canManageTools, onCreateDraft, onAssign, onToggleStatus, onFinalize, finalizing }) {
  return (
    <aside className="w-[330px] shrink-0 overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-card)] p-4 [scrollbar-width:thin]">
      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">Customer profile</div>

      {conversation ? (
        <>
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] text-base font-black text-[var(--color-primary-contrast)] shadow-sm">
                {initials(customerName(conversation))}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-[var(--color-text)]">{customerName(conversation)}</div>
                <div className="mt-1 truncate text-xs font-bold text-[var(--color-text-muted)]">{cleanPhone(conversation.phone)}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/45 p-1">
            {[
              ["Name", customerName(conversation)],
              ["Phone", cleanPhone(conversation.phone)],
              ["Assigned to", conversation.assignedTo?.name || "Unassigned"],
              ["Selling location", conversation.branchId ? "Ready" : "Location needed"],
              ["WhatsApp", conversation.customer?.whatsappOptIn === false ? "Not opted in" : "Opted in"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5">
                <div className="text-xs font-bold text-[var(--color-text-muted)]">{label}</div>
                <div className="max-w-[178px] text-right text-xs font-black leading-5 text-[var(--color-text)]">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="mb-3 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">Linked Draft Sale</div>
            <DraftSummaryCard draft={draft} onFinalize={onFinalize} finalizing={finalizing} />
          </div>

          <div className="mt-4">
            <div className="mb-3 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">Quick Actions</div>
            <div className="space-y-2">
              <button type="button" onClick={onCreateDraft} className="h-11 w-full rounded-xl bg-[var(--color-primary)] text-sm font-black text-[var(--color-primary-contrast)] shadow-sm transition hover:brightness-110">
                Create New Draft
              </button>
              {canManageTools ? (
                <button type="button" onClick={onAssign} className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm font-black text-[var(--color-text)] transition hover:border-[var(--color-primary)]">
                  Assign
                </button>
              ) : null}
              <button type="button" onClick={onToggleStatus} className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm font-black text-[var(--color-text)] transition hover:border-[var(--color-primary)]">
                {conversation.status === "OPEN" ? "Close" : "Reopen"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">Select a customer conversation to see details and quick actions.</p>
      )}
    </aside>
  );
}

function ChatPanel({
  conversation,
  messages,
  messagesConversationId,
  messagesLoading,
  showMessagesSkeleton,
  replyText,
  setReplyText,
  sending,
  onSend,
  onCreateDraft,
  onAssign,
  onToggleStatus,
  canManageTools,
  messagesEndRef,
}) {
  if (!conversation) {
    return <main className="flex min-w-0 flex-1 items-center justify-center bg-[var(--color-surface-2)]"><EmptyState title="Choose a conversation" body="Pick a customer on the left to view messages, reply, and create a sale draft." /></main>;
  }

  const hasCurrentMessages = messagesConversationId === conversation.id;
  const visibleMessages = hasCurrentMessages ? messages : [];
  const openingDifferentConversation = messagesLoading && !hasCurrentMessages;

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-[var(--color-surface-2)]">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-black text-[var(--color-primary-contrast)] shadow-sm">
            {initials(customerName(conversation))}
          </div>
          <div>
            <div className="text-base font-black tracking-[-0.02em] text-[var(--color-text)]">{customerName(conversation)}</div>
            <div className="text-xs font-semibold text-[var(--color-text-muted)]">
              <span className="text-[var(--color-primary)]">●</span> {statusLabel(conversation.status)} · {cleanPhone(conversation.phone)}
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Pill className={cx("border border-[var(--color-border)]", toneForStatus(conversation.status))}>
            {statusLabel(conversation.status)}
          </Pill>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--color-text) 7%, transparent) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      >
        {messagesLoading && hasCurrentMessages && visibleMessages.length > 0 ? (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)]/95 px-3 py-1.5 text-[11px] font-black text-[var(--color-text-muted)] shadow-sm backdrop-blur">
            Loading conversation…
          </div>
        ) : null}

        <div className="mb-6 text-center">
          <Pill className="border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] shadow-sm">{formatDay(visibleMessages[0]?.createdAt || conversation.createdAt)}</Pill>
        </div>

        {(showMessagesSkeleton || openingDifferentConversation) && visibleMessages.length === 0 ? (
          <ChatSkeleton />
        ) : visibleMessages.length ? (
          <div className="space-y-4">
            {visibleMessages.map((message) => <MessageBubble key={message.id} message={message} />)}
            <div ref={messagesEndRef} />
          </div>
        ) : messagesLoading ? (
          <div className="flex min-h-[320px] items-center justify-center"><div className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm font-black text-[var(--color-text)] shadow-sm">Opening conversation…</div></div>
        ) : (
          <EmptyState title="No customer messages yet" body="This conversation is ready. New WhatsApp messages from this customer will appear here." />
        )}
      </div>

      <form onSubmit={onSend} className="flex h-14 shrink-0 items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-card)] px-4">
        <input
          value={replyText}
          onChange={(event) => setReplyText(event.target.value)}
          placeholder={`Send a reply to ${customerName(conversation)}...`}
          className="h-11 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-semibold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)]"
        />
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">📎</button>
        <AsyncButton type="submit" loading={sending} loadingText="Sending...">Send</AsyncButton>
      </form>
    </main>
  );
}

function DraftsWorkspace({ drafts, conversations, onOpenConversation, onFinalize, finalizingDraftId }) {
  const totalValue = drafts.reduce((sum, draft) => sum + Number(draft.total || 0), 0);

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-surface-2)] p-4 [scrollbar-width:thin]">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">WhatsApp orders</div>
          <h2 className="mt-2 text-2xl font-black text-[var(--color-text)]">Draft sales waiting for action</h2>
          <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">Customer orders prepared from WhatsApp conversations.</p>
        </div>
        <Pill className="bg-[var(--color-card)] text-[var(--color-text-muted)] shadow-sm">{money(totalValue)}</Pill>
      </div>

      {drafts.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {drafts.map((draft) => {
            const conversation = conversations.find((item) => item.id === draft.conversationId) || null;
            return (
              <article key={draft.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Pill className={toneForStatus(draft.status || "DRAFT")}>{statusLabel(draft.status || "DRAFT")}</Pill>
                    <h3 className="mt-4 text-lg font-black text-[var(--color-text)]">{draft.customer?.name || draft.conversation?.phone || "WhatsApp customer"}</h3>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">{cleanPhone(draft.customer?.phone || draft.conversation?.phone)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[var(--color-text)]">{money(draft.total)}</div>
                    <div className="text-xs font-bold text-[var(--color-text-muted)]">{draft.items?.length || 0} items</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <AsyncButton onClick={() => onFinalize(draft)} loading={finalizingDraftId === draft.id} loadingText="Finalizing...">Finalize sale</AsyncButton>
                  {conversation ? <button type="button" onClick={() => onOpenConversation(conversation)} className="h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-black text-[var(--color-text)]">Open conversation</button> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : <EmptyState title="No WhatsApp draft sales" body="When a customer asks to buy through WhatsApp, staff can create a draft sale and finalize it from here." />}
    </div>
  );
}

function BroadcastsWorkspace({ accounts, promotions, broadcasts, onRefresh }) {
  const [promotionTitle, setPromotionTitle] = useState("");
  const [promotionMessage, setPromotionMessage] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const [targetMode, setTargetMode] = useState("ALL_OPTED_IN");
  const [savingPromotion, setSavingPromotion] = useState(false);
  const [savingBroadcast, setSavingBroadcast] = useState(false);
  const [promotionLimit, setPromotionLimit] = useState(PROMOTION_LIST_LIMIT);
  const [broadcastLimit, setBroadcastLimit] = useState(BROADCAST_LIST_LIMIT);
  const [busyBroadcastId, setBusyBroadcastId] = useState("");

  async function savePromotion(event) {
    event.preventDefault();
    if (!promotionTitle.trim()) return toast.error("Promotion title is required");
    if (!promotionMessage.trim()) return toast.error("Customer message is required");
    setSavingPromotion(true);
    try {
      await createWhatsAppPromotion({ title: promotionTitle.trim(), message: promotionMessage.trim(), productId: null });
      toast.success("Promotion created");
      setPromotionTitle("");
      setPromotionMessage("");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "Promotion could not be saved"));
    } finally {
      setSavingPromotion(false);
    }
  }

  async function saveBroadcast(event) {
    event.preventDefault();
    if (!promotionId) return toast.error("Choose a promotion first");
    const selectedPromotion = promotions.find((item) => item.id === promotionId);
    setSavingBroadcast(true);
    try {
      await createWhatsAppBroadcast({
        accountId: accounts[0]?.id || undefined,
        promotionId,
        templateName: DEFAULT_MESSAGE_FORMAT,
        languageCode: DEFAULT_MESSAGE_LANGUAGE,
        targeting: {
          mode: targetMode,
          branchId: null,
          productId: targetMode === "PRODUCT_BUYERS" ? selectedPromotion?.productId || null : null,
          customerIds: [],
        },
      });
      toast.success("Broadcast draft created");
      setPromotionId("");
      setTargetMode("ALL_OPTED_IN");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "Broadcast could not be created"));
    } finally {
      setSavingBroadcast(false);
    }
  }

  async function sendBroadcast(id) {
    setBusyBroadcastId(id);
    try {
      const result = await sendWhatsAppBroadcastNow(id, { limit: 50, targeting: { mode: "ALL_OPTED_IN" } });
      toast.success(result.summary?.delivered ? "Broadcast sent" : "Broadcast checked");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "Broadcast could not be sent"));
    } finally {
      setBusyBroadcastId("");
    }
  }

  async function queueBroadcast(id) {
    setBusyBroadcastId(id);
    try {
      await queueWhatsAppBroadcast(id);
      toast.success("Broadcast queued");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "Broadcast could not be queued"));
    } finally {
      setBusyBroadcastId("");
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-surface-2)] p-4 [scrollbar-width:thin]">
      <div className="mb-4">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">Customer growth</div>
        <h2 className="mt-2 text-2xl font-black text-[var(--color-text)]">Promotions and broadcasts</h2>
        <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">Create customer offers, choose the audience, and send through the store WhatsApp number.</p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <form onSubmit={savePromotion} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
            <h3 className="text-lg font-black text-[var(--color-text)]">Create promotion</h3>
            <input value={promotionTitle} onChange={(event) => setPromotionTitle(event.target.value)} placeholder="Weekend laptop offer" className="mt-4 h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-semibold outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)]" />
            <textarea value={promotionMessage} onChange={(event) => setPromotionMessage(event.target.value)} placeholder="Write the customer message..." rows={4} className="mt-3 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)]" />
            <AsyncButton type="submit" loading={savingPromotion} loadingText="Saving..." className="mt-3 w-full">Create promotion</AsyncButton>
          </form>

          <form onSubmit={saveBroadcast} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
            <h3 className="text-lg font-black text-[var(--color-text)]">Create broadcast</h3>
            <select value={promotionId} onChange={(event) => setPromotionId(event.target.value)} className="mt-4 h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-black text-[var(--color-text)] outline-none">
              <option value="">Choose promotion</option>
              {promotions.map((promotion) => <option key={promotion.id} value={promotion.id}>{promotion.title}</option>)}
            </select>
            <div className="mt-3 grid gap-2">
              {AUDIENCE_OPTIONS.map((option) => (
                <button key={option.value} type="button" onClick={() => setTargetMode(option.value)} className={cx("rounded-lg border p-3 text-left", targetMode === option.value ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-border)] bg-[var(--color-surface-2)]")}> 
                  <div className="text-sm font-black text-[var(--color-text)]">{option.label}</div>
                  <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">{option.helper}</div>
                </button>
              ))}
            </div>
            <AsyncButton type="submit" loading={savingBroadcast} loadingText="Creating..." className="mt-3 w-full">Create broadcast</AsyncButton>
          </form>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between"><h3 className="text-lg font-black text-[var(--color-text)]">Promotions</h3><Pill className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">{promotions.length}</Pill></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {promotions.slice(0, promotionLimit).map((promotion) => (
                <article key={promotion.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                  <div className="flex justify-between gap-3"><div className="font-black text-[var(--color-text)]">{promotion.title}</div><Pill className={toneForStatus(promotion.sentAt ? "SENT" : "DRAFT")}>{promotion.sentAt ? "Sent" : "Draft"}</Pill></div>
                  <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">{promotion.message || "No message"}</p>
                  <div className="mt-3 text-xs font-black text-[var(--color-text-muted)]">Used in {Number(promotion.usage?.broadcastCount || 0).toLocaleString()} broadcast(s)</div>
                </article>
              ))}
            </div>
            {promotions.length > promotionLimit ? <button type="button" onClick={() => setPromotionLimit((v) => v + PROMOTION_LIST_LIMIT)} className="mt-4 h-11 rounded-lg border border-[var(--color-border)] px-4 text-sm font-black text-[var(--color-text)]">Load more promotions</button> : null}
          </section>

          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between"><h3 className="text-lg font-black text-[var(--color-text)]">Broadcasts</h3><Pill className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">{broadcasts.length}</Pill></div>
            <div className="mt-4 space-y-3">
              {broadcasts.slice(0, broadcastLimit).map((broadcast) => (
                <article key={broadcast.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><Pill className={toneForStatus(broadcast.status)}>{statusLabel(broadcast.status)}</Pill><div className="mt-3 font-black text-[var(--color-text)]">{broadcast.promotion?.title || "Customer broadcast"}</div><p className="mt-1 line-clamp-2 text-xs font-semibold text-[var(--color-text-muted)]">{broadcast.promotion?.message || "No promotion message attached"}</p></div>
                    <div className="grid grid-cols-2 gap-2 text-center"><div className="rounded-lg bg-[var(--color-card)] px-4 py-3"><div className="text-[10px] font-black text-[var(--color-text-muted)]">CUSTOMERS</div><div className="font-black">{Number(broadcast.recipientCount || 0)}</div></div><div className="rounded-lg bg-[var(--color-card)] px-4 py-3"><div className="text-[10px] font-black text-[var(--color-text-muted)]">SENT</div><div className="font-black">{Number(broadcast.deliveredCount || 0)}</div></div></div>
                  </div>
                  <div className="mt-3 flex gap-2"><AsyncButton onClick={() => queueBroadcast(broadcast.id)} loading={busyBroadcastId === broadcast.id} loadingText="Working..." variant="secondary">Queue</AsyncButton><AsyncButton onClick={() => sendBroadcast(broadcast.id)} loading={busyBroadcastId === broadcast.id} loadingText="Sending...">Send now</AsyncButton></div>
                </article>
              ))}
            </div>
            {broadcasts.length > broadcastLimit ? <button type="button" onClick={() => setBroadcastLimit((v) => v + BROADCAST_LIST_LIMIT)} className="mt-4 h-11 rounded-lg border border-[var(--color-border)] px-4 text-sm font-black text-[var(--color-text)]">Load more broadcasts</button> : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function SetupWorkspace({ accounts, onRefresh }) {
  const account = accounts[0] || null;
  const [businessName, setBusinessName] = useState(account?.businessName || "");
  const [phoneNumber, setPhoneNumber] = useState(account?.phoneNumber || "");
  const [phoneNumberId, setPhoneNumberId] = useState(account?.phoneNumberId || "");
  const [wabaId, setWabaId] = useState(account?.wabaId || "");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setBusinessName(account?.businessName || "");
    setPhoneNumber(account?.phoneNumber || "");
    setPhoneNumberId(account?.phoneNumberId || "");
    setWabaId(account?.wabaId || "");
    setAccessToken("");
  }, [account?.id]);

  async function save(event) {
    event.preventDefault();
    if (!phoneNumber.trim()) return toast.error("Store WhatsApp number is required");
    setSaving(true);
    try {
      const payload = { businessName: businessName.trim(), phoneNumber: phoneNumber.trim(), phoneNumberId: phoneNumberId.trim() || null, wabaId: wabaId.trim() || null, ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}) };
      if (account?.id) await updateWhatsAppAccount(account.id, payload);
      else await createWhatsAppAccount(payload);
      toast.success("WhatsApp connection saved");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "WhatsApp connection failed"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!account?.id) return;
    setToggling(true);
    try {
      await setWhatsAppAccountActive(account.id, !account.isActive);
      toast.success(account.isActive ? "WhatsApp paused" : "WhatsApp activated");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "Status update failed"));
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-surface-2)] p-4 [scrollbar-width:thin]">
      <div className="mb-4"><div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">Connection</div><h2 className="mt-2 text-2xl font-black text-[var(--color-text)]">WhatsApp connection</h2><p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">Connect one store WhatsApp number. Customers message one number; Storvex keeps sales, stock, drawer, and records controlled.</p></div>
      <form onSubmit={save} className="max-w-3xl rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><div><Pill className={account?.isActive ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]" : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"}>{account?.isActive ? "Active" : "Paused"}</Pill><h3 className="mt-3 text-xl font-black text-[var(--color-text)]">Store WhatsApp number</h3></div>{account?.id ? <AsyncButton type="button" onClick={toggleActive} loading={toggling} loadingText="Updating..." variant="secondary">{account.isActive ? "Pause" : "Activate"}</AsyncButton> : null}</div>
        <div className="grid gap-3 md:grid-cols-2"><input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name shown to customers" className="h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-semibold outline-none" /><input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="2507XXXXXXXX" className="h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-semibold outline-none" /><input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="Meta phone connection" className="h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-semibold outline-none" /><input value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="Meta business connection" className="h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-semibold outline-none" /><input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder={account?.hasAccessToken ? "Already saved. Enter only if replacing." : "Message sending permission"} className="md:col-span-2 h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-semibold outline-none" /></div>
        <AsyncButton type="submit" loading={saving} loadingText="Saving..." className="mt-4">Save connection</AsyncButton>
      </form>
    </div>
  );
}

function CreateDraftModal({ open, conversation, onClose, onCreated }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState([]);
  const [saleType, setSaleType] = useState("CREDIT");
  const [amountPaid, setAmountPaid] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setProducts([]);
      setItems([]);
      setSaleType("CREDIT");
      setAmountPaid("");
      setDueDate("");
    }
  }, [open]);

  if (!open) return null;

  async function runSearch(event) {
    event?.preventDefault?.();
    const clean = query.trim();
    if (!clean) return toast.error("Search product first");
    setSearching(true);
    try {
      const data = await searchProducts({ q: clean, limit: 12 });
      setProducts(normalizeProductList(data));
    } catch (err) {
      toast.error(safeError(err, "Product search failed"));
    } finally {
      setSearching(false);
    }
  }

  function addProduct(product) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) return current.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { productId: product.id, name: product.name, quantity: 1, unitPrice: product.sellPrice, stockQty: product.stockQty }];
    });
  }

  function updateQty(productId, nextQty) {
    const qty = Math.max(1, Number(nextQty || 1));
    setItems((current) => current.map((item) => item.productId === productId ? { ...item, quantity: qty } : item));
  }

  async function submit() {
    if (!conversation?.id) return;
    if (!items.length) return toast.error("Add at least one product");
    setSaving(true);
    try {
      const payload = {
        branchId: conversation.branchId || undefined,
        customerId: conversation.customerId || undefined,
        customer: conversation.customer ? undefined : { name: conversation.phone, phone: conversation.phone },
        saleType,
        dueDate: saleType === "CREDIT" && dueDate ? dueDate : null,
        amountPaid: Number(amountPaid || 0),
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice })),
      };
      const result = await createWhatsAppSaleDraft(conversation.id, payload);
      toast.success("WhatsApp draft sale created");
      onCreated?.(result.draft);
      onClose?.();
    } catch (err) {
      toast.error(safeError(err, "Could not create draft sale"));
    } finally {
      setSaving(false);
    }
  }

  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-lg bg-[var(--color-card)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--color-border)] p-4"><div><div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">WhatsApp sale draft</div><h2 className="mt-2 text-2xl font-black text-[var(--color-text)]">Prepare customer order</h2></div><button type="button" onClick={onClose} className="rounded-lg bg-[var(--color-surface-2)] px-4 py-2 text-sm font-black">Close</button></div>
        <div className="grid max-h-[calc(92vh-110px)] gap-3 overflow-y-auto p-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4"><form onSubmit={runSearch} className="flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product, SKU, model, barcode..." className="h-11 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-semibold outline-none" /><AsyncButton type="submit" loading={searching} loadingText="Searching...">Search</AsyncButton></form><div className="grid gap-3 sm:grid-cols-2">{products.map((product) => <button key={product.id} type="button" onClick={() => addProduct(product)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-left hover:bg-[var(--color-surface-2)]"><div className="text-sm font-black">{product.name}</div><div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">Stock {product.stockQty}</div><div className="mt-3 text-lg font-black text-[var(--color-primary)]">{money(product.sellPrice)}</div></button>)}</div></div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4"><div className="text-sm font-black">Draft summary</div><div className="mt-4 space-y-3">{items.length ? items.map((item) => <div key={item.productId} className="rounded-lg bg-[var(--color-card)] p-3"><div className="flex items-start justify-between gap-3"><div className="font-black text-sm">{item.name}</div><button type="button" onClick={() => setItems((v) => v.filter((x) => x.productId !== item.productId))} className="text-xs font-black text-red-500">Remove</button></div><div className="mt-3 flex items-center gap-2"><span className="text-xs font-bold text-[var(--color-text-muted)]">Qty</span><input type="number" min="1" value={item.quantity} onChange={(e) => updateQty(item.productId, e.target.value)} className="h-10 w-24 rounded-lg border border-[var(--color-border)] px-3 text-sm font-black" /></div></div>) : <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-sm font-semibold text-[var(--color-text-muted)]">No product added yet.</div>}</div><div className="mt-4 grid grid-cols-2 gap-2">{["CREDIT", "CASH"].map((type) => <button key={type} type="button" onClick={() => setSaleType(type)} className={cx("h-11 rounded-lg text-sm font-black", saleType === type ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]" : "bg-[var(--color-card)] text-[var(--color-text)]")}>{statusLabel(type)}</button>)}</div>{saleType === "CREDIT" ? <div className="mt-4 space-y-3"><input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Deposit paid now" className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-semibold" /><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-semibold" /></div> : null}<div className="mt-4 rounded-lg bg-[var(--color-card)] p-4"><div className="text-xs font-black uppercase text-[var(--color-text-muted)]">Total</div><div className="mt-2 text-2xl font-black">{money(total)}</div></div><AsyncButton onClick={submit} loading={saving} loadingText="Creating..." className="mt-4 w-full">Create draft sale</AsyncButton></div>
        </div>
      </div>
    </div>
  );
}

function AssignModal({ open, staff, conversation, onClose, onAssigned }) {
  const [savingId, setSavingId] = useState("");
  if (!open) return null;

  async function assign(staffId) {
    if (!conversation?.id) return;
    setSavingId(staffId);
    try {
      const result = await assignWhatsAppConversationOwner(conversation.id, { assignedToId: staffId });
      toast.success("Conversation assigned");
      onAssigned?.(result.conversation);
      onClose?.();
    } catch (err) {
      toast.error(safeError(err, "Assignment failed"));
    } finally {
      setSavingId("");
    }
  }

  async function clear() {
    if (!conversation?.id) return;
    setSavingId("clear");
    try {
      const result = await clearWhatsAppConversationOwner(conversation.id);
      toast.success("Assignment cleared");
      onAssigned?.(result.conversation);
      onClose?.();
    } catch (err) {
      toast.error(safeError(err, "Could not clear assignment"));
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-lg bg-[var(--color-card)] p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">Assign conversation</div><h2 className="mt-2 text-2xl font-black text-[var(--color-text)]">Choose responsible staff</h2></div><button type="button" onClick={onClose} className="rounded-lg bg-[var(--color-surface-2)] px-4 py-2 text-sm font-black">Close</button></div>
        <div className="mt-4 space-y-2">{staff.length ? staff.map((person) => <button key={person.id} type="button" onClick={() => assign(person.id)} disabled={Boolean(savingId)} className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-left hover:bg-[var(--color-card)]"><div><div className="text-sm font-black">{person.name || person.email}</div><div className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">{person.role}</div></div><div className="text-xs font-black text-[var(--color-primary)]">{savingId === person.id ? "Assigning..." : "Assign"}</div></button>) : <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-sm font-semibold text-[var(--color-text-muted)]">No staff members available for assignment.</div>}</div>
        <AsyncButton onClick={clear} loading={savingId === "clear"} loadingText="Clearing..." variant="secondary" className="mt-4 w-full">Clear assignment</AsyncButton>
      </div>
    </div>
  );
}

export default function WhatsAppInbox() {
  const messagesEndRef = useRef(null);
  const hasLoadedOnceRef = useRef(false);

  const currentRole = useMemo(() => getCurrentUserRole(), []);
  const canManageTools = canManageWhatsAppTools(currentRole);
  const canUseInbox = canUseWhatsAppInbox(currentRole);

  const [loading, setLoading] = useState(false);
  const [showPageSkeleton, setShowPageSkeleton] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messagesConversationId, setMessagesConversationId] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showMessagesSkeleton, setShowMessagesSkeleton] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState("inbox");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizingDraftId, setFinalizingDraftId] = useState("");

  async function loadConversations({ showSkeleton = false } = {}) {
    let skeletonTimer = null;
    if (showSkeleton && !hasLoadedOnceRef.current) {
      setLoading(true);
      skeletonTimer = window.setTimeout(() => setShowPageSkeleton(true), 220);
    }
    try {
      const conversationData = await listWhatsAppConversations();
      const nextConversations = conversationData.conversations || [];
      setConversations(nextConversations.map((item) => (item.id === selectedId ? markConversationOpened(item) : item)));
      if (!selectedId && nextConversations[0]?.id) setSelectedId(nextConversations[0].id);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      toast.error(safeError(err, "Could not load WhatsApp conversations"));
    } finally {
      if (skeletonTimer) window.clearTimeout(skeletonTimer);
      setLoading(false);
      setShowPageSkeleton(false);
    }
  }

  async function loadSecondaryWhatsAppData({ showToast = false } = {}) {
    try {
      const safeDrafts = canUseInbox ? listWhatsAppSaleDrafts().catch(() => ({ drafts: [] })) : Promise.resolve({ drafts: [] });
      const safeStaff = canManageTools ? listAssignableWhatsAppStaff().catch(() => ({ staff: [] })) : Promise.resolve({ staff: [] });
      const safeAccounts = canManageTools ? listWhatsAppAccounts().catch(() => ({ accounts: [] })) : Promise.resolve({ accounts: [] });
      const safeBroadcasts = canManageTools ? listWhatsAppBroadcasts({ limit: 50 }).catch(() => ({ broadcasts: [] })) : Promise.resolve({ broadcasts: [] });
      const safePromotions = canManageTools ? listWhatsAppPromotions({ limit: 50 }).catch(() => ({ promotions: [] })) : Promise.resolve({ promotions: [] });
      const [draftData, staffData, accountData, broadcastData, promotionData] = await Promise.all([safeDrafts, safeStaff, safeAccounts, safeBroadcasts, safePromotions]);
      setDrafts(draftData.drafts || []);
      setStaff(staffData.staff || []);
      setAccounts(accountData.accounts || []);
      setBroadcasts(broadcastData.broadcasts || []);
      setPromotions(promotionData.promotions || []);
    } catch (err) {
      if (showToast) toast.error(safeError(err, "Failed to load WhatsApp details"));
      else console.error("loadSecondaryWhatsAppData error:", err?.message || err);
    }
  }

  async function load({ silent = false } = {}) {
    if (!canUseInbox) return;
    if (silent) setRefreshing(true);
    try {
      await loadConversations({ showSkeleton: !silent });
      await loadSecondaryWhatsAppData({ showToast: silent });
    } finally {
      if (silent) setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canManageTools && ["broadcasts", "setup"].includes(workspaceTab)) setWorkspaceTab("inbox");
  }, [canManageTools, workspaceTab]);

  const selectedConversation = useMemo(() => conversations.find((item) => item.id === selectedId) || null, [conversations, selectedId]);

  const linkedDraft = useMemo(() => {
    if (!selectedConversation) return null;
    return drafts.find((draft) => draft.conversationId === selectedConversation.id) || drafts.find((draft) => draft.customerId && selectedConversation.customerId && draft.customerId === selectedConversation.customerId) || null;
  }, [drafts, selectedConversation]);

  useEffect(() => {
    let alive = true;
    let skeletonTimer = null;

    async function loadMessages() {
      if (!selectedId) {
        setMessages([]);
        setMessagesConversationId("");
        return;
      }
      setMessagesLoading(true);
      setShowMessagesSkeleton(false);
      skeletonTimer = window.setTimeout(() => {
        if (alive) setShowMessagesSkeleton(true);
      }, 220);
      try {
        const data = await listWhatsAppConversationMessages(selectedId);
        if (!alive) return;
        setMessages(data.messages || []);
        setMessagesConversationId(selectedId);
        setConversations((current) => current.map((item) => item.id === selectedId ? markConversationOpened(item) : item));
      } catch (err) {
        if (alive) toast.error(safeError(err, "Could not load conversation messages"));
      } finally {
        if (skeletonTimer) window.clearTimeout(skeletonTimer);
        if (alive) {
          setMessagesLoading(false);
          setShowMessagesSkeleton(false);
        }
      }
    }

    loadMessages();
    return () => {
      alive = false;
      if (skeletonTimer) window.clearTimeout(skeletonTimer);
    };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function openConversation(conversation) {
    setSelectedId(conversation.id);
    setWorkspaceTab("inbox");
    setConversations((current) => current.map((item) => item.id === conversation.id ? markConversationOpened(item) : item));
  }

  function updateConversationLocally(conversation) {
    if (!conversation?.id) return;
    setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, ...conversation } : item));
  }

  async function submitReply(event) {
    event.preventDefault();
    if (!selectedConversation?.id) return;
    const text = replyText.trim();
    if (!text) return;
    setSending(true);
    try {
      const result = await replyToWhatsAppConversation(selectedConversation.id, { text });
      setReplyText("");
      setMessagesConversationId(selectedConversation.id);
      setMessages((current) => [...current, result.message].filter(Boolean));
      await loadConversations();
    } catch (err) {
      toast.error(safeError(err, "Reply failed"));
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus() {
    if (!selectedConversation?.id) return;
    const nextStatus = selectedConversation.status === "OPEN" ? "CLOSED" : "OPEN";
    try {
      const result = await updateWhatsAppConversationStatus(selectedConversation.id, { status: nextStatus });
      toast.success(nextStatus === "OPEN" ? "Conversation reopened" : "Conversation closed");
      updateConversationLocally(result.conversation);
    } catch (err) {
      toast.error(safeError(err, "Status update failed"));
    }
  }

  async function finalizeDraft(draft) {
    if (!draft?.id) return;
    setFinalizingDraftId(draft.id);
    try {
      await finalizeWhatsAppSaleDraft(draft.id);
      toast.success("WhatsApp sale finalized");
      await load({ silent: true });
    } catch (err) {
      toast.error(safeError(err, "Could not finalize sale"));
    } finally {
      setFinalizingDraftId("");
    }
  }

  async function finalizeLinkedDraft() {
    if (!linkedDraft?.id) return;
    setFinalizing(true);
    try {
      await finalizeWhatsAppSaleDraft(linkedDraft.id);
      toast.success("WhatsApp sale finalized");
      await load({ silent: true });
    } catch (err) {
      toast.error(safeError(err, "Could not finalize sale"));
    } finally {
      setFinalizing(false);
    }
  }

  if (!canUseInbox) {
    return (
      <div className="p-4"><EmptyState title="WhatsApp access is not available" body="Ask the owner or manager to give your role access to WhatsApp work." /></div>
    );
  }

  if (showPageSkeleton || (loading && !hasLoadedOnceRef.current)) return <PageSkeleton label="Loading WhatsApp workspace" />;

  return (
    <div className="h-[calc(100vh-116px)] min-h-[640px] overflow-hidden rounded-none border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] shadow-[var(--shadow-card)]">
      <div className="flex h-full w-full overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceTop activeTab={workspaceTab} setActiveTab={setWorkspaceTab} canManageTools={canManageTools} refreshing={refreshing} onRefresh={() => load({ silent: true })} />

          {workspaceTab === "inbox" ? (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <ConversationList conversations={conversations} drafts={drafts} selectedId={selectedId} onSelect={openConversation} search={search} setSearch={setSearch} />
              <ChatPanel conversation={selectedConversation} messages={messages} messagesConversationId={messagesConversationId} messagesLoading={messagesLoading} showMessagesSkeleton={showMessagesSkeleton} replyText={replyText} setReplyText={setReplyText} sending={sending} onSend={submitReply} onCreateDraft={() => setDraftModalOpen(true)} onAssign={() => setAssignModalOpen(true)} onToggleStatus={toggleStatus} canManageTools={canManageTools} messagesEndRef={messagesEndRef} />
              <CustomerProfile conversation={selectedConversation} draft={linkedDraft} canManageTools={canManageTools} onCreateDraft={() => setDraftModalOpen(true)} onAssign={() => setAssignModalOpen(true)} onToggleStatus={toggleStatus} onFinalize={finalizeLinkedDraft} finalizing={finalizing} />
            </div>
          ) : null}

          {workspaceTab === "drafts" ? <DraftsWorkspace drafts={drafts} conversations={conversations} onOpenConversation={openConversation} onFinalize={finalizeDraft} finalizingDraftId={finalizingDraftId} /> : null}
          {workspaceTab === "broadcasts" && canManageTools ? <BroadcastsWorkspace accounts={accounts} promotions={promotions} broadcasts={broadcasts} onRefresh={() => load({ silent: true })} /> : null}
          {workspaceTab === "setup" && canManageTools ? <SetupWorkspace accounts={accounts} onRefresh={() => load({ silent: true })} /> : null}
        </div>
      </div>

      <CreateDraftModal open={draftModalOpen} conversation={selectedConversation} onClose={() => setDraftModalOpen(false)} onCreated={async () => load({ silent: true })} />

      {canManageTools ? (
        <AssignModal open={assignModalOpen} staff={staff} conversation={selectedConversation} onClose={() => setAssignModalOpen(false)} onAssigned={updateConversationLocally} />
      ) : null}
    </div>
  );
}
