import { apiFetch } from "./apiClient";

export async function createTenantIntent(data) {
  return apiFetch("/auth/owner-intent", {
    method: "POST",
    body: data,
  });
}