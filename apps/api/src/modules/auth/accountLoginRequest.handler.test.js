"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  createAccountLoginRequestHandler,
  PUBLIC_MESSAGE
} = require("./accountLoginRequest.handler");

function fixture({
  accountStatus = "ACTIVE",
  verified = true,
  existing = true,
  delivery = true,
  cooldown = true,
  rateLimit = true
} = {}) {
  const calls = {
    issue: 0,
    send: 0,
    invalidate: 0
  };

  const account = {
    id: "test-account",
    email: "person@example.invalid",
    status: accountStatus,
    emailVerifiedAt: verified ? new Date() : null
  };

  const handler = createAccountLoginRequestHandler({
    prisma: {
      storvexAccount: {
        async findUnique() {
          return existing ? account : null;
        }
      }
    },

    challengeService: {
      async issue() {
        calls.issue++;
        return {
          challengeId: "issued-test-challenge",
          code: "123456",
          expiresAt: new Date(Date.now() + 600000)
        };
      },
      async invalidate() {
        calls.invalidate++;
        return true;
      }
    },

    async checkRateLimit() {
      return rateLimit;
    },

    async checkCooldown() {
      return cooldown;
    },

    async sendEmailOtp() {
      calls.send++;
      return { sent: delivery };
    }
  });

  async function request(email = account.email) {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      }
    };

    await handler({ body: { email }, ip: "127.0.0.1" }, res);
    return res;
  }

  return { request, calls };
}

test("active verified account receives a login challenge", async () => {
  const f = fixture();
  const res = await f.request();

  assert.equal(res.statusCode, 202);
  assert.equal(res.body.challengeId, "issued-test-challenge");
  assert.equal(res.body.message, PUBLIC_MESSAGE);
  assert.deepEqual(
    { issue: f.calls.issue, send: f.calls.send },
    { issue: 1, send: 1 }
  );
  assert.equal(JSON.stringify(res.body).includes("123456"), false);
});

test("nonexistent account does not receive OTP", async () => {
  const f = fixture({ existing: false });
  const res = await f.request();

  assert.equal(res.statusCode, 202);
  assert.notEqual(res.body.challengeId, "issued-test-challenge");
  assert.equal(f.calls.issue, 0);
  assert.equal(f.calls.send, 0);
});

test("unverified account does not receive OTP", async () => {
  const f = fixture({ verified: false });
  const res = await f.request();

  assert.equal(res.statusCode, 202);
  assert.equal(f.calls.issue, 0);
});

test("suspended account does not receive OTP", async () => {
  const f = fixture({ accountStatus: "SUSPENDED" });
  const res = await f.request();

  assert.equal(res.statusCode, 202);
  assert.equal(f.calls.issue, 0);
});

test("cooldown prevents issuing another challenge", async () => {
  const f = fixture({ cooldown: false });
  const res = await f.request();

  assert.equal(res.statusCode, 202);
  assert.equal(f.calls.issue, 0);
});

test("delivery failure invalidates the issued challenge", async () => {
  const f = fixture({ delivery: false });
  const res = await f.request();

  assert.equal(res.statusCode, 202);
  assert.notEqual(res.body.challengeId, "issued-test-challenge");
  assert.equal(f.calls.invalidate, 1);
});

test("rate limiting responds with 429", async () => {
  const f = fixture({ rateLimit: false });
  const res = await f.request();

  assert.equal(res.statusCode, 429);
  assert.equal(f.calls.issue, 0);
});

test("invalid email does not issue an OTP", async () => {
  const f = fixture();
  const res = await f.request("not-an-email");

  assert.equal(res.statusCode, 202);
  assert.equal(f.calls.issue, 0);
  assert.equal(f.calls.send, 0);
});

test("ineligible and eligible responses have the same public keys", async () => {
  const eligible = await fixture().request();
  const ineligible = await fixture({ existing: false }).request();

  assert.deepEqual(
    Object.keys(eligible.body).sort(),
    Object.keys(ineligible.body).sort()
  );

  assert.equal(eligible.body.message, ineligible.body.message);
});
