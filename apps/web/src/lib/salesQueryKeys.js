function cleanKeyPart(value, fallback = "default") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

export const salesQueryKeys = {
  all: ["sales"],

  lists: () => [
    ...salesQueryKeys.all,
    "list",
  ],

  list: (branchId) => [
    ...salesQueryKeys.lists(),
    cleanKeyPart(branchId),
  ],

  details: () => [
    ...salesQueryKeys.all,
    "detail",
  ],

  detail: (branchId, saleId) => [
    ...salesQueryKeys.details(),
    cleanKeyPart(branchId),
    cleanKeyPart(saleId, "missing"),
  ],

  credit: () => [
    ...salesQueryKeys.all,
    "credit",
  ],

  outstandingCredit: (branchId) => [
    ...salesQueryKeys.credit(),
    "outstanding",
    cleanKeyPart(branchId),
  ],

  overdueCredit: (branchId) => [
    ...salesQueryKeys.credit(),
    "overdue",
    cleanKeyPart(branchId),
  ],
};

export function unwrapSalesResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.sales)) {
    return response.sales;
  }

  if (Array.isArray(response?.data?.sales)) {
    return response.data.sales;
  }

  return [];
}
