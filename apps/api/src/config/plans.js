// src/config/plans.js

const CURRENCY = String(process.env.BILLING_CURRENCY || "RWF").toUpperCase();

const TRIAL_PLAN_KEY = "TRIAL";
const ENTERPRISE_PLAN_KEY = "ENTERPRISE";

const TIER_KEYS = Object.freeze({
  TRIAL: "TRIAL",

  LAUNCH_STARTER: "LAUNCH_STARTER",
  LAUNCH_GROWTH: "LAUNCH_GROWTH",
  LAUNCH_BUSINESS: "LAUNCH_BUSINESS",

  // Compatibility with older plan naming.
  SOLO: "SOLO",
  DUO: "DUO",
  TEAM_3: "TEAM_3",
  TEAM_4: "TEAM_4",
  TEAM_5: "TEAM_5",
  TEAM_10: "TEAM_10",

  ENTERPRISE: "ENTERPRISE",
});

const CYCLE_KEYS = Object.freeze({
  TRIAL: "TRIAL",
  M1: "M1",
  CUSTOM: "CUSTOM",

  // Compatibility with older billing cycles.
  M3: "M3",
  M6: "M6",
  Y1: "Y1",
});

const PLAN_KEY_ALIASES = Object.freeze({
  SOLO_M1: "LAUNCH_STARTER",
  SOLO_M3: "LAUNCH_STARTER",
  SOLO_M6: "LAUNCH_STARTER",
  SOLO_Y1: "LAUNCH_STARTER",

  DUO_M1: "LAUNCH_STARTER",
  DUO_M3: "LAUNCH_STARTER",
  DUO_M6: "LAUNCH_STARTER",
  DUO_Y1: "LAUNCH_STARTER",

  TEAM_3_M1: "LAUNCH_GROWTH",
  TEAM_3_M3: "LAUNCH_GROWTH",
  TEAM_3_M6: "LAUNCH_GROWTH",
  TEAM_3_Y1: "LAUNCH_GROWTH",

  TEAM_4_M1: "LAUNCH_GROWTH",
  TEAM_4_M3: "LAUNCH_GROWTH",
  TEAM_4_M6: "LAUNCH_GROWTH",
  TEAM_4_Y1: "LAUNCH_GROWTH",

  TEAM_5_M1: "LAUNCH_GROWTH",
  TEAM_5_M3: "LAUNCH_GROWTH",
  TEAM_5_M6: "LAUNCH_GROWTH",
  TEAM_5_Y1: "LAUNCH_GROWTH",

  TEAM_10_M1: "LAUNCH_BUSINESS",
  TEAM_10_M3: "LAUNCH_BUSINESS",
  TEAM_10_M6: "LAUNCH_BUSINESS",
  TEAM_10_Y1: "LAUNCH_BUSINESS",
});

const PLAN_LEVELS = Object.freeze({
  TRIAL: "TRIAL",
  STARTER: "STARTER",
  GROWTH: "GROWTH",
  BUSINESS: "BUSINESS",
  ENTERPRISE: "ENTERPRISE",
});

const SUPPORT_LEVELS = Object.freeze({
  STANDARD: "STANDARD",
  PRIORITY: "PRIORITY",
  DEDICATED: "DEDICATED",
});

const REPORTING_LEVELS = Object.freeze({
  ESSENTIAL: "ESSENTIAL",
  ADVANCED: "ADVANCED",
  FULL: "FULL",
  CUSTOM: "CUSTOM",
});

const MARKETPLACE_LEVELS = Object.freeze({
  TRIAL: "TRIAL",
  STANDARD: "STANDARD",
  ADVANCED: "ADVANCED",
  PROFESSIONAL: "PROFESSIONAL",
  CUSTOM: "CUSTOM",
});

function money(value) {
  const n = Number(value);

  if (!Number.isFinite(n) || n < 0) return 0;

  return Math.round(n);
}

function positiveInteger(value, fallback) {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return Math.floor(n);
}

function getTrialDays() {
  return positiveInteger(process.env.TRIAL_DAYS || 30, 30);
}

function getGraceDays() {
  const graceDays = Number(process.env.GRACE_DAYS || 3);

  return Number.isFinite(graceDays) && graceDays >= 0
    ? Math.floor(graceDays)
    : 3;
}

function getTrialStaffLimit() {
  return positiveInteger(process.env.TRIAL_STAFF_LIMIT || 3, 3);
}

function getTrialBranchLimit() {
  return positiveInteger(process.env.TRIAL_BRANCH_LIMIT || 1, 1);
}

