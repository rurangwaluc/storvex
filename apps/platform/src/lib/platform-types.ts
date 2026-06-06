export type PlatformRole =
  | "PLATFORM_OWNER"
  | "PLATFORM_ADMIN"
  | "PLATFORM_SUPPORT";

export type PlatformPage = {
  skip: number;
  take: number;
  returned: number;
  hasMore: boolean;
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
};

export type PlatformLoginResponse = {
  message: string;
  token: string;
  platformUser: PlatformUser;
};

export type PlatformMeResponse = {
  platformUser: PlatformUser;
};

export type PlatformAuthSession = {
  token: string;
  platformUser: PlatformUser;
};

export type PlatformUsersListResponse = {
  platformUsers: PlatformUser[];
  count: number;
  page: PlatformPage;
};

export type CreatePlatformUserInput = {
  name: string;
  email: string;
  password: string;
  role: Exclude<PlatformRole, "PLATFORM_OWNER">;
};

export type CreatePlatformUserResponse = {
  message: string;
  platformUser: PlatformUser;
};

export type UpdatePlatformUserRoleInput = {
  role: Exclude<PlatformRole, "PLATFORM_OWNER">;
};

export type UpdatePlatformUserRoleResponse = {
  message: string;
  platformUser: PlatformUser;
};

export type UpdatePlatformUserStatusInput = {
  isActive: boolean;
};

export type UpdatePlatformUserStatusResponse = {
  message: string;
  platformUser: PlatformUser;
};

export type ResetPlatformUserPasswordInput = {
  temporaryPassword: string;
};

export type ResetPlatformUserPasswordResponse = {
  message: string;
  platformUser: PlatformUser;
};

export type UpdateMyPlatformProfileInput = {
  name: string;
};

export type UpdateMyPlatformProfileResponse = {
  message: string;
  platformUser: PlatformUser;
};

export type ChangeMyPlatformPasswordInput = {
  currentPassword: string;
  nextPassword: string;
};

export type ChangeMyPlatformPasswordResponse = {
  message: string;
};

export type PlatformBusinessSummary = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  shopType?: string | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;
  createdAt?: string;
};

export type PlatformAuditActor = {
  id: string;
  tenantId?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  isActive?: boolean;
};

export type PlatformStoreLocation = {
  id: string;
  tenantId?: string;
  name: string;
  code?: string | null;
  type?: string | null;
  status?: string | null;
  phone?: string | null;
  email?: string | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;
  isMain?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PlatformActivityItem = {
  id: string;
  tenantId: string;
  storeLocationId?: string | null;
  userId?: string | null;
  entityId?: string | null;
  action: string;
  entity: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  business?: PlatformBusinessSummary | null;
  storeLocation?: PlatformStoreLocation | null;
  actor?: PlatformAuditActor | null;
};

export type PlatformSupportOverviewResponse = {
  overview: {
    businesses: number;
    tenantUsers: number;
    storeLocations: number;
    supportQueue: {
      missingOwnerBusinesses: number;
      noUserBusinesses: number;
      noLocationBusinesses: number;
      expiredSubscriptions: number;
      readOnlySubscriptions: number;
      suspendedSubscriptions: number;
      overdueSubscriptions: number;
      totalAttention: number;
    };
    recentActivity: PlatformActivityItem[];
  };
};

export type PlatformSupportIssueSeverity = "danger" | "warning" | "info";

export type PlatformSupportBusinessStatus =
  | "HEALTHY"
  | "WATCH"
  | "NEEDS_ATTENTION";

export type PlatformBusinessProfile = {
  shopType?: string | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;
  countryCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string | null;
};

export type PlatformBusinessOwner = {
  id: string;
  tenantId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt?: string;
};

export type PlatformSubscriptionHealth = {
  status: string;
  label: string;
  severity: "success" | "warning" | "danger" | "info";
};

export type PlatformBusinessSubscription = {
  id: string;
  tenantId: string;
  status: string;
  accessMode: string;
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
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  graceEndDate?: string | null;
  readOnlySince?: string | null;
  lastPaymentAt?: string | null;
  renewedAt?: string | null;
  createdAt?: string;
  daysUntilEnd?: number | null;
  health?: PlatformSubscriptionHealth;
};

export type PlatformBusinessUsage = {
  storeLocations: number;
  users: number;
  customers: number;
  products: number;
  sales: number;
  repairs: number;
  expenses: number;
  suppliers: number;
  auditLogs?: number;
};

export type PlatformSupportIssue = {
  code: string;
  severity: PlatformSupportIssueSeverity;
  title: string;
  message: string;
  suggestedAction?: string;
};

export type PlatformBusinessSupport = {
  status: PlatformSupportBusinessStatus;
  issues: PlatformSupportIssue[];
  issueCount: number;
  dangerCount: number;
  warningCount: number;
  infoCount: number;
};

export type PlatformSupportBusiness = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  platformStatus?: string | null;
  createdAt?: string;
  businessProfile: PlatformBusinessProfile;
  owner: PlatformBusinessOwner | null;
  subscription: PlatformBusinessSubscription | null;
  usage: PlatformBusinessUsage;
  storeLocations: PlatformStoreLocation[];
  support: PlatformBusinessSupport;
};

