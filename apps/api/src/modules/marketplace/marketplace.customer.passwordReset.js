const bcrypt = require("bcryptjs");

const prisma = require(
  "../../config/database",
);

const {
  sendEmailMessage,
} = require(
  "../notifications",
);

const {
  RESET_TOKEN_MINUTES,
  cleanString,
  createResetToken,
  frontendBaseUrl,
  getClientIp,
  hashResetToken,
  isUsableResetRecord,
  normalizeEmail,
  passwordProblems,
  resetExpiry,
  validEmail,
} = require(
  "./marketplace.customer.passwordReset.helpers",
);

const GENERIC_MESSAGE =
  "If a Marketplace account uses this email, a password reset link has been sent.";

const REQUEST_WINDOW_MS =
  15 * 60 * 1000;

const MAX_CUSTOMER_REQUESTS =
  3;

const MAX_IP_REQUESTS =
  10;

const ipRequests = new Map();

function pruneIpRequests(
  key,
  now = Date.now(),
) {
  const previous =
    ipRequests.get(key) || [];

  const active =
    previous.filter(
      (timestamp) =>
        now - timestamp <
        REQUEST_WINDOW_MS,
    );

  if (active.length) {
    ipRequests.set(
      key,
      active,
    );
  } else {
    ipRequests.delete(key);
  }

  return active;
}

function ipRequestAllowed(
  ip,
  now = Date.now(),
) {
  if (!ip) return true;

  const active =
    pruneIpRequests(ip, now);

  if (
    active.length >=
    MAX_IP_REQUESTS
  ) {
    return false;
  }

  active.push(now);

  ipRequests.set(
    ip,
    active,
  );

  return true;
}

async function tooManyCustomerRequests(
  customerId,
  now = new Date(),
) {
  const windowStart =
    new Date(
      now.getTime() -
        REQUEST_WINDOW_MS,
    );

  const count =
    await prisma
      .marketplaceCustomerPasswordReset
      .count({
        where: {
          customerId,
          createdAt: {
            gte: windowStart,
          },
        },
      });

  return (
    count >=
    MAX_CUSTOMER_REQUESTS
  );
}

function resetEmail({
  customer,
  resetUrl,
}) {
  const firstName =
    cleanString(
      customer?.name,
      160,
    )?.split(/\s+/)[0] ||
    "there";

  const subject =
    "Reset your Storvex Marketplace password";

  const text = [
    `Hello ${firstName},`,
    "",
    "We received a request to reset your Storvex Marketplace password.",
    "",
    `Open this link to choose a new password: ${resetUrl}`,
    "",
    `This link expires in ${RESET_TOKEN_MINUTES} minutes and can be used only once.`,
    "",
    "If you did not request this change, you can ignore this email.",
    "",
    "Storvex Marketplace",
  ].join("\n");

  const html = `
    <div style="margin:0;padding:32px 16px;background:#f6f7f9;font-family:Arial,sans-serif;color:#171717">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;padding:32px">
        <div style="font-size:20px;font-weight:800;margin-bottom:24px">
          Storvex Marketplace
        </div>

        <h1 style="font-size:24px;line-height:1.25;margin:0 0 16px">
          Reset your password
        </h1>

        <p style="font-size:15px;line-height:1.7;margin:0 0 16px">
          Hello ${firstName},
        </p>

        <p style="font-size:15px;line-height:1.7;margin:0 0 24px">
          We received a request to reset your Storvex Marketplace password.
        </p>

        <p style="margin:0 0 24px">
          <a
            href="${resetUrl}"
            style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 20px"
          >
            Choose a new password
          </a>
        </p>

        <p style="font-size:13px;line-height:1.7;color:#5f6368;margin:0 0 12px">
          This link expires in ${RESET_TOKEN_MINUTES} minutes and can be used only once.
        </p>

        <p style="font-size:13px;line-height:1.7;color:#5f6368;margin:0">
          If you did not request this change, you can ignore this email.
        </p>
      </div>
    </div>
  `;

  return {
    subject,
    text,
    html,
  };
}

