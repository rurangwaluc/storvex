"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRetailEmailLoginCooldownIntegration
} = require("../src/modules/auth/retailEmailLoginCooldown.integration");

const keySecret =
  "storvex-offline-redis-integration-key-secret";

function setup({
  configured = true,
  ready = true,
  failSet = false,
  unexpected = false
} = {}) {
  const calls = {
    configured: 0,
    client: 0,
    set: 0
  };

  const keys = new Set();

  const redis = {
    isReady: ready,

    async set(key, value, options) {
      calls.set++;

      assert.equal(value, "1");
      assert.equal(options.NX, true);
      assert.equal(options.EX, 60);

      if (failSet) {
        throw new Error("Private Redis failure");
      }

      if (unexpected) {
        return true;
      }

      if (keys.has(key)) return null;

      keys.add(key);
      return "OK";
    }
  };

  const integration =
    createRetailEmailLoginCooldownIntegration({
      getRedisClient() {
        calls.client++;
        return redis;
      },

      redisConfigured() {
        calls.configured++;
        return configured;
      },

      keySecret
    });

  async function check(email = "merchant@example.test") {
    return integration.checkResendCooldown({
      email,
      ip: "127.0.0.1"
    });
  }

  return { integration, check, calls, keys };
}

test("uses the shared Redis client", async () => {
  const app = setup();

  assert.equal(await app.check(), true);
  assert.equal(app.calls.client, 1);
  assert.equal(app.calls.set, 1);
});

test("second request is denied by atomic cooldown", async () => {
  const app = setup();

  assert.equal(await app.check(), true);
  assert.equal(await app.check(), false);
  assert.equal(app.calls.set, 2);
});

test("Redis not configured denies issuance", async () => {
  const app = setup({ configured: false });

  assert.equal(await app.check(), false);
  assert.equal(app.calls.client, 0);
  assert.equal(app.calls.set, 0);
});

test("unready Redis client denies issuance", async () => {
  const app = setup({ ready: false });

  assert.equal(await app.check(), false);
  assert.equal(app.calls.set, 0);
});

test("Redis error denies issuance", async () => {
  const app = setup({ failSet: true });

  assert.equal(await app.check(), false);
  assert.equal(app.calls.set, 1);
});

test("unexpected Redis result denies issuance", async () => {
  const app = setup({ unexpected: true });

  assert.equal(await app.check(), false);
});

test("invalid email does not reserve a key", async () => {
  const app = setup();

  assert.equal(await app.check("invalid"), false);
  assert.equal(app.calls.set, 0);
});

test("concurrent requests allow one cooldown winner", async () => {
  const app = setup();

  const results = await Promise.all(
    Array.from({ length: 8 }, () => app.check())
  );

  assert.equal(results.filter(Boolean).length, 1);
});

test("missing Redis lifecycle dependencies are rejected", () => {
  assert.throws(
    () => createRetailEmailLoginCooldownIntegration({
      getRedisClient() {
        return {};
      },
      keySecret
    }),
    TypeError
  );
});

test("weak secret is rejected at construction", () => {
  assert.throws(
    () => createRetailEmailLoginCooldownIntegration({
      getRedisClient() {
        return {};
      },
      redisConfigured() {
        return true;
      },
      keySecret: "weak"
    }),
    TypeError
  );
});

test("does not connect to Redis during construction", () => {
  let requested = 0;

  const integration =
    createRetailEmailLoginCooldownIntegration({
      getRedisClient() {
        requested++;
        throw new Error("Should not be called");
      },
      redisConfigured() {
        return false;
      },
      keySecret
    });

  assert.equal(requested, 0);
  assert.equal(integration.configured, true);
});
