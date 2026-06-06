import { api } from "../../lib/api/client";
import type {
  AddInterStorePaymentPayload,
  CreateInterStoreDealPayload,
  InterStoreDealResponse,
  InterStorePaymentsResponse,
  InterStoreDealsParams,
  InterStoreDealsResponse,
  InterStoreSupplierProductsResponse,
  InterStoreSuppliersResponse,
  MarkInterStorePaidPayload,
  MarkInterStoreReturnedPayload,
  MarkInterStoreSoldPayload,
} from "./types";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function appendQuery(path: string, params: Record<string, unknown> = {}) {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const text = clean(value);
    if (!text) return;
    qs.set(key, text);
  });

  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}

function scopedParams(params: InterStoreDealsParams = {}) {
  if (params.allBranches) return { allBranches: "true" };
  if (params.branchId) return { branchId: params.branchId };
  return {};
}

export function getInterStoreDeals(params: InterStoreDealsParams = {}) {
  return api.get<InterStoreDealsResponse>(appendQuery("/interstore", scopedParams(params)));
}


export function getInterStoreDeal(id: string, params: InterStoreDealsParams = {}) {
  return api.get<InterStoreDealResponse>(
    appendQuery(`/interstore/${encodeURIComponent(id)}`, scopedParams(params)),
  );
}

export function getInterStorePayments(id: string, params: InterStoreDealsParams = {}) {
  return api.get<InterStorePaymentsResponse>(
    appendQuery(`/interstore/${encodeURIComponent(id)}/payments`, scopedParams(params)),
  );
}

export function createInterStoreDeal(payload: CreateInterStoreDealPayload) {
  return api.post<InterStoreDealResponse>("/interstore", payload);
}

export function receiveInterStoreDeal(id: string, params: InterStoreDealsParams = {}) {
  return api.post<InterStoreDealResponse>(
    appendQuery(`/interstore/${encodeURIComponent(id)}/receive`, scopedParams(params)),
    {},
  );
}

export function sellInterStoreDeal(
  id: string,
  payload: MarkInterStoreSoldPayload = {},
  params: InterStoreDealsParams = {},
) {
  return api.post<InterStoreDealResponse>(
    appendQuery(`/interstore/${encodeURIComponent(id)}/sell`, scopedParams(params)),
    payload,
  );
}

export function returnInterStoreDeal(
  id: string,
  payload: MarkInterStoreReturnedPayload = {},
  params: InterStoreDealsParams = {},
) {
  return api.post<InterStoreDealResponse>(
    appendQuery(`/interstore/${encodeURIComponent(id)}/return`, scopedParams(params)),
    payload,
  );
}


export function addInterStorePayment(
  id: string,
  payload: AddInterStorePaymentPayload,
  params: InterStoreDealsParams = {},
) {
  return api.post(
    appendQuery(`/interstore/${encodeURIComponent(id)}/payments`, scopedParams(params)),
    payload,
  );
}

export function markInterStorePaid(
  id: string,
  payload: MarkInterStorePaidPayload,
  params: InterStoreDealsParams = {},
) {
  return api.post<InterStoreDealResponse>(
    appendQuery(`/interstore/${encodeURIComponent(id)}/paid`, scopedParams(params)),
    payload,
  );
}

export function listInternalSuppliers(q = "", take = 12) {
  return api.get<InterStoreSuppliersResponse>(
    appendQuery("/interstore/internal-suppliers", { q, take }),
  );
}

export function searchInternalSupplierProducts(
  supplierTenantId: string,
  q = "",
  take = 12,
) {
  return api.get<InterStoreSupplierProductsResponse>(
    appendQuery(`/interstore/internal-suppliers/${encodeURIComponent(supplierTenantId)}/products`, {
      q,
      take,
    }),
  );
}
