// src/services/dashboardApi.js
import { apiFetch } from "./apiClient";

export function getTenantDashboard() {
  return apiFetch("/dashboard");
}