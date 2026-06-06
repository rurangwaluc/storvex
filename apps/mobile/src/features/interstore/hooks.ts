import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addInterStorePayment,
  createInterStoreDeal,
  getInterStoreDeal,
  getInterStoreDeals,
  getInterStorePayments,
  listInternalSuppliers,
  markInterStorePaid,
  receiveInterStoreDeal,
  returnInterStoreDeal,
  searchInternalSupplierProducts,
  sellInterStoreDeal,
} from "./api";
import type {
  AddInterStorePaymentPayload,
  CreateInterStoreDealPayload,
  InterStoreDeal,
  InterStorePayment,
  InterStorePaymentSummary,
  InterStoreDealsParams,
  InterStoreSupplier,
  InterStoreSupplierProduct,
  MarkInterStorePaidPayload,
  MarkInterStoreReturnedPayload,
  MarkInterStoreSoldPayload,
} from "./types";

export const interStoreKeys = {
  all: ["interstore"] as const,
  deals: (params: InterStoreDealsParams) => ["interstore", "deals", params] as const,
  deal: (id: string, params: InterStoreDealsParams) => ["interstore", "deal", id, params] as const,
  payments: (id: string, params: InterStoreDealsParams) => ["interstore", "payments", id, params] as const,
  suppliers: (q: string) => ["interstore", "suppliers", q] as const,
  supplierProducts: (supplierId: string, q: string) =>
    ["interstore", "supplier-products", supplierId, q] as const,
};

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function dealQuantity(deal: InterStoreDeal | null | undefined) {
  return num(deal?.quantity, 0);
}

export function dealSoldQuantity(deal: InterStoreDeal | null | undefined) {
  return num(deal?.soldQuantity, 0);
}

export function dealReturnedQuantity(deal: InterStoreDeal | null | undefined) {
  return num(deal?.returnedQuantity, 0);
}

export function dealRemainingQuantity(deal: InterStoreDeal | null | undefined) {
  return Math.max(0, dealQuantity(deal) - dealSoldQuantity(deal) - dealReturnedQuantity(deal));
}

export function normalizeDeal(value?: InterStoreDeal | null): InterStoreDeal | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    productName: clean(value.productName, "Unnamed product"),
    serial: clean(value.serial, ""),
    status: clean(value.status, "BORROWED"),
    quantity: dealQuantity(value),
    soldQuantity: dealSoldQuantity(value),
    returnedQuantity: dealReturnedQuantity(value),
    agreedPrice: num(value.agreedPrice, 0),
    soldPrice: value.soldPrice == null ? null : num(value.soldPrice, 0),
    paidAmount: value.paidAmount == null ? 0 : num(value.paidAmount, 0),
    resellerName: clean(value.resellerName, ""),
    resellerPhone: clean(value.resellerPhone, ""),
    externalSupplierName: value.externalSupplierName || null,
    externalSupplierPhone: value.externalSupplierPhone || null,
    supplierTenantId: value.supplierTenantId || null,
    branch: value.branch || value.borrowerBranch || null,
  };
}

export function normalizeSupplier(value?: InterStoreSupplier | null): InterStoreSupplier | null {
  if (!value?.id) return null;
  return {
    ...value,
    id: value.id,
    name: clean(value.name, "Unnamed store"),
    phone: value.phone || null,
    email: value.email || null,
  };
}

export function normalizeSupplierProduct(
  value?: InterStoreSupplierProduct | null,
): InterStoreSupplierProduct | null {
  if (!value?.id) return null;
  return {
    ...value,
    id: value.id,
    name: clean(value.name, "Unnamed product"),
    serial: value.serial || null,
    sku: value.sku || null,
    barcode: value.barcode || null,
    brand: value.brand || null,
    category: value.category || null,
    stockQty: num(value.stockQty, 0),
    suggestedPrice: num(value.suggestedPrice ?? value.sellPrice ?? value.costPrice, 0),
  };
}


export function normalizePayment(value?: InterStorePayment | null): InterStorePayment | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    amount: num(value.amount, 0),
    method: clean(value.method, "CASH"),
    note: value.note || null,
  };
}

