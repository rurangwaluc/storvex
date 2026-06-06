import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adjustStock,
  createStockProduct,
  getInventorySummary,
  getStockProducts,
  updateStockProduct,
} from "./api";
import type {
  CreateStockProductPayload,
  InventorySummary,
  InventorySummaryResponse,
  StockAdjustmentPayload,
  StockFilter,
  StockProduct,
  StockProductsResponse,
  StockSort,
  UpdateStockProductPayload,
} from "./types";

type StockProductsParams = {
  branchId?: string | null;
  q?: string | null;
  filter?: StockFilter;
  sort?: StockSort;
  enabled?: boolean;
};

export const stockKeys = {
  all: ["stock"] as const,
  summary: (branchId?: string | null) => ["stock", "summary", branchId || "active"] as const,
  products: (params: StockProductsParams) =>
    [
      "stock",
      "products",
      params.branchId || "active",
      params.q || "",
      params.filter || "all",
      params.sort || "newest",
    ] as const,
};

function normalizeNumber(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function productQuantity(product?: StockProduct | null) {
  return normalizeNumber(
    product?.effectiveStockQty ?? product?.branchStockQty ?? product?.stockQty,
    0,
  );
}

export function productMinStock(product?: StockProduct | null) {
  const raw = product?.minStockLevel;
  if (raw === null || raw === undefined || raw === "") return null;

  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function productCostPrice(product?: StockProduct | null) {
  return normalizeNumber(product?.costPrice, 0);
}

export function productSellPrice(product?: StockProduct | null) {
  return normalizeNumber(product?.sellPrice, 0);
}

export function productStockStatus(product?: StockProduct | null): {
  label: string;
  tone: "green" | "amber" | "red" | "slate";
} {
  const qty = productQuantity(product);
  const min = productMinStock(product);

  if (qty <= 0) return { label: "Out of stock", tone: "red" };
  if (min !== null && qty <= min) return { label: "Low stock", tone: "amber" };
  return { label: "In stock", tone: "green" };
}

export function normalizeInventorySummary(
  response?: InventorySummaryResponse | null,
): InventorySummary {
  const summary = response?.summary || {};

  return {
    totalActiveProducts: normalizeNumber(summary.totalActiveProducts, 0),
    totalStockUnits: normalizeNumber(summary.totalStockUnits, 0),
    outOfStockCount: normalizeNumber(summary.outOfStockCount, 0),
    lowStockCount: normalizeNumber(summary.lowStockCount, 0),
    stockCostValue: normalizeNumber(summary.stockCostValue, 0),
    stockSellValue: normalizeNumber(summary.stockSellValue, 0),
  };
}

export function normalizeStockProducts(response?: StockProductsResponse | null) {
  if (Array.isArray(response)) return response as StockProduct[];
  if (Array.isArray(response?.products)) return response.products;
  return [];
}

export function useInventorySummary(branchId?: string | null) {
  return useQuery({
    queryKey: stockKeys.summary(branchId),
    queryFn: async () => normalizeInventorySummary(await getInventorySummary({ branchId })),
    staleTime: 60_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useStockProducts(params: StockProductsParams = {}) {
  const enabled = params.enabled ?? true;

  return useQuery({
    queryKey: stockKeys.products(params),
    queryFn: async () =>
      normalizeStockProducts(
        await getStockProducts({
          branchId: params.branchId,
          q: params.q,
          filter: params.filter || "all",
          sort: params.sort || "newest",
          limit: 80,
        }),
      ),
    enabled,
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateStockProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStockProductPayload) => createStockProduct(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });
}

export function useUpdateStockProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { productId: string; payload: UpdateStockProductPayload }) =>
      updateStockProduct(variables.productId, variables.payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StockAdjustmentPayload) => adjustStock(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });
}
