"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createAccountBusinessCompletionGuard,
} = require("./accountBusinessCompletion.guard");

const TOKEN = "a".repeat(64);

async function exercise({
  cookie = `storvex_account_session=${TOKEN}`,
  origin = "http://localhost:3002",
  account = {
    accountId: "account-1",
    email: "owner@example.com",
    emailVerified: true,
  },
  authenticationError = false,
} = {}) {
  let calls = 0;
  let continued = false;
  const req = {
    headers: { cookie },
    protocol: "http",
    get(name) {
      if (name === "origin") return origin;
      if (name === "host") return "localhost:3002";
      return undefined;
    },
  };
  const res = {
    statusCode: 200,
    body: null,
    set() { return this; },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const guard = createAccountBusinessCompletionGuard({
    sessionService: {
      async authenticate() {
        calls++;
        if (authenticationError) throw new Error("unavailable");
        return account;
      },
    },
  });
  await guard(req, res, () => { continued = true; });
  return { req, res, continued, calls };
}

test("accepts verified authenticated account", async () => {
  const result = await exercise();
  assert.equal(result.continued, true);
  assert.equal(
    result.req.storvexOnboardingAccount.accountId,
    "account-1"
  );
});

test("rejects missing session", async () => {
  const result = await exercise({ cookie: "" });
  assert.equal(result.res.statusCode, 401);
  assert.equal(result.continued, false);
});

test("rejects duplicate cookies", async () => {
  const result = await exercise({
    cookie: `storvex_account_session=${TOKEN}; storvex_account_session=${TOKEN}`,
  });
  assert.equal(result.res.statusCode, 401);
});

test("rejects malformed tokens", async () => {
  const result = await exercise({
    cookie: "storvex_account_session=invalid",
  });
  assert.equal(result.res.statusCode, 401);
});

test("rejects cross-origin completion", async () => {
  const result = await exercise({
    origin: "https://untrusted.example",
  });
  assert.equal(result.res.statusCode, 403);
  assert.equal(result.calls, 0);
});

test("rejects unverified account", async () => {
  const result = await exercise({
    account: {
      accountId: "account-1",
      email: "owner@example.com",
      emailVerified: false,
    },
  });
  assert.equal(result.res.statusCode, 401);
});

test("rejects revoked or expired session", async () => {
  const result = await exercise({ account: null });
  assert.equal(result.res.statusCode, 401);
});

test("fails closed if session database is unavailable", async () => {
  const result = await exercise({
    authenticationError: true,
  });
  assert.equal(result.res.statusCode, 503);
  assert.equal(result.continued, false);
});
