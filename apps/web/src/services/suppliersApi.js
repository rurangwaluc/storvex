// frontend-stores/src/services/suppliersApi.js
import { apiFetch } from "./apiClient";

function cleanString(value) {
  return String(value || "").trim();
}

function toQuery(params = {}) {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    const cleanValue = cleanString(value);
    if (!cleanValue) return;

    qs.set(key, cleanValue);
  });

  const query = qs.toString();
  return query ? `?${query}` : "";
}

function normalizeSupplierPayload(data = {}) {
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

function normalizeSupplyPayload(data = {}) {
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
      quantity: Number(item.quantity || 1),
      buyPrice: Number(item.buyPrice || 0),
      sellPrice: Number(item.sellPrice || 0),
      notes: cleanString(item.notes) || null,
    })),
  };
}

export function listSuppliers(params = {}) {
  return apiFetch(`/suppliers${toQuery(params)}`);
}

export function createSupplier(data) {
  return apiFetch("/suppliers", {
    method: "POST",
    body: normalizeSupplierPayload(data),
  });
}

export function getSupplierById(id) {
  const supplierId = cleanString(id);
  if (!supplierId) throw new Error("Missing supplier id");

  return apiFetch(`/suppliers/${encodeURIComponent(supplierId)}`);
}

export function updateSupplier(id, data) {
  const supplierId = cleanString(id);
  if (!supplierId) throw new Error("Missing supplier id");

  return apiFetch(`/suppliers/${encodeURIComponent(supplierId)}`, {
    method: "PUT",
    body: normalizeSupplierPayload(data),
  });
}

export function activateSupplier(id) {
  const supplierId = cleanString(id);
  if (!supplierId) throw new Error("Missing supplier id");

  return apiFetch(`/suppliers/${encodeURIComponent(supplierId)}/activate`, {
    method: "PATCH",
  });
}

export function deactivateSupplier(id) {
  const supplierId = cleanString(id);
  if (!supplierId) throw new Error("Missing supplier id");

  return apiFetch(`/suppliers/${encodeURIComponent(supplierId)}/deactivate`, {
    method: "PATCH",
  });
}

export function listSupplierSupplies(id, params = {}) {
  const supplierId = cleanString(id);
  if (!supplierId) throw new Error("Missing supplier id");

  return apiFetch(`/suppliers/${encodeURIComponent(supplierId)}/supplies${toQuery(params)}`);
}

export function createSupplierSupply(id, data) {
  const supplierId = cleanString(id);
  if (!supplierId) throw new Error("Missing supplier id");

  return apiFetch(`/suppliers/${encodeURIComponent(supplierId)}/supplies`, {
    method: "POST",
    body: normalizeSupplyPayload(data),
  });
}
function normalizeSupplierBillPayload(data = {}) {
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    billNumber: cleanString(data.billNumber) || null,
    billDate: cleanString(data.billDate) || null,
    dueDate: cleanString(data.dueDate) || null,
    documentRef: cleanString(data.documentRef) || null,
    notes: cleanString(data.notes) || null,
    supplyId: cleanString(data.supplyId) || null,
    purchaseOrderId: cleanString(data.purchaseOrderId) || null,
    items: items.map((item) => ({
      productId: cleanString(item.productId) || null,
      productName: cleanString(item.productName),
      quantity: Number(item.quantity || 1),
      unitCost: Number(item.unitCost || item.buyPrice || 0),
      notes: cleanString(item.notes) || null,
    })),
  };
}

function normalizeSupplierPaymentPayload(data = {}) {
  return {
    billId: cleanString(data.billId),
    amount: Number(data.amount || 0),
    method: cleanString(data.method || data.paymentMethod || "CASH").toUpperCase(),
    reference: cleanString(data.reference) || null,
    note: cleanString(data.note) || null,
    paidAt: cleanString(data.paidAt) || null,
  };
}

export function getSupplierBalance(id) {
  const supplierId = cleanString(id);
  if (!supplierId) throw new Error("Missing supplier id");

  return apiFetch(`/suppliers/${encodeURIComponent(supplierId)}/balance`);
}

export function listSupplierBills(id, params = {}) {
  const supplierId = cleanString(id);
  if (!supplierId) throw new Error("Missing supplier id");

  return apiFetch(`/suppliers/${encodeURIComponent(supplierId)}/bills${toQuery(params)}`);
}

export function createSupplierBill(id, data) {
  const supplierId = cleanString(id);
  if (!supplierId) throw new Error("Missing supplier id");

  return apiFetch(`/suppliers/${encodeURIComponent(supplierId)}/bills`, {
    method: "POST",
    body: normalizeSupplierBillPayload(data),
  });
}

export function listSupplierPayments(id, params = {}) {
  const supplierId = cleanString(id);
  if (!supplierId) throw new Error("Missing supplier id");

  return apiFetch(`/suppliers/${encodeURIComponent(supplierId)}/payments${toQuery(params)}`);
}

export function createSupplierPayment(id, data) {
  const supplierId = cleanString(id);
  if (!supplierId) throw new Error("Missing supplier id");

  return apiFetch(`/suppliers/${encodeURIComponent(supplierId)}/payments`, {
    method: "POST",
    body: normalizeSupplierPaymentPayload(data),
  });
}
