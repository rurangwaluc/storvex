"use strict";

const crypto = require("node:crypto");
const {
  requireFlutterwaveSandboxRuntime,
} = require("./flutterwaveSandboxRuntimeGate");

function authenticateWebhook(req, env = process.env) {
  requireFlutterwaveSandboxRuntime(env);

  const secret = env.FLUTTERWAVE_TEST_WEBHOOK_SECRET_HASH;

  if (typeof secret !== "string" || secret.length < 24) {
    return { ok: false, status: 503 };
  }

  const supplied = req?.headers?.["verif-hash"];

  if (
    typeof supplied !== "string" ||
    supplied.length !== secret.length
  ) {
    return { ok: false, status: 401 };
  }

  const a = Buffer.from(secret);
  const b = Buffer.from(supplied);

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return { ok: false, status: 401 };
  }

  return { ok: true };
}

function parseWebhook(req) {
  if (!Buffer.isBuffer(req?.body)) {
    return null;
  }

  let payload;

  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object" ||
      Array.isArray(payload)) {
    return null;
  }

  const event = payload.event || payload.type;

  if (event !== "charge.completed") {
    return { relevant: false };
  }

  const data = payload.data;

  if (!data || typeof data !== "object" ||
      Array.isArray(data)) {
    return { relevant: false };
  }

  if (data.status !== "successful") {
    return { relevant: false };
  }

  const reference = data.tx_ref;

  if (
    typeof reference !== "string" ||
    !/^RENEW_[A-Za-z0-9_-]{2,94}$/.test(reference)
  ) {
    return { relevant: false };
  }

  return { relevant: true, reference };
}

module.exports = {
  authenticateWebhook,
  parseWebhook,
};
