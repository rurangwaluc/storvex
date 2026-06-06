export type ExpenseCategory =
  | "RENT"
  | "SALARY"
  | "UTILITIES"
  | "TRANSPORT"
  | "MAINTENANCE"
  | "OTHER";

export type ExpenseStatus = "PENDING" | "APPROVED" | string;

export type ExpensePerson = {
  id?: string | null;
  name?: string | null;
};

export type ExpenseStoreLocation = {
  id?: string | null;
  name?: string | null;
  code?: string | null;
  status?: string | null;
  isMain?: boolean | null;
};

export type ExpenseRecord = {
  id: string;
  title: string;
  category: ExpenseCategory | string;
  amount: number | string;
  notes?: string | null;
  status?: ExpenseStatus | null;
  createdAt?: string | null;
  approvedAt?: string | null;
  tenantId?: string | null;
  branchId?: string | null;
  createdById?: string | null;
  approvedById?: string | null;
  createdBy?: ExpensePerson | null;
  approvedBy?: ExpensePerson | null;
  branch?: ExpenseStoreLocation | null;
};

export type ExpenseStoreLocationScope = {
  mode?: string | null;
  storeLocationId?: string | null;
  allowedStoreLocationIds?: string[];
};

export type ExpensesResponse = {
  expenses?: ExpenseRecord[];
  count?: number;
  storeLocationScope?: ExpenseStoreLocationScope | null;
  branchScope?: {
    mode?: string | null;
    branchId?: string | null;
    allowedBranchIds?: string[];
  } | null;
};

export type CreateExpensePayload = {
  title: string;
  category: ExpenseCategory;
  amount: number | string;
  notes?: string | null;
};
