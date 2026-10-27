"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRetailEmailLoginRequestHandler,
  PUBLIC_MESSAGE
} = require("../src/modules/auth/retailEmailLoginRequest.handler");

function setup(overrides = {}) {
  const calls = {
    issued: 0,
    sent: 0,
    invalidated: 0,
    lookedUp: 0,
    throttled: 0
  };

  const deps = {
    async checkRequestLimit() {
      calls.throttled++;
      return true;
    },
    async checkResendCooldown() {
      return true;
    },
    async findRetailUser({ email }) {
      calls.lookedUp++;
      return {
        id: "retail-user-1",
        email,
        isActive: true
      };
    },
    async isRetailUserEligible() {
      return true;
    },
    async issueChallenge() {
      calls.issued++;
      return {
        challengeId: "real-challenge-id",
        code: "123456",
        expiresAt: new Date(Date.now() + 600000)
      };
    },
    async sendEmailOtp() {
      calls.sent++;
      return { sent: true };
    },
    async invalidateChallenge() {
      calls.invalidated++;
    },
    ...overrides
  };

  const handler =
    createRetailEmailLoginRequestHandler(deps);

  async function request(email = "USER@EXAMPLE.TEST") {
    const response = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      }
    };

    await handler(
      { body: { email }, ip: "127.0.0.1" },
      response
    );

    return response;
  }

  return { request, calls };
}

function assertPublicResponse(res) {
  assert.equal(res.statusCode, 202);
  assert.equal(res.body.message, PUBLIC_MESSAGE);
  assert.deepEqual(
    Object.keys(res.body).sort(),
    ["challengeId", "message"]
  );
  assert.equal(typeof res.body.challengeId, "string");
  assert.equal(JSON.stringify(res.body).includes("123456"), false);
}

test("sends an eligible user's OTP without exposing it", async () => {
  const app = setup();
  const res = await app.request();

  assertPublicResponse(res);
  assert.equal(res.body.challengeId, "real-challenge-id");
  assert.equal(app.calls.issued, 1);
  assert.equal(app.calls.sent, 1);
  assert.equal(app.calls.invalidated, 0);
});

test("unknown account receives a synthetic challenge", async () => {
  const app = setup({
    async findRetailUser() { return null; }
  });

  const res = await app.request();

  assertPublicResponse(res);
  assert.notEqual(res.body.challengeId, "real-challenge-id");
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.sent, 0);
});

test("inactive account cannot request a code", async () => {
  const app = setup({
    async findRetailUser({ email }) {
      return { id: "retail-user-1", email, isActive: false };
    }
  });

  const res = await app.request();

  assertPublicResponse(res);
  assert.equal(app.calls.issued, 0);
});

test("ineligible account cannot request a code", async () => {
  const app = setup({
    async isRetailUserEligible() { return false; }
  });

  const res = await app.request();

  assertPublicResponse(res);
  assert.equal(app.calls.issued, 0);
});

test("rate limiting blocks challenge creation", async () => {
  const app = setup({
    async checkRequestLimit() { return false; }
  });

  const res = await app.request();

  assertPublicResponse(res);
  assert.equal(app.calls.lookedUp, 0);
  assert.equal(app.calls.issued, 0);
});

test("resend cooldown blocks challenge creation", async () => {
  const app = setup({
    async checkResendCooldown() { return false; }
  });

  const res = await app.request();

  assertPublicResponse(res);
  assert.equal(app.calls.issued, 0);
});

test("provider-reported failure invalidates challenge", async () => {
  const app = setup({
    async sendEmailOtp() { return { sent: false }; }
  });

  const res = await app.request();

  assertPublicResponse(res);
  assert.notEqual(res.body.challengeId, "real-challenge-id");
  assert.equal(app.calls.invalidated, 1);
});

test("provider exception invalidates challenge", async () => {
  const app = setup({
    async sendEmailOtp() { throw new Error("Private error"); }
  });

  const res = await app.request();

  assertPublicResponse(res);
  assert.equal(app.calls.invalidated, 1);
  assert.equal(JSON.stringify(res.body).includes("Private"), false);
});

test("security dependency failures remain private", async () => {
  const app = setup({
    async checkRequestLimit() {
      throw new Error("Private throttle failure");
    }
  });

  const res = await app.request();

  assertPublicResponse(res);
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.sent, 0);
});

test("missing required controls prevents construction", () => {
  assert.throws(
    () => createRetailEmailLoginRequestHandler({}),
    TypeError
  );
});
