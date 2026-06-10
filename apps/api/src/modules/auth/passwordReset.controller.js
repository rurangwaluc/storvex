const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/database");

const JWT_SECRET = process.env.JWT_SECRET;

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email || null;
}

function cleanString(value) {
  const text = String(value || "").trim();
  return text || "";
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(text)) return true;
    if (["false", "0", "no", "off"].includes(text)) return false;
  }

  return fallback;
}

function getResetMinutes() {
  const value = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES || 20);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 20;
}

function getFrontendBaseUrl(req) {
  const configured =
    cleanString(process.env.WEB_APP_URL) ||
    cleanString(process.env.FRONTEND_URL) ||
    cleanString(process.env.CLIENT_URL) ||
    cleanString(process.env.APP_URL);

  if (configured) return configured.replace(/\/+$/, "");

  const origin = cleanString(req.headers?.origin);
  if (origin) return origin.replace(/\/+$/, "");

  return "http://localhost:3000";
}

function passwordProblems(value) {
  const password = String(value || "");
  const problems = [];

  if (password.length < 8) problems.push("Use at least 8 characters.");
  if (!/[a-z]/.test(password)) problems.push("Add a lowercase letter.");
  if (!/[A-Z]/.test(password)) problems.push("Add an uppercase letter.");
  if (!/[0-9]/.test(password)) problems.push("Add a number.");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("Add a symbol.");

  return problems;
}

