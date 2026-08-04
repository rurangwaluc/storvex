function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "",
    ),
  );
}

export const marketplaceQueryKeys = {
  all: ["marketplace"],

  catalogue: () => [
    ...marketplaceQueryKeys.all,
    "catalogue",
  ],

  products: (params = {}) => [
    ...marketplaceQueryKeys.all,
    "products",
    cleanParams(params),
  ],

  stores: (params = {}) => [
    ...marketplaceQueryKeys.all,
    "stores",
    cleanParams(params),
  ],

  store: ({
    storeSlug,
    params = {},
  }) => [
    ...marketplaceQueryKeys.all,
    "store",
    String(storeSlug || ""),
    cleanParams(params),
  ],

  product: ({
    storeSlug,
    productSlug,
  }) => [
    ...marketplaceQueryKeys.all,
    "product",
    String(storeSlug || ""),
    String(productSlug || ""),
  ],

  customer: () => [
    ...marketplaceQueryKeys.all,
    "customer",
  ],

  customerSession: () => [
    ...marketplaceQueryKeys.customer(),
    "session",
  ],

  customerOrders: () => [
    ...marketplaceQueryKeys.customer(),
    "orders",
  ],

  owner: () => [
    ...marketplaceQueryKeys.all,
    "owner",
  ],

  ownerRequests: () => [
    ...marketplaceQueryKeys.owner(),
    "requests",
  ],

  ownerRequestLists: () => [
    ...marketplaceQueryKeys.ownerRequests(),
    "list",
  ],

  ownerRequestList: (params = {}) => [
    ...marketplaceQueryKeys.ownerRequestLists(),
    cleanParams(params),
  ],

  ownerRequestDetail: (requestId) => [
    ...marketplaceQueryKeys.ownerRequests(),
    "detail",
    String(requestId || ""),
  ],

  ownerAnalytics: () => [
    ...marketplaceQueryKeys.owner(),
    "analytics",
  ],

  ownerAnalyticsRange: (params = {}) => [
    ...marketplaceQueryKeys.ownerAnalytics(),
    cleanParams(params),
  ],

  ownerSettings: () => [
    ...marketplaceQueryKeys.owner(),
    "settings",
  ],
};

export default marketplaceQueryKeys;
