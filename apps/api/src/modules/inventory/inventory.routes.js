const multer = require("multer");
const express = require("express");
const router = express.Router();

const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});


const inventoryController = require("./inventory.controller");
const inventoryImagesController = require("./inventory.images.controller");

const authenticate = require("../../middlewares/authenticate");
const requireTenant = require("../../middlewares/requireTenant");
const {
  requireActiveSubscription,
  requireWritableSubscription,
} = require("../../middlewares/requireActiveSubscription");
const requireDbPermission = require("../../middlewares/requireDbPermission");
const { PERMISSIONS } = require("../auth/permissions");

const readBase = [
  authenticate,
  requireTenant,
  requireActiveSubscription,
];

const writeBase = [
  authenticate,
  requireTenant,
  requireActiveSubscription,
  requireWritableSubscription,
];

// Product search (POS and inventory UI)
router.get(
  "/products/search",
  ...readBase,
  requireDbPermission(PERMISSIONS.INVENTORY_VIEW),
  inventoryController.searchProducts
);

// Inventory summary
router.get(
  "/summary",
  ...readBase,
  requireDbPermission(PERMISSIONS.INVENTORY_VIEW),
  inventoryController.getInventorySummary
);

// List products
router.get(
  "/products",
  ...readBase,
  requireDbPermission(PERMISSIONS.INVENTORY_VIEW),
  inventoryController.getProducts
);

// Inventory Excel export
router.get(
  "/export.xlsx",
  ...readBase,
  requireDbPermission(PERMISSIONS.INVENTORY_VIEW),
  inventoryController.exportInventoryExcel
);

// Whole-store stock history
router.get(
  "/stock-adjustments",
  ...readBase,
  requireDbPermission(PERMISSIONS.INVENTORY_HISTORY_VIEW),
  inventoryController.listAllStockAdjustments
);

// Stock history Excel export
router.get(
  "/stock-adjustments/export.xlsx",
  ...readBase,
  requireDbPermission(PERMISSIONS.INVENTORY_HISTORY_VIEW),
  inventoryController.exportStockAdjustmentsExcel
);

// Product images
router.post(
  "/products/:id/images/upload",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  productImageUpload.single("image"),
  inventoryImagesController.uploadProductImage
);

router.post(
  "/products/:id/images/upload-url",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryImagesController.createProductImageUploadUrl
);

router.get(
  "/products/:id/images",
  ...readBase,
  requireDbPermission(PERMISSIONS.INVENTORY_VIEW),
  inventoryController.listProductImages
);

router.post(
  "/products/:id/images",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.addProductImage
);

router.delete(
  "/products/:id/images/:imageId",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.deleteProductImage
);

router.patch(
  "/products/:id/images/:imageId/primary",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.setPrimaryProductImage
);

// Product listing controls
router.patch(
  "/products/:id/listing",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.updateProductListingDraft
);

router.patch(
  "/products/:id/listing/publish",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.publishProductListing
);

router.patch(
  "/products/:id/listing/unpublish",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.unpublishProductListing
);

// Backward-compatible route aliases while DB fields still use marketplace* columns.
router.patch(
  "/products/:id/marketplace",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.updateProductListingDraft
);

router.patch(
  "/products/:id/marketplace/publish",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.publishProductListing
);

router.patch(
  "/products/:id/marketplace/unpublish",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.unpublishProductListing
);

// Get product by ID
router.get(
  "/products/:id",
  ...readBase,
  requireDbPermission(PERMISSIONS.INVENTORY_VIEW),
  inventoryController.getProductById
);

// Create product
router.post(
  "/products",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_CREATE),
  inventoryController.createProduct
);

// Update product
router.put(
  "/products/:id",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.updateProduct
);

// Deactivate product
router.delete(
  "/products/:id",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.deleteProduct
);

// Activate product
router.patch(
  "/products/:id/activate",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_EDIT),
  inventoryController.activateProduct
);

// Stock adjustments / restock / manual correction
router.post(
  "/products/:id/stock-adjustments",
  ...writeBase,
  requireDbPermission(PERMISSIONS.INVENTORY_ADJUST),
  inventoryController.adjustStock
);

// Per-product stock history
router.get(
  "/products/:id/stock-adjustments",
  ...readBase,
  requireDbPermission(PERMISSIONS.INVENTORY_HISTORY_VIEW),
  inventoryController.listStockAdjustments
);

// Reorder PDF export
router.get(
  "/reorder.pdf",
  ...readBase,
  requireDbPermission(PERMISSIONS.INVENTORY_REORDER_VIEW),
  inventoryController.reorderPdf
);

module.exports = router;
