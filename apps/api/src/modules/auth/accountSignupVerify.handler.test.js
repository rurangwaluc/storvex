"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createAccountSignupVerifyHandler
} = require("./accountSignupVerify.handler");

const challengeId = "df62aa12-3ea3-4ac0-a609-c58e21d00715";

function fixture({ exists = true, verified = true } = {}) {
  const calls = { consume: 0, session: 0 };

  const handler = createAccountSignupVerifyHandler({
    prisma: {
      storvexAccountOtpChallenge: {
        findUnique: async () =>
          exists ? { accountId: "account-1" } : null
      }
    },
    challengeService: {
      consume: async () => {
        calls.consume++;
        return { verified, accountId: "account-1" };
      }
    },
    sessionService: {
      create: async () => {
        calls.session++;
        return {
          token: "a".repeat(64),
          expiresAt: new Date("2026-10-21T10:00:00Z")
        };
      }
    }
  });

  async function request(body) {
    const res = {
      headers: {},
      set(name, value) {
        this.headers[name] = value;
        return this;
      },
      status(code) {
        this.code = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      }
    };

    await handler({ body }, res);
    return res;
  }

  return { request, calls };
}

test("valid OTP creates an account session", async () => {
  const f = fixture();
  const res = await f.request({
    challengeId,
    code: "123456"
  });

  assert.equal(res.code, 200);
  assert.equal(res.body.verified, true);
  assert.equal(res.body.nextStep, "BUSINESS_ONBOARDING");
  assert.match(res.body.accountSessionToken, /^[a-f0-9]{64}$/);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(f.calls.session, 1);
});

test("invalid code cannot create a session", async () => {
  const f = fixture({ verified: false });
  const res = await f.request({ challengeId, code: "123456" });

  assert.equal(res.code, 400);
  assert.equal(f.calls.session, 0);
});

test("unknown challenge cannot create a session", async () => {
  const f = fixture({ exists: false });
  const res = await f.request({ challengeId, code: "123456" });

  assert.equal(res.code, 400);
  assert.equal(f.calls.consume, 0);
  assert.equal(f.calls.session, 0);
});

test("malformed OTP is rejected", async () => {
  const f = fixture();
  const res = await f.request({ challengeId, code: "wrong" });

  assert.equal(res.code, 400);
  assert.equal(f.calls.consume, 0);
});

test("unknown and incorrect codes share an error", async () => {
  const unknown = await fixture({ exists: false })
    .request({ challengeId, code: "123456" });
  const incorrect = await fixture({ verified: false })
    .request({ challengeId, code: "123456" });

  assert.deepEqual(unknown.body, incorrect.body);
});
