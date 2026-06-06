import { api } from "../../lib/api/client";
import type {
  CashDrawerStatus,
  CreateSalePayload,
  CreateSaleResponse,
  PosCustomerListResponse,
  PosProductSearchResponse,
  PosQuickPicksResponse,
  SaleReceiptResponse,
} from "./types";

function cleanString(value: unknown) {
  const text = String(value || "").trim();
  return text || "";
}

function cleanObject<T extends Record<string, unknown>>(value: T) {
  const next: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value || {})) {
    if (item === undefined || item === null || item === "") continue;
    next[key] = item;
  }

  return next as Partial<T>;
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

export async function getQuickPicks(
  params: {
    branchId?: string | null;
    periodDays?: number;
    limit?: number;
  } = {},
) {
  return api.get<PosQuickPicksResponse>(
    `/pos/quick-picks${toQueryString({
      branchId: cleanString(params.branchId),
      periodDays: params.periodDays ?? 7,
      limit: params.limit ?? 5,
    })}`,
  );
}

export async function searchPosProducts(
  params: {
    q: string;
    branchId?: string | null;
    limit?: number;
  },
) {
  return api.get<PosProductSearchResponse>(
    `/inventory/products/search${toQueryString({
      q: cleanString(params.q),
      branchId: cleanString(params.branchId),
      limit: params.limit ?? 8,
    })}`,
  );
}

export async function listPosCustomers(
  params: {
    q?: string;
    limit?: number;
  } = {},
) {
  return api.get<PosCustomerListResponse>(
    `/customers${toQueryString({
      q: cleanString(params.q),
      limit: params.limit ?? 5,
    })}`,
  );
}

export async function getCashDrawerStatus() {
  return api.get<CashDrawerStatus>("/cash-drawer/status");
}

export async function createSale(payload: CreateSalePayload) {
  const branchId = cleanString(payload.branchId);

  const body = cleanObject({
    saleType: payload.saleType,
    paymentMethod: payload.paymentMethod,
    paymentReference: cleanString(payload.paymentReference),
    amountPaid: payload.amountPaid,
    dueDate: payload.dueDate,
    customerId: cleanString(payload.customerId),
    customer: payload.customer,
    customerName: cleanString(payload.customerName),
    customerPhone: cleanString(payload.customerPhone),
    items: payload.items,
  });

  return api.post<CreateSaleResponse>(
    `/pos/sales${toQueryString({ branchId })}`,
    body,
  );
}

export async function getSaleReceipt(saleId: string, branchId?: string | null) {
  const id = cleanString(saleId);

  if (!id) {
    throw new Error("Sale id is required.");
  }

  return api.get<SaleReceiptResponse>(
    `/pos/sales/${encodeURIComponent(id)}/receipt${toQueryString({
      branchId: cleanString(branchId),
    })}`,
  );
}