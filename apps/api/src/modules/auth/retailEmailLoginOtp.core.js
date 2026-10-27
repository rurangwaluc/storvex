"use strict";

const crypto = require("node:crypto");

const PURPOSE = "RETAIL_EMAIL_LOGIN_V1";
const CODE_PATTERN = /^\d{6}$/;

function normalizeEmail(email) {
  if (typeof email !== "string") {
    throw new TypeError("Email must be a string.");
  }

  const normalized = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+$/.test(normalized)) {
    throw new TypeError("Invalid email.");
  }

  return normalized;
}

function requireSecret(pepper) {
  if (
    typeof pepper !== "string" ||
    Buffer.byteLength(pepper, "utf8") < 32
  ) {
    throw new Error("Strong OTP signing secret required.");
  }
}

function generateCode() {
  return crypto.randomInt(0, 1000000)
    .toString()
    .padStart(6, "0");
}

function generateChallengeId() {
  return crypto.randomUUID();
}

function hashCode({
  userId,
  email,
  challengeId,
  code,
  pepper
}) {
  requireSecret(pepper);

  if (
    typeof userId !== "string" ||
    !userId.trim() ||
    typeof challengeId !== "string" ||
    !challengeId.trim() ||
    typeof code !== "string" ||
    !CODE_PATTERN.test(code)
  ) {
    throw new TypeError("Invalid OTP challenge fields.");
  }

  const payload = JSON.stringify({
    purpose: PURPOSE,
    userId,
    email: normalizeEmail(email),
    challengeId,
    code
  });

  return crypto.createHmac("sha256", pepper)
    .update(payload, "utf8")
    .digest("hex");
}

function verifyCode({
  expectedHash,
  ...fields
}) {
  if (
    typeof expectedHash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(expectedHash)
  ) {
    return false;
  }

  if (
    typeof fields.code !== "string" ||
    !CODE_PATTERN.test(fields.code)
  ) {
    return false;
  }

  const actual = Buffer.from(
    hashCode(fields),
    "hex"
  );

  const expected = Buffer.from(
    expectedHash,
    "hex"
  );

  return crypto.timingSafeEqual(actual, expected);
}

module.exports = {
  generateCode,
  generateChallengeId,
  hashCode,
  verifyCode,
  normalizeEmail
};
