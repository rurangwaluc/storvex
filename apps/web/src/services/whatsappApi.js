/* src/services/whatsappApi.js */
import { apiFetch } from "./apiClient";

const BUSINESS_CATEGORIES = Object.freeze([
  "ELECTRONICS",
  "HARDWARE",
  "HOME_KITCHEN",
  "LIGHTING",
  "SPARE_PARTS",
]);

/**
 * WhatsApp API
 *
 * Backend routes currently in use:
 *
 * Accounts:
 * - GET    /whatsapp/accounts
 * - POST   /whatsapp/accounts
 * - GET    /whatsapp/accounts/:id
 * - PATCH  /whatsapp/accounts/:id
 * - PATCH  /whatsapp/accounts/:id/active
 *
 * Inbox:
 * - GET    /whatsapp/inbox/conversations
 * - GET    /whatsapp/inbox/assignable-staff
 * - GET    /whatsapp/inbox/conversations/:id/messages
 * - PATCH  /whatsapp/inbox/conversations/:id/read
 * - POST   /whatsapp/inbox/conversations/:id/reply
 * - PATCH  /whatsapp/inbox/conversations/:id/status
 * - PATCH  /whatsapp/inbox/conversations/:id/assign
 * - PATCH  /whatsapp/inbox/conversations/:id/unassign
 *
 * Sale drafts:
 * - GET    /whatsapp/inbox/sale-drafts
 * - GET    /whatsapp/inbox/sale-drafts/:saleId
 * - POST   /whatsapp/inbox/conversations/:id/sale-draft
 * - POST   /whatsapp/inbox/conversations/:id/create-sale-draft
 * - PATCH  /whatsapp/inbox/sale-drafts/:saleId
 * - DELETE /whatsapp/inbox/sale-drafts/:saleId
 * - POST   /whatsapp/inbox/sale-drafts/:saleId/finalize
 *
 * Broadcasts:
 * - GET    /whatsapp/broadcasts
 * - POST   /whatsapp/broadcasts
 * - GET    /whatsapp/broadcasts/:id
 * - PATCH  /whatsapp/broadcasts/:id
 * - POST   /whatsapp/broadcasts/:id/queue
 * - POST   /whatsapp/broadcasts/:id/send
 *
 * Promotions:
 * - GET    /whatsapp/promotions
 * - POST   /whatsapp/promotions
 * - GET    /whatsapp/promotions/:id
 * - PATCH  /whatsapp/promotions/:id
 * - DELETE /whatsapp/promotions/:id
 */

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

function nullableString(value) {
  const s = trimString(value);
  return s || null;
}

