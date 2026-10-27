"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createAccountSignupSessionService
} = require("./accountSignupSession.service");

function fixture() {
  const account = {
    id: "account-1",
    fullName: "Jane Doe",
    email: "jane@example.com",
    status: "ACTIVE",
    emailVerifiedAt: new Date()
  };

  const sessions = new Map();

  const service = createAccountSignupSessionService({
    prisma: {
      storvexAccount: {
        findUnique: async () => account
      },
      storvexAccountSession: {
        create: async ({ data }) => {
          sessions.set(data.tokenId, {
            ...data,
            isRevoked: false,
            account
          });
        },
        findUnique: async ({ where }) =>
          sessions.get(where.tokenId) || null,
        updateMany: async ({ where, data }) => {
          const session = sessions.get(where.tokenId);
          if (!session || session.isRevoked) {
            return { count: 0 };
          }
          Object.assign(session, data);
          return { count: 1 };
        }
      }
    }
  });

  return { account, sessions, service };
}

test("creates a secure session for verified account", async () => {
  const f = fixture();
  const session = await f.service.create({
    accountId: f.account.id
  });

  assert.match(session.token, /^[a-f0-9]{64}$/);
  assert.equal(f.sessions.has(session.token), false);
  assert.equal(f.sessions.size, 1);
});

test("authenticates an active session", async () => {
  const f = fixture();
  const { token } = await f.service.create({
    accountId: f.account.id
  });

  const actor = await f.service.authenticate(token);

  assert.equal(actor.accountId, f.account.id);
  assert.equal(actor.emailVerified, true);
});

test("rejects invalid session tokens", async () => {
  const f = fixture();
  assert.equal(
    await f.service.authenticate("invalid"),
    null
  );
});

test("rejects inactive accounts", async () => {
  const f = fixture();
  const { token } = await f.service.create({
    accountId: f.account.id
  });

  f.account.status = "SUSPENDED";

  assert.equal(
    await f.service.authenticate(token),
    null
  );
});

test("revoked session cannot authenticate", async () => {
  const f = fixture();
  const { token } = await f.service.create({
    accountId: f.account.id
  });

  assert.equal(await f.service.revoke(token), true);
  assert.equal(await f.service.authenticate(token), null);
  assert.equal(await f.service.revoke(token), false);
});

test("unverified account cannot create session", async () => {
  const f = fixture();
  f.account.emailVerifiedAt = null;

  await assert.rejects(
    () => f.service.create({ accountId: f.account.id })
  );
});

test("expired session cannot authenticate", async () => {
  const f = fixture();
  const { token } = await f.service.create({
    accountId: f.account.id
  });

  for (const session of f.sessions.values()) {
    session.expiresAt = new Date("2020-01-01");
  }

  assert.equal(await f.service.authenticate(token), null);
});
