"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRetailEmailLoginCooldown,
  DEFAULT_COOLDOWN_SECONDS
} = require("../src/modules/auth/retailEmailLoginCooldown.redis");

const keySecret =
  "offline-retail-cooldown-test-secret-over-32-bytes";

function fakeRedis() {
  const keys = new Map();
  const calls = [];

  let now = 0;

  return {
    keys,
    calls,
    advance(seconds) {
      now += seconds;
    },

    async set(key, value, options) {
      calls.push({ key, value, options });

      assert.equal(options.NX, true);
      assert.equal(value, "1");
      assert.equal(
        Number.isSafeInteger(options.EX),
        true
      );

      const seconds = options.EX;

      const previous = keys.get(key);

      if (previous && previous.expiresAt > now) {
        return null;
      }

      keys.set(key, {
        expiresAt: now + seconds
      });

      return "OK";
    }
  };
}

function makeCooldown(redis, cooldownSeconds = 60) {
  return createRetailEmailLoginCooldown({
    redis,
    keySecret,
    cooldownSeconds
  });
}

test("first OTP request reserves a cooldown", async () => {
  const redis = fakeRedis();
  const cooldown = makeCooldown(redis);

  const allowed = await cooldown.checkResendCooldown({
    email: "Merchant@Example.Test"
  });

  assert.equal(allowed, true);
  assert.equal(redis.calls.length, 1);
  assert.equal(redis.calls[0].options.EX, 60);
});

test("repeated requests are blocked", async () => {
  const redis = fakeRedis();
  const cooldown = makeCooldown(redis);

  const first = await cooldown.checkResendCooldown({
    email: "merchant@example.test"
  });

  const second = await cooldown.checkResendCooldown({
    email: "MERCHANT@EXAMPLE.TEST"
  });

  assert.equal(first, true);
  assert.equal(second, false);
});

test("a new request is allowed after expiry", async () => {
  const redis = fakeRedis();
  const cooldown = makeCooldown(redis, 45);

  assert.equal(
    await cooldown.checkResendCooldown({
      email: "merchant@example.test"
    }),
    true
  );

  redis.advance(44);

  assert.equal(
    await cooldown.checkResendCooldown({
      email: "merchant@example.test"
    }),
    false
  );

  redis.advance(1);

  assert.equal(
    await cooldown.checkResendCooldown({
      email: "merchant@example.test"
    }),
    true
  );
});

test("Redis keys never contain plaintext emails", async () => {
  const redis = fakeRedis();
  const cooldown = makeCooldown(redis);

  await cooldown.checkResendCooldown({
    email: "merchant@example.test"
  });

  const key = redis.calls[0].key;

  assert.equal(key.includes("merchant"), false);
  assert.equal(key.includes("@"), false);
  assert.match(key, /:[a-f0-9]{64}$/);
});

test("different accounts have different keys", async () => {
  const redis = fakeRedis();
  const cooldown = makeCooldown(redis);

  const first = await cooldown.checkResendCooldown({
    email: "first@example.test"
  });

  const second = await cooldown.checkResendCooldown({
    email: "second@example.test"
  });

  assert.equal(first, true);
  assert.equal(second, true);
  assert.equal(redis.keys.size, 2);
});

test("concurrent requests allow one winner", async () => {
  const redis = fakeRedis();
  const cooldown = makeCooldown(redis);

  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      cooldown.checkResendCooldown({
        email: "merchant@example.test"
      })
    )
  );

  assert.equal(results.filter(Boolean).length, 1);
});

test("Redis exceptions deny issuance", async () => {
  const cooldown = makeCooldown({
    async set() {
      throw new Error("Private Redis error");
    }
  });

  const result = await cooldown.checkResendCooldown({
    email: "merchant@example.test"
  });

  assert.equal(result, false);
});

test("unexpected Redis results deny issuance", async () => {
  const cooldown = makeCooldown({
    async set() {
      return true;
    }
  });

  assert.equal(
    await cooldown.checkResendCooldown({
      email: "merchant@example.test"
    }),
    false
  );
});

test("invalid email does not call Redis", async () => {
  const redis = fakeRedis();
  const cooldown = makeCooldown(redis);

  assert.equal(
    await cooldown.checkResendCooldown({
      email: "invalid"
    }),
    false
  );

  assert.equal(redis.calls.length, 0);
});

test("missing Redis client fails construction", () => {
  assert.throws(
    () => createRetailEmailLoginCooldown({
      redis: {},
      keySecret
    }),
    TypeError
  );
});

test("weak key secret fails construction", () => {
  const redis = fakeRedis();

  assert.throws(
    () => createRetailEmailLoginCooldown({
      redis,
      keySecret: "short"
    }),
    TypeError
  );
});

test("invalid duration fails construction", () => {
  const redis = fakeRedis();

  assert.throws(
    () => createRetailEmailLoginCooldown({
      redis,
      keySecret,
      cooldownSeconds: 0
    }),
    RangeError
  );
});

test("default duration is sixty seconds", () => {
  assert.equal(DEFAULT_COOLDOWN_SECONDS, 60);
});
