"use strict";

const {
  createRetailEmailLoginCooldown
} = require("./retailEmailLoginCooldown.redis");

function createRetailEmailLoginCooldownIntegration({
  getRedisClient,
  redisConfigured,
  keySecret,
  cooldownSeconds = 60
}) {
  if (
    typeof getRedisClient !== "function" ||
    typeof redisConfigured !== "function"
  ) {
    throw new TypeError(
      "Existing Redis lifecycle functions required."
    );
  }

  // Validate configuration and cooldown duration without
  // obtaining a client or opening a connection.
  const configuredCooldown =
    createRetailEmailLoginCooldown({
      redis: {
        set: async () => {
          throw new Error("No active Redis client.");
        }
      },
      keySecret,
      cooldownSeconds
    });

  return Object.freeze({
    async checkResendCooldown({ email, ip } = {}) {
      try {
        if (redisConfigured() !== true) {
          return false;
        }

        // Reuse the existing shared client.
        // Never create or connect another Redis client.
        const client = getRedisClient();

        if (
          !client ||
          client.isReady !== true ||
          typeof client.set !== "function"
        ) {
          return false;
        }

        const cooldown = createRetailEmailLoginCooldown({
          redis: client,
          keySecret,
          cooldownSeconds
        });

        return await cooldown.checkResendCooldown({
          email,
          ip
        });
      } catch {
        return false;
      }
    },

    // The configuration guard is intentionally held
    // during this module's lifetime.
    configured: Boolean(configuredCooldown)
  });
}

module.exports = {
  createRetailEmailLoginCooldownIntegration
};
