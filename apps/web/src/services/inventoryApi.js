import { apiFetch, getActiveBranchId } from "./apiClient";

const INVENTORY_BASE = "/inventory";

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function cleanObject(obj) {
  const out = {};

  for (const [key, value] of Object.entries(obj || {})) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }

  return out;
}

function cleanPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value;
}

function withBranchOptions(options = {}) {
  const branchId =
    cleanString(options.branchId) ||
    cleanString(options.activeBranchId) ||
    cleanString(getActiveBranchId());

  return {
    ...options,
    branchId,
  };
}

function buildQuery(params = {}) {
  return cleanObject({
    q: cleanString(params.q),
    active: params.active,
    category: cleanString(params.category),
    subcategory: cleanString(params.subcategory),
    brand: cleanString(params.brand),
    lowStock: params.lowStock,
    outOfStock: params.outOfStock,
    threshold: params.threshold,
    sort: params.sort,
    limit: params.limit,
    cursor: params.cursor,
    branchId: cleanString(params.branchId),
    allBranches: params.allBranches,
    from: params.from,
    to: params.to,
    type: params.type,
    listingStatus: cleanString(params.listingStatus || params.marketplaceStatus),
    listingCategory: cleanString(params.listingCategory || params.marketplaceCategory),
  });
}

function normalizeProductPayload(payload = {}) {
  return cleanObject({
    name: cleanString(payload.name),
    sku: cleanString(payload.sku),
    serial: cleanString(payload.serial),
    barcode: cleanString(payload.barcode),
    category: cleanString(payload.category),
    subcategory: cleanString(payload.subcategory),
    subcategoryOther: cleanString(payload.subcategoryOther),
    brand: cleanString(payload.brand),
    minStockLevel: payload.minStockLevel,
    costPrice: payload.costPrice,
    sellPrice: payload.sellPrice,
    stockQty: payload.stockQty,
    categoryAttributes: cleanPlainObject(payload.categoryAttributes),
  });
}

function normalizeStockAdjustmentPayload(payload = {}) {
  return cleanObject({
    type: cleanString(payload.type).toUpperCase(),
    quantity: payload.quantity,
    newStockQty: payload.newStockQty,
    lossReason: cleanString(payload.lossReason).toUpperCase(),
    note: cleanString(payload.note),
  });
}

function normalizeProductImagePayload(payload = {}) {
  return cleanObject({
    url: cleanString(payload.url || payload.publicUrl || payload.imageUrl),
    key: cleanString(payload.key || payload.objectKey),
    altText: cleanString(payload.altText),
    sortOrder: payload.sortOrder,
    isPrimary: payload.isPrimary,
  });
}

function normalizeListingPayload(payload = {}) {
  const normalized = cleanObject({
    listingTitle: cleanString(
      payload.listingTitle ||
      payload.marketplaceTitle ||
      payload.title,
    ),
    listingDescription: cleanString(
      payload.listingDescription ||
      payload.marketplaceDescription ||
      payload.description,
    ),
    listingPrice:
      payload.listingPrice ??
      payload.marketplacePrice ??
      payload.price,
    listingCategory: cleanString(
      payload.listingCategory ||
      payload.marketplaceCategory ||
      payload.publicCategory,
    ),
    listingAttributes: cleanPlainObject(
      payload.listingAttributes ||
      payload.marketplaceAttributes ||
      payload.attributes,
    ),
    listingSlug: cleanString(
      payload.listingSlug ||
      payload.marketplaceSlug ||
      payload.slug,
    ),
  });

  const hasListingSalePrice =
    Object.prototype.hasOwnProperty.call(
      payload,
      "listingSalePrice",
    );

  const hasMarketplaceSalePrice =
    Object.prototype.hasOwnProperty.call(
      payload,
      "marketplaceSalePrice",
    );

  if (
    hasListingSalePrice ||
    hasMarketplaceSalePrice
  ) {
    const salePrice = hasListingSalePrice
      ? payload.listingSalePrice
      : payload.marketplaceSalePrice;

    normalized.listingSalePrice =
      salePrice === "" ||
      salePrice === null ||
      salePrice === undefined
        ? null
        : salePrice;
  }

  const hasListingSaleStartsAt =
    Object.prototype.hasOwnProperty.call(
      payload,
      "listingSaleStartsAt",
    );

  const hasMarketplaceSaleStartsAt =
    Object.prototype.hasOwnProperty.call(
      payload,
      "marketplaceSaleStartsAt",
    );

  if (
    hasListingSaleStartsAt ||
    hasMarketplaceSaleStartsAt
  ) {
    const saleStartsAt =
      hasListingSaleStartsAt
        ? payload.listingSaleStartsAt
        : payload.marketplaceSaleStartsAt;

    normalized.listingSaleStartsAt =
      cleanString(saleStartsAt) || null;
  }

  const hasListingSaleEndsAt =
    Object.prototype.hasOwnProperty.call(
      payload,
      "listingSaleEndsAt",
    );

  const hasMarketplaceSaleEndsAt =
    Object.prototype.hasOwnProperty.call(
      payload,
      "marketplaceSaleEndsAt",
    );

  if (
    hasListingSaleEndsAt ||
    hasMarketplaceSaleEndsAt
  ) {
    const saleEndsAt =
      hasListingSaleEndsAt
        ? payload.listingSaleEndsAt
        : payload.marketplaceSaleEndsAt;

    normalized.listingSaleEndsAt =
      cleanString(saleEndsAt) || null;
  }

  return normalized;
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(url);
}

