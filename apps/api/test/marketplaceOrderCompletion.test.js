"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizePaymentMethod,
  __private: {
    resolveMarketplaceCustomer,
  },
} = require("../src/modules/store/marketplaceOrderCompletion.service");

function createCustomerTx({
  linkedCustomer = null,
  phoneCustomer = null,
  createdCustomerId = "customer-created",
} = {}) {
  const calls = {
    findFirst: [],
    findUnique: [],
    update: [],
    create: [],
  };

  const tx = {
    customer: {
      async findFirst(args) {
        calls.findFirst.push(args);
        return linkedCustomer;
      },

      async findUnique(args) {
        calls.findUnique.push(args);
        return phoneCustomer;
      },

      async update(args) {
        calls.update.push(args);

        return {
          id: args.where.id,
          ...args.data,
        };
      },

      async create(args) {
        calls.create.push(args);

        return {
          id: createdCustomerId,
        };
      },
    },
  };

  return {
    tx,
    calls,
  };
}

function marketplaceOrder(overrides = {}) {
  return {
    tenantId: "tenant-1",
    marketplaceCustomerId: "marketplace-customer-1",
    customerName: "Marketplace Buyer",
    customerPhone: "0788000000",
    customerEmail: "buyer@example.com",
    deliveryAddress: "Kigali, Rwanda",
    requestNumber: "MKT-001",
    ...overrides,
  };
}

test("reuses the permanent Marketplace customer link after the buyer changes phone", async () => {
  const {
    tx,
    calls,
  } = createCustomerTx({
    linkedCustomer: {
      id: "customer-linked",
      isActive: true,
    },
  });

  const customerId =
    await resolveMarketplaceCustomer(
      tx,
      marketplaceOrder({
        customerPhone: "0788999999",
      }),
    );

  assert.equal(
    customerId,
    "customer-linked",
  );

  assert.equal(
    calls.findFirst.length,
    1,
  );

  assert.deepEqual(
    calls.findFirst[0].where,
    {
      tenantId: "tenant-1",
      marketplaceCustomerId:
        "marketplace-customer-1",
    },
  );

  assert.equal(
    calls.findUnique.length,
    0,
  );

  assert.equal(
    calls.create.length,
    0,
  );
});

test("adds a permanent Marketplace link to an existing same-phone customer", async () => {
  const {
    tx,
    calls,
  } = createCustomerTx({
    phoneCustomer: {
      id: "customer-phone",
      name: "Existing Customer",
      email: "existing@example.com",
      address: "Existing address",
      marketplaceCustomerId: null,
      isActive: true,
    },
  });

  const customerId =
    await resolveMarketplaceCustomer(
      tx,
      marketplaceOrder(),
    );

  assert.equal(
    customerId,
    "customer-phone",
  );

  assert.equal(
    calls.update.length,
    1,
  );

  assert.equal(
    calls.update[0].where.id,
    "customer-phone",
  );

  assert.equal(
    calls.update[0].data
      .marketplaceCustomerId,
    "marketplace-customer-1",
  );

  assert.equal(
    calls.update[0].data.isActive,
    true,
  );

  assert.equal(
    calls.create.length,
    0,
  );
});

test("does not overwrite owner-managed customer details when linking Marketplace identity", async () => {
  const {
    tx,
    calls,
  } = createCustomerTx({
    phoneCustomer: {
      id: "customer-owner-managed",
      name: "Owner Managed Name",
      email: "owner-managed@example.com",
      address: "Owner Managed Address",
      marketplaceCustomerId: null,
      isActive: true,
    },
  });

  await resolveMarketplaceCustomer(
    tx,
    marketplaceOrder({
      customerName: "Different Marketplace Name",
      customerEmail: "different@example.com",
      deliveryAddress: "Different Marketplace Address",
    }),
  );

  assert.equal(
    calls.update.length,
    1,
  );

  const {
    data,
  } = calls.update[0];

  assert.equal(
    Object.hasOwn(data, "name"),
    false,
  );

  assert.equal(
    Object.hasOwn(data, "email"),
    false,
  );

  assert.equal(
    Object.hasOwn(data, "address"),
    false,
  );

  assert.equal(
    data.marketplaceCustomerId,
    "marketplace-customer-1",
  );
});

test("rejects a phone already linked to another Marketplace account", async () => {
  const {
    tx,
    calls,
  } = createCustomerTx({
    phoneCustomer: {
      id: "customer-conflict",
      name: "Existing Customer",
      email: "existing@example.com",
      address: "Existing address",
      marketplaceCustomerId:
        "marketplace-customer-other",
      isActive: true,
    },
  });

  await assert.rejects(
    () =>
      resolveMarketplaceCustomer(
        tx,
        marketplaceOrder(),
      ),
    (error) => {
      assert.equal(
        error.status,
        409,
      );

      assert.equal(
        error.code,
        "MARKETPLACE_CUSTOMER_LINK_CONFLICT",
      );

      return true;
    },
  );

  assert.equal(
    calls.update.length,
    0,
  );

  assert.equal(
    calls.create.length,
    0,
  );
});

test("accepts supported Marketplace completion payment methods", () => {
  assert.equal(
    normalizePaymentMethod("cash"),
    "CASH",
  );

  assert.equal(
    normalizePaymentMethod("momo"),
    "MOMO",
  );

  assert.equal(
    normalizePaymentMethod("bank"),
    "BANK",
  );

  assert.equal(
    normalizePaymentMethod("other"),
    "OTHER",
  );
});

test("stores card-style Marketplace payment as Other money", () => {
  assert.equal(
    normalizePaymentMethod("card"),
    "OTHER",
  );
});

test("rejects unsupported Marketplace completion payment methods", () => {
  assert.equal(
    normalizePaymentMethod("seller_approved_other"),
    null,
  );

  assert.equal(
    normalizePaymentMethod(""),
    null,
  );
});

test("normalizes supported Marketplace delivery failure reasons", () => {
  const {
    normalizeDeliveryFailureReason,
  } = require("../src/modules/store/marketplaceDeliveryFailure.service");

  assert.equal(
    normalizeDeliveryFailureReason(
      "customer_refused",
    ),
    "CUSTOMER_REFUSED",
  );

  assert.equal(
    normalizeDeliveryFailureReason(
      " customer_unreachable ",
    ),
    "CUSTOMER_UNREACHABLE",
  );

  assert.equal(
    normalizeDeliveryFailureReason(
      "wrong_address",
    ),
    "WRONG_ADDRESS",
  );

  assert.equal(
    normalizeDeliveryFailureReason(
      "delivery_attempt_failed",
    ),
    "DELIVERY_ATTEMPT_FAILED",
  );

  assert.equal(
    normalizeDeliveryFailureReason(
      "other",
    ),
    "OTHER",
  );
});

test("rejects unsupported Marketplace delivery failure reasons", () => {
  const {
    normalizeDeliveryFailureReason,
  } = require("../src/modules/store/marketplaceDeliveryFailure.service");

  assert.equal(
    normalizeDeliveryFailureReason(
      "changed_mind",
    ),
    null,
  );

  assert.equal(
    normalizeDeliveryFailureReason(
      "",
    ),
    null,
  );
});
