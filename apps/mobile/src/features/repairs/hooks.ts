import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveRepair,
  assignTechnician,
  createRepair,
  deleteRepair,
  getRepair,
  getRepairs,
  getRepairTechnicians,
  listRepairCustomers,
  updateRepair,
  updateRepairStatus,
} from "./api";
import type {
  CustomersResponse,
  RepairCustomer,
  RepairPayload,
  RepairPerson,
  RepairRecord,
  RepairsResponse,
  RepairStatus,
  RepairTechniciansResponse,
} from "./types";

export const repairKeys = {
  all: ["repairs"] as const,
  list: (branchId?: string | null) => ["repairs", "list", branchId || "active"] as const,
  detail: (repairId?: string | null) => ["repairs", "detail", repairId || "missing"] as const,
  technicians: (branchId?: string | null) => ["repairs", "technicians", branchId || "active"] as const,
  customers: () => ["repairs", "customers"] as const,
};

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isRepairRecord(value: unknown): value is RepairRecord {
  return Boolean(value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string");
}

function unwrapRepair(value: unknown): RepairRecord | null {
  if (isRepairRecord(value)) return value;

  if (value && typeof value === "object" && "repair" in value) {
    const nested = (value as { repair?: unknown }).repair;
    return isRepairRecord(nested) ? nested : null;
  }

  return null;
}

export function normalizeRepair(value?: RepairRecord | null): RepairRecord | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    customerId: value.customerId || value.customer?.id || null,
    customer: value.customer || null,
    device: clean(value.device, "Device"),
    serial: value.serial || null,
    issue: value.issue || null,
    status: clean(value.status, "RECEIVED"),
    warrantyEnd: value.warrantyEnd || null,
    technicianId: value.technicianId || value.technician?.id || null,
    technician: value.technician || null,
    storeLocation: value.storeLocation || value.branch || null,
    branch: value.branch || value.storeLocation || null,
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || null,
  };
}

export function normalizeRepairs(response?: RepairsResponse | RepairRecord[] | null) {
  const source = Array.isArray(response) ? response : response?.repairs || [];

  return source
    .map((repair) => normalizeRepair(repair))
    .filter((repair): repair is RepairRecord => Boolean(repair));
}

export function normalizeTechnicians(response?: RepairTechniciansResponse | RepairPerson[] | null) {
  const source = Array.isArray(response) ? response : response?.technicians || [];

  return source
    .filter((person): person is RepairPerson => Boolean(person?.id))
    .map((person) => ({
      ...person,
      name: clean(person.name, "Staff member"),
    }));
}

export function normalizeCustomers(response?: CustomersResponse | RepairCustomer[] | null) {
  const source = Array.isArray(response) ? response : response?.customers || response?.items || [];

  return source
    .filter((customer): customer is RepairCustomer => Boolean(customer?.id) && customer.isActive !== false)
    .map((customer) => ({
      ...customer,
      name: clean(customer.name, "Customer"),
      phone: customer.phone || null,
      email: customer.email || null,
    }));
}

export function repairStatusLabel(status?: string | null) {
  const key = String(status || "").toUpperCase();

  if (key === "RECEIVED") return "Received";
  if (key === "IN_PROGRESS") return "In progress";
  if (key === "COMPLETED") return "Completed";
  if (key === "DELIVERED") return "Delivered";

  return key ? key.replaceAll("_", " ").toLowerCase().replace(/^./, (char) => char.toUpperCase()) : "Received";
}

export function useRepairs(params: { branchId?: string | null } = {}) {
  return useQuery({
    queryKey: repairKeys.list(params.branchId),
    queryFn: async () => normalizeRepairs(await getRepairs({ branchId: params.branchId })),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useRepair(repairId: string) {
  return useQuery({
    queryKey: repairKeys.detail(repairId),
    queryFn: async () => {
      const response = await getRepair(repairId);
      return normalizeRepair(unwrapRepair(response));
    },
    enabled: Boolean(repairId),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useRepairTechnicians(params: { branchId?: string | null } = {}) {
  return useQuery({
    queryKey: repairKeys.technicians(params.branchId),
    queryFn: async () => normalizeTechnicians(await getRepairTechnicians({ branchId: params.branchId })),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useRepairCustomers() {
  return useQuery({
    queryKey: repairKeys.customers(),
    queryFn: async () => {
      const response = await listRepairCustomers();
      return normalizeCustomers(response);
    },
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RepairPayload) => createRepair(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: repairKeys.all });
    },
  });
}

export function useUpdateRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repairId, payload }: { repairId: string; payload: RepairPayload }) => updateRepair(repairId, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: repairKeys.all }),
        queryClient.invalidateQueries({ queryKey: repairKeys.detail(variables.repairId) }),
      ]);
    },
  });
}

export function useUpdateRepairStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repairId, status }: { repairId: string; status: RepairStatus }) => updateRepairStatus(repairId, status),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: repairKeys.all }),
        queryClient.invalidateQueries({ queryKey: repairKeys.detail(variables.repairId) }),
      ]);
    },
  });
}

export function useAssignTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repairId, technicianId }: { repairId: string; technicianId?: string | null }) =>
      assignTechnician(repairId, technicianId),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: repairKeys.all }),
        queryClient.invalidateQueries({ queryKey: repairKeys.detail(variables.repairId) }),
      ]);
    },
  });
}

export function useArchiveRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repairId: string) => archiveRepair(repairId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: repairKeys.all });
    },
  });
}

export function useDeleteRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repairId: string) => deleteRepair(repairId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: repairKeys.all });
    },
  });
}
