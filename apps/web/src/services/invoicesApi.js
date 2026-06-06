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
    throw new Error("Invoice was not selected");
  }

  return cleaned;
}

export function listInvoices(query = "", options = {}) {
  const params = normalizeQueryInput(query);

  return apiFetch("/invoices", {
    method: "GET",
    query: params,
    ...(options || {}),
  });
}

export function getInvoiceDetail(id, options = {}) {
  return apiFetch(`/invoices/${encodeURIComponent(normalizeId(id))}`, {
    method: "GET",
    ...(options || {}),
  });
}

export function getInvoicePrintUrl(id, token) {
  return buildDocumentPrintUrl("invoices", normalizeId(id), token);
}

export function openInvoicePrint(id, token) {
  return openDocumentPrint("invoices", normalizeId(id), token);
}

export default {
  listInvoices,
  getInvoiceDetail,
  getInvoicePrintUrl,
  openInvoicePrint,
};