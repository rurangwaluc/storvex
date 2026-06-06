import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeStoreLocation,
  createStoreLocation,
  getDocumentSettings,
  getStoreLocations,
  getStoreProfile,
  getStoreSetupChecklist,
  getWorkspaceContext,
  reopenStoreLocation,
  setMainStoreLocation,
  updateDocumentSettings,
  updateStoreLocation,
  updateStoreProfile,
  changeSecurityPassword,
  getSecurityLoginEvents,
  getSecurityOverview,
  getSecuritySessions,
  revokeOtherSecuritySessions,
  revokeSecuritySession,
  createAccessMember,
  getAccessMembers,
  resetAccessMemberPassword,
  updateAccessMember,
  updateAccessMemberStatus,
} from "./api";
import type {
  DocumentSettings,
  SettingsOverview,
  StoreLocation,
  StoreLocationPayload,
  StoreLocationsResponse,
  StoreProfile,
  StoreSetupChecklistResponse,
  ChangePasswordPayload,
  SecurityLoginEvent,
  SecurityOverview,
  SecuritySession,    
  AccessMember,
  AccessMembersResponse,
  CreateAccessMemberPayload,
  ResetAccessPasswordPayload,
  SeatUsage,
  UpdateAccessMemberPayload,
} from "./types";

export const settingsKeys = {
  all: ["settings"] as const,
  overview: ["settings", "overview"] as const,
  workspace: ["settings", "workspace"] as const,
  profile: ["settings", "profile"] as const,
  checklist: ["settings", "checklist"] as const,
  documents: ["settings", "documents"] as const,
  locations: ["settings", "locations"] as const,
  security: ["settings", "security"] as const,
  access: ["settings", "access"] as const,
};

function normalizeNumber(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function normalizeSecurityOverview(
  value?: SecurityOverview | null,
): SecurityOverview | null {
  if (!value) return null;

  return {
    ...value,
    currentSessionId: value.currentSessionId || null,
    role: value.role || null,
    email: value.email || null,
    isActive: value.isActive !== false,
    accountCreatedAt: value.accountCreatedAt || null,
    accountUpdatedAt: value.accountUpdatedAt || null,
    lastSeenAt: value.lastSeenAt || null,
    lastLoginAt: value.lastLoginAt || null,
    currentDeviceLabel: value.currentDeviceLabel || "Current device",
    summary: {
      activeSessions: normalizeNumber(value.summary?.activeSessions, 0),
      revokedSessions: normalizeNumber(value.summary?.revokedSessions, 0),
      recentLogins: normalizeNumber(value.summary?.recentLogins, 0),
      failedAttempts: normalizeNumber(value.summary?.failedAttempts, 0),
      lastPasswordChangeAt: value.summary?.lastPasswordChangeAt || null,
    },
  };
}

export function normalizeSecuritySession(value?: SecuritySession | null): SecuritySession | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    tokenId: value.tokenId || null,
    createdAt: value.createdAt || null,
    lastSeenAt: value.lastSeenAt || null,
    expiresAt: value.expiresAt || null,
    isRevoked: Boolean(value.isRevoked),
    ipAddress: value.ipAddress || null,
    userAgent: value.userAgent || null,
    deviceLabel: value.deviceLabel || "Unknown device",
  };
}

export function normalizeSecurityLoginEvent(
  value?: SecurityLoginEvent | null,
): SecurityLoginEvent | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    status: value.status || "SUCCESS",
    role: value.role || null,
    email: value.email || null,
    reason: value.reason || null,
    createdAt: value.createdAt || null,
    ipAddress: value.ipAddress || null,
    userAgent: value.userAgent || null,
    deviceLabel: value.deviceLabel || "Unknown device",
  };
}

export function useSecurityOverview() {
  return useQuery({
    queryKey: [...settingsKeys.security, "overview"] as const,
    queryFn: async () => normalizeSecurityOverview((await getSecurityOverview()).overview),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useSecuritySessions() {
  return useQuery({
    queryKey: [...settingsKeys.security, "sessions"] as const,
    queryFn: async () =>
      ((await getSecuritySessions()).sessions || [])
        .map((session) => normalizeSecuritySession(session))
        .filter(Boolean) as SecuritySession[],
    staleTime: 15_000,
    retry: 1,
  });
}

export function useSecurityLoginEvents() {
  return useQuery({
    queryKey: [...settingsKeys.security, "login-events"] as const,
    queryFn: async () =>
      ((await getSecurityLoginEvents()).events || [])
        .map((event) => normalizeSecurityLoginEvent(event))
        .filter(Boolean) as SecurityLoginEvent[],
    staleTime: 15_000,
    retry: 1,
  });
}

export function useChangeSecurityPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changeSecurityPassword(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.security });
    },
  });
}

