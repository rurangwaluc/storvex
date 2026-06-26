import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { convertProformaToSale } from "../../services/proformasApi";
import { createDeliveryNote } from "../../services/deliveryNotesApi";
import {
  finalizeWhatsAppSaleDraft,
  getWhatsAppConversationSalesSummary,
  listAssignableWhatsAppStaff,
  listWhatsAppAccounts,
  listWhatsAppBroadcasts,
  listWhatsAppConversationMessages,
  listWhatsAppConversations,
  listWhatsAppPromotions,
  listWhatsAppSaleDrafts,
  replyToWhatsAppConversation,
  updateWhatsAppConversationStatus,
} from "../../services/whatsappApi";
import { BroadcastsWorkspace } from "./components/WhatsAppBroadcastsWorkspace";
import { ActivityWorkspace, AssignModal, CreateDraftModal, SetupWorkspace } from "./components/WhatsAppToolsWorkspace";
import {
  Badge,
  CampaignIcon,
  ChatIcon,
  ChatPanel,
  CustomerPanel,
  DraftIcon,
  DraftsWorkspace,
  EmptyState,
  MetricCard,
  TeamIcon,
  WorkspaceTabs,
  ConversationList,
} from "./components/WhatsAppInboxPanels";
import {
  buildWhatsAppProformaPrefill,
  canManageWhatsAppTools,
  canUseWhatsAppInbox,
  cleanText,
  convertedDraftSaleIds,
  customerName,
  deliveryNoteCustomerMessage,
  getCurrentUserRole,
  isActiveWhatsAppDraft,
  hasDeliveryNote,
  latestCompletedSale,
  latestDeliveryNote,
  latestOpenQuotation,
  latestQuotation,
  latestWarranty,
  markConversationOpened,
  normalizeDraftItemsForProforma,
  normalizeSaleItemsForDelivery,
  quotationFollowUpMessage,
  safeError,
  unreadCount,
  warrantyCustomerMessage,
} from "./lib/whatsappInbox.utils";
import "./WhatsAppInbox.css";

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
  const [convertingProformaId, setConvertingProformaId] = useState("");
  const [creatingDeliveryNote, setCreatingDeliveryNote] = useState(false);
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

    const matchingDraft =
      drafts.find((draft) => draft.conversationId === selectedConversation.id) ||
      drafts.find(
        (draft) =>
          draft.customerId &&
          selectedConversation.customerId &&
          draft.customerId === selectedConversation.customerId
      ) ||
      null;

    return isActiveWhatsAppDraft(matchingDraft, salesSummary) ? matchingDraft : null;
  }, [drafts, selectedConversation, salesSummary]);

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

  function fillQuotationFollowUp() {
    if (!selectedConversation) return;

    if (!latestQuotation(salesSummary)) {
      toast.error("Create a quotation before sending a quotation follow-up");
      return;
    }

    setReplyText(quotationFollowUpMessage({
      conversation: selectedConversation,
      summary: salesSummary,
    }));
    toast.success("Quotation follow-up prepared. Review it before sending.");

    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
    }, 60);
  }

  function fillDeliveryNoteMessage() {
    if (!selectedConversation) return;

    if (!latestDeliveryNote(salesSummary)) {
      toast.error("Create a delivery note before sending the delivery message");
      return;
    }

    setReplyText(deliveryNoteCustomerMessage({
      conversation: selectedConversation,
      summary: salesSummary,
    }));
    toast.success("Delivery note message prepared. Review it before sending.");

    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
    }, 60);
  }

  function fillWarrantyMessage() {
    if (!selectedConversation) return;

    if (!latestWarranty(salesSummary)) {
      toast.error("Create a warranty before sending the warranty message");
      return;
    }

    setReplyText(warrantyCustomerMessage({
      conversation: selectedConversation,
      summary: salesSummary,
    }));
    toast.success("Warranty message prepared. Review it before sending.");

    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
    }, 60);
  }

  function createWarrantyFromSale() {
    const sale = latestCompletedSale(salesSummary);

    if (!sale?.id) {
      toast.error("No completed sale was found for this conversation");
      return;
    }

    const warranty = latestWarranty(salesSummary);

    if (warranty?.id) {
      toast.success("Warranty already exists for this sale");
      navigate(`/app/documents/warranties/${encodeURIComponent(warranty.id)}/preview`);
      return;
    }

    navigate(`/app/documents/warranties/create?saleId=${encodeURIComponent(sale.id)}`, {
      state: {
        whatsappConversationId: selectedConversation?.id || null,
        saleId: sale.id,
      },
    });
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

  async function convertLatestProformaToSale(action = {}) {
    const quotation = action?.quotationId ? { id: action.quotationId } : latestOpenQuotation(salesSummary);
    const quotationId = cleanText(quotation?.id);

    if (!quotationId) {
      toast.error("No open quotation was found for this conversation");
      return;
    }

    setConvertingProformaId(quotationId);

    try {
      const result = await convertProformaToSale(quotationId);
      toast.success(result?.alreadyConverted ? "Quotation was already converted" : "Quotation converted to sale");
      await load({ silent: true });
    } catch (err) {
      const message = safeError(err, "Could not convert quotation to sale");

      if (message.toLowerCase().includes("already converted")) {
        toast.success("Quotation was already converted");
        await load({ silent: true });
      } else {
        toast.error(message);
      }
    } finally {
      setConvertingProformaId("");
    }
  }

  async function createDeliveryNoteFromSale() {
    if (!selectedConversation?.id) return;

    const sale = latestCompletedSale(salesSummary);

    if (!sale?.id) {
      toast.error("No completed sale was found for this conversation");
      return;
    }

    if (hasDeliveryNote(salesSummary)) {
      const note = latestDeliveryNote(salesSummary);

      if (note?.id) {
        toast.success("Delivery note already exists for this sale");
        navigate(`/app/documents/delivery-notes/${encodeURIComponent(note.id)}/preview`);
        return;
      }

      toast.success("Delivery note already exists for this sale");
      return;
    }

    const items = normalizeSaleItemsForDelivery(sale);

    if (!items.length) {
      toast.error("This sale has no products to deliver");
      return;
    }

    const customer = sale.customer || selectedConversation.customer || {};
    const customerNameValue =
      cleanText(customer.name) ||
      cleanText(selectedConversation.customer?.name) ||
      customerName(selectedConversation);

    setCreatingDeliveryNote(true);

    try {
      const result = await createDeliveryNote({
        saleId: sale.id,
        customerName: customerNameValue,
        customerPhone:
          cleanText(customer.phone) ||
          cleanText(selectedConversation.customer?.phone) ||
          cleanText(selectedConversation.phone) ||
          undefined,
        customerAddress:
          cleanText(customer.address) ||
          cleanText(selectedConversation.customer?.address) ||
          undefined,
        receivedBy: customerNameValue,
        receivedByPhone:
          cleanText(customer.phone) ||
          cleanText(selectedConversation.customer?.phone) ||
          cleanText(selectedConversation.phone) ||
          undefined,
        notes: `Created from WhatsApp conversation ${selectedConversation.id}. No prices or totals are recorded on delivery notes.`,
        items,
      });

      const note = result?.deliveryNote || result?.data?.deliveryNote || result?.data || result || null;
      const noteId = cleanText(note?.id);

      toast.success(`Delivery note ${note?.number || "created"} created`);
      await load({ silent: true });

      if (noteId) {
        navigate(`/app/documents/delivery-notes/${encodeURIComponent(noteId)}/preview`);
      }
    } catch (err) {
      toast.error(safeError(err, "Could not create delivery note"));
    } finally {
      setCreatingDeliveryNote(false);
    }
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

    if (actionType === "FOLLOW_UP") {
      fillQuotationFollowUp();
      return;
    }

    if (actionType === "REMINDER") {
      fillPaymentReminder();
      return;
    }

    if (actionType === "CONVERT_PROFORMA") {
      convertLatestProformaToSale(action);
      return;
    }

    if (actionType === "DELIVERY_NOTE") {
      createDeliveryNoteFromSale();
      return;
    }

    if (actionType === "DELIVERY_NOTE_MESSAGE") {
      fillDeliveryNoteMessage();
      return;
    }

    if (actionType === "CREATE_WARRANTY") {
      createWarrantyFromSale();
      return;
    }

    if (actionType === "WARRANTY_MESSAGE") {
      fillWarrantyMessage();
      return;
    }

    if (actionType === "AFTER_SALE") {
      toast.success("Sale completed. Follow up with delivery, warranty, or accessories.");
      return;
    }

    if (actionType === "WAITING") {
      toast.success("Quotation follow-up already sent. Wait for the customer response.");
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
            messages={messages}
            salesSummaryLoading={salesSummaryLoading}
            canManageTools={canManageTools}
            onCreateDraft={() => setDraftModalOpen(true)}
            onCreateQuotation={createQuotationFromConversation}
            onPaymentReminder={fillPaymentReminder}
            onCreateDeliveryNote={createDeliveryNoteFromSale}
            onDeliveryNoteMessage={fillDeliveryNoteMessage}
            onRecommendedAction={handleRecommendedAction}
            onAssign={() => setAssignModalOpen(true)}
            onToggleStatus={toggleStatus}
            onFinalize={finalizeLinkedDraft}
            finalizing={finalizing}
            convertingProformaId={convertingProformaId}
            creatingDeliveryNote={creatingDeliveryNote}
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
