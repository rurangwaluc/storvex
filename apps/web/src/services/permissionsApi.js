// frontend/src/services/permissionsApi.js
import { apiFetch } from "./apiClient";

export function getMyPermissions() {
  return apiFetch("/auth/permissions/me");
}

export function getPermissionPolicy() {
  return apiFetch("/auth/permissions/policy");
}