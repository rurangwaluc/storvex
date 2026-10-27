"use strict";

const {
  requireFlutterwaveSandboxRuntime,
} = require("./flutterwaveSandboxRuntimeGate");

const {
  requireSandboxInlineRuntime,
} = require("./flutterwaveSandboxInlineConfig");

const {
  verifySandboxPaymentByReference,
} = require("./flutterwaveSandboxReferenceVerification");

function reject(message) {
  const error = new Error(message);
  error.code = "SANDBOX_RENEWAL_VERIFICATION_REJECTED";
  throw error;
}

async function verifyAndRecordSandboxRenewal({
  prisma,
  reference,
  tenantId,
  fetchImpl,
  env = process.env,
}) {
  requireFlutterwaveSandboxRuntime(env);

  if (
    !prisma?.payment?.findUnique ||
    !prisma?.paymentAttempt?.findUnique ||
    typeof prisma.$transaction !== "function" ||
    typeof reference !== "string" ||
    !/^[A-Za-z0-9_-]{8,100}$/.test(reference) ||
    typeof tenantId !== "string" ||
    !tenantId.trim() ||
    typeof fetchImpl !== "function"
  ) {
    reject("Invalid trusted renewal verification inputs");
  }

  const payment = await prisma.payment.findUnique({
    where: { reference },
  });

  if (
    !payment ||
    payment.tenantId !== tenantId ||
    payment.provider !== "FLUTTERWAVE" ||
    payment.purpose !== "SUBSCRIPTION_RENEWAL" ||
    payment.status !== "PENDING" ||
    !Number.isSafeInteger(payment.amount) ||
    payment.amount <= 0 ||
    payment.currency !== "RWF"
  ) {
    reject("Payment unavailable for sandbox verification");
  }

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { checkoutReference: reference },
  });

  // An Inline reservation has no hosted checkout URL. Its method
  // must instead be identified by server-persisted attempt evidence.
  // A hosted reservation without its URL remains ineligible.
  const inlineReservation =
    attempt?.checkoutUrl == null &&
    attempt?.verificationDetails?.checkoutMethod ===
      "FLUTTERWAVE_SANDBOX_INLINE";

  if (
    !attempt ||
    attempt.paymentId !== payment.id ||
    attempt.checkoutReference !== payment.reference ||
    attempt.provider !== "FLUTTERWAVE" ||
    attempt.status !== "CREATED" ||
    attempt.amount !== payment.amount ||
    attempt.currency !== payment.currency ||
    (!attempt.checkoutUrl && !inlineReservation) ||
    attempt.providerTransactionId != null ||
    attempt.verifiedAt != null ||
    attempt.appliedAt != null
  ) {
    reject("Reserved payment attempt is not eligible");
  }

  // Even an existing Inline reservation must remain test-mode only.
  if (inlineReservation) {
    requireSandboxInlineRuntime(env);
  }

  // Only the server communicates with Flutterwave.
  // Browser redirect parameters are never payment evidence.
  const verification = await verifySandboxPaymentByReference({
    reference: payment.reference,
    amount: payment.amount,
    currency: payment.currency,
    env,
    fetchImpl,
  });

  if (!verification.verified) {
    return {
      verified: false,
      reference,
      reason: verification.reason,
    };
  }

  const result = await prisma.$transaction(async tx => {
    const currentPayment = await tx.payment.findUnique({
      where: { id: payment.id },
    });

    const currentAttempt = await tx.paymentAttempt.findUnique({
      where: { id: attempt.id },
    });

    if (
      !currentPayment ||
      !currentAttempt ||
      currentPayment.tenantId !== tenantId ||
      currentPayment.reference !== payment.reference ||
      currentPayment.provider !== payment.provider ||
      currentPayment.purpose !== payment.purpose ||
      currentPayment.planKey !== payment.planKey ||
      currentPayment.amount !== payment.amount ||
      currentPayment.currency !== payment.currency ||
      currentPayment.status !== "PENDING" ||
      currentAttempt.paymentId !== payment.id ||
      currentAttempt.checkoutReference !== reference ||
      currentAttempt.provider !== "FLUTTERWAVE" ||
      currentAttempt.status !== "CREATED" ||
      currentAttempt.amount !== payment.amount ||
      currentAttempt.currency !== payment.currency ||
      currentAttempt.checkoutUrl !== attempt.checkoutUrl ||
      (inlineReservation
        ? currentAttempt.verificationDetails?.checkoutMethod !==
            "FLUTTERWAVE_SANDBOX_INLINE"
        : !currentAttempt.checkoutUrl) ||
      currentAttempt.providerTransactionId != null ||
      currentAttempt.verifiedAt != null ||
      currentAttempt.appliedAt != null
    ) {
      reject("Payment changed during provider verification");
    }

    const update = await tx.paymentAttempt.updateMany({
      where: {
        id: attempt.id,
        paymentId: payment.id,
        provider: "FLUTTERWAVE",
        checkoutReference: reference,
        status: "CREATED",
        checkoutUrl: attempt.checkoutUrl,
        providerTransactionId: null,
        verifiedAt: null,
        appliedAt: null,
      },
      data: {
        status: "VERIFIED",
        providerTransactionId: String(
          verification.transactionId
        ),
        verifiedAt: new Date(),
        verificationDetails: {
          verificationSource:
            "FLUTTERWAVE_TRANSACTION_VERIFY",
          transactionId: verification.transactionId,
          reference: verification.reference,
          amount: verification.amount,
          currency: verification.currency,
        },
      },
    });

    if (update.count !== 1) {
      reject("Verified payment evidence was not recorded");
    }

    return {
      verified: true,
      paymentId: payment.id,
      attemptId: attempt.id,
      reference,
    };
  });

  return result;
}

module.exports = {
  verifyAndRecordSandboxRenewal,
};
