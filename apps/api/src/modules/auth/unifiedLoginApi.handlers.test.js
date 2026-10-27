"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const {
  createUnifiedLoginApiHandlers
} = require("./unifiedLoginApi.handlers");

function setup({
  retailUser = false,
  accountUser = false,
  retailChallenge = false,
  accountPurpose = null,
  limit = true
} = {}) {
  const id = randomUUID();
  const calls = [];

  const send = name => async (_req, res) => {
    calls.push(name);
    return res.status(202).json({
      message: "If the account is eligible, a verification code will be sent.",
      challengeId: randomUUID()
    });
  };

  const verify = name => async (_req, res) => {
    calls.push(name);
    return res.status(200).json({ authenticated: true });
  };

  const handlers = createUnifiedLoginApiHandlers({
    prisma: {
      user: {
        findUnique: async () =>
          retailUser ? { id: "retail-1" } : null
      },
      storvexAccount: {
        findUnique: async () =>
          accountUser ? { id: "account-1" } : null
      },
      retailEmailLoginChallenge: {
        findUnique: async () =>
          retailChallenge ? { id } : null
      },
      storvexAccountOtpChallenge: {
        findUnique: async () =>
          accountPurpose ? { id, purpose: accountPurpose } : null
      }
    },
    retail: {
      request: send("retail-request"),
      verify: verify("retail-verify")
    },
    account: {
      loginRequest: send("account-request"),
      loginVerify: verify("account-verify")
    },
    checkRequestLimit: async () => limit
  });

  function response() {
    return {
      status(code) { this.code = code; return this; },
      set() { return this; },
      json(body) { this.body = body; return this; }
    };
  }

  return { id, calls, handlers, response };
}

test("routes retail email to existing retail request", async () => {
  const f = setup({ retailUser: true });
  const res = f.response();
  await f.handlers.request({
    body: { email: "person@example.invalid" }
  }, res);
  assert.equal(res.code, 202);
  assert.deepEqual(f.calls, ["retail-request"]);
});

test("routes registered accounts to account request", async () => {
  const f = setup({ accountUser: true });
  const res = f.response();
  await f.handlers.request({
    body: { email: "person@example.invalid" }
  }, res);
  assert.equal(res.code, 202);
  assert.deepEqual(f.calls, ["account-request"]);
});

test("unknown email returns generic response", async () => {
  const f = setup();
  const res = f.response();
  await f.handlers.request({
    body: { email: "unknown@example.invalid" }
  }, res);
  assert.equal(res.code, 202);
  assert.match(res.body.challengeId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(f.calls, []);
});

test("ambiguous email does not issue OTP", async () => {
  const f = setup({ retailUser: true, accountUser: true });
  const res = f.response();
  await f.handlers.request({
    body: { email: "person@example.invalid" }
  }, res);
  assert.equal(res.code, 202);
  assert.deepEqual(f.calls, []);
});

test("rate limit stops dispatch", async () => {
  const f = setup({ retailUser: true, limit: false });
  const res = f.response();
  await f.handlers.request({
    body: { email: "person@example.invalid" }
  }, res);
  assert.equal(res.code, 429);
  assert.deepEqual(f.calls, []);
});

test("retail OTP delegates to retail verifier", async () => {
  const f = setup({ retailChallenge: true });
  const res = f.response();
  await f.handlers.verify({
    body: { challengeId: f.id, code: "123456" }
  }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(f.calls, ["retail-verify"]);
});

test("LOGIN OTP delegates to account verifier", async () => {
  const f = setup({ accountPurpose: "LOGIN" });
  const res = f.response();
  await f.handlers.verify({
    body: { challengeId: f.id, code: "123456" }
  }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(f.calls, ["account-verify"]);
});

test("SIGNUP OTP cannot log in", async () => {
  const f = setup({ accountPurpose: "SIGNUP" });
  const res = f.response();
  await f.handlers.verify({
    body: { challengeId: f.id, code: "123456" }
  }, res);
  assert.equal(res.code, 400);
  assert.deepEqual(f.calls, []);
});

test("ambiguous challenge fails closed", async () => {
  const f = setup({
    retailChallenge: true,
    accountPurpose: "LOGIN"
  });
  const res = f.response();
  await f.handlers.verify({
    body: { challengeId: f.id, code: "123456" }
  }, res);
  assert.equal(res.code, 400);
  assert.deepEqual(f.calls, []);
});

test("invalid challenge does not reach verifier", async () => {
  const f = setup({ retailChallenge: true });
  const res = f.response();
  await f.handlers.verify({
    body: { challengeId: "invalid", code: "123456" }
  }, res);
  assert.equal(res.code, 400);
  assert.deepEqual(f.calls, []);
});


test("cross-origin verification is rejected before dispatch", async () => {
  const f = setup({ retailChallenge: true });
  const res = f.response();

  await f.handlers.verify({
    body: { challengeId: f.id, code: "123456" },
    protocol: "http",
    get: name => {
      if (name === "origin") return "https://untrusted.example";
      if (name === "host") return "localhost:5000";
      return undefined;
    }
  }, res);

  assert.equal(res.code, 403);
  assert.deepEqual(f.calls, []);
});
