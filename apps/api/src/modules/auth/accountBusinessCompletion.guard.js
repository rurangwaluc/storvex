"use strict";

const {
  createAccountSignupSessionService,
} = require("./accountSignupSession.service");

const COOKIE = "storvex_account_session";
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function createAccountBusinessCompletionGuard({
  prisma,
  sessionService,
}) {
  const sessions = sessionService ||
    createAccountSignupSessionService({ prisma });

  return async function requireAccountBusinessSession(req, res, next) {
    res.set("Cache-Control", "no-store");

    const origin = req.get?.("origin");
    if (origin) {
      const host = req.get?.("host");
      const protocol = req.protocol;

      if (
        !host ||
        !["http", "https"].includes(protocol) ||
        origin !== `${protocol}://${host}`
      ) {
        return res.status(403).json({
          message: "Request origin not permitted.",
        });
      }
    }

    const header = req.headers?.cookie || "";
    const tokens = [];

    for (const part of header.split(";")) {
      const index = part.indexOf("=");
      if (index < 0) continue;

      if (part.slice(0, index).trim() === COOKIE) {
        tokens.push(part.slice(index + 1).trim());
      }
    }

    if (
      tokens.length !== 1 ||
      !TOKEN_PATTERN.test(tokens[0])
    ) {
      return res.status(401).json({
        message: "Sign in to continue business setup.",
      });
    }

    try {
      const account = await sessions.authenticate(tokens[0]);

      if (
        !account?.accountId ||
        !account?.email ||
        account.emailVerified !== true
      ) {
        return res.status(401).json({
          message: "Sign in to continue business setup.",
        });
      }

      req.storvexOnboardingAccount = Object.freeze({
        accountId: account.accountId,
        email: account.email,
        emailVerified: true,
      });

      return next();
    } catch {
      return res.status(503).json({
        message: "Account verification is temporarily unavailable.",
      });
    }
  };
}

module.exports = {
  createAccountBusinessCompletionGuard,
};
