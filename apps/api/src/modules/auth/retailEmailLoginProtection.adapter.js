"use strict";

const NAMESPACE = "retail-email-login-v1";

function createRetailEmailLoginProtectionAdapter({
  loginProtection
}) {
  const methods = [
    "begin", "failed", "succeeded", "cancelled"
  ];

  if (
    !loginProtection ||
    methods.some(
      method => typeof loginProtection[method] !== "function"
    )
  ) {
    throw new TypeError(
      "Existing login protection implementation required."
    );
  }

  function validateIdentifier(identifier) {
    if (
      typeof identifier !== "string" ||
      !identifier.trim() ||
      identifier.length > 254
    ) {
      throw new TypeError("Valid login identifier required.");
    }

    return identifier.trim().toLowerCase();
  }

  function validateIp(ip) {
    if (typeof ip !== "string" || !ip.trim()) {
      throw new TypeError("Client IP required.");
    }

    return ip.trim();
  }

  async function begin({ identifier, ip }) {
    const normalizedIdentifier =
      validateIdentifier(identifier);

    const normalizedIp = validateIp(ip);

    // Existing shared account/IP reservation mechanism.
    // No independent limiter is introduced.
    const reservation = await loginProtection.begin({
      namespace: NAMESPACE,
      identifier: normalizedIdentifier,
      ip: normalizedIp
    });

    if (!reservation || typeof reservation !== "object") {
      throw new Error("Invalid login-protection reservation.");
    }

    let state = "open";

    async function finish(action) {
      if (state !== "open") {
        return false;
      }

      // Lock this in-process reservation before awaiting
      // asynchronous Redis-backed completion.
      state = "finalizing";

      try {
        await loginProtection[action](reservation);
        state = action;
        return true;
      } catch (error) {
        // Fail closed: never permit another finalization
        // after an uncertain external operation.
        state = "error";
        throw error;
      }
    }

    return Object.freeze({
      get state() {
        return state;
      },

      async failed() {
        return finish("failed");
      },

      async succeeded() {
        return finish("succeeded");
      },

      async cancelled() {
        return finish("cancelled");
      }
    });
  }

  return Object.freeze({
    begin,
    NAMESPACE
  });
}

module.exports = {
  createRetailEmailLoginProtectionAdapter,
  NAMESPACE
};
