import { API_BASE_URL } from "./apiClient";

function trimSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken() {
  return localStorage.getItem("tenantToken") || localStorage.getItem("token") || "";
}

export function buildDocumentPrintUrl(resource, id, token) {
  const authToken = token || getAuthToken();
  const base = getApiBaseUrl();
  const safeResource = trimSlashes(resource);
  const safeId = encodeURIComponent(String(id || "").trim());

  if (!safeResource) {
    throw new Error("Document type was not selected");
  }

  if (!safeId) {
    throw new Error("Document was not selected");
  }

  const tokenPart = authToken ? `?token=${encodeURIComponent(authToken)}` : "";
  return `${base}/${safeResource}/${safeId}/print${tokenPart}`;
}

export function openDocumentPrint(resource, id, token) {
  const url = buildDocumentPrintUrl(resource, id, token);
  window.open(url, "_blank", "noopener,noreferrer");
  return url;
}

export default {
  getApiBaseUrl,
  getAuthToken,
  buildDocumentPrintUrl,
  openDocumentPrint,
};