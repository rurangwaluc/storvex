// src/modules/tenants/tenants.routes.js

const express = require("express");

const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const requireTenant = require("../../middlewares/requireTenant");
const requireRole = require("../../middlewares/requireRole");
const {
  requireActiveSubscription,
  requireWritableSubscription,
} = require("../../middlewares/requireActiveSubscription");

const controller = require("./tenants.controller");
const {
  tenantLogoUpload,
} = require("./tenantLogoUpload");

// Settings
router.get(
  "/settings",
  authenticate,
  requireTenant,
  requireActiveSubscription,
  requireRole("OWNER"),
  controller.getTenantSettings
);

router.patch(
  "/settings",
  express.json(),
  authenticate,
  requireTenant,
  requireActiveSubscription,
  requireWritableSubscription,
  requireRole("OWNER"),
  controller.updateTenantSettings
);

// Logo upload (OWNER only)
router.post(
  "/logo/upload",
  authenticate,
  requireTenant,
  requireActiveSubscription,
  requireWritableSubscription,
  requireRole("OWNER"),
  tenantLogoUpload,
  controller.uploadTenantLogo
);

// Remove logo (OWNER only)
router.post(
  "/logo/remove",
  authenticate,
  requireTenant,
  requireActiveSubscription,
  requireWritableSubscription,
  requireRole("OWNER"),
  controller.removeTenantLogo
);

module.exports = router;