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
    throw new Error("Receipt was not selected");
  }

  return cleaned;
}

export function listReceipts(query = "", options = {}) {
  const params = normalizeQueryInput(query);

  return apiFetch("/receipts", {
    method: "GET",
    query: params,
    ...(options || {}),
  });
}

export function getReceiptDetail(id, options = {}) {
  return apiFetch(`/receipts/${encodeURIComponent(normalizeId(id))}`, {
    method: "GET",
    ...(options || {}),
  });
}

export function getReceiptPrintUrl(id, token) {
  return buildDocumentPrintUrl("receipts", normalizeId(id), token);
}

export function openReceiptPrint(id, token) {
  return openDocumentPrint("receipts", normalizeId(id), token);
}

const receiptsApi = {
  listReceipts,
  getReceiptDetail,
  getReceiptPrintUrl,
  openReceiptPrint,
};

export default receiptsApi;