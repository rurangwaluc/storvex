const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const prisma = require("../../config/database");

const CUSTOMER_SESSION_DAYS = 30;

function cleanString(value, maxLength = 500) {
  const text = String(value || "").trim();

  if (!text) return null;

  return text.slice(0, maxLength);
}

function normalizeEmail(value) {
  const email = cleanString(value, 320);

  return email ? email.toLowerCase() : null;
}

function normalizePhone(value) {
  const raw = String(value || "")
    .trim()
    .replace(/[^\d]/g, "");

  if (!raw) return null;

  if (raw.startsWith("07") && raw.length === 10) {
    return `250${raw.slice(1)}`;
  }

  return raw;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function validRwandaPhone(value) {
  return /^2507\d{8}$/.test(String(value || ""));
}

function passwordProblems(value) {
  const password = String(value || "");
  const problems = [];

  if (password.length < 8) {
    problems.push("Use at least 8 characters.");
  }

  if (!/[a-z]/.test(password)) {
    problems.push("Add a lowercase letter.");
  }

  if (!/[A-Z]/.test(password)) {
    problems.push("Add an uppercase letter.");
  }

  if (!/[0-9]/.test(password)) {
    problems.push("Add a number.");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    problems.push("Add a symbol.");
  }

  return problems;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }

  return req.ip ? String(req.ip) : null;
}

function getUserAgent(req) {
  return req.headers["user-agent"]
    ? String(req.headers["user-agent"])
    : null;
}

function customerJwtSecret() {
  const secret =
    process.env.MARKETPLACE_CUSTOMER_JWT_SECRET ||
    process.env.JWT_SECRET;

  if (!secret) {
    const error = new Error(
      "Marketplace customer authentication is not configured.",
    );

    error.status = 500;
    error.code = "MARKETPLACE_CUSTOMER_JWT_SECRET_MISSING";

    throw error;
  }

  return secret;
}

function customerSessionExpiry() {
  return new Date(
    Date.now() +
      CUSTOMER_SESSION_DAYS *
        24 *
        60 *
        60 *
        1000,
  );
}

function signCustomerToken(customer, tokenId) {
  return jwt.sign(
    {
      customerId: customer.id,
      tokenId,
      scope: "MARKETPLACE_CUSTOMER",
    },
    customerJwtSecret(),
    {
      expiresIn: `${CUSTOMER_SESSION_DAYS}d`,
    },
  );
}

function publicCustomer(customer) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    status: customer.status,
    emailVerified: Boolean(
      customer.emailVerifiedAt,
    ),
    phoneVerified: Boolean(
      customer.phoneVerifiedAt,
    ),
    createdAt: customer.createdAt,
  };
}

async function createCustomerSession(
  req,
  customer,
) {
  const tokenId = crypto.randomUUID();
  const expiresAt = customerSessionExpiry();

  await prisma.marketplaceCustomerSession.create({
    data: {
      customerId: customer.id,
      tokenId,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      expiresAt,
      isRevoked: false,
      lastSeenAt: new Date(),
    },
  });

  return {
    token: signCustomerToken(
      customer,
      tokenId,
    ),
    expiresAt,
  };
}

