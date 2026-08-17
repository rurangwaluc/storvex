"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  decryptCredential,
  encryptCredential,
  isEncryptedCredential,
} = require("../src/modules/whatsapp/whatsapp.credentials");

const KEY = Buffer.alloc(32, 7).toString("base64");

test("encrypts and decrypts a WhatsApp credential", () => {
  const encrypted = encryptCredential("secret-token", { key: KEY });
  assert.equal(isEncryptedCredential(encrypted), true);
  assert.equal(decryptCredential(encrypted, { key: KEY }), "secret-token");
  assert.equal(encrypted.includes("secret-token"), false);
});

test("uses a fresh IV for the same credential", () => {
  assert.notEqual(
    encryptCredential("same-token", { key: KEY }),
    encryptCredential("same-token", { key: KEY }),
  );
});

test("rejects tampered encrypted credentials", () => {
  const encrypted = encryptCredential("secret-token", { key: KEY });
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;
  assert.throws(
    () => decryptCredential(tampered, { key: KEY }),
    { code: "WHATSAPP_CREDENTIAL_DECRYPT_FAILED" },
  );
});

test("rejects malformed versioned envelopes", () => {
  assert.throws(
    () => decryptCredential("svx-wa:v1:bad", { key: KEY }),
    { code: "WHATSAPP_CREDENTIAL_ENVELOPE_INVALID" },
  );
});

test("fails closed when the encryption key is missing or invalid", () => {
  assert.throws(
    () => encryptCredential("secret-token", { key: "invalid" }),
    { code: "WHATSAPP_CREDENTIAL_KEY_INVALID" },
  );
});

test("detects and reads legacy plaintext only when explicitly permitted", () => {
  assert.equal(isEncryptedCredential("legacy-token"), false);
  assert.equal(decryptCredential("legacy-token"), "legacy-token");
  assert.throws(
    () => decryptCredential("legacy-token", { allowLegacy: false }),
    { code: "WHATSAPP_CREDENTIAL_ENVELOPE_REQUIRED" },
  );
});
