const crypto = require("crypto");

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_MINUTES = 20;

function cleanString(value, maxLength = 500) {
  const text = String(value || "").trim();

  if (!text) return null;

  return text.slice(0, maxLength);
}

function normalizeEmail(value) {
  const email = cleanString(value, 320);

  return email
    ? email.toLowerCase()
    : null;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || ""),
  );
}

function passwordProblems(value) {
  const password = String(value || "");
  const problems = [];

  if (password.length < 8) {
    problems.push(
      "Use at least 8 characters.",
    );
  }

  if (!/[a-z]/.test(password)) {
    problems.push(
      "Add a lowercase letter.",
    );
  }

  if (!/[A-Z]/.test(password)) {
    problems.push(
      "Add an uppercase letter.",
    );
  }

  if (!/[0-9]/.test(password)) {
    problems.push(
      "Add a number.",
    );
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    problems.push(
      "Add a symbol.",
    );
  }

  return problems;
}

function createResetToken() {
  return crypto
    .randomBytes(RESET_TOKEN_BYTES)
    .toString("base64url");
}

function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

function resetExpiry(
  now = new Date(),
) {
  return new Date(
    now.getTime() +
      RESET_TOKEN_MINUTES *
        60 *
        1000,
  );
}

function isUsableResetRecord(
  record,
  now = new Date(),
) {
  if (!record) return false;
  if (record.usedAt) return false;

  const expiresAt =
    new Date(record.expiresAt);

  if (
    Number.isNaN(
      expiresAt.getTime(),
    )
  ) {
    return false;
  }

  return expiresAt > now;
}

function frontendBaseUrl(req) {
  const configured = [
    process.env.MARKETPLACE_WEB_URL,
    process.env.WEB_URL,
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    process.env.CLIENT_URL,
  ]
    .map((value) =>
      cleanString(value, 1000),
    )
    .find(Boolean);

  if (configured) {
    return configured.replace(
      /\/+$/,
      "",
    );
  }

  const origin =
    cleanString(
      req?.headers?.origin,
      1000,
    );

  if (origin) {
    return origin.replace(
      /\/+$/,
      "",
    );
  }

  return "http://localhost:3000";
}

function getClientIp(req) {
  const forwarded =
    req?.headers?.[
      "x-forwarded-for"
    ];

  if (forwarded) {
    return String(forwarded)
      .split(",")[0]
      .trim()
      .slice(0, 200);
  }

  return req?.ip
    ? String(req.ip).slice(0, 200)
    : null;
}

module.exports = {
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
};
