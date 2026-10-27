"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { randomUUID } = require("node:crypto");

const {
  createAccountLoginVerifyHandler
} = require("./accountLoginVerify.handler");

function fixture({
  purpose = "LOGIN",
  challengeExists = true,
  verified = true,
  sessionFailure = false
} = {}) {
  const challengeId = randomUUID();
  const accountId = randomUUID();

  const calls = {
    consume: 0,
    session: 0
  };

  const handler = createAccountLoginVerifyHandler({
    prisma: {
      storvexAccountOtpChallenge: {
        async findUnique() {
          if (!challengeExists) return null;
          return { accountId, purpose };
        }
      }
    },

    challengeService: {
      async consume() {
        calls.consume++;
        return verified
          ? { verified: true, accountId }
          : { verified: false };
      }
    },

    sessionService: {
      async create({ accountId: requestedId }) {
        calls.session++;
        assert.equal(requestedId, accountId);

        if (sessionFailure) {
          throw new Error("Session storage unavailable");
        }

        return {
          token: "internal-test-session-token",
          expiresAt: new Date("2026-10-20T20:00:00Z")
        };
      }
    }
  });

  async function verify({
    id = challengeId,
    code = "123456"
  } = {}) {
    const response = {
      statusCode: 200,
      headers: {},
      set(name, value) {
        this.headers[name] = value;
        return this;
      },
      status(value) {
        this.statusCode = value;
        return this;
      },
      json(value) {
        this.body = value;
        return this;
      }
    };

    await handler({
      body: {
        challengeId: id,
        code
      }
    }, response);

    return response;
  }

  return {
    verify,
    calls,
    accountId
  };
}

test("valid LOGIN challenge creates an account session", async () => {
  const f = fixture();
  const res = await f.verify();

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.authenticated, true);
  assert.equal(res.body.nextStep, "BUSINESS_ONBOARDING");
  assert.equal(
    res.body.accountSessionToken,
    "internal-test-session-token"
  );
  assert.equal(f.calls.consume, 1);
  assert.equal(f.calls.session, 1);
  assert.equal(res.headers["Cache-Control"], "no-store");
});

test("SIGNUP challenges cannot authenticate login", async () => {
  const f = fixture({ purpose: "SIGNUP" });
  const res = await f.verify();

  assert.equal(res.statusCode, 400);
  assert.equal(f.calls.consume, 0);
  assert.equal(f.calls.session, 0);
});

test("unknown challenges cannot authenticate login", async () => {
  const f = fixture({ challengeExists: false });
  const res = await f.verify();

  assert.equal(res.statusCode, 400);
  assert.equal(f.calls.session, 0);
});

test("invalid OTP does not create a session", async () => {
  const f = fixture({ verified: false });
  const res = await f.verify();

  assert.equal(res.statusCode, 400);
  assert.equal(f.calls.consume, 1);
  assert.equal(f.calls.session, 0);
});

test("malformed OTP is rejected before database lookup", async () => {
  const f = fixture();
  const res = await f.verify({ code: "12AB56" });

  assert.equal(res.statusCode, 400);
  assert.equal(f.calls.consume, 0);
  assert.equal(f.calls.session, 0);
});

test("malformed challenge ID is rejected", async () => {
  const f = fixture();
  const res = await f.verify({ id: "invalid-id" });

  assert.equal(res.statusCode, 400);
  assert.equal(f.calls.consume, 0);
  assert.equal(f.calls.session, 0);
});

test("session failure does not report successful login", async () => {
  const f = fixture({ sessionFailure: true });
  const res = await f.verify();

  assert.equal(res.statusCode, 503);
  assert.equal(f.calls.session, 1);
  assert.equal(res.body.authenticated, undefined);
});

test("rejects missing security dependencies", () => {
  assert.throws(
    () => createAccountLoginVerifyHandler({
      prisma: {},
      challengeService: {},
      sessionService: {}
    }),
    /verification dependencies required/
  );
});
