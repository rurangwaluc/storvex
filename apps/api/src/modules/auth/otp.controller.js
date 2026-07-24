// src/modules/auth/otp.controller.js
const prisma =
  require("../../config/database");

const {
  checkSmsOtp,
} = require("../notifications");

const {
  CHANNELS,
  cleanString,
  hashOtp,
  createAndSendOtp,
  resolveTargetFromIntent,
} = require("./otp.service");

const OTP_MAX_ATTEMPTS =
  Number(
    process.env.OTP_MAX_ATTEMPTS ||
      5,
  );

function usesDevelopmentPhoneOtp() {
  return (
    process.env.NODE_ENV !==
      "production" &&
    String(
      process.env.DEV_OTP_ECHO ||
        "false",
    ).toLowerCase() === "true"
  );
}

async function incrementAttempts(
  otpId,
) {
  await prisma.otpCode.update({
    where: {
      id: otpId,
    },
    data: {
      attempts: {
        increment: 1,
      },
    },
  });
}

function isInvalidTwilioCode(
  reason,
) {
  return new Set([
    "TWILIO_VERIFY_CODE_NOT_APPROVED",
    "TWILIO_VERIFY_CHECK_NOT_FOUND",
    "TWILIO_VERIFY_CHECK_MAX_ATTEMPTS_REACHED",
  ]).has(reason);
}

// POST /api/auth/otp/send
async function sendOtp(
  req,
  res,
) {
  try {
    const intentId =
      cleanString(
        req.body.intentId,
      );

    const channelRaw =
      cleanString(
        req.body.channel,
      );

    if (
      !intentId ||
      !channelRaw
    ) {
      return res
        .status(400)
        .json({
          message:
            "intentId and channel are required",
        });
    }

    const channel =
      String(
        channelRaw,
      ).toUpperCase();

    if (
      !CHANNELS.has(channel)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid channel. Use EMAIL or PHONE.",
        });
    }

    const intent =
      await prisma.ownerIntent.findUnique({
        where: {
          id: intentId,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          deviceId: true,
          browserFingerprint:
            true,
          status: true,
          expiresAt: true,
          emailVerified: true,
          phoneVerified: true,
        },
      });

    if (!intent) {
      return res
        .status(404)
        .json({
          message:
            "Owner intent not found",
        });
    }

    if (
      intent.expiresAt <
      new Date()
    ) {
      return res
        .status(403)
        .json({
          message:
            "Owner intent expired",
        });
    }

    if (
      intent.status ===
      "CONSUMED"
    ) {
      return res
        .status(403)
        .json({
          message:
            "This signup was already completed. Please login.",
        });
    }

    if (
      channel === "EMAIL" &&
      intent.emailVerified
    ) {
      return res
        .status(200)
        .json({
          message:
            "Email already verified",
          channel,
          emailVerified: true,
          phoneVerified:
            !!intent.phoneVerified,
        });
    }

    if (
      channel === "PHONE" &&
      intent.phoneVerified
    ) {
      return res
        .status(200)
        .json({
          message:
            "Phone already verified",
          channel,
          emailVerified:
            !!intent.emailVerified,
          phoneVerified: true,
        });
    }

    const result =
      await createAndSendOtp({
        intent,
        intentId,
        channel,
      });

    const message =
      result.sent
        ? channel === "EMAIL"
          ? "Email OTP sent."
          : "SMS OTP sent."
        : channel === "EMAIL"
          ? "OTP created. Email may not be delivered due to configuration."
          : "OTP created. SMS may not be delivered due to configuration.";

    const response = {
      message,
      channel:
        result.channel,
      expiresAt:
        result.expiresAt,
      sent:
        result.sent,
      provider:
        result.provider,
      messageId:
        result.messageId,
      sendReason:
        result.reason ||
        undefined,
      emailVerified:
        !!intent.emailVerified,
      phoneVerified:
        !!intent.phoneVerified,
    };

    if (result.devOtp) {
      response.devOtp =
        result.devOtp;

      response.devTarget =
        result.target;
    }

    return res
      .status(201)
      .json(response);
  } catch (err) {
    console.error(
      "sendOtp error:",
      err,
    );

    return res
      .status(
        err.status ||
          500,
      )
      .json({
        message:
          err.message ||
          "Failed to send OTP",
        reason:
          err.reason ||
          undefined,
      });
  }
}

