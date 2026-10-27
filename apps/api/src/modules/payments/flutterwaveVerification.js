"use strict";

const API_ORIGIN = "https://api.flutterwave.com";

function verifyFlutterwaveResult(response, expected) {
  const data = response?.data;

  const validExpected =
    typeof expected?.reference === "string" &&
    expected.reference.trim().length > 0 &&
    typeof expected?.currency === "string" &&
    /^[A-Z]{3}$/.test(expected.currency) &&
    typeof expected.amount === "number" &&
    Number.isSafeInteger(expected.amount) &&
    expected.amount > 0;

  if (!validExpected) {
    throw new Error("Invalid expected payment record");
  }

  if (
    response?.status !== "success" ||
    !data ||
    typeof data !== "object" ||
    data.status !== "successful" ||
    data.tx_ref !== expected.reference ||
    data.currency !== expected.currency ||
    typeof data.amount !== "number" ||
    !Number.isFinite(data.amount) ||
    data.amount !== expected.amount ||
    !Number.isSafeInteger(data.id) ||
    data.id <= 0
  ) {
    return {
      verified: false,
      reason: "PAYMENT_VERIFICATION_FAILED",
    };
  }

  return {
    verified: true,
    transactionId: data.id,
    reference: data.tx_ref,
    amount: data.amount,
    currency: data.currency,
  };
}

async function verifyFlutterwaveTransaction({
  transactionId,
  expected,
  secretKey,
  fetchImpl,
}) {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.FLUTTERWAVE_LIVE_ENABLED === "true"
  ) {
    throw new Error(
      "Flutterwave verification service is not enabled for runtime use"
    );
  }

  if (
    typeof secretKey !== "string" ||
    !secretKey.startsWith("FLWSECK_TEST-")
  ) {
    throw new Error("Flutterwave test secret required");
  }

  if (
    !Number.isSafeInteger(transactionId) ||
    transactionId <= 0
  ) {
    throw new Error("Invalid transaction ID");
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("Explicit test transport required");
  }

  const response = await fetchImpl(
    `${API_ORIGIN}/v3/transactions/${transactionId}/verify`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
    }
  );

  if (!response?.ok) {
    return {
      verified: false,
      reason: "PROVIDER_VERIFICATION_UNAVAILABLE",
    };
  }

  const body = await response.json();

  const result = verifyFlutterwaveResult(body, expected);

  if (
    result.verified &&
    result.transactionId !== transactionId
  ) {
    return {
      verified: false,
      reason: "TRANSACTION_ID_MISMATCH",
    };
  }

  return result;
}

module.exports = {
  verifyFlutterwaveResult,
  verifyFlutterwaveTransaction,
};
