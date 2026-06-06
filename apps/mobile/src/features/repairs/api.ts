import { api } from "../../lib/api/client";
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

function cleanString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function toQueryString(params: Record<string, unknown> = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;

    const cleanValue = cleanString(value);
    if (!cleanValue) continue;

    search.set(key, cleanValue);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

function normalizeRepairPayload(payload: RepairPayload): RepairPayload {
  return {
    customerId: cleanString(payload.customerId),
    device: cleanString(payload.device),
    serial: cleanString(payload.serial) || null,
    issue: cleanString(payload.issue),
    warrantyEnd: cleanString(payload.warrantyEnd) || null,
  };
}

export async function getRepairs(params: { branchId?: string | null; allStoreLocations?: boolean } = {}) {
  return api.get<RepairsResponse | RepairRecord[]>(
    `/repairs${toQueryString({
      branchId: cleanString(params.branchId),
      allBranches: params.allStoreLocations ? "true" : "",
    })}`,
  );
}

export async function getRepair(repairId: string) {
  const id = cleanString(repairId);

  if (!id) {
    throw new Error("Repair record is missing.");
  }

  return api.get<RepairRecord | { repair?: RepairRecord }>(`/repairs/${encodeURIComponent(id)}`);
}

export async function createRepair(payload: RepairPayload) {
  return api.post<RepairRecord | { repair?: RepairRecord }>("/repairs", normalizeRepairPayload(payload));
}

export async function updateRepair(repairId: string, payload: RepairPayload) {
  const id = cleanString(repairId);

  if (!id) {
    throw new Error("Repair record is missing.");
  }

  return api.put<RepairRecord | { repair?: RepairRecord }>(
    `/repairs/${encodeURIComponent(id)}`,
    normalizeRepairPayload(payload),
  );
}

export async function updateRepairStatus(repairId: string, status: RepairStatus) {
  const id = cleanString(repairId);

  if (!id) {
    throw new Error("Repair record is missing.");
  }

  return api.put<RepairRecord | { repair?: RepairRecord }>(`/repairs/${encodeURIComponent(id)}/status`, {
    status: cleanString(status),
  });
}

export async function assignTechnician(repairId: string, technicianId?: string | null) {
  const id = cleanString(repairId);

  if (!id) {
    throw new Error("Repair record is missing.");
  }

  return api.put<RepairRecord | { repair?: RepairRecord }>(`/repairs/${encodeURIComponent(id)}/assign`, {
    technicianId: cleanString(technicianId) || null,
  });
}

export async function archiveRepair(repairId: string) {
  const id = cleanString(repairId);

  if (!id) {
    throw new Error("Repair record is missing.");
  }

  return api.delete<{ message?: string }>(`/repairs/${encodeURIComponent(id)}/archive`);
}

export async function deleteRepair(repairId: string) {
  const id = cleanString(repairId);

  if (!id) {
    throw new Error("Repair record is missing.");
  }

  return api.delete<{ message?: string }>(`/repairs/${encodeURIComponent(id)}`);
}

export async function getRepairTechnicians(params: { branchId?: string | null; allStoreLocations?: boolean } = {}) {
  return api.get<RepairTechniciansResponse | RepairPerson[]>(
    `/repairs/technicians${toQueryString({
      branchId: cleanString(params.branchId),
      allBranches: params.allStoreLocations ? "true" : "",
    })}`,
  );
}

export async function listRepairCustomers() {
  return api.get<CustomersResponse | RepairCustomer[]>("/customers");
}
