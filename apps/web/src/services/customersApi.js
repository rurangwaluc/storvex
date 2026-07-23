import { apiFetch } from "./apiClient";

function buildCustomerQuery(params = {}) {
  const search = new URLSearchParams();

  const q = String(params.q || "").trim();
  if (q) search.set("q", q);

  if (params.includeInactive) search.set("includeInactive", "true");

  const source = String(params.source || "").trim().toUpperCase();
  if (source && source !== "ALL") search.set("source", source);

  if (params.withOutstanding) {
    search.set("withOutstanding", "true");
  }

  if (params.allLocations) search.set("allBranches", "true");

  if (params.locationId) search.set("branchId", params.locationId);

  const qs = search.toString();
  return qs ? `/customers?${qs}` : "/customers";
}

export function createCustomer(data) {
  return apiFetch("/customers", {
    method: "POST",
    body: data,
  });
}

export function listCustomers(params = {}, options = {}) {
  return apiFetch(buildCustomerQuery(params), {
    signal: options.signal,
  });
}

export function getCustomer(id) {
  return apiFetch(`/customers/${encodeURIComponent(id)}`);
}

export function updateCustomer(id, data) {
  return apiFetch(`/customers/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: data,
  });
}

export function reactivateCustomer(id) {
  return apiFetch(`/customers/${encodeURIComponent(id)}/reactivate`, {
    method: "PUT",
  });
}

export function deactivateCustomer(id) {
  return apiFetch(`/customers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function getCustomerLedger(customerId, params = {}, options = {}) {
  const search = new URLSearchParams();

  if (params.allLocations) search.set("allBranches", "true");
  if (params.locationId) search.set("branchId", params.locationId);

  const qs = search.toString();

  return apiFetch(
    `/customers/${encodeURIComponent(customerId)}/ledger${qs ? `?${qs}` : ""}`,
    {
      signal: options.signal,
    },
  );
}

export function getCustomerCreditSummary(params = {}, options = {}) {
  const search = new URLSearchParams();

  if (params.allLocations) search.set("allBranches", "true");
  if (params.locationId) search.set("branchId", params.locationId);

  const qs = search.toString();

  return apiFetch(`/customers/ledger/summary/outstanding${qs ? `?${qs}` : ""}`, {
    signal: options.signal,
  });
}