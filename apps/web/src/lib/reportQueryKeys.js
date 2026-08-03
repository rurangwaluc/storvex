function cleanKeyPart(value, fallback = "default") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

function booleanKey(value) {
  return value === true ? "all" : "current";
}

export const reportQueryKeys = {
  all: ["reports"],

  overviews: () => [
    ...reportQueryKeys.all,
    "overview",
  ],

  overview: ({
    branchId,
    from,
    to,
    allBranches = false,
  } = {}) => [
    ...reportQueryKeys.overviews(),
    cleanKeyPart(branchId),
    cleanKeyPart(from, "no-from"),
    cleanKeyPart(to, "no-to"),
    booleanKey(allBranches),
  ],

  cashFlows: () => [
    ...reportQueryKeys.all,
    "cash-flow",
  ],

  financialSummaries: () => [
    ...reportQueryKeys.all,
    "financial-summary",
  ],

  productReports: () => [
    ...reportQueryKeys.all,
    "products",
  ],

  incomeStatements: () => [
    ...reportQueryKeys.all,
    "income-statement",
  ],

  ownerChecks: () => [
    ...reportQueryKeys.all,
    "owner-checks",
  ],
};