function filenameFromResponse(response, fallback) {
  const disposition =
    response?.headers?.["content-disposition"] ||
    response?.headers?.get?.("content-disposition") ||
    "";

  const match = String(disposition).match(/filename="?([^"]+)"?/i);

  return match?.[1] || fallback;
}

/**
 * Product list.
 *
 * Backend returns:
 * {
 *   products,
 *   count,
 *   nextCursor,
 *   branchScope
 * }
 */
export function getProducts(params = {}, options = {}) {
  return apiFetch(`${INVENTORY_BASE}/products`, {
    method: "GET",
    query: buildQuery(params),
    ...withBranchOptions(options),
  });
}

/**
 * Product search for POS/inventory pickers.
 */
export function searchProducts(params = {}, options = {}) {
  const query =
    typeof params === "string"
      ? { q: params }
      : buildQuery(params);

  return apiFetch(`${INVENTORY_BASE}/products/search`, {
    method: "GET",
    query,
    ...withBranchOptions(options),
  });
}

/**
 * Single product detail.
 *
 * Backend returns branch-aware fields:
 * - stockQty
 * - branchStockQty
 * - branchReservedQty
 * - effectiveStockQty
 * - branchScope
 * - images
 * - categoryAttributes
 * - listingStatus / listing fields
 */
export function getProductById(productId, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}`, {
    method: "GET",
    ...withBranchOptions(options),
  });
}

/**
 * Create product in the active branch.
 *
 * Images are intentionally optional here.
 * Product listing checks images later when the owner chooses to make it public.
 */
export function createProduct(payload, options = {}) {
  return apiFetch(`${INVENTORY_BASE}/products`, {
    method: "POST",
    body: normalizeProductPayload(payload),
    ...withBranchOptions(options),
  });
}

/**
 * Update product catalog fields only.
 *
 * Do not send stockQty here. Stock changes must go through adjustStock().
 */
export function updateProduct(productId, payload, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  const body = normalizeProductPayload(payload);
  delete body.stockQty;

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
    ...withBranchOptions(options),
  });
}

/**
 * Soft deactivate product.
 */
export function deleteProduct(productId, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
    ...withBranchOptions(options),
  });
}

/**
 * Reactivate product.
 */
export function activateProduct(productId, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/activate`, {
    method: "PATCH",
    ...withBranchOptions(options),
  });
}

/**
 * Product images.
 *
 * Images are optional for internal inventory/POS products.
 * At least one image is required only when making a product listing public.
 */
export function uploadProductImage(productId, file, payload = {}, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  if (!file) {
    return Promise.reject(new Error("Product image file is required"));
  }

  const formData = new FormData();
  formData.append("image", file);

  if (payload.altText) formData.append("altText", payload.altText);
  if (payload.sortOrder !== undefined && payload.sortOrder !== null) {
    formData.append("sortOrder", String(payload.sortOrder));
  }
  if (payload.isPrimary !== undefined && payload.isPrimary !== null) {
    formData.append("isPrimary", String(Boolean(payload.isPrimary)));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/images/upload`, {
    method: "POST",
    body: formData,
    ...withBranchOptions(options),
  });
}

export function getProductImages(productId, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/images`, {
    method: "GET",
    ...withBranchOptions(options),
  });
}

