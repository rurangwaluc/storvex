import { apiFetch } from "./apiClient";

export async function getSecurityOverview() {
  const data = await apiFetch("/settings/security/overview");
  return data?.overview || {};
}

export async function getSecuritySessions() {
  const data = await apiFetch("/settings/security/sessions");
  return Array.isArray(data?.sessions) ? data.sessions : [];
}

export async function revokeSecuritySession(sessionId) {
  return apiFetch(`/settings/security/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export async function revokeOtherSecuritySessions() {
  return apiFetch("/settings/security/sessions/revoke-others", {
    method: "POST",
  });
}

export async function getSecurityLoginEvents() {
  const data = await apiFetch("/settings/security/login-events");
  return Array.isArray(data?.events) ? data.events : [];
}

export async function changeMyPassword(payload) {
  return apiFetch("/settings/security/change-password", {
    method: "POST",
    body: payload,
  });
}