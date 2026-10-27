"use strict";

const crypto = require("node:crypto");

const PURPOSE = "STORVEX_ACCOUNT_SIGNUP_V1";
const CODE_PATTERN = /^\d{6}$/;

function normalizeEmail(value) {
  if (typeof value !== "string") {
    throw new TypeError("Email must be a string.");
  }

  const email = value.trim().toLowerCase();

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+$/.test(email)
  ) {
    throw new TypeError("Invalid email.");
  }

  return email;
}

function normalizeFullName(value) {
  if (typeof value !== "string") {
    throw new TypeError("Full name must be a string.");
  }

  const name = value.trim().replace(/\s+/g, " ");

  if (name.length < 2 || name.length > 150) {
    throw new TypeError("Invalid full name.");
  }

  return name;
}

function generateCode() {
  return crypto.randomInt(0, 1000000)
    .toString()
    .padStart(6, "0");
}

function hashCode({
  accountId,
  email,
  challengeId,
  code,
  pepper
}) {
  if (
    typeof pepper !== "string" ||
    Buffer.byteLength(pepper, "utf8") < 32
  ) {
    throw new Error("Strong OTP secret required.");
  }

  if (
    typeof accountId !== "string" ||
    !accountId.trim() ||
    typeof challengeId !== "string" ||
    !challengeId.trim() ||
    typeof code !== "string" ||
    !CODE_PATTERN.test(code)
  ) {
    throw new TypeError("Invalid challenge.");
  }

  const payload = JSON.stringify({
    purpose: PURPOSE,
    accountId,
    email: normalizeEmail(email),
    challengeId,
    code
  });

  return crypto.createHmac("sha256", pepper)
    .update(payload, "utf8")
    .digest("hex");
}

function verifyCode({ expectedHash, ...fields }) {
  if (
    typeof expectedHash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(expectedHash) ||
    typeof fields.code !== "string" ||
    !CODE_PATTERN.test(fields.code)
  ) {
    return false;
  }

  const actual = Buffer.from(hashCode(fields), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return crypto.timingSafeEqual(actual, expected);
}

module.exports = {
  normalizeEmail,
  normalizeFullName,
  generateCode,
  hashCode,
  verifyCode
};
