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
    throw new Error("Warranty was not selected");
  }

  return cleaned;
}

export function listWarranties(query = "", options = {}) {
  const params = normalizeQueryInput(query);

  return apiFetch("/warranties", {
    method: "GET",
    query: params,
    ...(options || {}),
  });
}

export function getWarranty(id, options = {}) {
  return apiFetch(`/warranties/${encodeURIComponent(normalizeId(id))}`, {
    method: "GET",
    ...(options || {}),
  });
}

export function getWarrantyById(id, options = {}) {
  return getWarranty(id, options);
}

export function getWarrantyDetail(id, options = {}) {
  return getWarranty(id, options);
}

export function createWarranty(payload, options = {}) {
  return apiFetch("/warranties", {
    method: "POST",
    body: payload || {},
    ...(options || {}),
  });
}

export function updateWarranty(id, payload, options = {}) {
  return apiFetch(`/warranties/${encodeURIComponent(normalizeId(id))}`, {
    method: "PATCH",
    body: payload || {},
    ...(options || {}),
  });
}

export function deleteWarranty(id, options = {}) {
  return apiFetch(`/warranties/${encodeURIComponent(normalizeId(id))}`, {
    method: "DELETE",
    ...(options || {}),
  });
}

export function getWarrantyPrintUrl(id, token) {
  return buildDocumentPrintUrl("warranties", normalizeId(id), token);
}

export function getWarrantyPrintPath(id) {
  return `/warranties/${encodeURIComponent(normalizeId(id))}/print`;
}

export function openWarrantyPrint(id, token) {
  return openDocumentPrint("warranties", normalizeId(id), token);
}

export default {
  listWarranties,
  getWarranty,
  getWarrantyById,
  getWarrantyDetail,
  createWarranty,
  updateWarranty,
  deleteWarranty,
  getWarrantyPrintUrl,
  getWarrantyPrintPath,
  openWarrantyPrint,
};