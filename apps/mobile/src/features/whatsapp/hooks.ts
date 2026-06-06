import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { stockKeys } from "../stock/hooks";
import {
  createWhatsAppBroadcast,
  createWhatsAppPromotion,
  createWhatsAppSaleDraft,
  deleteWhatsAppPromotion,
  deleteWhatsAppSaleDraft,
  finalizeWhatsAppSaleDraft,
  getWhatsAppBroadcast,
  getWhatsAppPromotion,
  getWhatsAppSaleDraft,
  listWhatsAppBroadcasts,
  listWhatsAppConversationMessages,
  listWhatsAppConversations,
  listWhatsAppPromotions,
  listWhatsAppSaleDrafts,
  markWhatsAppConversationRead,
  queueWhatsAppBroadcast,
  replyToWhatsAppConversation,
  sendWhatsAppBroadcast,
  updateWhatsAppBroadcast,
  updateWhatsAppConversationStatus,
  updateWhatsAppPromotion,
  updateWhatsAppSaleDraft,
} from "./api";
import type {
  CreateWhatsAppBroadcastPayload,
  CreateWhatsAppPromotionPayload,
  CreateWhatsAppSaleDraftPayload,
  FinalizeWhatsAppSaleDraftPayload,
  SendWhatsAppBroadcastPayload,
  UpdateWhatsAppBroadcastPayload,
  UpdateWhatsAppPromotionPayload,
  UpdateWhatsAppSaleDraftPayload,
  WhatsAppBroadcast,
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppPromotion,
  WhatsAppSaleDraft,
} from "./types";

export const whatsappKeys = {
  all: ["whatsapp"] as const,
  conversations: () => ["whatsapp", "conversations"] as const,
  conversationMessages: (conversationId: string) =>
    ["whatsapp", "conversation", conversationId, "messages"] as const,
  drafts: (branchId?: string | null) => ["whatsapp", "sale-drafts", branchId || "active"] as const,
  draft: (saleId: string) => ["whatsapp", "sale-draft", saleId] as const,
  promotions: (params: {
    q?: string | null;
    productId?: string | null;
    sent?: boolean | string | null;
  } = {}) =>
    [
      "whatsapp",
      "promotions",
      params.q || "",
      params.productId || "",
      params.sent === undefined || params.sent === null ? "all" : String(params.sent),
    ] as const,
  promotion: (promotionId: string) => ["whatsapp", "promotion", promotionId] as const,
  broadcasts: (params: {
    status?: string | null;
    accountId?: string | null;
    q?: string | null;
  } = {}) =>
    [
      "whatsapp",
      "broadcasts",
      params.status || "ALL",
      params.accountId || "",
      params.q || "",
    ] as const,
  broadcast: (broadcastId: string) => ["whatsapp", "broadcast", broadcastId] as const,
};

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCustomer(value: WhatsAppConversation["customer"] | WhatsAppSaleDraft["customer"]) {
  if (!value) return null;

  return {
    ...value,
    id: value.id || null,
    name: clean(value.name),
    phone: clean(value.phone),
    email: clean(value.email),
    address: clean(value.address),
  };
}

export function normalizeConversation(value?: WhatsAppConversation | null): WhatsAppConversation | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    phone: clean(value.phone),
    status: clean(value.status, "OPEN").toUpperCase(),
    unreadCount: num(value.unreadCount, 0),
    messageCount: num(value.messageCount, 0),
    customer: normalizeCustomer(value.customer),
    latestMessage: value.latestMessage
      ? {
          ...value.latestMessage,
          id: value.latestMessage.id,
          direction: clean(value.latestMessage.direction, "INBOUND").toUpperCase(),
          type: clean(value.latestMessage.type, "TEXT").toUpperCase(),
          textContent: clean(value.latestMessage.textContent),
        }
      : null,
  };
}

export function normalizeMessage(value?: WhatsAppMessage | null): WhatsAppMessage | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    direction: clean(value.direction, "INBOUND").toUpperCase(),
    type: clean(value.type, "TEXT").toUpperCase(),
    textContent: clean(value.textContent),
  };
}

