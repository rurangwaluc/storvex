function toValidDate(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActiveTrial(subscription, now = new Date()) {
  const trialEndDate = toValidDate(subscription?.trialEndDate);

  return Boolean(
    String(subscription?.accessMode || "").toUpperCase() === "TRIAL" &&
      trialEndDate &&
      trialEndDate >= now,
  );
}

function hasTrialEnded(subscription, now = new Date()) {
  const trialEndDate = toValidDate(subscription?.trialEndDate);

  return Boolean(
    String(subscription?.accessMode || "").toUpperCase() === "TRIAL" &&
      trialEndDate &&
      trialEndDate < now,
  );
}

function buildSuccessfulRenewalSubscriptionUpdate({
  subscription,
  planSnapshot,
  branchLimit,
  renewalStart,
  newEndDate,
  graceEndDate,
  now = new Date(),
}) {
  if (!subscription) {
    throw new Error("Subscription is required");
  }

  if (!planSnapshot?.planKey) {
    throw new Error("Plan snapshot is required");
  }

  if (isActiveTrial(subscription, now)) {
    return {
      queued: true,
      data: {
        status: "ACTIVE",
        accessMode: "TRIAL",
        endDate: newEndDate,
        graceEndDate,
        readOnlySince: null,
        lastPaymentAt: now,
        renewedAt: now,
        nextPlanKey: planSnapshot.planKey,
      },
    };
  }

  return {
    queued: false,
    data: {
      status: "ACTIVE",
      accessMode: "ACTIVE",
      planKey: planSnapshot.planKey,
      tierKey: planSnapshot.tierKey,
      cycleKey: planSnapshot.cycleKey,
      staffLimit: planSnapshot.staffLimit,
      branchLimit,
      priceAmount: planSnapshot.price,
      currency: planSnapshot.currency,
      entitlementSnapshot: planSnapshot.entitlements || {},
      startDate: renewalStart,
      endDate: newEndDate,
      graceEndDate,
      readOnlySince: null,
      lastPaymentAt: now,
      renewedAt: now,
      nextPlanKey: null,
    },
  };
}

function buildQueuedPlanActivationUpdate({
  subscription,
  successfulRenewal,
  now = new Date(),
}) {
  const nextPlanKey = String(subscription?.nextPlanKey || "").trim();

  if (!nextPlanKey || !hasTrialEnded(subscription, now)) {
    return null;
  }

  if (
    !successfulRenewal ||
    String(successfulRenewal.planKey || "").trim() !== nextPlanKey
  ) {
    return null;
  }

  const trialEndDate = toValidDate(subscription.trialEndDate);

  return {
    status: "ACTIVE",
    accessMode: "ACTIVE",
    planKey: successfulRenewal.planKey,
    tierKey: successfulRenewal.tierKey,
    cycleKey: successfulRenewal.cycleKey,
    staffLimit: successfulRenewal.staffLimit,
    branchLimit: successfulRenewal.branchLimit,
    priceAmount: successfulRenewal.priceAmount,
    currency: successfulRenewal.currency,
    entitlementSnapshot: successfulRenewal.entitlementSnapshot || {},
    startDate: trialEndDate,
    readOnlySince: null,
    nextPlanKey: null,
  };
}

module.exports = {
  isActiveTrial,
  hasTrialEnded,
  buildSuccessfulRenewalSubscriptionUpdate,
  buildQueuedPlanActivationUpdate,
};
