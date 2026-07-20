const jwt = require("jsonwebtoken");

const prisma = require("../../config/database");

function customerJwtSecret() {
  return (
    process.env.MARKETPLACE_CUSTOMER_JWT_SECRET ||
    process.env.JWT_SECRET ||
    null
  );
}

function bearerToken(req) {
  const header = String(
    req.headers.authorization || "",
  ).trim();

  if (
    !header.toLowerCase().startsWith(
      "bearer ",
    )
  ) {
    return null;
  }

  return header
    .slice("Bearer ".length)
    .trim();
}

async function touchSession(
  sessionId,
  previousLastSeenAt,
) {
  if (!sessionId) return;

  const previous =
    previousLastSeenAt
      ? new Date(previousLastSeenAt)
      : null;

  const now = new Date();

  if (
    previous &&
    !Number.isNaN(
      previous.getTime(),
    ) &&
    now.getTime() -
      previous.getTime() <
      5 * 60 * 1000
  ) {
    return;
  }

  await prisma.marketplaceCustomerSession
    .update({
      where: {
        id: sessionId,
      },
      data: {
        lastSeenAt: now,
      },
    })
    .catch(() => null);
}

module.exports =
  async function authenticateMarketplaceCustomer(
    req,
    res,
    next,
  ) {
    const token = bearerToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Sign in to continue.",
        code: "MARKETPLACE_CUSTOMER_TOKEN_MISSING",
      });
    }

    const secret = customerJwtSecret();

    if (!secret) {
      return res.status(500).json({
        message:
          "Marketplace customer authentication is not configured.",
        code: "MARKETPLACE_CUSTOMER_JWT_SECRET_MISSING",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        secret,
      );
    } catch (error) {
      return res.status(401).json({
        message:
          "Your sign-in has expired. Sign in again.",
        code: "MARKETPLACE_CUSTOMER_TOKEN_INVALID",
      });
    }

    const customerId =
      decoded.customerId || null;

    const tokenId =
      decoded.tokenId || null;

    if (
      decoded.scope !==
        "MARKETPLACE_CUSTOMER" ||
      !customerId ||
      !tokenId
    ) {
      return res.status(401).json({
        message:
          "This sign-in cannot be used for a customer account.",
        code: "MARKETPLACE_CUSTOMER_TOKEN_CLAIMS_INVALID",
      });
    }

    try {
      const customer =
        await prisma.marketplaceCustomer.findUnique({
          where: {
            id: customerId,
          },
        });

      if (!customer) {
        return res.status(401).json({
          message:
            "Customer account not found.",
          code: "MARKETPLACE_CUSTOMER_NOT_FOUND",
        });
      }

      if (
        customer.status !== "ACTIVE"
      ) {
        return res.status(403).json({
          message:
            "This account is not available.",
          code: "MARKETPLACE_CUSTOMER_DISABLED",
        });
      }

      const session =
        await prisma.marketplaceCustomerSession.findFirst({
          where: {
            customerId,
            tokenId,
          },
        });

      if (!session) {
        return res.status(401).json({
          message:
            "Customer session not found.",
          code: "MARKETPLACE_CUSTOMER_SESSION_NOT_FOUND",
        });
      }

      if (session.isRevoked) {
        return res.status(401).json({
          message:
            "This sign-in has ended. Sign in again.",
          code: "MARKETPLACE_CUSTOMER_SESSION_REVOKED",
        });
      }

      if (
        new Date(session.expiresAt) <
        new Date()
      ) {
        return res.status(401).json({
          message:
            "Your sign-in has expired. Sign in again.",
          code: "MARKETPLACE_CUSTOMER_SESSION_EXPIRED",
        });
      }

      req.marketplaceCustomer =
        customer;

      req.marketplaceCustomerSession =
        session;

      await touchSession(
        session.id,
        session.lastSeenAt,
      );

      return next();
    } catch (error) {
      console.error(
        "Marketplace customer authentication error:",
        error,
      );

      return res.status(500).json({
        message:
          "We could not confirm your sign-in.",
        code: "MARKETPLACE_CUSTOMER_AUTH_FAILED",
      });
    }
  };
