"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRetailEmailLoginRequestComposition
} = require("../src/modules/auth/retailEmailLoginRequest.composition");

const KEY_SECRET =
  "offline-storvex-cooldown-secret-over-32-bytes";

const PEPPER =
  "offline-storvex-challenge-pepper-over-32-bytes";

function setup(options = {}) {
  const calls = {
    protected: 0,
    failed: 0,
    cooldown: 0,
    lookup: 0,
    eligible: 0,
    issued: 0,
    invalidated: 0,
    emailed: 0,
    sessions: 0
  };

  const keys = new Set();

  const loginProtection = {
    async begin() {
      calls.protected++;
      if (options.blockProtection) {
        throw new Error("Private rate limit");
      }
      return { accountReserved: true };
    },
    async failed() {
      calls.failed++;
    },
    async succeeded() {
      calls.sessions++;
    },
    async cancelled() {}
  };

  const redis = {
    isReady: options.redisReady !== false,

    async set(key, value, config) {
      calls.cooldown++;

      assert.equal(value, "1");
      assert.equal(config.NX, true);
      assert.equal(config.EX, 60);

      if (keys.has(key)) return null;
      keys.add(key);
      return "OK";
    }
  };

  const request =
    createRetailEmailLoginRequestComposition({
      prisma: {},
      pepper: PEPPER,
      loginProtection,
      getRedisClient() {
        return redis;
      },
      redisConfigured() {
        return options.redisConfigured !== false;
      },
      cooldownKeySecret: KEY_SECRET,

      async findRetailUser({ email }) {
        calls.lookup++;
        if (options.unknown) return null;
        return {
          id: "merchant-user-1",
          email,
          tenantId: "merchant-tenant-1",
          isActive: !options.suspended
        };
      },

      async isRetailUserEligible({ user }) {
        calls.eligible++;
        return !options.suspended &&
          user?.isActive === true;
      },

      resendClient: {
        emails: {
          async send(message) {
            calls.emailed++;

            assert.equal(
              message.to,
              "merchant@example.test"
            );

            assert.equal(
              message.subject,
              "Your Storvex retail sign-in code"
            );

            if (options.deliveryFails) {
              return {
                data: null,
                error: { message: "private failure" }
              };
            }

            return {
              data: { id: "offline-mail-id" },
              error: null
            };
          }
        }
      },

      emailFrom: "Storvex <login@example.test>",

      makeChallengeAdapter() {
        return {
          async issueChallenge() {
            calls.issued++;
            return {
              challengeId:
                "348e9c21-bd4e-48fa-b6d7-96dfa7f61a84",
              code: "123456",
              expiresAt:
                new Date(Date.now() + 600000)
            };
          },

          async invalidateChallenge() {
            calls.invalidated++;
            return true;
          }
        };
      }
    });

  async function execute() {
    const res = {
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

    await request({
      ip: "127.0.0.1",
      body: {
        email: "merchant@example.test"
      }
    }, res);

    return res;
  }

  return { execute, calls };
}

test("eligible retailer can request an OTP", async () => {
  const app = setup();
  const response = await app.execute();

  assert.equal(response.statusCode, 202);
  assert.equal(app.calls.protected, 1);
  assert.equal(app.calls.failed, 1);
  assert.equal(app.calls.cooldown, 1);
  assert.equal(app.calls.lookup, 1);
  assert.equal(app.calls.issued, 1);
  assert.equal(app.calls.emailed, 1);
  assert.equal(app.calls.sessions, 0);
  assert.equal(
    JSON.stringify(response.body).includes("123456"),
    false
  );
});

test("unknown account does not receive OTP", async () => {
  const app = setup({ unknown: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 202);
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.emailed, 0);
});

test("suspended account does not receive OTP", async () => {
  const app = setup({ suspended: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 202);
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.emailed, 0);
});

test("Redis unavailability denies issuance", async () => {
  const app = setup({ redisReady: false });
  const response = await app.execute();

  assert.equal(response.statusCode, 202);
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.emailed, 0);
});

