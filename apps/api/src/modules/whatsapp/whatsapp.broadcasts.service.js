const prisma = require("../../config/database");
const whatsappService = require("./whatsapp.service");


const BROADCAST_SEND_DELAY_MS = 300;
const BROADCAST_WORKER_DEFAULT_LIMIT = 1000;
const BROADCAST_WORKER_LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const BROADCAST_WORKER_MAX_ATTEMPTS = 3;

const BUSINESS_CATEGORIES = Object.freeze({
  ELECTRONICS: "ELECTRONICS",
  HARDWARE: "HARDWARE",
  HOME_KITCHEN: "HOME_KITCHEN",
  LIGHTING: "LIGHTING",
  SPARE_PARTS: "SPARE_PARTS",
});

const CATEGORY_KEYWORDS = Object.freeze({
  ELECTRONICS: [
    "phone", "smartphone", "mobile", "iphone", "samsung", "tecno", "infinix",
    "itel", "nokia", "xiaomi", "redmi", "oppo", "vivo", "tablet", "ipad",
    "laptop", "computer", "charger", "adapter", "cable", "usb", "type c",
    "usb-c", "earphones", "earbuds", "headphones", "speaker", "printer",
    "router", "wifi", "keyboard", "mouse", "power bank", "powerbank",
    "screen protector", "case", "cover", "ssd", "hdd", "flash", "memory card",
  ],

  HARDWARE: [
    "cement", "nail", "nails", "screw", "screws", "bolt", "paint", "brush",
    "roller", "hinge", "lock", "padlock", "pipe", "pvc", "wire", "hammer",
    "drill", "grinder", "spanner", "wrench", "saw", "glue", "silicone",
    "sealant", "tile", "tiles", "tap", "faucet", "timber", "wood", "plywood",
    "roofing", "iron sheet",
  ],

  HOME_KITCHEN: [
    "plate", "plates", "cup", "cups", "mug", "spoon", "fork", "knife",
    "pot", "pots", "pan", "pans", "saucepan", "kettle", "flask", "jug",
    "bottle", "bowl", "glass", "cooker", "stove", "gas cooker", "blender",
    "toaster", "rice cooker", "microwave", "fridge", "freezer", "chair",
    "table", "bucket", "basin", "rack", "curtain", "bed sheet",
  ],

  LIGHTING: [
    "bulb", "bulbs", "ampoule", "led", "tube", "tube light", "downlight",
    "spotlight", "floodlight", "panel light", "ceiling light", "wall light",
    "chandelier", "lamp", "solar light", "street light", "strip light",
    "warm white", "cool white", "daylight", "socket", "holder", "switch",
    "driver", "emergency light", "sensor light",
  ],

  SPARE_PARTS: [
    "brake", "brake pad", "brake pads", "filter", "oil filter", "air filter",
    "fuel filter", "spark plug", "belt", "timing belt", "bearing", "shock",
    "shock absorber", "clutch", "battery", "radiator", "bumper", "mirror",
    "headlight", "tail light", "indicator", "wiper", "tyre", "tire", "rim",
    "engine oil", "gear oil", "toyota", "hyundai", "nissan", "suzuki",
    "honda", "mazda", "benz", "bmw", "volkswagen",
  ],
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBusinessCategory(value) {
  const v = String(value || "").trim().toUpperCase();

  if (BUSINESS_CATEGORIES[v]) return BUSINESS_CATEGORIES[v];

  if (v === "HOME" || v === "KITCHEN" || v === "HOME_AND_KITCHEN") return "HOME_KITCHEN";
  if (v === "SPARES" || v === "SPARE_PART" || v === "AUTO_PARTS") return "SPARE_PARTS";
  if (v === "LIGHT" || v === "LIGHTS") return "LIGHTING";

  return null;
}

function appError(code, extra = {}) {
  const err = new Error(code);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

function normalizeText(value) {
  const s = String(value || "").trim();
  return s || null;
}

function isConnectionClosedError(error) {
  return (
    error?.code === "P1017" ||
    String(error?.message || "").toLowerCase().includes("server has closed the connection")
  );
}

async function withPrismaRetry(operation, attempts = 2) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isConnectionClosedError(error) || attempt >= attempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw lastError;
}

function friendlySendFailure(error) {
  const status = Number(error?.status || error?.response?.status || 0);
  const providerCode = Number(error?.data?.error?.code || error?.response?.data?.error?.code || 0);
  const providerMessage = String(
    error?.data?.error?.message ||
      error?.response?.data?.error?.message ||
      error?.message ||
      "",
  ).toLowerCase();

  if (providerCode === 132001 || providerMessage.includes("template name does not exist")) {
    return "The WhatsApp message format is not approved for this sending language.";
  }

  if (providerCode === 131030 || providerMessage.includes("not in allowed list")) {
    return "This customer phone number is not allowed for the current WhatsApp sending setup.";
  }

  if (status === 400) {
    return "WhatsApp rejected this customer message. Check the customer phone number and approved message format.";
  }

  if (status === 401 || status === 403) {
    return "The WhatsApp sending account needs attention before messages can be sent.";
  }

  if (status === 404) {
    return "The WhatsApp message format could not be found for this sending setup.";
  }

  if (status === 429) {
    return "WhatsApp is limiting customer messages right now. Try again later.";
  }

  if (status >= 500) {
    return "WhatsApp could not process this customer message right now. Try again later.";
  }

  return "This customer message could not be sent.";
}

function normalizeLanguageCode(value) {
  const s = String(value || "").trim();
  return s || "en_US";
}

function normalizeStatus(value, fallback = "DRAFT") {
  const v = String(value || fallback).trim().toUpperCase();
  if (v === "DRAFT" || v === "QUEUED" || v === "SENT" || v === "FAILED") return v;
  return fallback;
}

function normalizeTargetMode(value) {
  const v = String(value || "ALL_OPTED_IN").trim().toUpperCase();

  if (v === "ALL_OPTED_IN") return "ALL_OPTED_IN";
  if (v === "BRANCH_CUSTOMERS") return "BRANCH_CUSTOMERS";
  if (v === "CATEGORY_CUSTOMERS") return "CATEGORY_CUSTOMERS";
  if (v === "CREDIT_CUSTOMERS") return "CREDIT_CUSTOMERS";
  if (v === "OVERDUE_CREDIT_CUSTOMERS") return "OVERDUE_CREDIT_CUSTOMERS";
  if (v === "PRODUCT_BUYERS") return "PRODUCT_BUYERS";
  if (v === "MANUAL_CUSTOMERS") return "MANUAL_CUSTOMERS";

  return "ALL_OPTED_IN";
}

function digitsOnly(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function normalizePhone(value) {
  const s = digitsOnly(value);
  return s || null;
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function clampLimit(value, fallback = 50, max = 200) {
  const n = toInt(value, fallback);
  return Math.min(max, Math.max(1, n));
}

function getModelFields(delegate) {
  try {
    return delegate?.fields || {};
  } catch {
    return {};
  }
}

function buildCustomerWhereBase(tenantId) {
  const customerFields = getModelFields(prisma.customer);

  return {
    tenantId,
    ...(typeof customerFields.isActive !== "undefined" ? { isActive: true } : {}),
    ...(typeof customerFields.whatsappOptIn !== "undefined" ? { whatsappOptIn: true } : {}),
  };
}

function customerSelectShape() {
  const customerFields = getModelFields(prisma.customer);

  return {
    id: true,
    name: true,
    phone: true,
    ...(typeof customerFields.email !== "undefined" ? { email: true } : {}),
    ...(typeof customerFields.whatsappOptIn !== "undefined" ? { whatsappOptIn: true } : {}),
    ...(typeof customerFields.isActive !== "undefined" ? { isActive: true } : {}),
  };
}

function broadcastIncludeShape() {
  return {
    account: {
      select: {
        id: true,
        phoneNumber: true,
        businessName: true,
        isActive: true,
      },
    },
    promotion: {
      select: {
        id: true,
        title: true,
        message: true,
        productId: true,
        sentAt: true,
        archivedAt: true,
        archivedById: true,
        archiveReason: true,
        createdAt: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        name: true,
        role: true,
      },
    },
    messages: {
      select: {
        id: true,
        messageId: true,
        conversationId: true,
        status: true,
        deliveredAt: true,
        readAt: true,
        failedAt: true,
        failureReason: true,
        createdAt: true,
      },
    },
  };
}

function computeBroadcastAnalytics(messages = []) {
  const list = Array.isArray(messages) ? messages : [];
  const attemptedCount = list.length;
  const sentCount = list.filter((message) => {
    const status = String(message?.status || "").toUpperCase();
    return status === "SENT" || status === "DELIVERED" || status === "READ";
  }).length;
  const deliveredCount = list.filter((message) => {
    const status = String(message?.status || "").toUpperCase();
    return status === "DELIVERED" || status === "READ" || Boolean(message?.deliveredAt);
  }).length;
  const readCount = list.filter((message) => {
    const status = String(message?.status || "").toUpperCase();
    return status === "READ" || Boolean(message?.readAt);
  }).length;
  const failedCount = list.filter((message) => {
    const status = String(message?.status || "").toUpperCase();
    return status === "FAILED" || Boolean(message?.failedAt);
  }).length;
  const pendingCount = Math.max(0, sentCount - deliveredCount - failedCount);
  const deliveryRate = sentCount > 0 ? Math.round((deliveredCount / sentCount) * 1000) / 10 : 0;
  const readRate = deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 1000) / 10 : 0;
  const failureRate = attemptedCount > 0 ? Math.round((failedCount / attemptedCount) * 1000) / 10 : 0;

  return {
    attemptedCount,
    sentCount,
    deliveredCount,
    readCount,
    failedCount,
    pendingCount,
    deliveryRate,
    readRate,
    failureRate,
  };
}

function latestBroadcastFailure(messages = []) {
  const failed = (Array.isArray(messages) ? messages : [])
    .filter((message) => String(message?.status || "").toUpperCase() === "FAILED" || message?.failedAt)
    .sort((a, b) => new Date(b.failedAt || b.createdAt || 0).getTime() - new Date(a.failedAt || a.createdAt || 0).getTime());

  return failed[0]?.failureReason || null;
}

function buildPublicBroadcast(broadcast) {
  if (!broadcast) return null;

  const messages = Array.isArray(broadcast.messages) ? broadcast.messages : [];
  const analytics = computeBroadcastAnalytics(messages);

  return {
    id: broadcast.id,
    tenantId: broadcast.tenantId,
    accountId: broadcast.accountId,
    promotionId: broadcast.promotionId || null,
    templateName: broadcast.templateName,
    languageCode: broadcast.languageCode,
    status: broadcast.status,
    createdById: broadcast.createdById,
    targeting: {
      mode: broadcast.targetMode || null,
      branchId: broadcast.targetBranchId || null,
      productId: broadcast.targetProductId || null,
      category: broadcast.targetCategory || null,
      manualCustomerCount: Array.isArray(broadcast.targetCustomerIds) ? broadcast.targetCustomerIds.length : 0,
    },
    processing: {
      lockedAt: broadcast.processingLockedAt || null,
      lockedBy: broadcast.processingLockedBy || null,
      attempts: Number(broadcast.processingAttempts || 0),
      lastError: broadcast.processingLastError || null,
      nextAttemptAt: broadcast.nextAttemptAt || null,
    },
    queuedAt: broadcast.queuedAt || null,
    sentAt: broadcast.sentAt || null,
    archivedAt: broadcast.archivedAt || null,
    archivedById: broadcast.archivedById || null,
    archiveReason: broadcast.archiveReason || null,
    cancelledAt: broadcast.cancelledAt || null,
    cancelledById: broadcast.cancelledById || null,
    isArchived: Boolean(broadcast.archivedAt),
    createdAt: broadcast.createdAt,

    strategy: {
      mode: "ONE_STORE_NUMBER",
      customerFacingLabel: "One WhatsApp number for the store",
      customerSelectionNote:
        "Broadcasts are sent from the store WhatsApp number. The selected audience controls which customers receive the message.",
    },

    account: broadcast.account
      ? {
          id: broadcast.account.id,
          phoneNumber: broadcast.account.phoneNumber,
          businessName: broadcast.account.businessName,
          isActive: Boolean(broadcast.account.isActive),
        }
      : null,

    promotion: broadcast.promotion
      ? {
          id: broadcast.promotion.id,
          title: broadcast.promotion.title,
          message: broadcast.promotion.message,
          productId: broadcast.promotion.productId || null,
          sentAt: broadcast.promotion.sentAt || null,
          archivedAt: broadcast.promotion.archivedAt || null,
          archivedById: broadcast.promotion.archivedById || null,
          archiveReason: broadcast.promotion.archiveReason || null,
          isArchived: Boolean(broadcast.promotion.archivedAt),
          createdAt: broadcast.promotion.createdAt || null,
        }
      : null,

    createdBy: broadcast.createdBy
      ? {
          id: broadcast.createdBy.id,
          name: broadcast.createdBy.name,
          role: broadcast.createdBy.role,
        }
      : null,

    recipientCount: analytics.attemptedCount,
    attemptedCount: analytics.attemptedCount,
    sentCount: analytics.sentCount,
    deliveredCount: analytics.deliveredCount,
    readCount: analytics.readCount,
    failedCount: analytics.failedCount,
    pendingCount: analytics.pendingCount,
    deliveryRate: analytics.deliveryRate,
    readRate: analytics.readRate,
    failureRate: analytics.failureRate,
    latestFailureReason: latestBroadcastFailure(messages),
    analytics,
  };
}

async function ensureTenantExists(tenantId) {
  if (!tenantId) {
    throw appError("TENANT_REQUIRED");
  }

  const tenant = await withPrismaRetry(() =>
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    }),
  );

  if (!tenant) {
    throw appError("TENANT_NOT_FOUND");
  }

  return tenant;
}

async function createAuditLogSafe({
  tenantId,
  userId = null,
  entity = "WHATSAPP_BROADCAST",
  entityId = null,
  action,
  metadata = null,
}) {
  try {
    if (
      !tenantId ||
      !action ||
      typeof prisma.auditLog?.create !== "function"
    ) {
      return;
    }

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entity,
        entityId,
        action,
        metadata,
      },
    });
  } catch (err) {
    console.error("WHATSAPP broadcast audit log error:", err?.message || err);
  }
}

