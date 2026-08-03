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

  cashFlow: ({
    branchId,
    from,
    to,
  } = {}) => [
    ...reportQueryKeys.cashFlows(),
    cleanKeyPart(branchId),
    cleanKeyPart(from, "no-from"),
    cleanKeyPart(to, "no-to"),
  ],

  financialSummaries: () => [
    ...reportQueryKeys.all,
    "financial-summary",
  ],

  financialSummary: ({
    branchId,
    from,
    to,
  } = {}) => [
    ...reportQueryKeys.financialSummaries(),
    cleanKeyPart(branchId),
    cleanKeyPart(from, "no-from"),
    cleanKeyPart(to, "no-to"),
  ],

  productReports: () => [
    ...reportQueryKeys.all,
    "products",
  ],

  productReport: ({
    branchId,
    from,
    to,
    limit = 5,
    threshold = 5,
  } = {}) => [
    ...reportQueryKeys.productReports(),
    cleanKeyPart(branchId),
    cleanKeyPart(from, "no-from"),
    cleanKeyPart(to, "no-to"),
    Number(limit) || 5,
    Number(threshold) || 5,
  ],

  incomeStatements: () => [
    ...reportQueryKeys.all,
    "income-statement",
  ],

  incomeStatement: ({
    branchId,
    from,
    to,
  } = {}) => [
    ...reportQueryKeys.incomeStatements(),
    cleanKeyPart(branchId),
    cleanKeyPart(from, "no-from"),
    cleanKeyPart(to, "no-to"),
  ],

  ownerChecks: () => [
    ...reportQueryKeys.all,
    "owner-checks",
  ],

  ownerCheck: ({
    branchId,
  } = {}) => [
    ...reportQueryKeys.ownerChecks(),
    cleanKeyPart(branchId),
  ],
};
