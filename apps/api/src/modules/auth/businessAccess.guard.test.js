"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createBusinessAccessGuard,
  readAccountSessionCookie,
} = require("./businessAccess.guard");

const {
  MembershipAccessError,
} = require("./businessMembership.service");

const TOKEN = "a".repeat(64);

function setup({
  authenticated = true,
  membershipAllowed = true,
  membershipAccountId = "account-1",
  membershipTenantId = "tenant-1",
  sessionThrows = false,
  membershipThrows = false,
} = {}) {
  const calls = [];

  const guard = createBusinessAccessGuard({
    prisma: {},
    accountSessions: {
      async authenticate(token) {
        calls.push(["authenticate", token]);

        if (sessionThrows) throw new Error("session unavailable");

        return authenticated
          ? { accountId: "account-1" }
          : null;
      },
    },
    async membershipResolver(args) {
      calls.push(["membership", args]);

      if (membershipThrows) throw new Error("database unavailable");

      if (!membershipAllowed) {
        throw new MembershipAccessError("MEMBERSHIP_REQUIRED");
      }

      return {
        membershipId: "membership-1",
        accountId: membershipAccountId,
        tenantId: membershipTenantId,
        role: "OWNER",
      };
    },
  });

  async function request({
    cookie = `${"storvex_account_session"}=${TOKEN}`,
    tenantId = "tenant-1",
    body = {},
  } = {}) {
    const req = {
      headers: { cookie },
      params: { tenantId },
      body,
    };

    let status = 200;
    let response;
    let nextCalled = false;

    const res = {
      set() { return this; },
      status(value) { status = value; return this; },
      json(value) { response = value; return this; },
    };

    await guard(req, res, () => { nextCalled = true; });

    return { status, response, nextCalled, req };
  }

  return { request, calls };
}

test("rejects missing authentication cookie", async () => {
  const { request, calls } = setup();
  const result = await request({ cookie: "" });

  assert.equal(result.status, 401);
  assert.equal(result.nextCalled, false);
  assert.equal(calls.length, 0);
});

test("rejects duplicate session cookies", () => {
  assert.equal(
    readAccountSessionCookie({
      headers: {
        cookie:
          `storvex_account_session=${TOKEN}; ` +
          `storvex_account_session=${TOKEN}`,
      },
    }),
    null
  );
});

test("rejects invalid account session", async () => {
  const { request, calls } = setup({ authenticated: false });

  const result = await request();

  assert.equal(result.status, 401);
  assert.equal(
    calls.filter(([name]) => name === "membership").length,
    0
  );
});

test("uses authenticated account instead of submitted account ID", async () => {
  const { request, calls } = setup();

  const result = await request({
    body: {
      accountId: "attacker-account",
      role: "PLATFORM_ADMIN",
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.nextCalled, true);

  const membershipCall = calls.find(
    ([name]) => name === "membership"
  );

  assert.equal(membershipCall[1].accountId, "account-1");
  assert.equal(result.req.storvexBusinessAccess.role, "OWNER");
});

test("rejects missing membership", async () => {
  const { request } = setup({ membershipAllowed: false });
  const result = await request();

  assert.equal(result.status, 403);
  assert.equal(result.nextCalled, false);
});

test("rejects membership belonging to another account", async () => {
  const { request } = setup({
    membershipAccountId: "account-2",
  });

  const result = await request();

  assert.equal(result.status, 403);
});

test("rejects membership belonging to another business", async () => {
  const { request } = setup({
    membershipTenantId: "tenant-2",
  });

  const result = await request();

  assert.equal(result.status, 403);
});

test("rejects missing business ID", async () => {
  const { request } = setup();
  const result = await request({ tenantId: "" });

  assert.equal(result.status, 400);
});

test("fails closed when session service is unavailable", async () => {
  const { request } = setup({ sessionThrows: true });
  const result = await request();

  assert.equal(result.status, 503);
  assert.equal(result.nextCalled, false);
});

test("fails closed when authorization database is unavailable", async () => {
  const { request } = setup({ membershipThrows: true });
  const result = await request();

  assert.equal(result.status, 503);
  assert.equal(result.nextCalled, false);
});
