const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveSubscriptionAccess,
} = require("../src/modules/billing/subscriptionAccess");

const {
  buildEntitlementSnapshot,
  resolveSubscriptionEntitlements,
  serializeSubscriptionEntitlements,
} = require("../src/modules/billing/subscriptionEntitlements");

const {
  computeBranchUsage,
} = require("../src/modules/branches/branches.service");

const {
  isBillableRole,
} = require("../src/middlewares/enforceStaffSeatLimit");

const NOW = new Date("2026-07-16T10:00:00.000Z");

function date(value) {
  return new Date(value);
}

function baseSubscription(overrides = {}) {
  return {
    status: "ACTIVE",
    accessMode: "ACTIVE",
    endDate: date("2026-08-16T10:00:00.000Z"),
    trialEndDate: null,
    graceEndDate: null,
    readOnlySince: null,
    ...overrides,
  };
}

test("returns no access when no subscription exists", () => {
  const result = resolveSubscriptionAccess({
    tenantStatus: "ACTIVE",
    subscription: null,
    now: NOW,
  });

  assert.equal(result.mode, "NO_SUBSCRIPTION");
  assert.equal(result.canRead, false);
  assert.equal(result.canOperate, false);
});

test("allows an active trial", () => {
  const result = resolveSubscriptionAccess({
    tenantStatus: "ACTIVE",
    subscription: baseSubscription({
      accessMode: "TRIAL",
      trialEndDate: date("2026-07-30T10:00:00.000Z"),
      endDate: date("2026-07-30T10:00:00.000Z"),
    }),
    now: NOW,
  });

  assert.equal(result.mode, "TRIAL");
  assert.equal(result.canRead, true);
  assert.equal(result.canOperate, true);
  assert.equal(result.daysLeft, 14);
});

test("allows an active paid subscription", () => {
  const result = resolveSubscriptionAccess({
    tenantStatus: "ACTIVE",
    subscription: baseSubscription(),
    now: NOW,
  });

  assert.equal(result.mode, "ACTIVE");
  assert.equal(result.canRead, true);
  assert.equal(result.canOperate, true);
  assert.equal(result.daysLeft, 31);
});

test("keeps expired subscriptions readable during grace", () => {
  const result = resolveSubscriptionAccess({
    tenantStatus: "ACTIVE",
    subscription: baseSubscription({
      endDate: date("2026-07-15T10:00:00.000Z"),
      graceEndDate: date("2026-07-20T10:00:00.000Z"),
    }),
    now: NOW,
  });

  assert.equal(result.mode, "READ_ONLY");
  assert.equal(result.canRead, true);
  assert.equal(result.canOperate, false);
  assert.equal(result.daysLeft, 4);
});

test("keeps fully expired subscriptions readable but not writable", () => {
  const result = resolveSubscriptionAccess({
    tenantStatus: "ACTIVE",
    subscription: baseSubscription({
      status: "EXPIRED",
      accessMode: "READ_ONLY",
      endDate: date("2026-07-01T10:00:00.000Z"),
      graceEndDate: date("2026-07-08T10:00:00.000Z"),
    }),
    now: NOW,
  });

  assert.equal(result.mode, "READ_ONLY");
  assert.equal(result.canRead, true);
  assert.equal(result.canOperate, false);
  assert.equal(result.daysLeft, 0);
});

test("blocks suspended tenants completely", () => {
  const result = resolveSubscriptionAccess({
    tenantStatus: "SUSPENDED",
    subscription: baseSubscription(),
    now: NOW,
  });

  assert.equal(result.mode, "SUSPENDED");
  assert.equal(result.canRead, false);
  assert.equal(result.canOperate, false);
});

test("reports invalid subscription dates as a data error", () => {
  const result = resolveSubscriptionAccess({
    tenantStatus: "ACTIVE",
    subscription: baseSubscription({
      endDate: "not-a-date",
    }),
    now: NOW,
  });

  assert.equal(result.mode, "DATA_ERROR");
  assert.equal(result.canRead, false);
  assert.equal(result.canOperate, false);
});

test("preserves purchased historic entitlement snapshots", () => {
  const historicSnapshot = {
    planLevel: "GROWTH",
    marketplaceEnabled: true,
    reportingLevel: "ADVANCED",
    customHistoricFlag: true,
  };

  const resolved = resolveSubscriptionEntitlements({
    planKey: "LAUNCH_STARTER",
    entitlementSnapshot: historicSnapshot,
  });

  assert.deepEqual(resolved, historicSnapshot);
  assert.notStrictEqual(resolved, historicSnapshot);
});

