import Constants from "expo-constants";
import { api } from "../../lib/api/client";
import type {
  DocumentDetailResponse,
  DocumentListResponse,
  DocumentType,
} from "./types";

function cleanString(value: unknown) {
  const text = String(value || "").trim();
  return text || "";
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  const extraUrl = Constants.expoConfig?.extra?.apiBaseUrl;

  if (typeof extraUrl === "string" && extraUrl.length > 0) {
    return extraUrl.replace(/\/+$/, "");
  }

  return "http://localhost:5000/api";
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

export function isDocumentType(value: unknown): value is DocumentType {
  return (
    value === "receipts" ||
    value === "invoices" ||
    value === "delivery-notes" ||
    value === "proformas" ||
    value === "warranties"
  );
}

export async function listDocuments(
  type: DocumentType,
  params: {
    q?: string | null;
    limit?: number;
  } = {},
) {
  return api.get<DocumentListResponse>(
    `/${type}${toQueryString({
      q: cleanString(params.q),
      limit: params.limit ?? 30,
    })}`,
  );
}

export async function getDocumentDetail(type: DocumentType, id: string) {
  const safeId = cleanString(id);

  if (!safeId) {
    throw new Error("Document was not selected.");
  }

  return api.get<DocumentDetailResponse>(
    `/${type}/${encodeURIComponent(safeId)}`,
  );
}

export function buildDocumentPrintUrl(
  type: DocumentType,
  id: string,
  token?: string | null,
) {
  const safeType = trimSlashes(type);
  const safeId = encodeURIComponent(cleanString(id));

  if (!safeType) {
    throw new Error("Document type was not selected.");
  }

  if (!safeId) {
    throw new Error("Document was not selected.");
  }

  const tokenPart = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${getApiBaseUrl()}/${safeType}/${safeId}/print${tokenPart}`;
}