test("unconfigured Redis denies issuance", async () => {
  const app = setup({ redisConfigured: false });
  const response = await app.execute();

  assert.equal(response.statusCode, 202);
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.emailed, 0);
});

test("login-protection rejection denies issuance", async () => {
  const app = setup({ blockProtection: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 202);
  assert.equal(app.calls.cooldown, 0);
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.emailed, 0);
});

test("email rejection invalidates challenge", async () => {
  const app = setup({ deliveryFails: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 202);
  assert.equal(app.calls.issued, 1);
  assert.equal(app.calls.emailed, 1);
  assert.equal(app.calls.invalidated, 1);
});

test("parallel requests cannot both send OTP", async () => {
  const app = setup();

  const responses = await Promise.all(
    Array.from({ length: 8 }, () => app.execute())
  );

  assert.equal(
    responses.every(r => r.statusCode === 202),
    true
  );

  assert.equal(app.calls.issued, 1);
  assert.equal(app.calls.emailed, 1);
});

test("incomplete dependencies reject construction", () => {
  assert.throws(
    () => createRetailEmailLoginRequestComposition({}),
    TypeError
  );
});


test("Prisma-backed eligibility permits active retail owner", async () => {
  const calls = { users: 0, tenants: 0, emails: 0 };
  const keys = new Set();

  const prisma = {
    user: {
      async findUnique(query) {
        calls.users++;
        assert.equal(
          query.where.email,
          "merchant@example.test"
        );
        return {
          id: "owner-1",
          email: "merchant@example.test",
          tenantId: "tenant-1",
          role: "OWNER",
          isActive: true
        };
      }
    },
    tenant: {
      async findUnique(query) {
        calls.tenants++;
        assert.equal(query.where.id, "tenant-1");
        return { id: "tenant-1", status: "ACTIVE" };
      }
    }
  };

  const loginProtection = {
    async begin() { return { accountReserved: true }; },
    async failed() {},
    async succeeded() {
      throw new Error("Issuance must not mark login success");
    },
    async cancelled() {}
  };

  const handler = createRetailEmailLoginRequestComposition({
    prisma,
    pepper: PEPPER,
    loginProtection,
    getRedisClient() {
      return {
        isReady: true,
        async set(key, value, options) {
          assert.equal(options.NX, true);
          assert.equal(options.EX, 60);
          if (keys.has(key)) return null;
          keys.add(key);
          return "OK";
        }
      };
    },
    redisConfigured() { return true; },
    cooldownKeySecret: KEY_SECRET,
    resendClient: {
      emails: {
        async send() {
          calls.emails++;
          return {
            data: { id: "mock-mail-id" },
            error: null
          };
        }
      }
    },
    emailFrom: "Storvex <login@example.test>",
    makeChallengeAdapter() {
      return {
        async issueChallenge() {
          return {
            challengeId:
              "348e9c21-bd4e-48fa-b6d7-96dfa7f61a84",
            code: "123456",
            expiresAt: new Date(Date.now() + 600000)
          };
        },
        async invalidateChallenge() { return true; }
      };
    }
  });

  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };

  await handler({
    ip: "127.0.0.1",
    body: { email: "merchant@example.test" }
  }, res);

  assert.equal(res.statusCode, 202);
  assert.equal(calls.users, 1);
  assert.equal(calls.tenants, 1);
  assert.equal(calls.emails, 1);
  assert.equal(
    JSON.stringify(res.body).includes("123456"),
    false
  );
});

test("Prisma-backed eligibility denies suspended tenant", async () => {
  const app = setup({
    suspended: true
  });

  const response = await app.execute();
  assert.equal(response.statusCode, 202);
  assert.equal(app.calls.issued, 0);
  assert.equal(app.calls.emailed, 0);
});

test("a partial eligibility override is rejected", () => {
  assert.throws(
    () => createRetailEmailLoginRequestComposition({
      prisma: {},
      findRetailUser: async () => null
    }),
    TypeError
  );
});
