"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRetailEmailLoginVerifyHandler,
  FAILURE
} = require("../src/modules/auth/retailEmailLoginVerify.handler");

const challengeId = "550e8400-e29b-41d4-a716-446655440000";

function setup(overrides = {}) {
  const calls = {
    consumed: 0,
    lookedUp: 0,
    authorized: 0,
    sessions: 0,
    revoked: 0,
    written: 0
  };

  const user = {
    id: "retail-user-1",
    email: "merchant@example.test",
    tenantId: "tenant-1",
    isActive: true
  };

  const deps = {
    async consumeChallenge() {
      calls.consumed++;
      return {
        challengeId,
        userId: user.id,
        email: user.email
      };
    },
    async findRetailUserById() {
      calls.lookedUp++;
      return { ...user };
    },
    async authorizeRetailLogin() {
      calls.authorized++;
      return true;
    },
    async createRetailSession() {
      calls.sessions++;
      return { id: "mock-session-1" };
    },
    async writeAuthenticatedResponse({ res }) {
      calls.written++;
      return res.status(200).json({ authenticated: true });
    },
    async revokeRetailSession() {
      calls.revoked++;
    },
    ...overrides
  };

  const handler = createRetailEmailLoginVerifyHandler(deps);

  async function verify(body = { challengeId, code: "123456" }) {
    const res = {
      statusCode: null,
      body: null,
      status(value) {
        this.statusCode = value;
        return this;
      },
      json(value) {
        this.body = value;
        return this;
      }
    };

    await handler({ body }, res);
    return res;
  }

  return { verify, calls };
}

test("eligible verified challenge creates one session", async () => {
  const { verify, calls } = setup();
  const res = await verify();

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { authenticated: true });
  assert.equal(calls.sessions, 1);
  assert.equal(calls.revoked, 0);
});

test("invalid request creates no session", async () => {
  const { verify, calls } = setup();
  const res = await verify({ challengeId, code: "123" });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, FAILURE);
  assert.equal(calls.consumed, 0);
  assert.equal(calls.sessions, 0);
});

test("invalid or replayed challenge creates no session", async () => {
  const { verify, calls } = setup({
    async consumeChallenge() { return null; }
  });

  const res = await verify();

  assert.equal(res.statusCode, 401);
  assert.equal(calls.sessions, 0);
});

test("inactive retail user cannot sign in", async () => {
  const { verify, calls } = setup({
    async findRetailUserById() {
      return {
        id: "retail-user-1",
        email: "merchant@example.test",
        tenantId: "tenant-1",
        isActive: false
      };
    }
  });

  const res = await verify();

  assert.equal(res.statusCode, 401);
  assert.equal(calls.sessions, 0);
});

test("identity mismatch cannot sign in", async () => {
  const { verify, calls } = setup({
    async findRetailUserById() {
      return {
        id: "different-user",
        email: "merchant@example.test",
        tenantId: "tenant-1",
        isActive: true
      };
    }
  });

  const res = await verify();

  assert.equal(res.statusCode, 401);
  assert.equal(calls.sessions, 0);
});

test("missing tenant cannot create a retail session", async () => {
  const { verify, calls } = setup({
    async findRetailUserById() {
      return {
        id: "retail-user-1",
        email: "merchant@example.test",
        tenantId: "",
        isActive: true
      };
    }
  });

  const res = await verify();

  assert.equal(res.statusCode, 401);
  assert.equal(calls.sessions, 0);
});

test("tenant authorization denial prevents session", async () => {
  const { verify, calls } = setup({
    async authorizeRetailLogin() { return false; }
  });

  const res = await verify();

  assert.equal(res.statusCode, 401);
  assert.equal(calls.sessions, 0);
});

test("session creation failure remains generic", async () => {
  const { verify, calls } = setup({
    async createRetailSession() {
      throw new Error("Private database error");
    }
  });

  const res = await verify();

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, FAILURE);
  assert.equal(calls.sessions, 0);
  assert.equal(JSON.stringify(res.body).includes("Private"), false);
});

test("failed response writing revokes new session", async () => {
  const { verify, calls } = setup({
    async writeAuthenticatedResponse() {
      throw new Error("Private response failure");
    }
  });

  const res = await verify();

  assert.equal(res.statusCode, 401);
  assert.equal(calls.sessions, 1);
  assert.equal(calls.revoked, 1);
});

test("concurrent verification has one session winner", async () => {
  let consumed = false;

  const { verify, calls } = setup({
    async consumeChallenge() {
      if (consumed) return null;
      consumed = true;
      return {
        challengeId,
        userId: "retail-user-1",
        email: "merchant@example.test"
      };
    }
  });

  const results = await Promise.all([
    verify(),
    verify()
  ]);

  assert.equal(
    results.filter(r => r.statusCode === 200).length,
    1
  );
  assert.equal(calls.sessions, 1);
});

test("missing security dependencies fail construction", () => {
  assert.throws(
    () => createRetailEmailLoginVerifyHandler({}),
    TypeError
  );
});
