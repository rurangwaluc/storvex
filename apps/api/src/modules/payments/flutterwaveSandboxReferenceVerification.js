"use strict";

const {
  requireFlutterwaveSandboxRuntime,
} = require("./flutterwaveSandboxRuntimeGate");

const {
  verifyFlutterwaveResult,
} = require("./flutterwaveVerification");

const API_URL =
  "https://api.flutterwave.com/v3/transactions/verify_by_reference";

async function verifySandboxPaymentByReference({
  reference,
  amount,
  currency,
  env = process.env,
  fetchImpl,
}) {
  requireFlutterwaveSandboxRuntime(env);

  if (
    typeof reference !== "string" ||
    !/^[A-Za-z0-9_-]{8,100}$/.test(reference) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    currency !== "RWF" ||
    typeof fetchImpl !== "function"
  ) {
    throw new Error("Invalid trusted payment verification inputs");
  }

  const url = new URL(API_URL);
  url.searchParams.set("tx_ref", reference);

  const response = await fetchImpl(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.FLUTTERWAVE_TEST_SECRET_KEY}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response?.ok) {
    return {
      verified: false,
      reason: "PROVIDER_VERIFICATION_UNAVAILABLE",
    };
  }

  const body = await response.json();

  return verifyFlutterwaveResult(body, {
    reference,
    amount,
    currency,
  });
}

module.exports = { verifySandboxPaymentByReference };