async function registerCustomer(req, res) {
  try {
    const body = req.body || {};

    const name = cleanString(
      body.name,
      160,
    );

    const email = normalizeEmail(
      body.email,
    );

    const phone = normalizePhone(
      body.phone,
    );

    const password = String(
      body.password || "",
    );

    if (!name) {
      return res.status(400).json({
        message: "Enter your name.",
        code: "MARKETPLACE_CUSTOMER_NAME_REQUIRED",
      });
    }

    if (!email || !validEmail(email)) {
      return res.status(400).json({
        message: "Enter a valid email address.",
        code: "MARKETPLACE_CUSTOMER_EMAIL_REQUIRED",
      });
    }

    if (
      phone &&
      !validRwandaPhone(phone)
    ) {
      return res.status(400).json({
        message:
          "Enter a valid Rwanda phone number.",
        code: "MARKETPLACE_CUSTOMER_PHONE_INVALID",
      });
    }

    const problems =
      passwordProblems(password);

    if (problems.length) {
      return res.status(400).json({
        message:
          "Choose a stronger password.",
        code: "MARKETPLACE_CUSTOMER_PASSWORD_WEAK",
        details: {
          problems,
        },
      });
    }

    const existing =
      await prisma.marketplaceCustomer.findFirst({
        where: {
          OR: [
            {
              email,
            },
            ...(phone
              ? [
                  {
                    phone,
                  },
                ]
              : []),
          ],
        },
        select: {
          id: true,
          email: true,
          phone: true,
        },
      });

    if (existing) {
      const emailUsed =
        existing.email === email;

      return res.status(409).json({
        message: emailUsed
          ? "An account already uses this email address."
          : "An account already uses this phone number.",
        code: emailUsed
          ? "MARKETPLACE_CUSTOMER_EMAIL_EXISTS"
          : "MARKETPLACE_CUSTOMER_PHONE_EXISTS",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      );

    const customer =
      await prisma.marketplaceCustomer.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
          status: "ACTIVE",
          lastLoginAt: new Date(),
        },
      });

    const session =
      await createCustomerSession(
        req,
        customer,
      );

    return res.status(201).json({
      message: "Account created.",
      token: session.token,
      expiresAt: session.expiresAt,
      customer:
        publicCustomer(customer),
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({
        message:
          "An account already uses these details.",
        code: "MARKETPLACE_CUSTOMER_ALREADY_EXISTS",
      });
    }

    console.error(
      "Marketplace customer register error:",
      error,
    );

    return res
      .status(error.status || 500)
      .json({
        message:
          error.message ||
          "We could not create your account.",
        code:
          error.code ||
          "MARKETPLACE_CUSTOMER_REGISTER_FAILED",
      });
  }
}

async function loginCustomer(req, res) {
  try {
    const email = normalizeEmail(
      req.body?.email,
    );

    const password = String(
      req.body?.password || "",
    );

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Enter your email and password.",
        code: "MARKETPLACE_CUSTOMER_LOGIN_REQUIRED",
      });
    }

    const customer =
      await prisma.marketplaceCustomer.findUnique({
        where: {
          email,
        },
      });

    if (!customer) {
      return res.status(401).json({
        message:
          "The email or password is incorrect.",
        code: "MARKETPLACE_CUSTOMER_CREDENTIALS_INVALID",
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

    const passwordMatches =
      await bcrypt.compare(
        password,
        customer.passwordHash,
      );

    if (!passwordMatches) {
      return res.status(401).json({
        message:
          "The email or password is incorrect.",
        code: "MARKETPLACE_CUSTOMER_CREDENTIALS_INVALID",
      });
    }

    const updatedCustomer =
      await prisma.marketplaceCustomer.update({
        where: {
          id: customer.id,
        },
        data: {
          lastLoginAt: new Date(),
        },
      });

    const session =
      await createCustomerSession(
        req,
        updatedCustomer,
      );

    return res.json({
      message: "Signed in.",
      token: session.token,
      expiresAt: session.expiresAt,
      customer:
        publicCustomer(
          updatedCustomer,
        ),
    });
  } catch (error) {
    console.error(
      "Marketplace customer login error:",
      error,
    );

    return res
      .status(error.status || 500)
      .json({
        message:
          error.message ||
          "We could not sign you in.",
        code:
          error.code ||
          "MARKETPLACE_CUSTOMER_LOGIN_FAILED",
      });
  }
}

async function logoutCustomer(req, res) {
  try {
    await prisma.marketplaceCustomerSession.updateMany({
      where: {
        customerId:
          req.marketplaceCustomer.id,
        tokenId:
          req.marketplaceCustomerSession.tokenId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return res.json({
      message: "Signed out.",
    });
  } catch (error) {
    console.error(
      "Marketplace customer logout error:",
      error,
    );

    return res.status(500).json({
      message:
        "We could not sign you out.",
      code: "MARKETPLACE_CUSTOMER_LOGOUT_FAILED",
    });
  }
}

async function getCurrentCustomer(
  req,
  res,
) {
  return res.json({
    customer: publicCustomer(
      req.marketplaceCustomer,
    ),
  });
}

module.exports = {
  registerCustomer,
  loginCustomer,
  logoutCustomer,
  getCurrentCustomer,
  publicCustomer,
};
