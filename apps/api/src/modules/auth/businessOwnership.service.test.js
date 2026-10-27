"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createBusinessOwnerMembership,
  BusinessOwnershipError,
} = require("./businessOwnership.service");

function fixture({
  accountStatus = "ACTIVE",
  verified = true,
  ownerTenant = "business-1",
  ownerRole = "OWNER",
  ownerActive = true,
  ownerExists = true,
} = {}) {
  const writes = [];
  const tx = {
    storvexAccount: {
      async findUnique({ where }) {
        return {
          id: where.id,
          status: accountStatus,
          emailVerifiedAt: verified ? new Date() : null,
        };
      },
    },
    user: {
      async findUnique({ where }) {
        if (!ownerExists) return null;
        return {
          id: where.id,
          tenantId: ownerTenant,
          role: ownerRole,
          isActive: ownerActive,
        };
      },
    },
    storvexBusinessMembership: {
      async create({ data }) {
        writes.push(data);
        return { id: "membership-1", ...data };
      },
    },
  };
  return { tx, writes };
}

function args(tx) {
  return {
    tx,
    authenticatedAccountId: "account-1",
    newlyCreatedTenantId: "business-1",
    newlyCreatedRetailUserId: "owner-1",
  };
}

test("links verified account to new retail owner", async () => {
  const { tx, writes } = fixture();
  const result = await createBusinessOwnerMembership(args(tx));
  assert.equal(result.accountId, "account-1");
  assert.equal(result.tenantId, "business-1");
  assert.equal(result.retailUserId, "owner-1");
  assert.equal(result.role, "OWNER");
  assert.equal(writes.length, 1);
});

for (const [name, changes, options] of [
  ["missing account", { authenticatedAccountId: "" }, {}],
  ["missing business", { newlyCreatedTenantId: "" }, {}],
  ["missing retail owner", { newlyCreatedRetailUserId: "" }, {}],
  ["unverified account", {}, { verified: false }],
  ["inactive account", {}, { accountStatus: "SUSPENDED" }],
  ["owner from another business", {}, { ownerTenant: "business-2" }],
  ["non-owner retail user", {}, { ownerRole: "CASHIER" }],
  ["inactive retail owner", {}, { ownerActive: false }],
  ["missing retail user", {}, { ownerExists: false }],
]) {
  test("rejects " + name, async () => {
    const { tx, writes } = fixture(options);
    await assert.rejects(
      () => createBusinessOwnerMembership({
        ...args(tx),
        ...changes,
      }),
      BusinessOwnershipError
    );
    assert.equal(writes.length, 0);
  });
}

test("ignores attempted role and identity overrides", async () => {
  const { tx } = fixture();
  const result = await createBusinessOwnerMembership({
    ...args(tx),
    accountId: "other-account",
    retailUserId: "other-user",
    role: "PLATFORM_ADMIN",
  });
  assert.equal(result.accountId, "account-1");
  assert.equal(result.retailUserId, "owner-1");
  assert.equal(result.role, "OWNER");
});