function freezeSections(sections) {
  return Object.freeze(
    sections.map((section) =>
      Object.freeze({
        key: section.key,
        label: section.label,
        items: Object.freeze([...section.items]),
      })
    )
  );
}

function buildEntitlements({
  planLevel,
  reportingLevel,
  marketplaceLevel,
  supportLevel,
  bulkOperations,
  advancedPermissions,
  branchTransfers,
  advancedCashControl,
  advancedSupplierOperations,
  advancedMarketplaceTools,
  platformIntegrations,
}) {
  return Object.freeze({
    planLevel,
    reportingLevel,
    marketplaceLevel,
    supportLevel,

    coreOperations: true,
    sales: true,
    stock: true,
    customers: true,
    expenses: true,
    suppliers: true,
    documents: true,
    whatsappCustomerCommunication: true,

    marketplaceEnabled: true,
    marketplaceCommissionEnabled: false,
    sellerManagedDelivery: true,
    deliveryAreaLimit: null,
    marketplaceOrderLimit: null,

    imageStudioEnabled: true,
    imageStudioUsageDisplayedToSeller: false,

    bulkOperations: Boolean(bulkOperations),
    advancedPermissions: Boolean(advancedPermissions),
    branchTransfers: Boolean(branchTransfers),
    advancedCashControl: Boolean(advancedCashControl),
    advancedSupplierOperations: Boolean(advancedSupplierOperations),
    advancedMarketplaceTools: Boolean(advancedMarketplaceTools),
    platformIntegrations: Boolean(platformIntegrations),
  });
}

/**
 * Storvex professional launch pricing.
 *
 * Server-authoritative pricing:
 * - Starter: 10,000 RWF / month
 * - Growth: 25,000 RWF / month
 * - Business: 45,000 RWF / month
 *
 * Existing subscriptions keep their purchased snapshot until renewal,
 * upgrade, downgrade, or an explicit platform-approved migration.
 */
