const service = require("./whatsapp.broadcasts.service");

function getTenantId(req) {
  return req.user?.tenantId || null;
}

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

function getTargetingFromRequest(req) {
  const body = req.body || {};

  return {
    ...(body.targeting && typeof body.targeting === "object" ? body.targeting : {}),
    targetMode: body.targetMode || body.mode || body.targeting?.targetMode || body.targeting?.mode,
    branchId: body.branchId || body.targeting?.branchId,
    productId: body.productId || body.targeting?.productId,
    category: body.category || body.businessCategory || body.targeting?.category || body.targeting?.businessCategory,
    customerIds: body.customerIds || body.targeting?.customerIds,
  };
}

function mapBroadcastError(err, res, fallbackMessage) {
  const code = err?.code || err?.message;

  if (code === "TENANT_REQUIRED") {
    return res.status(401).json({
      ok: false,
      message: "Tenant is required",
      code,
    });
  }

  if (code === "TENANT_NOT_FOUND") {
    return res.status(404).json({
      ok: false,
      message: "Tenant not found",
      code,
    });
  }

  if (code === "BROADCAST_NOT_FOUND") {
    return res.status(404).json({
      ok: false,
      message: "Broadcast not found",
      code,
    });
  }

  if (code === "SENT_BROADCAST_CANNOT_BE_DELETED") {
    return res.status(409).json({
      ok: false,
      message: "Sent broadcasts stay as business history and cannot be deleted",
      code,
    });
  }

  if (code === "BROADCAST_HAS_SENT_HISTORY") {
    return res.status(409).json({
      ok: false,
      message: "This broadcast already has message history and cannot be deleted",
      code,
    });
  }

  if (code === "BROADCAST_ARCHIVED") {
    return res.status(409).json({
      ok: false,
      message: "This broadcast is archived and cannot be changed",
      code,
    });
  }

  if (code === "PROMOTION_NOT_FOUND") {
    return res.status(404).json({
      ok: false,
      message: "Promotion not found",
      code,
    });
  }

  if (code === "WHATSAPP_ACCOUNT_NOT_FOUND") {
    return res.status(404).json({
      ok: false,
      message: "No active WhatsApp account found for this store",
      code,
    });
  }

  if (code === "WHATSAPP_ACCOUNT_PHONE_NUMBER_ID_MISSING") {
    return res.status(400).json({
      ok: false,
      message: "WhatsApp phone number ID is missing. Complete account setup before sending broadcasts.",
      code,
    });
  }

  if (code === "WHATSAPP_ACCOUNT_ACCESS_TOKEN_MISSING") {
    return res.status(400).json({
      ok: false,
      message: "WhatsApp access token is missing. Complete account setup before sending broadcasts.",
      code,
    });
  }

  if (code === "TEMPLATE_NAME_REQUIRED") {
    return res.status(400).json({
      ok: false,
      message: "Template name is required",
      code,
    });
  }

  if (code === "ONLY_DRAFT_CAN_BE_EDITED") {
    return res.status(409).json({
      ok: false,
      message: "Only draft broadcasts can be edited",
      code,
    });
  }

  if (code === "ONLY_DRAFT_CAN_BE_QUEUED") {
    return res.status(409).json({
      ok: false,
      message: "Only draft broadcasts can be queued",
      code,
    });
  }

  if (code === "ONLY_DRAFT_OR_QUEUED_CAN_BE_SENT") {
    return res.status(409).json({
      ok: false,
      message: "Only draft or queued broadcasts can be sent",
      code,
    });
  }

  if (code === "PROMOTION_REQUIRED_TO_SEND") {
    return res.status(400).json({
      ok: false,
      message: "A promotion is required before sending this broadcast",
      code,
    });
  }

  if (code === "NO_BROADCAST_RECIPIENTS") {
    return res.status(400).json({
      ok: false,
      message: "No eligible WhatsApp recipients found for this broadcast",
      code,
    });
  }

  if (code === "BRANCH_REQUIRED") {
    return res.status(400).json({
      ok: false,
      message: "Choose a branch for this broadcast target",
      code,
    });
  }

  if (code === "BRANCH_NOT_FOUND") {
    return res.status(404).json({
      ok: false,
      message: "Branch not found or inactive",
      code,
    });
  }

  if (code === "SALE_BRANCH_NOT_AVAILABLE") {
    return res.status(400).json({
      ok: false,
      message:
        "Branch customer targeting is not available yet because sales are not branch-linked in this database.",
      code,
    });
  }

  if (code === "PRODUCT_ID_REQUIRED_FOR_TARGET") {
    return res.status(400).json({
      ok: false,
      message: "Product is required when targeting customers who bought a product",
      code,
    });
  }

  if (code === "PRODUCT_NOT_FOUND") {
    return res.status(404).json({
      ok: false,
      message: "Product not found",
      code,
    });
  }

  if (code === "CUSTOMER_IDS_REQUIRED_FOR_TARGET") {
    return res.status(400).json({
      ok: false,
      message: "Choose at least one customer for manual customer targeting",
      code,
    });
  }

  if (code === "CATEGORY_REQUIRED") {
  return res.status(400).json({
    ok: false,
    message: "Choose a business category for this broadcast target",
    code,
  });
}

  console.error("WhatsApp broadcast unhandled error:", err);

  return res.status(500).json({
    ok: false,
    message: fallbackMessage,
    code: code || "WHATSAPP_BROADCAST_ERROR",
  });
}

