const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getClientIp,
  normalizeClientIp,
} = require("../src/lib/security/clientIp");
const {
  ACCOUNT_LIMIT,
  IP_LIMIT,
  createLoginProtection,
  loginRateLimitKeys,
  sendLoginProtectionError,
} = require("../src/lib/security/loginProtection");
const {
  isCorsOriginAllowed,
  shouldExposeAuthTest,
} = require("../src/config/cors");

class FakeRedis {
  constructor() {
    this.isReady = true;
    this.values = new Map();
    this.ttls = new Map();
    this.deleted = [];
  }

  async eval(script, { keys, arguments: args }) {
    const key = keys[0];
    if (script.includes("count > tonumber")) {
      const count = (this.values.get(key) || 0) + 1;
      const limit = Number(args[1]);
      if (!this.ttls.has(key)) this.ttls.set(key, Number(args[0]));
      if (count > limit) return [0, this.ttls.get(key)];
      this.values.set(key, count);
      return [count, this.ttls.get(key)];
    }
    if (script.includes("INCR")) {
      const count = (this.values.get(key) || 0) + 1;
      this.values.set(key, count);
      if (!this.ttls.has(key)) this.ttls.set(key, Number(args[0]));
      return [count, this.ttls.get(key)];
    }
    if (script.includes("DECR")) {
      const count = this.values.get(key) || 0;
      if (count <= 1) {
        this.values.delete(key);
        this.ttls.delete(key);
        return 0;
      }
      this.values.set(key, count - 1);
      return count - 1;
    }
    return [0, -2];
  }

  async del(key) {
    this.deleted.push(key);
    this.values.delete(key);
    this.ttls.delete(key);
  }
}

function protectionWith(redis) {
  return createLoginProtection({
    getClient: () => redis,
    connect: async () => {},
    production: true,
  });
}

test("canonical client IP prefers Railway X-Real-IP and ignores spoofed forwarding", () => {
  assert.equal(getClientIp({
    headers: { "x-real-ip": "8.8.8.8", "x-forwarded-for": "1.2.3.4" },
    socket: { remoteAddress: "10.0.0.2" },
  }, { NODE_ENV: "production", RAILWAY_ENVIRONMENT: "production" }), "8.8.8.8");
  assert.equal(getClientIp({
    headers: { "x-forwarded-for": "1.2.3.4" },
    socket: { remoteAddress: "127.0.0.1" },
  }), "127.0.0.1");
  assert.equal(normalizeClientIp("::ffff:192.0.2.4"), "192.0.2.4");
  assert.equal(normalizeClientIp("1.2.3.4, 5.6.7.8"), null);
  assert.equal(normalizeClientIp(["1.2.3.4", "5.6.7.8"]), null);
});

test("five account failures are allowed and the next attempt is blocked with retry metadata", async () => {
  const limiter = protectionWith(new FakeRedis());
  const login = { namespace: "tenant", identifier: "owner@example.com", ip: "192.0.2.1" };
  for (let attempt = 0; attempt < ACCOUNT_LIMIT; attempt += 1) {
    const reservation = await limiter.begin(login);
    await limiter.failed(reservation);
  }
  await assert.rejects(() => limiter.begin(login), (error) => {
    assert.equal(error.status, 429);
    assert.ok(error.retryAfter > 0);
    return true;
  });
});

test("six simultaneous account reservations allow exactly five", async () => {
  const limiter = protectionWith(new FakeRedis());
  const login = { namespace: "tenant", identifier: "parallel@example.com", ip: "192.0.2.10" };
  const results = await Promise.allSettled(
    Array.from({ length: ACCOUNT_LIMIT + 1 }, () => limiter.begin(login)),
  );
  assert.equal(results.filter((result) => result.status === "fulfilled").length, ACCOUNT_LIMIT);
  const rejected = results.find((result) => result.status === "rejected");
  assert.equal(rejected.reason.status, 429);
  assert.ok(rejected.reason.retryAfter > 0);
});

test("an internal failure can atomically roll back its reservation", async () => {
  const redis = new FakeRedis();
  const limiter = protectionWith(redis);
  const login = { namespace: "tenant", identifier: "rollback@example.com", ip: "192.0.2.11" };
  const reservation = await limiter.begin(login);
  assert.equal(redis.values.get(reservation.accountIp), 1);
  await limiter.cancelled(reservation);
  assert.equal(redis.values.has(reservation.accountIp), false);
});

