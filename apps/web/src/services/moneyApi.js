import { apiFetch, getActiveBranchId } from "./apiClient";

const MONEY_BASE = "/money";

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function cleanObject(obj) {
  const out = {};

  for (const [key, value] of Object.entries(obj || {})) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }

  return out;
}

function withBranchOptions(options = {}) {
  const branchId =
    cleanString(options.branchId) ||
    cleanString(options.activeBranchId) ||
    cleanString(getActiveBranchId());

  return {
    ...options,
    branchId,
  };
}

function normalizeMoney(value, fallback = 0) {
  const n = Number(value);

  if (!Number.isFinite(n)) return fallback;
  if (n < 0) return fallback;

  return Math.round(n);
}

function normalizeLoanType(value) {
  const v = cleanString(value).toUpperCase();

  if (v === "GIVEN_OUT") return "GIVEN_OUT";
  if (v === "RECEIVED") return "RECEIVED";

  return "";
}

function normalizeLoanMethod(value) {
  const v = cleanString(value).toUpperCase();

  if (["CASH", "MOMO", "BANK", "OTHER"].includes(v)) return v;

  return "CASH";
}

export function getMoneySummary(params = {}, options = {}) {
  return apiFetch(`${MONEY_BASE}/summary`, {
    method: "GET",
    query: cleanObject({
      branchId: cleanString(params.branchId),
    }),
    ...withBranchOptions(options),
  });
}

export function listOwnerLoans(params = {}, options = {}) {
  return apiFetch(`${MONEY_BASE}/loans`, {
    method: "GET",
    query: cleanObject({
      type: cleanString(params.type),
      status: cleanString(params.status),
      includeArchived: params.includeArchived === true ? "true" : "",
    }),
    ...withBranchOptions(options),
  });
}

export function createOwnerLoan(payload = {}, options = {}) {
  const body = cleanObject({
    type: normalizeLoanType(payload.type),
    partyName: cleanString(payload.partyName),
    partyPhone: cleanString(payload.partyPhone),
    amount: normalizeMoney(payload.amount ?? payload.originalAmount),
    paymentMethod: normalizeLoanMethod(payload.paymentMethod || payload.method),
    reference: cleanString(payload.reference),
    note: cleanString(payload.note),
    dueDate: cleanString(payload.dueDate),
    startedAt: cleanString(payload.startedAt),
    branchId: cleanString(payload.branchId),
  });

  if (!body.type) {
    return Promise.reject(new Error("Choose whether you gave money out or received money."));
  }

  if (!body.partyName) {
    return Promise.reject(new Error("Enter the person or business name."));
  }

  if (!body.amount || body.amount <= 0) {
    return Promise.reject(new Error("Loan amount must be greater than 0."));
  }

  return apiFetch(`${MONEY_BASE}/loans`, {
    method: "POST",
    body,
    ...withBranchOptions(options),
  });
}

export function addOwnerLoanPayment(loanId, payload = {}, options = {}) {
  const safeLoanId = encodeURIComponent(cleanString(loanId));

  if (!safeLoanId) {
    return Promise.reject(new Error("Loan is required."));
  }

  const body = cleanObject({
    amount: normalizeMoney(payload.amount),
    method: normalizeLoanMethod(payload.method || payload.paymentMethod),
    reference: cleanString(payload.reference),
    note: cleanString(payload.note),
    paidAt: cleanString(payload.paidAt),
    branchId: cleanString(payload.branchId),
  });

  if (!body.amount || body.amount <= 0) {
    return Promise.reject(new Error("Payment amount must be greater than 0."));
  }

  return apiFetch(`${MONEY_BASE}/loans/${safeLoanId}/payments`, {
    method: "POST",
    body,
    ...withBranchOptions(options),
  });
}

export function updateOwnerLoan(loanId, payload = {}, options = {}) {
  const safeLoanId = encodeURIComponent(cleanString(loanId));

  if (!safeLoanId) {
    return Promise.reject(new Error("Loan is required."));
  }

  return apiFetch(`${MONEY_BASE}/loans/${safeLoanId}`, {
    method: "PATCH",
    body: cleanObject(payload),
    ...withBranchOptions(options),
  });
}

export const moneyApi = {
  getMoneySummary,
  listOwnerLoans,
  createOwnerLoan,
  addOwnerLoanPayment,
  updateOwnerLoan,
};

export default moneyApi;
