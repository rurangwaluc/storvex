"use strict";

const crypto = require("node:crypto");
const {
  generateCode, hashCode, verifyCode
} = require("./accountSignupOtp.core");

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function createAccountSignupChallengeService({ prisma, pepper, now = () => new Date() }) {
  if (!prisma?.storvexAccountOtpChallenge || !prisma?.storvexAccount ||
      typeof prisma.$transaction !== "function") {
    throw new TypeError("Account signup Prisma models required.");
  }
  if (typeof pepper !== "string" || Buffer.byteLength(pepper) < 32) {
    throw new TypeError("Strong OTP secret required.");
  }

  async function issue({ account }) {
    if (!account?.id || !account?.email || account.emailVerifiedAt) {
      throw new TypeError("Pending account required.");
    }
    const code = generateCode();
    const id = crypto.randomUUID();
    const expiresAt = new Date(now().getTime() + TTL_MS);
    const codeHash = hashCode({
      accountId: account.id, email: account.email,
      challengeId: id, code, pepper
    });

    await prisma.$transaction(async tx => {
      await tx.storvexAccountOtpChallenge.updateMany({
        where: { accountId: account.id, consumedAt: null },
        data: { consumedAt: now() }
      });
      await tx.storvexAccountOtpChallenge.create({
        data: { id, accountId: account.id, codeHash, purpose: "SIGNUP", expiresAt }
      });
    });

    // Caller must never log or return this code to the browser.
    return { challengeId: id, code, expiresAt };
  }

  async function consume({ accountId, challengeId, code }) {
    if (typeof accountId !== "string" ||
        typeof challengeId !== "string" ||
        typeof code !== "string") {
      return { verified: false };
    }

    return prisma.$transaction(async tx => {
      // Serialize concurrent attempts for this challenge.
      // This row lock is held until the transaction commits.
      await tx.$queryRaw`
        SELECT id
        FROM "StorvexAccountOtpChallenge"
        WHERE id = ${challengeId}
        FOR UPDATE
      `;

      const challenge = await tx.storvexAccountOtpChallenge.findUnique({
        where: { id: challengeId },
        include: { account: true }
      });
      const time = now();
      if (!challenge || challenge.accountId !== accountId ||
          challenge.purpose !== "SIGNUP" ||
          challenge.consumedAt || challenge.expiresAt <= time ||
          challenge.attempts >= MAX_ATTEMPTS ||
          challenge.account.emailVerifiedAt) {
        return { verified: false };
      }

      const valid = verifyCode({
        expectedHash: challenge.codeHash,
        accountId, email: challenge.account.email,
        challengeId, code, pepper
      });
      const changed = await tx.storvexAccountOtpChallenge.updateMany({
        where: {
          id: challengeId, accountId, purpose: "SIGNUP", consumedAt: null,
          expiresAt: { gt: time },
          attempts: { lt: MAX_ATTEMPTS }
        },
        data: valid
          ? { consumedAt: time, attempts: { increment: 1 } }
          : { attempts: { increment: 1 } }
      });
      if (changed.count !== 1 || !valid) {
        return { verified: false };
      }

      const accountChanged = await tx.storvexAccount.updateMany({
        where: { id: accountId, emailVerifiedAt: null, status: "PENDING" },
        data: { emailVerifiedAt: time, status: "ACTIVE" }
      });
      if (accountChanged.count !== 1) {
        // Roll back challenge consumption if account activation failed.
        throw new Error("Account verification state conflict.");
      }
      return { verified: true, accountId };
    });
  }

  async function invalidate(challengeId) {
    const result = await prisma.storvexAccountOtpChallenge.updateMany({
      where: { id: challengeId, consumedAt: null },
      data: { consumedAt: now() }
    });
    return result.count === 1;
  }

  return { issue, consume, invalidate };
}

module.exports = { createAccountSignupChallengeService };
