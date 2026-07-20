// src/modules/store/store.routes.js
const express = require("express");

const router = express.Router();

const controller = require("./store.controller");
const marketplaceController = require("./marketplaceSeller.controller");
const marketplaceRequestsController = require("./marketplaceRequests.controller");
const requireDbPermission = require("../../middlewares/requireDbPermission");
const {
  requireMarketplaceEntitlement,
} = require("../../middlewares/requireMarketplaceEntitlement");
const {
  requireWritableSubscription,
} = require("../../middlewares/requireActiveSubscription");
const { PERMISSIONS } = require("../auth/permissions");

// NOTE:
// /api/store is already mounted in app.js behind:
// authenticate, requireTenant, requireActiveSubscription, and store-role gating.
// So this route file should focus on endpoint-level permission checks only.

// Read endpoints
router.get(
  "/profile",
  requireDbPermission(PERMISSIONS.SETTINGS_VIEW),
  controller.getProfile
);

router.get(
  "/setup-checklist",
  requireDbPermission(PERMISSIONS.SETTINGS_VIEW),
  controller.getChecklist
);

router.get(
  "/document-settings",
  requireDbPermission(PERMISSIONS.SETTINGS_VIEW),
  controller.getDocumentConfig
);

router.get(
  "/marketplace-profile",
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_VIEW),
  marketplaceController.getMarketplaceProfile
);

router.get(
  "/marketplace-readiness",
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_VIEW),
  marketplaceController.getMarketplaceProfileReadiness
);

router.get(
  "/marketplace-requests",
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_VIEW),
  marketplaceRequestsController.listMarketplaceRequests
);

router.get(
  "/marketplace-requests/:requestId",
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_VIEW),
  marketplaceRequestsController.getMarketplaceRequest
);

// Write endpoints
router.post(
  "/marketplace-requests/:requestId/confirm",
  express.json(),
  requireWritableSubscription,
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_EDIT),
  marketplaceRequestsController.confirmMarketplaceRequest
);

router.post(
  "/marketplace-requests/:requestId/reject",
  express.json(),
  requireWritableSubscription,
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_EDIT),
  marketplaceRequestsController.rejectMarketplaceRequest
);

router.post(
  "/marketplace-requests/:requestId/start-preparing",
  express.json(),
  requireWritableSubscription,
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_EDIT),
  marketplaceRequestsController.startPreparingMarketplaceRequest
);

router.post(
  "/marketplace-requests/:requestId/ready-for-pickup",
  express.json(),
  requireWritableSubscription,
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_EDIT),
  marketplaceRequestsController.markMarketplaceRequestReady
);

router.post(
  "/marketplace-requests/:requestId/out-for-delivery",
  express.json(),
  requireWritableSubscription,
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_EDIT),
  marketplaceRequestsController.markMarketplaceRequestOutForDelivery
);

router.post(
  "/marketplace-requests/:requestId/complete-pickup",
  express.json(),
  requireWritableSubscription,
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_EDIT),
  marketplaceRequestsController.completeMarketplacePickupRequest
);

router.post(
  "/marketplace-requests/:requestId/complete-delivery",
  express.json(),
  requireWritableSubscription,
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_EDIT),
  marketplaceRequestsController.completeMarketplaceDeliveryRequest
);

router.post(
  "/marketplace-requests/:requestId/delivery-failed",
  express.json(),
  requireWritableSubscription,
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_EDIT),
  marketplaceRequestsController.failMarketplaceDeliveryRequest
);

router.post(
  "/marketplace-requests/:requestId/cancel",
  express.json(),
  requireWritableSubscription,
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_EDIT),
  marketplaceRequestsController.cancelMarketplaceRequest
);

router.patch(
  "/profile",
  express.json(),
  requireWritableSubscription,
  requireDbPermission(PERMISSIONS.SETTINGS_EDIT_GENERAL),
  controller.patchProfile
);

router.patch(
  "/document-settings",
  express.json(),
  requireWritableSubscription,
  requireDbPermission(PERMISSIONS.SETTINGS_EDIT_GENERAL),
  controller.patchDocumentConfig
);

router.patch(
  "/marketplace-profile",
  express.json(),
  requireWritableSubscription,
  requireMarketplaceEntitlement,
  requireDbPermission(PERMISSIONS.MARKETPLACE_EDIT),
  marketplaceController.patchMarketplaceProfile
);

router.post(
  "/logo-upload-url",
  express.json(),
  requireWritableSubscription,
  requireDbPermission(PERMISSIONS.SETTINGS_EDIT_GENERAL),
  controller.createLogoUploadUrl
);

module.exports = router;
