"use strict";

const {
  createAccountSignupSessionService,
} = require("./accountSignupSession.service");

const {
  createBusinessAccessGuard,
} = require("./businessAccess.guard");

function createAuthenticatedBusinessAccess({ prisma }) {
  if (
    !prisma?.storvexAccount ||
    !prisma?.storvexAccountSession ||
    !prisma?.storvexBusinessMembership
  ) {
    throw new TypeError(
      "Account, session and membership models required"
    );
  }

  const accountSessions =
    createAccountSignupSessionService({ prisma });

  return createBusinessAccessGuard({
    prisma,
    accountSessions,
  });
}

module.exports = {
  createAuthenticatedBusinessAccess,
};
