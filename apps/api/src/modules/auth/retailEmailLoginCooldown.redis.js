"use strict";

const { createHmac } = require("node:crypto");

const DEFAULT_COOLDOWN_SECONDS = 60;
const KEY_PREFIX = "storvex:auth:retail-email-otp:cooldown:v1";

function createRetailEmailLoginCooldown({
  redis,
  keySecret,
  cooldownSeconds = DEFAULT_COOLDOWN_SECONDS
}) {
  if (!redis || typeof redis.set !== "function") {
    throw new TypeError("Redis SET client required.");
  }

  if (
    typeof keySecret !== "string" ||
    Buffer.byteLength(keySecret, "utf8") < 32
  ) {
    throw new TypeError("Secure Redis key secret required.");
  }

  if (
    !Number.isSafeInteger(cooldownSeconds) ||
    cooldownSeconds < 1 ||
    cooldownSeconds > 3600
  ) {
    throw new RangeError("Invalid cooldown duration.");
  }

  function normalize(email) {
    if (
      typeof email !== "string" ||
      email.length > 254
    ) {
      return null;
    }

    const value = email.trim().toLowerCase();

    if (
      value.length < 3 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      return null;
    }

    return value;
  }

  function makeKey(email) {
    const normalized = normalize(email);
    if (!normalized) return null;

    const digest = createHmac("sha256", keySecret)
      .update("retail-email-login-cooldown-v1")
      .update("\0")
      .update(normalized)
      .digest("hex");

    return KEY_PREFIX + ":" + digest;
  }

  async function checkResendCooldown({ email } = {}) {
    const key = makeKey(email);

    if (!key) return false;

    try {
      // Atomic node-redis 6 reservation:
      // SET key value EX seconds NX
      //
      // NX prevents replacing an existing key.
      // EX gives the reservation an automatic expiry.
      //
      // Success: "OK"; existing key: null.
      const result = await redis.set(
        key,
        "1",
        {
          EX: cooldownSeconds,
          NX: true
        }
      );

      return result === "OK";
    } catch {
      // Security controls fail closed on Redis errors.
      return false;
    }
  }

  return Object.freeze({
    checkResendCooldown
  });
}

module.exports = {
  createRetailEmailLoginCooldown,
  DEFAULT_COOLDOWN_SECONDS
};
