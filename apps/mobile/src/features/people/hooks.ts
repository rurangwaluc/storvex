import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomer,
  createEmployee,
  deactivateCustomer,
  deleteEmployee,
  getCustomerLedger,
  listBranches,
  listCustomers,
  listEmployees,
  reactivateCustomer,
  resetEmployeePassword,
  setEmployeeActiveStatus,
  updateCustomer,
  updateEmployee,
} from "./api";
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

export const peopleKeys = {
  all: ["people"] as const,
  customers: (params?: { includeInactive?: boolean }) => ["people", "customers", params?.includeInactive ? "all" : "active"] as const,
  customerLedger: (customerId?: string | null) => ["people", "customer-ledger", customerId || "missing"] as const,
  employees: () => ["people", "employees"] as const,
  branches: () => ["people", "branches"] as const,
};

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isCustomerRecord(value: unknown): value is CustomerRecord {
  return Boolean(value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string");
}

function isEmployeeRecord(value: unknown): value is EmployeeRecord {
  return Boolean(value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string");
}

function isPeopleBranch(value: unknown): value is PeopleBranch {
  return Boolean(value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string");
}

function unwrapCustomer(value: unknown): CustomerRecord | null {
  if (isCustomerRecord(value)) return value;

  if (value && typeof value === "object" && "customer" in value) {
    const nested = (value as { customer?: unknown }).customer;
    return isCustomerRecord(nested) ? nested : null;
  }

  return null;
}

function unwrapEmployee(value: unknown): EmployeeRecord | null {
  if (isEmployeeRecord(value)) return value;

  if (value && typeof value === "object" && "employee" in value) {
    const nested = (value as { employee?: unknown }).employee;
    return isEmployeeRecord(nested) ? nested : null;
  }

  return null;
}

export function normalizeCustomer(value?: CustomerRecord | null): CustomerRecord | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    name: clean(value.name, "Customer"),
    phone: value.phone || null,
    email: value.email || null,
    address: value.address || null,
    tinNumber: value.tinNumber || null,
    idNumber: value.idNumber || null,
    notes: value.notes || null,
    whatsappOptIn: Boolean(value.whatsappOptIn),
    isActive: value.isActive !== false,
    outstanding: value.outstanding ?? value.totalOutstanding ?? 0,
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || null,
  };
}

export function normalizeCustomers(response?: CustomersResponse | CustomerRecord[] | null) {
  const source = Array.isArray(response) ? response : response?.customers || response?.items || [];

  return source
    .map((customer) => normalizeCustomer(customer))
    .filter((customer): customer is CustomerRecord => Boolean(customer));
}

export function normalizeBranch(value?: PeopleBranch | null): PeopleBranch | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    name: clean(value.name, "Selling location"),
    code: value.code || null,
    status: value.status || "ACTIVE",
    isMain: Boolean(value.isMain),
    isDefault: Boolean(value.isDefault),
    canOperate: value.canOperate !== false,
    canViewReports: Boolean(value.canViewReports),
  };
}

export function normalizeEmployeeBranches(employee?: EmployeeRecord | null) {
  const directBranches = Array.isArray(employee?.branches) ? employee.branches : [];
  const assignmentBranches = Array.isArray(employee?.branchAssignments)
    ? employee.branchAssignments
        .map((assignment) => {
          const branch = assignment?.branch || null;
          const id = branch?.id || assignment?.branchId || "";
          if (!id) return null;

          return normalizeBranch({
            id,
            name: branch?.name || "Selling location",
            code: branch?.code || null,
            status: branch?.status || "ACTIVE",
            isMain: Boolean(branch?.isMain),
            isDefault: Boolean(assignment?.isDefault),
            canOperate: assignment?.canOperate !== false,
            canViewReports: Boolean(assignment?.canViewReports),
          });
        })
        .filter((branch): branch is PeopleBranch => Boolean(branch))
    : [];

  const source = directBranches.length > 0 ? directBranches : assignmentBranches;
  const seen = new Set<string>();

  return source
    .map((branch) => normalizeBranch(branch))
    .filter((branch): branch is PeopleBranch => {
      if (!branch?.id || seen.has(branch.id)) return false;
      seen.add(branch.id);
      return true;
    });
}

