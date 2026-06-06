// frontend-stores/src/services/expensesApi.js
import { apiFetch } from "./apiClient";

function buildExpenseQuery(params = {}) {
  const search = new URLSearchParams();

  if (params.storeLocationId) {
    search.set("branchId", params.storeLocationId);
  }

  if (params.branchId) {
    search.set("branchId", params.branchId);
  }

  if (params.allStoreLocations || params.allBranches) {
    search.set("allBranches", "true");
  }

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function getExpenses(params = {}) {
  return apiFetch(`/expenses${buildExpenseQuery(params)}`);
}

export async function createExpense(data) {
  return apiFetch("/expenses", {
    method: "POST",
    body: data,
  });
}

export async function approveExpense(id, params = {}) {
  return apiFetch(`/expenses/${encodeURIComponent(id)}/approve${buildExpenseQuery(params)}`, {
    method: "PATCH",
  });
}

export async function deleteExpense(id, params = {}) {
  return apiFetch(`/expenses/${encodeURIComponent(id)}${buildExpenseQuery(params)}`, {
    method: "DELETE",
  });
}