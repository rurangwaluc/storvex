import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSale,
  getCashDrawerStatus,
  getQuickPicks,
  getSaleReceipt,
  listPosCustomers,
  searchPosProducts,
} from "./api";

export function useQuickPicks(branchId?: string | null) {
  return useQuery({
    queryKey: ["pos-quick-picks", branchId || "active"],
    queryFn: () =>
      getQuickPicks({
        branchId,
        periodDays: 7,
        limit: 5,
      }),
    staleTime: 30_000,
  });
}

export function useProductSearch(params: {
  q: string;
  branchId?: string | null;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["pos-product-search", params.q, params.branchId || "active"],
    queryFn: () =>
      searchPosProducts({
        q: params.q,
        branchId: params.branchId,
        limit: 8,
      }),
    enabled: params.enabled,
    staleTime: 15_000,
  });
}

export function useCustomerSearch(params: {
  q: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: ["pos-customer-search", params.q],
    queryFn: () =>
      listPosCustomers({
        q: params.q,
        limit: 5,
      }),
    enabled: params.enabled,
    staleTime: 15_000,
  });
}

export function useCashDrawerStatus(enabled: boolean) {
  return useQuery({
    queryKey: ["cash-drawer-status"],
    queryFn: getCashDrawerStatus,
    enabled,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSale,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["pos-quick-picks"] }),
        queryClient.invalidateQueries({ queryKey: ["cash-drawer-status"] }),
        queryClient.invalidateQueries({ queryKey: ["pos-product-search"] }),
      ]);
    },
  });
}

export function useSaleReceipt(saleId?: string | null, branchId?: string | null) {
  return useQuery({
    queryKey: ["pos-sale-receipt", saleId, branchId || "active"],
    queryFn: () => getSaleReceipt(String(saleId), branchId),
    enabled: Boolean(saleId),
    staleTime: 15_000,
  });
}