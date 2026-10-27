"use strict";

function assertVerifiedPaymentEvidence(payment, attempt) {
  const evidence = attempt?.verificationDetails;

  if (
    !payment ||
    !attempt ||
    !evidence ||
    typeof evidence !== "object" ||
    Array.isArray(evidence) ||
    payment.id !== attempt.paymentId ||
    payment.provider !== "FLUTTERWAVE" ||
    attempt.provider !== "FLUTTERWAVE" ||
    payment.status !== "PENDING" ||
    attempt.status !== "VERIFIED" ||
    attempt.appliedAt != null ||
    !(attempt.verifiedAt instanceof Date) ||
    !Number.isFinite(attempt.verifiedAt.getTime()) ||
    !Number.isSafeInteger(payment.amount) ||
    payment.amount <= 0 ||
    payment.currency !== "RWF" ||
    attempt.amount !== payment.amount ||
    attempt.currency !== payment.currency ||
    evidence.verificationSource !==
      "FLUTTERWAVE_TRANSACTION_VERIFY" ||
    !Number.isSafeInteger(evidence.transactionId) ||
    evidence.transactionId <= 0 ||
    String(evidence.transactionId) !==
      attempt.providerTransactionId ||
    typeof attempt.checkoutReference !== "string" ||
    !attempt.checkoutReference.trim() ||
    evidence.reference !== attempt.checkoutReference ||
    evidence.amount !== payment.amount ||
    evidence.currency !== payment.currency
  ) {
    const error = new Error(
      "Persisted provider verification evidence mismatch"
    );
    error.code = "PAYMENT_EVIDENCE_INVALID";
    throw error;
  }

  return Object.freeze({
    paymentId: payment.id,
    attemptId: attempt.id,
    transactionId: attempt.providerTransactionId,
    reference: attempt.checkoutReference,
    amount: payment.amount,
    currency: payment.currency,
  });
}

module.exports = { assertVerifiedPaymentEvidence };
