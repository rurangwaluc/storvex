"use strict";

const prisma = require("../../config/database");
const {
  getClientIp,
} = require("../../lib/security/clientIp");

function cleanString(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function readUserAgent(req) {
  return cleanString(
    req?.headers?.["user-agent"],
  );
}

function readClientIp(req) {
  try {
    return getClientIp(req) || null;
  } catch {
    /*
     * Session revocation must not be prevented
     * only because security-event IP enrichment
     * is unavailable.
     */
    return null;
  }
}

async function logout(req, res) {
  const tenantId =
    cleanString(req?.user?.tenantId);

  const userId =
    cleanString(
      req?.user?.userId ||
      req?.user?.id,
    );

  const sessionId =
    cleanString(
      req?.user?.sessionId,
    );

  if (
    !tenantId ||
    !userId ||
    !sessionId
  ) {
    return res.status(401).json({
      message: "Unauthorized",
      code: "AUTH_SESSION_REQUIRED",
    });
  }

  try {
    const now = new Date();

    await prisma.$transaction(
      async (tx) => {
        const result =
          await tx.userSession.updateMany({
            where: {
              id: sessionId,
              tenantId,
              userId,
              isRevoked: false,
            },
            data: {
              isRevoked: true,
              revokedAt: now,
            },
          });

        /*
         * Logout is deliberately idempotent.
         *
         * If another request revoked this
         * session between authentication and
         * this transaction, signing out is
         * still considered successful.
         */
        if (
          Number(result?.count || 0) >
          0
        ) {
          await tx.loginEvent.create({
            data: {
              tenantId,
              userId,
              email:
                cleanString(
                  req?.user?.email,
                ),
              role:
                cleanString(
                  req?.user?.role,
                ),
              status: "SIGNED_OUT",
              method: "LOGOUT",
              ipAddress:
                readClientIp(req),
              userAgent:
                readUserAgent(req),
              reason:
                "Current device signed out.",
            },
          });
        }
      },
    );

    return res.json({
      ok: true,
      message: "Signed out",
    });
  } catch (error) {
    console.error(
      "logout error:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to sign out",
      code: "LOGOUT_FAILED",
    });
  }
}

module.exports = {
  logout,
};