async function assertBranchBelongsToTenant(tenantId, branchId) {
  if (!branchId) throw appError("BRANCH_REQUIRED");

  const branch = await withPrismaRetry(() =>
    prisma.branch.findFirst({
      where: {
        id: String(branchId),
        tenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        code: true,
        isMain: true,
        status: true,
      },
    }),
  );

  if (!branch) throw appError("BRANCH_NOT_FOUND");

  return branch;
}

async function getActiveAccountOrThrow(tenantId, accountId) {
  const where = {
    tenantId,
    isActive: true,
    ...(accountId ? { id: String(accountId) } : {}),
  };

  const account = await withPrismaRetry(() =>
    prisma.whatsAppAccount.findFirst({
      where,
      select: {
        id: true,
        tenantId: true,
        phoneNumber: true,
        phoneNumberId: true,
        businessName: true,
        accessToken: true,
        isActive: true,
      },
      orderBy: accountId ? undefined : [{ createdAt: "desc" }],
    }),
  );

  if (!account) {
    throw appError("WHATSAPP_ACCOUNT_NOT_FOUND");
  }

  if (!account.phoneNumberId) {
    throw appError("WHATSAPP_ACCOUNT_PHONE_NUMBER_ID_MISSING");
  }

  if (!account.accessToken) {
    throw appError("WHATSAPP_ACCOUNT_ACCESS_TOKEN_MISSING");
  }

  return account;
}

