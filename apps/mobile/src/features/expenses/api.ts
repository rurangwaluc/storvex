import { api } from "../../lib/api/client";
import type {
  CreateExpensePayload,
  ExpenseRecord,
  ExpensesResponse,
} from "./types";

function cleanString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function toQueryString(params: Record<string, unknown>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function getExpenses(params: { branchId?: string | null } = {}) {
  return api.get<ExpensesResponse>(
    `/expenses${toQueryString({ branchId: cleanString(params.branchId) })}`,
  );
}

export async function createExpense(payload: CreateExpensePayload) {
  return api.post<ExpenseRecord>("/expenses", payload);
}

export async function approveExpense(expenseId: string) {
  const id = cleanString(expenseId);

  if (!id) {
    throw new Error("Expense record is missing.");
  }

  return api.patch<ExpenseRecord>(`/expenses/${encodeURIComponent(id)}/approve`, {});
}

export async function deleteExpense(expenseId: string) {
  const id = cleanString(expenseId);

  if (!id) {
    throw new Error("Expense record is missing.");
  }

  return api.delete<{ message?: string; code?: string }>(`/expenses/${encodeURIComponent(id)}`);
}
