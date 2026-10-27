"use strict";

const {
  createRetailEmailLoginRequestIntegration
} = require("./retailEmailLoginRequest.integration");

const {
  createRetailEmailLoginCooldownIntegration
} = require("./retailEmailLoginCooldown.integration");

const {
  createRetailEmailLoginPrismaAdapter
} = require("./retailEmailLoginPrisma.adapter");

const {
  createRetailEmailLoginEligibilityService
} = require("./retailEmailLoginEligibility.service");

function createRetailEmailLoginRequestComposition({
  prisma,
  pepper,
  loginProtection,
  getRedisClient,
  redisConfigured,
  cooldownKeySecret,
  cooldownSeconds = 60,
  findRetailUser,
  isRetailUserEligible,
  resendClient,
  emailFrom,
  makeChallengeAdapter = createRetailEmailLoginPrismaAdapter
}) {
  // Both overrides must be supplied together, or neither.
  // Normal application use obtains both from Prisma.
  const overrideLookup = typeof findRetailUser === "function";
  const overrideEligibility =
    typeof isRetailUserEligible === "function";

  if (overrideLookup !== overrideEligibility) {
    throw new TypeError(
      "Retail lookup and eligibility overrides must be paired."
    );
  }

  const eligibility = overrideLookup
    ? { findRetailUser, isRetailUserEligible }
    : createRetailEmailLoginEligibilityService({ prisma });

  if (
    !resendClient ||
    !resendClient.emails ||
    typeof resendClient.emails.send !== "function" ||
    typeof emailFrom !== "string" ||
    !emailFrom.trim()
  ) {
    throw new TypeError("Configured email sender required.");
  }

  if (
    typeof makeChallengeAdapter !== "function"
  ) {
    throw new TypeError("Challenge adapter factory required.");
  }

  const challenge = makeChallengeAdapter({
    prisma,
    pepper
  });

  if (
    !challenge ||
    typeof challenge.issueChallenge !== "function" ||
    typeof challenge.invalidateChallenge !== "function"
  ) {
    throw new TypeError(
      "Challenge issue and invalidation methods required."
    );
  }

  const cooldown =
    createRetailEmailLoginCooldownIntegration({
      getRedisClient,
      redisConfigured,
      keySecret: cooldownKeySecret,
      cooldownSeconds
    });

  async function sendEmailOtp({ to, code, ttlMinutes }) {
    try {
      if (
        typeof to !== "string" ||
        !/^[0-9]{6}$/.test(String(code)) ||
        !Number.isFinite(ttlMinutes) ||
        ttlMinutes <= 0
      ) {
        return { sent: false };
      }

      const response = await resendClient.emails.send({
        from: emailFrom,
        to,
        subject: "Your Storvex retail sign-in code",
        text:
          "Your Storvex retail sign-in code is " +
          code +
          ". It expires in " +
          ttlMinutes +
          " minutes. Do not share this code."
      });

      // Resend's accepted-message ID, not mere absence
      // of an exception, determines delivery acceptance.
      if (
        response?.error ||
        typeof response?.data?.id !== "string" ||
        !response.data.id.trim()
      ) {
        return { sent: false };
      }

      return { sent: true };
    } catch {
      return { sent: false };
    }
  }

  return createRetailEmailLoginRequestIntegration({
    loginProtection,
    checkResendCooldown:
      cooldown.checkResendCooldown,
    findRetailUser: eligibility.findRetailUser,
    isRetailUserEligible: eligibility.isRetailUserEligible,
    issueChallenge: challenge.issueChallenge,
    invalidateChallenge: challenge.invalidateChallenge,
    sendEmailOtp
  });
}

module.exports = {
  createRetailEmailLoginRequestComposition
};
