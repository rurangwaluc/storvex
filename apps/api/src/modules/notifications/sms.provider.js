// src/modules/notifications/sms.provider.js

function isDevEchoEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    String(process.env.DEV_OTP_ECHO || "false").toLowerCase() === "true"
  );
}

function normalizeRwToE164(phone) {
  const raw = String(phone || "")
    .trim()
    .replace(/[^\d]/g, "");

  if (!raw) return null;

  if (/^07\d{8}$/.test(raw)) {
    return `+250${raw.slice(1)}`;
  }

  if (/^2507\d{8}$/.test(raw)) {
    return `+${raw}`;
  }

  return null;
}

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const accountSid = String(
    process.env.TWILIO_ACCOUNT_SID || "",
  ).trim();

  const authToken = String(
    process.env.TWILIO_AUTH_TOKEN || "",
  ).trim();

  if (!accountSid || !authToken) {
    return null;
  }

  const twilio = require("twilio");

  twilioClient = twilio(
    accountSid,
    authToken,
  );

  return twilioClient;
}

function getVerifyServiceSid() {
  const serviceSid = String(
    process.env.TWILIO_VERIFY_SERVICE_SID || "",
  ).trim();

  return serviceSid || null;
}

function safeTwilioError(err) {
  return {
    message:
      err?.message ||
      "Twilio request failed",
    code:
      err?.code ||
      null,
    status:
      err?.status ||
      null,
    moreInfo:
      err?.moreInfo ||
      null,
  };
}

function logTwilioError(context, err) {
  try {
    console.error(
      `${context}:`,
      JSON.stringify(
        safeTwilioError(err),
        null,
        2,
      ),
    );
  } catch (_) {
    console.error(
      `${context}:`,
      err?.message ||
        "Twilio request failed",
    );
  }
}

function mapVerificationSendResult(result) {
  const status = String(
    result?.status || "",
  ).toLowerCase();

  const sentStatuses =
    new Set([
      "pending",
      "approved",
    ]);

  return {
    sent:
      sentStatuses.has(status),
    provider:
      "TWILIO_VERIFY",
    messageId:
      result?.sid ||
      null,
    status:
      result?.status ||
      null,
    reason:
      sentStatuses.has(status)
        ? null
        : "TWILIO_VERIFY_SEND_NOT_ACCEPTED",
  };
}

function mapVerificationCheckResult(result) {
  const status = String(
    result?.status || "",
  ).toLowerCase();

  const approved =
    status === "approved";

  return {
    verified:
      approved,
    provider:
      "TWILIO_VERIFY",
    messageId:
      result?.sid ||
      null,
    status:
      result?.status ||
      null,
    reason:
      approved
        ? null
        : "TWILIO_VERIFY_CODE_NOT_APPROVED",
  };
}

function twilioFailureReason(
  prefix,
  err,
) {
  if (err?.code === 20404) {
    return `${prefix}_NOT_FOUND`;
  }

  if (err?.code === 60200) {
    return `${prefix}_INVALID_PARAMETER`;
  }

  if (err?.code === 60202) {
    return `${prefix}_MAX_ATTEMPTS_REACHED`;
  }

  if (err?.code === 60203) {
    return `${prefix}_MAX_SEND_ATTEMPTS_REACHED`;
  }

  if (err?.code === 60205) {
    return `${prefix}_SMS_DELIVERY_DISABLED`;
  }

  return `${prefix}_FAILED${
    err?.code
      ? `_${err.code}`
      : ""
  }`;
}