export function normalizePaymentSummary(value?: Partial<InterStorePaymentSummary> | null): InterStorePaymentSummary {
  return {
    owed: num(value?.owed, 0),
    totalPaid: num(value?.totalPaid, 0),
    balanceDue: num(value?.balanceDue, 0),
    count: num(value?.count, 0),
  };
}

export function useInterStoreDeals(params: InterStoreDealsParams) {
  return useQuery({
    queryKey: interStoreKeys.deals(params),
    queryFn: async () => {
      const response = await getInterStoreDeals(params);
      return {
        deals: ((response.deals || [])
          .map((deal) => normalizeDeal(deal))
          .filter(Boolean) || []) as InterStoreDeal[],
        count: num(response.count, response.deals?.length || 0),
        branchScope: response.branchScope || null,
      };
    },
    staleTime: 15_000,
    retry: 1,
  });
}


export function useInterStoreDeal(id: string, params: InterStoreDealsParams) {
  return useQuery({
    queryKey: interStoreKeys.deal(id, params),
    queryFn: async () => {
      const response = await getInterStoreDeal(id, params);
      return normalizeDeal(response.deal || null);
    },
    enabled: Boolean(id),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useInterStorePayments(id: string, params: InterStoreDealsParams) {
  return useQuery({
    queryKey: interStoreKeys.payments(id, params),
    queryFn: async () => {
      const response = await getInterStorePayments(id, params);
      return {
        payments: ((response.payments || [])
          .map((payment) => normalizePayment(payment))
          .filter(Boolean) || []) as InterStorePayment[],
        summary: normalizePaymentSummary(response.summary || null),
      };
    },
    enabled: Boolean(id),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useInternalSuppliers(q: string) {
  return useQuery({
    queryKey: interStoreKeys.suppliers(q),
    queryFn: async () =>
      ((await listInternalSuppliers(q)).suppliers || [])
        .map((supplier) => normalizeSupplier(supplier))
        .filter(Boolean) as InterStoreSupplier[],
    staleTime: 30_000,
    retry: 1,
  });
}

export function useInternalSupplierProducts(supplierId: string | null, q: string) {
  return useQuery({
    queryKey: interStoreKeys.supplierProducts(supplierId || "none", q),
    queryFn: async () => {
      if (!supplierId) return [];
      return ((await searchInternalSupplierProducts(supplierId, q)).products || [])
        .map((product) => normalizeSupplierProduct(product))
        .filter(Boolean) as InterStoreSupplierProduct[];
    },
    enabled: Boolean(supplierId),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateInterStoreDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInterStoreDealPayload) => createInterStoreDeal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interStoreKeys.all });
    },
  });
}

export function useReceiveInterStoreDeal(params: InterStoreDealsParams) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => receiveInterStoreDeal(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interStoreKeys.all });
    },
  });
}

export function useSellInterStoreDeal(params: InterStoreDealsParams) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MarkInterStoreSoldPayload }) =>
      sellInterStoreDeal(id, payload, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interStoreKeys.all });
    },
  });
}

export function useReturnInterStoreDeal(params: InterStoreDealsParams) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MarkInterStoreReturnedPayload }) =>
      returnInterStoreDeal(id, payload, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interStoreKeys.all });
    },
  });
}

export function useAddInterStorePayment(params: InterStoreDealsParams) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AddInterStorePaymentPayload }) =>
      addInterStorePayment(id, payload, params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: interStoreKeys.all });
      queryClient.invalidateQueries({ queryKey: interStoreKeys.deal(variables.id, params) });
      queryClient.invalidateQueries({ queryKey: interStoreKeys.payments(variables.id, params) });
    },
  });
}

export function useMarkInterStorePaid(params: InterStoreDealsParams) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MarkInterStorePaidPayload }) =>
      markInterStorePaid(id, payload, params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: interStoreKeys.all });
      queryClient.invalidateQueries({ queryKey: interStoreKeys.deal(variables.id, params) });
      queryClient.invalidateQueries({ queryKey: interStoreKeys.payments(variables.id, params) });
    },
  });
}