function toBoolean(value) {
  return Boolean(value);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toUpper(value, fallback = "") {
  return trimString(value || fallback).toUpperCase();
}

function buildQuery(params = {}) {
  const search = new URLSearchParams();

  Object.entries(ensureObject(params)).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function sanitizeBranch(value) {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  return {
    id: trimString(item.id),
    name: trimString(item.name),
    code: trimString(item.code),
    isMain: typeof item.isMain === "boolean" ? item.isMain : false,
    status: toUpper(item.status || "ACTIVE"),
  };
}

function sanitizeAssignedUser(value) {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  return {
    id: trimString(item.id),
    name: trimString(item.name),
    email: trimString(item.email),
    role: toUpper(item.role),
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
  };
}

function sanitizeSetupStatus(value) {
  const item = ensureObject(value);

  return {
    isReady: toBoolean(item.isReady),
    isActive: toBoolean(item.isActive),
    requiredMissing: ensureArray(item.requiredMissing).map((entry) => toUpper(entry)),
    warnings: ensureArray(item.warnings).map((entry) => toUpper(entry)),
    checks: {
      hasPhone: toBoolean(item.checks?.hasPhone),
      hasPhoneNumberId: toBoolean(item.checks?.hasPhoneNumberId),
      hasWabaId: toBoolean(item.checks?.hasWabaId),
      hasAccessToken: toBoolean(item.checks?.hasAccessToken),
      hasWebhookVerifyToken: toBoolean(item.checks?.hasWebhookVerifyToken),
      hasAppSecret: toBoolean(item.checks?.hasAppSecret),
    },
  };
}

function sanitizeChannelStrategy(value) {
  const item = ensureObject(value);

  return {
    mode: trimString(item.mode || "ONE_STORE_NUMBER"),
    customerFacingLabel: trimString(item.customerFacingLabel),
    internalBranchRule: trimString(item.internalBranchRule),
    internalTargeting: trimString(item.internalTargeting),
    branchIdRequiredOnAccount:
      typeof item.branchIdRequiredOnAccount === "boolean"
        ? item.branchIdRequiredOnAccount
        : false,
    note: trimString(item.note),
    categoryAware:
      typeof item.categoryAware === "boolean" ? item.categoryAware : false,
    businessCategory: toUpper(item.businessCategory),
    supportedCategories: ensureArray(item.supportedCategories)
      .map(toUpper)
      .filter(Boolean),
  };
}

function sanitizeAccount(value) {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  return {
    id: trimString(item.id),
    tenantId: trimString(item.tenantId),
    phoneNumber: trimString(item.phoneNumber),
    businessName: trimString(item.businessName),
    phoneNumberId: trimString(item.phoneNumberId),
    wabaId: trimString(item.wabaId),
    webhookVerifyToken: trimString(item.webhookVerifyToken),
    appSecret: trimString(item.appSecret),
    hasAccessToken: toBoolean(item.hasAccessToken),
    isActive: typeof item.isActive === "boolean" ? item.isActive : false,
    setupStatus: sanitizeSetupStatus(item.setupStatus),
    channelStrategy: sanitizeChannelStrategy(item.channelStrategy),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function sanitizeCustomer(value, fallbackPhone = "") {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  return {
    id: trimString(item.id),
    name: trimString(item.name),
    phone: trimString(item.phone || fallbackPhone),
    email: trimString(item.email),
    address: trimString(item.address),
    tinNumber: trimString(item.tinNumber),
    idNumber: trimString(item.idNumber),
    notes: trimString(item.notes),
    isActive: typeof item.isActive === "boolean" ? item.isActive : undefined,
    whatsappOptIn:
      typeof item.whatsappOptIn === "boolean" ? item.whatsappOptIn : undefined,
  };
}

function sanitizeConversation(value) {
  const item = ensureObject(value);

  return {
    id: trimString(item.id),
    phone: trimString(item.phone),
    status: toUpper(item.status || "OPEN"),
    assignedToId: trimString(item.assignedToId),
    accountId: trimString(item.accountId),
    customerId: trimString(item.customerId || item.customer?.id),
    branchId: trimString(item.branchId),
    branch: sanitizeBranch(item.branch),
    updatedAt: item.updatedAt || null,
    createdAt: item.createdAt || null,
    messageCount: toNumber(item.messageCount, 0),
    unreadCount: toNumber(item.unreadCount, 0),

    customer: sanitizeCustomer(item.customer, item.phone),
    assignedTo: sanitizeAssignedUser(item.assignedTo),
    account: sanitizeAccount(item.account),

    latestMessage: item.latestMessage
      ? {
          id: trimString(item.latestMessage.id),
          direction: toUpper(item.latestMessage.direction || "INBOUND"),
          type: toUpper(item.latestMessage.type || "TEXT"),
          textContent:
            typeof item.latestMessage.textContent === "string"
              ? item.latestMessage.textContent
              : "",
          mediaUrl: trimString(item.latestMessage.mediaUrl),
          messageId: trimString(item.latestMessage.messageId),
          createdAt: item.latestMessage.createdAt || null,
          sentById: trimString(item.latestMessage.sentById),
        }
      : null,
  };
}

function sanitizeMessage(value) {
  const item = ensureObject(value);

  return {
    id: trimString(item.id),
    direction: toUpper(item.direction || "INBOUND"),
    type: toUpper(item.type || "TEXT"),
    textContent: typeof item.textContent === "string" ? item.textContent : "",
    mediaUrl: trimString(item.mediaUrl),
    messageId: trimString(item.messageId),
    createdAt: item.createdAt || null,
    sentById: trimString(item.sentById),
  };
}

function sanitizeDraftItem(value) {
  const item = ensureObject(value);
  const product = ensureObject(item.product);

  return {
    id: trimString(item.id),
    saleId: trimString(item.saleId),
    productId: trimString(item.productId),
    quantity: toNumber(item.quantity, 0),
    price: toNumber(item.price ?? item.unitPrice, 0),
    unitPrice: toNumber(item.price ?? item.unitPrice, 0),
    product: Object.keys(product).length
      ? {
          id: trimString(product.id),
          name: trimString(product.name),
          sku: trimString(product.sku),
          serial: trimString(product.serial),
          barcode: trimString(product.barcode),
          brand: trimString(product.brand),
          category: trimString(product.category),
          sellPrice: toNumber(product.sellPrice, 0),
          stockQty: toNumber(product.stockQty, 0),
          branchQty:
            product.branchQty === null || product.branchQty === undefined
              ? null
              : toNumber(product.branchQty, 0),
          availableQty:
            product.availableQty === null || product.availableQty === undefined
              ? null
              : toNumber(product.availableQty, 0),
        }
      : null,
  };
}

function sanitizeDraft(value) {
  const item = ensureObject(value);

  return {
    id: trimString(item.id),
    tenantId: trimString(item.tenantId),
    cashierId: trimString(item.cashierId),
    customerId: trimString(item.customerId),
    conversationId: trimString(item.conversationId || item.conversation?.id),
    branchId: trimString(item.branchId),
    branch: sanitizeBranch(item.branch),

    total: toNumber(item.total, 0),
    saleType: toUpper(item.saleType || "CREDIT"),
    amountPaid: toNumber(item.amountPaid, 0),
    balanceDue: toNumber(item.balanceDue, 0),
    dueDate: item.dueDate || null,
    status: toUpper(item.status),
    isDraft: typeof item.isDraft === "boolean" ? item.isDraft : true,
    draftSource: trimString(item.draftSource),
    receiptNumber: trimString(item.receiptNumber),
    invoiceNumber: trimString(item.invoiceNumber),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || item.finalizedAt || item.createdAt || null,
    finalizedAt: item.finalizedAt || null,

    cashier: item.cashier
      ? {
          id: trimString(item.cashier.id),
          name: trimString(item.cashier.name),
        }
      : null,

    customer: sanitizeCustomer(item.customer),

    conversation: item.conversation
      ? {
          id: trimString(item.conversation.id),
          phone: trimString(item.conversation.phone),
          status: toUpper(item.conversation.status || "OPEN"),
          branchId: trimString(item.conversation.branchId),
        }
      : null,

    items: ensureArray(item.items).map(sanitizeDraftItem),
  };
}

function sanitizePayment(value) {
  const item = ensureObject(value);

  return {
    id: trimString(item.id),
    amount: toNumber(item.amount, 0),
    method: toUpper(item.method),
    branchId: trimString(item.branchId),
    createdAt: item.createdAt || null,
    note: trimString(item.note),
  };
}

function sanitizeCashMovement(value) {
  const item = ensureObject(value);

  return {
    id: trimString(item.id),
    type: toUpper(item.type),
    reason: toUpper(item.reason),
    amount: item.amount != null ? String(item.amount) : "",
    note: trimString(item.note),
    createdAt: item.createdAt || item.created_at || null,
    createdBy: trimString(item.createdBy || item.created_by),
  };
}

function sanitizeStaff(value) {
  const item = ensureObject(value);

  return {
    id: trimString(item.id),
    name: trimString(item.name),
    email: trimString(item.email),
    role: toUpper(item.role),
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
  };
}

function sanitizeProduct(value) {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  return {
    id: trimString(item.id),
    name: trimString(item.name),
    sku: trimString(item.sku),
    serial: trimString(item.serial),
    barcode: trimString(item.barcode),
    businessCategory: toUpper(item.businessCategory || item.category),
    categoryTitle: trimString(item.categoryTitle),
    categoryDescription: trimString(item.categoryDescription),
    sellPrice: toNumber(item.sellPrice, 0),
    stockQty: toNumber(item.stockQty, 0),
  };
}

function sanitizePromotion(value) {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  return {
    id: trimString(item.id),
    tenantId: trimString(item.tenantId),
    title: trimString(item.title),
    message: trimString(item.message),
    productId: trimString(item.productId),
    businessCategory: toUpper(item.businessCategory || item.category || item.product?.businessCategory),
    categoryTitle: trimString(item.categoryTitle),
    categoryDescription: trimString(item.categoryDescription),
    createdById: trimString(item.createdById),
    sentAt: item.sentAt || null,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    status: toUpper(item.status || (item.sentAt ? "SENT" : "DRAFT")),
    canEdit: typeof item.canEdit === "boolean" ? item.canEdit : !item.sentAt,
    canDelete:
      typeof item.canDelete === "boolean"
        ? item.canDelete
        : !item.sentAt && !item.usage?.hasBeenUsedInBroadcast,
    usage: {
      broadcastCount: toNumber(item.usage?.broadcastCount, 0),
      hasBeenUsedInBroadcast: toBoolean(item.usage?.hasBeenUsedInBroadcast),
    },
    product: sanitizeProduct(item.product),
    createdBy: item.createdBy
      ? {
          id: trimString(item.createdBy.id),
          name: trimString(item.createdBy.name),
          email: trimString(item.createdBy.email),
          role: toUpper(item.createdBy.role),
        }
      : null,
    strategy: sanitizeChannelStrategy(item.strategy),
  };
}


function sanitizeProformaSummary(value) {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  return {
    id: trimString(item.id),
    number: trimString(item.number),
    status: toUpper(item.status || "DRAFT"),
    total: toNumber(item.total, 0),
    currency: trimString(item.currency || "RWF"),
    reference: trimString(item.reference),
    source: toUpper(item.source),
    conversationId: trimString(item.conversationId),
    draftSaleId: trimString(item.draftSaleId),
    convertedToSaleId: trimString(item.convertedToSaleId),
    convertedAt: item.convertedAt || null,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function sanitizeSaleSummary(value) {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  return {
    id: trimString(item.id),
    customerId: trimString(item.customerId),
    conversationId: trimString(item.conversationId),
    total: toNumber(item.total, 0),
    balanceDue: toNumber(item.balanceDue, 0),
    saleType: toUpper(item.saleType || "CASH"),
    status: toUpper(item.status || "PAID"),
    createdAt: item.createdAt || null,
    customer: sanitizeCustomer(item.customer),
    items: ensureArray(item.items).map(sanitizeDraftItem),
  };
}

function sanitizeDeliveryNoteSummary(value) {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  return {
    id: trimString(item.id),
    number: trimString(item.number),
    saleId: trimString(item.saleId),
    customerName: trimString(item.customerName),
    customerPhone: trimString(item.customerPhone),
    customerAddress: trimString(item.customerAddress),
    deliveredBy: trimString(item.deliveredBy),
    receivedBy: trimString(item.receivedBy),
    receivedByPhone: trimString(item.receivedByPhone),
    itemsCount: toNumber(item.itemsCount, 0),
    createdAt: item.createdAt || null,
    date: item.date || item.createdAt || null,
  };
}

function sanitizeWarrantyUnitSummary(value) {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  return {
    id: trimString(item.id),
    saleItemId: trimString(item.saleItemId),
    productId: trimString(item.productId),
    productName: trimString(item.productName || item.unitLabel || "Covered product"),
    serial: trimString(item.serial),
    imei1: trimString(item.imei1),
    imei2: trimString(item.imei2),
    unitLabel: trimString(item.unitLabel),
    startsAt: item.startsAt || null,
    endsAt: item.endsAt || null,
  };
}

function sanitizeWarrantySummary(value) {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  const units = ensureArray(item.units).map(sanitizeWarrantyUnitSummary).filter(Boolean);

  return {
    id: trimString(item.id),
    number: trimString(item.number || item.warrantyNumber),
    warrantyNumber: trimString(item.warrantyNumber || item.number),
    saleId: trimString(item.saleId),
    policy: trimString(item.policy),
    startsAt: item.startsAt || null,
    endsAt: item.endsAt || null,
    durationMonths: toNumber(item.durationMonths, 0),
    durationDays: toNumber(item.durationDays, 0),
    unitsCount: toNumber(item.unitsCount, units.length),
    units,
    createdAt: item.createdAt || null,
  };
}

function sanitizeBroadcast(value) {
  const item = ensureObject(value);
  if (!Object.keys(item).length) return null;

  return {
    id: trimString(item.id),
    tenantId: trimString(item.tenantId),
    accountId: trimString(item.accountId),
    promotionId: trimString(item.promotionId),
    templateName: trimString(item.templateName),
    languageCode: trimString(item.languageCode || "en_US"),
    status: toUpper(item.status || "DRAFT"),
    createdById: trimString(item.createdById),
    queuedAt: item.queuedAt || null,
    sentAt: item.sentAt || null,
    createdAt: item.createdAt || null,
    businessCategory: toUpper(item.businessCategory || item.category || item.targetingPreview?.category),
    supportedCategories: ensureArray(item.supportedCategories).map(toUpper).filter(Boolean),
    strategy: sanitizeChannelStrategy(item.strategy),
    account: sanitizeAccount(item.account),
    promotion: sanitizePromotion(item.promotion),
    createdBy: item.createdBy
      ? {
          id: trimString(item.createdBy.id),
          name: trimString(item.createdBy.name),
          role: toUpper(item.createdBy.role),
        }
      : null,
    recipientCount: toNumber(item.recipientCount, 0),
    attemptedCount: toNumber(item.attemptedCount || item.analytics?.attemptedCount || item.recipientCount, 0),
    sentCount: toNumber(item.sentCount || item.analytics?.sentCount || item.deliveredCount, 0),
    deliveredCount: toNumber(item.deliveredCount || item.analytics?.deliveredCount, 0),
    readCount: toNumber(item.readCount || item.analytics?.readCount, 0),
    failedCount: toNumber(item.failedCount || item.analytics?.failedCount, 0),
    pendingCount: toNumber(item.pendingCount || item.analytics?.pendingCount, 0),
    deliveryRate: toNumber(item.deliveryRate || item.analytics?.deliveryRate, 0),
    readRate: toNumber(item.readRate || item.analytics?.readRate, 0),
    failureRate: toNumber(item.failureRate || item.analytics?.failureRate, 0),
    latestFailureReason: trimString(item.latestFailureReason),
    analytics: {
      attemptedCount: toNumber(item.analytics?.attemptedCount || item.attemptedCount || item.recipientCount, 0),
      sentCount: toNumber(item.analytics?.sentCount || item.sentCount || item.deliveredCount, 0),
      deliveredCount: toNumber(item.analytics?.deliveredCount || item.deliveredCount, 0),
      readCount: toNumber(item.analytics?.readCount || item.readCount, 0),
      failedCount: toNumber(item.analytics?.failedCount || item.failedCount, 0),
      pendingCount: toNumber(item.analytics?.pendingCount || item.pendingCount, 0),
      deliveryRate: toNumber(item.analytics?.deliveryRate || item.deliveryRate, 0),
      readRate: toNumber(item.analytics?.readRate || item.readRate, 0),
      failureRate: toNumber(item.analytics?.failureRate || item.failureRate, 0),
    },
    targetingPreview: item.targetingPreview
      ? {
          mode: toUpper(item.targetingPreview.mode || "ALL_OPTED_IN"),
          branchId: trimString(item.targetingPreview.branchId),
          productId: trimString(item.targetingPreview.productId),
          category: toUpper(item.targetingPreview.category),
          businessCategory: toUpper(item.targetingPreview.businessCategory || item.targetingPreview.category),
          manualCustomerCount: toNumber(item.targetingPreview.manualCustomerCount, 0),
          persisted: toBoolean(item.targetingPreview.persisted),
          note: trimString(item.targetingPreview.note),
        }
      : null,
  };
}

function sanitizeBroadcastSummary(value) {
  const item = ensureObject(value);

  return {
    targetMode: toUpper(item.targetMode || "ALL_OPTED_IN"),
    branchId: trimString(item.branchId),
    productId: trimString(item.productId),
    category: toUpper(item.category),
    businessCategory: toUpper(item.businessCategory || item.category),
    attempted: toNumber(item.attempted, 0),
    delivered: toNumber(item.delivered, 0),
    failed: toNumber(item.failed, 0),
    skippedDuplicate: toNumber(item.skippedDuplicate, 0),
    failurePreview: ensureArray(item.failurePreview).map((failure) => ({
      customerId: trimString(failure.customerId),
      phone: trimString(failure.phone),
      message: trimString(failure.message),
    })),
  };
}

function sanitizeReadState(value, conversationId = "") {
  const item = ensureObject(value);

  return {
    id: trimString(item.id),
    tenantId: trimString(item.tenantId),
    conversationId: trimString(item.conversationId || conversationId),
    userId: trimString(item.userId),
    lastReadAt: item.lastReadAt || null,
    lastReadMessageId: trimString(item.lastReadMessageId),
    updatedAt: item.updatedAt || null,
  };
}

function normalizeTargeting(payload = {}) {
  const source = ensureObject(payload);

  return {
    mode: toUpper(source.mode || source.targetMode || "ALL_OPTED_IN"),
    branchId: nullableString(source.branchId),
    productId: nullableString(source.productId),
    category: nullableString(source.category || source.businessCategory),
    customerIds: ensureArray(source.customerIds).map(trimString).filter(Boolean),
  };
}

/**
 * Module health
 */

export async function getWhatsAppHealth() {
  const data = await apiFetch("/whatsapp/health");

  return {
    ok: toBoolean(data?.ok),
    module: trimString(data?.module),
    version: toNumber(data?.version, 1),
    categoryAware: toBoolean(data?.categoryAware),
    storeStrategy: trimString(data?.storeStrategy),
    supportedCategories: ensureArray(data?.supportedCategories)
      .map(toUpper)
      .filter(Boolean),
    uptimeSeconds: toNumber(data?.uptimeSeconds, 0),
    hostname: trimString(data?.hostname),
    timestamp: data?.timestamp || null,
  };
}

/**
 * Categories
 */

export function listWhatsAppBusinessCategories() {
  return [...BUSINESS_CATEGORIES];
}

/**
 * Accounts
 */

export async function listWhatsAppAccounts() {
  const data = await apiFetch("/whatsapp/accounts");

  return {
    accounts: ensureArray(data?.accounts).map(sanitizeAccount).filter(Boolean),
    strategy: sanitizeChannelStrategy(data?.strategy),
  };
}

export async function createWhatsAppAccount(payload) {
  const body = ensureObject(payload);

  const data = await apiFetch("/whatsapp/accounts", {
    method: "POST",
    body,
  });

  return {
    ok: toBoolean(data?.ok),
    message: trimString(data?.message),
    account: sanitizeAccount(data?.account),
  };
}

export async function getWhatsAppAccount(accountId) {
  const id = trimString(accountId);

  const data = await apiFetch(`/whatsapp/accounts/${id}`);

  return {
    account: sanitizeAccount(data?.account),
  };
}

export async function updateWhatsAppAccount(accountId, payload) {
  const id = trimString(accountId);
  const body = ensureObject(payload);

  const data = await apiFetch(`/whatsapp/accounts/${id}`, {
    method: "PATCH",
    body,
  });

  return {
    ok: toBoolean(data?.ok),
    message: trimString(data?.message),
    account: sanitizeAccount(data?.account),
  };
}

export async function setWhatsAppAccountActive(accountId, isActive) {
  const id = trimString(accountId);

  const data = await apiFetch(`/whatsapp/accounts/${id}/active`, {
    method: "PATCH",
    body: { isActive: Boolean(isActive) },
  });

  return {
    ok: toBoolean(data?.ok),
    message: trimString(data?.message),
    account: sanitizeAccount(data?.account),
  };
}

/**
 * Conversations
 */

export async function listWhatsAppConversations() {
  const data = await apiFetch("/whatsapp/inbox/conversations");

  return {
    conversations: ensureArray(data?.conversations).map(sanitizeConversation),
  };
}

export async function getWhatsAppConversation(conversationId) {
  const id = trimString(conversationId);

  if (!id) {
    return { conversation: null };
  }

  const data = await listWhatsAppConversations();
  const conversation = data.conversations.find((item) => item.id === id) || null;

  return { conversation };
}

export async function listWhatsAppConversationMessages(conversationId) {
  const id = trimString(conversationId);

  const data = await apiFetch(`/whatsapp/inbox/conversations/${id}/messages`);

  return {
    conversationId: trimString(data?.conversationId || id),
    conversation: data?.conversation ? sanitizeConversation(data.conversation) : null,
    messages: ensureArray(data?.messages).map(sanitizeMessage),
  };
}

export async function markWhatsAppConversationRead(conversationId) {
  const id = trimString(conversationId);

  if (!id) {
    return {
      ok: false,
      conversationId: "",
      unreadCount: 0,
      readState: null,
    };
  }

  const data = await apiFetch(`/whatsapp/inbox/conversations/${id}/read`, {
    method: "PATCH",
  });

  return {
    ok: toBoolean(data?.ok),
    conversationId: trimString(data?.conversationId || id),
    unreadCount: toNumber(data?.unreadCount, 0),
    readState: data?.readState ? sanitizeReadState(data.readState, id) : null,
  };
}

export async function replyToWhatsAppConversation(conversationId, payload) {
  const id = trimString(conversationId);
  const body = {
    text: trimString(ensureObject(payload).text),
  };

  const data = await apiFetch(`/whatsapp/inbox/conversations/${id}/reply`, {
    method: "POST",
    body,
  });

  return {
    sent: toBoolean(data?.sent),
    message: data?.message
      ? {
          id: trimString(data.message.id),
          messageId: trimString(data.message.messageId),
          createdAt: data.message.createdAt || null,
          sentById: trimString(data.message.sentById),
          direction: "OUTBOUND",
          type: "TEXT",
          textContent: trimString(data.message.textContent || body.text),
          mediaUrl: "",
        }
      : null,
  };
}

export async function updateWhatsAppConversationStatus(conversationId, payload) {
  const id = trimString(conversationId);
  const status = toUpper(ensureObject(payload).status);

  const data = await apiFetch(`/whatsapp/inbox/conversations/${id}/status`, {
    method: "PATCH",
    body: { status },
  });

  return {
    updated: data?.updated
      ? {
          id: trimString(data.updated.id),
          status: toUpper(data.updated.status),
          updatedAt: data.updated.updatedAt || null,
        }
      : null,
  };
}

/**
 * Assignable staff
 */

export async function listAssignableWhatsAppStaff() {
  const data = await apiFetch("/whatsapp/inbox/assignable-staff");

  return {
    staff: ensureArray(data?.staff).map(sanitizeStaff),
  };
}

/**
 * Assignment
 */

export async function assignWhatsAppConversationOwner(conversationId, payload) {
  const id = trimString(conversationId);
  const body = {
    assignedToId: trimString(ensureObject(payload).assignedToId),
  };

  const data = await apiFetch(`/whatsapp/inbox/conversations/${id}/assign`, {
    method: "PATCH",
    body,
  });

  return {
    ok: toBoolean(data?.ok),
    message: trimString(data?.message),
    conversation: data?.conversation ? sanitizeConversation(data.conversation) : null,
  };
}

export async function clearWhatsAppConversationOwner(conversationId) {
  const id = trimString(conversationId);

  const data = await apiFetch(`/whatsapp/inbox/conversations/${id}/unassign`, {
    method: "PATCH",
  });

  return {
    ok: toBoolean(data?.ok),
    message: trimString(data?.message),
    conversation: data?.conversation ? sanitizeConversation(data.conversation) : null,
  };
}

/**
 * Sale drafts
 */

export async function listWhatsAppSaleDrafts(params = {}) {
  const data = await apiFetch(`/whatsapp/inbox/sale-drafts${buildQuery(params)}`);

  return {
    drafts: ensureArray(data?.drafts).map(sanitizeDraft),
  };
}

export async function getWhatsAppSaleDraft(saleId) {
  const id = trimString(saleId);

  const data = await apiFetch(`/whatsapp/inbox/sale-drafts/${id}`);

  return {
    draft: data?.draft ? sanitizeDraft(data.draft) : null,
  };
}

export async function createWhatsAppSaleDraft(conversationId, payload) {
  const id = trimString(conversationId);
  const body = ensureObject(payload);

  const data = await apiFetch(`/whatsapp/inbox/conversations/${id}/sale-draft`, {
    method: "POST",
    body,
  });

  return {
    created: toBoolean(data?.created),
    draft: data?.draft ? sanitizeDraft(data.draft) : null,
    branch: sanitizeBranch(data?.branch),
  };
}

export async function createWhatsAppSaleDraftLegacy(conversationId, payload) {
  const id = trimString(conversationId);
  const body = ensureObject(payload);

  const data = await apiFetch(`/whatsapp/inbox/conversations/${id}/create-sale-draft`, {
    method: "POST",
    body,
  });

  return {
    created: toBoolean(data?.created),
    draft: data?.draft ? sanitizeDraft(data.draft) : null,
    branch: sanitizeBranch(data?.branch),
  };
}

export async function updateWhatsAppSaleDraft(saleId, payload) {
  const id = trimString(saleId);
  const body = ensureObject(payload);

  const data = await apiFetch(`/whatsapp/inbox/sale-drafts/${id}`, {
    method: "PATCH",
    body,
  });

  return {
    updated: toBoolean(data?.updated),
    draft: data?.draft ? sanitizeDraft(data.draft) : null,
    branch: sanitizeBranch(data?.branch),
  };
}

export async function deleteWhatsAppSaleDraft(saleId) {
  const id = trimString(saleId);

  const data = await apiFetch(`/whatsapp/inbox/sale-drafts/${id}`, {
    method: "DELETE",
  });

  return {
    deleted: toBoolean(data?.deleted),
    saleId: trimString(data?.saleId || id),
  };
}

export async function finalizeWhatsAppSaleDraft(saleId, payload) {
  const id = trimString(saleId);
  const body = ensureObject(payload);

  const data = await apiFetch(`/whatsapp/inbox/sale-drafts/${id}/finalize`, {
    method: "POST",
    body,
  });

  return {
    finalized: toBoolean(data?.finalized),
    sale: data?.sale ? sanitizeDraft(data.sale) : null,
    branch: sanitizeBranch(data?.branch),
    payment: data?.payment ? sanitizePayment(data.payment) : null,
    cashMovement: data?.cashMovement ? sanitizeCashMovement(data.cashMovement) : null,
  };
}

/**
 * Promotions
 */

export async function listWhatsAppPromotions(params = {}) {
  const data = await apiFetch(`/whatsapp/promotions${buildQuery(params)}`);

  return {
    promotions: ensureArray(data?.promotions).map(sanitizePromotion).filter(Boolean),
    strategy: sanitizeChannelStrategy(data?.strategy),
  };
}

export async function createWhatsAppPromotion(payload) {
  const body = ensureObject(payload);

  const data = await apiFetch("/whatsapp/promotions", {
    method: "POST",
    body,
  });

  return {
    ok: toBoolean(data?.ok),
    created: toBoolean(data?.created),
    message: trimString(data?.message),
    promotion: sanitizePromotion(data?.promotion),
  };
}

export async function getWhatsAppPromotion(promotionId) {
  const id = trimString(promotionId);

  const data = await apiFetch(`/whatsapp/promotions/${id}`);

  return {
    promotion: sanitizePromotion(data?.promotion),
  };
}

export async function updateWhatsAppPromotion(promotionId, payload) {
  const id = trimString(promotionId);
  const body = ensureObject(payload);

  const data = await apiFetch(`/whatsapp/promotions/${id}`, {
    method: "PATCH",
    body,
  });

  return {
    ok: toBoolean(data?.ok),
    updated: toBoolean(data?.updated),
    message: trimString(data?.message),
    promotion: sanitizePromotion(data?.promotion),
  };
}

export async function deleteWhatsAppPromotion(promotionId) {
  const id = trimString(promotionId);

  const data = await apiFetch(`/whatsapp/promotions/${id}`, {
    method: "DELETE",
  });

  return {
    ok: toBoolean(data?.ok),
    deleted: toBoolean(data?.deleted),
    promotionId: trimString(data?.promotionId || id),
    message: trimString(data?.message),
  };
}

/**
 * Broadcasts
 */

export async function listWhatsAppBroadcasts(params = {}) {
  const data = await apiFetch(`/whatsapp/broadcasts${buildQuery(params)}`);

  return {
    broadcasts: ensureArray(data?.broadcasts).map(sanitizeBroadcast).filter(Boolean),
    strategy: sanitizeChannelStrategy(data?.strategy),
  };
}

export async function createWhatsAppBroadcast(payload) {
  const source = ensureObject(payload);
  const body = {
    ...source,
    targeting: source.targeting ? normalizeTargeting(source.targeting) : undefined,
  };

  const data = await apiFetch("/whatsapp/broadcasts", {
    method: "POST",
    body,
  });

  return {
    ok: toBoolean(data?.ok),
    message: trimString(data?.message),
    broadcast: sanitizeBroadcast(data?.broadcast),
  };
}

export async function getWhatsAppBroadcast(broadcastId) {
  const id = trimString(broadcastId);

  const data = await apiFetch(`/whatsapp/broadcasts/${id}`);

  return {
    broadcast: sanitizeBroadcast(data?.broadcast),
  };
}

export async function updateWhatsAppBroadcast(broadcastId, payload) {
  const id = trimString(broadcastId);
  const source = ensureObject(payload);
  const body = {
    ...source,
    targeting: source.targeting ? normalizeTargeting(source.targeting) : undefined,
  };

  const data = await apiFetch(`/whatsapp/broadcasts/${id}`, {
    method: "PATCH",
    body,
  });

  return {
    ok: toBoolean(data?.ok),
    message: trimString(data?.message),
    broadcast: sanitizeBroadcast(data?.broadcast),
  };
}


export async function deleteWhatsAppBroadcast(broadcastId) {
  const id = trimString(broadcastId);

  const data = await apiFetch(`/whatsapp/broadcasts/${id}`, {
    method: "DELETE",
  });

  return {
    ok: toBoolean(data?.ok),
    deleted: toBoolean(data?.deleted),
    broadcastId: trimString(data?.broadcastId || id),
    message: trimString(data?.message),
  };
}

export async function queueWhatsAppBroadcast(broadcastId) {
  const id = trimString(broadcastId);

  const data = await apiFetch(`/whatsapp/broadcasts/${id}/queue`, {
    method: "POST",
  });

  return {
    ok: toBoolean(data?.ok),
    message: trimString(data?.message),
    broadcast: sanitizeBroadcast(data?.broadcast),
  };
}

export async function sendWhatsAppBroadcastNow(broadcastId, payload = {}) {
  const id = trimString(broadcastId);
  const source = ensureObject(payload);

  const body = {
    limit: source.limit,
    targeting: normalizeTargeting(source.targeting || source),
  };

  const data = await apiFetch(`/whatsapp/broadcasts/${id}/send`, {
    method: "POST",
    body,
  });

  return {
    ok: toBoolean(data?.ok),
    message: trimString(data?.message),
    broadcast: sanitizeBroadcast(data?.broadcast),
    summary: sanitizeBroadcastSummary(data?.summary),
  };
}

export async function getWhatsAppConversationSalesSummary(conversationId) {
  const id = trimString(conversationId);

  const data = await apiFetch(`/whatsapp/inbox/conversations/${id}/sales-summary`);
  const proformas = ensureArray(data?.proformas).map(sanitizeProformaSummary).filter(Boolean);
  const latestQuotation = sanitizeProformaSummary(data?.latestQuotation) || proformas[0] || null;
  const deliveryNotes = ensureArray(data?.deliveryNotes)
    .map(sanitizeDeliveryNoteSummary)
    .filter(Boolean);
  const latestDeliveryNote =
    sanitizeDeliveryNoteSummary(data?.latestDeliveryNote) || deliveryNotes[0] || null;
  const latestSale = sanitizeSaleSummary(data?.latestSale);
  const warranties = ensureArray(data?.warranties)
    .map(sanitizeWarrantySummary)
    .filter(Boolean);
  const latestWarranty =
    sanitizeWarrantySummary(data?.latestWarranty) || warranties[0] || null;

  return {
    totalOrders: toNumber(data?.totalOrders, 0),
    totalRevenue: toNumber(data?.totalRevenue, 0),
    outstandingCredit: toNumber(data?.outstandingCredit, 0),
    lastPurchase: data?.lastPurchase || null,
    lastSaleType: toUpper(data?.lastSaleType),
    latestSale,
    deliveryNoteCount: toNumber(data?.deliveryNoteCount, deliveryNotes.length),
    hasDeliveryNote:
      typeof data?.hasDeliveryNote === "boolean"
        ? data.hasDeliveryNote
        : Boolean(latestDeliveryNote),
    latestDeliveryNote,
    deliveryNotes,
    warrantyCount: toNumber(data?.warrantyCount, warranties.length),
    hasWarranty:
      typeof data?.hasWarranty === "boolean"
        ? data.hasWarranty
        : Boolean(latestWarranty),
    latestWarranty,
    warranties,
    lastWarranty: data?.lastWarranty || latestWarranty?.createdAt || null,
    quotationCount: toNumber(data?.quotationCount, proformas.length),
    hasQuotation:
      typeof data?.hasQuotation === "boolean" ? data.hasQuotation : Boolean(latestQuotation),
    latestQuotation,
    proformas,
  };
}

/**
 * Stable aliases
 */

export const assignConversationOwner = assignWhatsAppConversationOwner;
export const clearConversationOwner = clearWhatsAppConversationOwner;
export const listAssignableStaff = listAssignableWhatsAppStaff;

export const listWhatsAppInboxConversations = listWhatsAppConversations;
export const getWhatsAppInboxMessages = listWhatsAppConversationMessages;
export const replyToConversation = replyToWhatsAppConversation;
export const markConversationRead = markWhatsAppConversationRead;

export {
  BUSINESS_CATEGORIES,
  sanitizeAccount,
  sanitizeAssignedUser,
  sanitizeBranch,
  sanitizeBroadcast,
  sanitizeBroadcastSummary,
  sanitizeCashMovement,
  sanitizeConversation,
  sanitizeCustomer,
  sanitizeDraft,
  sanitizeDraftItem,
  sanitizeMessage,
  sanitizePayment,
  sanitizeProformaSummary,
  sanitizeSaleSummary,
  sanitizeDeliveryNoteSummary,
  sanitizePromotion,
  sanitizeStaff,
};
