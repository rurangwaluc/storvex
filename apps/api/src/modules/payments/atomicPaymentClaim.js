"use strict";

function invalid(message) {
  const error = new Error(message);
  error.code = "PAYMENT_CLAIM_INVALID";
  throw error;
}

/**
 * Must run inside the SAME Prisma transaction as the
 * corresponding subscription or signup activation.
 *
 * expected must come from independently verified provider
 * data combined with a trusted backend payment record.
 *
 * Never pass request.body directly as expected.
 */
async function claimPendingPaymentInTransaction({
  tx,
  expected,
}) {
  if (
    !tx?.payment ||
    typeof tx.payment.updateMany !== "function"
  ) {
    invalid("Prisma transaction client required");
  }

  if (
    !expected ||
    typeof expected.id !== "string" ||
    !expected.id.trim() ||
    typeof expected.reference !== "string" ||
    !expected.reference.trim() ||
    typeof expected.provider !== "string" ||
    !expected.provider.trim() ||
    !Number.isSafeInteger(expected.amount) ||
    expected.amount <= 0 ||
    expected.currency !== "RWF" ||
    typeof expected.planKey !== "string" ||
    !expected.planKey.trim() ||
    !["OWNER_SIGNUP", "SUBSCRIPTION_RENEWAL"].includes(
      expected.purpose
    )
  ) {
    invalid("Invalid verified payment expectations");
  }

  const result = await tx.payment.updateMany({
    where: {
      id: expected.id,
      reference: expected.reference,
      provider: expected.provider,
      amount: expected.amount,
      currency: expected.currency,
      planKey: expected.planKey,
      purpose: expected.purpose,
      status: "PENDING",
    },
    data: {
      status: "SUCCESS",
    },
  });

  if (
    !result ||
    !Number.isSafeInteger(result.count) ||
    result.count < 0 ||
    result.count > 1
  ) {
    invalid("Unexpected payment claim result");
  }

  return Object.freeze({
    claimed: result.count === 1,
    alreadyClaimedOrMismatched: result.count === 0,
    paymentId: expected.id,
    reference: expected.reference,
  });
}

module.exports = {
  claimPendingPaymentInTransaction,
};
