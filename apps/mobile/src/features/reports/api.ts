import { api } from "../../lib/api/client";
import type {
  CashFlowResponse,
  DailyCloseResponse,
  FinancialSummaryResponse,
  IncomeStatementResponse,
  ReportRange,
  ReportsDashboardResponse,
  ReportsHub,
  ReportsInsightsResponse,
  TopSellerRecord,
} from "./types";

function cleanString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function toQueryString(range: ReportRange = {}, extras: Record<string, unknown> = {}) {
  const search = new URLSearchParams();

  const from = cleanString(range.from);
  const to = cleanString(range.to);
  const branchId = cleanString(range.branchId);

  if (from) search.set("from", from);
  if (to) search.set("to", to);
  if (branchId) search.set("branchId", branchId);
  if (range.allBranches === true) search.set("allBranches", "true");

  for (const [key, value] of Object.entries(extras)) {
    const clean = cleanString(value);
    if (clean) search.set(key, clean);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

async function safeReport<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.warn("Report request failed", error);
    return null;
  }
}

export function getReportsDashboard(range: ReportRange) {
  return api.get<ReportsDashboardResponse>(`/reports/dashboard${toQueryString(range)}`);
}

export function getDailyClose(dateISO: string, options: ReportRange = {}) {
  return api.get<DailyCloseResponse>(
    `/reports/daily-close${toQueryString(
      {
        branchId: options.branchId,
        allBranches: options.allBranches,
      },
      { date: dateISO },
    )}`,
  );
}

export function getTopSellers(range: ReportRange, limit = 10) {
  return api.get<TopSellerRecord[]>(`/reports/top-sellers${toQueryString(range, { limit })}`);
}

export function getInsights(range: ReportRange, limit = 10, threshold = 5) {
  return api.get<ReportsInsightsResponse>(
    `/reports/insights${toQueryString(range, { limit, threshold })}`,
  );
}

export function getFinancialSummary(range: ReportRange) {
  return api.get<FinancialSummaryResponse>(`/reports/financial-summary${toQueryString(range)}`);
}

export function getIncomeStatement(range: ReportRange) {
  return api.get<IncomeStatementResponse>(`/reports/income-statement${toQueryString(range)}`);
}

export function getCashFlowReport(range: ReportRange) {
  return api.get<CashFlowResponse>(`/reports/cash-flow${toQueryString(range)}`);
}

export async function getReportsHub(range: ReportRange): Promise<ReportsHub> {
  const today = range.to || new Date().toISOString().slice(0, 10);

  const [dashboard, insights, financial, dailyClose, cashFlow, incomeStatement] = await Promise.all([
    safeReport(() => getReportsDashboard(range)),
    safeReport(() => getInsights(range, 10, 5)),
    safeReport(() => getFinancialSummary(range)),
    safeReport(() => getDailyClose(today, range)),
    safeReport(() => getCashFlowReport(range)),
    safeReport(() => getIncomeStatement(range)),
  ]);

  return {
    dashboard,
    insights,
    financial,
    dailyClose,
    cashFlow,
    incomeStatement,
  };
}