function assertJwtSecret() {
  if (!JWT_SECRET) {
    const err = new Error("Missing JWT_SECRET");
    err.status = 500;
    throw err;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function maskEmail(email) {
  const value = String(email || "");
  const [name, domain] = value.split("@");

  if (!name || !domain) return value;

  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`;
}

function buildResetToken(user) {
  assertJwtSecret();

  return jwt.sign(
    {
      purpose: "PASSWORD_RESET",
      userId: user.id,
      email: user.email,
      passwordVersion: sha256(user.password),
    },
    JWT_SECRET,
    {
      expiresIn: `${getResetMinutes()}m`,
    }
  );
}

function verifyResetToken(token) {
  assertJwtSecret();

  const payload = jwt.verify(String(token || ""), JWT_SECRET);

  if (payload?.purpose !== "PASSWORD_RESET") {
    const err = new Error("Invalid reset link");
    err.status = 400;
    throw err;
  }

  if (!payload?.userId || !payload?.email || !payload?.passwordVersion) {
    const err = new Error("Invalid reset link");
    err.status = 400;
    throw err;
  }

  return payload;
}

function buildResetEmail({ resetUrl, minutes }) {
  const text = [
    "Reset your Storvex password",
    "",
    `Open this link to set a new password: ${resetUrl}`,
    "",
    `This link expires in ${minutes} minutes.`,
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;padding:32px 18px;">
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:22px;padding:28px;box-shadow:0 24px 80px rgba(15,23,42,0.08);">
          <div style="font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;">
            Storvex account security
          </div>

          <h1 style="margin:12px 0 10px;font-size:26px;line-height:1.15;color:#0f172a;">
            Reset your password
          </h1>

          <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#475569;">
            Use the button below to set a new password for your Storvex account.
          </p>

          <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 18px;border-radius:14px;">
            Reset password
          </a>

          <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
            This link expires in ${minutes} minutes. If you did not request this, you can ignore this email.
          </p>

          <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;word-break:break-all;">
            ${resetUrl}
          </p>
        </div>
      </div>
    </div>
  `;

  return { text, html };
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const devEcho = toBool(process.env.DEV_PASSWORD_RESET_ECHO, false);
  const apiKey = cleanString(process.env.RESEND_API_KEY);
  const from = cleanString(process.env.RESEND_FROM);
  const minutes = getResetMinutes();

  if (devEcho && process.env.NODE_ENV !== "production") {
    console.log("Password reset link:", resetUrl);
  }

  if (!apiKey) {
    return {
      sent: false,
      provider: "RESEND",
      reason: "RESEND_API_KEY_MISSING",
      devResetUrl: devEcho && process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    };
  }

  if (!from) {
    return {
      sent: false,
      provider: "RESEND",
      reason: "RESEND_FROM_MISSING",
      devResetUrl: devEcho && process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    };
  }

  let Resend;
  try {
    ({ Resend } = require("resend"));
  } catch {
    return {
      sent: false,
      provider: "RESEND",
      reason: "RESEND_SDK_NOT_INSTALLED",
      devResetUrl: devEcho && process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    };
  }

  const resend = new Resend(apiKey);
  const email = buildResetEmail({ resetUrl, minutes });

  try {
    const response = await resend.emails.send({
      from,
      to,
      subject: "Reset your Storvex password",
      text: email.text,
      html: email.html,
    });

    if (response?.error) {
      return {
        sent: false,
        provider: "RESEND",
        reason: response.error?.message || "RESEND_SEND_ERROR",
        devResetUrl: devEcho && process.env.NODE_ENV !== "production" ? resetUrl : undefined,
      };
    }

    const messageId = response?.data?.id || response?.id || "";

    if (!messageId) {
      return {
        sent: false,
        provider: "RESEND",
        reason: "RESEND_NO_MESSAGE_ID",
        devResetUrl: devEcho && process.env.NODE_ENV !== "production" ? resetUrl : undefined,
      };
    }

    console.log("Password reset email sent:", {
      to: maskEmail(to),
      messageId,
    });

    return {
      sent: true,
      provider: "RESEND",
      messageId,
      devResetUrl: devEcho && process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    };
  } catch (error) {
    return {
      sent: false,
      provider: "RESEND",
      reason: error?.message || "RESEND_SEND_FAILED",
      devResetUrl: devEcho && process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    };
  }
}

async function forgotPassword(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const genericResponse = {
      message: "If this email exists, a password reset link has been sent.",
    };

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        isActive: true,
      },
    });

    if (!user || user.isActive === false) {
      return res.json(genericResponse);
    }

    const token = buildResetToken(user);
    const resetUrl = `${getFrontendBaseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;

    const delivery = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
    });

    const deliveryRequired =
      process.env.NODE_ENV === "production" ||
      toBool(process.env.PASSWORD_RESET_REQUIRE_DELIVERY, false);

    if (deliveryRequired && !delivery.sent) {
      return res.status(502).json({
        message: "Password reset email could not be sent",
        reason: delivery.reason || "EMAIL_DELIVERY_FAILED",
      });
    }

    return res.json({
      ...genericResponse,
      sent: Boolean(delivery.sent),
      provider: delivery.provider || null,
      devResetUrl: delivery.devResetUrl || undefined,
    });
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Failed to request password reset",
    });
  }
}

async function resetPassword(req, res) {
  try {
    const token = cleanString(req.body?.token);
    const password = String(req.body?.password || "");

    if (!token || !password) {
      return res.status(400).json({
        message: "Reset token and new password are required",
      });
    }

    const issues = passwordProblems(password);

    if (issues.length) {
      return res.status(400).json({
        message: `Password is not strong enough. ${issues.join(" ")}`,
      });
    }

    const payload = verifyResetToken(token);
    const email = normalizeEmail(payload.email);

    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        email,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        password: true,
        isActive: true,
      },
    });

    if (!user || user.isActive === false) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    if (sha256(user.password) !== payload.passwordVersion) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    const samePassword = await bcrypt.compare(password, user.password);

    if (samePassword) {
      return res.status(400).json({
        message: "New password must be different from the current password.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
        },
      });

      await tx.userSession
        .updateMany({
          where: {
            userId: user.id,
            isRevoked: false,
          },
          data: {
            isRevoked: true,
          },
        })
        .catch(() => null);

      if (tx.passwordChangeEvent?.create) {
        await tx.passwordChangeEvent
          .create({
            data: {
              tenantId: user.tenantId,
              userId: user.id,
              method: "PASSWORD_RESET",
              ipAddress: req.ip ? String(req.ip) : null,
              userAgent: req.headers["user-agent"] ? String(req.headers["user-agent"]) : null,
            },
          })
          .catch(() => null);
      }
    });

    return res.json({
      message: "Password updated. Please log in with your new password.",
    });
  } catch (error) {
    console.error("resetPassword error:", error);

    if (error?.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset link expired. Request a new one." });
    }

    if (error?.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid reset link" });
    }

    return res.status(error.status || 500).json({
      message: error.message || "Failed to reset password",
    });
  }
}

module.exports = {
  forgotPassword,
  resetPassword,
};