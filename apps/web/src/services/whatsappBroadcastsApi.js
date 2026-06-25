import { apiFetch } from "./apiClient";

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function trimString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function normalizeNullableString(value) {
  const s = trimString(value);
  return s || null;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value == null) return fallback;
  return Boolean(value);
}

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBroadcast(raw) {
  const item = ensureObject(raw);

  return {
    id: trimString(item.id),
    tenantId: trimString(item.tenantId),
    accountId: trimString(item.accountId),
    promotionId: trimString(item.promotionId),
    templateName: trimString(item.templateName),
    languageCode: trimString(item.languageCode || "en_US"),
    status: trimString(item.status || "DRAFT").toUpperCase(),
    createdById: trimString(item.createdById),
    queuedAt: item.queuedAt || null,
    sentAt: item.sentAt || null,
    createdAt: item.createdAt || null,
    recipientCount: normalizeNumber(item.recipientCount, 0),
    deliveredCount: normalizeNumber(item.deliveredCount, 0),

    account: item.account
      ? {
          id: trimString(item.account.id),
          phoneNumber: trimString(item.account.phoneNumber),
          businessName: trimString(item.account.businessName),
          isActive: normalizeBoolean(item.account.isActive, false),
        }
      : null,

    promotion: item.promotion
      ? {
          id: trimString(item.promotion.id),
          title: trimString(item.promotion.title),
          message: typeof item.promotion.message === "string" ? item.promotion.message : "",
          productId: trimString(item.promotion.productId),
          sentAt: item.promotion.sentAt || null,
          createdAt: item.promotion.createdAt || null,
        }
      : null,

    createdBy: item.createdBy
      ? {
          id: trimString(item.createdBy.id),
          name: trimString(item.createdBy.name),
          role: trimString(item.createdBy.role).toUpperCase(),
        }
      : null,
  };
}

function buildBroadcastPayload(payload = {}, { partial = false } = {}) {
  const body = ensureObject(payload);
  const built = {};

  if (!partial || Object.prototype.hasOwnProperty.call(body, "accountId")) {
    built.accountId = normalizeNullableString(body.accountId);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "promotionId")) {
    built.promotionId = normalizeNullableString(body.promotionId);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "templateName")) {
    built.templateName = normalizeNullableString(body.templateName);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "languageCode")) {
    built.languageCode = normalizeNullableString(body.languageCode) || "en_US";
  }

  if (
    Object.prototype.hasOwnProperty.call(body, "targeting") ||
    Object.prototype.hasOwnProperty.call(body, "mode") ||
    Object.prototype.hasOwnProperty.call(body, "targetMode") ||
    Object.prototype.hasOwnProperty.call(body, "branchId") ||
    Object.prototype.hasOwnProperty.call(body, "productId") ||
    Object.prototype.hasOwnProperty.call(body, "category") ||
    Object.prototype.hasOwnProperty.call(body, "businessCategory") ||
    Object.prototype.hasOwnProperty.call(body, "customerIds")
  ) {
    built.targeting = normalizeTargeting(body.targeting || body);
  }

  return built;
}

function normalizeTargeting(payload = {}) {
  const source = ensureObject(payload);

  return {
    mode: trimString(source.mode || source.targetMode || "ALL_OPTED_IN").toUpperCase(),
    branchId: normalizeNullableString(source.branchId),
    productId: normalizeNullableString(source.productId),
    category: normalizeNullableString(source.category || source.businessCategory),
    customerIds: ensureArray(source.customerIds).map(trimString).filter(Boolean),
  };
}

function normalizeRecipientPreview(raw) {
  const item = ensureObject(raw);
  const targeting = ensureObject(item.targeting);

  return {
    mode: trimString(item.mode || targeting.mode || "ALL_OPTED_IN").toUpperCase(),
    audienceLabel: trimString(item.audienceLabel || "WhatsApp customers"),
    recipientCount: normalizeNumber(item.recipientCount, 0),
    previewLimit: normalizeNumber(item.previewLimit, 20),
    hasMore: normalizeBoolean(item.hasMore, false),
    canSend: normalizeBoolean(item.canSend, false),
    warning: trimString(item.warning),
    targeting: {
      mode: trimString(targeting.mode || item.mode || "ALL_OPTED_IN").toUpperCase(),
      branchId: trimString(targeting.branchId),
      productId: trimString(targeting.productId),
      category: trimString(targeting.category || targeting.businessCategory).toUpperCase(),
      manualCustomerCount: normalizeNumber(targeting.manualCustomerCount, 0),
    },
    promotion: item.promotion
      ? {
          id: trimString(item.promotion.id),
          title: trimString(item.promotion.title),
          productId: trimString(item.promotion.productId),
        }
      : null,
    recipients: ensureArray(item.recipients).map((recipient) => ({
      id: trimString(recipient.id),
      name: trimString(recipient.name || "Customer"),
      phone: trimString(recipient.phone),
    })),
  };
}

