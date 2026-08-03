function cleanKeyPart(value, fallback = "default") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

export const posQueryKeys = {
  all: ["pos"],

  contexts: () => [
    ...posQueryKeys.all,
    "context",
  ],

  context: (branchId) => [
    ...posQueryKeys.contexts(),
    cleanKeyPart(branchId),
  ],

  quickPicks: (branchId, periodDays = 7, limit = 10) => [
    ...posQueryKeys.all,
    "quick-picks",
    cleanKeyPart(branchId),
    Number(periodDays) || 7,
    Number(limit) || 10,
  ],

  productSearches: () => [
    ...posQueryKeys.all,
    "product-search",
  ],

  productSearch: (branchId, query, limit = 10) => [
    ...posQueryKeys.productSearches(),
    cleanKeyPart(branchId),
    String(query || "").trim().toLowerCase(),
    Number(limit) || 10,
  ],

  drawerStatuses: () => [
    ...posQueryKeys.all,
    "drawer-status",
  ],

  drawerStatus: (branchId) => [
    ...posQueryKeys.drawerStatuses(),
    cleanKeyPart(branchId),
  ],

  documentSettings: () => [
    ...posQueryKeys.all,
    "document-settings",
  ],
};