export type PlatformSupportBusinessesResponse = {
  businesses: PlatformSupportBusiness[];
  count: number;
  page: PlatformPage;
};

export type PlatformSupportTicketCategory =
  | "BILLING_PAYMENT"
  | "SUBSCRIPTION"
  | "ACCOUNT_ACCESS"
  | "BUG"
  | "FEATURE_REQUEST"
  | "WHATSAPP"
  | "INVENTORY"
  | "POS"
  | "REPORTS"
  | "OTHER";

export type PlatformSupportTicketPriority =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "URGENT"
  | "BUSINESS_BLOCKED";

export type PlatformSupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_TENANT"
  | "RESOLVED"
  | "CLOSED";

export type PlatformSupportAttachmentInput = {
  fileUrl: string;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
};

export type PlatformSupportAttachment = {
  id?: string;
  ticketId?: string;
  messageId?: string | null;
  fileUrl: string;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  createdAt?: string;
};

export type PlatformSupportAttachmentUploadResponse = {
  upload: {
    uploadUrl: string;
    storageKey: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  };
  attachment: PlatformSupportAttachmentInput;
};

export type PlatformSupportAttachmentDownloadResponse = {
  downloadUrl: string;
  attachment: PlatformSupportAttachment & {
    storageKey?: string | null;
  };
};

export type PlatformSupportMessage = {
  id: string;
  ticketId: string;
  senderType: "TENANT_USER" | "PLATFORM_USER";
  tenantUserId: string | null;
  platformUserId: string | null;
  message: string;
  createdAt: string;
  tenantUser: PlatformAuditActor | null;
  platformUser: PlatformUser | null;
  attachments: PlatformSupportAttachment[];
};

export type PlatformSupportTicket = {
  id: string;
  tenantId: string;
  createdByUserId: string | null;
  assignedToPlatformUserId: string | null;
  title: string;
  category: PlatformSupportTicketCategory;
  priority: PlatformSupportTicketPriority;
  status: PlatformSupportTicketStatus;
  lastMessageAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: PlatformBusinessSummary | null;
  createdBy?: PlatformAuditActor | null;
  assignedToPlatformUser?: PlatformUser | null;
  messages?: PlatformSupportMessage[];
  attachments?: PlatformSupportAttachment[];
  _count?: {
    messages: number;
    attachments: number;
  };
};

export type PlatformSupportTicketsOverviewResponse = {
  overview: {
    total: number;
    status: {
      open: number;
      inProgress: number;
      waitingForTenant: number;
      resolved: number;
      closed: number;
    };
    priority: {
      urgent: number;
      businessBlocked: number;
    };
    last24Hours: number;
    unassigned: number;
    needsAttention: number;
    recentTickets: PlatformSupportTicket[];
  };
};

export type PlatformSupportTicketsListResponse = {
  tickets: PlatformSupportTicket[];
  count: number;
  page: PlatformPage;
};

export type PlatformSupportTicketDetailResponse = {
  ticket: PlatformSupportTicket;
};

export type PlatformSupportReplyResponse = {
  message: string;
  supportMessage: PlatformSupportMessage;
};

export type PlatformSupportStatusUpdateResponse = {
  message: string;
  ticket: PlatformSupportTicket;
};

export type PlatformSupportAssignmentResponse = {
  message: string;
  ticket: PlatformSupportTicket;
};