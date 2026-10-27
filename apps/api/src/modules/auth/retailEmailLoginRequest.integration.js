"use strict";

const {
  createRetailEmailLoginRequestHandler
} = require("./retailEmailLoginRequest.handler");

const {
  createRetailEmailLoginProtectionAdapter
} = require("./retailEmailLoginProtection.adapter");

function createRetailEmailLoginRequestIntegration({
  loginProtection,
  checkResendCooldown,
  findRetailUser,
  isRetailUserEligible,
  issueChallenge,
  sendEmailOtp,
  invalidateChallenge
}) {
  const required = {
    checkResendCooldown,
    findRetailUser,
    isRetailUserEligible,
    issueChallenge,
    sendEmailOtp,
    invalidateChallenge
  };

  if (
    Object.values(required).some(
      value => typeof value !== "function"
    )
  ) {
    throw new TypeError(
      "Complete retail OTP request dependencies required."
    );
  }

  const protection =
    createRetailEmailLoginProtectionAdapter({
      loginProtection
    });

  return createRetailEmailLoginRequestHandler({
    async checkRequestLimit({ email, ip }) {
      // An OTP issuance attempt consumes a login-protection
      // reservation. It is NOT a successful authentication.
      //
      // This uses the existing protection API. Its production
      // quota behavior still requires Redis-backed validation.
      const reservation = await protection.begin({
        identifier: email,
        ip
      });

      const recorded = await reservation.failed();

      // An incomplete reservation operation must fail closed.
      if (recorded !== true) {
        return false;
      }

      return true;
    },

    // A separate shared, atomic resend-cooldown provider
    // must be supplied when this is connected to the API.
    // Login-protection reservations do not replace it.
    checkResendCooldown,

    findRetailUser,
    isRetailUserEligible,
    issueChallenge,
    sendEmailOtp,
    invalidateChallenge
  });
}

module.exports = {
  createRetailEmailLoginRequestIntegration
};
