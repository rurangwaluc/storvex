const crypto = require("crypto");

const ONBOARDING_TOKEN_HEADER = "x-storvex-onboarding-token";
const DEFAULT_TOKEN_TTL_HOURS = 24;

function cleanString(value) {
  const text = String(value || "").trim();
  return text || "";
}

function hashOnboardingToken(token) {
  const cleanToken = cleanString(token);

  if (!cleanToken) return "";

  return crypto
    .createHash("sha256")
    .update(cleanToken)
    .digest("hex");
}

function generateOnboardingAccess() {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashOnboardingToken(token);

  const configuredHours = Number(
    process.env.ONBOARDING_TOKEN_TTL_HOURS ||
      DEFAULT_TOKEN_TTL_HOURS,
  );

  const ttlHours =
    Number.isFinite(configuredHours) &&
    configuredHours > 0
      ? configuredHours
      : DEFAULT_TOKEN_TTL_HOURS;

  return {
    token,
    tokenHash,
    expiresAt: new Date(
      Date.now() +
        ttlHours * 60 * 60 * 1000,
    ),
  };
}

function getOnboardingTokenFromRequest(req) {
  return cleanString(
    req?.headers?.[
      ONBOARDING_TOKEN_HEADER
    ],
  );
}

function safeHashesEqual(left, right) {
  const leftBuffer = Buffer.from(
    cleanString(left),
    "utf8",
  );

  const rightBuffer = Buffer.from(
    cleanString(right),
    "utf8",
  );

  if (
    leftBuffer.length === 0 ||
    leftBuffer.length !==
      rightBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    leftBuffer,
    rightBuffer,
  );
}

function createOnboardingError(
  message,
  status,
  reason,
) {
  const error = new Error(message);
  error.status = status;
  error.reason = reason;
  return error;
}

function assertIntentCanContinue(intent) {
  if (!intent) {
    throw createOnboardingError(
      "This setup could not be found. Please start again.",
      404,
      "ONBOARDING_NOT_FOUND",
    );
  }

  if (
    intent.status === "CONSUMED" ||
    intent.onboardingTokenRevokedAt
  ) {
    throw createOnboardingError(
      "This setup has already been completed. Please log in.",
      403,
      "ONBOARDING_COMPLETED",
    );
  }

  const now = new Date();

  if (
    !intent.expiresAt ||
    intent.expiresAt < now ||
    !intent.onboardingTokenExpiresAt ||
    intent.onboardingTokenExpiresAt < now
  ) {
    throw createOnboardingError(
      "Your setup session ended for security. Please start again.",
      403,
      "ONBOARDING_EXPIRED",
    );
  }
}

function assertOnboardingAccess(
  req,
  intent,
) {
  assertIntentCanContinue(intent);

  const suppliedToken =
    getOnboardingTokenFromRequest(req);

  if (
    !suppliedToken ||
    !intent.onboardingTokenHash
  ) {
    throw createOnboardingError(
      "Your secure setup session is missing. Please start again.",
      401,
      "ONBOARDING_ACCESS_REQUIRED",
    );
  }

  const suppliedHash =
    hashOnboardingToken(
      suppliedToken,
    );

  if (
    !safeHashesEqual(
      suppliedHash,
      intent.onboardingTokenHash,
    )
  ) {
    throw createOnboardingError(
      "This secure setup session is no longer valid. Please start again.",
      401,
      "ONBOARDING_ACCESS_INVALID",
    );
  }

  return true;
}

function maskEmail(value) {
  const email = cleanString(value);

  if (!email.includes("@")) {
    return "";
  }

  const separator = email.lastIndexOf("@");
  const name = email.slice(0, separator);
  const domain = email.slice(separator + 1);

  const visibleStart = name.slice(
    0,
    Math.min(2, name.length),
  );

  const hiddenLength = Math.max(
    4,
    name.length - visibleStart.length,
  );

  return `${visibleStart}${"•".repeat(
    hiddenLength,
  )}@${domain}`;
}

function maskPhone(value) {
  const digits = String(value || "")
    .replace(/[^\d]/g, "");

  if (
    digits.startsWith("2507") &&
    digits.length === 12
  ) {
    return `+250 ${digits.slice(
      3,
      6,
    )} ••• ${digits.slice(-3)}`;
  }

  if (digits.length >= 7) {
    return `${digits.slice(
      0,
      4,
    )} ••• ${digits.slice(-3)}`;
  }

  return "";
}

function publicOnboardingError(
  error,
  fallbackMessage,
) {
  return {
    status:
      Number(error?.status) || 500,
    body: {
      message:
        error?.message ||
        fallbackMessage,
      reason:
        error?.reason ||
        undefined,
    },
  };
}

module.exports = {
  ONBOARDING_TOKEN_HEADER,
  assertIntentCanContinue,
  assertOnboardingAccess,
  generateOnboardingAccess,
  getOnboardingTokenFromRequest,
  hashOnboardingToken,
  maskEmail,
  maskPhone,
  publicOnboardingError,
  safeHashesEqual,
};
