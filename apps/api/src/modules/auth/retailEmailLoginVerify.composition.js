"use strict";

const { randomUUID } = require("node:crypto");

const {
  createRetailEmailLoginVerifyHandler
} = require("./retailEmailLoginVerify.handler");

const {
  createRetailEmailLoginPrismaAdapter
} = require("./retailEmailLoginPrisma.adapter");

const {
  createRetailEmailLoginEligibilityService
} = require("./retailEmailLoginEligibility.service");

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function createRetailEmailLoginVerifyComposition({
  prisma,
  pepper,
  signAuthToken,
  getClientIp,
  getUserAgent,
  now = () => new Date(),
  makeChallengeAdapter = createRetailEmailLoginPrismaAdapter
}) {
  if (
    typeof prisma?.userSession?.create !== "function" ||
    typeof prisma?.userSession?.updateMany !== "function" ||
    typeof signAuthToken !== "function" ||
    typeof getClientIp !== "function" ||
    typeof getUserAgent !== "function" ||
    typeof now !== "function" ||
    typeof makeChallengeAdapter !== "function"
  ) {
    throw new TypeError(
      "Complete retail session dependencies required."
    );
  }

  const eligibility =
    createRetailEmailLoginEligibilityService({ prisma });

  const challenge = makeChallengeAdapter({ prisma, pepper });

  if (typeof challenge?.consumeChallenge !== "function") {
    throw new TypeError(
      "OTP challenge consumption method required."
    );
  }

  return createRetailEmailLoginVerifyHandler({
    consumeChallenge: challenge.consumeChallenge,

    findRetailUserById:
      eligibility.findRetailUserById,

    async authorizeRetailLogin({ user, tenantId }) {
      if (
        !user ||
        user.tenantId !== tenantId ||
        typeof tenantId !== "string" ||
        !tenantId
      ) {
        return false;
      }

      return eligibility.isRetailUserEligible({ user });
    },

    async createRetailSession({ user, tenantId, request }) {
      if (
        !user ||
        user.tenantId !== tenantId ||
        !await eligibility.isRetailUserEligible({ user })
      ) {
        throw new Error("Retail authorization denied.");
      }

      const issuedAt = now();

      if (
        !(issuedAt instanceof Date) ||
        !Number.isFinite(issuedAt.getTime())
      ) {
        throw new TypeError("Invalid session clock.");
      }

      const tokenId = randomUUID();

      const session = await prisma.userSession.create({
        data: {
          tenantId,
          userId: user.id,
          tokenId,
          ipAddress: getClientIp(request) || null,
          userAgent: getUserAgent(request) || null,
          expiresAt: new Date(
            issuedAt.getTime() + SESSION_TTL_MS
          ),
          isRevoked: false
        }
      });

      if (
        !session ||
        typeof session.id !== "string" ||
        !session.id ||
        session.userId !== user.id ||
        session.tenantId !== tenantId ||
        session.tokenId !== tokenId
      ) {
        throw new Error("Invalid session persistence result.");
      }

      return session;
    },

    async writeAuthenticatedResponse({ res, user, session }) {
      if (
        !session ||
        session.userId !== user?.id ||
        session.tenantId !== user?.tenantId ||
        typeof session.tokenId !== "string"
      ) {
        throw new Error("Invalid authenticated session.");
      }

      const token = await signAuthToken({
        user,
        tokenId: session.tokenId
      });

      if (typeof token !== "string" || !token) {
        throw new Error("Token signing failed.");
      }

      return res.json({
        token,
        user: {
          id: user.id,
          tenantId: user.tenantId,
          role: user.role,
          email: user.email
        }
      });
    },

    async revokeRetailSession({ session }) {
      if (!session?.id) return false;

      const result = await prisma.userSession.updateMany({
        where: {
          id: session.id,
          userId: session.userId,
          tenantId: session.tenantId,
          tokenId: session.tokenId,
          isRevoked: false
        },
        data: {
          isRevoked: true,
          revokedAt: now()
        }
      });

      return result.count === 1;
    }
  });
}

module.exports = {
  createRetailEmailLoginVerifyComposition,
  SESSION_TTL_MS
};
