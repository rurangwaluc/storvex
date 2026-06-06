import { api } from "../../lib/api/client";
import type {
  BranchesResponse,
  CustomerLedgerResponse,
  CustomerPayload,
  CustomerRecord,
  CustomersResponse,
  EmployeePayload,
  EmployeeRecord,
  EmployeesResponse,
  PeopleBranch,
  StaffRole,
} from "./types";

function cleanString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function cleanRole(value: unknown) {
  return cleanString(value).toUpperCase();
}

function cleanIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const ids: string[] = [];

  for (const item of value) {
    const id = cleanString(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
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

function requireId(id: string, label: string) {
  const cleanId = cleanString(id);

  if (!cleanId) {
    throw new Error(`${label} is missing.`);
  }

  return cleanId;
}

function normalizeCustomerPayload(payload: CustomerPayload): CustomerPayload {
  return {
    name: cleanString(payload.name),
    phone: cleanString(payload.phone),
    email: cleanString(payload.email) || null,
    address: cleanString(payload.address) || null,
    tinNumber: cleanString(payload.tinNumber) || null,
    idNumber: cleanString(payload.idNumber) || null,
    notes: cleanString(payload.notes) || null,
    whatsappOptIn: Boolean(payload.whatsappOptIn),
  };
}

function normalizeEmployeePayload(payload: EmployeePayload): EmployeePayload {
  return {
    name: cleanString(payload.name),
    email: cleanString(payload.email).toLowerCase(),
    password: payload.password ? String(payload.password) : undefined,
    phone: cleanString(payload.phone) || null,
    role: cleanRole(payload.role),
    branchIds: cleanIds(payload.branchIds),
    defaultBranchId: cleanString(payload.defaultBranchId) || null,
    canViewAllBranches: Boolean(payload.canViewAllBranches),
  };
}

export async function listCustomers(
  params: { q?: string | null; includeInactive?: boolean; allLocations?: boolean; locationId?: string | null } = {},
) {
  return api.get<CustomersResponse | CustomerRecord[]>(
    `/customers${toQueryString({
      q: cleanString(params.q),
      includeInactive: params.includeInactive ? "true" : "",
      allBranches: params.allLocations ? "true" : "",
      branchId: cleanString(params.locationId),
    })}`,
  );
}

export async function createCustomer(payload: CustomerPayload) {
  return api.post<CustomerRecord | { customer?: CustomerRecord }>("/customers", normalizeCustomerPayload(payload));
}

export async function updateCustomer(customerId: string, payload: CustomerPayload) {
  const id = requireId(customerId, "Customer record");

  return api.put<CustomerRecord | { customer?: CustomerRecord }>(
    `/customers/${encodeURIComponent(id)}`,
    normalizeCustomerPayload(payload),
  );
}

export async function getCustomerLedger(customerId: string) {
  const id = requireId(customerId, "Customer record");
  return api.get<CustomerLedgerResponse>(`/customers/${encodeURIComponent(id)}/ledger`);
}

export async function deactivateCustomer(customerId: string) {
  const id = requireId(customerId, "Customer record");
  return api.delete<{ message?: string }>(`/customers/${encodeURIComponent(id)}`);
}

export async function reactivateCustomer(customerId: string) {
  const id = requireId(customerId, "Customer record");
  return api.put<{ message?: string }>(`/customers/${encodeURIComponent(id)}/reactivate`);
}

export async function listEmployees(
  params: { q?: string | null; role?: StaffRole | "ALL" | null; isActive?: boolean | null } = {},
) {
  const role = cleanRole(params.role);

  return api.get<EmployeesResponse | EmployeeRecord[]>(
    `/employees${toQueryString({
      q: cleanString(params.q),
      role: role && role !== "ALL" ? role : "",
      isActive: typeof params.isActive === "boolean" ? String(params.isActive) : "",
    })}`,
  );
}

export async function createEmployee(payload: EmployeePayload) {
  return api.post<EmployeeRecord | { employee?: EmployeeRecord }>("/employees", normalizeEmployeePayload(payload));
}

export async function updateEmployee(employeeId: string, payload: Partial<EmployeePayload>) {
  const id = requireId(employeeId, "Staff record");
  const nextPayload = normalizeEmployeePayload({
    name: payload.name ?? "",
    email: payload.email ?? "",
    password: payload.password,
    phone: payload.phone ?? null,
    role: payload.role ?? "CASHIER",
    branchIds: payload.branchIds ?? [],
    defaultBranchId: payload.defaultBranchId ?? null,
    canViewAllBranches: payload.canViewAllBranches,
  });

  const body: Partial<EmployeePayload> = {};
  if (payload.name !== undefined) body.name = nextPayload.name;
  if (payload.email !== undefined) body.email = nextPayload.email;
  if (payload.password) body.password = nextPayload.password;
  if (payload.phone !== undefined) body.phone = nextPayload.phone;
  if (payload.role !== undefined) body.role = nextPayload.role;
  if (payload.branchIds !== undefined) body.branchIds = nextPayload.branchIds;
  if (payload.defaultBranchId !== undefined) body.defaultBranchId = nextPayload.defaultBranchId;
  if (payload.canViewAllBranches !== undefined) body.canViewAllBranches = nextPayload.canViewAllBranches;

  return api.put<EmployeeRecord | { employee?: EmployeeRecord }>(`/employees/${encodeURIComponent(id)}`, body);
}

export async function setEmployeeActiveStatus(employeeId: string, isActive: boolean) {
  const id = requireId(employeeId, "Staff record");
  return api.patch<{ message?: string }>(`/employees/${encodeURIComponent(id)}/status`, { isActive });
}

export async function resetEmployeePassword(employeeId: string, password: string) {
  const id = requireId(employeeId, "Staff record");
  const cleanPassword = String(password || "").trim();

  if (cleanPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  return api.post<{ message?: string }>(`/employees/${encodeURIComponent(id)}/reset-password`, {
    password: cleanPassword,
  });
}

export async function deleteEmployee(employeeId: string) {
  const id = requireId(employeeId, "Staff record");
  return api.delete<{ message?: string }>(`/employees/${encodeURIComponent(id)}`);
}

export async function listBranches() {
  return api.get<BranchesResponse | PeopleBranch[]>("/branches");
}
