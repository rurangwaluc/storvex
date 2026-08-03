function cleanKeyPart(
  value,
  fallback = "default",
) {
  const clean = String(value || "").trim();
  return clean || fallback;
}

function cleanBoolean(value) {
  return Boolean(value);
}

function normalizeListScope(scope = {}) {
  if (
    typeof scope === "string" ||
    typeof scope === "number"
  ) {
    return {
      branchId: cleanKeyPart(scope),
      q: "",
      includeInactive: false,
      source: "ALL",
      withOutstanding: false,
      allLocations: false,
    };
  }

  return {
    branchId: cleanKeyPart(
      scope.branchId ??
        scope.locationId,
    ),
    q: cleanKeyPart(scope.q, ""),
    includeInactive: cleanBoolean(
      scope.includeInactive,
    ),
    source: cleanKeyPart(
      scope.source,
      "ALL",
    ).toUpperCase(),
    withOutstanding: cleanBoolean(
      scope.withOutstanding,
    ),
    allLocations: cleanBoolean(
      scope.allLocations,
    ),
  };
}

function normalizeLedgerScope(params = {}) {
  return {
    branchId: cleanKeyPart(
      params.branchId ??
        params.locationId,
    ),
    allLocations: cleanBoolean(
      params.allLocations,
    ),
  };
}

export const customerQueryKeys = {
  all: ["customers"],

  lists: () => [
    ...customerQueryKeys.all,
    "list",
  ],

  list: (scope = {}) => [
    ...customerQueryKeys.lists(),
    normalizeListScope(scope),
  ],

  details: () => [
    ...customerQueryKeys.all,
    "detail",
  ],

  detail: (customerId) => [
    ...customerQueryKeys.details(),
    cleanKeyPart(customerId, "missing"),
  ],

  ledgers: () => [
    ...customerQueryKeys.all,
    "ledger",
  ],

  ledger: (
    customerId,
    params = {},
  ) => [
    ...customerQueryKeys.ledgers(),
    cleanKeyPart(customerId, "missing"),
    normalizeLedgerScope(params),
  ],
};

export function unwrapCustomersResponse(
  response,
) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.customers)) {
    return response.customers;
  }

  if (
    Array.isArray(
      response?.data?.customers,
    )
  ) {
    return response.data.customers;
  }

  return [];
}
