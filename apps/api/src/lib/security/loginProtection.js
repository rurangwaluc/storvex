const crypto = require("node:crypto");

const {
  connectRedis,
  getRedisClient,
} = require("../cache/redisClient");

const ACCOUNT_LIMIT = 5;
const ACCOUNT_WINDOW_SECONDS = 15 * 60;
const IP_LIMIT = 20;
const IP_WINDOW_SECONDS = 10 * 60;

const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if count == 1 or ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

const RESERVE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if count == 1 or ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
if count > tonumber(ARGV[2]) then
  redis.call('DECR', KEYS[1])
  return {0, ttl}
end
return {count, ttl}
`;

const ROLLBACK_SCRIPT = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
if count <= 0 then return 0 end
if count == 1 then
  redis.call('DEL', KEYS[1])
  return 0
end
return redis.call('DECR', KEYS[1])
`;

function digest(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

function loginRateLimitKeys({ namespace, identifier, ip }) {
  const scope = String(namespace || "login").replace(/[^a-z0-9_-]/gi, "_");
  const ipHash = digest(ip || "unknown");
  return {
    ip: `security:login:${scope}:ip:${ipHash}`,
    accountIp: `security:login:${scope}:account-ip:${digest(`${normalizeIdentifier(identifier)}\n${ip || "unknown"}`)}`,
  };
}

function protectionError(code, retryAfter = null) {
  const error = new Error(code === "LOGIN_RATE_LIMITED"
    ? "Too many login attempts. Please try again later."
    : "Login protection is temporarily unavailable. Please try again later.");
  error.code = code;
  error.status = code === "LOGIN_RATE_LIMITED" ? 429 : 503;
  error.retryAfter = retryAfter;
  return error;
}

function parseCounter(result) {
  return {
    count: Number(result?.[0] || 0),
    ttl: Math.max(1, Number(result?.[1] || 1)),
  };
}

function createLoginProtection({
  getClient = getRedisClient,
  connect = connectRedis,
  production = process.env.NODE_ENV === "production",
} = {}) {
  async function clientOrNull() {
    let client = getClient();
    if (!client && !production) return null;

    if (!client?.isReady) {
      await connect();
      client = getClient();
    }

    if (!client?.isReady) throw protectionError("LOGIN_PROTECTION_UNAVAILABLE");
    return client;
  }

  async function evaluate(script, key, args) {
    const client = await clientOrNull();
    if (!client) return { count: 0, ttl: Number(args[0]), disabled: true };

    try {
      return parseCounter(await client.eval(script, {
        keys: [key],
        arguments: args.map(String),
      }));
    } catch {
      throw protectionError("LOGIN_PROTECTION_UNAVAILABLE");
    }
  }

  return {
    async begin({ namespace, identifier, ip }) {
      if (!ip) throw protectionError("LOGIN_PROTECTION_UNAVAILABLE");

      const keys = loginRateLimitKeys({ namespace, identifier, ip });
      const ipCounter = await evaluate(INCREMENT_SCRIPT, keys.ip, [IP_WINDOW_SECONDS]);
      if (ipCounter.count > IP_LIMIT) {
        throw protectionError("LOGIN_RATE_LIMITED", ipCounter.ttl);
      }

      let accountReserved = false;
      if (normalizeIdentifier(identifier)) {
        const accountCounter = await evaluate(
          RESERVE_SCRIPT,
          keys.accountIp,
          [ACCOUNT_WINDOW_SECONDS, ACCOUNT_LIMIT],
        );
        if (accountCounter.count === 0 && !accountCounter.disabled) {
          throw protectionError("LOGIN_RATE_LIMITED", accountCounter.ttl);
        }
        accountReserved = !accountCounter.disabled;
      }

      return { ...keys, accountReserved };
    },

    async failed(reservation) {
      // begin() already reserved the failed credential attempt atomically.
      return Boolean(reservation?.accountReserved);
    },

    async succeeded(reservation) {
      if (!reservation?.accountReserved) return;
      const client = await clientOrNull();
      if (!client) return;
      try {
        await client.del(reservation.accountIp);
      } catch {
        throw protectionError("LOGIN_PROTECTION_UNAVAILABLE");
      }
    },

    async cancelled(reservation) {
      if (!reservation?.accountReserved) return;
      const client = await clientOrNull();
      if (!client) return;
      try {
        await client.eval(ROLLBACK_SCRIPT, {
          keys: [reservation.accountIp],
          arguments: [],
        });
      } catch {
        throw protectionError("LOGIN_PROTECTION_UNAVAILABLE");
      }
    },
  };
}

const loginProtection = createLoginProtection();

function sendLoginProtectionError(res, error) {
  if (!["LOGIN_RATE_LIMITED", "LOGIN_PROTECTION_UNAVAILABLE"].includes(error?.code)) {
    return false;
  }
  if (error.retryAfter) res.set("Retry-After", String(error.retryAfter));
  res.status(error.status).json({ message: error.message, code: error.code });
  return true;
}

module.exports = {
  ACCOUNT_LIMIT,
  ACCOUNT_WINDOW_SECONDS,
  IP_LIMIT,
  IP_WINDOW_SECONDS,
  createLoginProtection,
  loginProtection,
  loginRateLimitKeys,
  sendLoginProtectionError,
};
