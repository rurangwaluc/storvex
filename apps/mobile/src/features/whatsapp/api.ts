import { api } from "../../lib/api/client";
import type {
  CreateWhatsAppBroadcastPayload,
  CreateWhatsAppPromotionPayload,
  CreateWhatsAppSaleDraftPayload,
  CreateWhatsAppSaleDraftResponse,
  DeleteWhatsAppSaleDraftResponse,
  FinalizeWhatsAppSaleDraftPayload,
  FinalizeWhatsAppSaleDraftResponse,
  SendWhatsAppBroadcastPayload,
  UpdateWhatsAppBroadcastPayload,
  UpdateWhatsAppPromotionPayload,
  UpdateWhatsAppSaleDraftPayload,
  UpdateWhatsAppSaleDraftResponse,
  WhatsAppBroadcastResponse,
  WhatsAppBroadcastsResponse,
  WhatsAppConversationsResponse,
  WhatsAppDeletePromotionResponse,
  WhatsAppMessagesResponse,
  WhatsAppPromotionResponse,
  WhatsAppPromotionsResponse,
  WhatsAppReplyResponse,
  WhatsAppSaleDraftResponse,
  WhatsAppSaleDraftsResponse,
  WhatsAppSendBroadcastResponse,
  WhatsAppStatusResponse,
} from "./types";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function appendQuery(path: string, params: Record<string, unknown> = {}) {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = clean(value);
    if (!text) return;
    qs.set(key, text);
  });

  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}

export function listWhatsAppConversations() {
  return api.get<WhatsAppConversationsResponse>("/whatsapp/inbox/conversations");
}

export function listWhatsAppConversationMessages(conversationId: string) {
  const id = clean(conversationId);

  if (!id) {
    throw new Error("Conversation record is missing.");
  }

  return api.get<WhatsAppMessagesResponse>(
    `/whatsapp/inbox/conversations/${encodeURIComponent(id)}/messages`,
  );
}

export function markWhatsAppConversationRead(conversationId: string) {
  const id = clean(conversationId);

  if (!id) {
    throw new Error("Conversation record is missing.");
  }

  return api.patch<{ ok?: boolean; conversationId?: string; unreadCount?: number }>(
    `/whatsapp/inbox/conversations/${encodeURIComponent(id)}/read`,
    {},
  );
}

export function replyToWhatsAppConversation(conversationId: string, text: string) {
  const id = clean(conversationId);
  const body = clean(text);

  if (!id) {
    throw new Error("Conversation record is missing.");
  }

  if (!body) {
    throw new Error("Reply message is required.");
  }

  return api.post<WhatsAppReplyResponse>(
    `/whatsapp/inbox/conversations/${encodeURIComponent(id)}/reply`,
    { text: body },
  );
}

export function updateWhatsAppConversationStatus(conversationId: string, status: string) {
  const id = clean(conversationId);
  const nextStatus = clean(status).toUpperCase();

  if (!id) {
    throw new Error("Conversation record is missing.");
  }

  if (!nextStatus) {
    throw new Error("Conversation status is required.");
  }

  return api.patch<WhatsAppStatusResponse>(
    `/whatsapp/inbox/conversations/${encodeURIComponent(id)}/status`,
    { status: nextStatus },
  );
}

export function listWhatsAppSaleDrafts(params: { branchId?: string | null } = {}) {
  return api.get<WhatsAppSaleDraftsResponse>(
    appendQuery("/whatsapp/inbox/sale-drafts", { branchId: params.branchId }),
  );
}

export function getWhatsAppSaleDraft(saleId: string) {
  const id = clean(saleId);

  if (!id) {
    throw new Error("Sale draft record is missing.");
  }

  return api.get<WhatsAppSaleDraftResponse>(
    `/whatsapp/inbox/sale-drafts/${encodeURIComponent(id)}`,
  );
}

export function createWhatsAppSaleDraft(
  conversationId: string,
  payload: CreateWhatsAppSaleDraftPayload,
) {
  const id = clean(conversationId);

  if (!id) {
    throw new Error("Conversation record is missing.");
  }

  return api.post<CreateWhatsAppSaleDraftResponse>(
    `/whatsapp/inbox/conversations/${encodeURIComponent(id)}/sale-draft`,
    payload,
  );
}

export function updateWhatsAppSaleDraft(
  saleId: string,
  payload: UpdateWhatsAppSaleDraftPayload,
) {
  const id = clean(saleId);

  if (!id) {
    throw new Error("Sale draft record is missing.");
  }

  return api.patch<UpdateWhatsAppSaleDraftResponse>(
    `/whatsapp/inbox/sale-drafts/${encodeURIComponent(id)}`,
    payload,
  );
}

