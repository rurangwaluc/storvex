export type TenantRole =
  | "OWNER"
  | "MANAGER"
  | "CASHIER"
  | "SELLER"
  | "STOREKEEPER"
  | "TECHNICIAN";

export type AuthUser = {
  id: string;
  tenantId?: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  role: TenantRole;

  defaultBranchId?: string | null;
  activeBranchId?: string | null;
  branchId?: string | null;

  allowedBranchIds?: string[];
  visibleBranchIds?: string[];

  canViewAllBranches?: boolean;
  canOperateInActiveBranch?: boolean;
  canViewReportsInActiveBranch?: boolean;
};

export type AuthTenant = {
  id: string;
  name: string;
  businessName?: string | null;

  phone?: string | null;
  email?: string | null;
  status?: string | null;

  mainBranchId?: string | null;
  shopType?: string | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;

  countryCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;

  logoUrl?: string | null;
  logoKey?: string | null;

  receiptHeader?: string | null;
  receiptFooter?: string | null;

  onboardingCompleted?: boolean | null;
  onboardingCompletedAt?: string | null;

  cashDrawerBlockCashSales?: boolean;
  mainBranch?: unknown;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  tenant: AuthTenant;
};