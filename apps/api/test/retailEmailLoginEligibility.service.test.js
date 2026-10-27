"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  RETAIL_ROLES,
  createRetailEmailLoginEligibilityService
} = require("../src/modules/auth/retailEmailLoginEligibility.service");

function setup({
  role = "OWNER",
  active = true,
  tenantStatus = "ACTIVE",
  tenantId = "tenant-1",
  tenantMissing = false,
  tenantMismatch = false,
  userMissing = false
} = {}) {
  const calls = {
    users: 0,
    tenants: 0
  };

  const user = {
    id: "user-1",
    email: "merchant@example.test",
    tenantId,
    role,
    isActive: active
  };

  const prisma = {
    user: {
      async findUnique(query) {
        calls.users++;

        assert.ok(query.select);
        assert.equal(query.select.isActive, true);
        assert.equal(query.select.tenantId, true);

        return userMissing ? null : user;
      }
    },
    tenant: {
      async findUnique(query) {
        calls.tenants++;

        assert.equal(query.where.id, tenantId);
        assert.equal(query.select.status, true);

        if (tenantMissing) return null;

        return {
          id: tenantMismatch ? "another-tenant" : tenantId,
          status: tenantStatus
        };
      }
    }
  };

  const service =
    createRetailEmailLoginEligibilityService({ prisma });

  return { service, user, calls };
}

test("each retail role is eligible for active tenant", async () => {
  for (const role of RETAIL_ROLES) {
    const app = setup({ role });

    assert.equal(
      await app.service.isRetailUserEligible({
        user: app.user
      }),
      true,
      role
    );
  }
});

test("platform administrator is not retail eligible", async () => {
  const app = setup({ role: "PLATFORM_ADMIN" });

  assert.equal(
    await app.service.isRetailUserEligible({
      user: app.user
    }),
    false
  );

  assert.equal(app.calls.tenants, 0);
});

test("inactive user is denied", async () => {
  const app = setup({ active: false });

  assert.equal(
    await app.service.isRetailUserEligible({
      user: app.user
    }),
    false
  );

  assert.equal(app.calls.tenants, 0);
});

test("pending tenant is denied", async () => {
  const app = setup({ tenantStatus: "PENDING" });

  assert.equal(
    await app.service.isRetailUserEligible({
      user: app.user
    }),
    false
  );
});

test("suspended tenant is denied", async () => {
  const app = setup({ tenantStatus: "SUSPENDED" });

  assert.equal(
    await app.service.isRetailUserEligible({
      user: app.user
    }),
    false
  );
});

test("missing tenant is denied", async () => {
  const app = setup({ tenantMissing: true });

  assert.equal(
    await app.service.isRetailUserEligible({
      user: app.user
    }),
    false
  );
});

test("mismatched tenant is denied", async () => {
  const app = setup({ tenantMismatch: true });

  assert.equal(
    await app.service.isRetailUserEligible({
      user: app.user
    }),
    false
  );
});

test("missing tenant ID is denied", async () => {
  const app = setup({ tenantId: null });

  assert.equal(
    await app.service.isRetailUserEligible({
      user: app.user
    }),
    false
  );

  assert.equal(app.calls.tenants, 0);
});

test("unknown account is not returned", async () => {
  const app = setup({ userMissing: true });

  const result = await app.service.findRetailUser({
    email: "merchant@example.test"
  });

  assert.equal(result, null);
});

test("email lookup normalizes address", async () => {
  const app = setup();

  const result = await app.service.findRetailUser({
    email: "  MERCHANT@EXAMPLE.TEST  "
  });

  assert.equal(result.email, "merchant@example.test");
});

test("invalid email is not queried", async () => {
  const app = setup();

  const result = await app.service.findRetailUser({
    email: "not-an-email"
  });

  assert.equal(result, null);
  assert.equal(app.calls.users, 0);
});

test("ID lookup supports verification rechecks", async () => {
  const app = setup();

  const result = await app.service.findRetailUserById({
    userId: "user-1"
  });

  assert.equal(result.id, "user-1");
  assert.equal(result.tenantId, "tenant-1");
});

test("incomplete Prisma dependency is rejected", () => {
  assert.throws(
    () => createRetailEmailLoginEligibilityService({
      prisma: {}
    }),
    TypeError
  );
});
