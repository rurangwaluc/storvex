"use strict";

const {
  createRetailEmailLoginRequestComposition
} = require("./retailEmailLoginRequest.composition");

const {
  createRetailEmailLoginVerifyComposition
} = require("./retailEmailLoginVerify.composition");

const {
  loginProtection
} = require("../../lib/security/loginProtection");

const {
  getRedisClient,
  redisConfigured
} = require("../../lib/cache/redisClient");

const EMAIL_API_KEY_ENV = "RESEND_API_KEY";
const EMAIL_FROM_ENV = "RESEND_FROM";

function createRetailEmailLoginApiHandlers({
  prisma,
  signAuthToken,
  getClientIp,
  getUserAgent
}) {
  if (
    !prisma ||
    typeof signAuthToken !== "function" ||
    typeof getClientIp !== "function" ||
    typeof getUserAgent !== "function"
  ) {
    throw new TypeError("Retail authentication dependencies required.");
  }

  let handlers = null;

  function configuredHandlers() {
    if (handlers) return handlers;

    const pepper = process.env.RETAIL_EMAIL_LOGIN_PEPPER;
    const cooldownKeySecret =
      process.env.RETAIL_EMAIL_LOGIN_COOLDOWN_SECRET;
    const apiKey = process.env[EMAIL_API_KEY_ENV];
    const emailFrom = process.env[EMAIL_FROM_ENV];

    if (
      !pepper ||
      !cooldownKeySecret ||
      !apiKey ||
      !emailFrom ||
      !redisConfigured()
    ) {
      return null;
    }

    try {
      const { Resend } = require("resend");
      const resendClient = new Resend(apiKey);

      const request =
        createRetailEmailLoginRequestComposition({
          prisma,
          pepper,
          loginProtection,
          getRedisClient,
          redisConfigured,
          cooldownKeySecret,
          resendClient,
          emailFrom
        });

      const verify =
        createRetailEmailLoginVerifyComposition({
          prisma,
          pepper,
          signAuthToken,
          getClientIp,
          getUserAgent
        });

      handlers = { request, verify };
      return handlers;
    } catch {
      return null;
    }
  }

  function unavailable(res) {
    return res.status(503).json({
      message: "Email sign-in is temporarily unavailable."
    });
  }

  return Object.freeze({
    async request(req, res) {
      const active = configuredHandlers();

      if (!active) return unavailable(res);

      return active.request(req, res);
    },

    async verify(req, res) {
      const active = configuredHandlers();

      if (!active) return unavailable(res);

      return active.verify(req, res);
    }
  });
}

module.exports = {
  createRetailEmailLoginApiHandlers
};
