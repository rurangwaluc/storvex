function cleanKeyPart(value, fallback = "default") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

export const inventoryQueryKeys = {
  all: ["inventory"],

  summaries: () => [
    ...inventoryQueryKeys.all,
    "summary",
  ],

  summary: (branchId) => [
    ...inventoryQueryKeys.summaries(),
    cleanKeyPart(branchId),
  ],

  products: () => [
    ...inventoryQueryKeys.all,
    "products",
  ],

  productLists: () => [
    ...inventoryQueryKeys.products(),
    "list",
  ],

  productDetails: () => [
    ...inventoryQueryKeys.products(),
    "detail",
  ],

  product: (branchId, productId) => [
    ...inventoryQueryKeys.productDetails(),
    cleanKeyPart(branchId),
    cleanKeyPart(productId, "missing"),
  ],

  productImages: (productId) => [
    ...inventoryQueryKeys.products(),
    "images",
    cleanKeyPart(productId, "missing"),
  ],

  productImageStudio: (productId) => [
    ...inventoryQueryKeys.products(),
    "image-studio",
    cleanKeyPart(productId, "missing"),
  ],

  storeProfile: () => [
    "store",
    "profile",
  ],
};

export function unwrapProductResponse(response) {
  return (
    response?.product ||
    response?.data?.product ||
    response?.data ||
    response ||
    null
  );
}
