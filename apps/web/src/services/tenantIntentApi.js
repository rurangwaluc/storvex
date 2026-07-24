import { apiFetch } from "./apiClient";

export async function createTenantIntent(data) {
  return apiFetch("/api/auth/signup/owner-intent", {
    method: "POST",
    body: data,
  });
}