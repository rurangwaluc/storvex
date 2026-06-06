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
 * stockQty is allowed here because backend creates:
 * - Product catalog row
 * - BranchInventory row for active branch
 * - synced Product.stockQty
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
    method: "POST",
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

  const filename = "storvex-reorder.pdf";
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

  const filename = "storvex-inventory.xlsx";
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

  const filename = "storvex-stock-history.xlsx";
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