export function useRevokeSecuritySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => revokeSecuritySession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.security });
    },
  });
}

export function useRevokeOtherSecuritySessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeOtherSecuritySessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.security });
    },
  });
}

export function normalizeStoreProfile(value?: StoreProfile | null): StoreProfile | null {
  if (!value) return null;

  return {
    ...value,
    name: value.name || "Business",
    email: value.email || null,
    phone: value.phone || null,
    shopType: value.shopType || null,
    district: value.district || null,
    sector: value.sector || null,
    address: value.address || null,
    logoUrl: value.logoUrl || null,
    logoKey: value.logoKey || null,
    receiptHeader: value.receiptHeader || null,
    receiptFooter: value.receiptFooter || null,
    countryCode: value.countryCode || "RW",
    currencyCode: value.currencyCode || "RWF",
    timezone: value.timezone || "Africa/Kigali",
    cashDrawerBlockCashSales: Boolean(value.cashDrawerBlockCashSales),
  };
}

export function normalizeDocumentSettings(
  value?: DocumentSettings | null,
): DocumentSettings | null {
  if (!value) return null;

  return {
    ...value,
    receiptPrefix: value.receiptPrefix || "RCT",
    invoicePrefix: value.invoicePrefix || "INV",
    warrantyPrefix: value.warrantyPrefix || "WAR",
    proformaPrefix: value.proformaPrefix || "PRF",
    receiptPadding: normalizeNumber(value.receiptPadding, 6),
    invoicePadding: normalizeNumber(value.invoicePadding, 6),
    warrantyPadding: normalizeNumber(value.warrantyPadding, 6),
    proformaPadding: normalizeNumber(value.proformaPadding, 6),
    invoiceTerms: value.invoiceTerms || "",
    warrantyTerms: value.warrantyTerms || "",
    proformaTerms: value.proformaTerms || "",
    deliveryNoteTerms: value.deliveryNoteTerms || "",
    documentPrimaryColor: value.documentPrimaryColor || "#0F4C81",
    documentAccentColor: value.documentAccentColor || "#E8EEF5",
    documentHeaderDisplay: value.documentHeaderDisplay || "LOGO_AND_NAME",
    documentSizeMode: value.documentSizeMode || "AUTO",
    taxMode: value.taxMode || "NONE",
    taxDisplayMode: value.taxDisplayMode || "HIDDEN",
    taxName: value.taxName || "",
    taxRateBps: normalizeNumber(value.taxRateBps, 0),
    pricesIncludeTax: Boolean(value.pricesIncludeTax),
    showTaxOnCustomerDocuments: Boolean(value.showTaxOnCustomerDocuments),
    taxSummary: value.taxSummary || null,
  };
}

export function normalizeChecklist(
  value?: StoreSetupChecklistResponse | null,
): StoreSetupChecklistResponse | null {
  if (!value) return null;

  const checks = Array.isArray(value.checks) ? value.checks : [];

  return {
    ...value,
    readinessPercent: Math.max(0, Math.min(100, normalizeNumber(value.readinessPercent, 0))),
    isOperationallyReady: Boolean(value.isOperationallyReady),
    checks: checks.map((check, index) => ({
      ...check,
      key: check.key || `check-${index}`,
      label: check.label || check.title || "Setup item",
      description: check.description || check.text || null,
      done: Boolean(check.done),
      required: Boolean(check.required),
      status: check.status || (check.done ? "DONE" : check.required ? "REQUIRED" : "OPTIONAL"),
    })),
  };
}

