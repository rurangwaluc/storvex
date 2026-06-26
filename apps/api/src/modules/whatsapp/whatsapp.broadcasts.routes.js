const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const requireTenant = require("../../middlewares/requireTenant");
const requireRole = require("../../middlewares/requireRole");

const controller = require("./whatsapp.broadcasts.controller");
const { WHATSAPP_OWNER_ROLES } = require("./whatsapp.roles");

/**
 * WhatsApp broadcasts
 *
 * Storvex strategy:
 * - One WhatsApp number per store/tenant.
 * - Customers receive messages from the store number.
 * - Branch targeting is internal only. It controls which customers receive
 *   the broadcast; customers do not need to know branch structure.
 *
 * Access:
 * - Owner/manager-level roles only.
 */
router.use(
  authenticate,
  requireTenant,
  requireRole(...WHATSAPP_OWNER_ROLES)
);

/**
 * GET /api/whatsapp/broadcasts
 *
 * Optional query:
 * - status=DRAFT|QUEUED|SENT|FAILED
 * - accountId=<whatsappAccountId>
 * - q=<search>
 * - limit=50
 * - includeArchived=true
 */
router.get("/broadcasts", controller.listBroadcasts);

/**
 * POST /api/whatsapp/broadcasts
 *
 * Body:
 * {
 *   "accountId": "optional",
 *   "promotionId": "optional",
 *   "templateName": "promo_template",
 *   "languageCode": "en_US",
 *   "targeting": {
 *    "mode": "ALL_OPTED_IN" |
        "BRANCH_CUSTOMERS" |
        "CATEGORY_CUSTOMERS" |
        "CREDIT_CUSTOMERS" |
        "OVERDUE_CREDIT_CUSTOMERS" |
        "PRODUCT_BUYERS" |
        "MANUAL_CUSTOMERS",

"category": "ELECTRONICS" |
            "HARDWARE" |
            "HOME_KITCHEN" |
            "LIGHTING" |
            "SPARE_PARTS",
 *   }
 * }
 */
router.post("/broadcasts", controller.createBroadcast);


/**
 * POST /api/whatsapp/broadcasts/recipients/preview
 *
 * Body:
 * {
 *   "promotionId": "optional",
 *   "limit": 20,
 *   "targeting": {
 *     "mode": "ALL_OPTED_IN" |
 *       "CATEGORY_CUSTOMERS" |
 *       "CREDIT_CUSTOMERS" |
 *       "OVERDUE_CREDIT_CUSTOMERS" |
 *       "PRODUCT_BUYERS" |
 *       "MANUAL_CUSTOMERS",
 *     "category": "registered business category",
 *     "productId": "optional",
 *     "customerIds": []
 *   }
 * }
 */
router.post("/broadcasts/recipients/preview", controller.previewBroadcastRecipients);

/**
 * GET /api/whatsapp/broadcasts/:id
 */
router.get("/broadcasts/:id", controller.getBroadcast);

/**
 * PATCH /api/whatsapp/broadcasts/:id
 *
 * Only draft broadcasts can be edited.
 */
router.patch("/broadcasts/:id", controller.updateBroadcast);

/**
 * DELETE /api/whatsapp/broadcasts/:id
 *
 * Cleanup rules:
 * - DRAFT: archives the draft broadcast from active lists.
 * - QUEUED: cancels the queue and archives the broadcast.
 * - FAILED: archives the failed record.
 * - SENT: archives from active lists but keeps campaign history.
 *
 * This route keeps the DELETE verb for UI compatibility, but it is a soft archive.
 */
router.delete("/broadcasts/:id", controller.deleteBroadcast);

/**
 * POST /api/whatsapp/broadcasts/:id/queue
 *
 * Moves a draft broadcast into queued status.
 */
router.post("/broadcasts/:id/queue", controller.queueBroadcast);

/**
 * POST /api/whatsapp/broadcasts/:id/send
 *
 * Sends a draft or queued broadcast immediately.
 *
 * Body can include:
 * {
  "limit": 50,
  "targeting": {
    "mode": "CATEGORY_CUSTOMERS",

    "category": "ELECTRONICS",

    "branchId": null,

    "productId": null,

    "customerIds": []
  }
}
 */
router.post("/broadcasts/:id/send", controller.sendBroadcastNow);

module.exports = router;