test("builds entitlement snapshots from direct plan data", () => {
  const direct = {
    marketplaceEnabled: true,
    imageStudioEnabled: false,
  };

  const snapshot = buildEntitlementSnapshot({
    key: "CUSTOM_TEST",
    entitlements: direct,
  });

  assert.deepEqual(snapshot, direct);
  assert.notStrictEqual(snapshot, direct);
});

test("always preserves Marketplace safety rules", () => {
  const serialized = serializeSubscriptionEntitlements({
    entitlementSnapshot: {
      marketplaceEnabled: true,
      marketplaceCommissionEnabled: true,
      sellerManagedDelivery: false,
      deliveryAreaLimit: 2,
      marketplaceOrderLimit: 10,
    },
  });

  assert.equal(serialized.marketplaceEnabled, true);
  assert.equal(serialized.marketplaceCommissionEnabled, false);
  assert.equal(serialized.sellerManagedDelivery, true);
  assert.equal(serialized.deliveryAreaLimit, null);
  assert.equal(serialized.marketplaceOrderLimit, null);
});

test("computes available branch capacity", () => {
  const usage = computeBranchUsage(
    {
      branchLimit: 2,
      extraBranchCount: 1,
    },
    2,
  );

  assert.equal(usage.includedBranchLimit, 2);
  assert.equal(usage.extraBranchCount, 1);
  assert.equal(usage.effectiveBranchLimit, 3);
  assert.equal(usage.activeBranches, 2);
  assert.equal(usage.atLimit, false);
  assert.equal(usage.overLimit, false);
  assert.equal(usage.canAddBranch, true);
});

test("detects an over-branch downgrade without removing branches", () => {
  const usage = computeBranchUsage(
    {
      branchLimit: 1,
      extraBranchCount: 0,
    },
    3,
  );

  assert.equal(usage.activeBranches, 3);
  assert.equal(usage.effectiveBranchLimit, 1);
  assert.equal(usage.atLimit, true);
  assert.equal(usage.overLimit, true);
  assert.equal(usage.canAddBranch, false);
});

test("treats null branch limits as unlimited", () => {
  const usage = computeBranchUsage(
    {
      branchLimit: null,
      extraBranchCount: 0,
    },
    20,
  );

  assert.equal(usage.includedBranchLimit, null);
  assert.equal(usage.extraBranchCount, 0);
  assert.equal(usage.activeBranches, 20);
  assert.equal(usage.effectiveBranchLimit, null);
  assert.equal(usage.overLimit, false);
  assert.equal(usage.atLimit, false);
  assert.equal(usage.canAddBranch, true);
});

test("counts only store-operation roles as staff seats", () => {
  [
    "OWNER",
    "MANAGER",
    "CASHIER",
    "SELLER",
    "STOREKEEPER",
    "TECHNICIAN",
  ].forEach((role) => {
    assert.equal(isBillableRole(role), true, `${role} should use a seat`);
  });

  [
    "PLATFORM_OWNER",
    "PLATFORM_ADMIN",
    "PLATFORM_SUPPORT",
    "",
    null,
  ].forEach((role) => {
    assert.equal(
      isBillableRole(role),
      false,
      `${String(role)} should not use a tenant seat`,
    );
  });
});

const {
  isActiveTrial,
  hasTrialEnded,
  buildSuccessfulRenewalSubscriptionUpdate,
  buildQueuedPlanActivationUpdate,
} = require("../src/modules/billing/subscriptionPlanTransition");

function growthTrial(overrides = {}) {
  return {
    tenantId: "tenant-1",
    status: "ACTIVE",
    accessMode: "TRIAL",
    planKey: "LAUNCH_GROWTH",
    tierKey: "GROWTH",
    cycleKey: "MONTHLY",
    staffLimit: 5,
    branchLimit: 2,
    priceAmount: 20000,
    currency: "RWF",
    entitlementSnapshot: {
      planLevel: "GROWTH",
    },
    startDate: date("2026-07-01T10:00:00.000Z"),
    endDate: date("2026-07-31T10:00:00.000Z"),
    trialStartDate: date("2026-07-01T10:00:00.000Z"),
    trialEndDate: date("2026-07-31T10:00:00.000Z"),
    graceEndDate: null,
    nextPlanKey: null,
    ...overrides,
  };
}

const STARTER_SNAPSHOT = {
  planKey: "LAUNCH_STARTER",
  tierKey: "STARTER",
  cycleKey: "MONTHLY",
  staffLimit: 2,
  branchLimit: 1,
  price: 10000,
  currency: "RWF",
  entitlements: {
    planLevel: "STARTER",
  },
};

test("recognizes an active trial and an ended trial", () => {
  const activeTrial = growthTrial();

  assert.equal(
    isActiveTrial(activeTrial, date("2026-07-16T10:00:00.000Z")),
    true,
  );

  assert.equal(
    hasTrialEnded(activeTrial, date("2026-08-01T10:00:00.000Z")),
    true,
  );
});

