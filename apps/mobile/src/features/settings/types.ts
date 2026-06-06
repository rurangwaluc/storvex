import type { Branch } from "../../types/branch";

export type StoreCategory =
  | "ELECTRONICS_RETAIL"
  | "PHONE_SHOP"
  | "LAPTOP_SHOP"
  | "ACCESSORIES_SHOP"
  | "REPAIR_SHOP"
  | "MIXED_ELECTRONICS"
  | string;

export type DocumentHeaderDisplay = "LOGO_AND_NAME" | "LOGO_ONLY" | "NAME_ONLY" | string;
export type DocumentSizeMode = "AUTO" | "COMPACT" | "STANDARD" | string;

export type TaxMode =
  | "NONE"
  | "VAT_18"
  | "TURNOVER_3_INTERNAL"
  | "VAT_18_PLUS_TURNOVER_3"
  | "CUSTOM"
  | string;

export type TaxDisplayMode = "HIDDEN" | "CUSTOMER_FACING" | "INTERNAL_ONLY" | string;

export type WorkspaceUser = {
  id?: string | null;
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  tenantId?: string | null;
  branchId?: string | null;
  canViewAllBranches?: boolean | null;
};

export type WorkspaceTenant = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
};

export type WorkspaceContextResponse = {
  user?: WorkspaceUser | null;
  tenant?: WorkspaceTenant | null;
  branch?: {
    id?: string | null;
    name?: string | null;
    code?: string | null;
    isMain?: boolean | null;
    status?: string | null;
  } | null;
};

export type StoreProfile = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  shopType?: StoreCategory | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  logoKey?: string | null;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  countryCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  cashDrawerBlockCashSales?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type StoreProfileResponse = {
  profile?: StoreProfile | null;
};

export type SetupCheck = {
  key?: string | null;
  label?: string | null;
  title?: string | null;
  text?: string | null;
  description?: string | null;
  done?: boolean | null;
  required?: boolean | null;
  status?: string | null;
};

export type StoreSetupChecklistResponse = {
  readinessPercent?: number | null;
  isOperationallyReady?: boolean | null;
  checks?: SetupCheck[] | null;
};

export type TaxSummary = {
  label?: string | null;
  description?: string | null;
  customerFacing?: boolean | null;
  ratePercent?: number | null;
};

export type DocumentSettings = {
  receiptPrefix?: string | null;
  invoicePrefix?: string | null;
  warrantyPrefix?: string | null;
  proformaPrefix?: string | null;
  receiptPadding?: number | null;
  invoicePadding?: number | null;
  warrantyPadding?: number | null;
  proformaPadding?: number | null;
  invoiceTerms?: string | null;
  warrantyTerms?: string | null;
  proformaTerms?: string | null;
  deliveryNoteTerms?: string | null;
  documentPrimaryColor?: string | null;
  documentAccentColor?: string | null;
  documentHeaderDisplay?: DocumentHeaderDisplay | null;
  documentSizeMode?: DocumentSizeMode | null;
  taxMode?: TaxMode | null;
  taxDisplayMode?: TaxDisplayMode | null;
  taxName?: string | null;
  taxRateBps?: number | null;
  pricesIncludeTax?: boolean | null;
  showTaxOnCustomerDocuments?: boolean | null;
  taxSummary?: TaxSummary | null;
};

export type DocumentSettingsResponse = {
  documentSettings?: DocumentSettings | null;
};

export type StoreLocation = Branch;

export type StoreLocationUsage = {
  activeBranches?: number | null;
  includedBranchLimit?: number | null;
  extraBranchCount?: number | null;
  effectiveBranchLimit?: number | null;
  overLimit?: boolean | null;
  atLimit?: boolean | null;
  canAddBranch?: boolean | null;
};

export type StoreLocationSubscription = {
  id?: string | null;
  status?: string | null;
  accessMode?: string | null;
  planKey?: string | null;
  tierKey?: string | null;
  cycleKey?: string | null;
  staffLimit?: number | null;
  branchLimit?: number | null;
  extraBranchCount?: number | null;
  priceAmount?: number | null;
  currency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  graceEndDate?: string | null;
  readOnlySince?: string | null;
  lastPaymentAt?: string | null;
  renewedAt?: string | null;
  createdAt?: string | null;
};

export type StoreLocationsTenant = {
  id?: string | null;
  name?: string | null;
  status?: string | null;
  mainBranchId?: string | null;
};

