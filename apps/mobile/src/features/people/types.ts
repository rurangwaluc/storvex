export type StaffRole =
  | "OWNER"
  | "MANAGER"
  | "CASHIER"
  | "SELLER"
  | "STOREKEEPER"
  | "TECHNICIAN"
  | "PLATFORM_ADMIN"
  | string;

export type PeopleBranch = {
  id: string;
  name?: string | null;
  code?: string | null;
  status?: string | null;
  isMain?: boolean | null;
  isDefault?: boolean | null;
  canOperate?: boolean | null;
  canViewReports?: boolean | null;
};

export type CustomerRecord = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tinNumber?: string | null;
  idNumber?: string | null;
  notes?: string | null;
  whatsappOptIn?: boolean | null;
  isActive?: boolean | null;
  outstanding?: number | string | null;
  totalOutstanding?: number | string | null;
  totalSales?: number | string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CustomerPayload = {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  tinNumber?: string | null;
  idNumber?: string | null;
  notes?: string | null;
  whatsappOptIn?: boolean;
};

export type CustomersResponse = {
  customers?: CustomerRecord[];
  items?: CustomerRecord[];
  count?: number;
};

export type CustomerLedgerSummary = {
  totalSales?: number | string | null;
  totalAll?: number | string | null;
  totalPaid?: number | string | null;
  totalOutstanding?: number | string | null;
};

export type CustomerLedgerSale = {
  id: string;
  receiptNumber?: string | null;
  invoiceNumber?: string | null;
  saleType?: string | null;
  status?: string | null;
  total?: number | string | null;
  paid?: number | string | null;
  balance?: number | string | null;
  createdAt?: string | null;
};

export type CustomerLedgerResponse = {
  customer?: CustomerRecord | null;
  summary?: CustomerLedgerSummary | null;
  sales?: CustomerLedgerSale[];
};

export type EmployeeBranchAssignment = {
  branchId?: string | null;
  isDefault?: boolean | null;
  canOperate?: boolean | null;
  canViewReports?: boolean | null;
  branch?: PeopleBranch | null;
};

export type EmployeeRecord = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: StaffRole | null;
  isActive?: boolean | null;
  canViewAllBranches?: boolean | null;
  branches?: PeopleBranch[] | null;
  branchAssignments?: EmployeeBranchAssignment[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EmployeePayload = {
  name: string;
  email: string;
  password?: string;
  phone?: string | null;
  role: StaffRole;
  branchIds?: string[];
  defaultBranchId?: string | null;
  canViewAllBranches?: boolean;
};

export type EmployeesResponse = {
  employees?: EmployeeRecord[];
  subscription?: unknown;
  seatUsage?: unknown;
  subscriptionUsage?: unknown;
};

export type BranchesResponse = {
  branches?: PeopleBranch[];
  items?: PeopleBranch[];
};