// POST /api/auth/otp/verify
async function verifyOtp(
  req,
  res,
) {
  try {
    const intentId =
      cleanString(
        req.body.intentId,
      );

    const channelRaw =
      cleanString(
        req.body.channel,
      );

    let code =
      cleanString(
        req.body.code,
      );

    if (
      !intentId ||
      !channelRaw ||
      !code
    ) {
      return res
        .status(400)
        .json({
          message:
            "intentId, channel, and code are required",
        });
    }

    code = String(code).replace(
      /[^\d]/g,
      "",
    );

    if (!code) {
      return res
        .status(400)
        .json({
          message:
            "Invalid code format",
        });
    }

    const channel =
      String(
        channelRaw,
      ).toUpperCase();

    if (
      !CHANNELS.has(channel)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid channel. Use EMAIL or PHONE.",
        });
    }

    const intent =
      await prisma.ownerIntent.findUnique({
        where: {
          id: intentId,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          expiresAt: true,
        },
      });

    if (!intent) {
      return res
        .status(404)
        .json({
          message:
            "Owner intent not found",
        });
    }

    if (
      intent.expiresAt <
      new Date()
    ) {
      return res
        .status(403)
        .json({
          message:
            "Owner intent expired",
        });
    }

    const target =
      resolveTargetFromIntent(
        intent,
        channel,
      );

    if (!target) {
      return res
        .status(400)
        .json({
          message:
            "Missing target on intent",
        });
    }

    const otp =
      await prisma.otpCode.findFirst({
        where: {
          intentId,
          channel,
          target,
          verifiedAt: null,
        },
        orderBy: {
          createdAt:
            "desc",
        },
        select: {
          id: true,
          codeHash: true,
          expiresAt: true,
          attempts: true,
        },
      });

    if (!otp) {
      return res
        .status(400)
        .json({
          message:
            "No active OTP found. Request a new code.",
        });
    }

    if (
      otp.expiresAt <
      new Date()
    ) {
      return res
        .status(400)
        .json({
          message:
            "OTP expired. Request a new code.",
        });
    }

    if (
      otp.attempts >=
      OTP_MAX_ATTEMPTS
    ) {
      return res
        .status(429)
        .json({
          message:
            "Too many attempts. Request a new code.",
        });
    }

    const useTwilioVerify =
      channel === "PHONE" &&
      !usesDevelopmentPhoneOtp();

    if (useTwilioVerify) {
      const verification =
        await checkSmsOtp({
          to: target,
          code,
        });

      if (
        !verification.verified
      ) {
        if (
          isInvalidTwilioCode(
            verification.reason,
          )
        ) {
          await incrementAttempts(
            otp.id,
          );

          return res
            .status(400)
            .json({
              message:
                verification.reason ===
                "TWILIO_VERIFY_CHECK_MAX_ATTEMPTS_REACHED"
                  ? "Too many attempts. Request a new code."
                  : "Invalid code",
              reason:
                verification.reason,
            });
        }

        return res
          .status(502)
          .json({
            message:
              "Phone verification service is temporarily unavailable. Please try again.",
            reason:
              verification.reason ||
              "PHONE_VERIFICATION_FAILED",
          });
      }
    } else {
      const expected =
        hashOtp({
          intentId,
          channel,
          target,
          code,
        });

      if (
        expected !==
        otp.codeHash
      ) {
        await incrementAttempts(
          otp.id,
        );

        return res
          .status(400)
          .json({
            message:
              "Invalid code",
          });
      }
    }

    const verifiedAt =
      new Date();

    await prisma.$transaction(
      async (tx) => {
        await tx.otpCode.update({
          where: {
            id: otp.id,
          },
          data: {
            verifiedAt,
          },
        });

        if (
          channel === "EMAIL"
        ) {
          await tx.ownerIntent.update({
            where: {
              id: intentId,
            },
            data: {
              emailVerified:
                true,
              emailVerifiedAt:
                verifiedAt,
            },
          });
        } else {
          await tx.ownerIntent.update({
            where: {
              id: intentId,
            },
            data: {
              phoneVerified:
                true,
              phoneVerifiedAt:
                verifiedAt,
            },
          });
        }
      },
    );

    const updated =
      await prisma.ownerIntent.findUnique({
        where: {
          id: intentId,
        },
        select: {
          emailVerified:
            true,
          phoneVerified:
            true,
          emailVerifiedAt:
            true,
          phoneVerifiedAt:
            true,
        },
      });

    return res
      .status(200)
      .json({
        message:
          `${channel} OTP verified successfully`,
        channel,
        emailVerified:
          !!updated?.emailVerified,
        phoneVerified:
          !!updated?.phoneVerified,
        emailVerifiedAt:
          updated?.emailVerifiedAt ||
          null,
        phoneVerifiedAt:
          updated?.phoneVerifiedAt ||
          null,
      });
  } catch (err) {
    console.error(
      "verifyOtp error:",
      err,
    );

    return res
      .status(
        err.status ||
          500,
      )
      .json({
        message:
          err.message ||
          "Failed to verify OTP",
        reason:
          err.reason ||
          undefined,
      });
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
};
