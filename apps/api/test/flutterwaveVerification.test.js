"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  verifyFlutterwaveResult,
  verifyFlutterwaveTransaction,
} = require("../src/modules/payments/flutterwaveVerification");

const expected = {
  reference: "SVX_TEST_001",
  amount: 10000,
  currency: "RWF",
};

function providerResult(changes = {}) {
  return {
    status: "success",
    data: {
      id: 12345,
      tx_ref: expected.reference,
      amount: expected.amount,
      currency: expected.currency,
      status: "successful",
      ...changes,
    },
  };
}

test("1. Accepts matching verified transaction", () => {
  const result = verifyFlutterwaveResult(
    providerResult(),
    expected
  );

  assert.equal(result.verified, true);
  assert.equal(result.transactionId, 12345);
});

test("2. Rejects mismatched payment reference", () => {
  const result = verifyFlutterwaveResult(
    providerResult({ tx_ref: "OTHER_REFERENCE" }),
    expected
  );

  assert.equal(result.verified, false);
});

test("3. Rejects underpayment", () => {
  const result = verifyFlutterwaveResult(
    providerResult({ amount: 9000 }),
    expected
  );

  assert.equal(result.verified, false);
});

test("4. Rejects incorrect currency", () => {
  const result = verifyFlutterwaveResult(
    providerResult({ currency: "USD" }),
    expected
  );

  assert.equal(result.verified, false);
});

test("5. Rejects pending and failed transactions", () => {
  for (const status of ["pending", "failed", "cancelled"]) {
    const result = verifyFlutterwaveResult(
      providerResult({ status }),
      expected
    );

    assert.equal(result.verified, false);
  }
});

test("6. Rejects unsuccessful provider response", () => {
  const response = providerResult();
  response.status = "error";

  assert.equal(
    verifyFlutterwaveResult(response, expected).verified,
    false
  );
});

test("7. Rejects malformed or missing transaction data", () => {
  for (const value of [null, {}, { status: "success" }]) {
    assert.equal(
      verifyFlutterwaveResult(value, expected).verified,
      false
    );
  }
});

test("8. Requires a test key and explicit test transport", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  try {
    await assert.rejects(
      verifyFlutterwaveTransaction({
        transactionId: 12345,
        expected,
        secretKey: "FLWSECK_LIVE-INVALID",
        fetchImpl: async () => ({
          ok: true,
          json: async () => providerResult(),
        }),
      }),
      /test secret required/
    );

    await assert.rejects(
      verifyFlutterwaveTransaction({
        transactionId: 12345,
        expected,
        secretKey: "FLWSECK_TEST-FAKE",
      }),
      /Explicit test transport required/
    );
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("9. Rejects mismatched transaction ID", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  try {
    const result = await verifyFlutterwaveTransaction({
      transactionId: 99999,
      expected,
      secretKey: "FLWSECK_TEST-FAKE",
      fetchImpl: async () => ({
        ok: true,
        json: async () => providerResult(),
      }),
    });

    assert.equal(result.verified, false);
    assert.equal(result.reason, "TRANSACTION_ID_MISMATCH");
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("10. Accepts matching provider response via test transport", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";

  try {
    const result = await verifyFlutterwaveTransaction({
      transactionId: 12345,
      expected,
      secretKey: "FLWSECK_TEST-FAKE",
      fetchImpl: async () => ({
        ok: true,
        json: async () => providerResult(),
      }),
    });

    assert.equal(result.verified, true);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

// STEP 342CN-JP / PROVIDER STATUS CLASSIFICATION
test("Provider pending remains unresolved", () => {
  const result = verifyFlutterwaveResult(
    providerResult({ status: "pending" }),
    expected
  );

  assert.equal(result.verified, false);
  assert.equal(result.providerStatus, "PENDING");
  assert.equal(result.terminalFailure, false);
});

for (const status of ["failed", "cancelled"]) {
  test(`Explicit provider ${status} is distinguishable`, () => {
    const result = verifyFlutterwaveResult(
      providerResult({ status }),
      expected
    );

    assert.equal(result.verified, false);
    assert.equal(result.providerStatus, status.toUpperCase());
    assert.equal(result.terminalFailure, true);
  });
}

test("Mismatched failure cannot establish terminal failure", () => {
  const result = verifyFlutterwaveResult(
    providerResult({
      status: "failed",
      tx_ref: "WRONG_REFERENCE",
    }),
    expected
  );

  assert.equal(result.verified, false);
  assert.notEqual(result.terminalFailure, true);
});

test("Malformed response cannot establish terminal failure", () => {
  const result = verifyFlutterwaveResult(
    { status: "success", data: { status: "failed" } },
    expected
  );

  assert.equal(result.verified, false);
  assert.notEqual(result.terminalFailure, true);
});