async function startTwilioVerification({
  toE164,
}) {
  const client =
    getTwilioClient();

  const serviceSid =
    getVerifyServiceSid();

  if (!client) {
    return {
      sent: false,
      provider:
        "TWILIO_VERIFY",
      messageId: null,
      status: null,
      reason:
        "TWILIO_NOT_CONFIGURED",
    };
  }

  if (!serviceSid) {
    return {
      sent: false,
      provider:
        "TWILIO_VERIFY",
      messageId: null,
      status: null,
      reason:
        "TWILIO_VERIFY_SERVICE_NOT_CONFIGURED",
    };
  }

  try {
    const result =
      await client.verify.v2
        .services(serviceSid)
        .verifications.create({
          to: toE164,
          channel: "sms",
        });

    return mapVerificationSendResult(
      result,
    );
  } catch (err) {
    logTwilioError(
      "Twilio Verify send error",
      err,
    );

    return {
      sent: false,
      provider:
        "TWILIO_VERIFY",
      messageId: null,
      status: null,
      reason:
        twilioFailureReason(
          "TWILIO_VERIFY_SEND",
          err,
        ),
    };
  }
}

async function checkTwilioVerification({
  toE164,
  code,
}) {
  const client =
    getTwilioClient();

  const serviceSid =
    getVerifyServiceSid();

  if (!client) {
    return {
      verified: false,
      provider:
        "TWILIO_VERIFY",
      messageId: null,
      status: null,
      reason:
        "TWILIO_NOT_CONFIGURED",
    };
  }

  if (!serviceSid) {
    return {
      verified: false,
      provider:
        "TWILIO_VERIFY",
      messageId: null,
      status: null,
      reason:
        "TWILIO_VERIFY_SERVICE_NOT_CONFIGURED",
    };
  }

  try {
    const result =
      await client.verify.v2
        .services(serviceSid)
        .verificationChecks.create({
          to: toE164,
          code,
        });

    return mapVerificationCheckResult(
      result,
    );
  } catch (err) {
    logTwilioError(
      "Twilio Verify check error",
      err,
    );

    return {
      verified: false,
      provider:
        "TWILIO_VERIFY",
      messageId: null,
      status: null,
      reason:
        twilioFailureReason(
          "TWILIO_VERIFY_CHECK",
          err,
        ),
    };
  }
}

async function sendSmsOtp({
  to,
  code,
}) {
  if (isDevEchoEnabled()) {
    console.log(
      "DEV SMS OTP:",
      {
        to,
        code,
      },
    );

    return {
      sent: true,
      provider:
        "DEV_ECHO",
      messageId: null,
      status:
        "development",
      reason: null,
    };
  }

  const provider = String(
    process.env.SMS_PROVIDER ||
      "TWILIO",
  )
    .trim()
    .toUpperCase();

  const toE164 =
    normalizeRwToE164(to);

  if (!toE164) {
    return {
      sent: false,
      provider,
      messageId: null,
      status: null,
      reason:
        "INVALID_PHONE_FORMAT",
    };
  }

  if (provider === "TWILIO") {
    return startTwilioVerification({
      toE164,
    });
  }

  return {
    sent: false,
    provider,
    messageId: null,
    status: null,
    reason:
      `UNSUPPORTED_SMS_PROVIDER_${provider}`,
  };
}

async function checkSmsOtp({
  to,
  code,
}) {
  const provider = String(
    process.env.SMS_PROVIDER ||
      "TWILIO",
  )
    .trim()
    .toUpperCase();

  const toE164 =
    normalizeRwToE164(to);

  const cleanCode = String(
    code || "",
  )
    .trim()
    .replace(/[^\d]/g, "");

  if (!toE164) {
    return {
      verified: false,
      provider,
      messageId: null,
      status: null,
      reason:
        "INVALID_PHONE_FORMAT",
    };
  }

  if (!cleanCode) {
    return {
      verified: false,
      provider,
      messageId: null,
      status: null,
      reason:
        "INVALID_OTP_FORMAT",
    };
  }

  if (provider === "TWILIO") {
    return checkTwilioVerification({
      toE164,
      code: cleanCode,
    });
  }

  return {
    verified: false,
    provider,
    messageId: null,
    status: null,
    reason:
      `UNSUPPORTED_SMS_PROVIDER_${provider}`,
  };
}

module.exports = {
  sendSmsOtp,
  checkSmsOtp,
  __private: {
    isDevEchoEnabled,
    normalizeRwToE164,
    mapVerificationSendResult,
    mapVerificationCheckResult,
    twilioFailureReason,
  },
};
