"use strict";

const {
  verifyFlutterwaveTransaction,
} = require("./flutterwaveVerification");

function reject(message) {
  const error = new Error(message);
  error.code = "PAYMENT_VERIFICATION_EVIDENCE_REJECTED";
  throw error;
}

async function recordVerifiedFlutterwaveAttempt({
  prisma,
  attemptId,
  transactionId,
  secretKey,
  fetchImpl,
}) {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.FLUTTERWAVE_LIVE_ENABLED === "true"
  ) {
    reject("Verification recording disabled outside tests");
  }

  if (
    !prisma?.paymentAttempt?.findUnique ||
    !prisma?.payment?.findUnique ||
    typeof prisma.$transaction !== "function" ||
    typeof attemptId !== "string" ||
    !attemptId.trim() ||
    !Number.isSafeInteger(transactionId) ||
    transactionId <= 0
  ) {
    reject("Invalid trusted verification inputs");
  }

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: attemptId },
  });

  if (
    !attempt ||
    attempt.provider !== "FLUTTERWAVE" ||
    attempt.status !== "CREATED" ||
    attempt.providerTransactionId != null ||
    attempt.verifiedAt != null ||
    attempt.appliedAt != null
  ) {
    reject("Payment attempt not eligible for verification");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: attempt.paymentId },
  });

  if (
    !payment ||
    payment.status !== "PENDING" ||
    payment.provider !== "FLUTTERWAVE" ||
    payment.id !== attempt.paymentId ||
    payment.amount !== attempt.amount ||
    payment.currency !== attempt.currency ||
    !Number.isSafeInteger(payment.amount) ||
    payment.amount <= 0 ||
    payment.currency !== "RWF" ||
    typeof attempt.checkoutReference !== "string" ||
    !attempt.checkoutReference.trim()
  ) {
    reject("Stored payment and attempt do not match");
  }

  // Provider verification occurs before opening a database transaction.
  // The existing service accepts only an explicit test transport.
  const verification = await verifyFlutterwaveTransaction({
    transactionId,
    expected: {
      reference: attempt.checkoutReference,
      amount: attempt.amount,
      currency: attempt.currency,
    },
    secretKey,
    fetchImpl,
  });

  if (!verification.verified) {
    reject("Flutterwave did not verify the exact payment");
  }

  return prisma.$transaction(async tx => {
    const [currentAttempt, currentPayment] = await Promise.all([
      tx.paymentAttempt.findUnique({
        where: { id: attemptId },
      }),
      tx.payment.findUnique({
        where: { id: payment.id },
      }),
    ]);

    if (
      !currentAttempt ||
      !currentPayment ||
      currentAttempt.paymentId !== payment.id ||
      currentAttempt.checkoutReference !== attempt.checkoutReference ||
      currentAttempt.amount !== attempt.amount ||
      currentAttempt.currency !== attempt.currency ||
      currentAttempt.provider !== attempt.provider ||
      currentAttempt.status !== "CREATED" ||
      currentAttempt.providerTransactionId != null ||
      currentAttempt.verifiedAt != null ||
      currentAttempt.appliedAt != null ||
      currentPayment.status !== "PENDING" ||
      currentPayment.reference !== payment.reference ||
      currentPayment.provider !== payment.provider ||
      currentPayment.planKey !== payment.planKey ||
      currentPayment.purpose !== payment.purpose ||
      currentPayment.amount !== payment.amount ||
      currentPayment.currency !== payment.currency
    ) {
      reject("Payment state changed during provider verification");
    }

    const updated = await tx.paymentAttempt.updateMany({
      where: {
        id: attemptId,
        paymentId: payment.id,
        provider: "FLUTTERWAVE",
        checkoutReference: attempt.checkoutReference,
        amount: attempt.amount,
        currency: attempt.currency,
        status: "CREATED",
        providerTransactionId: null,
        verifiedAt: null,
        appliedAt: null,
      },
      data: {
        status: "VERIFIED",
        providerTransactionId: String(verification.transactionId),
        verifiedAt: new Date(),
        verificationDetails: {
          verificationSource: "FLUTTERWAVE_TRANSACTION_VERIFY",
          transactionId: verification.transactionId,
          reference: verification.reference,
          amount: verification.amount,
          currency: verification.currency,
        },
      },
    });

    if (updated.count !== 1) {
      reject("Verification evidence could not be recorded");
    }

    return {
      recorded: true,
      attemptId,
      reference: attempt.checkoutReference,
      transactionId: String(verification.transactionId),
      status: "VERIFIED",
    };
  });
}

module.exports = {
  recordVerifiedFlutterwaveAttempt,
};
