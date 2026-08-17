"use strict";

const crypto = require("crypto");

const ENVELOPE_PREFIX = "svx-wa:v1";
const KEY_ENV = "WHATSAPP_CREDENTIAL_ENCRYPTION_KEY";

function credentialError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function readKey(value = process.env[KEY_ENV]) {
  const encoded = String(value || "").trim();
  let key;

  if (/^[a-f0-9]{64}$/i.test(encoded)) {
    key = Buffer.from(encoded, "hex");
  } else {
    try {
      key = Buffer.from(encoded, "base64");
    } catch {
      key = null;
    }
  }

  if (!key || key.length !== 32) {
    throw credentialError("WHATSAPP_CREDENTIAL_KEY_INVALID");
  }

  return key;
}

function isEncryptedCredential(value) {
  return String(value || "").startsWith(`${ENVELOPE_PREFIX}:`);
}

function encryptCredential(plaintext, options = {}) {
  const value = String(plaintext || "");
  if (!value) throw credentialError("WHATSAPP_CREDENTIAL_REQUIRED");

  const key = readKey(options.key);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENVELOPE_PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

function decryptCredential(value, options = {}) {
  const serialized = String(value || "");
  if (!isEncryptedCredential(serialized)) {
    if (options.allowLegacy === false) {
      throw credentialError("WHATSAPP_CREDENTIAL_ENVELOPE_REQUIRED");
    }
    return serialized;
  }

  const parts = serialized.split(":");
  if (parts.length !== 5 || parts[0] !== "svx-wa" || parts[1] !== "v1") {
    throw credentialError("WHATSAPP_CREDENTIAL_ENVELOPE_INVALID");
  }

  try {
    const key = readKey(options.key);
    const iv = Buffer.from(parts[2], "base64url");
    const tag = Buffer.from(parts[3], "base64url");
    const ciphertext = Buffer.from(parts[4], "base64url");

    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
      throw new Error("invalid envelope");
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error?.code === "WHATSAPP_CREDENTIAL_KEY_INVALID") throw error;
    throw credentialError("WHATSAPP_CREDENTIAL_DECRYPT_FAILED");
  }
}

module.exports = {
  ENVELOPE_PREFIX,
  KEY_ENV,
  decryptCredential,
  encryptCredential,
  isEncryptedCredential,
  __private: { readKey },
};
