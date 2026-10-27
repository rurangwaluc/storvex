"use strict";

const { Resend } = require("resend");
const { loginProtection } =
  require("../../lib/security/loginProtection");
const { getRedisClient, redisConfigured } =
  require("../../lib/cache/redisClient");
const { createRetailEmailLoginProtectionAdapter } =
  require("./retailEmailLoginProtection.adapter");
const { createRetailEmailLoginCooldownIntegration } =
  require("./retailEmailLoginCooldown.integration");
const { createAccountSignupChallengeService } =
  require("./accountSignupChallenge.service");
const { createAccountSignupRequestHandler } =
  require("./accountSignupRequest.handler");

function createAccountSignupRequestComposition({ prisma, getClientIp }) {
  if (!prisma || typeof getClientIp !== "function") {
    throw new TypeError("Signup dependencies required.");
  }

  let handler = null;

  function configuredHandler() {
    if (handler) return handler;

    const pepper = process.env.RETAIL_EMAIL_LOGIN_PEPPER;
    const cooldownSecret =
      process.env.RETAIL_EMAIL_LOGIN_COOLDOWN_SECRET;
    const apiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.RESEND_FROM;

    if (
      typeof pepper !== "string" ||
      Buffer.byteLength(pepper) < 32 ||
      typeof cooldownSecret !== "string" ||
      Buffer.byteLength(cooldownSecret) < 32 ||
      !apiKey || !emailFrom ||
      !redisConfigured()
    ) {
      return null;
    }

    try {
      const protection =
        createRetailEmailLoginProtectionAdapter({
          loginProtection
        });

      const cooldown =
        createRetailEmailLoginCooldownIntegration({
          getRedisClient,
          redisConfigured,
          keySecret: cooldownSecret
        });

      const challengeService =
        createAccountSignupChallengeService({
          prisma,
          pepper
        });

      const resend = new Resend(apiKey);

      handler = createAccountSignupRequestHandler({
        prisma,
        challengeService,

        async checkRateLimit({ req, email }) {
          try {
            const reservation = await protection.begin({
              identifier: email,
              ip: getClientIp(req)
            });
            return await reservation.failed() === true;
          } catch {
            return false;
          }
        },

        async checkCooldown({ email, req }) {
          return cooldown.checkResendCooldown({
            email,
            ip: getClientIp(req)
          });
        },

        async sendEmailOtp({ to, code, ttlMinutes }) {
          try {
            const result = await resend.emails.send({
              from: emailFrom,
              to,
              subject: "Verify your Storvex account",
              text:
                "Your Storvex verification code is " +
                code + ". It expires in " +
                ttlMinutes +
                " minutes. Do not share this code."
            });

            return {
              sent: Boolean(
                !result?.error &&
                typeof result?.data?.id === "string" &&
                result.data.id.trim()
              )
            };
          } catch {
            return { sent: false };
          }
        }
      });

      return handler;
    } catch {
      return null;
    }
  }

  return async function request(req, res) {
    const active = configuredHandler();

    if (!active) {
      return res.status(503).json({
        error: "Account registration is temporarily unavailable."
      });
    }

    return active(req, res);
  };
}

module.exports = { createAccountSignupRequestComposition };
