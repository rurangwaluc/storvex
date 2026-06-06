import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeCashDrawer,
  getCashDrawerMovements,
  getCashDrawerStatus,
  openCashDrawer,
} from "./api";

export const cashDrawerKeys = {
  status: ["cash-drawer-status"] as const,
  movements: ["cash-drawer-movements"] as const,
};

export function useCashDrawerStatus() {
  return useQuery({
    queryKey: cashDrawerKeys.status,
    queryFn: getCashDrawerStatus,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useCashDrawerMovements(enabled: boolean) {
  return useQuery({
    queryKey: cashDrawerKeys.movements,
    queryFn: () => getCashDrawerMovements(20),
    enabled,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useOpenCashDrawer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: openCashDrawer,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cashDrawerKeys.status }),
        queryClient.invalidateQueries({ queryKey: cashDrawerKeys.movements }),
        queryClient.invalidateQueries({ queryKey: ["cash-drawer-status"] }),
      ]);
    },
  });
}

export function useCloseCashDrawer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeCashDrawer,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cashDrawerKeys.status }),
        queryClient.invalidateQueries({ queryKey: cashDrawerKeys.movements }),
        queryClient.invalidateQueries({ queryKey: ["cash-drawer-status"] }),
      ]);
    },
  });
}