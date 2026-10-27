"use strict";

const {
  issueChallenge,
  consumeChallenge
} = require("./retailEmailLoginChallenge.service");

function createRetailEmailLoginPrismaAdapter({
  prisma,
  pepper,
  now = () => new Date()
}) {
  const model = prisma && prisma.retailEmailLoginChallenge;

  if (
    !model ||
    typeof model.create !== "function" ||
    typeof model.findUnique !== "function" ||
    typeof model.updateMany !== "function"
  ) {
    throw new TypeError(
      "Prisma retail email login challenge delegate required."
    );
  }

  if (
    typeof pepper !== "string" ||
    Buffer.byteLength(pepper, "utf8") < 32
  ) {
    throw new TypeError("Secure OTP hashing secret required.");
  }

  if (typeof now !== "function") {
    throw new TypeError("Clock function required.");
  }

  const db = {
    retailEmailLoginChallenge: model
  };

  return Object.freeze({
    async issueChallenge({ userId, email }) {
      return issueChallenge({
        db,
        userId,
        email,
        pepper,
        now: now()
      });
    },

    async consumeChallenge({ challengeId, code }) {
      return consumeChallenge({
        db,
        challengeId,
        code,
        pepper,
        now: now()
      });
    },

    async invalidateChallenge({ challengeId }) {
      if (
        typeof challengeId !== "string" ||
        !challengeId.trim()
      ) {
        return false;
      }

      const checkedAt = now();

      if (
        !(checkedAt instanceof Date) ||
        !Number.isFinite(checkedAt.getTime())
      ) {
        throw new TypeError("Invalid clock value.");
      }

      const result = await model.updateMany({
        where: {
          id: challengeId,
          consumedAt: null
        },
        data: {
          consumedAt: checkedAt
        }
      });

      return result.count === 1;
    }
  });
}

module.exports = {
  createRetailEmailLoginPrismaAdapter
};
