const express = require("express");

const router = express.Router();

const moneyController = require("./money.controller");

const authenticate = require("../../middlewares/authenticate");
const requireTenant = require("../../middlewares/requireTenant");
const {
  requireActiveSubscription,
  requireWritableSubscription,
} = require("../../middlewares/requireActiveSubscription");
const requireDbPermission = require("../../middlewares/requireDbPermission");
const { PERMISSIONS } = require("../auth/permissions");

const readBase = [authenticate, requireTenant, requireActiveSubscription];
const writeBase = [
  authenticate,
  requireTenant,
  requireActiveSubscription,
  requireWritableSubscription,
];

router.get(
  "/summary",
  ...readBase,
  requireDbPermission(PERMISSIONS.REPORTS_VIEW),
  moneyController.getSummary,
);

router.get(
  "/loans",
  ...readBase,
  requireDbPermission(PERMISSIONS.REPORTS_VIEW),
  moneyController.listLoans,
);

router.post(
  "/loans",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.BILLING_VIEW),
  moneyController.createLoan,
);

router.post(
  "/loans/:id/payments",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.BILLING_VIEW),
  moneyController.addLoanPayment,
);

router.patch(
  "/loans/:id",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.BILLING_VIEW),
  moneyController.updateLoan,
);

module.exports = router;
