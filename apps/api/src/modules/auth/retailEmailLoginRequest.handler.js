"use strict";

const { randomUUID } = require("node:crypto");

const PUBLIC_MESSAGE =
  "If the account is eligible, a verification code will be sent.";

function createRetailEmailLoginRequestHandler(deps) {
  const names = [
    "checkRequestLimit",
    "checkResendCooldown",
    "findRetailUser",
    "isRetailUserEligible",
    "issueChallenge",
    "sendEmailOtp",
    "invalidateChallenge"
  ];

  if (
    !deps ||
    names.some(name => typeof deps[name] !== "function")
  ) {
    throw new TypeError(
      "All retail email OTP security dependencies are required."
    );
  }

  return async function retailEmailLoginRequest(req, res) {
    // Identical public response shape for every outcome.
    let publicChallengeId = randomUUID();

    function respond() {
      return res.status(202).json({
        message: PUBLIC_MESSAGE,
        challengeId: publicChallengeId
      });
    }

    const input = req && req.body && req.body.email;

    if (typeof input !== "string") {
      return respond();
    }

    const email = input.trim().toLowerCase();

    if (
      email.length < 3 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return respond();
    }

    const ip =
      typeof req.ip === "string" ? req.ip : "";

    let issued = null;

    try {
      // These dependencies must use durable, shared and
      // atomic controls when connected to the real API.
      const limit = await deps.checkRequestLimit({
        email,
        ip
      });

      if (limit !== true) return respond();

      const cooldown = await deps.checkResendCooldown({
        email,
        ip
      });

      if (cooldown !== true) return respond();

      const user = await deps.findRetailUser({ email });

      if (
        !user ||
        typeof user.id !== "string" ||
        typeof user.email !== "string" ||
        user.email.trim().toLowerCase() !== email ||
        user.isActive !== true
      ) {
        return respond();
      }

      const eligible =
        await deps.isRetailUserEligible({ user });

      if (eligible !== true) return respond();

      issued = await deps.issueChallenge({
        userId: user.id,
        email
      });

      if (
        !issued ||
        typeof issued.challengeId !== "string" ||
        typeof issued.code !== "string" ||
        !(issued.expiresAt instanceof Date) ||
        !Number.isFinite(issued.expiresAt.getTime())
      ) {
        // Fail closed; do not call the email provider
        // with an incomplete challenge.
        if (issued && issued.challengeId) {
          await invalidateQuietly(issued.challengeId);
        }
        return respond();
      }

      let delivery;

      try {
        delivery = await deps.sendEmailOtp({
          to: email,
          code: issued.code,
          ttlMinutes: Math.max(
            1,
            Math.ceil(
              (issued.expiresAt.getTime() - Date.now()) /
              60000
            )
          )
        });
      } catch {
        delivery = null;
      }

      if (!delivery || delivery.sent !== true) {
        await invalidateQuietly(issued.challengeId);
        return respond();
      }

      // Never return the raw OTP, provider result or user.
      publicChallengeId = issued.challengeId;
      return respond();
    } catch {
      if (issued && issued.challengeId) {
        await invalidateQuietly(issued.challengeId);
      }

      return respond();
    }

    async function invalidateQuietly(challengeId) {
      try {
        await deps.invalidateChallenge({ challengeId });
      } catch {
        // No sensitive details are sent to the client.
        // Production integration must alarm on failures
        // without logging OTPs or account identifiers.
      }
    }
  };
}

module.exports = {
  createRetailEmailLoginRequestHandler,
  PUBLIC_MESSAGE
};
