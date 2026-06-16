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
    marketplaceStatus: cleanString(params.marketplaceStatus),
    marketplaceCategory: cleanString(params.marketplaceCategory),
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

function normalizeMarketplacePayload(payload = {}) {
  return cleanObject({
    marketplaceTitle: cleanString(payload.marketplaceTitle || payload.title),
    marketplaceDescription: cleanString(payload.marketplaceDescription || payload.description),
    marketplacePrice: payload.marketplacePrice ?? payload.price,
    marketplaceCategory: cleanString(payload.marketplaceCategory || payload.publicCategory),
    marketplaceAttributes: cleanPlainObject(payload.marketplaceAttributes || payload.attributes),
    marketplaceSlug: cleanString(payload.marketplaceSlug || payload.slug),
  });
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
 * - marketplaceStatus / marketplace fields
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
 * Marketplace publishing checks images later when the owner chooses to publish.
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
 * Product marketplace images.
 *
 * Images are optional for internal inventory/POS products.
 * At least one image is required only when publishing to marketplace.
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

export function createProductImageUploadUrl(productId, fileOrPayload = {}, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  const isBrowserFile =
    typeof File !== "undefined" &&
    fileOrPayload instanceof File;

  const payload = isBrowserFile
    ? {
        filename: fileOrPayload.name,
        contentType: fileOrPayload.type,
        sizeBytes: fileOrPayload.size,
      }
    : {
        filename: cleanString(
          fileOrPayload.filename || fileOrPayload.fileName || fileOrPayload.name,
        ),
        contentType: cleanString(
          fileOrPayload.contentType || fileOrPayload.fileType || fileOrPayload.type,
        ),
        sizeBytes: fileOrPayload.sizeBytes || fileOrPayload.size,
      };

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/images/upload-url`, {
    method: "POST",
    body: cleanObject(payload),
    ...withBranchOptions(options),
  });
}

export async function uploadProductImageToSignedUrl(upload, file) {
  const uploadUrl = cleanString(upload?.uploadUrl);

  if (!uploadUrl) {
    throw new Error("Missing upload URL");
  }

  if (!file) {
    throw new Error("Missing product image file");
  }

  const headers = {
    ...(upload?.headers || {}),
  };

  if (file.type && !headers["Content-Type"]) {
    headers["Content-Type"] = file.type;
  }

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body: file,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Product image upload failed");
  }

  return {
    objectKey: cleanString(upload?.objectKey || upload?.key),
    key: cleanString(upload?.key || upload?.objectKey),
    publicUrl: cleanString(upload?.publicUrl || upload?.url),
    url: cleanString(upload?.publicUrl || upload?.url),
  };
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

export function addProductImage(productId, payload, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/images`, {
    method: "POST",
    body: normalizeProductImagePayload(payload),
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
 * Marketplace draft and publish actions.
 *
 * Draft update saves public-facing listing details.
 * Publish requires backend validation:
 * - active product
 * - at least one image
 * - public title
 * - public description
 * - public price
 * - marketplace category
 */
export function updateMarketplaceDraft(productId, payload, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/marketplace`, {
    method: "PATCH",
    body: normalizeMarketplacePayload(payload),
    ...withBranchOptions(options),
  });
}

export function publishProductToMarketplace(productId, payload = {}, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/marketplace/publish`, {
    method: "PATCH",
    body: normalizeMarketplacePayload(payload),
    ...withBranchOptions(options),
  });
}

export function unpublishProductFromMarketplace(productId, options = {}) {
  const id = cleanString(productId);

  if (!id) {
    return Promise.reject(new Error("Product id is required"));
  }

  return apiFetch(`${INVENTORY_BASE}/products/${encodeURIComponent(id)}/marketplace/unpublish`, {
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

export const inventoryApi = {
  getProducts,
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  activateProduct,

  uploadProductImage,
  createProductImageUploadUrl,
  uploadProductImageToSignedUrl,
  getProductImages,
  addProductImage,
  deleteProductImage,
  setPrimaryProductImage,
  updateMarketplaceDraft,
  publishProductToMarketplace,
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
