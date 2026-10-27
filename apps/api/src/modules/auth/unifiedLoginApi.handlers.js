"use strict";

const { createHash } = require("node:crypto");
const { randomUUID } = require("node:crypto");
const { loginProtection } =
  require("../../lib/security/loginProtection");
const { createRetailEmailLoginProtectionAdapter } =
  require("./retailEmailLoginProtection.adapter");

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE =
  "If the account is eligible, a verification code will be sent.";

function createUnifiedLoginApiHandlers({
  prisma,
  retail,
  account,
  getClientIp,
  checkRequestLimit
}) {
  if (
    typeof prisma?.user?.findUnique !== "function" ||
    typeof prisma?.storvexAccount?.findUnique !== "function" ||
    typeof prisma?.retailEmailLoginChallenge?.findUnique !== "function" ||
    typeof prisma?.storvexAccountOtpChallenge?.findUnique !== "function" ||
    typeof retail?.request !== "function" ||
    typeof retail?.verify !== "function" ||
    typeof account?.loginRequest !== "function" ||
    typeof account?.loginVerify !== "function"
  ) {
    throw new TypeError("Unified login dependencies required.");
  }

  const protection = checkRequestLimit
    ? null
    : createRetailEmailLoginProtectionAdapter({
        loginProtection
      });

  async function allowed(req, email) {
    if (checkRequestLimit) {
      return checkRequestLimit({ req, email });
    }

    const identifier = createHash("sha256")
      .update(email)
      .digest("hex");

    const reservation = await protection.begin({
      identifier: "unified-login:" + identifier,
      ip: getClientIp(req)
    });

    return (await reservation.failed()) === true;
  }

  function generic(res) {
    return res.status(202).json({
      message: MESSAGE,
      challengeId: randomUUID()
    });
  }

  function rejectCrossSite(req, res) {
    const origin = req.get?.("origin");
    if (!origin) return false;

    const host = req.get?.("host");
    const protocol = req.protocol;

    if (
      !host ||
      !["http", "https"].includes(protocol) ||
      origin !== `${protocol}://${host}`
    ) {
      res.status(403).json({
        error: "Request origin not permitted."
      });
      return true;
    }

    return false;
  }

  async function request(req, res) {
    if (rejectCrossSite(req, res)) return;
    res.set("Cache-Control", "no-store");

    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (
      email.length < 3 ||
      email.length > 254 ||
      !EMAIL.test(email)
    ) {
      return generic(res);
    }

    try {
      if (await allowed(req, email) !== true) {
        return res.status(429).json({
          error: "Too many requests. Please try again later."
        });
      }
    } catch {
      return res.status(503).json({
        error: "Email sign-in is temporarily unavailable."
      });
    }

    let retailIdentity;
    let accountIdentity;

    try {
      [retailIdentity, accountIdentity] = await Promise.all([
        prisma.user.findUnique({
          where: { email },
          select: { id: true }
        }),
        prisma.storvexAccount.findUnique({
          where: { email },
          select: { id: true }
        })
      ]);
    } catch {
      return res.status(503).json({
        error: "Email sign-in is temporarily unavailable."
      });
    }

    // Prefer the verified Storvex account identity when both records
    // exist. Retail workspace access is granted separately only after
    // server-side active business membership authorization.
    if (accountIdentity) {
      return account.loginRequest(req, res);
    }

    if (retailIdentity) {
      return retail.request(req, res);
    }

    return generic(res);
  }

  async function verify(req, res) {
    if (rejectCrossSite(req, res)) return;
    res.set("Cache-Control", "no-store");

    const challengeId = req.body?.challengeId;

    if (
      typeof challengeId !== "string" ||
      !UUID.test(challengeId)
    ) {
      return res.status(400).json({
        error: "Invalid or expired verification code."
      });
    }

    let retailChallenge;
    let accountChallenge;

    try {
      [retailChallenge, accountChallenge] = await Promise.all([
        prisma.retailEmailLoginChallenge.findUnique({
          where: { id: challengeId },
          select: { id: true }
        }),
        prisma.storvexAccountOtpChallenge.findUnique({
          where: { id: challengeId },
          select: { id: true, purpose: true }
        })
      ]);
    } catch {
      return res.status(503).json({
        error: "Email sign-in is temporarily unavailable."
      });
    }

    if (retailChallenge && accountChallenge) {
      return res.status(400).json({
        error: "Invalid or expired verification code."
      });
    }

    if (retailChallenge) {
      return retail.verify(req, res);
    }

    if (accountChallenge?.purpose === "LOGIN") {
      return account.loginVerify(req, res);
    }

    return res.status(400).json({
      error: "Invalid or expired verification code."
    });
  }

  return Object.freeze({ request, verify });
}

module.exports = {
  createUnifiedLoginApiHandlers
};
