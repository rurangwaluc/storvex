"use strict";

const {
  claimPendingPaymentInTransaction,
} = require("./atomicPaymentClaim");

const {
  assertVerifiedPaymentEvidence,
} = require("./paymentEvidenceIntegrity");

const {
  assertHistoricalRenewalQuote,
} = require("../billing/renewalQuoteIntegrity");

const {
  calculateRenewalPeriod,
} = require("../billing/renewalPeriod");

function reject(message) {
  const error = new Error(message);
  error.code = "PAYMENT_FINALIZATION_REJECTED";
  throw error;
}

/**
 * Test-only integration foundation.
 *
 * This service is NOT proof of provider payment verification.
 * Its caller must eventually load authoritative verification
 * evidence from trusted persistence.
 *
 * The activation callback must use the supplied transaction.
 * Never use a separate Prisma client inside that callback.
 */
async function finalizeVerifiedPayment({
  prisma,
  payment,
  attempt,
  applyActivation,
  runtimeMode = null,
}) {
  const offlineTest =
    process.env.NODE_ENV === "test" &&
    process.env.FLUTTERWAVE_LIVE_ENABLED !== "true";

  const sandboxRenewal =
    runtimeMode === "DEVELOPMENT_SANDBOX_RENEWAL" &&
    payment?.purpose === "SUBSCRIPTION_RENEWAL" &&
    attempt?.provider === "FLUTTERWAVE";

  if (!offlineTest) {
    if (!sandboxRenewal) {
      reject("Payment finalization not enabled for runtime use");
    }

    const {
      requireFlutterwaveSandboxRuntime,
    } = require("./flutterwaveSandboxRuntimeGate");

    requireFlutterwaveSandboxRuntime();
  }

  if (
    !prisma ||
    typeof prisma.$transaction !== "function" ||
    typeof applyActivation !== "function"
  ) {
    reject("Trusted transaction and activation callback required");
  }

  if (
    !payment ||
    !attempt ||
    payment.provider !== "FLUTTERWAVE" ||
    attempt.provider !== payment.provider ||
    attempt.paymentId !== payment.id ||
    attempt.status !== "VERIFIED" ||
    !(attempt.verifiedAt instanceof Date) ||
    Number.isNaN(attempt.verifiedAt.getTime()) ||
    attempt.appliedAt != null ||
    !Number.isSafeInteger(attempt.amount) ||
    attempt.amount <= 0 ||
    attempt.amount !== payment.amount ||
    attempt.currency !== payment.currency ||
    typeof attempt.providerTransactionId !== "string" ||
    !/^[0-9]+$/.test(attempt.providerTransactionId) ||
    typeof attempt.checkoutReference !== "string" ||
    !attempt.checkoutReference.trim() ||
    typeof attempt.id !== "string" ||
    !attempt.id.trim()
  ) {
    reject("Verified payment attempt mismatch");
  }

  return prisma.$transaction(async tx => {
    if (
      !tx.paymentAttempt ||
      typeof tx.paymentAttempt.updateMany !== "function"
    ) {
      reject("Payment attempt transaction model required");
    }

    // Re-read authoritative records inside this transaction.
    // Caller-supplied snapshots cannot substitute for database state.
    if (
      typeof tx.payment?.findUnique !== "function" ||
      typeof tx.paymentAttempt.findUnique !== "function"
    ) {
      reject("Trusted database record loaders required");
    }

    const storedPayment = await tx.payment.findUnique({
      where: { id: payment.id },
      select: {
        id: true,
        reference: true,
        provider: true,
        amount: true,
        currency: true,
        planKey: true,
        purpose: true,
        status: true,
      },
    });

    const storedAttempt = await tx.paymentAttempt.findUnique({
      where: { id: attempt.id },
      select: {
        id: true,
        paymentId: true,
        provider: true,
        checkoutReference: true,
        providerTransactionId: true,
        amount: true,
        currency: true,
        status: true,
        verifiedAt: true,
        appliedAt: true,
        verificationDetails: true,
      },
    });

    if (!storedPayment || !storedAttempt) {
      reject("Authoritative payment records missing");
    }

    const paymentFields = [
      "id", "reference", "provider", "amount",
      "currency", "planKey", "purpose",
    ];

    const attemptFields = [
      "id", "paymentId", "provider", "checkoutReference",
      "providerTransactionId", "amount", "currency",
    ];

    if (
      paymentFields.some(key => storedPayment[key] !== payment[key]) ||
      attemptFields.some(key => storedAttempt[key] !== attempt[key]) ||
      storedAttempt.status !== "VERIFIED" ||
      storedAttempt.appliedAt !== null ||
      !(storedAttempt.verifiedAt instanceof Date) ||
      Number.isNaN(storedAttempt.verifiedAt.getTime()) ||
      storedAttempt.paymentId !== storedPayment.id ||
      storedAttempt.provider !== storedPayment.provider ||
      storedAttempt.amount !== storedPayment.amount ||
      storedAttempt.currency !== storedPayment.currency
    ) {
      reject("Authoritative payment verification mismatch");
    }

    // Evidence must match authoritative records loaded inside
    // the same transaction, before any status changes.
    assertVerifiedPaymentEvidence(storedPayment, storedAttempt);

    // A conditional database claim prevents duplicate attempts
    // from applying the same parent Payment twice.
    const claim = await claimPendingPaymentInTransaction({
      tx,
      expected: {
        id: storedPayment.id,
        reference: storedPayment.reference,
        provider: storedPayment.provider,
        amount: storedPayment.amount,
        currency: storedPayment.currency,
        planKey: storedPayment.planKey,
        purpose: storedPayment.purpose,
      },
    });

    if (!claim.claimed) {
      // Do not label mismatched records as successfully paid.
      reject("Payment already claimed or financial details changed");
    }

    const appliedAt = new Date();

    const result = await tx.paymentAttempt.updateMany({
      where: {
        id: attempt.id,
        paymentId: payment.id,
        provider: payment.provider,
        checkoutReference: attempt.checkoutReference,
        providerTransactionId: attempt.providerTransactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: "VERIFIED",
        verifiedAt: { not: null },
        appliedAt: null,
      },
      data: {
        status: "APPLIED",
        appliedAt,
      },
    });

    if (result?.count !== 1) {
      reject("Verified attempt could not be claimed");
    }

    // Must use tx for every signup or renewal database write.
    const activation = await applyActivation({
      tx,
      payment: storedPayment,
      attempt: storedAttempt,
    });

    return {
      applied: true,
      reference: payment.reference,
      attemptId: attempt.id,
      activation,
    };
  });
}


