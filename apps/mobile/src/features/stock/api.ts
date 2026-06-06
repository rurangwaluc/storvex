import { api } from "../../lib/api/client";
import type {
  CreateStockProductPayload,
  InventorySummaryResponse,
  StockAdjustmentPayload,
  StockAdjustmentResponse,
  StockFilter,
  StockProductsResponse,
  StockSort,
  UpdateStockProductPayload,
} from "./types";

function cleanString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function toQueryString(params: Record<string, unknown>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

function filterFlags(filter?: StockFilter) {
  return {
    lowStock: filter === "low" ? true : undefined,
    outOfStock: filter === "out" ? true : undefined,
  };
}

export async function getInventorySummary(params: { branchId?: string | null } = {}) {
  return api.get<InventorySummaryResponse>(
    `/inventory/summary${toQueryString({ branchId: cleanString(params.branchId) })}`,
  );
}

export async function getStockProducts(
  params: {
    branchId?: string | null;
    q?: string | null;
    filter?: StockFilter;
    sort?: StockSort;
    limit?: number;
    cursor?: string | null;
  } = {},
) {
  return api.get<StockProductsResponse>(
    `/inventory/products${toQueryString({
      branchId: cleanString(params.branchId),
      q: cleanString(params.q),
      active: true,
      sort: params.sort || "newest",
      limit: params.limit ?? 80,
      cursor: cleanString(params.cursor),
      ...filterFlags(params.filter),
    })}`,
  );
}

export async function createStockProduct(payload: CreateStockProductPayload) {
  return api.post<StockProductsResponse | unknown>("/inventory/products", payload);
}

export async function updateStockProduct(productId: string, payload: UpdateStockProductPayload) {
  const id = cleanString(productId);

  if (!id) {
    throw new Error("Product record is missing.");
  }

  return api.put<unknown>(`/inventory/products/${encodeURIComponent(id)}`, payload);
}

export async function adjustStock(payload: StockAdjustmentPayload) {
  const id = cleanString(payload.productId);

  if (!id) {
    throw new Error("Product record is missing.");
  }

  return api.post<StockAdjustmentResponse>(
    `/inventory/products/${encodeURIComponent(id)}/stock-adjustments`,
    {
      type: payload.type,
      quantity: payload.quantity,
      newStockQty: payload.newStockQty,
      lossReason: cleanString(payload.lossReason),
      note: cleanString(payload.note),
    },
  );
}