export function normalizeDraft(value?: WhatsAppSaleDraft | null): WhatsAppSaleDraft | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    total: num(value.total, 0),
    amountPaid: num(value.amountPaid, 0),
    balanceDue: num(value.balanceDue, 0),
    saleType: clean(value.saleType, "CREDIT").toUpperCase(),
    status: clean(value.status),
    isDraft: value.isDraft !== false,
    customer: normalizeCustomer(value.customer),
    items: (value.items || []).map((item) => ({
      ...item,
      id: item.id,
      productId: item.productId,
      quantity: num(item.quantity, 0),
      price: num(item.price ?? item.unitPrice, 0),
      unitPrice: num(item.unitPrice ?? item.price, 0),
      product: item.product
        ? {
            ...item.product,
            id: item.product.id,
            name: clean(item.product.name, "Product"),
            sellPrice: num(item.product.sellPrice, 0),
            stockQty: num(item.product.stockQty, 0),
            branchQty: item.product.branchQty == null ? null : num(item.product.branchQty, 0),
            availableQty: item.product.availableQty == null ? null : num(item.product.availableQty, 0),
          }
        : null,
    })),
  };
}

export function normalizePromotion(value?: WhatsAppPromotion | null): WhatsAppPromotion | null {
  if (!value?.id) return null;

  const broadcastCount = num(value.usage?.broadcastCount, 0);

  return {
    ...value,
    id: value.id,
    title: clean(value.title, "Promotion"),
    message: clean(value.message),
    productId: value.productId || null,
    status: clean(value.status, value.sentAt ? "SENT" : "DRAFT").toUpperCase(),
    canEdit: value.canEdit !== false && !value.sentAt,
    canDelete: value.canDelete !== false && !value.sentAt && broadcastCount === 0,
    usage: {
      broadcastCount,
      hasBeenUsedInBroadcast: Boolean(value.usage?.hasBeenUsedInBroadcast || broadcastCount > 0),
    },
    product: value.product
      ? {
          ...value.product,
          id: value.product.id,
          name: clean(value.product.name, "Product"),
          sellPrice: num(value.product.sellPrice, 0),
          stockQty: num(value.product.stockQty, 0),
        }
      : null,
  };
}

export function normalizeBroadcast(value?: WhatsAppBroadcast | null): WhatsAppBroadcast | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    accountId: value.accountId || value.account?.id || null,
    promotionId: value.promotionId || value.promotion?.id || null,
    templateName: clean(value.templateName, "store_offer"),
    languageCode: clean(value.languageCode, "en_US"),
    status: clean(value.status, "DRAFT").toUpperCase(),
    recipientCount: num(value.recipientCount, 0),
    deliveredCount: num(value.deliveredCount, 0),
    account: value.account
      ? {
          ...value.account,
          id: value.account.id,
          phoneNumber: clean(value.account.phoneNumber),
          businessName: clean(value.account.businessName),
        }
      : null,
    promotion: value.promotion
      ? {
          ...value.promotion,
          id: value.promotion.id,
          title: clean(value.promotion.title, "Promotion"),
          message: clean(value.promotion.message),
          productId: value.promotion.productId || null,
        }
      : null,
  };
}

export function conversationDisplayName(conversation?: WhatsAppConversation | null) {
  return clean(conversation?.customer?.name) || clean(conversation?.phone) || "Customer conversation";
}

export function conversationPreview(conversation?: WhatsAppConversation | null) {
  const text = clean(conversation?.latestMessage?.textContent);
  return text || `${num(conversation?.messageCount, 0)} message(s)`;
}

export function draftCustomerName(draft?: WhatsAppSaleDraft | null) {
  return clean(draft?.customer?.name) || clean(draft?.conversation?.phone) || "WhatsApp customer";
}

export function promotionStatusLabel(promotion?: WhatsAppPromotion | null) {
  const status = clean(promotion?.status, promotion?.sentAt ? "SENT" : "DRAFT").toUpperCase();

  if (status === "SENT") return "Sent";
  return "Draft";
}