const PAID_PLANS = Object.freeze([
  Object.freeze({
    key: "LAUNCH_STARTER",
    tierKey: TIER_KEYS.LAUNCH_STARTER,
    cycleKey: CYCLE_KEYS.M1,

    label: "Starter",
    tierLabel: "Starter",
    cycleLabel: "Monthly",
    shortDescription:
      "The complete foundation for a small shop to manage daily work and start selling professionally.",
    audience: "Small shops with one location and a compact team",
    recommended: false,

    days: 30,
    price: money(process.env.LAUNCH_STARTER_PRICE || 10000),
    currency: CURRENCY,

    staffLimit: positiveInteger(
      process.env.LAUNCH_STARTER_STAFF_LIMIT || 2,
      2
    ),
    branchLimit: positiveInteger(
      process.env.LAUNCH_STARTER_BRANCH_LIMIT || 1,
      1
    ),

    isEnterprise: false,
    marketplaceIncluded: true,
    launchPricing: true,

    capacity: Object.freeze({
      staffLabel: "Owner and one staff member",
      branchLabel: "One store location",
    }),

    entitlements: buildEntitlements({
      planLevel: PLAN_LEVELS.STARTER,
      reportingLevel: REPORTING_LEVELS.ESSENTIAL,
      marketplaceLevel: MARKETPLACE_LEVELS.STANDARD,
      supportLevel: SUPPORT_LEVELS.STANDARD,
      bulkOperations: false,
      advancedPermissions: false,
      branchTransfers: false,
      advancedCashControl: false,
      advancedSupplierOperations: false,
      advancedMarketplaceTools: false,
      platformIntegrations: false,
    }),

    sections: freezeSections([
      {
        key: "daily-work",
        label: "Daily business",
        items: [
          "Sales and payment recording",
          "Stock and product management",
          "Customer records",
          "Expense tracking",
          "Supplier records",
        ],
      },
      {
        key: "control",
        label: "Owner control",
        items: [
          "Essential business reports",
          "Receipts and business documents",
          "Owner visibility across daily activity",
        ],
      },
      {
        key: "growth",
        label: "Customer growth",
        items: [
          "WhatsApp customer communication",
          "Professional Marketplace storefront",
          "Marketplace product publishing",
          "Marketplace orders",
          "Seller-managed delivery and pickup",
          "Image Studio",
        ],
      },
      {
        key: "support",
        label: "Support",
        items: ["Standard Storvex support"],
      },
    ]),
  }),

  Object.freeze({
    key: "LAUNCH_GROWTH",
    tierKey: TIER_KEYS.LAUNCH_GROWTH,
    cycleKey: CYCLE_KEYS.M1,

    label: "Growth",
    tierLabel: "Growth",
    cycleLabel: "Monthly",
    shortDescription:
      "For growing businesses that need stronger staff control, multiple locations and deeper operations.",
    audience: "Growing retailers managing a team and more than one location",
    recommended: true,

    days: 30,
    price: money(process.env.LAUNCH_GROWTH_PRICE || 25000),
    currency: CURRENCY,

    staffLimit: positiveInteger(
      process.env.LAUNCH_GROWTH_STAFF_LIMIT || 5,
      5
    ),
    branchLimit: positiveInteger(
      process.env.LAUNCH_GROWTH_BRANCH_LIMIT || 2,
      2
    ),

    isEnterprise: false,
    marketplaceIncluded: true,
    launchPricing: true,

    capacity: Object.freeze({
      staffLabel: "Up to five active users",
      branchLabel: "Up to two store locations",
    }),

    entitlements: buildEntitlements({
      planLevel: PLAN_LEVELS.GROWTH,
      reportingLevel: REPORTING_LEVELS.ADVANCED,
      marketplaceLevel: MARKETPLACE_LEVELS.ADVANCED,
      supportLevel: SUPPORT_LEVELS.PRIORITY,
      bulkOperations: true,
      advancedPermissions: true,
      branchTransfers: true,
      advancedCashControl: true,
      advancedSupplierOperations: true,
      advancedMarketplaceTools: true,
      platformIntegrations: false,
    }),

    sections: freezeSections([
      {
        key: "included",
        label: "Everything in Starter",
        items: [
          "Complete daily business foundation",
          "Professional Marketplace selling",
          "Seller-managed delivery and pickup",
        ],
      },
      {
        key: "team",
        label: "Team and locations",
        items: [
          "Staff responsibilities and permissions",
          "Two store locations",
          "Branch-aware stock and operations",
          "Stock transfers between branches",
        ],
      },
      {
        key: "operations",
        label: "Business operations",
        items: [
          "Advanced cash control",
          "Purchasing and supplier operations",
          "Repairs where supported",
          "Pay-later and Interstore workflows",
          "Advanced customer management",
        ],
      },
      {
        key: "growth",
        label: "Growth and decisions",
        items: [
          "Advanced reports",
          "Marketplace performance",
          "Promotions",
          "Bulk Marketplace product actions",
          "Priority Storvex support",
        ],
      },
    ]),
  }),

  Object.freeze({
    key: "LAUNCH_BUSINESS",
    tierKey: TIER_KEYS.LAUNCH_BUSINESS,
    cycleKey: CYCLE_KEYS.M1,

    label: "Business",
    tierLabel: "Business",
    cycleLabel: "Monthly",
    shortDescription:
      "Full operational control for established businesses with larger teams, catalogues and multiple locations.",
    audience: "Established multi-location businesses requiring stronger control",
    recommended: false,

    days: 30,
    price: money(process.env.LAUNCH_BUSINESS_PRICE || 45000),
    currency: CURRENCY,

    staffLimit: positiveInteger(
      process.env.LAUNCH_BUSINESS_STAFF_LIMIT || 15,
      15
    ),
    branchLimit: positiveInteger(
      process.env.LAUNCH_BUSINESS_BRANCH_LIMIT || 5,
      5
    ),

    isEnterprise: false,
    marketplaceIncluded: true,
    launchPricing: true,

    capacity: Object.freeze({
      staffLabel: "Up to fifteen active users",
      branchLabel: "Up to five store locations",
    }),

    entitlements: buildEntitlements({
      planLevel: PLAN_LEVELS.BUSINESS,
      reportingLevel: REPORTING_LEVELS.FULL,
      marketplaceLevel: MARKETPLACE_LEVELS.PROFESSIONAL,
      supportLevel: SUPPORT_LEVELS.PRIORITY,
      bulkOperations: true,
      advancedPermissions: true,
      branchTransfers: true,
      advancedCashControl: true,
      advancedSupplierOperations: true,
      advancedMarketplaceTools: true,
      platformIntegrations: false,
    }),

    sections: freezeSections([
      {
        key: "included",
        label: "Everything in Growth",
        items: [
          "Advanced multi-branch operations",
          "Professional Marketplace operations",
          "Priority support",
        ],
      },
      {
        key: "control",
        label: "Business control",
        items: [
          "Advanced staff and branch control",
          "Owner-wide business visibility",
          "Approval workflows",
          "Advanced audit history",
        ],
      },
      {
        key: "scale",
        label: "Scale",
        items: [
          "Large catalogue management",
          "Bulk catalogue operations",
          "Advanced supplier operations",
          "Advanced marketplace tools",
        ],
      },
      {
        key: "decisions",
        label: "Reports and support",
        items: [
          "Advanced financial reporting",
          "Advanced customer growth tools",
          "Priority onboarding",
          "Priority Storvex support",
        ],
      },
    ]),
  }),
]);

