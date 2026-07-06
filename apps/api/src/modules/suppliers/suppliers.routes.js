// src/modules/suppliers/suppliers.routes.js
const express = require("express");

const router = express.Router();

const suppliersController = require("./suppliers.controller");

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
  "/",
  ...readBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_VIEW),
  suppliersController.listSuppliers
);

router.post(
  "/",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_CREATE),
  suppliersController.createSupplier
);

router.get(
  "/:id",
  ...readBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_VIEW),
  suppliersController.getSupplier
);

router.put(
  "/:id",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_EDIT),
  suppliersController.updateSupplier
);

router.patch(
  "/:id/activate",
  ...writeBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_EDIT),
  suppliersController.activateSupplier
);

router.patch(
  "/:id/deactivate",
  ...writeBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_EDIT),
  suppliersController.deactivateSupplier
);

router.get(
  "/:id/supplies",
  ...readBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_VIEW),
  suppliersController.listSupplies
);

router.post(
  "/:id/supplies",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_EDIT),
  suppliersController.createSupply
);


router.get(
  "/:id/purchase-orders",
  ...readBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_VIEW),
  suppliersController.listSupplierPurchaseOrders
);

router.post(
  "/:id/purchase-orders",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_EDIT),
  suppliersController.createSupplierPurchaseOrder
);

router.put(
  "/:id/purchase-orders/:purchaseOrderId",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_EDIT),
  suppliersController.updateSupplierPurchaseOrder
);

router.patch(
  "/:id/purchase-orders/:purchaseOrderId/status",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_EDIT),
  suppliersController.updateSupplierPurchaseOrderStatus
);


router.get(
  "/:id/balance",
  ...readBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_VIEW),
  suppliersController.getSupplierBalance
);

router.get(
  "/:id/bills",
  ...readBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_VIEW),
  suppliersController.listSupplierBills
);

router.post(
  "/:id/bills",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_EDIT),
  suppliersController.createSupplierBill
);


router.put(
  "/:id/bills/:billId",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_EDIT),
  suppliersController.updateSupplierBill
);

router.get(
  "/:id/payments",
  ...readBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_VIEW),
  suppliersController.listSupplierPayments
);

router.post(
  "/:id/payments",
  express.json(),
  ...writeBase,
  requireDbPermission(PERMISSIONS.SUPPLIERS_EDIT),
  suppliersController.createSupplierPayment
);

module.exports = router;