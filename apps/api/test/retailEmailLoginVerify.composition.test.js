"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRetailEmailLoginVerifyComposition,
  SESSION_TTL_MS
} = require("../src/modules/auth/retailEmailLoginVerify.composition");

const CHALLENGE =
  "348e9c21-bd4e-48fa-b6d7-96dfa7f61a84";

function setup(options = {}) {
  const calls = {
    consumption: 0,
    eligibility: 0,
    sessions: 0,
    revocations: 0,
    tokens: 0
  };

  const user = {
    id: "retail-user-1",
    email: "merchant@example.test",
    role: options.platform ? "PLATFORM_ADMIN" : "OWNER",
    isActive: !options.inactive,
    tenantId: "tenant-1"
  };

  const records = [];

  const prisma = {
    user: {
      async findUnique() {
        return user;
      }
    },

    tenant: {
      async findUnique() {
        calls.eligibility++;
        return {
          id: options.wrongTenant
            ? "another-tenant"
            : "tenant-1",
          status: options.suspended ? "SUSPENDED" : "ACTIVE"
        };
      }
    },

    userSession: {
      async create({ data }) {
        calls.sessions++;
        records.push(data);

        if (options.sessionFails) {
          throw new Error("Private DB failure");
        }

        return {
          id: "session-1",
          ...data
        };
      },

      async updateMany({ where, data }) {
        calls.revocations++;
        assert.equal(where.id, "session-1");
        assert.equal(data.isRevoked, true);
        assert.ok(data.revokedAt instanceof Date);
        return { count: 1 };
      }
    }
  };

  const handler = createRetailEmailLoginVerifyComposition({
    prisma,
    pepper: "offline-challenge-pepper-over-32-bytes",

    signAuthToken({ user, tokenId }) {
      calls.tokens++;

      assert.equal(user.id, "retail-user-1");
      assert.match(
        tokenId,
        /^[0-9a-f]{8}-[0-9a-f-]{27,}$/
      );

      if (options.signFails) {
        throw new Error("Private signing failure");
      }

      return "offline-token";
    },

    getClientIp() {
      return "127.0.0.1";
    },

    getUserAgent() {
      return "Offline Test Browser";
    },

    now() {
      return new Date("2026-10-19T12:00:00.000Z");
    },

    makeChallengeAdapter() {
      return {
        async consumeChallenge() {
          calls.consumption++;

          if (options.invalidCode) return null;

          return {
            challengeId: CHALLENGE,
            userId: "retail-user-1",
            email: "merchant@example.test"
          };
        }
      };
    }
  });

  async function execute() {
    const res = {
      statusCode: 200,
      body: null,

      status(code) {
        this.statusCode = code;
        return this;
      },

      json(body) {
        if (options.responseFails && body?.token) {
          throw new Error("Response failure");
        }
        this.body = body;
        return this;
      }
    };

    await handler({
      body: {
        challengeId: CHALLENGE,
        code: "123456"
      },
      ip: "127.0.0.1"
    }, res);

    return res;
  }

  return { execute, calls, records };
}

test("valid OTP creates compatible retail session", async () => {
  const app = setup();
  const response = await app.execute();

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.token, "offline-token");
  assert.equal(response.body.user.role, "OWNER");
  assert.equal(app.calls.consumption, 1);
  assert.equal(app.calls.sessions, 1);
  assert.equal(app.calls.tokens, 1);
  assert.equal(app.calls.revocations, 0);

  assert.equal(app.records[0].tenantId, "tenant-1");
  assert.equal(app.records[0].isRevoked, false);
  assert.equal(
    app.records[0].expiresAt.getTime() -
      Date.parse("2026-10-19T12:00:00.000Z"),
    SESSION_TTL_MS
  );
});

test("invalid OTP cannot create a session", async () => {
  const app = setup({ invalidCode: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 401);
  assert.equal(app.calls.sessions, 0);
  assert.equal(app.calls.tokens, 0);
});

test("inactive retail user cannot sign in", async () => {
  const app = setup({ inactive: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 401);
  assert.equal(app.calls.sessions, 0);
});

test("platform administrator cannot use retail OTP", async () => {
  const app = setup({ platform: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 401);
  assert.equal(app.calls.sessions, 0);
});

test("suspended tenant cannot create a session", async () => {
  const app = setup({ suspended: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 401);
  assert.equal(app.calls.sessions, 0);
});

test("mismatched tenant cannot create a session", async () => {
  const app = setup({ wrongTenant: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 401);
  assert.equal(app.calls.sessions, 0);
});

test("session persistence failure does not issue token", async () => {
  const app = setup({ sessionFails: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 401);
  assert.equal(app.calls.tokens, 0);
});

test("JWT signing failure revokes created session", async () => {
  const app = setup({ signFails: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 401);
  assert.equal(app.calls.sessions, 1);
  assert.equal(app.calls.revocations, 1);
});

test("response failure revokes created session", async () => {
  const app = setup({ responseFails: true });
  const response = await app.execute();

  assert.equal(response.statusCode, 401);
  assert.equal(app.calls.revocations, 1);
});

test("missing session dependencies fail construction", () => {
  assert.throws(
    () => createRetailEmailLoginVerifyComposition({
      prisma: {}
    }),
    TypeError
  );
});
