import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveExpense,
  createExpense,
  deleteExpense,
  getExpenses,
} from "./api";
import type {
  CreateExpensePayload,
  ExpenseCategory,
  ExpenseRecord,
  ExpensesResponse,
} from "./types";

export const expenseKeys = {
  all: ["expenses"] as const,
  list: (branchId?: string | null) => ["expenses", "list", branchId || "active"] as const,
};

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function num(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeExpense(value?: ExpenseRecord | null): ExpenseRecord | null {
  if (!value?.id) return null;

  return {
    ...value,
    id: value.id,
    title: clean(value.title, "Expense"),
    category: clean(value.category, "OTHER") as ExpenseCategory,
    amount: num(value.amount, 0),
    status: clean(value.status, "PENDING"),
    notes: value.notes || null,
    branch: value.branch || null,
    createdBy: value.createdBy || null,
    approvedBy: value.approvedBy || null,
  };
}

export function normalizeExpenses(response?: ExpensesResponse | ExpenseRecord[] | null) {
  const source = Array.isArray(response) ? response : response?.expenses || [];

  return source
    .map((expense) => normalizeExpense(expense))
    .filter((expense): expense is ExpenseRecord => Boolean(expense));
}

export function expenseCategoryLabel(category?: string | null) {
  const key = String(category || "").toUpperCase();

  if (key === "RENT") return "Rent";
  if (key === "SALARY") return "Salary";
  if (key === "UTILITIES") return "Utilities";
  if (key === "TRANSPORT") return "Transport";
  if (key === "MAINTENANCE") return "Maintenance";
  if (key === "OTHER") return "Other";

  return "Other";
}

export function expenseStatusLabel(status?: string | null) {
  const key = String(status || "").toUpperCase();

  if (key === "APPROVED") return "Approved";
  if (key === "PENDING") return "Needs approval";

  return key || "Expense";
}

export function useExpenses(params: { branchId?: string | null } = {}) {
  return useQuery({
    queryKey: expenseKeys.list(params.branchId),
    queryFn: async () => normalizeExpenses(await getExpenses({ branchId: params.branchId })),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => createExpense(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useApproveExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => approveExpense(expenseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => deleteExpense(expenseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}
