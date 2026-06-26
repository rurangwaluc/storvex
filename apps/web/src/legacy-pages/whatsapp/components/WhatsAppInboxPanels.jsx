import { useMemo } from "react";
import AsyncButton from "../../../components/ui/AsyncButton";
import * as U from "../lib/whatsappInbox.utils";

const {
  buildSalesTimeline,
  buyingProbability,
  cleanPhone,
  cleanText,
  customerName,
  conversationPriority,
  customerTier,
  cx,
  dateLabel,
  daysSince,
  formatCompactNumber,
  formatDay,
  formatTime,
  hasCompletedSale,
  hasDeliveryNote,
  hasDeliveryNoteCustomerMessage,
  hasQuotation,
  hasQuotationFollowUp,
  hasWarranty,
  hasWarrantyCustomerMessage,
  initials,
  isActiveWhatsAppDraft,
  isQuotationConverted,
  latestCompletedSale,
  latestDeliveryNote,
  latestDeliveryNoteCustomerMessage,
  latestOpenQuotation,
  latestPreview,
  latestQuotation,
  latestQuotationFollowUp,
  latestWarranty,
  latestWarrantyCustomerMessage,
  leadTemperature,
  money,
  opportunityValue,
  probabilityLabel,
  recommendedCustomerAction,
  recommendedSalesAction,
  shortDate,
  statusLabel,
  toneForStatus,
  unreadCount,
} = U;

export function Badge({ children, tone = "neutral" }) {
  return <span className={cx("svx-wa-badge", `is-${tone}`)}>{children}</span>;
}

export function IconShell({ children, tone = "info" }) {
  return <span className={cx("svx-wa-icon", `is-${tone}`)}>{children}</span>;
}

export function ChatIcon() {
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

export function DraftIcon() {
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

export function CampaignIcon() {
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

export function TeamIcon() {
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

export function SettingsIcon() {
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

export function SearchIcon() {
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

export function MetricCard({ label, value, note, icon, tone = "info" }) {
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

export function EmptyState({ title, body }) {
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

export function ConversationRow({ conversation, active, draft, salesSummary, onClick }) {
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


export function deliveryStatusMeta(message, outbound) {
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

export function MessageBubble({ message }) {
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

export function ChatSkeleton() {
  return (
    <div className="svx-wa-chat-skeleton">
      <span />
      <span />
      <span />
    </div>
  );
}

export function WorkspaceTabs({ value, onChange, canManageTools }) {
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

export function ConversationList({ conversations, drafts, selectedId, selectedSalesSummary, onSelect, search, setSearch }) {
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
            const matchingDraft = drafts.find(
              (item) =>
                item.conversationId === conversation.id ||
                (item.customerId && item.customerId === conversation.customerId)
            );
            const draft =
              conversation.id === selectedId
                ? isActiveWhatsAppDraft(matchingDraft, selectedSalesSummary)
                  ? matchingDraft
                  : null
                : matchingDraft;

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

export function DraftSummaryCard({ draft, onFinalize, finalizing = false }) {
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


export function SalesTimeline({ events }) {
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

export function SalesIntelligenceCard({ conversation, draft, summary, messages = [], loading, convertingProformaId = "", creatingDeliveryNote = false, onRecommendedAction }) {
  const safeSummary = summary || {};
  const tier = customerTier(safeSummary);
  const temperature = leadTemperature({ conversation, draft, summary: safeSummary });
  const nextAction = recommendedSalesAction({ conversation, draft, summary: safeSummary, messages });
  const timeline = buildSalesTimeline({ conversation, draft, summary: safeSummary, messages });
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
            <div>
              <span>Delivery notes</span>
              <strong>{Number(safeSummary.deliveryNoteCount || 0)}</strong>
              <small>{latestDeliveryNote(safeSummary)?.number || "No delivery note yet"}</small>
            </div>
            <div>
              <span>Warranties</span>
              <strong>{Number(safeSummary.warrantyCount || 0)}</strong>
              <small>{latestWarranty(safeSummary)?.number || "No warranty yet"}</small>
            </div>
          </div>

          <div className="svx-wa-recommended-action">
            <span>Recommended next action</span>
            <strong>{nextAction.label}</strong>
            <small>{nextAction.detail}</small>
            <button
              type="button"
              disabled={nextAction.disabled || Boolean(convertingProformaId) || Boolean(creatingDeliveryNote)}
              onClick={() => onRecommendedAction?.(nextAction)}
            >
              {convertingProformaId && nextAction.action === "CONVERT_PROFORMA"
                ? "Converting..."
                : nextAction.action === "DELIVERY_NOTE" && creatingDeliveryNote
                  ? "Creating..."
                  : nextAction.primary}
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


export function CustomerPanel({
  conversation,
  draft,
  salesSummary,
  messages = [],
  salesSummaryLoading,
  canManageTools,
  onCreateDraft,
  onCreateQuotation,
  onPaymentReminder,
  onCreateDeliveryNote,
  onDeliveryNoteMessage,
  onRecommendedAction,
  onAssign,
  onToggleStatus,
  onFinalize,
  finalizing,
  convertingProformaId,
  creatingDeliveryNote,
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

  const completedSale = hasCompletedSale(salesSummary);
  const openQuotation = latestOpenQuotation(salesSummary);
  const showQuotationAction = !completedSale && Boolean(draft?.id || openQuotation || !hasQuotation(salesSummary));

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
          {showQuotationAction ? (
            <button type="button" onClick={onCreateQuotation}>
              Quotation
            </button>
          ) : null}
          <button type="button" onClick={onToggleStatus}>
            {conversation.status === "OPEN" ? "Close" : "Reopen"}
          </button>
        </div>
      </section>

      <SalesIntelligenceCard
        conversation={conversation}
        draft={draft}
        summary={salesSummary}
        messages={messages}
        loading={salesSummaryLoading}
        convertingProformaId={convertingProformaId}
        creatingDeliveryNote={creatingDeliveryNote}
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

          {showQuotationAction ? (
            <button type="button" onClick={onCreateQuotation}>
              <strong>Create quotation</strong>
              <span>Use the existing proforma document flow</span>
            </button>
          ) : completedSale ? (
            <>
              {!hasDeliveryNote(salesSummary) ? (
                <button type="button" onClick={onCreateDeliveryNote}>
                  <strong>Create delivery note</strong>
                  <span>Prepare products and quantities only</span>
                </button>
              ) : null}
              <button type="button" onClick={onDeliveryNoteMessage}>
                <strong>Send delivery note message</strong>
                <span>Share delivery note and delivered items</span>
              </button>
            </>
          ) : null}

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
          <div className="svx-wa-info-item">
            <span>Status</span>
            <strong>{statusLabel(conversation.status)}</strong>
          </div>

          <div className="svx-wa-info-item">
            <span>Assigned to</span>
            <strong>{conversation.assignedTo?.name || "Unassigned"}</strong>
          </div>

          <div className="svx-wa-info-item">
            <span>Location</span>
            <strong>{conversation.branchId ? "Ready" : "Location needed"}</strong>
          </div>

          <div className="svx-wa-info-item">
            <span>Last message</span>
            <strong>{formatDay(conversation.updatedAt)}</strong>
          </div>
        </div>
      </section>
    </aside>
  );
}

export function ChatPanel({
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

export function DraftsWorkspace({ drafts, conversations, onOpenConversation, onFinalize, finalizingDraftId }) {
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
