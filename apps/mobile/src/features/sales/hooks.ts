import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addSalePayment,
  getSaleReceipt,
  listOutstandingCreditSales,
  listOverdueCreditSales,
  listSales,
} from "./api";
import type {
  AddSalePaymentPayload,
  CreditSalesResponse,
  DashboardSalesSummary,
  SaleListItem,
  SaleReceiptResponse,
  SalesListResponse,
} from "./types";

export const salesKeys = {
  all: ["sales"] as const,

  list: (params: {
    branchId?: string | null;
    limit?: number;
    cursor?: string | null;
    q?: string | null;
  }) =>
    [
      "sales",
      "list",
      params.branchId || "active",
      params.limit || 5,
      params.cursor || "first",
      params.q || "",
    ] as const,

  dashboard: (branchId?: string | null) =>
    ["sales", "dashboard", branchId || "active"] as const,

  receipt: (saleId?: string | null, branchId?: string | null) =>
    ["sales", "receipt", saleId || "missing", branchId || "active"] as const,

  creditOutstanding: (branchId?: string | null) =>
    ["sales", "credit", "outstanding", branchId || "active"] as const,

  creditOverdue: (branchId?: string | null) =>
    ["sales", "credit", "overdue", branchId || "active"] as const,
};

export function normalizeSalesList(value?: SalesListResponse | CreditSalesResponse) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.sales)) return value.sales;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

export function getNextSalesCursor(value?: SalesListResponse) {
  if (Array.isArray(value)) return null;
  return value?.nextCursor || value?.cursor || null;
}

export function saleAmount(sale: SaleListItem) {
  const raw =
    sale.totalAmount ??
    sale.total ??
    sale.amount ??
    sale.grandTotal ??
    sale.finalTotal ??
    sale.saleTotal ??
    sale.netTotal ??
    0;

  const amount = Number(raw || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function salePaidAmount(sale: SaleListItem) {
  const raw = sale.amountPaid ?? sale.paidAmount ?? 0;
  const amount = Number(raw || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function saleBalanceAmount(sale: SaleListItem) {
  const raw =
    sale.balanceDue ??
    sale.remainingBalance ??
    Math.max(0, saleAmount(sale) - salePaidAmount(sale));

  const amount = Number(raw || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function saleDateValue(sale: SaleListItem) {
  return sale.createdAt || sale.soldAt || sale.date || null;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function startOfTodayIso() {
  return startOfToday().toISOString();
}

function endOfTodayIso() {
  return endOfToday().toISOString();
}

function isTodaySale(sale: SaleListItem) {
  const rawDate = saleDateValue(sale);
  if (!rawDate) return false;

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return false;

  return date >= startOfToday() && date <= endOfToday();
}

export function buildDashboardSalesSummary(
  sales: SaleListItem[],
): DashboardSalesSummary {
  const todaySales = sales.filter(isTodaySale);

  return {
    todayTotal: todaySales.reduce((sum, sale) => sum + saleAmount(sale), 0),
    todayCount: todaySales.length,
    latestSale: todaySales[0] || null,
  };
}

export function useSalesList(params: {
  branchId?: string | null;
  limit?: number;
  cursor?: string | null;
  q?: string | null;
}) {
  return useQuery({
    queryKey: salesKeys.list(params),
    queryFn: () =>
      listSales({
        branchId: params.branchId,
        limit: params.limit ?? 5,
        cursor: params.cursor,
        q: params.q,
      }),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useDashboardSales(branchId?: string | null) {
  return useQuery({
  queryKey: salesKeys.dashboard(branchId),
  queryFn: async () => {
    const response = await listSales({
      branchId,
      limit: 20,
      from: startOfTodayIso(),
      to: endOfTodayIso(),
    });

    return buildDashboardSalesSummary(normalizeSalesList(response));
  },
  staleTime: 30_000,
  retry: 1,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
});
}

export function useSaleReceipt(
  saleId?: string | null,
  branchId?: string | null,
) {
  return useQuery<SaleReceiptResponse>({
    queryKey: salesKeys.receipt(saleId, branchId),
    queryFn: () => getSaleReceipt(String(saleId), branchId),
    enabled: Boolean(saleId),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useAddSalePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addSalePayment,
    onSuccess: async (_data, variables: AddSalePaymentPayload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: salesKeys.receipt(variables.saleId, variables.branchId),
        }),
        queryClient.invalidateQueries({ queryKey: salesKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["cash-drawer-status"] }),
      ]);
    },
  });
}

export function useOutstandingCreditSales(branchId?: string | null) {
  return useQuery({
    queryKey: salesKeys.creditOutstanding(branchId),
    queryFn: () =>
      listOutstandingCreditSales({
        branchId,
        limit: 50,
      }),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useOverdueCreditSales(branchId?: string | null) {
  return useQuery({
    queryKey: salesKeys.creditOverdue(branchId),
    queryFn: () =>
      listOverdueCreditSales({
        branchId,
        limit: 50,
      }),
    staleTime: 10_000,
    retry: 1,
  });
}