export function normalizeEmployee(value?: EmployeeRecord | null): EmployeeRecord | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    name: clean(value.name, "Staff member"),
    email: value.email || null,
    phone: value.phone || null,
    role: clean(value.role, "CASHIER") as StaffRole,
    isActive: value.isActive !== false,
    canViewAllBranches: Boolean(value.canViewAllBranches),
    branches: normalizeEmployeeBranches(value),
    branchAssignments: Array.isArray(value.branchAssignments) ? value.branchAssignments : [],
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || null,
  };
}

export function normalizeEmployees(response?: EmployeesResponse | EmployeeRecord[] | null) {
  const source = Array.isArray(response) ? response : response?.employees || [];

  return source
    .map((employee) => normalizeEmployee(employee))
    .filter((employee): employee is EmployeeRecord => Boolean(employee));
}

export function normalizeBranches(response?: BranchesResponse | PeopleBranch[] | null) {
  const source = Array.isArray(response) ? response : response?.branches || response?.items || [];
  const seen = new Set<string>();

  return source
    .map((branch) => normalizeBranch(branch))
    .filter((branch): branch is PeopleBranch => {
      if (!branch?.id || seen.has(branch.id)) return false;
      seen.add(branch.id);
      return true;
    });
}

export function normalizeLedger(response?: CustomerLedgerResponse | null): CustomerLedgerResponse {
  return {
    customer: response?.customer || null,
    summary: response?.summary || {
      totalSales: 0,
      totalAll: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    },
    sales: Array.isArray(response?.sales) ? response.sales : [],
  };
}

export function roleLabel(role?: string | null) {
  const key = String(role || "").toUpperCase();

  if (key === "OWNER") return "Owner";
  if (key === "MANAGER") return "Manager";
  if (key === "CASHIER") return "Cashier";
  if (key === "SELLER") return "Seller";
  if (key === "STOREKEEPER") return "Storekeeper";
  if (key === "TECHNICIAN") return "Technician";
  if (key === "PLATFORM_ADMIN") return "Platform admin";

  return key ? key.replaceAll("_", " ").toLowerCase().replace(/^./, (char) => char.toUpperCase()) : "Staff";
}

export function branchDisplayName(branch?: PeopleBranch | null) {
  if (!branch) return "Selling location";
  return branch.code ? `${branch.code} · ${branch.name || "Selling location"}` : branch.name || "Selling location";
}

export function usePeopleCustomers(params: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: peopleKeys.customers(params),
    queryFn: async () => normalizeCustomers(await listCustomers({ includeInactive: params.includeInactive })),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useCustomerLedger(customerId?: string | null) {
  return useQuery({
    queryKey: peopleKeys.customerLedger(customerId),
    queryFn: async () => normalizeLedger(await getCustomerLedger(customerId || "")),
    enabled: Boolean(customerId),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function usePeopleEmployees() {
  return useQuery({
    queryKey: peopleKeys.employees(),
    queryFn: async () => normalizeEmployees(await listEmployees()),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function usePeopleBranches() {
  return useQuery({
    queryKey: peopleKeys.branches(),
    queryFn: async () => normalizeBranches(await listBranches()),
    staleTime: 60_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreatePeopleCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CustomerPayload) => createCustomer(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}

export function useUpdatePeopleCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, payload }: { customerId: string; payload: CustomerPayload }) => updateCustomer(customerId, payload),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
        queryClient.invalidateQueries({ queryKey: peopleKeys.customerLedger(variables.customerId) }),
      ]);
    },
  });
}

export function useSetCustomerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, active }: { customerId: string; active: boolean }) =>
      active ? reactivateCustomer(customerId) : deactivateCustomer(customerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}

export function useCreatePeopleEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EmployeePayload) => createEmployee(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}

export function useUpdatePeopleEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, payload }: { employeeId: string; payload: Partial<EmployeePayload> }) =>
      updateEmployee(employeeId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}

export function useSetEmployeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, active }: { employeeId: string; active: boolean }) =>
      setEmployeeActiveStatus(employeeId, active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}

export function useResetPeopleEmployeePassword() {
  return useMutation({
    mutationFn: ({ employeeId, password }: { employeeId: string; password: string }) => resetEmployeePassword(employeeId, password),
  });
}

export function useDeletePeopleEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => deleteEmployee(employeeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: peopleKeys.all });
    },
  });
}

export function unwrapSavedCustomer(value: unknown) {
  return normalizeCustomer(unwrapCustomer(value));
}

export function unwrapSavedEmployee(value: unknown) {
  return normalizeEmployee(unwrapEmployee(value));
}
