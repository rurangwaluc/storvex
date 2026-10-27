"use strict";

const { createHmac } = require("node:crypto");
const { Resend } = require("resend");
const { loginProtection } =
  require("../../lib/security/loginProtection");
const { getRedisClient, redisConfigured } =
  require("../../lib/cache/redisClient");
const { createRetailEmailLoginProtectionAdapter } =
  require("./retailEmailLoginProtection.adapter");
const { createAccountLoginChallengeService } =
  require("./accountLoginChallenge.service");
const { createAccountLoginRequestHandler } =
  require("./accountLoginRequest.handler");

const COOLDOWN_PREFIX =
  "storvex:auth:account-login:cooldown:v1";

function createAccountLoginRequestComposition({
  prisma,
  getClientIp
}) {
  if (!prisma || typeof getClientIp !== "function") {
    throw new TypeError("Account login dependencies required.");
  }

  let handler = null;

  function configuredHandler() {
    if (handler) return handler;

    const pepper = process.env.RETAIL_EMAIL_LOGIN_PEPPER;
    const keySecret =
      process.env.RETAIL_EMAIL_LOGIN_COOLDOWN_SECRET;
    const apiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.RESEND_FROM;

    if (
      typeof pepper !== "string" ||
      Buffer.byteLength(pepper) < 32 ||
      typeof keySecret !== "string" ||
      Buffer.byteLength(keySecret) < 32 ||
      !apiKey ||
      !emailFrom ||
      !redisConfigured()
    ) {
      return null;
    }

    try {
      const protection =
        createRetailEmailLoginProtectionAdapter({
          loginProtection
        });

      const challenges =
        createAccountLoginChallengeService({
          prisma,
          pepper
        });

      const resend = new Resend(apiKey);

      handler = createAccountLoginRequestHandler({
        prisma,
        challengeService: challenges,

        async checkRateLimit({ req, email }) {
          try {
            const reservation = await protection.begin({
              identifier: "account-login-request:" + email,
              ip: getClientIp(req)
            });

            return (await reservation.failed()) === true;
          } catch {
            return false;
          }
        },

        async checkCooldown({ email }) {
          try {
            const redis = getRedisClient();

            if (
              !redisConfigured() ||
              !redis ||
              redis.isReady !== true
            ) {
              return false;
            }

            const digest = createHmac("sha256", keySecret)
              .update("storvex-account-login-cooldown-v1")
              .update("\0")
              .update(email)
              .digest("hex");

            const result = await redis.set(
              COOLDOWN_PREFIX + ":" + digest,
              "1",
              { EX: 60, NX: true }
            );

            return result === "OK";
          } catch {
            return false;
          }
        },

        async sendEmailOtp({ to, code, ttlMinutes }) {
          try {
            const result = await resend.emails.send({
              from: emailFrom,
              to,
              subject: "Your Storvex sign-in code",
              text:
                "Your Storvex sign-in code is " +
                code +
                ". It expires in " +
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
    res.set("Cache-Control", "no-store");

    const active = configuredHandler();

    if (!active) {
      return res.status(503).json({
        error: "Email sign-in is temporarily unavailable."
      });
    }

    return active(req, res);
  };
}

module.exports = {
  createAccountLoginRequestComposition
};