export type StoreLocationsResponse = {
  branches?: StoreLocation[] | null;
  locations?: StoreLocation[] | null;
  usage?: StoreLocationUsage | null;
  subscription?: StoreLocationSubscription | null;
  tenant?: StoreLocationsTenant | null;
};

export type StoreLocationPayload = {
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
  countryCode?: string | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;
};

export type StoreLocationMutationResponse = StoreLocationsResponse & {
  message?: string | null;
  branch?: StoreLocation | null;
};

export type SecuritySummary = {
  activeSessions?: number | null;
  revokedSessions?: number | null;
  recentLogins?: number | null;
  failedAttempts?: number | null;
  lastPasswordChangeAt?: string | null;
};

export type SecurityOverview = {
  currentSessionId?: string | null;
  role?: string | null;
  email?: string | null;
  isActive?: boolean | null;
  accountCreatedAt?: string | null;
  accountUpdatedAt?: string | null;
  lastSeenAt?: string | null;
  lastLoginAt?: string | null;
  currentDeviceLabel?: string | null;
  summary?: SecuritySummary | null;
};

export type SecurityOverviewResponse = {
  overview?: SecurityOverview | null;
};

export type SecuritySession = {
  id: string;
  tokenId?: string | null;
  createdAt?: string | null;
  lastSeenAt?: string | null;
  expiresAt?: string | null;
  isRevoked?: boolean | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

export type SecuritySessionsResponse = {
  sessions?: SecuritySession[] | null;
};

export type SecurityLoginEvent = {
  id: string;
  status?: string | null;
  role?: string | null;
  email?: string | null;
  reason?: string | null;
  createdAt?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
};

export type SecurityLoginEventsResponse = {
  events?: SecurityLoginEvent[] | null;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
};

export type SecurityActionResponse = {
  ok?: boolean | null;
  message?: string | null;
};

export type SettingsOverview = {
  workspace: WorkspaceContextResponse | null;
  profile: StoreProfile | null;
  checklist: StoreSetupChecklistResponse | null;
  documentSettings: DocumentSettings | null;
};


export type StaffRole =
  | "OWNER"
  | "MANAGER"
  | "CASHIER"
  | "SELLER"
  | "STOREKEEPER"
  | "TECHNICIAN"
  | string;

export type StaffStoreAccess = {
  id?: string | null;
  branchId: string;
  isDefault?: boolean | null;
  canOperate?: boolean | null;
  canViewReports?: boolean | null;
  createdAt?: string | null;
  branch?: {
    id?: string | null;
    name?: string | null;
    code?: string | null;
    status?: string | null;
    isMain?: boolean | null;
    type?: string | null;
  } | null;
};

export type AccessMember = {
  id: string;
  tenantId?: string | null;
  defaultBranchId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: StaffRole | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  branchAssignments?: StaffStoreAccess[] | null;
};

export type SeatUsage = {
  activeStaff?: number | null;
  activeUsers?: number | null;
  usedSeats?: number | null;
  staffLimit?: number | null;
  seatLimit?: number | null;
  remainingSeats?: number | null;
  atLimit?: boolean | null;
  overLimit?: boolean | null;
};

export type AccessMembersResponse = {
  users?: AccessMember[] | null;
  employees?: AccessMember[] | null;
  seatUsage?: SeatUsage | null;
  subscriptionUsage?: SeatUsage | null;
  subscription?: StoreLocationSubscription | null;
  branchScope?: {
    mode?: string | null;
    label?: string | null;
    canViewAllBranches?: boolean | null;
  } | null;
};

export type AccessBranchAssignmentPayload = {
  branchId: string;
  isDefault?: boolean;
  canOperate?: boolean;
  canViewReports?: boolean;
};

export type CreateAccessMemberPayload = {
  name: string;
  email: string;
  phone?: string | null;
  role: StaffRole;
  password: string;
  branchAssignments: AccessBranchAssignmentPayload[];
};

export type UpdateAccessMemberPayload = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: StaffRole | null;
  isActive?: boolean | null;
  branchAssignments?: AccessBranchAssignmentPayload[];
};

export type ResetAccessPasswordPayload = {
  password?: string;
  newPassword?: string;
  generate?: boolean;
};

export type AccessPasswordResetResponse = {
  updated?: boolean | null;
  message?: string | null;
  userId?: string | null;
  generatedPassword?: string | null;
};

export type AccessMemberMutationResponse = {
  updated?: boolean | null;
  user?: AccessMember | null;
  employee?: AccessMember | null;
  seatUsage?: SeatUsage | null;
  subscriptionUsage?: SeatUsage | null;
};