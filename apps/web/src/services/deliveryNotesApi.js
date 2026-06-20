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
    throw new Error("Delivery note was not selected");
  }

  return cleaned;
}

export function listDeliveryNotes(query = "", options = {}) {
  const params = normalizeQueryInput(query);

  return apiFetch("/delivery-notes", {
    method: "GET",
    query: params,
    ...(options || {}),
  });
}

export function getDeliveryNoteById(id, options = {}) {
  return apiFetch(`/delivery-notes/${encodeURIComponent(normalizeId(id))}`, {
    method: "GET",
    ...(options || {}),
  });
}

export function getDeliveryNoteDetail(id, options = {}) {
  return getDeliveryNoteById(id, options);
}

export function createDeliveryNote(payload, options = {}) {
  return apiFetch("/delivery-notes", {
    method: "POST",
    body: payload || {},
    ...(options || {}),
  });
}

export function updateDeliveryNote(id, payload, options = {}) {
  return apiFetch(`/delivery-notes/${encodeURIComponent(normalizeId(id))}`, {
    method: "PATCH",
    body: payload || {},
    ...(options || {}),
  });
}

export function deleteDeliveryNote(id, options = {}) {
  return apiFetch(`/delivery-notes/${encodeURIComponent(normalizeId(id))}`, {
    method: "DELETE",
    ...(options || {}),
  });
}

export function getDeliveryNotePrintUrl(id, token) {
  return buildDocumentPrintUrl("delivery-notes", normalizeId(id), token);
}

export function openDeliveryNotePrint(id, token) {
  return openDocumentPrint("delivery-notes", normalizeId(id), token);
}

export default {
  listDeliveryNotes,
  getDeliveryNoteById,
  getDeliveryNoteDetail,
  createDeliveryNote,
  updateDeliveryNote,
  deleteDeliveryNote,
  getDeliveryNotePrintUrl,
  openDeliveryNotePrint,
};
