"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRetailEmailLoginRequestIntegration
} = require("../src/modules/auth/retailEmailLoginRequest.integration");

function setup(overrides = {}) {
  const calls = {
    begin: 0,
    failed: 0,
    succeeded: 0,
    cancelled: 0,
    cooldown: 0,
    lookup: 0,
    issued: 0,
    emailed: 0,
    invalidated: 0
  };

  const protection = {
    async begin({ namespace, identifier, ip }) {
      calls.begin++;

      assert.equal(namespace, "retail-email-login-v1");
      assert.equal(identifier, "merchant@example.test");
      assert.equal(ip, "127.0.0.1");

      return { accountReserved: true };
    },
    async failed() {
      calls.failed++;
    },
    async succeeded() {
      calls.succeeded++;
    },
    async cancelled() {
      calls.cancelled++;
    }
  };

  const deps = {
    loginProtection: protection,
    async checkResendCooldown() {
      calls.cooldown++;
      return true;
    },
    async findRetailUser({ email }) {
      calls.lookup++;
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
        challengeId: "challenge-for-test",
        code: "123456",
        expiresAt: new Date(Date.now() + 600000)
      };
    },
    async sendEmailOtp() {
      calls.emailed++;
      return { sent: true };
    },
    async invalidateChallenge() {
      calls.invalidated++;
      return true;
    },
    ...overrides
  };

  const handler =
    createRetailEmailLoginRequestIntegration(deps);

  async function request() {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(value) {
        this.body = value;
        return this;
      }
    };

    await handler({
      ip: "127.0.0.1",
      body: { email: "MERCHANT@EXAMPLE.TEST" }
    }, res);

    return res;
  }

  return { calls, request, protection };
}

test("protected issuance never records login success", async () => {
  const app = setup();
  const res = await app.request();

  assert.equal(res.statusCode, 202);
  assert.equal(app.calls.begin, 1);
  assert.equal(app.calls.failed, 1);
  assert.equal(app.calls.succeeded, 0);
  assert.equal(app.calls.cancelled, 0);
  assert.equal(app.calls.cooldown, 1);
  assert.equal(app.calls.issued, 1);
  assert.equal(app.calls.emailed, 1);
  assert.equal(
    JSON.stringify(res.body).includes("123456"),
    false
  );
});

test("rate-limit rejection prevents issuance", async () => {
  const app = setup({
    loginProtection: {
      async begin() {
        throw new Error("Private rate-limit rejection");
      },
      async failed() {},
      async succeeded() {},
      async cancelled() {}
    }
  });

  const res = await app.request();

  assert.equal(res.statusCode, 202);
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.emailed, 0);
  assert.equal(
    JSON.stringify(res.body).includes("Private"),
    false
  );
});

test("cooldown denial prevents challenge creation", async () => {
  const app = setup({
    async checkResendCooldown() {
      return false;
    }
  });

  const res = await app.request();

  assert.equal(res.statusCode, 202);
  assert.equal(app.calls.failed, 1);
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.succeeded, 0);
});

test("unknown retail account remains private", async () => {
  const app = setup({
    async findRetailUser() {
      return null;
    }
  });

  const res = await app.request();

  assert.equal(res.statusCode, 202);
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.emailed, 0);
  assert.equal(app.calls.succeeded, 0);
});

test("delivery failure invalidates issued challenge", async () => {
  const app = setup({
    async sendEmailOtp() {
      return { sent: false };
    }
  });

  const res = await app.request();

  assert.equal(res.statusCode, 202);
  assert.equal(app.calls.issued, 1);
  assert.equal(app.calls.invalidated, 1);
  assert.equal(app.calls.succeeded, 0);
});

test("reservation completion failure fails closed", async () => {
  const app = setup({
    loginProtection: {
      async begin() {
        return { accountReserved: true };
      },
      async failed() {
        throw new Error("Private Redis failure");
      },
      async succeeded() {},
      async cancelled() {}
    }
  });

  const res = await app.request();

  assert.equal(res.statusCode, 202);
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.emailed, 0);
});

test("missing cooldown or security controls fail construction", () => {
  assert.throws(
    () => createRetailEmailLoginRequestIntegration({
      loginProtection: {
        begin: async () => ({}),
        failed: async () => {},
        succeeded: async () => {},
        cancelled: async () => {}
      }
    }),
    TypeError
  );
});
