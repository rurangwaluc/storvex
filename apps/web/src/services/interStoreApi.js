// frontend-stores/src/services/interStoreApi.js
import { apiFetch, getActiveBranchId } from "./apiClient";

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const v = cleanString(value).toLowerCase();
  if (["true", "1", "yes", "y"].includes(v)) return true;
  if (["false", "0", "no", "n"].includes(v)) return false;

  return null;
}

function appendQuery(path, params = {}) {
  const qs = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    const clean = cleanString(value);
    if (!clean) return;

    qs.set(key, clean);
  });

  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}

function resolveBranchScope(params = {}) {
  const allBranches = normalizeBoolean(params.allBranches);
  const requestedBranchId = cleanString(params.branchId);
  const activeBranchId = cleanString(getActiveBranchId?.());

  if (allBranches === true) {
    return {
      allBranches: "true",
    };
  }

  const branchId = requestedBranchId || activeBranchId;

  if (!branchId) {
    return {};
  }

  return {
    branchId,
  };
}

function buildScopedPath(path, params = {}) {
  return appendQuery(path, {
    ...resolveBranchScope(params),
    ...params,
    allBranches:
      normalizeBoolean(params.allBranches) === true ? "true" : undefined,
    branchId:
      normalizeBoolean(params.allBranches) === true
        ? undefined
        : cleanString(params.branchId) || cleanString(getActiveBranchId?.()) || undefined,
  });
}

function normalizeDealsResponse(data) {
  if (Array.isArray(data)) {
    return {
      deals: data,
      count: data.length,
      branchScope: null,
      raw: data,
    };
  }

  const deals = Array.isArray(data?.deals) ? data.deals : [];

  return {
    deals,
    count: Number.isFinite(Number(data?.count)) ? Number(data.count) : deals.length,
    branchScope: data?.branchScope || null,
    raw: data || null,
  };
}

function normalizePaymentsResponse(data) {
  const payments = Array.isArray(data?.payments) ? data.payments : [];

  return {
    payments,
    count: Number.isFinite(Number(data?.count)) ? Number(data.count) : payments.length,
    summary: data?.summary || {
      owed: Number(data?.owed || 0),
      totalPaid: Number(data?.totalPaid || 0),
      balanceDue: Number(data?.balanceDue || 0),
      count: Number(data?.count || payments.length || 0),
    },
    page: data?.page || null,
    filters: data?.filters || null,
    branchScope: data?.branchScope || null,
    raw: data || null,
  };
}

function normalizeSuppliersResponse(data) {
  return Array.isArray(data?.suppliers) ? data.suppliers : [];
}

function normalizeSupplierProductsResponse(data) {
  return Array.isArray(data?.products) ? data.products : [];
}

function normalizeDeal(data) {
  return data?.deal || data || null;
}

function buildJsonBody(payload = {}) {
  return JSON.stringify(payload || {});
}

/**
 * Deals
 */
export async function getDeals(params = {}) {
  const data = await apiFetch(buildScopedPath("/interstore", params));
  return normalizeDealsResponse(data).deals;
}

export async function getDealsWithMeta(params = {}) {
  const data = await apiFetch(buildScopedPath("/interstore", params));
  return normalizeDealsResponse(data);
}

export async function getDeal(id, params = {}) {
  const dealId = cleanString(id);

  if (!dealId) {
    throw new Error("Deal id is required");
  }

  const data = await apiFetch(
    buildScopedPath(`/interstore/${encodeURIComponent(dealId)}`, params)
  );

  return normalizeDeal(data);
}

export async function createDeal(payload = {}) {
  const data = await apiFetch("/interstore", {
    method: "POST",
    body: buildJsonBody(payload),
  });

  return normalizeDeal(data);
}

export async function markReceived(id, params = {}) {
  const dealId = cleanString(id);

  if (!dealId) {
    throw new Error("Deal id is required");
  }

  const data = await apiFetch(
    buildScopedPath(`/interstore/${encodeURIComponent(dealId)}/receive`, params),
    {
      method: "POST",
      body: buildJsonBody({}),
    }
  );

  return normalizeDeal(data);
}