test("success clears only that account and IP failure bucket", async () => {
  const redis = new FakeRedis();
  const limiter = protectionWith(redis);
  const first = { namespace: "tenant", identifier: "one@example.com", ip: "192.0.2.2" };
  const second = { namespace: "tenant", identifier: "two@example.com", ip: "192.0.2.2" };
  const firstReservation = await limiter.begin(first);
  await limiter.failed(firstReservation);
  const secondReservation = await limiter.begin(second);
  await limiter.failed(secondReservation);

  await limiter.succeeded(firstReservation);

  assert.equal(redis.values.has(firstReservation.accountIp), false);
  assert.equal(redis.values.get(secondReservation.accountIp), 1);
  assert.equal(firstReservation.ip, secondReservation.ip);
  assert.equal(redis.values.get(firstReservation.ip), 2);
});

test("the IP-wide twentieth request is allowed and the twenty-first is blocked", async () => {
  const limiter = protectionWith(new FakeRedis());
  for (let attempt = 0; attempt < IP_LIMIT; attempt += 1) {
    await limiter.begin({ namespace: "tenant", identifier: `user${attempt}@example.com`, ip: "192.0.2.3" });
  }
  await assert.rejects(
    () => limiter.begin({ namespace: "tenant", identifier: "last@example.com", ip: "192.0.2.3" }),
    { status: 429, code: "LOGIN_RATE_LIMITED" },
  );
});

test("Redis keys hash identifiers and namespaces remain separate", () => {
  const email = "private@example.com";
  const tenantKeys = loginRateLimitKeys({ namespace: "tenant", identifier: email, ip: "192.0.2.4" });
  const platformKeys = loginRateLimitKeys({ namespace: "platform", identifier: email, ip: "192.0.2.4" });
  assert.equal(tenantKeys.accountIp.includes(email), false);
  assert.notEqual(tenantKeys.accountIp, platformKeys.accountIp);
});

test("production Redis failure is a controlled fail-closed error", async () => {
  const limiter = createLoginProtection({
    getClient: () => null,
    connect: async () => {},
    production: true,
  });
  await assert.rejects(
    () => limiter.begin({ namespace: "tenant", identifier: "a@example.com", ip: "192.0.2.5" }),
    { status: 503, code: "LOGIN_PROTECTION_UNAVAILABLE" },
  );
});

test("login protection rejects a missing canonical IP", async () => {
  const limiter = protectionWith(new FakeRedis());
  await assert.rejects(
    () => limiter.begin({ namespace: "tenant", identifier: "a@example.com", ip: null }),
    { status: 503, code: "LOGIN_PROTECTION_UNAVAILABLE" },
  );
});

test("Railway production never falls back when X-Real-IP is missing or invalid", () => {
  const railway = { NODE_ENV: "production", RAILWAY_PROJECT_ID: "project" };
  const request = {
    headers: { "x-forwarded-for": "8.8.8.8" },
    socket: { remoteAddress: "10.0.0.9" },
    ip: "10.0.0.9",
  };
  assert.equal(getClientIp(request, railway), null);
  assert.equal(getClientIp({ ...request, headers: { "x-real-ip": "1.2.3.4, 5.6.7.8" } }, railway), null);
  assert.equal(getClientIp({ ...request, headers: { "x-real-ip": "not-an-ip" } }, railway), null);
  assert.equal(getClientIp({ ...request, headers: { "x-real-ip": "1".repeat(65) } }, railway), null);
});

test("blocked responses include Retry-After and a generic message", () => {
  const response = {
    headers: {},
    set(name, value) { this.headers[name] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  const handled = sendLoginProtectionError(response, {
    code: "LOGIN_RATE_LIMITED",
    status: 429,
    retryAfter: 600,
    message: "Too many login attempts. Please try again later.",
  });
  assert.equal(handled, true);
  assert.equal(response.statusCode, 429);
  assert.equal(response.headers["Retry-After"], "600");
  assert.equal(response.body.message.includes("account"), false);
});

test("CORS allows production and no-Origin requests but rejects untrusted origins", () => {
  const production = { NODE_ENV: "production" };
  assert.equal(isCorsOriginAllowed("https://www.storvex.rw", production), true);
  assert.equal(isCorsOriginAllowed("https://storvex.rw", production), true);
  assert.equal(isCorsOriginAllowed(undefined, production), true);
  assert.equal(isCorsOriginAllowed("https://evil.example", production), false);
  assert.equal(isCorsOriginAllowed("http://localhost:3000", production), false);
  assert.equal(isCorsOriginAllowed("http://localhost:3000", { NODE_ENV: "development" }), true);
});

test("auth-test is unavailable in production", () => {
  assert.equal(shouldExposeAuthTest({ NODE_ENV: "production" }), false);
  assert.equal(shouldExposeAuthTest({ NODE_ENV: "test" }), true);
});
