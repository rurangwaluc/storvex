"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assertVerifiedPaymentEvidence,
} = require("../src/modules/payments/paymentEvidenceIntegrity");

function fixture() {
  const payment = {
    id: "payment-229",
    provider: "FLUTTERWAVE",
    status: "PENDING",
    amount: 10000,
    currency: "RWF",
  };

  const attempt = {
    id: "attempt-229",
    paymentId: payment.id,
    provider: "FLUTTERWAVE",
    status: "VERIFIED",
    amount: 10000,
    currency: "RWF",
    checkoutReference: "CHECKOUT_229",
    providerTransactionId: "229001",
    verifiedAt: new Date(),
    appliedAt: null,
    verificationDetails: {
      verificationSource: "FLUTTERWAVE_TRANSACTION_VERIFY",
      transactionId: 229001,
      reference: "CHECKOUT_229",
      amount: 10000,
      currency: "RWF",
    },
  };

  return { payment, attempt };
}

function invalid(payment, attempt) {
  assert.throws(
    () => assertVerifiedPaymentEvidence(payment, attempt),
    { code: "PAYMENT_EVIDENCE_INVALID" }
  );
}

test("1. Accepts matching persisted evidence", () => {
  const { payment, attempt } = fixture();
  const result = assertVerifiedPaymentEvidence(payment, attempt);

  assert.equal(result.transactionId, "229001");
  assert.equal(result.reference, "CHECKOUT_229");
});

test("2. Rejects missing verification evidence", () => {
  const { payment, attempt } = fixture();
  attempt.verificationDetails = null;
  invalid(payment, attempt);
});

test("3. Rejects incorrect transaction identity", () => {
  const { payment, attempt } = fixture();
  attempt.verificationDetails.transactionId = 999001;
  invalid(payment, attempt);
});

test("4. Rejects incorrect checkout reference", () => {
  const { payment, attempt } = fixture();
  attempt.verificationDetails.reference = "OTHER_CHECKOUT";
  invalid(payment, attempt);
});

test("5. Rejects different verified amount or currency", () => {
  const { payment, attempt } = fixture();

  attempt.verificationDetails.amount = 5000;
  invalid(payment, attempt);

  attempt.verificationDetails.amount = 10000;
  attempt.verificationDetails.currency = "USD";
  invalid(payment, attempt);
});

test("6. Rejects another payment's attempt", () => {
  const { payment, attempt } = fixture();
  attempt.paymentId = "different-payment";
  invalid(payment, attempt);
});

test("7. Rejects unverified or applied attempts", () => {
  const { payment, attempt } = fixture();

  attempt.status = "CREATED";
  invalid(payment, attempt);

  attempt.status = "VERIFIED";
  attempt.appliedAt = new Date();
  invalid(payment, attempt);
});

test("8. Rejects invalid verification timestamps", () => {
  const { payment, attempt } = fixture();
  attempt.verifiedAt = null;
  invalid(payment, attempt);
});

test("9. Rejects incorrect verification source", () => {
  const { payment, attempt } = fixture();
  attempt.verificationDetails.verificationSource = "USER_CALLBACK";
  invalid(payment, attempt);
});

test("10. Rejects invalid transaction identifiers", () => {
  const { payment, attempt } = fixture();
  attempt.verificationDetails.transactionId = "229001";
  invalid(payment, attempt);
});
