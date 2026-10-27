"use strict";

const {
  requireFlutterwaveSandboxRuntime,
} = require("./flutterwaveSandboxRuntimeGate");

const {
  verifyAndRecordSandboxRenewal,
} = require("./flutterwaveSandboxVerifiedRenewal");

const {
  finalizeVerifiedRenewalPayment,
} = require("./verifiedPaymentFinalization");

function reject(message) {
  const error = new Error(message);
  error.code = "SANDBOX_RENEWAL_COMPLETION_REJECTED";
  throw error;
}

async function completeSandboxRenewal({
  prisma,
  reference,
  tenantId,
  loadTrustedPlan,
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
    typeof loadTrustedPlan !== "function" ||
    typeof fetchImpl !== "function"
  ) {
    reject("Trusted renewal completion inputs required");
  }

  async function load() {
    const payment = await prisma.payment.findUnique({
      where: { reference },
    });

    if (
      !payment ||
      payment.tenantId !== tenantId ||
      payment.provider !== "FLUTTERWAVE" ||
      payment.purpose !== "SUBSCRIPTION_RENEWAL"
    ) {
      reject("Renewal payment not found");
    }

    const attempt = await prisma.paymentAttempt.findUnique({
      where: { checkoutReference: reference },
    });

    if (
      !attempt ||
      attempt.paymentId !== payment.id ||
      attempt.provider !== "FLUTTERWAVE" ||
      attempt.checkoutReference !== payment.reference ||
      attempt.amount !== payment.amount ||
      attempt.currency !== payment.currency
    ) {
      reject("Renewal payment attempt mismatch");
    }

    return { payment, attempt };
  }

  let { payment, attempt } = await load();

  // A completed transaction is never activated again.
  if (
    payment.status === "SUCCESS" &&
    attempt.status === "APPLIED" &&
    attempt.appliedAt instanceof Date
  ) {
    return {
      status: "SUCCESS",
      reference,
      alreadyCompleted: true,
    };
  }

  if (payment.status !== "PENDING") {
    reject("Payment is not eligible for completion");
  }

  if (attempt.status === "CREATED") {
    const verification = await verifyAndRecordSandboxRenewal({
      prisma,
      reference,
      tenantId,
      fetchImpl,
      env,
    });

    if (!verification.verified) {
      return {
        status: "PENDING",
        reference,
        verified: false,
        reason: verification.reason,
      };
    }

    // Verification evidence is now persisted. Reload it rather
    // than treating the provider response as database evidence.
    ({ payment, attempt } = await load());
  }

  if (
    payment.status !== "PENDING" ||
    attempt.status !== "VERIFIED" ||
    !(attempt.verifiedAt instanceof Date) ||
    attempt.appliedAt != null
  ) {
    reject("Payment cannot proceed to verified finalization");
  }

  const finalization = await finalizeVerifiedRenewalPayment({
    prisma,
    payment,
    attempt,
    loadTrustedPlan,
  });

  return {
    status: "SUCCESS",
    reference,
    alreadyCompleted: false,
    activation: finalization.activation,
  };
}

module.exports = { completeSandboxRenewal };