async function listBroadcasts(req, res) {
  try {
    const tenantId = getTenantId(req);

    const broadcasts = await service.listBroadcasts({
      tenantId,
      status: req.query?.status,
      accountId: req.query?.accountId,
      q: req.query?.q,
      limit: req.query?.limit,
      includeArchived: req.query?.includeArchived === "true",
    });

    return res.json({
      ok: true,
      broadcasts,
      strategy: {
        mode: "ONE_STORE_NUMBER",
        customerFacingLabel: "One WhatsApp number for the store",
        internalTargeting:
          "Customers receive messages from the store number. Branch targeting only controls which customers are selected.",
      },
    });
  } catch (err) {
    console.error("listBroadcasts error:", err);
    return mapBroadcastError(err, res, "Failed to list WhatsApp broadcasts");
  }
}

async function previewBroadcastRecipients(req, res) {
  try {
    const tenantId = getTenantId(req);

    const preview = await service.previewBroadcastRecipients({
      tenantId,
      body: {
        ...(req.body || {}),
        targeting: getTargetingFromRequest(req),
      },
      limit: req.body?.limit || req.query?.limit || 20,
    });

    return res.json({
      ok: true,
      message: preview.recipientCount
        ? "WhatsApp broadcast recipients found"
        : "No eligible WhatsApp recipients found",
      preview,
    });
  } catch (err) {
    console.error("previewBroadcastRecipients error:", err);
    return mapBroadcastError(err, res, "Failed to preview WhatsApp broadcast recipients");
  }
}

async function getBroadcast(req, res) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const broadcast = await service.getBroadcast({
      tenantId,
      broadcastId: id,
    });

    return res.json({
      ok: true,
      broadcast,
    });
  } catch (err) {
    console.error("getBroadcast error:", err);
    return mapBroadcastError(err, res, "Failed to fetch WhatsApp broadcast");
  }
}


async function getBroadcastReport(req, res) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const result = await service.getBroadcastReport({
      tenantId,
      broadcastId: id,
      limit: req.query?.limit || 200,
    });

    return res.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    console.error("getBroadcastReport error:", err);
    return mapBroadcastError(err, res, "Failed to fetch WhatsApp broadcast report");
  }
}

async function createBroadcast(req, res) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);

    const broadcast = await service.createBroadcast({
      tenantId,
      userId,
      body: req.body || {},
    });

    return res.status(201).json({
      ok: true,
      message: "WhatsApp broadcast created",
      broadcast,
    });
  } catch (err) {
    console.error("createBroadcast error:", err);
    return mapBroadcastError(err, res, "Failed to create WhatsApp broadcast");
  }
}

async function updateBroadcast(req, res) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const broadcast = await service.updateBroadcast({
      tenantId,
      broadcastId: id,
      body: req.body || {},
    });

    return res.json({
      ok: true,
      message: "WhatsApp broadcast updated",
      broadcast,
    });
  } catch (err) {
    console.error("updateBroadcast error:", err);
    return mapBroadcastError(err, res, "Failed to update WhatsApp broadcast");
  }
}

async function deleteBroadcast(req, res) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { id } = req.params;

    const result = await service.deleteBroadcast({
      tenantId,
      userId,
      broadcastId: id,
    });

    return res.json({
      ok: true,
      archived: Boolean(result.archived),
      deleted: false,
      ...result,
    });
  } catch (err) {
    console.error("deleteBroadcast error:", err);
    return mapBroadcastError(err, res, "Failed to clean up WhatsApp broadcast");
  }
}

async function queueBroadcast(req, res) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const broadcast = await service.queueBroadcast({
      tenantId,
      broadcastId: id,
    });

    return res.json({
      ok: true,
      message: "WhatsApp broadcast queued",
      broadcast,
    });
  } catch (err) {
    console.error("queueBroadcast error:", err);
    return mapBroadcastError(err, res, "Failed to queue WhatsApp broadcast");
  }
}

async function sendBroadcastNow(req, res) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;

    const result = await service.sendBroadcastNow({
      tenantId,
      broadcastId: id,
      limit: req.body?.limit || req.query?.limit || 50,
      targeting: getTargetingFromRequest(req),
    });

    return res.json({
      ok: true,
      message: "WhatsApp broadcast sent",
      ...result,
    });
  } catch (err) {
    console.error("sendBroadcastNow error:", err);
    return mapBroadcastError(err, res, "Failed to send WhatsApp broadcast");
  }
}

module.exports = {
  listBroadcasts,
  previewBroadcastRecipients,
  getBroadcast,
  getBroadcastReport,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
  queueBroadcast,
  sendBroadcastNow,
};