export function normalizeStoreLocation(value?: StoreLocation | null): StoreLocation | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    tenantId: value.tenantId || undefined,
    name: clean(value.name, "Selling location"),
    code: value.code || null,
    type: value.type || (value.isMain ? "MAIN" : "STANDARD"),
    status: value.status || "ACTIVE",
    phone: value.phone || null,
    email: value.email || null,
    countryCode: value.countryCode || "RW",
    district: value.district || null,
    sector: value.sector || null,
    address: value.address || null,
    isMain: Boolean(value.isMain),
    isActive: value.status ? String(value.status).toUpperCase() === "ACTIVE" : true,
    isDefault: Boolean(value.isDefault),
    canOperate: value.canOperate !== false,
    canViewReports: Boolean(value.canViewReports),
    assignedAt: value.assignedAt || null,
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || null,
  };
}

export function normalizeStoreLocationsResponse(
  value?: StoreLocationsResponse | null,
): StoreLocationsResponse {
  const rawLocations = Array.isArray(value?.branches)
    ? value?.branches
    : Array.isArray(value?.locations)
      ? value?.locations
      : [];

  const branches = rawLocations
    .map((location) => normalizeStoreLocation(location))
    .filter(Boolean) as StoreLocation[];

  return {
    ...value,
    branches,
    locations: branches,
    usage: {
      activeBranches: normalizeNumber(value?.usage?.activeBranches, branches.length),
      includedBranchLimit:
        value?.usage?.includedBranchLimit == null
          ? null
          : normalizeNumber(value.usage.includedBranchLimit, 0),
      extraBranchCount: normalizeNumber(value?.usage?.extraBranchCount, 0),
      effectiveBranchLimit:
        value?.usage?.effectiveBranchLimit == null
          ? null
          : normalizeNumber(value.usage.effectiveBranchLimit, 0),
      overLimit: Boolean(value?.usage?.overLimit),
      atLimit: Boolean(value?.usage?.atLimit),
      canAddBranch: value?.usage?.canAddBranch !== false,
    },
    subscription: value?.subscription || null,
    tenant: value?.tenant || null,
  };
}

export function useSettingsOverview() {
  return useQuery({
    queryKey: settingsKeys.overview,
    queryFn: async (): Promise<SettingsOverview> => {
      const [workspaceRes, profileRes, checklistRes, documentRes] = await Promise.allSettled([
        getWorkspaceContext(),
        getStoreProfile(),
        getStoreSetupChecklist(),
        getDocumentSettings(),
      ]);

      return {
        workspace: workspaceRes.status === "fulfilled" ? workspaceRes.value : null,
        profile:
          profileRes.status === "fulfilled"
            ? normalizeStoreProfile(profileRes.value?.profile)
            : null,
        checklist:
          checklistRes.status === "fulfilled"
            ? normalizeChecklist(checklistRes.value)
            : null,
        documentSettings:
          documentRes.status === "fulfilled"
            ? normalizeDocumentSettings(documentRes.value?.documentSettings)
            : null,
      };
    },
    staleTime: 20_000,
    retry: 1,
  });
}

export function useStoreProfile() {
  return useQuery({
    queryKey: settingsKeys.profile,
    queryFn: async () => normalizeStoreProfile((await getStoreProfile()).profile),
    staleTime: 20_000,
    retry: 1,
  });
}

export function useDocumentSettings() {
  return useQuery({
    queryKey: settingsKeys.documents,
    queryFn: async () => normalizeDocumentSettings((await getDocumentSettings()).documentSettings),
    staleTime: 20_000,
    retry: 1,
  });
}

export function useStoreLocations() {
  return useQuery({
    queryKey: settingsKeys.locations,
    queryFn: async () => normalizeStoreLocationsResponse(await getStoreLocations()),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useUpdateStoreProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStoreProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useUpdateDocumentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDocumentSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useCreateStoreLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StoreLocationPayload) => createStoreLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.locations });
      queryClient.invalidateQueries({ queryKey: settingsKeys.overview });
    },
  });
}

export function useUpdateStoreLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ branchId, payload }: { branchId: string; payload: StoreLocationPayload }) =>
      updateStoreLocation(branchId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.locations });
      queryClient.invalidateQueries({ queryKey: settingsKeys.overview });
    },
  });
}

export function useSetMainStoreLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (branchId: string) => setMainStoreLocation(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.locations });
      queryClient.invalidateQueries({ queryKey: settingsKeys.overview });
    },
  });
}

