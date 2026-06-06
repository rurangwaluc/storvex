import { api } from "../../lib/api/client";
import type {
  DocumentSettingsResponse,
  StoreLocationMutationResponse,
  StoreLocationPayload,
  StoreLocationsResponse,
  StoreProfileResponse,
  StoreSetupChecklistResponse,
  WorkspaceContextResponse,
  ChangePasswordPayload,
  SecurityActionResponse,
  SecurityLoginEventsResponse,
  SecurityOverviewResponse,
  SecuritySessionsResponse,
  AccessMemberMutationResponse,
  AccessMembersResponse,
  AccessPasswordResetResponse,
  CreateAccessMemberPayload,
  ResetAccessPasswordPayload,
  UpdateAccessMemberPayload,
} from "./types";

export function getWorkspaceContext() {
  return api.get<WorkspaceContextResponse>("/auth/me");
}

export function getStoreProfile() {
  return api.get<StoreProfileResponse>("/store/profile");
}

export function updateStoreProfile(payload: Record<string, unknown> = {}) {
  return api.patch<StoreProfileResponse>("/store/profile", payload);
}

export function getStoreSetupChecklist() {
  return api.get<StoreSetupChecklistResponse>("/store/setup-checklist");
}

export function getDocumentSettings() {
  return api.get<DocumentSettingsResponse>("/store/document-settings");
}

export function updateDocumentSettings(payload: Record<string, unknown> = {}) {
  return api.patch<DocumentSettingsResponse>("/store/document-settings", payload);
}

export function getStoreLocations() {
  return api.get<StoreLocationsResponse>("/branches");
}

export function createStoreLocation(payload: StoreLocationPayload) {
  return api.post<StoreLocationMutationResponse>("/branches", payload);
}

export function updateStoreLocation(branchId: string, payload: StoreLocationPayload) {
  return api.patch<StoreLocationMutationResponse>(
    `/branches/${encodeURIComponent(branchId)}`,
    payload,
  );
}

export function setMainStoreLocation(branchId: string) {
  return api.patch<StoreLocationMutationResponse>(
    `/branches/${encodeURIComponent(branchId)}/main`,
    {},
  );
}

export function closeStoreLocation(branchId: string) {
  return api.patch<StoreLocationMutationResponse>(
    `/branches/${encodeURIComponent(branchId)}/archive`,
    {},
  );
}

export function reopenStoreLocation(branchId: string) {
  return api.patch<StoreLocationMutationResponse>(
    `/branches/${encodeURIComponent(branchId)}/reactivate`,
    {},
  );
}

export function createLogoUploadUrl(payload: Record<string, unknown> = {}) {
  return api.post<{
    upload?: {
      uploadUrl?: string | null;
      publicUrl?: string | null;
      objectKey?: string | null;
      headers?: Record<string, string> | null;
      method?: string | null;
    } | null;
  }>("/store/logo-upload-url", payload);
}

export function getSecurityOverview() {
  return api.get<SecurityOverviewResponse>("/settings/security/overview");
}

export function getSecuritySessions() {
  return api.get<SecuritySessionsResponse>("/settings/security/sessions");
}

export function getSecurityLoginEvents() {
  return api.get<SecurityLoginEventsResponse>("/settings/security/login-events");
}

export function revokeSecuritySession(sessionId: string) {
  return api.delete<SecurityActionResponse>(
    `/settings/security/sessions/${encodeURIComponent(sessionId)}`,
  );
}

export function revokeOtherSecuritySessions() {
  return api.post<SecurityActionResponse>("/settings/security/sessions/revoke-others", {});
}

export function changeSecurityPassword(payload: ChangePasswordPayload) {
  return api.post<SecurityActionResponse>("/settings/security/change-password", payload);
}

export function getAccessMembers() {
  return api.get<AccessMembersResponse>("/users?allBranches=true");
}

export function createAccessMember(payload: CreateAccessMemberPayload) {
  return api.post<AccessMemberMutationResponse>("/users", payload);
}

export function updateAccessMember(userId: string, payload: UpdateAccessMemberPayload) {
  return api.put<AccessMemberMutationResponse>(
    `/users/${encodeURIComponent(userId)}`,
    payload,
  );
}

export function updateAccessMemberStatus(userId: string, isActive: boolean) {
  return api.patch<AccessMemberMutationResponse>(
    `/users/${encodeURIComponent(userId)}/status`,
    { isActive },
  );
}
export function resetAccessMemberPassword(
  userId: string,
  payload: ResetAccessPasswordPayload,
) {
  return api.post<AccessPasswordResetResponse>(
    `/users/${encodeURIComponent(userId)}/reset-password`,
    payload,
  );
}
