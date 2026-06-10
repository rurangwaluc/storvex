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

  return Number.isFinite(graceDays) && graceDays >= 0 ? Math.floor(graceDays) : 3;
}

function getTrialStaffLimit() {
  return positiveInteger(process.env.TRIAL_STAFF_LIMIT || 3, 3);
}

function getTrialBranchLimit() {
  return positiveInteger(process.env.TRIAL_BRANCH_LIMIT || 1, 1);
}

/**
 * Storvex launch pricing.
 *
 * Server-authoritative pricing:
 * - Starter: 10,000 RWF / month
 * - Growth: 25,000 RWF / month
 * - Business: 45,000 RWF / month
 *
 * The UI can display these values, but signup/payment must trust this backend file.
 */
const PAID_PLANS = Object.freeze([
  {
    key: "LAUNCH_STARTER",
    tierKey: TIER_KEYS.LAUNCH_STARTER,
    cycleKey: CYCLE_KEYS.M1,
    label: "Starter",
    tierLabel: "Starter",
    cycleLabel: "Monthly",
    days: 30,
    price: money(process.env.LAUNCH_STARTER_PRICE || 10000),
    currency: CURRENCY,
    staffLimit: positiveInteger(process.env.LAUNCH_STARTER_STAFF_LIMIT || 2, 2),
    branchLimit: positiveInteger(process.env.LAUNCH_STARTER_BRANCH_LIMIT || 1, 1),
    isEnterprise: false,
    marketplaceIncluded: true,
    launchPricing: true,
    features: [
      "Sales and stock control",
      "Expenses and customers",
      "Basic reports",
      "WhatsApp customer updates",
      "1 store location",
      "Owner plus one staff member",
      "Marketplace profile included",
    ],
  },
  {
    key: "LAUNCH_GROWTH",
    tierKey: TIER_KEYS.LAUNCH_GROWTH,
    cycleKey: CYCLE_KEYS.M1,
    label: "Growth",
    tierLabel: "Growth",
    cycleLabel: "Monthly",
    days: 30,
    price: money(process.env.LAUNCH_GROWTH_PRICE || 25000),
    currency: CURRENCY,
    staffLimit: positiveInteger(process.env.LAUNCH_GROWTH_STAFF_LIMIT || 5, 5),
    branchLimit: positiveInteger(process.env.LAUNCH_GROWTH_BRANCH_LIMIT || 1, 1),
    isEnterprise: false,
    marketplaceIncluded: true,
    launchPricing: true,
    features: [
      "Everything in Starter",
      "Staff accounts",
      "Cash control",
      "Supplier records",
      "Repairs tracking",
      "Better reports",
      "Marketplace visibility tools",
    ],
  },
  {
    key: "LAUNCH_BUSINESS",
    tierKey: TIER_KEYS.LAUNCH_BUSINESS,
    cycleKey: CYCLE_KEYS.M1,
    label: "Business",
    tierLabel: "Business",
    cycleLabel: "Monthly",
    days: 30,
    price: money(process.env.LAUNCH_BUSINESS_PRICE || 45000),
    currency: CURRENCY,
    staffLimit: positiveInteger(process.env.LAUNCH_BUSINESS_STAFF_LIMIT || 15, 15),
    branchLimit: positiveInteger(process.env.LAUNCH_BUSINESS_BRANCH_LIMIT || 3, 3),
    isEnterprise: false,
    marketplaceIncluded: true,
    launchPricing: true,
    features: [
      "Everything in Growth",
      "Multiple store locations",
      "Manager access",
      "Advanced reports",
      "Priority support",
      "Early marketplace boost access",
      "Early AI tools access",
    ],
  },
]);

const ENTERPRISE_PLAN = Object.freeze({
  key: ENTERPRISE_PLAN_KEY,
  tierKey: TIER_KEYS.ENTERPRISE,
  cycleKey: CYCLE_KEYS.CUSTOM,
  label: "Enterprise",
  tierLabel: "Enterprise",
  cycleLabel: "Custom",
  days: 30,
  price: 0,
  currency: CURRENCY,
  staffLimit: null,
  branchLimit: null,
  isEnterprise: true,
  marketplaceIncluded: true,
  launchPricing: false,
  features: [
    "Custom branches",
    "Custom staff limits",
    "Priority onboarding",
    "Dedicated support",
  ],
});

function getTrialPlan() {
  return {
    key: TRIAL_PLAN_KEY,
    tierKey: TIER_KEYS.TRIAL,
    cycleKey: CYCLE_KEYS.TRIAL,
    label: "Free Trial",
    tierLabel: "Free Trial",
    cycleLabel: `${getTrialDays()} Days`,
    days: getTrialDays(),
    price: 0,
    currency: CURRENCY,
    staffLimit: getTrialStaffLimit(),
    branchLimit: getTrialBranchLimit(),
    isEnterprise: false,
    marketplaceIncluded: true,
    launchPricing: true,
    features: [
      `${getTrialDays()} days free`,
      "Sales and stock control",
      "WhatsApp customer updates",
      "Marketplace profile included",
    ],
  };
}

function getPaidPlans() {
  return PAID_PLANS.map((plan) => ({ ...plan }));
}

function getAllPlans() {
  return [getTrialPlan(), ...getPaidPlans(), { ...ENTERPRISE_PLAN }];
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
  if (key === TRIAL_PLAN_KEY) return getTrialPlan();
  if (key === ENTERPRISE_PLAN_KEY) return { ...ENTERPRISE_PLAN };

  const plan = PAID_PLANS.find((item) => item.key === key);

  return plan ? { ...plan } : null;
}

function getPlansByTierKey(tierKey) {
  const key = normalizeKey(tierKey);

  if (!key) return [];

  return PAID_PLANS.filter((plan) => plan.tierKey === key).map((plan) => ({ ...plan }));
}

function getPlansByCycleKey(cycleKey) {
  const key = normalizeKey(cycleKey);

  if (!key) return [];

  return PAID_PLANS.filter((plan) => plan.cycleKey === key).map((plan) => ({ ...plan }));
}

function getPlanByTierAndCycle(tierKey, cycleKey) {
  const tier = normalizeKey(tierKey);
  const cycle = normalizeKey(cycleKey);

  const plan = PAID_PLANS.find((item) => item.tierKey === tier && item.cycleKey === cycle);

  return plan ? { ...plan } : null;
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
    days: plan.days,
    price: plan.price,
    currency: plan.currency,
    staffLimit: plan.staffLimit,
    branchLimit: plan.branchLimit,
    isEnterprise: Boolean(plan.isEnterprise),
    marketplaceIncluded: Boolean(plan.marketplaceIncluded),
    launchPricing: Boolean(plan.launchPricing),
  };
}

module.exports = {
  CURRENCY,
  TRIAL_PLAN_KEY,
  ENTERPRISE_PLAN_KEY,
  TIER_KEYS,
  CYCLE_KEYS,
  PLAN_KEY_ALIASES,

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