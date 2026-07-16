function cleanString(value) {
  return String(value || "").trim();
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeItems(value) {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item)).filter(Boolean)
    : [];
}

function normalizeSections(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((section) => ({
      key: cleanString(section?.key),
      label: cleanString(section?.label),
      items: normalizeItems(section?.items),
    }))
    .filter((section) => section.label || section.items.length);
}

function planLevelFromKey(plan) {
  const key = cleanString(plan?.key).toUpperCase();
  const tierKey = cleanString(plan?.tierKey).toUpperCase();
  const configuredLevel = cleanString(
    plan?.entitlements?.planLevel,
  ).toUpperCase();

  if (configuredLevel) return configuredLevel;
  if (key === "LAUNCH_STARTER" || tierKey === "LAUNCH_STARTER") {
    return "STARTER";
  }
  if (key === "LAUNCH_GROWTH" || tierKey === "LAUNCH_GROWTH") {
    return "GROWTH";
  }
  if (key === "LAUNCH_BUSINESS" || tierKey === "LAUNCH_BUSINESS") {
    return "BUSINESS";
  }
  if (key === "ENTERPRISE" || tierKey === "ENTERPRISE") {
    return "ENTERPRISE";
  }
  if (key === "TRIAL" || tierKey === "TRIAL") {
    return "TRIAL";
  }

  return "OTHER";
}

function planRank(level) {
  if (level === "TRIAL") return 0;
  if (level === "STARTER") return 1;
  if (level === "GROWTH") return 2;
  if (level === "BUSINESS") return 3;
  if (level === "ENTERPRISE") return 4;
  return 99;
}

export function normalizeSubscriptionPlan(plan) {
  if (!plan || typeof plan !== "object") return null;

  const key = cleanString(plan.key);
  if (!key) return null;

  const level = planLevelFromKey(plan);
  const price =
    nullableNumber(plan.price ?? plan.priceAmount) ?? 0;

  const normalized = {
    ...plan,
    key,
    level,

    name:
      cleanString(plan.label || plan.name || plan.tierLabel) ||
      "Storvex plan",

    label:
      cleanString(plan.label || plan.name || plan.tierLabel) ||
      "Storvex plan",

    shortDescription:
      cleanString(plan.shortDescription || plan.short) ||
      "Professional Storvex business control.",

    audience:
      cleanString(plan.audience || plan.bestFor) ||
      "Retail businesses using Storvex",

    recommended:
      Boolean(plan.recommended) ||
      key.toUpperCase() === "LAUNCH_GROWTH",

    price,
    priceAmount: price,
    currency: cleanString(plan.currency) || "RWF",
    days: nullableNumber(plan.days) ?? 30,

    staffLimit: nullableNumber(plan.staffLimit),
    branchLimit: nullableNumber(plan.branchLimit),

    isEnterprise:
      Boolean(plan.isEnterprise) || level === "ENTERPRISE",

    marketplaceIncluded:
      plan.marketplaceIncluded !== false,

    launchPricing:
      plan.launchPricing !== false,

    capacity:
      plan.capacity && typeof plan.capacity === "object"
        ? { ...plan.capacity }
        : null,

    entitlements:
      plan.entitlements && typeof plan.entitlements === "object"
        ? { ...plan.entitlements }
        : {},

    sections: normalizeSections(plan.sections),
  };

  normalized.highlights = normalized.sections
    .flatMap((section) => section.items)
    .filter(Boolean);

  if (!normalized.highlights.length) {
    normalized.highlights = normalizeItems(
      plan.highlights || plan.features,
    );
  }

  normalized.bestFor = normalized.audience;
  normalized.short = normalized.shortDescription;
  normalized.badge = normalized.recommended ? "Recommended" : "";
  normalized.features = [...normalized.highlights];

  return normalized;
}

export function normalizeSubscriptionPlans(plans) {
  if (!Array.isArray(plans)) return [];

  return plans
    .map(normalizeSubscriptionPlan)
    .filter(Boolean)
    .sort((left, right) => {
      const levelDifference =
        planRank(left.level) - planRank(right.level);

      if (levelDifference !== 0) return levelDifference;

      return left.price - right.price;
    });
}

export function findSubscriptionPlan(plans, planKey) {
  const key = cleanString(planKey).toUpperCase();

  if (!key) return null;

  return (
    normalizeSubscriptionPlans(plans).find(
      (plan) => plan.key.toUpperCase() === key,
    ) || null
  );
}

export function pickRecommendedPlan(plans) {
  const normalized = normalizeSubscriptionPlans(plans);

  return (
    normalized.find((plan) => plan.recommended) ||
    normalized.find((plan) => plan.level === "GROWTH") ||
    normalized[0] ||
    null
  );
}

export function planCapacityLabel(plan) {
  if (!plan) return "";

  const staff =
    plan.staffLimit == null
      ? "Custom users"
      : `${plan.staffLimit} active user${
          plan.staffLimit === 1 ? "" : "s"
        }`;

  const branches =
    plan.branchLimit == null
      ? "Custom locations"
      : `${plan.branchLimit} store location${
          plan.branchLimit === 1 ? "" : "s"
        }`;

  return `${staff} — ${branches}`;
}
