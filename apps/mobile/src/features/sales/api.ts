import { api } from "../../lib/api/client";
import type {
  AddSalePaymentPayload,
  AddSalePaymentResponse,
  CreditSalesResponse,
  SaleReceiptResponse,
  SalesListResponse,
} from "./types";

function cleanString(value: unknown) {
  const text = String(value || "").trim();
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

export async function listSales(
  params: {
    branchId?: string | null;
    limit?: number;
    cursor?: string | null;
    q?: string | null;
    from?: string | null;
    to?: string | null;
    allBranches?: boolean;
  } = {},
) {
  return api.get<SalesListResponse>(
    `/pos/sales${toQueryString({
      branchId: cleanString(params.branchId),
      limit: params.limit ?? 5,
      cursor: cleanString(params.cursor),
      q: cleanString(params.q),
      from: params.from,
      to: params.to,
      allBranches: params.allBranches,
    })}`,
  );
}

export async function getSaleReceipt(saleId: string, branchId?: string | null) {
  const id = cleanString(saleId);

  if (!id) {
    throw new Error("Sale record is missing.");
  }

  return api.get<SaleReceiptResponse>(
    `/pos/sales/${encodeURIComponent(id)}/receipt${toQueryString({
      branchId: cleanString(branchId),
    })}`,
  );
}

export async function addSalePayment(payload: AddSalePaymentPayload) {
  const id = cleanString(payload.saleId);

  if (!id) {
    throw new Error("Sale record is missing.");
  }

  return api.post<AddSalePaymentResponse>(
    `/pos/sales/${encodeURIComponent(id)}/payments`,
    {
      branchId: cleanString(payload.branchId),
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      method: payload.paymentMethod,
      paymentReference: cleanString(payload.paymentReference),
      reference: cleanString(payload.paymentReference),
      note: cleanString(payload.note),
    },
  );
}

export async function listOutstandingCreditSales(params: {
  branchId?: string | null;
  limit?: number;
} = {}) {
  return api.get<CreditSalesResponse>(
    `/pos/credit/outstanding${toQueryString({
      branchId: cleanString(params.branchId),
      limit: params.limit ?? 50,
    })}`,
  );
}

export async function listOverdueCreditSales(params: {
  branchId?: string | null;
  limit?: number;
} = {}) {
  return api.get<CreditSalesResponse>(
    `/pos/credit/overdue${toQueryString({
      branchId: cleanString(params.branchId),
      limit: params.limit ?? 50,
    })}`,
  );
}