export async function markSold(id, payload = {}, params = {}) {
  const dealId = cleanString(id);

  if (!dealId) {
    throw new Error("Deal id is required");
  }

  const data = await apiFetch(
    buildScopedPath(`/interstore/${encodeURIComponent(dealId)}/sell`, params),
    {
      method: "POST",
      body: buildJsonBody(payload),
    }
  );

  return normalizeDeal(data);
}

export async function markReturned(id, payload = {}, params = {}) {
  const dealId = cleanString(id);

  if (!dealId) {
    throw new Error("Deal id is required");
  }

  const data = await apiFetch(
    buildScopedPath(`/interstore/${encodeURIComponent(dealId)}/return`, params),
    {
      method: "POST",
      body: buildJsonBody(payload),
    }
  );

  return normalizeDeal(data);
}

export async function markPaid(id, payload = {}, params = {}) {
  const dealId = cleanString(id);

  if (!dealId) {
    throw new Error("Deal id is required");
  }

  const data = await apiFetch(
    buildScopedPath(`/interstore/${encodeURIComponent(dealId)}/paid`, params),
    {
      method: "POST",
      body: buildJsonBody(payload),
    }
  );

  return normalizeDeal(data);
}

/**
 * Payments
 */
export async function getDealPayments(id, params = {}) {
  const dealId = cleanString(id);

  if (!dealId) {
    throw new Error("Deal id is required");
  }

  const data = await apiFetch(
    buildScopedPath(`/interstore/${encodeURIComponent(dealId)}/payments`, params)
  );

  return normalizePaymentsResponse(data);
}

export async function addDealPayment(id, payload = {}, params = {}) {
  const dealId = cleanString(id);

  if (!dealId) {
    throw new Error("Deal id is required");
  }

  return apiFetch(
    buildScopedPath(`/interstore/${encodeURIComponent(dealId)}/payments`, params),
    {
      method: "POST",
      body: buildJsonBody(payload),
    }
  );
}

export async function listInterStorePayments(params = {}) {
  const data = await apiFetch(buildScopedPath("/interstore/payments", params));
  return normalizePaymentsResponse(data);
}

/**
 * Collections
 */
export async function listOutstandingDeals(params = {}) {
  const data = await apiFetch(buildScopedPath("/interstore/outstanding", params));
  return normalizeDealsResponse(data).deals;
}

export async function listOverdueDeals(params = {}) {
  const data = await apiFetch(buildScopedPath("/interstore/overdue", params));
  return normalizeDealsResponse(data).deals;
}

export async function searchDeals(params = {}) {
  const q = cleanString(params.q);

  if (q.length < 2) {
    throw new Error("Search must be at least 2 characters");
  }

  const data = await apiFetch(buildScopedPath("/interstore/search", params));
  return normalizeDealsResponse(data).deals;
}

export async function searchCollections(params = {}) {
  const data = await apiFetch(buildScopedPath("/interstore/collections/search", params));
  return normalizeDealsResponse(data).deals;
}

/**
 * Suppliers
 */
export async function listInternalSuppliers(params = {}) {
  const data = await apiFetch(
    appendQuery("/interstore/internal-suppliers", {
      q: params.q,
      take: params.take,
      businessCategory: params.businessCategory,
    })
  );

  return normalizeSuppliersResponse(data);
}

export async function searchInternalSupplierProducts(supplierTenantId, params = {}) {
  const cleanSupplierTenantId = cleanString(supplierTenantId);

  if (!cleanSupplierTenantId) {
    throw new Error("Supplier tenant id is required");
  }

  const data = await apiFetch(
    appendQuery(
      `/interstore/internal-suppliers/${encodeURIComponent(cleanSupplierTenantId)}/products`,
      {
        q: params.q,
        take: params.take,
        businessCategory: params.businessCategory,
      }
    )
  );

  return normalizeSupplierProductsResponse(data);
}

/**
 * Audit
 */
export async function listInterStoreAudit(params = {}) {
  const data = await apiFetch(buildScopedPath("/interstore/audit", params));

  return {
    logs: Array.isArray(data?.logs) ? data.logs : [],
    count: Number.isFinite(Number(data?.count)) ? Number(data.count) : 0,
    branchScope: data?.branchScope || null,
    raw: data || null,
  };
}