async function getPromotionOrThrow(tenantId, promotionId) {
  const promotion = await withPrismaRetry(() =>
    prisma.promotion.findFirst({
      where: {
        id: String(promotionId),
        tenantId,
      },
      select: {
        id: true,
        title: true,
        message: true,
        productId: true,
        sentAt: true,
        createdAt: true,
      },
    }),
  );

  if (!promotion) {
    throw appError("PROMOTION_NOT_FOUND");
  }

  return promotion;
}

async function getBroadcastOrThrow(tenantId, broadcastId) {
  const broadcast = await withPrismaRetry(() =>
    prisma.whatsAppBroadcast.findFirst({
      where: {
        id: String(broadcastId),
        tenantId,
      },
      include: broadcastIncludeShape(),
    }),
  );

  if (!broadcast) {
    throw appError("BROADCAST_NOT_FOUND");
  }

  return broadcast;
}

function normalizeTargeting(body = {}) {
  const target = body.targeting && typeof body.targeting === "object" ? body.targeting : body;

  const mode = normalizeTargetMode(target.targetMode || target.mode || body.targetMode);

  const branchId = normalizeText(target.branchId || body.branchId);
  const productId = normalizeText(target.productId || body.productId);
  const category = normalizeBusinessCategory(target.category || body.category);

  const manualCustomerIds = Array.isArray(target.customerIds || body.customerIds)
    ? (target.customerIds || body.customerIds).map(normalizeText).filter(Boolean)
    : [];

  return {
    mode,
    branchId,
    productId,
    category,
    manualCustomerIds,
  };
}

function buildBroadcastTargetingData(targeting, promotion = null) {
  return {
    targetMode: targeting.mode,
    targetBranchId: targeting.branchId || null,
    targetProductId: targeting.productId || promotion?.productId || null,
    targetCategory: targeting.category || null,
    targetCustomerIds:
      targeting.mode === "MANUAL_CUSTOMERS" && targeting.manualCustomerIds.length
        ? targeting.manualCustomerIds
        : undefined,
  };
}

function targetingFromBroadcast(broadcast) {
  const rawCustomerIds = Array.isArray(broadcast?.targetCustomerIds)
    ? broadcast.targetCustomerIds
    : [];

  return {
    mode: normalizeTargetMode(broadcast?.targetMode || "ALL_OPTED_IN"),
    branchId: normalizeText(broadcast?.targetBranchId),
    productId: normalizeText(broadcast?.targetProductId || broadcast?.promotion?.productId),
    category: normalizeBusinessCategory(broadcast?.targetCategory),
    manualCustomerIds: rawCustomerIds.map(normalizeText).filter(Boolean),
  };
}

