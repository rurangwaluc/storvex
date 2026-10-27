"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAccountSignupApiHandlers } =
  require("./accountSignupApi.handlers");

function fixture() {
  let revoked = false;
  const token = "a".repeat(64);

  const api = createAccountSignupApiHandlers({
    prisma: {},
    getClientIp: () => "127.0.0.1",
    pepper: () => "a".repeat(64),
    requestHandler: async () => {},
    checkVerifyRateLimit: async () => true,
    challengeService: {
      consume: async () => ({
        verified: true,
        accountId: "account-1"
      })
    },
    sessionService: {
      create: async () => ({
        token,
        expiresAt: new Date("2026-10-21T10:00:00Z")
      }),
      authenticate: async value =>
        value === token && !revoked
          ? { accountId: "account-1", emailVerified: true }
          : null,
      revoke: async () => { revoked = true; return true; }
    }
  });

  function response() {
    return {
      headers: {},
      status(code) { this.code = code; return this; },
      json(body) { this.body = body; return this; },
      set(name, value) {
        this.headers[name] = value;
        return this;
      },
      cookie(name, value, options) {
        this.savedCookie = { name, value, options };
        return this;
      },
      clearCookie(name, options) {
        this.clearedCookie = { name, options };
        return this;
      }
    };
  }

  const request = {
    body: {
      challengeId: "df62aa12-3ea3-4ac0-a609-c58e21d00715",
      code: "123456"
    },
    headers: { cookie: `storvex_account_session=${token}` },
    secure: false,
    protocol: "http",
    get: name => name === "host" ? "localhost:5000" : undefined
  };

  return { api, request, response };
}

test("account session is read from scoped cookie", async () => {
  const f = fixture();
  const res = f.response();
  await f.api.me(f.request, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.account.accountId, "account-1");
});

test("logout revokes account session", async () => {
  const f = fixture();
  const res = f.response();
  await f.api.logout(f.request, res);
  assert.equal(res.code, 200);
  assert.equal(res.clearedCookie.name, "storvex_account_session");

  const after = f.response();
  await f.api.me(f.request, after);
  assert.equal(after.code, 401);
});

test("cross-origin logout is rejected", async () => {
  const f = fixture();
  const res = f.response();
  await f.api.logout({
    ...f.request,
    get: name => name === "origin"
      ? "https://untrusted.example"
      : "localhost:5000"
  }, res);
  assert.equal(res.code, 403);
});

test("verification requests are denied when throttled", async () => {
  const token = "a".repeat(64);
  const api = createAccountSignupApiHandlers({
    prisma: {},
    requestHandler: async () => {},
    checkVerifyRateLimit: async () => false,
    challengeService: {
      consume: async () => {
        throw new Error("Must not consume challenge");
      }
    },
    sessionService: {
      create: async () => {
        throw new Error("Must not create session");
      },
      authenticate: async () => null,
      revoke: async () => false
    }
  });

  const req = {
    body: {
      challengeId: "df62aa12-3ea3-4ac0-a609-c58e21d00715",
      code: "123456"
    },
    headers: {},
    protocol: "http",
    get: () => undefined
  };
  const res = {
    status(code) { this.code = code; return this; },
    set() { return this; },
    json(body) { this.body = body; return this; }
  };

  await api.verify(req, res);
  assert.equal(res.code, 429);
  assert.equal(res.body.accountSessionToken, undefined);
});
