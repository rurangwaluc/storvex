"use strict";

const {
  requireFlutterwaveSandboxRuntime,
} = require("./flutterwaveSandboxRuntimeGate");

const {
  validateRenewalCheckout,
} = require("./flutterwaveSandboxCheckoutAdapter");

const {
  requireSandboxInlineRuntime,
} = require("./flutterwaveSandboxInlineConfig");

function reject(message) {
  const error = new Error(message);
  error.code = "CHECKOUT_RESERVATION_REJECTED";
  error.status = 409;
  throw error;
}

/**
 * Reserve exactly one checkout attempt for an existing payment.
 *
 * Does not contact Flutterwave or activate subscriptions.
 *
 * identity, plan and customer must originate from trusted
 * server-side authentication and billing services.
 *
 * The database must enforce unique checkoutReference values.
 */
async function reserveSandboxRenewalCheckout({
  prisma,
  transaction = null,
  reference,
  identity,
  plan,
  customer,
  returnUrl,
  checkoutMethod = "FLUTTERWAVE_SANDBOX",
  env = process.env,
}) {
  requireFlutterwaveSandboxRuntime(env);

  if (
    checkoutMethod !== "FLUTTERWAVE_SANDBOX" &&
    checkoutMethod !== "FLUTTERWAVE_SANDBOX_INLINE"
  ) {
    reject("Unsupported checkout reservation method");
  }

  const isInline = checkoutMethod === "FLUTTERWAVE_SANDBOX_INLINE";

  if (isInline) {
    requireSandboxInlineRuntime(env);
  }

  if (
    !prisma ||
    typeof prisma.$transaction !== "function" ||
    typeof reference !== "string" ||
    !/^[A-Za-z0-9_-]{8,100}$/.test(reference)
  ) {
    reject("Invalid checkout reservation inputs");
  }

  try {
    const reserve = async (tx) => {
      if (
        typeof tx.payment?.findUnique !== "function" ||
        typeof tx.paymentAttempt?.create !== "function"
      ) {
        reject("Trusted payment transaction required");
      }

      const payment = await tx.payment.findUnique({
        where: { reference },
      });

      if (!payment || payment.reference !== reference) {
        reject("Payment not found");
      }

      const trusted = validateRenewalCheckout({
        payment,
        identity,
        plan,
        customer,
        returnUrl,
      });

      // One immutable checkout reference per parent payment.
      // Concurrent duplicates are rejected by the database's
      // existing checkoutReference unique constraint.
      const attempt = await tx.paymentAttempt.create({
        data: {
          paymentId: payment.id,
          provider: "FLUTTERWAVE",
          checkoutReference: payment.reference,
          status: "CREATED",
          amount: payment.amount,
          currency: payment.currency,
          ...(isInline
            ? {
                verificationDetails: {
                  checkoutMethod: "FLUTTERWAVE_SANDBOX_INLINE",
                },
              }
            : {}),
        },
        select: {
          id: true,
          paymentId: true,
          provider: true,
          checkoutReference: true,
          status: true,
          amount: true,
          currency: true,
          checkoutUrl: true,
        },
      });

      if (
        !attempt ||
        attempt.paymentId !== payment.id ||
        attempt.checkoutReference !== payment.reference ||
        attempt.provider !== "FLUTTERWAVE" ||
        attempt.status !== "CREATED" ||
        attempt.amount !== payment.amount ||
        attempt.currency !== payment.currency
      ) {
        reject("Checkout reservation mismatch");
      }

      return {
        paymentId: payment.id,
        attemptId: attempt.id,
        reference: trusted.reference,
        amount: trusted.amount,
        currency: trusted.currency,
        status: "CREATED",
      };
    };

    if (transaction) {
      if (
        typeof transaction.payment?.findUnique !== "function" ||
        typeof transaction.paymentAttempt?.create !== "function"
      ) {
        reject("Trusted checkout transaction required");
      }

      return await reserve(transaction);
    }

    return await prisma.$transaction(reserve);
  } catch (error) {
    if (error?.code === "P2002") {
      reject("Checkout already reserved for this payment");
    }

    throw error;
  }
}

module.exports = {
  reserveSandboxRenewalCheckout,
};