test("queues Starter payment without replacing an active Growth trial", () => {
  const now = date("2026-07-16T10:00:00.000Z");
  const newEndDate = date("2026-08-30T10:00:00.000Z");

  const result = buildSuccessfulRenewalSubscriptionUpdate({
    subscription: growthTrial(),
    planSnapshot: STARTER_SNAPSHOT,
    branchLimit: 1,
    renewalStart: date("2026-07-31T10:00:00.000Z"),
    newEndDate,
    graceEndDate: date("2026-09-02T10:00:00.000Z"),
    now,
  });

  assert.equal(result.queued, true);
  assert.equal(result.data.accessMode, "TRIAL");
  assert.equal(result.data.nextPlanKey, "LAUNCH_STARTER");
  assert.equal(result.data.endDate, newEndDate);
  assert.equal("planKey" in result.data, false);
  assert.equal("staffLimit" in result.data, false);
  assert.equal("entitlementSnapshot" in result.data, false);
});

test("activates a paid plan immediately when no trial remains active", () => {
  const result = buildSuccessfulRenewalSubscriptionUpdate({
    subscription: growthTrial({
      accessMode: "READ_ONLY",
      trialEndDate: date("2026-07-01T10:00:00.000Z"),
    }),
    planSnapshot: STARTER_SNAPSHOT,
    branchLimit: 1,
    renewalStart: date("2026-07-16T10:00:00.000Z"),
    newEndDate: date("2026-08-15T10:00:00.000Z"),
    graceEndDate: date("2026-08-18T10:00:00.000Z"),
    now: NOW,
  });

  assert.equal(result.queued, false);
  assert.equal(result.data.accessMode, "ACTIVE");
  assert.equal(result.data.planKey, "LAUNCH_STARTER");
  assert.equal(result.data.staffLimit, 2);
  assert.equal(result.data.branchLimit, 1);
  assert.deepEqual(result.data.entitlementSnapshot, {
    planLevel: "STARTER",
  });
  assert.equal(result.data.nextPlanKey, null);
});

test("activates the successfully paid Starter plan after Growth trial expiry", () => {
  const subscription = growthTrial({
    endDate: date("2026-08-30T10:00:00.000Z"),
    nextPlanKey: "LAUNCH_STARTER",
  });

  const result = buildQueuedPlanActivationUpdate({
    subscription,
    successfulRenewal: {
      planKey: "LAUNCH_STARTER",
      tierKey: "STARTER",
      cycleKey: "MONTHLY",
      staffLimit: 2,
      branchLimit: 1,
      priceAmount: 10000,
      currency: "RWF",
      entitlementSnapshot: {
        planLevel: "STARTER",
      },
    },
    now: date("2026-08-01T10:00:00.000Z"),
  });

  assert.equal(result.accessMode, "ACTIVE");
  assert.equal(result.planKey, "LAUNCH_STARTER");
  assert.equal(result.staffLimit, 2);
  assert.equal(result.branchLimit, 1);
  assert.deepEqual(result.entitlementSnapshot, {
    planLevel: "STARTER",
  });
  assert.deepEqual(
    result.startDate,
    date("2026-07-31T10:00:00.000Z"),
  );
  assert.equal(result.nextPlanKey, null);
});

test("does not activate a queued plan without a matching successful payment", () => {
  const subscription = growthTrial({
    nextPlanKey: "LAUNCH_STARTER",
  });

  const missingPayment = buildQueuedPlanActivationUpdate({
    subscription,
    successfulRenewal: null,
    now: date("2026-08-01T10:00:00.000Z"),
  });

  const wrongPayment = buildQueuedPlanActivationUpdate({
    subscription,
    successfulRenewal: {
      planKey: "LAUNCH_BUSINESS",
    },
    now: date("2026-08-01T10:00:00.000Z"),
  });

  assert.equal(missingPayment, null);
  assert.equal(wrongPayment, null);
});

test("does not activate a paid next plan before the trial ends", () => {
  const result = buildQueuedPlanActivationUpdate({
    subscription: growthTrial({
      nextPlanKey: "LAUNCH_STARTER",
    }),
    successfulRenewal: {
      planKey: "LAUNCH_STARTER",
      tierKey: "STARTER",
      cycleKey: "MONTHLY",
      staffLimit: 2,
      branchLimit: 1,
      priceAmount: 10000,
      currency: "RWF",
      entitlementSnapshot: {
        planLevel: "STARTER",
      },
    },
    now: date("2026-07-16T10:00:00.000Z"),
  });

  assert.equal(result, null);
});