export function deleteProductImage(productId, imageId, options = {}) {
  const id = cleanString(productId);
  const imgId = cleanString(imageId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  if (!imgId) {
    return Promise.reject(new Error("Image id is required"));
  }

  return apiFetch(
    `${INVENTORY_BASE}/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imgId)}`,
    {
      method: "DELETE",
      ...withBranchOptions(options),
    },
  );
}

export function setPrimaryProductImage(productId, imageId, options = {}) {
  const id = cleanString(productId);
  const imgId = cleanString(imageId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  if (!imgId) {
    return Promise.reject(new Error("Image id is required"));
  }

  return apiFetch(
    `${INVENTORY_BASE}/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imgId)}/primary`,
    {
      method: "PATCH",
      ...withBranchOptions(options),
    },
  );
}

/**
 * Image Studio.
 *
 * The business-facing UI uses these actions to prepare product
 * images for public listing without exposing provider details.
 */
export function getProductImageStudio(productId, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(
    `${INVENTORY_BASE}/products/${encodeURIComponent(id)}/image-studio`,
    {
      method: "GET",
      ...withBranchOptions(options),
    },
  );
}

export function cleanProductImage(productId, imageId, options = {}) {
  const id = cleanString(productId);
  const imgId = cleanString(imageId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  if (!imgId) {
    return Promise.reject(new Error("Image id is required"));
  }

  return apiFetch(
    `${INVENTORY_BASE}/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imgId)}/clean`,
    {
      method: "POST",
      ...withBranchOptions(options),
    },
  );
}

export function approveProductImageForListing(
  productId,
  imageId,
  options = {},
) {
  const id = cleanString(productId);
  const imgId = cleanString(imageId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  if (!imgId) {
    return Promise.reject(new Error("Image id is required"));
  }

  return apiFetch(
    `${INVENTORY_BASE}/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imgId)}/approve`,
    {
      method: "PATCH",
      ...withBranchOptions(options),
    },
  );
}

export function removeProductImageListingApproval(
  productId,
  imageId,
  options = {},
) {
  const id = cleanString(productId);
  const imgId = cleanString(imageId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  if (!imgId) {
    return Promise.reject(new Error("Image id is required"));
  }

  return apiFetch(
    `${INVENTORY_BASE}/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imgId)}/approval`,
    {
      method: "DELETE",
      ...withBranchOptions(options),
    },
  );
}

export function useProductImageAsMain(productId, imageId, options = {}) {
  const id = cleanString(productId);
  const imgId = cleanString(imageId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  if (!imgId) {
    return Promise.reject(new Error("Image id is required"));
  }

  return apiFetch(
    `${INVENTORY_BASE}/products/${encodeURIComponent(id)}/images/${encodeURIComponent(imgId)}/use-as-main`,
    {
      method: "PATCH",
      ...withBranchOptions(options),
    },
  );
}

/**
 * Product listing draft and publish actions.
 *
 * Draft update saves public-facing listing details.
 * Publish requires backend validation:
 * - active product
 * - at least one approved cleaned image
 * - public title
 * - public description
 * - public price
 * - listing category
 */
export function updateProductListingDraft(productId, payload, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/listing`, {
    method: "PATCH",
    body: normalizeListingPayload(payload),
    ...withBranchOptions(options),
  });
}

export function publishProductListing(productId, payload = {}, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/listing/publish`, {
    method: "PATCH",
    body: normalizeListingPayload(payload),
    ...withBranchOptions(options),
  });
}

export function unpublishProductListing(productId, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/listing/unpublish`, {
    method: "PATCH",
    ...withBranchOptions(options),
  });
}

/**
 * Branch-safe stock adjustment.
 *
 * RESTOCK:
 * {
 *   type: "RESTOCK",
 *   quantity: 3,
 *   note: "..."
 * }
 *
 * LOSS:
 * {
 *   type: "LOSS",
 *   quantity: 1,
 *   lossReason: "DAMAGED",
 *   note: "..."
 * }
 *
 * CORRECTION:
 * {
 *   type: "CORRECTION",
 *   newStockQty: 10,
 *   note: "..."
 * }
 */
export function adjustStock(productId, payload, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/stock-adjustments`, {
    method: "POST",
    body: normalizeStockAdjustmentPayload(payload),
    ...withBranchOptions(options),
  });
}

/**
 * Stock history for one product.
 */
export function getProductStockAdjustments(productId, params = {}, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/stock-adjustments`, {
    method: "GET",
    query: buildQuery(params),
    ...withBranchOptions(options),
  });
}

/**
 * All stock adjustments / stock history page.
 */
export function getStockAdjustments(params = {}, options = {}) {
  return apiFetch(`${INVENTORY_BASE}/stock-adjustments`, {
    method: "GET",
    query: buildQuery(params),
    ...withBranchOptions(options),
  });
}

/**
 * Branch-aware summary.
 *
 * Backend returns:
 * {
 *   branchScope,
 *   summary: {
 *     totalActiveProducts,
 *     totalStockUnits,
 *     outOfStockCount,
 *     lowStockCount,
 *     stockCostValue,
 *     stockSellValue
 *   }
 * }
 */
export function getInventorySummary(params = {}, options = {}) {
  return apiFetch(`${INVENTORY_BASE}/summary`, {
    method: "GET",
    query: buildQuery(params),
    ...withBranchOptions(options),
  });
}

/**
 * Download reorder PDF.
 */
export async function downloadReorderPdf(params = {}, options = {}) {
  const response = await apiFetch(`${INVENTORY_BASE}/reorder.pdf`, {
    method: "GET",
    query: buildQuery(params),
    responseType: "blob",
    ...withBranchOptions(options),
  });

  const filename = filenameFromResponse(response, "storvex-reorder.pdf");
  downloadBlob(response, filename);

  return response;
}

/**
 * Download inventory Excel.
 */
export async function downloadInventoryExcel(params = {}, options = {}) {
  const response = await apiFetch(`${INVENTORY_BASE}/export.xlsx`, {
    method: "GET",
    query: buildQuery(params),
    responseType: "blob",
    ...withBranchOptions(options),
  });

  const filename = filenameFromResponse(response, "storvex-inventory.xlsx");
  downloadBlob(response, filename);

  return response;
}

/**
 * Download stock adjustments Excel.
 */
export async function downloadStockAdjustmentsExcel(params = {}, options = {}) {
  const response = await apiFetch(`${INVENTORY_BASE}/stock-adjustments/export.xlsx`, {
    method: "GET",
    query: buildQuery(params),
    responseType: "blob",
    ...withBranchOptions(options),
  });

  const filename = filenameFromResponse(response, "storvex-stock-history.xlsx");
  downloadBlob(response, filename);

  return response;
}

/**
 * Raw blob helpers for pages that need custom download behavior.
 */
export function getReorderPdfBlob(params = {}, options = {}) {
  return apiFetch(`${INVENTORY_BASE}/reorder.pdf`, {
    method: "GET",
    query: buildQuery(params),
    responseType: "blob",
    ...withBranchOptions(options),
  });
}

export function getInventoryExcelBlob(params = {}, options = {}) {
  return apiFetch(`${INVENTORY_BASE}/export.xlsx`, {
    method: "GET",
    query: buildQuery(params),
    responseType: "blob",
    ...withBranchOptions(options),
  });
}

export function getStockAdjustmentsExcelBlob(params = {}, options = {}) {
  return apiFetch(`${INVENTORY_BASE}/stock-adjustments/export.xlsx`, {
    method: "GET",
    query: buildQuery(params),
    responseType: "blob",
    ...withBranchOptions(options),
  });
}

export const updateMarketplaceDraft = updateProductListingDraft;
export const publishProductToMarketplace = publishProductListing;
export const unpublishProductFromMarketplace = unpublishProductListing;

const inventoryApi = {
  getProducts,
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  activateProduct,

  uploadProductImage,
  getProductImages,
  deleteProductImage,
  setPrimaryProductImage,
  getProductImageStudio,
  cleanProductImage,
  approveProductImageForListing,
  removeProductImageListingApproval,
  useProductImageAsMain,
  updateProductListingDraft,
  updateMarketplaceDraft,
  publishProductListing,
  publishProductToMarketplace,
  unpublishProductListing,
  unpublishProductFromMarketplace,

  adjustStock,
  getProductStockAdjustments,
  getStockAdjustments,
  getInventorySummary,
  downloadReorderPdf,
  downloadInventoryExcel,
  downloadStockAdjustmentsExcel,
  getReorderPdfBlob,
  getInventoryExcelBlob,
  getStockAdjustmentsExcelBlob,
};

export default inventoryApi;
