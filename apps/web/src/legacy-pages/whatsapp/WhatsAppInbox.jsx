import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  finalizeWhatsAppSaleDraft,
  getWhatsAppConversationSalesSummary,
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
} from "../../services/whatsappApi";
import "./WhatsAppInbox.css";

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
const PROMOTION_LIST_LIMIT = 6;
const BROADCAST_LIST_LIMIT = 5;

const BUSINESS_CATEGORIES = [
  ["ELECTRONICS", "Electronics"],
  ["HARDWARE", "Hardware"],
  ["HOME_KITCHEN", "Home & kitchen"],
  ["LIGHTING", "Lighting"],
  ["SPARE_PARTS", "Spare parts"],
];

const AUDIENCE_OPTIONS = [
  {
    value: "ALL_OPTED_IN",
    label: "All WhatsApp customers",
    helper: "Every customer allowed to receive updates.",
  },
  {
    value: "CATEGORY_CUSTOMERS",
    label: "Category customers",
    helper: "Customers matched to one business category.",
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
  const amount = Number(value || 0);
  const safe = Number.isFinite(amount) ? amount : 0;

  return `${Math.round(safe).toLocaleString("en-US")} RWF`;
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

function cleanText(value) {
  return String(value || "").trim();
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
  if (code === "CATEGORY_REQUIRED") return "Choose a business category for this audience.";
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

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function shortDate(value) {
  if (!value) return "No purchases yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No purchases yet";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function daysSince(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function customerTier(summary) {
  const orders = Number(summary?.totalOrders || 0);
  const revenue = Number(summary?.totalRevenue || 0);
  const outstanding = Number(summary?.outstandingCredit || 0);

  if (outstanding > 0) return { label: "Credit watch", tone: "warning" };
  if (orders >= 10 || revenue >= 1000000) return { label: "VIP customer", tone: "success" };
  if (orders >= 3 || revenue >= 250000) return { label: "Returning customer", tone: "info" };
  if (orders > 0) return { label: "New buyer", tone: "neutral" };

  return { label: "New lead", tone: "neutral" };
}

function recommendedCustomerAction(summary) {
  const orders = Number(summary?.totalOrders || 0);
  const outstanding = Number(summary?.outstandingCredit || 0);
  const lastPurchaseDays = daysSince(summary?.lastPurchase);

  if (outstanding > 0) return "Send payment reminder";
  if (orders === 0) return "Convert chat into first sale";
  if (lastPurchaseDays !== null && lastPurchaseDays >= 30) return "Follow up with a fresh offer";
  if (orders >= 3) return "Offer related accessories";

  return "Create sale when customer confirms";
}

function leadTemperature({ conversation, draft, summary }) {
  const activityDays = daysSince(conversation?.updatedAt || conversation?.latestMessage?.createdAt);
  const orders = Number(summary?.totalOrders || 0);

  if (draft?.id && orders > 0 && activityDays !== null && activityDays <= 3) {
    return {
      key: "HOT",
      label: "🔥 Hot lead",
      shortLabel: "Hot",
      tone: "success",
      reason: "Draft sale, buying history, and activity within 3 days.",
    };
  }

  if (activityDays !== null && activityDays <= 14) {
    return {
      key: "WARM",
      label: "🟡 Warm lead",
      shortLabel: "Warm",
      tone: "warning",
      reason: "Recent activity within 14 days.",
    };
  }

  return {
    key: "COLD",
    label: "⚪ Cold lead",
    shortLabel: "Cold",
    tone: "neutral",
    reason: "No meaningful activity for more than 14 days.",
  };
}

function latestQuotation(summary) {
  return summary?.latestQuotation || summary?.proformas?.[0] || null;
}

function hasQuotation(summary) {
  return Boolean(summary?.hasQuotation || Number(summary?.quotationCount || 0) > 0 || latestQuotation(summary));
}

function recommendedSalesAction({ conversation, draft, summary }) {
  const outstanding = Number(summary?.outstandingCredit || 0);
  const orders = Number(summary?.totalOrders || 0);
  const lastPurchaseDays = daysSince(summary?.lastPurchase);

  if (outstanding > 0) {
    return {
      label: "Collect payment",
      detail: "Customer has outstanding credit. Payment follow-up is the highest-value action.",
      primary: "Payment reminder",
      action: "REMINDER",
    };
  }

  if (hasQuotation(summary)) {
    return {
      label: "Follow up",
      detail: "A proforma already exists for this conversation. Follow up and move the customer to a decision.",
      primary: "Follow up",
      action: "FOLLOW_UP",
    };
  }

  if (!draft?.id) {
    return {
      label: "Create draft sale",
      detail: "No active draft exists for this conversation yet.",
      primary: "Create draft",
      action: "DRAFT",
    };
  }

  if (draft?.id) {
    return {
      label: "Create quotation",
      detail: "A draft exists. Convert it into a professional proforma before final sale.",
      primary: "Create quotation",
      action: "QUOTATION",
    };
  }

  if (orders > 0 && lastPurchaseDays !== null && lastPurchaseDays <= 30) {
    return {
      label: "Offer accessories",
      detail: "Customer recently bought. Recommend useful add-ons or replacements.",
      primary: "Prepare offer",
      action: "OFFER",
    };
  }

  return {
    label: "Follow up",
    detail: "Keep the conversation active and move the customer toward a concrete buying decision.",
    primary: "Follow up",
    action: "FOLLOW_UP",
  };
}

function buildSalesTimeline({ conversation, draft, summary }) {
  const events = [];

  if (conversation?.createdAt) {
    events.push({
      id: "conversation-started",
      at: conversation.createdAt,
      title: "Started WhatsApp conversation",
      meta: cleanPhone(conversation.phone),
    });
  }

  if (draft?.id) {
    events.push({
      id: `draft-${draft.id}`,
      at: draft.createdAt || draft.updatedAt,
      title: "Draft sale created",
      meta: `${money(draft.total)} · ${draft.items?.length || 0} item${draft.items?.length === 1 ? "" : "s"}`,
    });
  }

  const quotationEvents = Array.isArray(summary?.proformas)
    ? summary.proformas
    : latestQuotation(summary)
      ? [latestQuotation(summary)]
      : [];

  quotationEvents.forEach((quotation) => {
    if (!quotation?.createdAt) return;

    events.push({
      id: `proforma-${quotation.id || quotation.number || quotation.createdAt}`,
      at: quotation.createdAt,
      title: "Proforma created",
      meta: `${quotation.number || "Proforma"} · ${money(quotation.total)}`,
    });
  });

  if (summary?.lastPurchase) {
    events.push({
      id: "last-purchase",
      at: summary.lastPurchase,
      title: "Sale completed",
      meta: `${Number(summary.totalOrders || 0)} total order${Number(summary.totalOrders || 0) === 1 ? "" : "s"}`,
    });
  }

  if (summary?.lastWarranty) {
    events.push({
      id: "last-warranty",
      at: summary.lastWarranty,
      title: "Warranty activated",
      meta: "After-sales support available",
    });
  }

  return events
    .filter((event) => event.at && !Number.isNaN(new Date(event.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(-5);
}

function normalizeDraftItemsForProforma(draft) {
  const items = Array.isArray(draft?.items) ? draft.items : [];

  return items
    .map((item) => {
      const product = item.product || {};
      const productName =
        cleanText(product.name) || cleanText(item.productName) || cleanText(item.name);

      if (!productName) return null;

      return {
        productId: cleanText(item.productId || product.id),
        productName,
        sku: cleanText(product.sku),
        category: cleanText(product.category || product.businessCategory),
        stockQty: Number(product.stockQty ?? product.availableQty ?? product.branchQty ?? 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
        unitPrice: Number(item.unitPrice ?? item.price ?? product.sellPrice ?? 0),
        description: cleanText(product.serial || product.barcode),
      };
    })
    .filter(Boolean);
}

function buildWhatsAppProformaPrefill({ conversation, draft }) {
  if (!conversation?.id) return null;

  const name = cleanText(conversation.customer?.name) || cleanText(conversation.phone) || "WhatsApp customer";
  const phone = cleanText(conversation.customer?.phone) || cleanText(conversation.phone);
  const sourceLines = [
    "Source: WhatsApp",
    `Conversation ID: ${conversation.id}`,
  ];

  if (draft?.id) sourceLines.push(`Draft sale ID: ${draft.id}`);

  return {
    source: "WHATSAPP",
    conversationId: conversation.id,
    draftSaleId: draft?.id || "",
    customerId: conversation.customerId || conversation.customer?.id || draft?.customerId || "",
    customerName: name,
    customerPhone: phone,
    customerEmail: conversation.customer?.email || draft?.customer?.email || "",
    customerAddress: conversation.customer?.address || draft?.customer?.address || "",
    reference: `WHATSAPP:${conversation.id}`,
    notes: sourceLines.join("\n"),
    items: normalizeDraftItemsForProforma(draft),
    createdAt: new Date().toISOString(),
  };
}


function buyingProbability({ conversation, draft, summary }) {
  let score = 20;

  const text = [
    conversation?.latestMessage?.textContent,
    conversation?.customer?.name,
    conversation?.phone,
  ]
    .join(" ")
    .toLowerCase();

  if (draft?.id) score += 35;
  if (text.includes("price") || text.includes("how much") || text.includes("angahe")) score += 18;
  if (text.includes("available") || text.includes("stock") || text.includes("ufite")) score += 18;
  if (text.includes("pay later") || text.includes("credit") || text.includes("ideni")) score += 15;
  if (text.includes("deliver") || text.includes("delivery") || text.includes("location")) score += 12;
  if (Number(summary?.totalOrders || 0) > 0) score += 10;
  if (Number(summary?.outstandingCredit || 0) > 0) score -= 8;

  return Math.max(0, Math.min(100, score));
}

function probabilityLabel(score) {
  if (score >= 75) return { label: "High", tone: "success" };
  if (score >= 40) return { label: "Medium", tone: "warning" };
  return { label: "Low", tone: "neutral" };
}

function opportunityValue({ draft, summary }) {
  const draftTotal = Number(draft?.total || 0);
  if (draftTotal > 0) return draftTotal;

  const orders = Number(summary?.totalOrders || 0);
  const revenue = Number(summary?.totalRevenue || 0);

  if (orders > 0 && revenue > 0) return Math.round(revenue / orders);

  return 0;
}

function conversationPriority({ conversation, draft, summary }) {
  const score = buyingProbability({ conversation, draft, summary });
  const outstanding = Number(summary?.outstandingCredit || 0);
  const orders = Number(summary?.totalOrders || 0);

  if (draft?.id) return { label: "Buying", tone: "warning" };
  if (score >= 75) return { label: "Hot", tone: "success" };
  if (outstanding > 0) return { label: "Follow up", tone: "warning" };
  if (orders >= 3) return { label: "Returning", tone: "info" };
  return { label: "New", tone: "neutral" };
}


function customerName(conversation) {
  return (
    conversation?.customer?.name ||
    conversation?.phone ||
    conversation?.assignedTo?.name ||
    "WhatsApp customer"
  );
}

function latestPreview(conversation) {
  const message = conversation?.latestMessage;
  if (!message) return "No messages yet";

  return `${message.direction === "OUTBOUND" ? "You: " : ""}${message.textContent || "Message"}`;
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

  const value = Number(explicit);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
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

  if (["SENT", "PAID", "ACTIVE", "READY", "OPEN"].includes(value)) return "success";
  if (["PARTIAL", "QUEUED", "DRAFT"].includes(value)) return "warning";
  if (["FAILED", "OVERDUE", "MISSING", "CLOSED"].includes(value)) return "danger";

  return "neutral";
}

function Badge({ children, tone = "neutral" }) {
  return <span className={cx("svx-wa-badge", `is-${tone}`)}>{children}</span>;
}

function IconShell({ children, tone = "info" }) {
  return <span className={cx("svx-wa-icon", `is-${tone}`)}>{children}</span>;
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 18l1.2-3.4A7 7 0 1119 12a7 7 0 01-10.52 6L6 18z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 3h10a2 2 0 012 2v15l-3-1.5L12 20l-4-1.5L5 20V5a2 2 0 012-2zM9 8h6M9 12h6M9 16h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CampaignIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 13l13-7v12L4 13zm0 0v5l4-3M17 8h3M18 12h3M17 16h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M16 11a4 4 0 10-8 0m8 0a4 4 0 01-8 0m8 0c2.76 0 5 2.02 5 4.5V18H3v-2.5C3 13.02 5.24 11 8 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 8a4 4 0 100 8 4 4 0 000-8zm8 4a8 8 0 01-.16 1.6l2.02 1.56-2 3.46-2.39-.96a8.3 8.3 0 01-2.77 1.6L14.35 22h-4.7l-.35-2.74a8.3 8.3 0 01-2.77-1.6l-2.39.96-2-3.46 2.02-1.56A8 8 0 014 12c0-.55.05-1.08.16-1.6L2.14 8.84l2-3.46 2.39.96a8.3 8.3 0 012.77-1.6L9.65 2h4.7l.35 2.74a8.3 8.3 0 012.77 1.6l2.39-.96 2 3.46-2.02 1.56c.11.52.16 1.05.16 1.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MetricCard({ label, value, note, icon, tone = "info" }) {
  return (
    <article className="svx-wa-metric">
      <IconShell tone={tone}>{icon}</IconShell>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{note}</small>
      </div>
    </article>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="svx-wa-empty">
      <IconShell tone="info">
        <ChatIcon />
      </IconShell>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function ConversationRow({ conversation, active, draft, salesSummary, onClick }) {
  const name = customerName(conversation);
  const count = unreadCount(conversation, active);
  const needsLocation = !conversation.branchId;
  const priority = conversationPriority({ conversation, draft, summary: salesSummary });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx("svx-wa-conversation-row", active && "is-active")}
    >
      <span className="svx-wa-avatar">{initials(name)}</span>

      <span className="svx-wa-conversation-main">
        <span className="svx-wa-conversation-topline">
          <strong>{name}</strong>
          <small>{formatTime(conversation.updatedAt)}</small>
        </span>

        <span className={cx("svx-wa-conversation-preview", count && "is-unread")}>
          {latestPreview(conversation)}
        </span>

        <span className="svx-wa-conversation-tags">
          <Badge tone={priority.tone}>{priority.label}</Badge>
          <Badge tone={toneForStatus(conversation.status)}>{statusLabel(conversation.status)}</Badge>
          {draft ? <Badge tone="warning">Draft sale</Badge> : null}
          {needsLocation ? <Badge tone="warning">Location needed</Badge> : null}
        </span>
      </span>

      {count > 0 ? <span className="svx-wa-unread">{count > 99 ? "99+" : count}</span> : null}
    </button>
  );
}


function deliveryStatusMeta(message, outbound) {
  if (!outbound) return null;

  const status = String(message?.status || "SENT").trim().toUpperCase();

  if (status === "READ") {
    return { label: "Seen", marks: "✓✓", tone: "seen" };
  }

  if (status === "DELIVERED") {
    return { label: "Delivered", marks: "✓✓", tone: "delivered" };
  }

  if (status === "FAILED") {
    return { label: "Failed", marks: "!", tone: "failed" };
  }

  return { label: "Sent", marks: "✓", tone: "sent" };
}

function MessageBubble({ message }) {
  const outbound = message.direction === "OUTBOUND";
  const delivery = deliveryStatusMeta(message, outbound);

  return (
    <div className={cx("svx-wa-message-line", outbound ? "is-outbound" : "is-inbound")}>
      <article className={cx("svx-wa-message", outbound && "is-outbound")}>
        <p>{message.textContent || "Message"}</p>
        <span className="svx-wa-message-meta">
          <em>{formatTime(message.createdAt)}</em>
          {delivery ? (
            <strong className={cx("svx-wa-message-status", `is-${delivery.tone}`)}>
              <b>{delivery.marks}</b>
              {delivery.label}
            </strong>
          ) : null}
        </span>
      </article>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="svx-wa-chat-skeleton">
      <span />
      <span />
      <span />
    </div>
  );
}

function WorkspaceTabs({ value, onChange, canManageTools }) {
  const tabs = [
    ["inbox", "Inbox", <ChatIcon />],
    ["drafts", "Orders", <DraftIcon />],
    ...(canManageTools
      ? [
          ["broadcasts", "Campaigns", <CampaignIcon />],
          ["activity", "Activity", <TeamIcon />],
          ["setup", "Accounts", <SettingsIcon />],
        ]
      : []),
  ];

  return (
    <nav className="svx-wa-module-tabs" aria-label="WhatsApp workspace">
      {tabs.map(([key, label, icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cx("svx-wa-module-tab", value === key && "is-active")}
        >
          <span>{icon}</span>
          <strong>{label}</strong>
        </button>
      ))}
    </nav>
  );
}

function ConversationList({ conversations, drafts, selectedId, selectedSalesSummary, onSelect, search, setSearch }) {
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversations.filter((item) => {
      if (!query) return true;

      return [customerName(item), item.phone, item.latestMessage?.textContent, item.assignedTo?.name]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [conversations, search]);

  return (
    <aside className="svx-wa-conversation-panel">
      <div className="svx-wa-panel-head">
        <div>
          <p>Conversations</p>
          <h2>Customer inbox</h2>
        </div>
        <Badge tone="info">{conversations.length}</Badge>
      </div>

      <div className="svx-wa-search">
        <SearchIcon />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or phone..."
        />
      </div>

      <div className="svx-wa-filter-row">
        <Badge tone="info">All</Badge>
        <Badge tone="neutral">Unread</Badge>
        <Badge tone="neutral">Open</Badge>
        <Badge tone="neutral">Groups</Badge>
      </div>

      <div className="svx-wa-conversation-list">
        {filtered.length ? (
          filtered.map((conversation) => {
            const draft = drafts.find(
              (item) =>
                item.conversationId === conversation.id ||
                (item.customerId && item.customerId === conversation.customerId)
            );

            return (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                draft={draft}
                salesSummary={conversation.id === selectedId ? selectedSalesSummary : null}
                active={conversation.id === selectedId}
                onClick={() => onSelect(conversation)}
              />
            );
          })
        ) : (
          <EmptyState
            title="No conversations found"
            body="Clear search or wait for new WhatsApp messages."
          />
        )}
      </div>
    </aside>
  );
}

function DraftSummaryCard({ draft, onFinalize, finalizing = false }) {
  if (!draft) {
    return (
      <section className="svx-wa-side-card svx-wa-draft-card">
        <div className="svx-wa-side-title">Recent draft sale</div>
        <p className="svx-wa-help-text">
          Create a draft sale only when the customer asks to buy.
        </p>
      </section>
    );
  }

  return (
    <section className="svx-wa-side-card svx-wa-draft-card is-highlight">
      <div className="svx-wa-side-title">Recent draft sale</div>
      <div className="svx-wa-draft-value">{money(draft.total)}</div>
      <p className="svx-wa-help-text">
        {draft.items?.length || 0} item{draft.items?.length === 1 ? "" : "s"} ·{" "}
        {statusLabel(draft.saleType)} sale
      </p>
      <AsyncButton
        onClick={onFinalize}
        loading={finalizing}
        loadingText="Finalizing..."
        className="svx-wa-full-button"
      >
        Finalize sale
      </AsyncButton>
    </section>
  );
}


function SalesTimeline({ events }) {
  if (!events.length) {
    return (
      <div className="svx-wa-sales-timeline is-empty">
        <span>No sales timeline yet</span>
        <strong>Create a draft or quotation when the customer shows buying intent.</strong>
      </div>
    );
  }

  return (
    <div className="svx-wa-sales-timeline">
      {events.map((event) => (
        <div key={event.id} className="svx-wa-sales-timeline-item">
          <time>{shortDate(event.at)}</time>
          <div>
            <strong>{event.title}</strong>
            <span>{event.meta}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SalesIntelligenceCard({ conversation, draft, summary, loading, onRecommendedAction }) {
  const safeSummary = summary || {};
  const tier = customerTier(safeSummary);
  const temperature = leadTemperature({ conversation, draft, summary: safeSummary });
  const nextAction = recommendedSalesAction({ conversation, draft, summary: safeSummary });
  const timeline = buildSalesTimeline({ conversation, draft, summary: safeSummary });
  const quotation = latestQuotation(safeSummary);
  const lastPurchaseDays = daysSince(safeSummary.lastPurchase);
  const lastPurchaseLabel =
    lastPurchaseDays === null
      ? "No purchases yet"
      : lastPurchaseDays === 0
        ? "Today"
        : `${lastPurchaseDays} day${lastPurchaseDays === 1 ? "" : "s"} ago`;

  return (
    <section className="svx-wa-side-card svx-wa-intelligence-card">
      <div className="svx-wa-side-title">Customer intelligence</div>

      {loading ? (
        <div className="svx-wa-intelligence-loading">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <>
          <div className="svx-wa-intelligence-hero">
            <div>
              <span>Customer temperature</span>
              <strong>{temperature.label}</strong>
              <small>{temperature.reason}</small>
            </div>
            <Badge tone={temperature.tone}>{tier.label}</Badge>
          </div>

          <div className="svx-wa-intelligence-grid">
            <div>
              <span>Total orders</span>
              <strong>{Number(safeSummary.totalOrders || 0)}</strong>
            </div>
            <div>
              <span>Lifetime value</span>
              <strong>{money(safeSummary.totalRevenue)}</strong>
            </div>
            <div>
              <span>Outstanding credit</span>
              <strong>{money(safeSummary.outstandingCredit)}</strong>
            </div>
            <div>
              <span>Proformas</span>
              <strong>{Number(safeSummary.quotationCount || 0)}</strong>
              <small>{quotation?.number || "No proforma yet"}</small>
            </div>
            <div>
              <span>Last purchase</span>
              <strong>{lastPurchaseLabel}</strong>
              <small>{shortDate(safeSummary.lastPurchase)}</small>
            </div>
          </div>

          <div className="svx-wa-recommended-action">
            <span>Recommended next action</span>
            <strong>{nextAction.label}</strong>
            <small>{nextAction.detail}</small>
            <button type="button" onClick={() => onRecommendedAction?.(nextAction)}>
              {nextAction.primary}
            </button>
          </div>

          <div className="svx-wa-timeline-block">
            <div className="svx-wa-mini-title">Sales timeline</div>
            <SalesTimeline events={timeline} />
          </div>
        </>
      )}
    </section>
  );
}


function CustomerPanel({
  conversation,
  draft,
  salesSummary,
  salesSummaryLoading,
  canManageTools,
  onCreateDraft,
  onCreateQuotation,
  onRecommendedAction,
  onAssign,
  onToggleStatus,
  onFinalize,
  finalizing,
}) {
  if (!conversation) {
    return (
      <aside className="svx-wa-side-panel">
        <EmptyState
          title="No customer selected"
          body="Choose a conversation to view customer details and actions."
        />
      </aside>
    );
  }

  return (
    <aside className="svx-wa-side-panel">
      <section className="svx-wa-side-card svx-wa-customer-details-card">
        <div className="svx-wa-side-title">Customer details</div>
        <div className="svx-wa-customer-card">
          <span className="svx-wa-avatar is-large">{initials(customerName(conversation))}</span>
          <div>
            <strong>{customerName(conversation)}</strong>
            <span>{cleanPhone(conversation.phone)}</span>
            <small>Customer since {dateLabel(conversation.createdAt)}</small>
          </div>
        </div>

        <div className="svx-wa-button-grid">
          <button type="button">View profile</button>
          <button type="button" onClick={onCreateDraft}>
            New sale
          </button>
          <button type="button" onClick={onCreateQuotation}>
            Quotation
          </button>
          <button type="button" onClick={onToggleStatus}>
            {conversation.status === "OPEN" ? "Close" : "Reopen"}
          </button>
        </div>
      </section>

      <SalesIntelligenceCard
        conversation={conversation}
        draft={draft}
        summary={salesSummary}
        loading={salesSummaryLoading}
        onRecommendedAction={onRecommendedAction}
      />

      <DraftSummaryCard draft={draft} onFinalize={onFinalize} finalizing={finalizing} />

      <section className="svx-wa-side-card svx-wa-quick-actions-card">
        <div className="svx-wa-side-title">Quick actions</div>
        <div className="svx-wa-action-list">
          <button type="button" onClick={onCreateDraft}>
            <strong>Create draft sale</strong>
            <span>Create a sale from this chat</span>
          </button>

          <button type="button" onClick={onCreateQuotation}>
            <strong>Create quotation</strong>
            <span>Use the existing proforma document flow</span>
          </button>

          {canManageTools ? (
            <button type="button" onClick={onAssign}>
              <strong>Assign conversation</strong>
              <span>Give this customer to a staff member</span>
            </button>
          ) : null}

          <button type="button" onClick={onToggleStatus}>
            <strong>{conversation.status === "OPEN" ? "Close conversation" : "Reopen conversation"}</strong>
            <span>Control whether this chat still needs work</span>
          </button>
        </div>
      </section>

      <section className="svx-wa-side-card svx-wa-conversation-info-card">
        <div className="svx-wa-side-title">Conversation info</div>
        <div className="svx-wa-info-list">
          <span>Status</span>
          <strong>{statusLabel(conversation.status)}</strong>

          <span>Assigned to</span>
          <strong>{conversation.assignedTo?.name || "Unassigned"}</strong>

          <span>Location</span>
          <strong>{conversation.branchId ? "Ready" : "Location needed"}</strong>

          <span>Last message</span>
          <strong>{formatDay(conversation.updatedAt)}</strong>
        </div>
      </section>
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
  onCreateQuotation,
  onPaymentReminder,
  salesSummary,
  linkedDraft,
  messagesEndRef,
}) {
  if (!conversation) {
    return (
      <main className="svx-wa-chat-panel">
        <EmptyState
          title="Choose a conversation"
          body="Pick a customer on the left to view messages, reply, and create a sale draft."
        />
      </main>
    );
  }

  const hasCurrentMessages = messagesConversationId === conversation.id;
  const visibleMessages = hasCurrentMessages ? messages : [];
  const openingDifferentConversation = messagesLoading && !hasCurrentMessages;
  const tier = customerTier(salesSummary || {});
  const opportunity = opportunityValue({ draft: linkedDraft, summary: salesSummary || {} });

  return (
    <main className="svx-wa-chat-panel">
      <header className="svx-wa-chat-head">
        <div className="svx-wa-chat-person">
          <span className="svx-wa-avatar is-large">{initials(customerName(conversation))}</span>
          <div>
            <strong>{customerName(conversation)}</strong>
            <span>
              <i /> {tier.label} · {Number(salesSummary?.totalOrders || 0)} orders · {money(opportunity)}
            </span>
            <small>{statusLabel(conversation.status)} · {cleanPhone(conversation.phone)}</small>
          </div>
        </div>

        <div className="svx-wa-chat-actions">
          <button type="button" onClick={onCreateDraft}>
            Create sale
          </button>
          <button type="button" onClick={onCreateQuotation}>
            Quotation
          </button>
          <button type="button" onClick={onPaymentReminder}>
            Reminder
          </button>
        </div>
      </header>

      <section className="svx-wa-message-area">
        {messagesLoading && hasCurrentMessages && visibleMessages.length > 0 ? (
          <div className="svx-wa-loading-chip">Loading conversation…</div>
        ) : null}

        <div className="svx-wa-date-pill">
          <Badge tone="neutral">{formatDay(visibleMessages[0]?.createdAt || conversation.createdAt)}</Badge>
        </div>

        {(showMessagesSkeleton || openingDifferentConversation) && visibleMessages.length === 0 ? (
          <ChatSkeleton />
        ) : visibleMessages.length ? (
          <div className="svx-wa-message-stack">
            {visibleMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : messagesLoading ? (
          <EmptyState title="Opening conversation…" body="Messages are loading." />
        ) : (
          <EmptyState
            title="No customer messages yet"
            body="This conversation is ready. New WhatsApp messages will appear here."
          />
        )}
      </section>

      <form onSubmit={onSend} className="svx-wa-reply-bar">
        <input
          value={replyText}
          onChange={(event) => setReplyText(event.target.value)}
          placeholder={`Type your reply to ${customerName(conversation)}...`}
        />
        <button type="button" className="svx-wa-attach-button">
          +
        </button>
        <AsyncButton type="submit" loading={sending} loadingText="Sending..." className="svx-wa-send-button">
          Send
        </AsyncButton>
      </form>
    </main>
  );
}

function DraftsWorkspace({ drafts, conversations, onOpenConversation, onFinalize, finalizingDraftId }) {
  const totalValue = drafts.reduce((sum, draft) => sum + Number(draft.total || 0), 0);

  return (
    <section className="svx-wa-page-panel">
      <div className="svx-wa-section-title">
        <p>WhatsApp orders</p>
        <h2>Draft sales waiting for action</h2>
        <span>{money(totalValue)} prepared from customer chats.</span>
      </div>

      {drafts.length ? (
        <div className="svx-wa-draft-grid">
          {drafts.map((draft) => {
            const conversation =
              conversations.find((item) => item.id === draft.conversationId) || null;

            return (
              <article key={draft.id} className="svx-wa-order-card">
                <div>
                  <Badge tone={toneForStatus(draft.status || "DRAFT")}>
                    {statusLabel(draft.status || "DRAFT")}
                  </Badge>
                  <h3>{draft.customer?.name || draft.conversation?.phone || "WhatsApp customer"}</h3>
                  <p>{cleanPhone(draft.customer?.phone || draft.conversation?.phone)}</p>
                </div>

                <strong>{money(draft.total)}</strong>
                <span>{draft.items?.length || 0} item{draft.items?.length === 1 ? "" : "s"}</span>

                <div className="svx-wa-card-actions">
                  <AsyncButton
                    onClick={() => onFinalize(draft)}
                    loading={finalizingDraftId === draft.id}
                    loadingText="Finalizing..."
                  >
                    Finalize sale
                  </AsyncButton>

                  {conversation ? (
                    <button type="button" onClick={() => onOpenConversation(conversation)}>
                      Open conversation
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No WhatsApp draft sales"
          body="When a customer asks to buy through WhatsApp, staff can create a draft sale here."
        />
      )}
    </section>
  );
}

function BroadcastsWorkspace({ accounts, promotions, broadcasts, onRefresh }) {
  const [promotionTitle, setPromotionTitle] = useState("");
  const [promotionMessage, setPromotionMessage] = useState("");
  const [promotionCategory, setPromotionCategory] = useState("ELECTRONICS");
  const [promotionId, setPromotionId] = useState("");
  const [targetMode, setTargetMode] = useState("ALL_OPTED_IN");
  const [targetCategory, setTargetCategory] = useState("ELECTRONICS");
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
      await createWhatsAppPromotion({
        title: promotionTitle.trim(),
        message: promotionMessage.trim(),
        productId: null,
        category: promotionCategory,
      });

      toast.success("Promotion created");
      setPromotionTitle("");
      setPromotionMessage("");
      setPromotionCategory("ELECTRONICS");
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
          category: targetMode === "CATEGORY_CUSTOMERS" ? targetCategory : null,
          productId:
            targetMode === "PRODUCT_BUYERS" ? selectedPromotion?.productId || null : null,
          customerIds: [],
        },
      });

      toast.success("Broadcast draft created");
      setPromotionId("");
      setTargetMode("ALL_OPTED_IN");
      setTargetCategory("ELECTRONICS");
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
      const result = await sendWhatsAppBroadcastNow(id, {
        limit: 50,
        targeting: { mode: "ALL_OPTED_IN" },
      });

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
    <section className="svx-wa-page-panel">
      <div className="svx-wa-section-title">
        <p>Customer growth</p>
        <h2>Promotions and broadcasts</h2>
        <span>Create customer offers, choose an audience, and send from the store number.</span>
      </div>

      <div className="svx-wa-campaign-grid">
        <form onSubmit={savePromotion} className="svx-wa-form-card">
          <h3>Create promotion</h3>

          <label>
            <span>Promotion title</span>
            <input
              value={promotionTitle}
              onChange={(event) => setPromotionTitle(event.target.value)}
              placeholder="Weekend laptop offer"
            />
          </label>

          <label>
            <span>Business category</span>
            <select
              value={promotionCategory}
              onChange={(event) => setPromotionCategory(event.target.value)}
            >
              {BUSINESS_CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Customer message</span>
            <textarea
              value={promotionMessage}
              onChange={(event) => setPromotionMessage(event.target.value)}
              placeholder="Write the customer message..."
              rows={5}
            />
          </label>

          <AsyncButton type="submit" loading={savingPromotion} loadingText="Saving...">
            Create promotion
          </AsyncButton>
        </form>

        <form onSubmit={saveBroadcast} className="svx-wa-form-card">
          <h3>Create broadcast</h3>

          <label>
            <span>Promotion</span>
            <select value={promotionId} onChange={(event) => setPromotionId(event.target.value)}>
              <option value="">Choose promotion</option>
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {promotion.title}
                </option>
              ))}
            </select>
          </label>

          <div className="svx-wa-audience-list">
            {AUDIENCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTargetMode(option.value)}
                className={cx(targetMode === option.value && "is-active")}
              >
                <strong>{option.label}</strong>
                <span>{option.helper}</span>
              </button>
            ))}
          </div>

          {targetMode === "CATEGORY_CUSTOMERS" ? (
            <label>
              <span>Target category</span>
              <select
                value={targetCategory}
                onChange={(event) => setTargetCategory(event.target.value)}
              >
                {BUSINESS_CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <AsyncButton type="submit" loading={savingBroadcast} loadingText="Creating...">
            Create broadcast
          </AsyncButton>
        </form>

        <section className="svx-wa-campaign-list">
          <div className="svx-wa-list-head">
            <h3>Promotions</h3>
            <Badge tone="neutral">{promotions.length}</Badge>
          </div>

          {promotions.slice(0, promotionLimit).map((promotion) => (
            <article key={promotion.id} className="svx-wa-campaign-card">
              <div>
                <strong>{promotion.title}</strong>
                <p>{promotion.message || "No message"}</p>
                <span>Used in {Number(promotion.usage?.broadcastCount || 0)} broadcast(s)</span>
              </div>
              <Badge tone={promotion.sentAt ? "success" : "warning"}>
                {promotion.sentAt ? "Sent" : "Draft"}
              </Badge>
            </article>
          ))}

          {promotions.length > promotionLimit ? (
            <button
              type="button"
              className="svx-wa-secondary-action"
              onClick={() => setPromotionLimit((value) => value + PROMOTION_LIST_LIMIT)}
            >
              Load more promotions
            </button>
          ) : null}
        </section>

        <section className="svx-wa-campaign-list">
          <div className="svx-wa-list-head">
            <h3>Broadcasts</h3>
            <Badge tone="neutral">{broadcasts.length}</Badge>
          </div>

          {broadcasts.slice(0, broadcastLimit).map((broadcast) => (
            <article key={broadcast.id} className="svx-wa-broadcast-card">
              <div>
                <Badge tone={toneForStatus(broadcast.status)}>
                  {statusLabel(broadcast.status)}
                </Badge>
                <strong>{broadcast.promotion?.title || "Customer broadcast"}</strong>
                <p>{broadcast.promotion?.message || "No promotion message attached"}</p>
              </div>

              <div className="svx-wa-broadcast-stats">
                <span>
                  <small>Customers</small>
                  <strong>{Number(broadcast.recipientCount || 0)}</strong>
                </span>
                <span>
                  <small>Sent</small>
                  <strong>{Number(broadcast.deliveredCount || 0)}</strong>
                </span>
              </div>

              <div className="svx-wa-card-actions">
                <AsyncButton
                  onClick={() => queueBroadcast(broadcast.id)}
                  loading={busyBroadcastId === broadcast.id}
                  loadingText="Working..."
                  variant="secondary"
                >
                  Queue
                </AsyncButton>
                <AsyncButton
                  onClick={() => sendBroadcast(broadcast.id)}
                  loading={busyBroadcastId === broadcast.id}
                  loadingText="Sending..."
                >
                  Send now
                </AsyncButton>
              </div>
            </article>
          ))}

          {broadcasts.length > broadcastLimit ? (
            <button
              type="button"
              className="svx-wa-secondary-action"
              onClick={() => setBroadcastLimit((value) => value + BROADCAST_LIST_LIMIT)}
            >
              Load more broadcasts
            </button>
          ) : null}
        </section>
      </div>
    </section>
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
      const payload = {
        businessName: businessName.trim(),
        phoneNumber: phoneNumber.trim(),
        phoneNumberId: phoneNumberId.trim() || null,
        wabaId: wabaId.trim() || null,
        ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
      };

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
    <section className="svx-wa-page-panel">
      <div className="svx-wa-section-title">
        <p>Connection</p>
        <h2>WhatsApp accounts</h2>
        <span>
          Manage the WhatsApp number used by this workspace. Storvex keeps customer chats, sales,
          stock, drawer and records controlled from one business workspace.
        </span>
      </div>

      <form onSubmit={save} className="svx-wa-setup-form">
        <div className="svx-wa-setup-head">
          <div>
            <Badge tone={account?.isActive ? "success" : "neutral"}>
              {account?.isActive ? "Active" : "Paused"}
            </Badge>
            <h3>Active WhatsApp account</h3>
          </div>

          {account?.id ? (
            <AsyncButton
              type="button"
              onClick={toggleActive}
              loading={toggling}
              loadingText="Updating..."
              variant="secondary"
            >
              {account.isActive ? "Pause" : "Activate"}
            </AsyncButton>
          ) : null}
        </div>

        <div className="svx-wa-form-grid">
          <label>
            <span>Business name</span>
            <input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Business name shown to customers"
            />
          </label>

          <label>
            <span>Phone number</span>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="2507XXXXXXXX"
            />
          </label>

          <label>
            <span>Phone number ID</span>
            <input
              value={phoneNumberId}
              onChange={(event) => setPhoneNumberId(event.target.value)}
              placeholder="Meta phone number ID"
            />
          </label>

          <label>
            <span>WABA ID</span>
            <input
              value={wabaId}
              onChange={(event) => setWabaId(event.target.value)}
              placeholder="WhatsApp business account ID"
            />
          </label>

          <label className="is-wide">
            <span>Access token</span>
            <input
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              placeholder={
                account?.hasAccessToken
                  ? "Already saved. Enter only if replacing."
                  : "WhatsApp access token"
              }
            />
          </label>
        </div>

        <AsyncButton type="submit" loading={saving} loadingText="Saving...">
          Save connection
        </AsyncButton>
      </form>
    </section>
  );
}

function ActivityWorkspace({ conversations, drafts, broadcasts }) {
  const rows = [
    ...conversations.slice(0, 6).map((item) => ({
      id: `conversation-${item.id}`,
      title: customerName(item),
      text: latestPreview(item),
      status: statusLabel(item.status),
      time: item.updatedAt || item.createdAt,
    })),
    ...drafts.slice(0, 4).map((item) => ({
      id: `draft-${item.id}`,
      title: "Draft sale",
      text: `${money(item.total)} · ${item.items?.length || 0} item(s)`,
      status: "Draft",
      time: item.updatedAt || item.createdAt,
    })),
    ...broadcasts.slice(0, 4).map((item) => ({
      id: `broadcast-${item.id}`,
      title: item.promotion?.title || "Broadcast",
      text: `${Number(item.recipientCount || 0)} customer(s) targeted`,
      status: statusLabel(item.status),
      time: item.updatedAt || item.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
    .slice(0, 12);

  return (
    <section className="svx-wa-page-panel">
      <div className="svx-wa-section-title">
        <p>Activity</p>
        <h2>WhatsApp workspace history</h2>
        <span>Recent customer messages, draft sales and campaign updates.</span>
      </div>

      {rows.length ? (
        <div className="svx-wa-activity-list">
          {rows.map((row) => (
            <article key={row.id} className="svx-wa-activity-row">
              <span className="svx-wa-activity-dot" />
              <div>
                <strong>{row.title}</strong>
                <p>{row.text}</p>
              </div>
              <Badge tone={toneForStatus(row.status)}>{row.status}</Badge>
              <small>{formatDay(row.time)}</small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No WhatsApp activity yet"
          body="Activity will appear after customer conversations, draft sales, and broadcasts."
        />
      )}
    </section>
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

      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.sellPrice,
          stockQty: product.stockQty,
        },
      ];
    });
  }

  function updateQty(productId, nextQty) {
    const quantity = Math.max(1, Number(nextQty || 1));

    setItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  }

  async function submit() {
    if (!conversation?.id) return;
    if (!items.length) return toast.error("Add at least one product");

    setSaving(true);

    try {
      const payload = {
        branchId: conversation.branchId || undefined,
        customerId: conversation.customerId || undefined,
        customer: conversation.customer
          ? undefined
          : { name: conversation.phone, phone: conversation.phone },
        saleType,
        dueDate: saleType === "CREDIT" && dueDate ? dueDate : null,
        amountPaid: Number(amountPaid || 0),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
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

  const total = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  return (
    <div className="svx-wa-modal-backdrop">
      <div className="svx-wa-modal is-wide">
        <header className="svx-wa-modal-head">
          <div>
            <p>WhatsApp sale draft</p>
            <h2>Prepare customer order</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="svx-wa-modal-grid">
          <section>
            <form onSubmit={runSearch} className="svx-wa-search-form">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search product, SKU, model, barcode..."
              />
              <AsyncButton type="submit" loading={searching} loadingText="Searching...">
                Search
              </AsyncButton>
            </form>

            <div className="svx-wa-product-grid">
              {products.map((product) => (
                <button key={product.id} type="button" onClick={() => addProduct(product)}>
                  <strong>{product.name}</strong>
                  <span>Stock {product.stockQty}</span>
                  <small>{money(product.sellPrice)}</small>
                </button>
              ))}
            </div>
          </section>

          <aside className="svx-wa-draft-builder">
            <h3>Draft summary</h3>

            <div className="svx-wa-draft-items">
              {items.length ? (
                items.map((item) => (
                  <article key={item.productId}>
                    <div>
                      <strong>{item.name}</strong>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) =>
                            current.filter((entry) => entry.productId !== item.productId)
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <label>
                      Qty
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) => updateQty(item.productId, event.target.value)}
                      />
                    </label>
                  </article>
                ))
              ) : (
                <p>No product added yet.</p>
              )}
            </div>

            <div className="svx-wa-sale-type-grid">
              {["CREDIT", "CASH"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSaleType(type)}
                  className={cx(saleType === type && "is-active")}
                >
                  {statusLabel(type)}
                </button>
              ))}
            </div>

            {saleType === "CREDIT" ? (
              <div className="svx-wa-form-grid is-one">
                <label>
                  <span>Deposit paid now</span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(event) => setAmountPaid(event.target.value)}
                    placeholder="Deposit paid now"
                  />
                </label>

                <label>
                  <span>Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            <div className="svx-wa-total-box">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>

            <AsyncButton onClick={submit} loading={saving} loadingText="Creating...">
              Create draft sale
            </AsyncButton>
          </aside>
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
    <div className="svx-wa-modal-backdrop">
      <div className="svx-wa-modal">
        <header className="svx-wa-modal-head">
          <div>
            <p>Assign conversation</p>
            <h2>Choose responsible staff</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="svx-wa-staff-list">
          {staff.length ? (
            staff.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => assign(person.id)}
                disabled={Boolean(savingId)}
              >
                <span>
                  <strong>{person.name || person.email}</strong>
                  <small>{person.role}</small>
                </span>
                <em>{savingId === person.id ? "Assigning..." : "Assign"}</em>
              </button>
            ))
          ) : (
            <EmptyState
              title="No assignable staff"
              body="No staff members are available for WhatsApp assignment."
            />
          )}
        </div>

        <AsyncButton
          onClick={clear}
          loading={savingId === "clear"}
          loadingText="Clearing..."
          variant="secondary"
        >
          Clear assignment
        </AsyncButton>
      </div>
    </div>
  );
}

export default function WhatsAppInbox() {
  const navigate = useNavigate();
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
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesSummaryLoading, setSalesSummaryLoading] = useState(false);

  async function loadConversations({ showSkeleton = false } = {}) {
    let skeletonTimer = null;

    if (showSkeleton && !hasLoadedOnceRef.current) {
      setLoading(true);
      skeletonTimer = window.setTimeout(() => setShowPageSkeleton(true), 220);
    }

    try {
      const conversationData = await listWhatsAppConversations();
      const nextConversations = conversationData.conversations || [];

      setConversations(
        nextConversations.map((item) =>
          item.id === selectedId ? markConversationOpened(item) : item
        )
      );

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
      const safeDrafts = canUseInbox
        ? listWhatsAppSaleDrafts().catch(() => ({ drafts: [] }))
        : Promise.resolve({ drafts: [] });

      const safeStaff = canManageTools
        ? listAssignableWhatsAppStaff().catch(() => ({ staff: [] }))
        : Promise.resolve({ staff: [] });

      const safeAccounts = canManageTools
        ? listWhatsAppAccounts().catch(() => ({ accounts: [] }))
        : Promise.resolve({ accounts: [] });

      const safeBroadcasts = canManageTools
        ? listWhatsAppBroadcasts({ limit: 50 }).catch(() => ({ broadcasts: [] }))
        : Promise.resolve({ broadcasts: [] });

      const safePromotions = canManageTools
        ? listWhatsAppPromotions({ limit: 50 }).catch(() => ({ promotions: [] }))
        : Promise.resolve({ promotions: [] });

      const [draftData, staffData, accountData, broadcastData, promotionData] =
        await Promise.all([safeDrafts, safeStaff, safeAccounts, safeBroadcasts, safePromotions]);

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
    document.title = "WhatsApp Workspace • Storvex";
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canManageTools && ["broadcasts", "activity", "setup"].includes(workspaceTab)) {
      setWorkspaceTab("inbox");
    }
  }, [canManageTools, workspaceTab]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) || null,
    [conversations, selectedId]
  );

  const linkedDraft = useMemo(() => {
    if (!selectedConversation) return null;

    return (
      drafts.find((draft) => draft.conversationId === selectedConversation.id) ||
      drafts.find(
        (draft) =>
          draft.customerId &&
          selectedConversation.customerId &&
          draft.customerId === selectedConversation.customerId
      ) ||
      null
    );
  }, [drafts, selectedConversation]);

  useEffect(() => {
    let alive = true;

    async function loadCustomerIntelligence() {
      if (!selectedConversation?.id) {
        setSalesSummary(null);
        return;
      }

      setSalesSummaryLoading(true);

      try {
        const summary = await getWhatsAppConversationSalesSummary(selectedConversation.id);
        if (alive) setSalesSummary(summary);
      } catch (err) {
        if (alive) {
          setSalesSummary(null);
          console.error("WhatsApp sales summary load failed:", err?.message || err);
        }
      } finally {
        if (alive) setSalesSummaryLoading(false);
      }
    }

    loadCustomerIntelligence();

    return () => {
      alive = false;
    };
  }, [selectedConversation?.id]);

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
        setConversations((current) =>
          current.map((item) => (item.id === selectedId ? markConversationOpened(item) : item))
        );
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
    setConversations((current) =>
      current.map((item) => (item.id === conversation.id ? markConversationOpened(item) : item))
    );
  }

  function updateConversationLocally(conversation) {
    if (!conversation?.id) return;

    setConversations((current) =>
      current.map((item) => (item.id === conversation.id ? { ...item, ...conversation } : item))
    );
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

  function fillPaymentReminder() {
      if (!selectedConversation) return;

      setReplyText(
        `Hello ${customerName(selectedConversation)}, this is a friendly reminder about your pending payment. Please let us know when you will be able to complete it. Thank you.`
      );
    }

  function createQuotationFromConversation() {
    if (!selectedConversation?.id) return;

    const prefill = buildWhatsAppProformaPrefill({
      conversation: selectedConversation,
      draft: linkedDraft,
    });

    if (!prefill) return;

    try {
      sessionStorage.setItem("storvex:whatsapp-proforma-prefill", JSON.stringify(prefill));
    } catch (error) {
      console.error("Could not store WhatsApp proforma prefill:", error);
    }

    navigate("/app/documents/proformas/create", {
      state: {
        proformaPrefill: prefill,
      },
    });
  }

  function handleRecommendedAction(action) {
    const actionType = action?.action || "";

    if (actionType === "DRAFT") {
      setDraftModalOpen(true);
      return;
    }

    if (actionType === "QUOTATION") {
      createQuotationFromConversation();
      return;
    }

    if (actionType === "REMINDER") {
      fillPaymentReminder();
      return;
    }

    toast.success(action?.label || "Recommended action selected");
  }

  async function toggleStatus() {
    if (!selectedConversation?.id) return;

    const nextStatus = selectedConversation.status === "OPEN" ? "CLOSED" : "OPEN";

    try {
      const result = await updateWhatsAppConversationStatus(selectedConversation.id, {
        status: nextStatus,
      });

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

  function onDraftCreated(draft) {
    setDrafts((current) => [draft, ...current].filter(Boolean));
    loadSecondaryWhatsAppData();
  }

  function onAssigned(conversation) {
    updateConversationLocally(conversation);
    loadSecondaryWhatsAppData();
  }

  if (!canUseInbox) {
    return (
      <main className="svx-wa-workspace">
        <EmptyState
          title="WhatsApp access is not enabled for your role"
          body="Ask the owner or manager to update your WhatsApp workspace permission."
        />
      </main>
    );
  }

  if (showPageSkeleton || (loading && !hasLoadedOnceRef.current)) {
    return <PageSkeleton titleWidth="w-44" lines={6} variant="default" />;
  }

  const activeAccount = accounts.find((account) => account.isActive) || accounts[0] || null;
  const unreadTotal = conversations.reduce(
    (sum, conversation) => sum + unreadCount(conversation, conversation.id === selectedId),
    0
  );
  const draftTotal = drafts.length;
  const scheduledCampaigns = broadcasts.filter((item) =>
    ["DRAFT", "QUEUED"].includes(String(item.status || "").toUpperCase())
  ).length;

  return (
    <main className="svx-wa-workspace">
      <section className="svx-wa-hero">
        <div className="svx-wa-hero-copy">
          <Badge tone="info">WhatsApp</Badge>
          <h1>WhatsApp Workspace</h1>
          <p>
            Manage customer conversations, sale orders and campaigns from one store number.
            Collaborate with your team and grow sales.
          </p>
        </div>

        <div className="svx-wa-hero-actions">
          <Badge tone={activeAccount?.isActive ? "success" : "warning"}>
            {activeAccount?.isActive ? "Connected" : "Setup needed"}
          </Badge>


          <AsyncButton
            type="button"
            loading={refreshing}
            loadingText="Refreshing..."
            onClick={() => load({ silent: true })}
            className="svx-wa-refresh-button"
          >
            Refresh
          </AsyncButton>
        </div>
      </section>

      <section className="svx-wa-metrics">
        <MetricCard
          label="Active conversations"
          value={conversations.length}
          note={`${unreadTotal} unread`}
          icon={<ChatIcon />}
          tone="success"
        />
        <MetricCard
          label="Draft sales"
          value={draftTotal}
          note="Need completion"
          icon={<DraftIcon />}
          tone={draftTotal > 0 ? "warning" : "info"}
        />
        <MetricCard
          label="Scheduled campaigns"
          value={scheduledCampaigns}
          note="Upcoming broadcasts"
          icon={<CampaignIcon />}
          tone={scheduledCampaigns > 0 ? "warning" : "info"}
        />
        <MetricCard
          label="Team members"
          value={staff.length}
          note="Active on WhatsApp"
          icon={<TeamIcon />}
          tone="info"
        />
      </section>

      <WorkspaceTabs value={workspaceTab} onChange={setWorkspaceTab} canManageTools={canManageTools} />

      {workspaceTab === "inbox" ? (
        <section className="svx-wa-inbox-grid">
          <ConversationList
            conversations={conversations}
            drafts={drafts}
            selectedId={selectedId}
            selectedSalesSummary={salesSummary}
            onSelect={openConversation}
            search={search}
            setSearch={setSearch}
          />

          <ChatPanel
            conversation={selectedConversation}
            messages={messages}
            messagesConversationId={messagesConversationId}
            messagesLoading={messagesLoading}
            showMessagesSkeleton={showMessagesSkeleton}
            replyText={replyText}
            setReplyText={setReplyText}
            sending={sending}
            onSend={submitReply}
            onCreateDraft={() => setDraftModalOpen(true)}
            onCreateQuotation={createQuotationFromConversation}
            onPaymentReminder={fillPaymentReminder}
            salesSummary={salesSummary}
            linkedDraft={linkedDraft}
            messagesEndRef={messagesEndRef}
          />

          <CustomerPanel
            conversation={selectedConversation}
            draft={linkedDraft}
            salesSummary={salesSummary}
            salesSummaryLoading={salesSummaryLoading}
            canManageTools={canManageTools}
            onCreateDraft={() => setDraftModalOpen(true)}
            onCreateQuotation={createQuotationFromConversation}
            onRecommendedAction={handleRecommendedAction}
            onAssign={() => setAssignModalOpen(true)}
            onToggleStatus={toggleStatus}
            onFinalize={finalizeLinkedDraft}
            finalizing={finalizing}
          />
        </section>
      ) : null}

      {workspaceTab === "drafts" ? (
        <DraftsWorkspace
          drafts={drafts}
          conversations={conversations}
          onOpenConversation={openConversation}
          onFinalize={finalizeDraft}
          finalizingDraftId={finalizingDraftId}
        />
      ) : null}

      {workspaceTab === "broadcasts" && canManageTools ? (
        <BroadcastsWorkspace
          accounts={accounts}
          promotions={promotions}
          broadcasts={broadcasts}
          onRefresh={() => load({ silent: true })}
        />
      ) : null}

      {workspaceTab === "activity" && canManageTools ? (
        <ActivityWorkspace conversations={conversations} drafts={drafts} broadcasts={broadcasts} />
      ) : null}

      {workspaceTab === "setup" && canManageTools ? (
        <SetupWorkspace accounts={accounts} onRefresh={() => load({ silent: true })} />
      ) : null}

      <CreateDraftModal
        open={draftModalOpen}
        conversation={selectedConversation}
        onClose={() => setDraftModalOpen(false)}
        onCreated={onDraftCreated}
      />

      <AssignModal
        open={assignModalOpen}
        staff={staff}
        conversation={selectedConversation}
        onClose={() => setAssignModalOpen(false)}
        onAssigned={onAssigned}
      />
    </main>
  );
}
