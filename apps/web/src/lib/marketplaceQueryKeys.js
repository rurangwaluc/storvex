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
};

export default marketplaceQueryKeys;