function safeWorkerErrorMessage(error) {
  return String(error?.code || error?.message || "Queued broadcast could not be processed").slice(0, 600);
}

async function listBroadcasts({ tenantId, status, accountId, q, limit = 50, includeArchived = false }) {
  await ensureTenantExists(tenantId);

  const cleanStatus = status ? normalizeStatus(status, "") : null;
  const cleanAccountId = normalizeText(accountId);
  const cleanQuery = normalizeText(q);
  const take = clampLimit(limit, 50, 100);

  const broadcasts = await withPrismaRetry(() =>
    prisma.whatsAppBroadcast.findMany({
      where: {
        tenantId,
        ...(includeArchived ? {} : { archivedAt: null }),
        ...(cleanStatus ? { status: cleanStatus } : {}),
        ...(cleanAccountId ? { accountId: cleanAccountId } : {}),
        ...(cleanQuery
          ? {
              OR: [
                { templateName: { contains: cleanQuery, mode: "insensitive" } },
                { languageCode: { contains: cleanQuery, mode: "insensitive" } },
                {
                  promotion: {
                    is: {
                      OR: [
                        { title: { contains: cleanQuery, mode: "insensitive" } },
                        { message: { contains: cleanQuery, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: broadcastIncludeShape(),
      orderBy: [{ createdAt: "desc" }],
      take,
    }),
  );

  return broadcasts.map(buildPublicBroadcast);
}

async function getBroadcast({ tenantId, broadcastId }) {
  await ensureTenantExists(tenantId);
  const broadcast = await getBroadcastOrThrow(tenantId, broadcastId);
  return buildPublicBroadcast(broadcast);
}

async function createBroadcast({ tenantId, userId, body }) {
  await ensureTenantExists(tenantId);

  const account = await getActiveAccountOrThrow(tenantId, body?.accountId || null);

  const promotionId = normalizeText(body?.promotionId);
  const templateName = normalizeText(body?.templateName);
  const languageCode = normalizeLanguageCode(body?.languageCode);

  if (!templateName) {
    throw appError("TEMPLATE_NAME_REQUIRED");
  }

  let promotion = null;
  if (promotionId) {
    promotion = await getPromotionOrThrow(tenantId, promotionId);
  }

  const targeting = normalizeTargeting(body || {});
  if (targeting.mode === "BRANCH_CUSTOMERS" && targeting.branchId) {
    await assertBranchBelongsToTenant(tenantId, targeting.branchId);
  }

  if (targeting.mode === "PRODUCT_BUYERS" && !targeting.productId && !promotion?.productId) {
    throw appError("PRODUCT_ID_REQUIRED_FOR_TARGET");
  }

  if (targeting.mode === "CATEGORY_CUSTOMERS" && !targeting.category) {
    throw appError("CATEGORY_REQUIRED");
  }

  if (targeting.mode === "MANUAL_CUSTOMERS" && targeting.manualCustomerIds.length === 0) {
    throw appError("CUSTOMER_IDS_REQUIRED_FOR_TARGET");
  }

  const created = await withPrismaRetry(() =>
    prisma.whatsAppBroadcast.create({
      data: {
        tenantId,
        accountId: account.id,
        promotionId: promotion ? promotion.id : null,
        templateName,
        languageCode,
        status: "DRAFT",
        createdById: userId,
        ...buildBroadcastTargetingData(targeting, promotion),
      },
      include: broadcastIncludeShape(),
    }),
  );

  await createAuditLogSafe({
    tenantId,
    userId,
    entityId: created.id,
    action: "WHATSAPP_BROADCAST_CREATED",
    metadata: {
      templateName,
      languageCode,
      targetMode: targeting.mode,
      branchId: targeting.branchId || null,
      productId: targeting.productId || promotion?.productId || null,
      category: targeting.category || null,
      manualCustomerCount: targeting.manualCustomerIds.length,
    },
  });

  return {
    ...buildPublicBroadcast(created),
    targetingPreview: {
      category: targeting.category || null,
      mode: targeting.mode,
      branchId: targeting.branchId,
      productId: targeting.productId || promotion?.productId || null,
      manualCustomerCount: targeting.manualCustomerIds.length,
      persisted: false,
      note:
        "Audience selection is applied when sending. Saved audience segments can be added later if needed.",
    },
  };
}

async function updateBroadcast({ tenantId, broadcastId, body }) {
  await ensureTenantExists(tenantId);

  const existing = await getBroadcastOrThrow(tenantId, broadcastId);

  if (existing.archivedAt) {
    throw appError("BROADCAST_ARCHIVED");
  }

  if (existing.status !== "DRAFT") {
    throw appError("ONLY_DRAFT_CAN_BE_EDITED");
  }

  const nextTemplateName =
    body?.templateName !== undefined ? normalizeText(body.templateName) : existing.templateName;

  const nextLanguageCode =
    body?.languageCode !== undefined
      ? normalizeLanguageCode(body.languageCode)
      : existing.languageCode;

  if (!nextTemplateName) {
    throw appError("TEMPLATE_NAME_REQUIRED");
  }

  let nextAccountId = existing.accountId;
  if (body?.accountId !== undefined) {
    const account = await getActiveAccountOrThrow(tenantId, body.accountId);
    nextAccountId = account.id;
  }

  let nextPromotionId = existing.promotionId || null;
  if (body?.promotionId !== undefined) {
    const cleanPromotionId = normalizeText(body.promotionId);

    if (!cleanPromotionId) {
      nextPromotionId = null;
    } else {
      const promotion = await getPromotionOrThrow(tenantId, cleanPromotionId);
      nextPromotionId = promotion.id;
    }
  }

  const targeting = normalizeTargeting(body || {});
  if (targeting.mode === "BRANCH_CUSTOMERS" && targeting.branchId) {
    await assertBranchBelongsToTenant(tenantId, targeting.branchId);
  }

  if (targeting.mode === "CATEGORY_CUSTOMERS" && !targeting.category) {
    throw appError("CATEGORY_REQUIRED");
  }

  const updated = await withPrismaRetry(() =>
    prisma.whatsAppBroadcast.update({
      where: { id: existing.id },
      data: {
        accountId: nextAccountId,
        promotionId: nextPromotionId,
        templateName: nextTemplateName,
        languageCode: nextLanguageCode,
        ...buildBroadcastTargetingData(targeting, null),
      },
      include: broadcastIncludeShape(),
    }),
  );

  return {
    ...buildPublicBroadcast(updated),
    targetingPreview: {
      category: targeting.category || null,
      mode: targeting.mode,
      branchId: targeting.branchId,
      productId: targeting.productId || null,
      manualCustomerCount: targeting.manualCustomerIds.length,
      persisted: false,
    },
  };
}

async function deleteBroadcast({ tenantId, userId = null, broadcastId }) {
  await ensureTenantExists(tenantId);

  const existing = await getBroadcastOrThrow(tenantId, broadcastId);
  const previousStatus = existing.status;
  const archivedAt = new Date();

  if (existing.archivedAt) {
    return {
      archived: true,
      alreadyArchived: true,
      broadcastId: existing.id,
      action: "WHATSAPP_BROADCAST_ALREADY_ARCHIVED",
      message: "Broadcast is already archived",
      broadcast: buildPublicBroadcast(existing),
    };
  }

  const archiveReason =
    previousStatus === "QUEUED"
      ? "Queued broadcast cancelled before sending"
      : previousStatus === "FAILED"
        ? "Failed broadcast archived from active campaign list"
        : previousStatus === "SENT"
          ? "Sent broadcast archived from active campaign list"
          : "Draft broadcast archived from active campaign list";

  const updated = await withPrismaRetry(() =>
    prisma.whatsAppBroadcast.update({
      where: { id: existing.id },
      data: {
        archivedAt,
        archivedById: userId || null,
        archiveReason,
        ...(previousStatus === "QUEUED"
          ? {
              cancelledAt: archivedAt,
              cancelledById: userId || null,
            }
          : {}),
      },
      include: broadcastIncludeShape(),
    }),
  );

  const action =
    previousStatus === "QUEUED"
      ? "WHATSAPP_BROADCAST_QUEUE_CANCELLED"
      : previousStatus === "FAILED"
        ? "WHATSAPP_BROADCAST_FAILED_RECORD_ARCHIVED"
        : previousStatus === "SENT"
          ? "WHATSAPP_BROADCAST_SENT_RECORD_ARCHIVED"
          : "WHATSAPP_BROADCAST_DRAFT_ARCHIVED";

  await createAuditLogSafe({
    tenantId,
    userId,
    entityId: existing.id,
    action,
    metadata: {
      previousStatus,
      promotionId: existing.promotionId || null,
      templateName: existing.templateName || null,
      archiveReason,
    },
  });

  return {
    archived: true,
    deleted: false,
    broadcastId: existing.id,
    action,
    message:
      previousStatus === "QUEUED"
        ? "Queued broadcast cancelled and archived"
        : previousStatus === "FAILED"
          ? "Failed broadcast archived"
          : previousStatus === "SENT"
            ? "Sent broadcast archived from the active list"
            : "Draft broadcast archived",
    broadcast: buildPublicBroadcast(updated),
  };
}

async function queueBroadcast({ tenantId, broadcastId }) {
  await ensureTenantExists(tenantId);

  const existing = await getBroadcastOrThrow(tenantId, broadcastId);

  if (existing.archivedAt) {
    throw appError("BROADCAST_ARCHIVED");
  }

  if (existing.status !== "DRAFT") {
    throw appError("ONLY_DRAFT_CAN_BE_QUEUED");
  }

  const updated = await withPrismaRetry(() =>
    prisma.whatsAppBroadcast.update({
      where: { id: existing.id },
      data: {
        status: "QUEUED",
        queuedAt: new Date(),
      },
      include: broadcastIncludeShape(),
    }),
  );

  await createAuditLogSafe({
    tenantId,
    entityId: updated.id,
    action: "WHATSAPP_BROADCAST_QUEUED",
    metadata: {
      previousStatus: existing.status,
      nextStatus: "QUEUED",
    },
  });

  return buildPublicBroadcast(updated);
}

async function getBranchCustomerIds({ tenantId, branchId, limit }) {
  await assertBranchBelongsToTenant(tenantId, branchId);

  const saleFields = getModelFields(prisma.sale);

  if (typeof saleFields.branchId === "undefined") {
    throw appError("SALE_BRANCH_NOT_AVAILABLE");
  }

  const rows = await withPrismaRetry(() =>
    prisma.sale.findMany({
      where: {
        tenantId,
        branchId,
        customerId: { not: null },
        isDraft: false,
        isCancelled: false,
      },
      select: {
        customerId: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }],
      take: Math.min(1000, Math.max(limit * 4, limit)),
    }),
  );

  return [...new Set(rows.map((row) => row.customerId).filter(Boolean))].slice(0, limit);
}

async function getCreditCustomerIds({ tenantId, overdueOnly = false, limit }) {
  const now = new Date();

  const rows = await withPrismaRetry(() =>
    prisma.sale.findMany({
      where: {
        tenantId,
        customerId: { not: null },
        isDraft: false,
        isCancelled: false,
        saleType: "CREDIT",
        balanceDue: { gt: 0 },
        ...(overdueOnly ? { dueDate: { lt: now } } : {}),
      },
      select: {
        customerId: true,
        balanceDue: true,
        dueDate: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }],
      take: Math.min(1000, Math.max(limit * 4, limit)),
    }),
  );

  return [...new Set(rows.map((row) => row.customerId).filter(Boolean))].slice(0, limit);
}

async function getProductBuyerCustomerIds({ tenantId, productId, limit }) {
  if (!productId) throw appError("PRODUCT_ID_REQUIRED_FOR_TARGET");

  const product = await withPrismaRetry(() =>
    prisma.product.findFirst({
      where: {
        id: String(productId),
        tenantId,
      },
      select: {
        id: true,
      },
    }),
  );

  if (!product) throw appError("PRODUCT_NOT_FOUND");

  const rows = await withPrismaRetry(() =>
    prisma.saleItem.findMany({
      where: {
        productId: product.id,
        sale: {
          tenantId,
          customerId: { not: null },
          isDraft: false,
          isCancelled: false,
        },
      },
      select: {
        sale: {
          select: {
            customerId: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ id: "desc" }],
      take: Math.min(1000, Math.max(limit * 4, limit)),
    }),
  );

  return [...new Set(rows.map((row) => row.sale?.customerId).filter(Boolean))].slice(0, limit);
}

async function getCategoryCustomerIds({ tenantId, category, limit }) {
  const normalizedCategory = normalizeBusinessCategory(category);
  if (!normalizedCategory) throw appError("CATEGORY_REQUIRED");

  const productFields = getModelFields(prisma.product);
  const keywords = CATEGORY_KEYWORDS[normalizedCategory] || [];

  const productWhereOr = [];

  if (typeof productFields.businessCategory !== "undefined") {
    productWhereOr.push({ businessCategory: normalizedCategory });
  }

  if (typeof productFields.category !== "undefined") {
    productWhereOr.push({ category: { contains: normalizedCategory, mode: "insensitive" } });

    for (const keyword of keywords) {
      productWhereOr.push({ category: { contains: keyword, mode: "insensitive" } });
    }
  }

  if (typeof productFields.subcategory !== "undefined") {
    for (const keyword of keywords) {
      productWhereOr.push({ subcategory: { contains: keyword, mode: "insensitive" } });
    }
  }

  for (const keyword of keywords) {
    productWhereOr.push({ name: { contains: keyword, mode: "insensitive" } });
  }

  const rows = await withPrismaRetry(() =>
    prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          customerId: { not: null },
          isDraft: false,
          isCancelled: false,
        },
        product: {
          OR: productWhereOr.length ? productWhereOr : [{ name: { contains: normalizedCategory, mode: "insensitive" } }],
        },
      },
      select: {
        sale: {
          select: {
            customerId: true,
          },
        },
      },
      orderBy: [{ id: "desc" }],
      take: Math.min(1000, Math.max(limit * 4, limit)),
    }),
  );

  return [...new Set(rows.map((row) => row.sale?.customerId).filter(Boolean))].slice(0, limit);
}

async function getRecipients({ tenantId, targeting, promotion, limit, maxLimit = 200 }) {
  const customerFields = getModelFields(prisma.customer);
  const take = clampLimit(limit, 50, maxLimit);

  let customerIds = [];

  if (targeting.mode === "BRANCH_CUSTOMERS") {
    if (!targeting.branchId) throw appError("BRANCH_REQUIRED");
    customerIds = await getBranchCustomerIds({
      tenantId,
      branchId: targeting.branchId,
      limit: take,
    });
  }

  if (targeting.mode === "CREDIT_CUSTOMERS") {
    customerIds = await getCreditCustomerIds({
      tenantId,
      overdueOnly: false,
      limit: take,
    });
  }

  if (targeting.mode === "OVERDUE_CREDIT_CUSTOMERS") {
    customerIds = await getCreditCustomerIds({
      tenantId,
      overdueOnly: true,
      limit: take,
    });
  }

  if (targeting.mode === "PRODUCT_BUYERS") {
    customerIds = await getProductBuyerCustomerIds({
      tenantId,
      productId: targeting.productId || promotion?.productId,
      limit: take,
    });
  }

  if (targeting.mode === "CATEGORY_CUSTOMERS") {
    customerIds = await getCategoryCustomerIds({
      tenantId,
      category: targeting.category,
      limit: take,
    });
  }

  if (targeting.mode === "MANUAL_CUSTOMERS") {
    customerIds = targeting.manualCustomerIds.slice(0, take);
  }

  const where =
    targeting.mode === "ALL_OPTED_IN"
      ? buildCustomerWhereBase(tenantId)
      : {
          ...buildCustomerWhereBase(tenantId),
          id: { in: customerIds },
        };

  const recipients = await withPrismaRetry(() =>
    prisma.customer.findMany({
      where,
      select: customerSelectShape(),
      orderBy:
        typeof customerFields.createdAt !== "undefined"
          ? [{ createdAt: "desc" }]
          : [{ name: "asc" }],
      take,
    }),
  );

  const seenPhones = new Set();
  const cleanRecipients = [];

  for (const customer of recipients) {
    const phone = normalizePhone(customer.phone);
    if (!phone) continue;
    if (seenPhones.has(phone)) continue;

    seenPhones.add(phone);
    cleanRecipients.push({
      id: customer.id,
      name: customer.name || "Customer",
      phone,
    });
  }

  return cleanRecipients;
}

async function findOrCreateConversation({ tenantId, account, recipient }) {
  let conversation = await withPrismaRetry(() =>
    prisma.whatsAppConversation.findFirst({
      where: {
        tenantId,
        accountId: account.id,
        phone: recipient.phone,
      },
      select: {
        id: true,
        customerId: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
  );

  if (!conversation) {
    const conversationFields = getModelFields(prisma.whatsAppConversation);

    conversation = await withPrismaRetry(() =>
      prisma.whatsAppConversation.create({
        data: {
          tenantId,
          accountId: account.id,
          customerId: recipient.id,
          phone: recipient.phone,
          status: "OPEN",
          ...(typeof conversationFields.branchId !== "undefined" ? { branchId: null } : {}),
        },
        select: {
          id: true,
          customerId: true,
        },
      }),
    );
  } else if (!conversation.customerId) {
    await withPrismaRetry(() =>
      prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          customerId: recipient.id,
          updatedAt: new Date(),
        },
      }),
    );
  }

  return conversation;
}

function audienceLabel(targeting) {
  const mode = normalizeTargetMode(targeting?.mode);

  if (mode === "ALL_OPTED_IN") return "All opted-in WhatsApp customers";
  if (mode === "CATEGORY_CUSTOMERS") return "Registered category customers";
  if (mode === "CREDIT_CUSTOMERS") return "Credit customers";
  if (mode === "OVERDUE_CREDIT_CUSTOMERS") return "Overdue credit customers";
  if (mode === "PRODUCT_BUYERS") return "Customers who bought the selected product";
  if (mode === "MANUAL_CUSTOMERS") return "Selected customers";
  if (mode === "BRANCH_CUSTOMERS") return "Branch customers";

  return "WhatsApp customers";
}

function publicRecipientPreview(recipient) {
  return {
    id: recipient.id,
    name: recipient.name || "Customer",
    phone: recipient.phone,
  };
}

async function previewBroadcastRecipients({ tenantId, body = {}, limit = 20 }) {
  await ensureTenantExists(tenantId);

  const promotionId = normalizeText(body?.promotionId);
  const previewLimit = clampLimit(limit, 20, 50);
  const countLimit = 1000;

  let promotion = null;
  if (promotionId) {
    promotion = await getPromotionOrThrow(tenantId, promotionId);
  }

  const targeting = normalizeTargeting(body || {});

  if (targeting.mode === "BRANCH_CUSTOMERS" && targeting.branchId) {
    await assertBranchBelongsToTenant(tenantId, targeting.branchId);
  }

  if (targeting.mode === "PRODUCT_BUYERS" && !targeting.productId && !promotion?.productId) {
    throw appError("PRODUCT_ID_REQUIRED_FOR_TARGET");
  }

  if (targeting.mode === "CATEGORY_CUSTOMERS" && !targeting.category) {
    throw appError("CATEGORY_REQUIRED");
  }

  if (targeting.mode === "MANUAL_CUSTOMERS" && targeting.manualCustomerIds.length === 0) {
    throw appError("CUSTOMER_IDS_REQUIRED_FOR_TARGET");
  }

  const recipients = await getRecipients({
    tenantId,
    targeting,
    promotion,
    limit: countLimit,
    maxLimit: countLimit,
  });

  const recipientCount = recipients.length;

  return {
    mode: targeting.mode,
    audienceLabel: audienceLabel(targeting),
    recipientCount,
    previewLimit,
    hasMore: recipientCount > previewLimit,
    canSend: recipientCount > 0,
    warning: recipientCount > 0 ? null : "NO_MATCHING_RECIPIENTS",
    targeting: {
      mode: targeting.mode,
      branchId: targeting.branchId || null,
      productId: targeting.productId || promotion?.productId || null,
      category: targeting.category || null,
      manualCustomerCount: targeting.manualCustomerIds.length,
    },
    promotion: promotion
      ? {
          id: promotion.id,
          title: promotion.title,
          productId: promotion.productId || null,
        }
      : null,
    recipients: recipients.slice(0, previewLimit).map(publicRecipientPreview),
  };
}

async function sendBroadcastNow({ tenantId, broadcastId, limit = 50, targeting: targetingInput = null }) {
  await ensureTenantExists(tenantId);

  const broadcast = await withPrismaRetry(() =>
    prisma.whatsAppBroadcast.findFirst({
      where: {
        id: String(broadcastId),
        tenantId,
      },
      include: {
        account: true,
        promotion: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        messages: {
          select: {
            id: true,
            messageId: true,
            conversationId: true,
            status: true,
            deliveredAt: true,
            readAt: true,
            failedAt: true,
            failureReason: true,
            createdAt: true,
          },
        },
      },
    }),
  );

  if (!broadcast) {
    throw appError("BROADCAST_NOT_FOUND");
  }

  if (broadcast.archivedAt) {
    throw appError("BROADCAST_ARCHIVED");
  }

  if (broadcast.status !== "DRAFT" && broadcast.status !== "QUEUED" && broadcast.status !== "FAILED") {
    throw appError("ONLY_DRAFT_OR_QUEUED_CAN_BE_SENT");
  }

  if (!broadcast.promotion) {
    throw appError("PROMOTION_REQUIRED_TO_SEND");
  }

  const account = await getActiveAccountOrThrow(tenantId, broadcast.accountId);

  const targeting = normalizeTargeting(targetingInput || targetingFromBroadcast(broadcast));
  const recipients = await getRecipients({
    tenantId,
    targeting,
    promotion: broadcast.promotion,
    limit,
    maxLimit: Math.max(200, Math.min(1000, Number(limit) || 50)),
  });

  if (!recipients.length) {
    throw appError("NO_BROADCAST_RECIPIENTS");
  }

  const sentConversationIds = new Set(
    Array.isArray(broadcast.messages)
      ? broadcast.messages.map((m) => String(m.conversationId || "")).filter(Boolean)
      : [],
  );

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let skippedDuplicate = 0;

  const failures = [];

  for (const recipient of recipients) {
    attempted += 1;
    let conversation = null;

    try {
      conversation = await findOrCreateConversation({
        tenantId,
        account,
        recipient,
      });

      if (sentConversationIds.has(conversation.id)) {
        skippedDuplicate += 1;
        continue;
      }

      const resp = await whatsappService.sendTemplate({
        account,
        to: recipient.phone,
        templateName: broadcast.templateName,
        languageCode: broadcast.languageCode,
        bodyParams: [
          recipient.name || "Customer",
          broadcast.promotion.title || "Offer",
          broadcast.promotion.message || "",
        ],
      });

      const providerMessageId = resp?.messages?.[0]?.id || null;

      await withPrismaRetry(() =>
        prisma.whatsAppMessage.create({
          data: {
            conversationId: conversation.id,
            tenantId,
            accountId: account.id,
            broadcastId: broadcast.id,
            direction: "OUTBOUND",
            type: "TEXT",
            textContent: broadcast.promotion.message || "",
            messageId: providerMessageId,
            status: "SENT",
          },
        }),
      );

      await withPrismaRetry(() =>
        prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            updatedAt: new Date(),
            customerId: recipient.id,
          },
        }),
      );

      sent += 1;
      sentConversationIds.add(conversation.id);
    } catch (err) {
      console.error("sendBroadcastNow recipient send error:", err?.message || err);
      failed += 1;

      const failureMessage = friendlySendFailure(err);

      failures.push({
        customerId: recipient.id,
        phone: recipient.phone,
        message: failureMessage,
      });

      if (conversation?.id) {
        try {
          await withPrismaRetry(() =>
            prisma.whatsAppMessage.create({
              data: {
                conversationId: conversation.id,
                tenantId,
                accountId: account.id,
                broadcastId: broadcast.id,
                direction: "OUTBOUND",
                type: "TEXT",
                textContent: broadcast.promotion.message || "",
                status: "FAILED",
                failedAt: new Date(),
                failureReason: failureMessage,
              },
            }),
          );
        } catch (logError) {
          console.error("sendBroadcastNow failed-recipient log error:", logError?.message || logError);
        }
      }
    }

    await sleep(BROADCAST_SEND_DELAY_MS);
  }

  const nextStatus = sent > 0 ? "SENT" : "FAILED";
  const sentAt = sent > 0 ? new Date() : null;

  const updated = await withPrismaRetry(() =>
    prisma.whatsAppBroadcast.update({
      where: { id: broadcast.id },
      data: {
        status: nextStatus,
        ...(sentAt ? { sentAt } : {}),
        queuedAt: broadcast.queuedAt || new Date(),
        processingLockedAt: null,
        processingLockedBy: null,
        processingLastError: failed > 0 ? failures[0]?.message || null : null,
        nextAttemptAt: null,
      },
      include: broadcastIncludeShape(),
    }),
  );

  await createAuditLogSafe({
    tenantId,
    userId: broadcast.createdById || null,
    entityId: updated.id,
    action: sent > 0 ? "WHATSAPP_BROADCAST_SENT" : "WHATSAPP_BROADCAST_FAILED",
    metadata: {
      targetMode: targeting.mode,
      branchId: targeting.branchId || null,
      productId: targeting.productId || broadcast.promotion?.productId || null,
      category: targeting.category || null,
      attempted,
      sent,
      delivered: 0,
      failed,
      skippedDuplicate,
    },
  });

  if (sent > 0 && broadcast.promotion && !broadcast.promotion.sentAt) {
    await withPrismaRetry(() =>
      prisma.promotion.update({
        where: { id: broadcast.promotion.id },
        data: { sentAt: new Date() },
      }),
    );
  }

  return {
    broadcast: buildPublicBroadcast(updated),
    summary: {
      category: targeting.category || null,
      targetMode: targeting.mode,
      branchId: targeting.branchId || null,
      productId: targeting.productId || broadcast.promotion?.productId || null,
      attempted,
      sent,
      delivered: 0,
      failed,
      skippedDuplicate,
      failurePreview: failures.slice(0, 10),
    },
  };
}

async function processQueuedBroadcasts({
  limit = 2,
  recipientLimit = BROADCAST_WORKER_DEFAULT_LIMIT,
  workerId = `wa-worker-${process.pid}`,
} = {}) {
  const now = new Date();
  const lockCutoff = new Date(Date.now() - BROADCAST_WORKER_LOCK_TIMEOUT_MS);
  const take = Math.min(10, Math.max(1, Number(limit) || 2));

  const candidates = await withPrismaRetry(() =>
    prisma.whatsAppBroadcast.findMany({
      where: {
        status: "QUEUED",
        archivedAt: null,
        cancelledAt: null,
        OR: [
          { nextAttemptAt: null },
          { nextAttemptAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { processingLockedAt: null },
              { processingLockedAt: { lt: lockCutoff } },
            ],
          },
        ],
      },
      include: broadcastIncludeShape(),
      orderBy: [{ queuedAt: "asc" }, { createdAt: "asc" }],
      take,
    }),
  );

  const results = [];

  for (const candidate of candidates) {
    const claimed = await withPrismaRetry(() =>
      prisma.whatsAppBroadcast.updateMany({
        where: {
          id: candidate.id,
          status: "QUEUED",
          archivedAt: null,
          cancelledAt: null,
          OR: [
            { processingLockedAt: null },
            { processingLockedAt: { lt: lockCutoff } },
          ],
        },
        data: {
          processingLockedAt: new Date(),
          processingLockedBy: workerId,
          processingAttempts: { increment: 1 },
          processingLastError: null,
        },
      }),
    );

    if (!claimed.count) {
      continue;
    }

    const attempts = Number(candidate.processingAttempts || 0) + 1;

    try {
      const sent = await sendBroadcastNow({
        tenantId: candidate.tenantId,
        broadcastId: candidate.id,
        limit: Math.min(1000, Math.max(1, Number(recipientLimit) || BROADCAST_WORKER_DEFAULT_LIMIT)),
        targeting: targetingFromBroadcast(candidate),
      });

      results.push({
        broadcastId: candidate.id,
        ok: true,
        status: sent.broadcast?.status || null,
        summary: sent.summary || null,
      });
    } catch (error) {
      const message = safeWorkerErrorMessage(error);
      const exhausted = attempts >= BROADCAST_WORKER_MAX_ATTEMPTS;
      const nextAttemptAt = exhausted ? null : new Date(Date.now() + attempts * 5 * 60 * 1000);

      const updated = await withPrismaRetry(() =>
        prisma.whatsAppBroadcast.update({
          where: { id: candidate.id },
          data: {
            status: exhausted ? "FAILED" : "QUEUED",
            processingLockedAt: null,
            processingLockedBy: null,
            processingLastError: message,
            nextAttemptAt,
          },
          include: broadcastIncludeShape(),
        }),
      );

      await createAuditLogSafe({
        tenantId: candidate.tenantId,
        userId: candidate.createdById || null,
        entityId: candidate.id,
        action: exhausted
          ? "WHATSAPP_BROADCAST_WORKER_FAILED"
          : "WHATSAPP_BROADCAST_WORKER_RETRY_SCHEDULED",
        metadata: {
          attempts,
          maxAttempts: BROADCAST_WORKER_MAX_ATTEMPTS,
          nextAttemptAt,
          error: message,
        },
      });

      results.push({
        broadcastId: candidate.id,
        ok: false,
        status: updated.status,
        attempts,
        error: message,
      });
    }
  }

  return {
    workerId,
    checked: candidates.length,
    processed: results.length,
    results,
  };
}

module.exports = {
  listBroadcasts,
  previewBroadcastRecipients,
  getBroadcast,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
  queueBroadcast,
  sendBroadcastNow,
  processQueuedBroadcasts,
};