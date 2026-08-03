function cleanKeyPart(value, fallback = "default") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

export const customerQueryKeys = {
  all: ["customers"],

  lists: () => [
    ...customerQueryKeys.all,
    "list",
  ],

  list: (branchId) => [
    ...customerQueryKeys.lists(),
    cleanKeyPart(branchId),
  ],

  details: () => [
    ...customerQueryKeys.all,
    "detail",
  ],

  detail: (customerId) => [
    ...customerQueryKeys.details(),
    cleanKeyPart(customerId, "missing"),
  ],
};

export function unwrapCustomersResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.customers)) {
    return response.customers;
  }

  if (Array.isArray(response?.data?.customers)) {
    return response.data.customers;
  }

  return [];
}
