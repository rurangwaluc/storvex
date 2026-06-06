export const queryKeys = {
  me: ["me"] as const,

  dashboard: (branchId?: string | null) =>
    ["dashboard", branchId ?? "no-branch"] as const,

  branches: ["branches"] as const,

  supportTickets: (filters?: Record<string, unknown>) =>
    ["supportTickets", filters ?? {}] as const,
};