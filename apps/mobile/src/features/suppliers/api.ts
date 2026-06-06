import { api } from "../../lib/api/client";
import type {
  SupplierPayload,
  SupplierRecord,
  SupplierSuppliesResponse,
  SupplierSupplyPayload,
  SupplierSupplyRecord,
  SuppliersResponse,
} from "./types";

function cleanString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "";
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function toQueryString(params: Record<string, unknown> = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;

    const cleanValue = cleanString(value);
    if (!cleanValue) continue;

    search.set(key, cleanValue);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

function normalizeSupplierPayload(data: SupplierPayload): SupplierPayload {
  return {
    name: cleanString(data.name),
    idType: cleanString(data.idType),
    idNumber: cleanString(data.idNumber),
    phone: cleanString(data.phone) || null,
    email: cleanString(data.email) || null,
    address: cleanString(data.address) || null,
    notes: cleanString(data.notes) || null,
    companyName: cleanString(data.companyName) || null,
    taxId: cleanString(data.taxId) || null,
    sourceType: cleanString(data.sourceType) || "OTHER",
    sourceDetails: cleanString(data.sourceDetails) || null,
  };
}

function normalizeSupplyPayload(data: SupplierSupplyPayload): SupplierSupplyPayload {
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    sourceType: cleanString(data.sourceType) || "OTHER",
    sourceDetails: cleanString(data.sourceDetails) || null,
    documentRef: cleanString(data.documentRef) || null,
    notes: cleanString(data.notes) || null,
    alsoUpdateStock: data.alsoUpdateStock !== false,
    items: items.map((item) => ({
      productId: cleanString(item.productId) || null,
      productName: cleanString(item.productName),
      category: cleanString(item.category) || null,
      subcategory: cleanString(item.subcategory) || null,
      subcategoryOther: cleanString(item.subcategoryOther) || null,
      brand: cleanString(item.brand) || null,
      serial: cleanString(item.serial) || null,
      quantity: Math.floor(toNumber(item.quantity, 1)),
      buyPrice: toNumber(item.buyPrice, 0),
      sellPrice: toNumber(item.sellPrice, 0),
      notes: cleanString(item.notes) || null,
    })),
  };
}

export async function listSuppliers(params: { q?: string; status?: string } = {}) {
  return api.get<SuppliersResponse | SupplierRecord[]>(`/suppliers${toQueryString(params)}`);
}

export async function createSupplier(payload: SupplierPayload) {
  return api.post<SupplierRecord>("/suppliers", normalizeSupplierPayload(payload));
}

export async function getSupplierById(supplierId: string) {
  const id = cleanString(supplierId);

  if (!id) {
    throw new Error("Supplier record is missing.");
  }

  return api.get<SupplierRecord>(`/suppliers/${encodeURIComponent(id)}`);
}

export async function updateSupplier(supplierId: string, payload: SupplierPayload) {
  const id = cleanString(supplierId);

  if (!id) {
    throw new Error("Supplier record is missing.");
  }

  return api.put<SupplierRecord>(`/suppliers/${encodeURIComponent(id)}`, normalizeSupplierPayload(payload));
}

export async function activateSupplier(supplierId: string) {
  const id = cleanString(supplierId);

  if (!id) {
    throw new Error("Supplier record is missing.");
  }

  return api.patch<SupplierRecord>(`/suppliers/${encodeURIComponent(id)}/activate`, {});
}

export async function deactivateSupplier(supplierId: string) {
  const id = cleanString(supplierId);

  if (!id) {
    throw new Error("Supplier record is missing.");
  }

  return api.patch<SupplierRecord>(`/suppliers/${encodeURIComponent(id)}/deactivate`, {});
}

export async function listSupplierSupplies(supplierId: string) {
  const id = cleanString(supplierId);

  if (!id) {
    throw new Error("Supplier record is missing.");
  }

  return api.get<SupplierSuppliesResponse>(`/suppliers/${encodeURIComponent(id)}/supplies`);
}

export async function createSupplierSupply(supplierId: string, payload: SupplierSupplyPayload) {
  const id = cleanString(supplierId);

  if (!id) {
    throw new Error("Supplier record is missing.");
  }

  return api.post<SupplierSupplyRecord>(
    `/suppliers/${encodeURIComponent(id)}/supplies`,
    normalizeSupplyPayload(payload),
  );
}
