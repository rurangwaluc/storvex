"use strict";

const {
  resolveBusinessMembership,
  MembershipAccessError,
} = require("./businessMembership.service");

const COOKIE_NAME = "storvex_account_session";

function readAccountSessionCookie(req) {
  const header = req?.headers?.cookie;

  if (typeof header !== "string") return null;

  const matches = [];

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;

    if (part.slice(0, separator).trim() === COOKIE_NAME) {
      matches.push(part.slice(separator + 1).trim());
    }
  }

  // Duplicate authentication cookies are ambiguous.
  if (matches.length !== 1) return null;

  return /^[a-f0-9]{64}$/.test(matches[0])
    ? matches[0]
    : null;
}

function createBusinessAccessGuard({
  prisma,
  accountSessions,
  membershipResolver = resolveBusinessMembership,
}) {
  if (typeof accountSessions?.authenticate !== "function") {
    throw new TypeError("Account session authenticator required");
  }

  if (typeof membershipResolver !== "function") {
    throw new TypeError("Membership resolver required");
  }

  return async function requireBusinessAccess(req, res, next) {
    res.set("Cache-Control", "no-store");

    const token = readAccountSessionCookie(req);

    if (!token) {
      return res.status(401).json({
        code: "ACCOUNT_AUTHENTICATION_REQUIRED",
      });
    }

    let account;

    try {
      account = await accountSessions.authenticate(token);
    } catch {
      return res.status(503).json({
        code: "ACCOUNT_SESSION_UNAVAILABLE",
      });
    }

    if (!account?.accountId) {
      return res.status(401).json({
        code: "ACCOUNT_AUTHENTICATION_REQUIRED",
      });
    }

    // The business is selected by the trusted route contract.
    // No account ID or role is accepted from browser input.
    const tenantId = req.params?.tenantId;

    if (typeof tenantId !== "string" || !tenantId.trim()) {
      return res.status(400).json({
        code: "BUSINESS_ID_REQUIRED",
      });
    }

    try {
      const membership = await membershipResolver({
        prisma,
        accountId: account.accountId,
        tenantId,
      });

      // Never trust a membership object for another actor.
      if (
        membership?.accountId !== account.accountId ||
        membership?.tenantId !== tenantId
      ) {
        return res.status(403).json({
          code: "BUSINESS_ACCESS_DENIED",
        });
      }

      req.storvexBusinessAccess = Object.freeze({
        ...membership,
      });

      return next();
    } catch (error) {
      if (error instanceof MembershipAccessError) {
        return res.status(403).json({
          code: "BUSINESS_ACCESS_DENIED",
        });
      }

      return res.status(503).json({
        code: "BUSINESS_AUTHORIZATION_UNAVAILABLE",
      });
    }
  };
}

module.exports = {
  createBusinessAccessGuard,
  readAccountSessionCookie,
};