export function broadcastStatusLabel(broadcast?: WhatsAppBroadcast | null) {
  const status = clean(broadcast?.status, "DRAFT").toUpperCase();

  if (status === "QUEUED") return "Queued";
  if (status === "SENT") return "Sent";
  if (status === "FAILED") return "Failed";
  return "Draft";
}

export function broadcastTitle(broadcast?: WhatsAppBroadcast | null) {
  return clean(broadcast?.promotion?.title) || clean(broadcast?.templateName, "WhatsApp broadcast");
}

export function useWhatsAppConversations() {
  return useQuery({
    queryKey: whatsappKeys.conversations(),
    queryFn: async () =>
      ((await listWhatsAppConversations()).conversations || [])
        .map((conversation) => normalizeConversation(conversation))
        .filter(Boolean) as WhatsAppConversation[],
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useWhatsAppConversationMessages(conversationId: string) {
  return useQuery({
    queryKey: whatsappKeys.conversationMessages(conversationId),
    queryFn: async () => {
      const response = await listWhatsAppConversationMessages(conversationId);

      return {
        conversation: normalizeConversation(response.conversation || null),
        messages: ((response.messages || [])
          .map((message) => normalizeMessage(message))
          .filter(Boolean) || []) as WhatsAppMessage[],
      };
    },
    enabled: Boolean(conversationId),
    staleTime: 8_000,
    retry: 1,
  });
}

export function useWhatsAppSaleDrafts(branchId?: string | null) {
  return useQuery({
    queryKey: whatsappKeys.drafts(branchId),
    queryFn: async () =>
      ((await listWhatsAppSaleDrafts({ branchId })).drafts || [])
        .map((draft) => normalizeDraft(draft))
        .filter(Boolean) as WhatsAppSaleDraft[],
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useWhatsAppSaleDraft(saleId: string) {
  return useQuery({
    queryKey: whatsappKeys.draft(saleId),
    queryFn: async () => normalizeDraft((await getWhatsAppSaleDraft(saleId)).draft || null),
    enabled: Boolean(saleId),
    staleTime: 8_000,
    retry: 1,
  });
}

export function useWhatsAppPromotions(params: {
  q?: string | null;
  productId?: string | null;
  sent?: boolean | string | null;
  limit?: number | string | null;
} = {}) {
  return useQuery({
    queryKey: whatsappKeys.promotions(params),
    queryFn: async () =>
      ((await listWhatsAppPromotions({ ...params, limit: params.limit || 50 })).promotions || [])
        .map((promotion) => normalizePromotion(promotion))
        .filter(Boolean) as WhatsAppPromotion[],
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useWhatsAppPromotion(promotionId: string) {
  return useQuery({
    queryKey: whatsappKeys.promotion(promotionId),
    queryFn: async () => normalizePromotion((await getWhatsAppPromotion(promotionId)).promotion || null),
    enabled: Boolean(promotionId),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useWhatsAppBroadcasts(params: {
  status?: string | null;
  accountId?: string | null;
  q?: string | null;
  limit?: number | string | null;
} = {}) {
  return useQuery({
    queryKey: whatsappKeys.broadcasts(params),
    queryFn: async () =>
      ((await listWhatsAppBroadcasts({ ...params, limit: params.limit || 50 })).broadcasts || [])
        .map((broadcast) => normalizeBroadcast(broadcast))
        .filter(Boolean) as WhatsAppBroadcast[],
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useWhatsAppBroadcast(broadcastId: string) {
  return useQuery({
    queryKey: whatsappKeys.broadcast(broadcastId),
    queryFn: async () => normalizeBroadcast((await getWhatsAppBroadcast(broadcastId)).broadcast || null),
    enabled: Boolean(broadcastId),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useMarkWhatsAppConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => markWhatsAppConversationRead(conversationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: whatsappKeys.conversations() });
    },
  });
}

export function useReplyToWhatsAppConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { conversationId: string; text: string }) =>
      replyToWhatsAppConversation(variables.conversationId, variables.text),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: whatsappKeys.conversations() }),
        queryClient.invalidateQueries({
          queryKey: whatsappKeys.conversationMessages(variables.conversationId),
        }),
      ]);
    },
  });
}

export function useUpdateWhatsAppConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { conversationId: string; status: string }) =>
      updateWhatsAppConversationStatus(variables.conversationId, variables.status),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: whatsappKeys.conversations() }),
        queryClient.invalidateQueries({
          queryKey: whatsappKeys.conversationMessages(variables.conversationId),
        }),
      ]);
    },
  });
}

export function useCreateWhatsAppSaleDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      conversationId: string;
      payload: CreateWhatsAppSaleDraftPayload;
    }) => createWhatsAppSaleDraft(variables.conversationId, variables.payload),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: whatsappKeys.all }),
        queryClient.invalidateQueries({
          queryKey: whatsappKeys.conversationMessages(variables.conversationId),
        }),
      ]);
    },
  });
}

export function useUpdateWhatsAppSaleDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { saleId: string; payload: UpdateWhatsAppSaleDraftPayload }) =>
      updateWhatsAppSaleDraft(variables.saleId, variables.payload),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: whatsappKeys.all }),
        queryClient.invalidateQueries({ queryKey: whatsappKeys.draft(variables.saleId) }),
      ]);
    },
  });
}

export function useDeleteWhatsAppSaleDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (saleId: string) => deleteWhatsAppSaleDraft(saleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: whatsappKeys.all });
    },
  });
}

export function useFinalizeWhatsAppSaleDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      saleId: string;
      payload: FinalizeWhatsAppSaleDraftPayload;
    }) => finalizeWhatsAppSaleDraft(variables.saleId, variables.payload),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: whatsappKeys.all }),
        queryClient.invalidateQueries({ queryKey: whatsappKeys.draft(variables.saleId) }),
        queryClient.invalidateQueries({ queryKey: stockKeys.all }),
      ]);
    },
  });
}

export function useCreateWhatsAppPromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWhatsAppPromotionPayload) => createWhatsAppPromotion(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: whatsappKeys.all });
    },
  });
}

export function useUpdateWhatsAppPromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      promotionId: string;
      payload: UpdateWhatsAppPromotionPayload;
    }) => updateWhatsAppPromotion(variables.promotionId, variables.payload),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: whatsappKeys.all }),
        queryClient.invalidateQueries({ queryKey: whatsappKeys.promotion(variables.promotionId) }),
      ]);
    },
  });
}

export function useDeleteWhatsAppPromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (promotionId: string) => deleteWhatsAppPromotion(promotionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: whatsappKeys.all });
    },
  });
}

export function useCreateWhatsAppBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWhatsAppBroadcastPayload) => createWhatsAppBroadcast(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: whatsappKeys.all });
    },
  });
}

export function useUpdateWhatsAppBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      broadcastId: string;
      payload: UpdateWhatsAppBroadcastPayload;
    }) => updateWhatsAppBroadcast(variables.broadcastId, variables.payload),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: whatsappKeys.all }),
        queryClient.invalidateQueries({ queryKey: whatsappKeys.broadcast(variables.broadcastId) }),
      ]);
    },
  });
}

export function useQueueWhatsAppBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (broadcastId: string) => queueWhatsAppBroadcast(broadcastId),
    onSuccess: async (_result, broadcastId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: whatsappKeys.all }),
        queryClient.invalidateQueries({ queryKey: whatsappKeys.broadcast(broadcastId) }),
      ]);
    },
  });
}

export function useSendWhatsAppBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      broadcastId: string;
      payload: SendWhatsAppBroadcastPayload;
    }) => sendWhatsAppBroadcast(variables.broadcastId, variables.payload),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: whatsappKeys.all }),
        queryClient.invalidateQueries({ queryKey: whatsappKeys.broadcast(variables.broadcastId) }),
        queryClient.invalidateQueries({ queryKey: whatsappKeys.conversations() }),
      ]);
    },
  });
}