import { useQuery } from "@tanstack/react-query";
import { getReportsHub } from "./api";
import type {
  InsightItem,
  ReportRange,
  ReportRangePreset,
  ReportsHub,
  TopSellerRecord,
} from "./types";

export const reportsKeys = {
  all: ["reports"] as const,
  hub: (range: ReportRange) => [
    "reports",
    "hub",
    range.from || "",
    range.to || "",
    range.branchId || "active",
    range.allBranches === true ? "all" : "current",
  ] as const,
};

export function todayISO() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function startOfMonthISO() {
  const d = new Date();
  d.setDate(1);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    "01",
  ].join("-");
}

export function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function rangeFromPreset(preset: ReportRangePreset, branchId?: string | null): ReportRange {
  if (preset === "TODAY") {
    return { from: todayISO(), to: todayISO(), branchId };
  }

  if (preset === "7D") {
    return { from: daysAgoISO(6), to: todayISO(), branchId };
  }

  if (preset === "30D") {
    return { from: daysAgoISO(29), to: todayISO(), branchId };
  }

  return { from: startOfMonthISO(), to: todayISO(), branchId };
}

export function numberValue(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function money(value: unknown) {
  return `RWF ${Math.round(numberValue(value)).toLocaleString()}`;
}

export function formatReportDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function percentLabel(value: unknown) {
  if (value === null || value === undefined) return "—";

  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function reportRangeLabel(range: ReportRange) {
  return `${formatReportDate(range.from)} — ${formatReportDate(range.to)}`;
}

export function topSellerName(item?: TopSellerRecord | null) {
  const name = String(item?.productName || item?.name || "").trim();
  return name || "Product";
}

export function topSellerUnits(item?: TopSellerRecord | null) {
  return numberValue(item?.unitsSold ?? item?.quantity, 0);
}

export function topSellerRevenue(item?: TopSellerRecord | null) {
  return numberValue(item?.revenue ?? item?.total, 0);
}

export function insightTitle(item?: InsightItem | null) {
  const title = String(item?.title || item?.label || item?.name || "").trim();
  return title || "Action item";
}

export function insightText(item?: InsightItem | null) {
  const text = String(item?.text || item?.helper || "").trim();
  return text || "Review this item before closing the period.";
}

export function getReportNumbers(hub?: ReportsHub | null) {
  const dashboard = hub?.dashboard;
  const financial = hub?.financial;
  const income = hub?.incomeStatement;
  const cash = hub?.cashFlow;

  const revenue = numberValue(
    dashboard?.sales?.total ?? financial?.summary?.revenue ?? income?.summary?.revenue,
  );
  const expenses = numberValue(
    dashboard?.expenses?.approvedTotal ?? financial?.summary?.approvedExpenses ?? income?.summary?.expenses,
  );
  const profit = numberValue(
    dashboard?.profitEstimate ?? financial?.summary?.profitEstimate ?? income?.summary?.profitEstimate,
  );
  const netCashFlow = numberValue(dashboard?.netCashFlow ?? cash?.summary?.netCashFlow, revenue - expenses);
  const salesCount = numberValue(dashboard?.sales?.count ?? financial?.summary?.salesCount, 0);
  const approvedExpenses = numberValue(dashboard?.expenses?.approvedCount, 0);
  const openRepairs = numberValue(dashboard?.repairs?.open, 0);
  const completedRepairs = numberValue(dashboard?.repairs?.completed, 0);

  return {
    revenue,
    expenses,
    profit,
    netCashFlow,
    salesCount,
    approvedExpenses,
    openRepairs,
    completedRepairs,
  };
}

export function useReportsHub(range: ReportRange) {
  return useQuery({
    queryKey: reportsKeys.hub(range),
    queryFn: () => getReportsHub(range),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
