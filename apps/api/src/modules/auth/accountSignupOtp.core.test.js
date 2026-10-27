"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeEmail,
  normalizeFullName,
  generateCode,
  hashCode,
  verifyCode
} = require("./accountSignupOtp.core");

const pepper = "a".repeat(64);

const fields = {
  accountId: "account-123",
  email: "owner@example.com",
  challengeId: "challenge-123",
  code: "012345",
  pepper
};

test("normalizes account email", () => {
  assert.equal(
    normalizeEmail(" OWNER@Example.COM "),
    "owner@example.com"
  );
});

test("rejects invalid email", () => {
  assert.throws(() => normalizeEmail("invalid"));
});

test("normalizes full name", () => {
  assert.equal(
    normalizeFullName("  Jane   Doe  "),
    "Jane Doe"
  );
});

test("rejects invalid full name", () => {
  assert.throws(() => normalizeFullName(" "));
});

test("generates a six-digit code", () => {
  assert.match(generateCode(), /^\d{6}$/);
});

test("verifies a correct signup code", () => {
  const expectedHash = hashCode(fields);

  assert.equal(
    verifyCode({ ...fields, expectedHash }),
    true
  );
});

test("rejects a wrong signup code", () => {
  const expectedHash = hashCode(fields);

  assert.equal(
    verifyCode({
      ...fields,
      code: "999999",
      expectedHash
    }),
    false
  );
});

test("binds code to account identity", () => {
  const expectedHash = hashCode(fields);

  assert.equal(
    verifyCode({
      ...fields,
      accountId: "another-account",
      expectedHash
    }),
    false
  );
});

test("binds code to challenge identity", () => {
  const expectedHash = hashCode(fields);

  assert.equal(
    verifyCode({
      ...fields,
      challengeId: "another-challenge",
      expectedHash
    }),
    false
  );
});

test("rejects weak OTP secrets", () => {
  assert.throws(() =>
    hashCode({ ...fields, pepper: "short" })
  );
});

test("rejects malformed verification codes", () => {
  assert.equal(
    verifyCode({
      ...fields,
      code: "123",
      expectedHash: hashCode(fields)
    }),
    false
  );
});
