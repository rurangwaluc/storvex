"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAccountSignupRequestHandler } =
  require("./accountSignupRequest.handler");

function setup({ existingUser = false, allowed = true } = {}) {
  const state = { sent: 0, created: 0, issued: 0 };
  let account = null;

  const handler = createAccountSignupRequestHandler({
    prisma: {
      user: {
        findUnique: async () => existingUser ? { id: "retail-1" } : null
      },
      storvexAccount: {
        findUnique: async () => account,
        create: async ({ data }) => {
          state.created++;
          account = data;
          return account;
        }
      }
    },
    challengeService: {
      invalidate: async () => true,
      issue: async () => {
        state.issued++;
        return { challengeId: "challenge-1", code: "123456" };
      }
    },
    sendEmailOtp: async () => {
      state.sent++;
      return { sent: true };
    },
    checkRateLimit: async () => allowed,
    checkCooldown: async () => true
  });

  async function request(body) {
    const res = {
      status(code) { this.code = code; return this; },
      json(data) { this.body = data; return this; }
    };
    await handler({ body }, res);
    return res;
  }

  return { request, state };
}

test("creates pending account and sends OTP", async () => {
  const { request, state } = setup();
  const res = await request({
    fullName: "Jane Doe",
    email: " JANE@example.com "
  });

  assert.equal(res.code, 202);
  assert.equal(res.body.challengeId, "challenge-1");
  assert.equal(state.created, 1);
  assert.equal(state.issued, 1);
  assert.equal(state.sent, 1);
  assert.equal(JSON.stringify(res.body).includes("123456"), false);
});

test("existing retailer cannot be duplicated", async () => {
  const { request, state } = setup({ existingUser: true });
  const res = await request({
    fullName: "Jane Doe",
    email: "jane@example.com"
  });

  assert.equal(res.code, 202);
  assert.equal(state.created, 0);
  assert.equal(state.sent, 0);
  assert.match(res.body.challengeId, /^[a-f0-9-]{36}$/);
});

test("invalid input rejected before database access", async () => {
  const { request, state } = setup();
  const res = await request({
    fullName: "",
    email: "invalid"
  });

  assert.equal(res.code, 400);
  assert.equal(state.created, 0);
});

test("passes request context to cooldown", async () => {
  let seenRequest = null;
  const handler = createAccountSignupRequestHandler({
    prisma: {
      user: { findUnique: async () => null },
      storvexAccount: {
        findUnique: async () => null,
        create: async ({ data }) => data
      }
    },
    challengeService: {
      issue: async () => ({
        challengeId: "challenge-1",
        code: "123456"
      }),
      invalidate: async () => true
    },
    sendEmailOtp: async () => ({ sent: true }),
    checkRateLimit: async () => true,
    checkCooldown: async ({ req }) => {
      seenRequest = req;
      return true;
    }
  });

  const req = {
    body: {
      fullName: "Jane Doe",
      email: "jane@example.com"
    },
    ip: "127.0.0.1"
  };
  const res = {
    status(value) { this.code = value; return this; },
    json(value) { this.body = value; return this; }
  };

  await handler(req, res);
  assert.equal(seenRequest, req);
  assert.equal(res.code, 202);
});

test("rate-limited request sends nothing", async () => {
  const { request, state } = setup({ allowed: false });
  const res = await request({
    fullName: "Jane Doe",
    email: "jane@example.com"
  });

  assert.equal(res.code, 429);
  assert.equal(state.created, 0);
  assert.equal(state.sent, 0);
});

test("failed email delivery invalidates its challenge", async () => {
  let invalidated = null;

  const handler = createAccountSignupRequestHandler({
    prisma: {
      user: { findUnique: async () => null },
      storvexAccount: {
        findUnique: async () => null,
        create: async ({ data }) => data
      }
    },
    challengeService: {
      issue: async () => ({
        challengeId: "issued-challenge",
        code: "123456"
      }),
      invalidate: async id => {
        invalidated = id;
        return true;
      }
    },
    sendEmailOtp: async () => ({ sent: false }),
    checkRateLimit: async () => true,
    checkCooldown: async () => true
  });

  const res = {
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }
  };

  await handler({
    body: {
      fullName: "Jane Doe",
      email: "jane@example.com"
    }
  }, res);

  assert.equal(res.code, 202);
  assert.equal(invalidated, "issued-challenge");
  assert.notEqual(res.body.challengeId, "issued-challenge");
});
