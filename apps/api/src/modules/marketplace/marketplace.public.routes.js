const express = require("express");

const controller = require("./marketplace.public.controller");

const router = express.Router();

router.post("/requests", controller.createRequest);
router.get("/stores", controller.listStores);
router.get("/stores/:storeSlug", controller.getStore);
router.get(
  "/stores/:storeSlug/products/:productSlug",
  controller.getProduct,
);
router.get("/products", controller.listProducts);

module.exports = router;