export function deleteWhatsAppSaleDraft(saleId: string) {
  const id = clean(saleId);

  if (!id) {
    throw new Error("Sale draft record is missing.");
  }

  return api.delete<DeleteWhatsAppSaleDraftResponse>(
    `/whatsapp/inbox/sale-drafts/${encodeURIComponent(id)}`,
  );
}

export function finalizeWhatsAppSaleDraft(
  saleId: string,
  payload: FinalizeWhatsAppSaleDraftPayload,
) {
  const id = clean(saleId);

  if (!id) {
    throw new Error("Sale draft record is missing.");
  }

  return api.post<FinalizeWhatsAppSaleDraftResponse>(
    `/whatsapp/inbox/sale-drafts/${encodeURIComponent(id)}/finalize`,
    payload,
  );
}

export function listWhatsAppPromotions(params: {
  q?: string | null;
  productId?: string | null;
  sent?: boolean | string | null;
  limit?: number | string | null;
} = {}) {
  return api.get<WhatsAppPromotionsResponse>(
    appendQuery("/whatsapp/promotions", {
      q: params.q,
      productId: params.productId,
      sent: params.sent,
      limit: params.limit,
    }),
  );
}

export function getWhatsAppPromotion(promotionId: string) {
  const id = clean(promotionId);

  if (!id) {
    throw new Error("Promotion record is missing.");
  }

  return api.get<WhatsAppPromotionResponse>(
    `/whatsapp/promotions/${encodeURIComponent(id)}`,
  );
}

export function createWhatsAppPromotion(payload: CreateWhatsAppPromotionPayload) {
  return api.post<WhatsAppPromotionResponse>("/whatsapp/promotions", payload);
}

export function updateWhatsAppPromotion(
  promotionId: string,
  payload: UpdateWhatsAppPromotionPayload,
) {
  const id = clean(promotionId);

  if (!id) {
    throw new Error("Promotion record is missing.");
  }

  return api.patch<WhatsAppPromotionResponse>(
    `/whatsapp/promotions/${encodeURIComponent(id)}`,
    payload,
  );
}

export function deleteWhatsAppPromotion(promotionId: string) {
  const id = clean(promotionId);

  if (!id) {
    throw new Error("Promotion record is missing.");
  }

  return api.delete<WhatsAppDeletePromotionResponse>(
    `/whatsapp/promotions/${encodeURIComponent(id)}`,
  );
}

export function listWhatsAppBroadcasts(params: {
  status?: string | null;
  accountId?: string | null;
  q?: string | null;
  limit?: number | string | null;
} = {}) {
  return api.get<WhatsAppBroadcastsResponse>(
    appendQuery("/whatsapp/broadcasts", {
      status: params.status,
      accountId: params.accountId,
      q: params.q,
      limit: params.limit,
    }),
  );
}

export function getWhatsAppBroadcast(broadcastId: string) {
  const id = clean(broadcastId);

  if (!id) {
    throw new Error("Broadcast record is missing.");
  }

  return api.get<WhatsAppBroadcastResponse>(
    `/whatsapp/broadcasts/${encodeURIComponent(id)}`,
  );
}

export function createWhatsAppBroadcast(payload: CreateWhatsAppBroadcastPayload) {
  return api.post<WhatsAppBroadcastResponse>("/whatsapp/broadcasts", payload);
}

export function updateWhatsAppBroadcast(
  broadcastId: string,
  payload: UpdateWhatsAppBroadcastPayload,
) {
  const id = clean(broadcastId);

  if (!id) {
    throw new Error("Broadcast record is missing.");
  }

  return api.patch<WhatsAppBroadcastResponse>(
    `/whatsapp/broadcasts/${encodeURIComponent(id)}`,
    payload,
  );
}

export function queueWhatsAppBroadcast(broadcastId: string) {
  const id = clean(broadcastId);

  if (!id) {
    throw new Error("Broadcast record is missing.");
  }

  return api.post<WhatsAppBroadcastResponse>(
    `/whatsapp/broadcasts/${encodeURIComponent(id)}/queue`,
    {},
  );
}

export function sendWhatsAppBroadcast(
  broadcastId: string,
  payload: SendWhatsAppBroadcastPayload,
) {
  const id = clean(broadcastId);

  if (!id) {
    throw new Error("Broadcast record is missing.");
  }

  return api.post<WhatsAppSendBroadcastResponse>(
    `/whatsapp/broadcasts/${encodeURIComponent(id)}/send`,
    payload,
  );
}