const ENTERPRISE_PLAN = Object.freeze({
  key: ENTERPRISE_PLAN_KEY,
  tierKey: TIER_KEYS.ENTERPRISE,
  cycleKey: CYCLE_KEYS.CUSTOM,

  label: "Enterprise",
  tierLabel: "Enterprise",
  cycleLabel: "Custom",
  shortDescription:
    "A tailored Storvex deployment for businesses with specialised scale, integrations or operating requirements.",
  audience: "Large organisations and specialised retail operations",
  recommended: false,

  days: 30,
  price: 0,
  currency: CURRENCY,

  staffLimit: null,
  branchLimit: null,

  isEnterprise: true,
  marketplaceIncluded: true,
  launchPricing: false,

  capacity: Object.freeze({
    staffLabel: "Custom active-user capacity",
    branchLabel: "Custom store-location capacity",
  }),

  entitlements: buildEntitlements({
    planLevel: PLAN_LEVELS.ENTERPRISE,
    reportingLevel: REPORTING_LEVELS.CUSTOM,
    marketplaceLevel: MARKETPLACE_LEVELS.CUSTOM,
    supportLevel: SUPPORT_LEVELS.DEDICATED,
    bulkOperations: true,
    advancedPermissions: true,
    branchTransfers: true,
    advancedCashControl: true,
    advancedSupplierOperations: true,
    advancedMarketplaceTools: true,
    platformIntegrations: true,
  }),

  sections: freezeSections([
    {
      key: "capacity",
      label: "Custom capacity",
      items: [
        "Custom staff capacity",
        "Custom branch capacity",
        "Custom catalogue and operating requirements",
      ],
    },
    {
      key: "implementation",
      label: "Implementation",
      items: [
        "Priority onboarding",
        "Data migration and imports",
        "Custom integrations",
        "Advanced API access",
      ],
    },
    {
      key: "support",
      label: "Partnership",
      items: [
        "Dedicated support",
        "Custom reporting",
        "Agreed operating controls",
      ],
    },
  ]),
});

function getTrialPlan() {
  return {
    key: TRIAL_PLAN_KEY,
    tierKey: TIER_KEYS.TRIAL,
    cycleKey: CYCLE_KEYS.TRIAL,

    label: "Free Trial",
    tierLabel: "Free Trial",
    cycleLabel: `${getTrialDays()} Days`,
    shortDescription:
      "Explore the complete Storvex foundation before choosing a paid plan.",
    audience: "Businesses evaluating Storvex",
    recommended: false,

    days: getTrialDays(),
    price: 0,
    currency: CURRENCY,

    staffLimit: getTrialStaffLimit(),
    branchLimit: getTrialBranchLimit(),

    isEnterprise: false,
    marketplaceIncluded: true,
    launchPricing: true,

    capacity: {
      staffLabel: `Up to ${getTrialStaffLimit()} active users`,
      branchLabel: "One store location",
    },

    entitlements: buildEntitlements({
      planLevel: PLAN_LEVELS.TRIAL,
      reportingLevel: REPORTING_LEVELS.ESSENTIAL,
      marketplaceLevel: MARKETPLACE_LEVELS.TRIAL,
      supportLevel: SUPPORT_LEVELS.STANDARD,
      bulkOperations: false,
      advancedPermissions: false,
      branchTransfers: false,
      advancedCashControl: false,
      advancedSupplierOperations: false,
      advancedMarketplaceTools: false,
      platformIntegrations: false,
    }),

    sections: [
      {
        key: "trial",
        label: `${getTrialDays()} days to explore Storvex`,
        items: [
          "Sales and stock control",
          "Customers and expenses",
          "Essential reports",
          "WhatsApp customer communication",
          "Marketplace preparation",
          "Image Studio workflow",
        ],
      },
    ],
  };
}

function clonePlan(plan) {
  if (!plan) return null;

  return {
    ...plan,
    capacity: plan.capacity ? { ...plan.capacity } : null,
    entitlements: plan.entitlements ? { ...plan.entitlements } : null,
    sections: Array.isArray(plan.sections)
      ? plan.sections.map((section) => ({
          ...section,
          items: Array.isArray(section.items) ? [...section.items] : [],
        }))
      : [],
  };
}

