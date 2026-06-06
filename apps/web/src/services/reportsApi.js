import apiClient, { apiFetch } from "./apiClient";

function qsFromRange(range = {}) {
  const qs = new URLSearchParams();

  if (range?.from) qs.set("from", range.from);
  if (range?.to) qs.set("to", range.to);
  if (range?.branchId) qs.set("branchId", range.branchId);
  if (range?.allBranches === true) qs.set("allBranches", "true");

  const query = qs.toString();
  return query ? `?${query}` : "";
}

function qsWithExtras(range = {}, extras = {}) {
  const qs = new URLSearchParams();

  if (range?.from) qs.set("from", range.from);
  if (range?.to) qs.set("to", range.to);
  if (range?.branchId) qs.set("branchId", range.branchId);
  if (range?.allBranches === true) qs.set("allBranches", "true");

  Object.entries(extras || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  });

  const query = qs.toString();
  return query ? `?${query}` : "";
}

export function getReportsDashboard(range) {
  return apiFetch(`/reports/dashboard${qsFromRange(range)}`);
}

export function getDailyClose(dateISO, options = {}) {
  const qs = new URLSearchParams();

  if (dateISO) qs.set("date", dateISO);
  if (options?.branchId) qs.set("branchId", options.branchId);
  if (options?.allBranches === true) qs.set("allBranches", "true");

  const query = qs.toString();
  return apiFetch(`/reports/daily-close${query ? `?${query}` : ""}`);
}

export function getTopSellers(range, limit = 10) {
  return apiFetch(`/reports/top-sellers${qsWithExtras(range, { limit })}`);
}

export function getInsights(range, limit = 10, threshold = 5) {
  return apiFetch(`/reports/insights${qsWithExtras(range, { limit, threshold })}`);
}

export function getSalesSummary(range) {
  return apiFetch(`/reports/sales-summary${qsFromRange(range)}`);
}

export function getExpenseSummary(range) {
  return apiFetch(`/reports/expense-summary${qsFromRange(range)}`);
}

export function getRepairSummary(range) {
  return apiFetch(`/reports/repair-summary${qsFromRange(range)}`);
}

export function getFinancialSummary(range) {
  return apiFetch(`/reports/financial-summary${qsFromRange(range)}`);
}

export function getIncomeStatement(range) {
  return apiFetch(`/reports/income-statement${qsFromRange(range)}`);
}

export function getCashFlowReport(range) {
  return apiFetch(`/reports/cash-flow${qsFromRange(range)}`);
}

export function getBranchPerformance(range) {
  return apiFetch(`/reports/branch-performance${qsFromRange(range)}`);
}

export async function downloadDailyClosePdf(dateISO, options = {}) {
  const qs = new URLSearchParams();

  if (dateISO) qs.set("date", dateISO);
  if (options?.branchId) qs.set("branchId", options.branchId);
  if (options?.allBranches === true) qs.set("allBranches", "true");

  const res = await apiClient.get(`/reports/daily-close.pdf?${qs.toString()}`, {
    responseType: "blob",
  });

  return res.data;
}

export async function downloadPeriodPdf(range, limit = 10, threshold = 5) {
  const qs = new URLSearchParams();

  if (range?.from) qs.set("from", range.from);
  if (range?.to) qs.set("to", range.to);
  if (range?.branchId) qs.set("branchId", range.branchId);
  if (range?.allBranches === true) qs.set("allBranches", "true");

  qs.set("limit", String(limit));
  qs.set("threshold", String(threshold));

  const res = await apiClient.get(`/reports/period.pdf?${qs.toString()}`, {
    responseType: "blob",
  });

  return res.data;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 300);
}