/**
 * Apply an independently verified renewal exactly once.
 *
 * This inherits finalizeVerifiedPayment's offline-test-only guard.
 * Never invoke this with browser-supplied payment evidence.
 */
async function finalizeVerifiedRenewalPayment({
  prisma,
  payment,
  attempt,
  loadTrustedPlan,
}) {
  if (
    typeof loadTrustedPlan !== "function" ||
    payment?.purpose !== "SUBSCRIPTION_RENEWAL" ||
    typeof payment?.tenantId !== "string" ||
    !payment.tenantId.trim()
  ) {
    reject("Trusted renewal activation inputs required");
  }

  return finalizeVerifiedPayment({
    prisma,
    payment,
    attempt,
    runtimeMode: "DEVELOPMENT_SANDBOX_RENEWAL",
    applyActivation: async ({ tx, payment: claimedPayment }) => {
      const currentPayment = await tx.payment.findUnique({
        where: { id: claimedPayment.id },
      });

      if (
        !currentPayment ||
        currentPayment.tenantId !== payment.tenantId ||
        currentPayment.purpose !== "SUBSCRIPTION_RENEWAL" ||
        currentPayment.reference !== claimedPayment.reference ||
        currentPayment.planKey !== claimedPayment.planKey ||
        currentPayment.amount !== claimedPayment.amount ||
        currentPayment.currency !== claimedPayment.currency ||
        currentPayment.provider !== "FLUTTERWAVE"
      ) {
        reject("Authoritative renewal payment mismatch");
      }

      // STEP 342CN-U / SUBSCRIPTION ROW LOCK
      // Distinct verified payments must serialize their extensions.
      // Lock before reading the current subscription expiry.
      const lockedSubscription = await tx.$queryRaw`
        SELECT "id"
        FROM "Subscription"
        WHERE "tenantId" = ${currentPayment.tenantId}
        FOR UPDATE
      `;

      if (
        lockedSubscription.length !== 1 ||
        !lockedSubscription[0].id
      ) {
        reject("Renewal subscription not found");
      }

      const subscription = await tx.subscription.findUnique({
        where: { tenantId: currentPayment.tenantId },
      });

      if (
        !subscription ||
        subscription.id !== lockedSubscription[0].id
      ) {
        reject("Locked renewal subscription mismatch");
      }

      if (!subscription) {
        reject("Renewal subscription not found");
      }

      // STEP 342CN-N2 / VERIFIED MULTI-MONTH ACTIVATION
      // Read the purchased duration from the database payment row.
      const purchasedQuote = currentPayment.renewalQuote == null
        ? null
        : assertHistoricalRenewalQuote(currentPayment);

      const plan = await loadTrustedPlan(currentPayment);

      if (
        !plan ||
        plan.planKey !== currentPayment.planKey ||
        // Historical quoted purchases are validated against the
        // stored payment snapshot, not today's monthly price.
        (!purchasedQuote &&
          plan.price !== currentPayment.amount) ||
        plan.currency !== currentPayment.currency ||
        !Number.isSafeInteger(plan.graceDays) ||
        plan.graceDays < 0 ||
        !Number.isSafeInteger(plan.days) ||
        plan.days <= 0 ||
        // STEP 342CN-AU / HISTORICAL PLAN SNAPSHOT
        // Legacy renewals retain current-plan consistency checks.
        // Quoted purchases retain their immutable checkout terms.
        (!purchasedQuote && (
          plan.tierKey !== currentPayment.tierKey ||
          plan.cycleKey !== currentPayment.cycleKey ||
          plan.staffLimit !== currentPayment.staffLimit ||
          plan.branchLimit !== currentPayment.branchLimit
        )) ||
        (purchasedQuote && (
          typeof currentPayment.tierKey !== "string" ||
          !currentPayment.tierKey.trim() ||
          typeof currentPayment.cycleKey !== "string" ||
          !currentPayment.cycleKey.trim() ||
          !Number.isSafeInteger(currentPayment.staffLimit) ||
          currentPayment.staffLimit < 0 ||
          (currentPayment.branchLimit !== null &&
            (!Number.isSafeInteger(currentPayment.branchLimit) ||
             currentPayment.branchLimit < 0)) ||
          !currentPayment.entitlementSnapshot ||
          typeof currentPayment.entitlementSnapshot !== "object" ||
          Array.isArray(currentPayment.entitlementSnapshot)
        ))
      ) {
        reject("Stored renewal does not match trusted plan");
      }

      const {
        buildSuccessfulRenewalSubscriptionUpdate,
      } = require("../billing/subscriptionPlanTransition");

      const now = new Date();
      const existingEnd = subscription.endDate
        ? new Date(subscription.endDate)
        : null;

      const renewalStart =
        existingEnd &&
        Number.isFinite(existingEnd.getTime()) &&
        existingEnd > now
          ? existingEnd
          : now;

      const period = purchasedQuote
        ? calculateRenewalPeriod({
            now,
            currentEndDate: existingEnd,
            durationMonths: purchasedQuote.durationMonths,
            graceDays: plan.graceDays,
          })
        : null;

      const newEndDate = period
        ? period.end
        : new Date(renewalStart);

      if (!period) {
        newEndDate.setDate(newEndDate.getDate() + plan.days);
      }

      const graceEndDate = period
        ? period.graceEnd
        : new Date(newEndDate);

      if (!period) {
        graceEndDate.setDate(
          graceEndDate.getDate() + plan.graceDays
        );
      }

      const transition =
        buildSuccessfulRenewalSubscriptionUpdate({
          subscription,
          planSnapshot: {
            planKey: plan.planKey,
            tierKey: purchasedQuote
              ? currentPayment.tierKey
              : plan.tierKey,
            cycleKey: purchasedQuote
              ? currentPayment.cycleKey
              : plan.cycleKey,
            staffLimit: purchasedQuote
              ? currentPayment.staffLimit
              : plan.staffLimit,
            price: purchasedQuote
              ? purchasedQuote.monthlyAmount
              : plan.price,
            currency: plan.currency,
            // STEP 342CN-AS / PURCHASED ENTITLEMENT SNAPSHOT
            entitlements: purchasedQuote
              ? currentPayment.entitlementSnapshot
              : plan.entitlements,
          },
          branchLimit: purchasedQuote
            ? currentPayment.branchLimit
            : plan.branchLimit,
          renewalStart,
          newEndDate,
          graceEndDate,
          now,
        });

      // STEP 342CN-AD / EXACT QUEUED PAYMENT REFERENCE
      // Pin the queued trial plan to the payment that purchased it.
      // Clear stale queue identity on immediate paid activation.
      if (transition.queued) {
        transition.data.queuedRenewalReference =
          currentPayment.reference;
      } else {
        transition.data.queuedRenewalReference = null;
      }

      const updated = await tx.subscription.update({
        where: { tenantId: currentPayment.tenantId },
        data: transition.data,
      });

      return {
        tenantId: currentPayment.tenantId,
        queuedAfterTrial: transition.queued,
        planKey: plan.planKey,
        subscriptionId: updated.id,
      };
    },
  });
}

module.exports = {
  finalizeVerifiedPayment,
  finalizeVerifiedRenewalPayment,
};
