"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const {
  createAuthenticatedBusinessAccess,
} = require("./businessAccess.composition");

const TOKEN = "b".repeat(64);
const TOKEN_HASH = crypto
  .createHash("sha256")
  .update(TOKEN, "utf8")
  .digest("hex");

function fixture({
  revoked = false,
  expired = false,
  verified = true,
  membership = "ACTIVE",
  business = "ACTIVE",
  accountStatus = "ACTIVE",
} = {}) {
  const account = {
    id: "account-1",
    fullName: "Test Owner",
    email: "test@example.invalid",
    status: accountStatus,
    emailVerifiedAt: verified ? new Date() : null,
  };

  const prisma = {
    storvexAccount: {
      async findUnique() {
        return account;
      },
    },

    storvexAccountSession: {
      async findUnique({ where }) {
        if (where.tokenId !== TOKEN_HASH) return null;

        return {
          accountId: account.id,
          isRevoked: revoked,
          expiresAt: new Date(
            Date.now() + (expired ? -60000 : 60000)
          ),
          account,
        };
      },
    },

    storvexBusinessMembership: {
      async findUnique({ where }) {
        if (
          where.accountId_tenantId.accountId !== account.id ||
          where.accountId_tenantId.tenantId !== "tenant-1"
        ) {
          return null;
        }

        if (!membership) return null;

        return {
          id: "membership-1",
          accountId: account.id,
          tenantId: "tenant-1",
          role: "OWNER",
          status: membership,
          tenant: {
            id: "tenant-1",
            status: business,
          },
        };
      },
    },
  };

  const guard = createAuthenticatedBusinessAccess({ prisma });

  return async function request({
    cookie = `storvex_account_session=${TOKEN}`,
    tenantId = "tenant-1",
  } = {}) {
    const req = {
      headers: { cookie },
      params: { tenantId },
    };

    let status = 200;
    let body = null;
    let allowed = false;

    const res = {
      set() { return this; },
      status(value) { status = value; return this; },
      json(value) { body = value; return this; },
    };

    await guard(req, res, () => {
      allowed = true;
    });

    return {
      status,
      body,
      allowed,
      access: req.storvexBusinessAccess,
    };
  };
}

test("real session verification permits active owner membership", async () => {
  const result = await fixture()();

  assert.equal(result.allowed, true);
  assert.equal(result.access.accountId, "account-1");
  assert.equal(result.access.tenantId, "tenant-1");
  assert.equal(result.access.role, "OWNER");
});

test("revoked account session is denied", async () => {
  const result = await fixture({ revoked: true })();
  assert.equal(result.status, 401);
  assert.equal(result.allowed, false);
});

test("expired account session is denied", async () => {
  const result = await fixture({ expired: true })();
  assert.equal(result.status, 401);
  assert.equal(result.allowed, false);
});

test("unverified account is denied", async () => {
  const result = await fixture({ verified: false })();
  assert.equal(result.status, 401);
  assert.equal(result.allowed, false);
});

test("inactive account is denied", async () => {
  const result = await fixture({
    accountStatus: "SUSPENDED",
  })();

  assert.equal(result.status, 401);
  assert.equal(result.allowed, false);
});

test("suspended membership is denied", async () => {
  const result = await fixture({
    membership: "SUSPENDED",
  })();

  assert.equal(result.status, 403);
  assert.equal(result.allowed, false);
});

test("revoked membership is denied", async () => {
  const result = await fixture({
    membership: "REVOKED",
  })();

  assert.equal(result.status, 403);
  assert.equal(result.allowed, false);
});

test("membership in another business is denied", async () => {
  const result = await fixture()({
    tenantId: "tenant-2",
  });

  assert.equal(result.status, 403);
  assert.equal(result.allowed, false);
});

test("inactive business is denied", async () => {
  const result = await fixture({
    business: "SUSPENDED",
  })();

  assert.equal(result.status, 403);
  assert.equal(result.allowed, false);
});

test("invalid session token is denied", async () => {
  const result = await fixture()({
    cookie: "storvex_account_session=invalid",
  });

  assert.equal(result.status, 401);
  assert.equal(result.allowed, false);
});
