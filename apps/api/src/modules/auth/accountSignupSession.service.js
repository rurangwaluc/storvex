"use strict";

const crypto = require("node:crypto");

const SESSION_MS = 8 * 60 * 60 * 1000;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function hashToken(token) {
  return crypto.createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

function createAccountSignupSessionService({
  prisma,
  now = () => new Date()
}) {
  if (!prisma?.storvexAccountSession ||
      !prisma?.storvexAccount) {
    throw new TypeError("Account session models required.");
  }

  async function create({ accountId }) {
    const account = await prisma.storvexAccount.findUnique({
      where: { id: accountId }
    });

    if (!account ||
        account.status !== "ACTIVE" ||
        !account.emailVerifiedAt) {
      throw new Error("Verified active account required.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(now().getTime() + SESSION_MS);

    await prisma.storvexAccountSession.create({
      data: {
        accountId,
        tokenId: hashToken(token),
        expiresAt
      }
    });

    return { token, expiresAt };
  }

  async function authenticate(token) {
    if (typeof token !== "string" ||
        !TOKEN_PATTERN.test(token)) {
      return null;
    }

    const session = await prisma.storvexAccountSession.findUnique({
      where: { tokenId: hashToken(token) },
      include: { account: true }
    });

    if (!session ||
        session.isRevoked ||
        session.expiresAt <= now() ||
        session.account.status !== "ACTIVE" ||
        !session.account.emailVerifiedAt) {
      return null;
    }

    return {
      accountId: session.accountId,
      fullName: session.account.fullName,
      email: session.account.email,
      emailVerified: true
    };
  }

  async function revoke(token) {
    if (typeof token !== "string" ||
        !TOKEN_PATTERN.test(token)) {
      return false;
    }

    const result = await prisma.storvexAccountSession.updateMany({
      where: {
        tokenId: hashToken(token),
        isRevoked: false
      },
      data: {
        isRevoked: true,
        revokedAt: now()
      }
    });

    return result.count === 1;
  }

  return { create, authenticate, revoke };
}

module.exports = {
  createAccountSignupSessionService
};
