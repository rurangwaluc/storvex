const express = require("express");

const controller = require("./marketplace.public.controller");

const customerAuth = require("./marketplace.customer.auth");
const authenticateMarketplaceCustomer = require("./marketplace.customer.authenticate");
const optionallyAuthenticateMarketplaceCustomer = require("./marketplace.customer.optional");

const router = express.Router();

router.post(
  "/customer/register",
  customerAuth.registerCustomer,
);

router.post(
  "/customer/login",
  customerAuth.loginCustomer,
);

router.post(
  "/customer/logout",
  authenticateMarketplaceCustomer,
  customerAuth.logoutCustomer,
);

router.get(
  "/customer/me",
  authenticateMarketplaceCustomer,
  customerAuth.getCurrentCustomer,
);

router.patch(
  "/customer/me",
  authenticateMarketplaceCustomer,
  customerAuth.updateCustomerDetails,
);

router.post(
  "/customer/change-password",
  authenticateMarketplaceCustomer,
  customerAuth.changeCustomerPassword,
);

router.get(
  "/customer/orders",
  authenticateMarketplaceCustomer,
  customerAuth.listCustomerOrders,
);

router.post(
  "/analytics/events",
  express.json(),
  optionallyAuthenticateMarketplaceCustomer,
  controller.recordAnalyticsEvent,
);

router.post(
  "/requests",
  optionallyAuthenticateMarketplaceCustomer,
  controller.createRequest,
);
router.get(
  "/requests/:trackingToken",
  controller.trackRequest,
);
router.get("/stores", controller.listStores);
router.get("/stores/:storeSlug", controller.getStore);
router.get(
  "/stores/:storeSlug/products/:productSlug",
  controller.getProduct,
);
router.get("/products", controller.listProducts);

module.exports = router;
