// src/services/dashboardApi.js
import { apiFetch } from "./apiClient";

function cleanString(value) {
  const clean = String(value || "").trim();
  return clean || "";
}

export function getTenantDashboard(
  params = {},
  options = {},
) {
  const branchId =
    cleanString(params.branchId) ||
    cleanString(options.branchId) ||
    cleanString(options.activeBranchId);

  return apiFetch("/dashboard", {
    method: "GET",
    query: branchId
      ? {
          branchId,
        }
      : undefined,
    ...options,
    branchId,
  });
}
