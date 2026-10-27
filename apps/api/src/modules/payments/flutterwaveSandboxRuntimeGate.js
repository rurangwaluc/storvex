"use strict";

function reject() {
  const error = new Error(
    "Flutterwave sandbox checkout is unavailable."
  );
  error.status = 503;
  error.code = "FLUTTERWAVE_SANDBOX_DISABLED";
  throw error;
}

/**
 * Gate for a future development-only sandbox checkout adapter.
 *
 * This module makes no network or database requests.
 * It does not authorize payment success or subscription access.
 */
function requireFlutterwaveSandboxRuntime(env = process.env) {
  if (!env || typeof env !== "object") {
    reject();
  }

  if (env.NODE_ENV !== "development") {
    reject();
  }

  if (env.FLUTTERWAVE_SANDBOX_CHECKOUT_ENABLED !== "true") {
    reject();
  }

  if (env.FLUTTERWAVE_LIVE_ENABLED === "true") {
    reject();
  }

  const key = env.FLUTTERWAVE_TEST_SECRET_KEY;

  if (
    typeof key !== "string" ||
    !/^FLWSECK_TEST-[^\s]+$/.test(key)
  ) {
    reject();
  }

  return true;
}

module.exports = {
  requireFlutterwaveSandboxRuntime,
};