export async function listWhatsAppBroadcasts(filters = {}) {
  const query = {};
  const cleanStatus = trimString(filters.status);
  const cleanAccountId = trimString(filters.accountId);
  const cleanSearch = trimString(filters.q);
  const cleanLimit = Number(filters.limit);

  if (cleanStatus) query.status = cleanStatus;
  if (cleanAccountId) query.accountId = cleanAccountId;
  if (cleanSearch) query.q = cleanSearch;
  if (Number.isFinite(cleanLimit) && cleanLimit > 0) query.limit = Math.floor(cleanLimit);

  const data = await apiFetch("/whatsapp/broadcasts", { query });

  return {
    broadcasts: ensureArray(data?.broadcasts).map(normalizeBroadcast),
  };
}

export async function previewWhatsAppBroadcastRecipients(payload = {}) {
  const source = ensureObject(payload);
  const limit = Number(source.limit);
  const body = {
    promotionId: normalizeNullableString(source.promotionId),
    targeting: normalizeTargeting(source.targeting || source),
  };

  if (Number.isFinite(limit) && limit > 0) {
    body.limit = Math.floor(limit);
  }

  const data = await apiFetch("/whatsapp/broadcasts/recipients/preview", {
    method: "POST",
    body,
  });

  return {
    ok: normalizeBoolean(data?.ok, false),
    message: trimString(data?.message),
    preview: normalizeRecipientPreview(data?.preview),
  };
}

export async function getWhatsAppBroadcast(broadcastId) {
  const id = trimString(broadcastId);

  if (!id) {
    return { broadcast: null };
  }

  const data = await apiFetch(`/whatsapp/broadcasts/${id}`);

  return {
    broadcast: data?.broadcast ? normalizeBroadcast(data.broadcast) : null,
  };
}

export async function createWhatsAppBroadcast(payload) {
  const body = buildBroadcastPayload(payload, { partial: false });

  const data = await apiFetch("/whatsapp/broadcasts", {
    method: "POST",
    body,
  });

  return {
    created: normalizeBoolean(data?.created, false),
    broadcast: data?.broadcast ? normalizeBroadcast(data.broadcast) : null,
  };
}

export async function updateWhatsAppBroadcast(broadcastId, payload) {
  const id = trimString(broadcastId);
  const body = buildBroadcastPayload(payload, { partial: true });

  const data = await apiFetch(`/whatsapp/broadcasts/${id}`, {
    method: "PATCH",
    body,
  });

  return {
    updated: normalizeBoolean(data?.updated, false),
    broadcast: data?.broadcast ? normalizeBroadcast(data.broadcast) : null,
  };
}

export async function queueWhatsAppBroadcast(broadcastId) {
  const id = trimString(broadcastId);

  const data = await apiFetch(`/whatsapp/broadcasts/${id}/queue`, {
    method: "POST",
    body: {},
  });

  return {
    queued: normalizeBoolean(data?.queued, false),
    broadcast: data?.broadcast ? normalizeBroadcast(data.broadcast) : null,
  };
}

export async function sendWhatsAppBroadcastNow(broadcastId, payload = {}) {
  const id = trimString(broadcastId);
  const source = ensureObject(payload);
  const body = {};
  const limit = Number(source.limit);

  if (Number.isFinite(limit) && limit > 0) {
    body.limit = Math.floor(limit);
  }

  if (
    Object.prototype.hasOwnProperty.call(source, "targeting") ||
    Object.prototype.hasOwnProperty.call(source, "mode") ||
    Object.prototype.hasOwnProperty.call(source, "targetMode") ||
    Object.prototype.hasOwnProperty.call(source, "branchId") ||
    Object.prototype.hasOwnProperty.call(source, "productId") ||
    Object.prototype.hasOwnProperty.call(source, "category") ||
    Object.prototype.hasOwnProperty.call(source, "businessCategory") ||
    Object.prototype.hasOwnProperty.call(source, "customerIds")
  ) {
    body.targeting = normalizeTargeting(source.targeting || source);
  }

  const data = await apiFetch(`/whatsapp/broadcasts/${id}/send`, {
    method: "POST",
    body,
  });

  return {
    sent: normalizeBoolean(data?.sent, false),
    broadcast: data?.broadcast ? normalizeBroadcast(data.broadcast) : null,
    summary: data?.summary
      ? {
          attempted: normalizeNumber(data.summary.attempted, 0),
          delivered: normalizeNumber(data.summary.delivered, 0),
          failed: normalizeNumber(data.summary.failed, 0),
        }
      : {
          attempted: 0,
          delivered: 0,
          failed: 0,
        },
  };
}