async function forgotPassword(
  req,
  res,
) {
  try {
    const email =
      normalizeEmail(
        req.body?.email,
      );

    const ipAddress =
      getClientIp(req);

    if (
      !email ||
      !validEmail(email)
    ) {
      return res.json({
        message:
          GENERIC_MESSAGE,
      });
    }

    if (
      !ipRequestAllowed(
        ipAddress,
      )
    ) {
      return res.status(429).json({
        message:
          "Too many reset requests. Wait a few minutes and try again.",
        code:
          "MARKETPLACE_CUSTOMER_RESET_RATE_LIMITED",
      });
    }

    const customer =
      await prisma
        .marketplaceCustomer
        .findUnique({
          where: {
            email,
          },
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        });

    if (
      !customer ||
      customer.status !==
        "ACTIVE"
    ) {
      return res.json({
        message:
          GENERIC_MESSAGE,
      });
    }

    if (
      await tooManyCustomerRequests(
        customer.id,
      )
    ) {
      return res.status(429).json({
        message:
          "Too many reset requests. Wait a few minutes and try again.",
        code:
          "MARKETPLACE_CUSTOMER_RESET_RATE_LIMITED",
      });
    }

    const token =
      createResetToken();

    const tokenHash =
      hashResetToken(token);

    const now =
      new Date();

    await prisma.$transaction([
      prisma
        .marketplaceCustomerPasswordReset
        .updateMany({
          where: {
            customerId:
              customer.id,
            usedAt: null,
          },
          data: {
            usedAt: now,
          },
        }),

      prisma
        .marketplaceCustomerPasswordReset
        .create({
          data: {
            customerId:
              customer.id,
            tokenHash,
            expiresAt:
              resetExpiry(now),
            requestedIp:
              ipAddress,
          },
        }),
    ]);

    const resetUrl =
      `${frontendBaseUrl(req)}` +
      "/marketplace/account/reset-password" +
      `?token=${encodeURIComponent(token)}`;

    const message =
      resetEmail({
        customer,
        resetUrl,
      });

    const delivery =
      await sendEmailMessage({
        to: customer.email,
        subject:
          message.subject,
        text: message.text,
        html: message.html,
        entityRef:
          `marketplace-password-reset-${customer.id}`,
      });

    if (!delivery.sent) {
      await prisma
        .marketplaceCustomerPasswordReset
        .updateMany({
          where: {
            tokenHash,
            usedAt: null,
          },
          data: {
            usedAt:
              new Date(),
          },
        });

      console.error(
        "Marketplace password reset email was not sent:",
        {
          customerId:
            customer.id,
          reason:
            delivery.reason,
        },
      );
    }

    if (
      process.env.NODE_ENV !==
        "production" &&
      String(
        process.env
          .DEV_EMAIL_ECHO ||
          process.env.DEV_OTP_ECHO ||
          "false",
      ).toLowerCase() ===
        "true"
    ) {
      console.log(
        "DEV MARKETPLACE PASSWORD RESET URL:",
        resetUrl,
      );
    }

    return res.json({
      message:
        GENERIC_MESSAGE,
    });
  } catch (error) {
    console.error(
      "Marketplace customer forgot password error:",
      error,
    );

    return res.status(500).json({
      message:
        "We could not start the password reset. Try again.",
      code:
        "MARKETPLACE_CUSTOMER_FORGOT_PASSWORD_FAILED",
    });
  }
}

async function resetPassword(
  req,
  res,
) {
  try {
    const token =
      cleanString(
        req.body?.token,
        2000,
      );

    const password =
      String(
        req.body?.password ||
          "",
      );

    if (!token) {
      return res.status(400).json({
        message:
          "This reset link is invalid or has expired.",
        code:
          "MARKETPLACE_CUSTOMER_RESET_TOKEN_INVALID",
      });
    }

    const problems =
      passwordProblems(password);

    if (problems.length) {
      return res.status(400).json({
        message:
          "Choose a stronger password.",
        code:
          "MARKETPLACE_CUSTOMER_PASSWORD_WEAK",
        details: {
          problems,
        },
      });
    }

    const tokenHash =
      hashResetToken(token);

    const resetRecord =
      await prisma
        .marketplaceCustomerPasswordReset
        .findUnique({
          where: {
            tokenHash,
          },
          include: {
            customer: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

    if (
      !isUsableResetRecord(
        resetRecord,
      ) ||
      resetRecord.customer
        ?.status !== "ACTIVE"
    ) {
      return res.status(400).json({
        message:
          "This reset link is invalid or has expired.",
        code:
          "MARKETPLACE_CUSTOMER_RESET_TOKEN_INVALID",
      });
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      );

    const now =
      new Date();

    const transactionResult =
      await prisma.$transaction(
        async (tx) => {
          const consumed =
            await tx
              .marketplaceCustomerPasswordReset
              .updateMany({
                where: {
                  id:
                    resetRecord.id,
                  usedAt: null,
                  expiresAt: {
                    gt: now,
                  },
                },
                data: {
                  usedAt: now,
                },
              });

          if (
            consumed.count !== 1
          ) {
            return {
              consumed: false,
            };
          }

          await tx
            .marketplaceCustomer
            .update({
              where: {
                id:
                  resetRecord.customerId,
              },
              data: {
                passwordHash,
              },
            });

          await tx
            .marketplaceCustomerSession
            .updateMany({
              where: {
                customerId:
                  resetRecord.customerId,
                isRevoked: false,
              },
              data: {
                isRevoked: true,
                revokedAt: now,
              },
            });

          await tx
            .marketplaceCustomerPasswordReset
            .updateMany({
              where: {
                customerId:
                  resetRecord.customerId,
                usedAt: null,
              },
              data: {
                usedAt: now,
              },
            });

          return {
            consumed: true,
          };
        },
      );

    if (
      !transactionResult.consumed
    ) {
      return res.status(400).json({
        message:
          "This reset link is invalid or has expired.",
        code:
          "MARKETPLACE_CUSTOMER_RESET_TOKEN_INVALID",
      });
    }

    return res.json({
      message:
        "Password updated. Sign in with your new password.",
    });
  } catch (error) {
    console.error(
      "Marketplace customer reset password error:",
      error,
    );

    return res.status(500).json({
      message:
        "We could not reset your password. Try again.",
      code:
        "MARKETPLACE_CUSTOMER_RESET_PASSWORD_FAILED",
    });
  }
}

module.exports = {
  forgotPassword,
  resetPassword,
};
