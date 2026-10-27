"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  generateCode,
  generateChallengeId,
  hashCode,
  verifyCode,
  normalizeEmail
} = require("../src/modules/auth/retailEmailLoginOtp.core");

const pepper = "test-only-secret-material-longer-than-thirty-two-bytes";

function challenge() {
  return {
    userId: "retail-user-1",
    email: "merchant@example.test",
    challengeId: generateChallengeId(),
    code: generateCode(),
    pepper
  };
}

test("generates six-digit secure-format OTP codes", () => {
  for (let index = 0; index < 100; index++) {
    assert.match(generateCode(), /^\d{6}$/);
  }
});

test("generates unique challenge identifiers", () => {
  assert.notEqual(
    generateChallengeId(),
    generateChallengeId()
  );
});

test("normalizes email identity", () => {
  assert.equal(
    normalizeEmail(" Merchant@Example.Test "),
    "merchant@example.test"
  );
});

test("verifies a matching purpose-bound challenge", () => {
  const input = challenge();
  const expectedHash = hashCode(input);

  assert.equal(expectedHash.length, 64);

  assert.equal(
    verifyCode({ ...input, expectedHash }),
    true
  );
});

test("rejects wrong OTP codes", () => {
  const input = challenge();
  const expectedHash = hashCode(input);

  const incorrectCode =
    input.code === "000000" ? "000001" : "000000";

  assert.equal(
    verifyCode({
      ...input,
      code: incorrectCode,
      expectedHash
    }),
    false
  );
});

test("binds OTP to retail user identity", () => {
  const input = challenge();
  const expectedHash = hashCode(input);

  assert.equal(
    verifyCode({
      ...input,
      userId: "different-retail-user",
      expectedHash
    }),
    false
  );
});

test("binds OTP to email destination", () => {
  const input = challenge();
  const expectedHash = hashCode(input);

  assert.equal(
    verifyCode({
      ...input,
      email: "another@example.test",
      expectedHash
    }),
    false
  );
});

test("binds OTP to challenge identifier", () => {
  const input = challenge();
  const expectedHash = hashCode(input);

  assert.equal(
    verifyCode({
      ...input,
      challengeId: generateChallengeId(),
      expectedHash
    }),
    false
  );
});

test("rejects malformed OTP codes", () => {
  const input = challenge();
  const expectedHash = hashCode(input);

  assert.equal(
    verifyCode({
      ...input,
      code: "12345",
      expectedHash
    }),
    false
  );
});

test("requires a strong OTP signing secret", () => {
  const input = challenge();

  assert.throws(
    () => hashCode({ ...input, pepper: "" })
  );
});