export function useCloseStoreLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (branchId: string) => closeStoreLocation(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.locations });
      queryClient.invalidateQueries({ queryKey: settingsKeys.overview });
    },
  });
}

export function useReopenStoreLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (branchId: string) => reopenStoreLocation(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.locations });
      queryClient.invalidateQueries({ queryKey: settingsKeys.overview });
    },
  });
}

export function normalizeSeatUsage(value?: SeatUsage | null): SeatUsage {
  const staffLimit =
    value?.staffLimit == null
      ? value?.seatLimit == null
        ? null
        : normalizeNumber(value.seatLimit, 0)
      : normalizeNumber(value.staffLimit, 0);

  const usedSeats =
    value?.usedSeats == null
      ? value?.activeUsers == null
        ? value?.activeStaff == null
          ? 0
          : normalizeNumber(value.activeStaff, 0)
        : normalizeNumber(value.activeUsers, 0)
      : normalizeNumber(value.usedSeats, 0);

  const remainingSeats =
    staffLimit == null ? null : Math.max(0, Number(staffLimit) - usedSeats);

  return {
    ...value,
    activeStaff: normalizeNumber(value?.activeStaff, usedSeats),
    activeUsers: normalizeNumber(value?.activeUsers, usedSeats),
    usedSeats,
    staffLimit,
    seatLimit: staffLimit,
    remainingSeats,
    atLimit: staffLimit == null ? false : usedSeats >= Number(staffLimit),
    overLimit: staffLimit == null ? false : usedSeats > Number(staffLimit),
  };
}

export function normalizeAccessMember(value?: AccessMember | null): AccessMember | null {
  if (!value?.id) return null;

  const assignments = Array.isArray(value.branchAssignments)
    ? value.branchAssignments
        .filter((assignment) => assignment?.branchId)
        .map((assignment) => ({
          ...assignment,
          branchId: assignment.branchId,
          isDefault: Boolean(assignment.isDefault),
          canOperate: assignment.canOperate !== false,
          canViewReports: Boolean(assignment.canViewReports),
          branch: assignment.branch || null,
        }))
    : [];

  return {
    ...value,
    id: value.id,
    tenantId: value.tenantId || null,
    defaultBranchId: value.defaultBranchId || assignments.find((item) => item.isDefault)?.branchId || null,
    name: clean(value.name, "Staff member"),
    email: value.email || null,
    phone: value.phone || null,
    role: value.role || "STAFF",
    isActive: value.isActive !== false,
    createdAt: value.createdAt || null,
    branchAssignments: assignments,
  };
}

export function normalizeAccessMembersResponse(
  value?: AccessMembersResponse | null,
): AccessMembersResponse {
  const rawMembers = Array.isArray(value?.users)
    ? value?.users
    : Array.isArray(value?.employees)
      ? value?.employees
      : [];

  const members = rawMembers
    .map((member) => normalizeAccessMember(member))
    .filter(Boolean) as AccessMember[];

  return {
    ...value,
    users: members,
    employees: members,
    seatUsage: normalizeSeatUsage(value?.seatUsage || value?.subscriptionUsage || null),
    subscriptionUsage: normalizeSeatUsage(value?.subscriptionUsage || value?.seatUsage || null),
    subscription: value?.subscription || null,
    branchScope: value?.branchScope || null,
  };
}

export function useAccessMembers() {
  return useQuery({
    queryKey: settingsKeys.access,
    queryFn: async () => normalizeAccessMembersResponse(await getAccessMembers()),
    staleTime: 15_000,
    retry: 1,
  });
}


export function useCreateAccessMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAccessMemberPayload) => createAccessMember(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.access });
      queryClient.invalidateQueries({ queryKey: settingsKeys.overview });
    },
  });
}

export function useUpdateAccessMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: UpdateAccessMemberPayload;
    }) => updateAccessMember(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.access });
      queryClient.invalidateQueries({ queryKey: settingsKeys.overview });
    },
  });
}

export function useUpdateAccessMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateAccessMemberStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.access });
      queryClient.invalidateQueries({ queryKey: settingsKeys.overview });
    },
  });
}
export function useResetAccessMemberPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: ResetAccessPasswordPayload;
    }) => resetAccessMemberPassword(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.access });
    },
  });
}
