import { apiFetch } from "./apiClient";
import { buildDocumentPrintUrl, openDocumentPrint } from "./documentPrint";

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function normalizeQueryInput(query) {
  if (!query) return {};

  if (typeof query === "string") {
    const q = query.trim();
    return q ? { q } : {};
  }

  if (typeof query === "object" && !Array.isArray(query)) {
    return Object.entries(query).reduce((acc, [key, value]) => {
      if (value === undefined || value === null) return acc;

      const cleaned = typeof value === "string" ? value.trim() : value;
      if (cleaned === "") return acc;

      acc[key] = cleaned;
      return acc;
    }, {});
  }

  return {};
}

function normalizeId(id) {
  const cleaned = cleanString(id);

  if (!cleaned) {
    throw new Error("Proforma was not selected");
  }

  return cleaned;
}

export function listProformas(query = "", options = {}) {
  const params = normalizeQueryInput(query);

  return apiFetch("/proformas", {
    method: "GET",
    query: params,
    ...(options || {}),
  });
}

export function getProformaById(id, options = {}) {
  return apiFetch(`/proformas/${encodeURIComponent(normalizeId(id))}`, {
    method: "GET",
    ...(options || {}),
  });
}

export function getProformaDetail(id, options = {}) {
  return getProformaById(id, options);
}

export function createProforma(payload, options = {}) {
  return apiFetch("/proformas", {
    method: "POST",
    body: payload || {},
    ...(options || {}),
  });
}

export function updateProforma(id, payload, options = {}) {
  return apiFetch(`/proformas/${encodeURIComponent(normalizeId(id))}`, {
    method: "PATCH",
    body: payload || {},
    ...(options || {}),
  });
}

export function deleteProforma(id, options = {}) {
  return apiFetch(`/proformas/${encodeURIComponent(normalizeId(id))}`, {
    method: "DELETE",
    ...(options || {}),
  });
}


export function duplicateProforma(id, options = {}) {
  return apiFetch(`/proformas/${encodeURIComponent(normalizeId(id))}/duplicate`, {
    method: "POST",
    ...(options || {}),
  });
}

export function convertProformaToSale(id, options = {}) {
  return apiFetch(`/proformas/${encodeURIComponent(normalizeId(id))}/convert-to-sale`, {
    method: "POST",
    ...(options || {}),
  });
}

export function getProformaPrintUrl(id, token) {
  return buildDocumentPrintUrl("proformas", normalizeId(id), token);
}

export function openProformaPrint(id, token) {
  return openDocumentPrint("proformas", normalizeId(id), token);
}

export default {
  listProformas,
  getProformaById,
  getProformaDetail,
  createProforma,
  updateProforma,
  deleteProforma,
  duplicateProforma,
  convertProformaToSale,
  getProformaPrintUrl,
  openProformaPrint,
};
