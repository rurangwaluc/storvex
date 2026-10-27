"use strict";

const crypto = require("node:crypto");
const {
  generateCode,
  hashCode,
  verifyCode
} = require("./accountSignupOtp.core");

const PURPOSE = "LOGIN";
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function createAccountLoginChallengeService({
  prisma,
  pepper,
  now = () => new Date()
}) {
  if (
    !prisma?.storvexAccountOtpChallenge ||
    !prisma?.storvexAccount ||
    typeof prisma.$transaction !== "function"
  ) {
    throw new TypeError("Account login Prisma models required.");
  }

  if (
    typeof pepper !== "string" ||
    Buffer.byteLength(pepper) < 32
  ) {
    throw new TypeError("Strong OTP secret required.");
  }

  async function issue({ account }) {
    if (
      !account?.id ||
      !account?.email ||
      account.status !== "ACTIVE" ||
      !account.emailVerifiedAt
    ) {
      throw new TypeError("Verified active account required.");
    }

    const code = generateCode();
    const challengeId = crypto.randomUUID();
    const expiresAt = new Date(now().getTime() + TTL_MS);

    const codeHash = hashCode({
      accountId: account.id,
      email: account.email,
      challengeId,
      code,
      pepper
    });

    await prisma.$transaction(async tx => {
      // Invalidate previous LOGIN challenges only.
      // Never invalidate pending signup challenges.
      await tx.storvexAccountOtpChallenge.updateMany({
        where: {
          accountId: account.id,
          purpose: PURPOSE,
          consumedAt: null
        },
        data: { consumedAt: now() }
      });

      await tx.storvexAccountOtpChallenge.create({
        data: {
          id: challengeId,
          accountId: account.id,
          codeHash,
          purpose: PURPOSE,
          expiresAt
        }
      });
    });

    // This code is for the email sender only.
    // Never log it or return it in an HTTP response.
    return { challengeId, code, expiresAt };
  }

  async function consume({
    accountId,
    challengeId,
    code
  }) {
    if (
      typeof accountId !== "string" ||
      typeof challengeId !== "string" ||
      typeof code !== "string" ||
      !/^\d{6}$/.test(code)
    ) {
      return { verified: false };
    }

    return prisma.$transaction(async tx => {
      await tx.$queryRaw`
        SELECT id
        FROM "StorvexAccountOtpChallenge"
        WHERE id = ${challengeId}
        FOR UPDATE
      `;

      const challenge =
        await tx.storvexAccountOtpChallenge.findUnique({
          where: { id: challengeId },
          include: { account: true }
        });

      const time = now();

      if (
        !challenge ||
        challenge.accountId !== accountId ||
        challenge.purpose !== PURPOSE ||
        challenge.consumedAt ||
        challenge.expiresAt <= time ||
        challenge.attempts >= MAX_ATTEMPTS ||
        challenge.account.status !== "ACTIVE" ||
        !challenge.account.emailVerifiedAt
      ) {
        return { verified: false };
      }

      const valid = verifyCode({
        expectedHash: challenge.codeHash,
        accountId,
        email: challenge.account.email,
        challengeId,
        code,
        pepper
      });

      const updated =
        await tx.storvexAccountOtpChallenge.updateMany({
          where: {
            id: challengeId,
            accountId,
            purpose: PURPOSE,
            consumedAt: null,
            expiresAt: { gt: time },
            attempts: { lt: MAX_ATTEMPTS }
          },
          data: valid
            ? {
                consumedAt: time,
                attempts: { increment: 1 }
              }
            : {
                attempts: { increment: 1 }
              }
        });

      if (updated.count !== 1 || !valid) {
        return { verified: false };
      }

      // Login must never modify account verification,
      // status, identity, or business ownership.
      return { verified: true, accountId };
    });
  }

  async function invalidate(challengeId) {
    const result =
      await prisma.storvexAccountOtpChallenge.updateMany({
        where: {
          id: challengeId,
          purpose: PURPOSE,
          consumedAt: null
        },
        data: { consumedAt: now() }
      });

    return result.count === 1;
  }

  return Object.freeze({
    issue,
    consume,
    invalidate
  });
}

module.exports = {
  createAccountLoginChallengeService
};