function getPaidPlans() {
  return PAID_PLANS.map(clonePlan);
}

function getAllPlans() {
  return [
    clonePlan(getTrialPlan()),
    ...getPaidPlans(),
    clonePlan(ENTERPRISE_PLAN),
  ];
}

function normalizeKey(value) {
  return String(value || "").trim().toUpperCase();
}

function resolvePlanKey(value) {
  const key = normalizeKey(value);

  if (!key) return "";

  return PLAN_KEY_ALIASES[key] || key;
}

function getPlanByKey(planKey) {
  const key = resolvePlanKey(planKey);

  if (!key) return null;
  if (key === TRIAL_PLAN_KEY) return clonePlan(getTrialPlan());
  if (key === ENTERPRISE_PLAN_KEY) return clonePlan(ENTERPRISE_PLAN);

  return clonePlan(PAID_PLANS.find((item) => item.key === key));
}

function getPlansByTierKey(tierKey) {
  const key = normalizeKey(tierKey);

  if (!key) return [];

  return PAID_PLANS
    .filter((plan) => plan.tierKey === key)
    .map(clonePlan);
}

function getPlansByCycleKey(cycleKey) {
  const key = normalizeKey(cycleKey);

  if (!key) return [];

  return PAID_PLANS
    .filter((plan) => plan.cycleKey === key)
    .map(clonePlan);
}

function getPlanByTierAndCycle(tierKey, cycleKey) {
  const tier = normalizeKey(tierKey);
  const cycle = normalizeKey(cycleKey);

  return clonePlan(
    PAID_PLANS.find(
      (item) => item.tierKey === tier && item.cycleKey === cycle
    )
  );
}

function isTrialPlanKey(planKey) {
  return resolvePlanKey(planKey) === TRIAL_PLAN_KEY;
}

function isEnterprisePlanKey(planKey) {
  return resolvePlanKey(planKey) === ENTERPRISE_PLAN_KEY;
}

function getStaffLimitForPlanKey(planKey) {
  const plan = getPlanByKey(planKey);

  return plan?.staffLimit ?? null;
}

function getBranchLimitForPlanKey(planKey) {
  const plan = getPlanByKey(planKey);

  return plan?.branchLimit ?? null;
}

function getPriceForPlanKey(planKey) {
  const plan = getPlanByKey(planKey);

  return plan?.price ?? null;
}

function getPlanSnapshot(planKey) {
  const plan = getPlanByKey(planKey);

  if (!plan) return null;

  return {
    planKey: plan.key,
    tierKey: plan.tierKey,
    cycleKey: plan.cycleKey,

    label: plan.label,
    tierLabel: plan.tierLabel,
    cycleLabel: plan.cycleLabel,
    shortDescription: plan.shortDescription,
    audience: plan.audience,
    recommended: Boolean(plan.recommended),

    days: plan.days,
    price: plan.price,
    currency: plan.currency,

    staffLimit: plan.staffLimit,
    branchLimit: plan.branchLimit,

    isEnterprise: Boolean(plan.isEnterprise),
    marketplaceIncluded: Boolean(plan.marketplaceIncluded),
    launchPricing: Boolean(plan.launchPricing),

    capacity: plan.capacity ? { ...plan.capacity } : null,
    entitlements: plan.entitlements ? { ...plan.entitlements } : null,
    sections: Array.isArray(plan.sections)
      ? plan.sections.map((section) => ({
          ...section,
          items: [...section.items],
        }))
      : [],
  };
}

module.exports = {
  CURRENCY,
  TRIAL_PLAN_KEY,
  ENTERPRISE_PLAN_KEY,

  TIER_KEYS,
  CYCLE_KEYS,
  PLAN_KEY_ALIASES,
  PLAN_LEVELS,
  SUPPORT_LEVELS,
  REPORTING_LEVELS,
  MARKETPLACE_LEVELS,

  getTrialDays,
  getGraceDays,
  getTrialStaffLimit,
  getTrialBranchLimit,

  getTrialPlan,
  getPaidPlans,
  getAllPlans,

  normalizeKey,
  resolvePlanKey,

  getPlanByKey,
  getPlansByTierKey,
  getPlansByCycleKey,
  getPlanByTierAndCycle,

  isTrialPlanKey,
  isEnterprisePlanKey,

  getStaffLimitForPlanKey,
  getBranchLimitForPlanKey,
  getPriceForPlanKey,
  getPlanSnapshot,
};
