import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateSupplier,
  createSupplier,
  createSupplierSupply,
  deactivateSupplier,
  getSupplierById,
  listSupplierSupplies,
  listSuppliers,
  updateSupplier,
} from "./api";
import type {
  SupplierPayload,
  SupplierRecord,
  SupplierSourceType,
  SupplierSupplyItem,
  SupplierSupplyPayload,
  SupplierSupplyRecord,
  SupplierSuppliesResponse,
  SuppliersResponse,
} from "./types";

export const supplierKeys = {
  all: ["suppliers"] as const,
  list: () => ["suppliers", "list"] as const,
  detail: (supplierId?: string | null) => ["suppliers", "detail", supplierId || "missing"] as const,
  supplies: (supplierId?: string | null) => ["suppliers", "supplies", supplierId || "missing"] as const,
};

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeSupplier(value?: SupplierRecord | null): SupplierRecord | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    name: clean(value.name, "Supplier"),
    idType: value.idType || "OTHER",
    idNumber: value.idNumber || null,
    phone: value.phone || null,
    email: value.email || null,
    address: value.address || null,
    notes: value.notes || null,
    companyName: value.companyName || null,
    taxId: value.taxId || null,
    sourceType: value.sourceType || "OTHER",
    sourceDetails: value.sourceDetails || null,
    isActive: value.isActive !== false,
  };
}

export function normalizeSuppliers(response?: SuppliersResponse | SupplierRecord[] | null) {
  const source = Array.isArray(response) ? response : response?.suppliers || [];

  return source
    .map((supplier) => normalizeSupplier(supplier))
    .filter((supplier): supplier is SupplierRecord => Boolean(supplier));
}

export function supplierSourceLabel(value?: SupplierSourceType | null) {
  const key = String(value || "").toUpperCase();

  if (key === "BOUGHT") return "Bought stock";
  if (key === "GIFT") return "Gifted stock";
  if (key === "TRADE_IN") return "Trade-in";
  if (key === "CONSIGNMENT") return "Consignment";
  if (key === "OTHER") return "Other source";

  return key ? key.replaceAll("_", " ").toLowerCase().replace(/^./, (char) => char.toUpperCase()) : "Other source";
}

export function supplierIdTypeLabel(value?: string | null) {
  const key = String(value || "").toUpperCase();

  if (key === "NATIONAL_ID") return "National ID";
  if (key === "PASSPORT") return "Passport";
  if (key === "OTHER") return "Other ID";

  return key ? key.replaceAll("_", " ").toLowerCase().replace(/^./, (char) => char.toUpperCase()) : "Other ID";
}

export function supplyItems(supply?: SupplierSupplyRecord | null): SupplierSupplyItem[] {
  if (Array.isArray(supply?.items)) return supply.items;
  if (Array.isArray(supply?.SupplierSupplyItem)) return supply.SupplierSupplyItem;
  return [];
}

export function supplyTotals(supply?: SupplierSupplyRecord | null) {
  const items = supplyItems(supply);

  const totalCost = Number.isFinite(Number(supply?.totalCost))
    ? num(supply?.totalCost, 0)
    : items.reduce((sum, item) => sum + num(item.buyPrice, 0) * num(item.quantity, 0), 0);

  const totalSell = Number.isFinite(Number(supply?.totalSell))
    ? num(supply?.totalSell, 0)
    : items.reduce((sum, item) => sum + num(item.sellPrice, 0) * num(item.quantity, 0), 0);

  return {
    totalCost,
    totalSell,
    itemsCount: Number.isFinite(Number(supply?.itemsCount)) ? num(supply?.itemsCount, 0) : items.length,
    totalQuantity: items.reduce((sum, item) => sum + num(item.quantity, 0), 0),
  };
}

export function normalizeSupplierSupplies(response?: SupplierSuppliesResponse | SupplierSupplyRecord[] | null) {
  const source = Array.isArray(response) ? response : response?.supplies || [];

  return source.filter((supply): supply is SupplierSupplyRecord => Boolean(supply?.id));
}

export function useSuppliers() {
  return useQuery({
    queryKey: supplierKeys.list(),
    queryFn: async () => normalizeSuppliers(await listSuppliers()),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useSupplier(supplierId: string) {
  return useQuery({
    queryKey: supplierKeys.detail(supplierId),
    queryFn: async () => normalizeSupplier(await getSupplierById(supplierId)),
    enabled: Boolean(supplierId),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useSupplierSupplies(supplierId: string) {
  return useQuery({
    queryKey: supplierKeys.supplies(supplierId),
    queryFn: async () => normalizeSupplierSupplies(await listSupplierSupplies(supplierId)),
    enabled: Boolean(supplierId),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SupplierPayload) => createSupplier(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ supplierId, payload }: { supplierId: string; payload: SupplierPayload }) =>
      updateSupplier(supplierId, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
        queryClient.invalidateQueries({ queryKey: supplierKeys.detail(variables.supplierId) }),
      ]);
    },
  });
}

export function useActivateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (supplierId: string) => activateSupplier(supplierId),
    onSuccess: async (_data, supplierId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
        queryClient.invalidateQueries({ queryKey: supplierKeys.detail(supplierId) }),
      ]);
    },
  });
}

export function useDeactivateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (supplierId: string) => deactivateSupplier(supplierId),
    onSuccess: async (_data, supplierId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
        queryClient.invalidateQueries({ queryKey: supplierKeys.detail(supplierId) }),
      ]);
    },
  });
}

export function useCreateSupplierSupply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ supplierId, payload }: { supplierId: string; payload: SupplierSupplyPayload }) =>
      createSupplierSupply(supplierId, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
        queryClient.invalidateQueries({ queryKey: supplierKeys.detail(variables.supplierId) }),
        queryClient.invalidateQueries({ queryKey: supplierKeys.supplies(variables.supplierId) }),
      ]);
    },
  });
}
