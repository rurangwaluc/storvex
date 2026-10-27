"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveBusinessMembership,
} = require("./businessMembership.service");

const ACCOUNT_ID = "account-1";
const TENANT_ID = "tenant-1";

function mockDb({
  accountStatus = "ACTIVE",
  verified = true,
  membershipStatus = "ACTIVE",
  role = "OWNER",
  tenantStatus = "ACTIVE",
  membershipExists = true,
  wrongTenant = false,
} = {}) {
  return {
    storvexAccount: {
      async findUnique() {
        return {
          id: ACCOUNT_ID,
          status: accountStatus,
          emailVerifiedAt: verified ? new Date() : null,
        };
      },
    },
    storvexBusinessMembership: {
      async findUnique() {
        if (!membershipExists) return null;

        return {
          id: "membership-1",
          accountId: ACCOUNT_ID,
          tenantId: wrongTenant ? "other-tenant" : TENANT_ID,
          role,
          status: membershipStatus,
          tenant: {
            id: wrongTenant ? "other-tenant" : TENANT_ID,
            status: tenantStatus,
          },
        };
      },
    },
  };
}

async function resolve(options = {}, overrides = {}) {
  return resolveBusinessMembership({
    prisma: mockDb(options),
    accountId: ACCOUNT_ID,
    tenantId: TENANT_ID,
    ...overrides,
  });
}

test("active owner membership grants owner context", async () => {
  const result = await resolve();
  assert.equal(result.role, "OWNER");
  assert.equal(result.tenantId, TENANT_ID);
});

test("active cashier membership retains cashier role", async () => {
  const result = await resolve({ role: "CASHIER" });
  assert.equal(result.role, "CASHIER");
});

for (const [name, options, expectedCode] of [
  ["missing membership", { membershipExists: false }, "MEMBERSHIP_REQUIRED"],
  ["suspended membership", { membershipStatus: "SUSPENDED" }, "MEMBERSHIP_INACTIVE"],
  ["revoked membership", { membershipStatus: "REVOKED" }, "MEMBERSHIP_INACTIVE"],
  ["suspended business", { tenantStatus: "SUSPENDED" }, "BUSINESS_INACTIVE"],
  ["unverified account", { verified: false }, "ACCOUNT_NOT_ELIGIBLE"],
  ["inactive account", { accountStatus: "SUSPENDED" }, "ACCOUNT_NOT_ELIGIBLE"],
  ["cross-business record", { wrongTenant: true }, "MEMBERSHIP_REQUIRED"],
  ["platform role", { role: "PLATFORM_ADMIN" }, "INVALID_BUSINESS_ROLE"],
]) {
  test(`denies ${name}`, async () => {
    await assert.rejects(
      () => resolve(options),
      { code: expectedCode, status: 403 }
    );
  });
}

test("denies missing account identity", async () => {
  await assert.rejects(
    () => resolve({}, { accountId: "" }),
    { code: "MEMBERSHIP_REQUIRED" }
  );
});

test("denies missing business identity", async () => {
  await assert.rejects(
    () => resolve({}, { tenantId: "" }),
    { code: "MEMBERSHIP_REQUIRED" }
  );
});
