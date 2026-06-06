import { api } from "../../lib/api/client";
import type { AuthTenant, AuthUser } from "../../types/auth";
import type { Branch } from "../../types/branch";
import type { SubscriptionSummary } from "../../types/subscription";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
  tenant?: AuthTenant | null;
  subscription?: SubscriptionSummary | null;
  activeBranch?: Branch | null;
  allowedBranches?: Branch[];
};

export type MeResponse = {
  user: AuthUser;
  tenant: AuthTenant;

  subscription?: SubscriptionSummary | null;

  branches?: Branch[];
  allowedBranches?: Branch[];

  activeBranch?: Branch | null;
  defaultBranch?: Branch | null;
  mainBranch?: Branch | null;

  branchAccess?: {
    requestedBranchId?: string | null;
    defaultBranchId?: string | null;
    activeBranchId?: string | null;
    allowedBranchIds?: string[];
    visibleBranchIds?: string[];
    canViewAllBranches?: boolean;
    canOperateInActiveBranch?: boolean;
    canViewReportsInActiveBranch?: boolean;
  } | null;

  branchUsage?: Record<string, unknown> | null;
  trialBanner?: Record<string, unknown> | null;
  setupChecklistSummary?: Record<string, unknown> | null;
};

export async function loginOwner(payload: LoginPayload) {
  return api.post<LoginResponse>("/auth/login", payload, {
    requiresAuth: false,
  });
}

export async function getMe() {
  return api.get<MeResponse>("/auth/me");
}