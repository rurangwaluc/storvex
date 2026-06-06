export type ReportRangePreset = "TODAY" | "7D" | "30D" | "MONTH";

export type ReportRange = {
  from?: string;
  to?: string;
  branchId?: string | null;
  allBranches?: boolean;
};

export type BranchScope = {
  label?: string | null;
  branchId?: string | null;
  allBranches?: boolean | null;
};

export type ReportsDashboardResponse = {
  branchScope?: BranchScope | null;
  sales?: {
    total?: number | string | null;
    count?: number | string | null;
    paidTotal?: number | string | null;
    creditTotal?: number | string | null;
    outstandingTotal?: number | string | null;
  } | null;
  expenses?: {
    approvedTotal?: number | string | null;
    approvedCount?: number | string | null;
    pendingTotal?: number | string | null;
    pendingCount?: number | string | null;
    total?: number | string | null;
    count?: number | string | null;
  } | null;
  repairs?: {
    total?: number | string | null;
    open?: number | string | null;
    completed?: number | string | null;
    ready?: number | string | null;
    revenue?: number | string | null;
  } | null;
  profitEstimate?: number | string | null;
  grossProfit?: number | string | null;
  netCashFlow?: number | string | null;
  cash?: Record<string, unknown> | null;
  topSellers?: TopSellerRecord[] | null;
};

export type TopSellerRecord = {
  id?: string | null;
  productId?: string | null;
  name?: string | null;
  productName?: string | null;
  sku?: string | null;
  quantity?: number | string | null;
  unitsSold?: number | string | null;
  revenue?: number | string | null;
  total?: number | string | null;
};

export type ReportsInsightsResponse = {
  comparison?: {
    current?: Record<string, number | string | null> | null;
    previous?: Record<string, number | string | null> | null;
    percent?: Record<string, number | string | null> | null;
  } | null;
  reorderSuggestions?: {
    items?: InsightItem[] | null;
  } | null;
  collections?: {
    items?: InsightItem[] | null;
  } | null;
  actions?: InsightItem[] | null;
};

export type InsightItem = {
  id?: string | null;
  title?: string | null;
  label?: string | null;
  name?: string | null;
  text?: string | null;
  helper?: string | null;
  amount?: number | string | null;
  total?: number | string | null;
  quantity?: number | string | null;
  daysOverdue?: number | string | null;
};

export type FinancialSummaryResponse = {
  branchScope?: BranchScope | null;
  summary?: {
    revenue?: number | string | null;
    approvedExpenses?: number | string | null;
    profitEstimate?: number | string | null;
    salesCount?: number | string | null;
    stockAdjustmentsCount?: number | string | null;
  } | null;
  topSellers?: TopSellerRecord[] | null;
};

export type DailyCloseResponse = {
  date?: string | null;
  branchScope?: BranchScope | null;
  sales?: ReportsDashboardResponse["sales"];
  expenses?: ReportsDashboardResponse["expenses"];
  repairs?: ReportsDashboardResponse["repairs"];
  profitEstimate?: number | string | null;
  actions?: InsightItem[] | null;
};

export type CashFlowResponse = {
  branchScope?: BranchScope | null;
  summary?: {
    moneyIn?: number | string | null;
    moneyOut?: number | string | null;
    netCashFlow?: number | string | null;
    cashSales?: number | string | null;
    mobileMoneySales?: number | string | null;
    bankSales?: number | string | null;
  } | null;
  methods?: Array<{
    method?: string | null;
    amount?: number | string | null;
    count?: number | string | null;
  }> | null;
};

export type IncomeStatementResponse = {
  branchScope?: BranchScope | null;
  summary?: {
    revenue?: number | string | null;
    expenses?: number | string | null;
    profitEstimate?: number | string | null;
    margin?: number | string | null;
  } | null;
};

export type ReportsHub = {
  dashboard: ReportsDashboardResponse | null;
  insights: ReportsInsightsResponse | null;
  financial: FinancialSummaryResponse | null;
  dailyClose: DailyCloseResponse | null;
  cashFlow: CashFlowResponse | null;
  incomeStatement: IncomeStatementResponse | null;
};
