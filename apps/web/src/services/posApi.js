import { apiFetch, getActiveBranchId } from "./apiClient";

const POS_BASE = "/pos";

export const SALE_TYPES = {
  CASH: "CASH",
  CREDIT: "CREDIT",
};

export const SALE_PAYMENT_METHODS = {
  CASH: "CASH",
  MOMO: "MOMO",
  CARD: "CARD",
  BANK: "BANK",
  OTHER: "OTHER",
};

export const PAYMENT_METHOD_OPTIONS = [
  {
    value: SALE_PAYMENT_METHODS.CASH,
    label: "Cash",
    description: "Physical cash collected in the branch drawer.",
    touchesCashDrawer: true,
  },
  {
    value: SALE_PAYMENT_METHODS.MOMO,
    label: "MoMo",
    description: "Mobile money payment such as MTN MoMo or Airtel Money.",
    touchesCashDrawer: false,
  },
  {
    value: SALE_PAYMENT_METHODS.CARD,
    label: "Card",
    description: "Card payment such as Visa or Mastercard.",
    touchesCashDrawer: false,
  },
  {
    value: SALE_PAYMENT_METHODS.BANK,
    label: "Bank",
    description: "Bank transfer or bank deposit.",
    touchesCashDrawer: false,
  },
  {
    value: SALE_PAYMENT_METHODS.OTHER,
    label: "Other",
    description: "Other non-cash payment method.",
    touchesCashDrawer: false,
  },
];

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function cleanObject(obj) {
  const out = {};

  for (const [key, value] of Object.entries(obj || {})) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }

  return out;
}

function withBranchOptions(options = {}) {
  const branchId =
    cleanString(options.branchId) ||
    cleanString(options.activeBranchId) ||
    cleanString(getActiveBranchId());

  return {
    ...options,
    branchId,
  };
}

function normalizeSaleType(value) {
  const v = cleanString(value).toUpperCase();
  return v === SALE_TYPES.CREDIT ? SALE_TYPES.CREDIT : SALE_TYPES.CASH;
}

function normalizePaymentMethod(value, fallback = SALE_PAYMENT_METHODS.CASH) {
  const v = cleanString(value || fallback).toUpperCase();

  if (v === "CASH") return SALE_PAYMENT_METHODS.CASH;

  if (
    v === "MOMO" ||
    v === "MOBILE_MONEY" ||
    v === "MTN_MOMO" ||
    v === "AIRTEL_MONEY"
  ) {
    return SALE_PAYMENT_METHODS.MOMO;
  }

  if (v === "CARD" || v === "VISA" || v === "MASTERCARD") {
    return SALE_PAYMENT_METHODS.CARD;
  }

  if (v === "BANK" || v === "BANK_TRANSFER" || v === "TRANSFER") {
    return SALE_PAYMENT_METHODS.BANK;
  }

  if (v === "OTHER") return SALE_PAYMENT_METHODS.OTHER;

  return fallback;
}

function normalizePositiveNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < 0) return fallback;
  return n;
}

function normalizePositiveInteger(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const int = Math.floor(n);
  return int > 0 ? int : fallback;
}

function normalizeSaleItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const productId = cleanString(item?.productId || item?.id);
      const quantity = normalizePositiveInteger(item?.quantity, 1);

      if (!productId) return null;

      return {
        productId,
        quantity,
      };
    })
    .filter(Boolean);
}

function normalizeCustomer(customer) {
  if (!customer || typeof customer !== "object") return null;

  const payload = cleanObject({
    name: cleanString(customer.name),
    phone: cleanString(customer.phone),
    email: cleanString(customer.email),
    address: cleanString(customer.address),
    tinNumber: cleanString(customer.tinNumber),
    idNumber: cleanString(customer.idNumber),
    notes: cleanString(customer.notes),
  });

  return Object.keys(payload).length > 0 ? payload : null;
}

function buildSalesQuery(params = {}) {
  return cleanObject({
    branchId: cleanString(params.branchId),
    allBranches: params.allBranches,
    q: cleanString(params.q),
    status: cleanString(params.status),
    saleType: cleanString(params.saleType),
    customerId: cleanString(params.customerId),
    from: params.from,
    to: params.to,
    limit: params.limit,
    cursor: params.cursor,
  });
}

function normalizeCreateSalePayload(payload = {}) {
  const saleType = normalizeSaleType(payload.saleType);
  const paymentMethod = normalizePaymentMethod(
    payload.paymentMethod || payload.method,
    SALE_PAYMENT_METHODS.CASH,
  );

  const items = normalizeSaleItems(payload.items);

  const body = cleanObject({
    saleType,
    paymentMethod,
    paymentReference: cleanString(payload.paymentReference),
    amountPaid:
      saleType === SALE_TYPES.CREDIT
        ? normalizePositiveNumber(payload.amountPaid, 0)
        : undefined,
    dueDate: saleType === SALE_TYPES.CREDIT ? payload.dueDate : undefined,
    customerId: cleanString(payload.customerId),
    customer: normalizeCustomer(payload.customer),
    customerName: cleanString(payload.customerName),
    customerPhone: cleanString(payload.customerPhone),
    items,
  });

  return body;
}

function normalizePaymentPayload(payload = {}) {
  return cleanObject({
    amount: normalizePositiveNumber(payload.amount, 0),
    method: normalizePaymentMethod(
      payload.method || payload.paymentMethod,
      SALE_PAYMENT_METHODS.CASH,
    ),
    paymentReference: cleanString(payload.paymentReference),
    note: cleanString(payload.note),
  });
}

function normalizeRefundItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const productId = cleanString(item?.productId || item?.id);
      const quantity = normalizePositiveInteger(item?.quantity, 1);

      if (!productId) return null;

      return {
        productId,
        quantity,
      };
    })
    .filter(Boolean);
}

function normalizeRefundPayload(payload = {}) {
  return cleanObject({
    method: normalizePaymentMethod(
      payload.method || payload.paymentMethod,
      SALE_PAYMENT_METHODS.CASH,
    ),
    note: cleanString(payload.note),
    reason: cleanString(payload.reason),
    items: normalizeRefundItems(payload.items),
  });
}

function normalizeWarrantyUnits(units = []) {
  if (!Array.isArray(units)) return [];

  return units
    .map((unit) => {
      const saleItemId = cleanString(unit?.saleItemId);
      const productId = cleanString(unit?.productId);

      if (!saleItemId || !productId) return null;

      return cleanObject({
        saleItemId,
        productId,
        serial: cleanString(unit.serial),
        imei1: cleanString(unit.imei1),
        imei2: cleanString(unit.imei2),
        unitLabel: cleanString(unit.unitLabel),
      });
    })
    .filter(Boolean);
}

function normalizeWarrantyPayload(payload = {}) {
  return cleanObject({
    policy: cleanString(payload.policy),
    durationMonths: payload.durationMonths,
    durationDays: payload.durationDays,
    startsAt: payload.startsAt,
    units: normalizeWarrantyUnits(payload.units),
  });
}

/**
 * Quick product picks for POS.
 */
export function getQuickPicks(params = {}, options = {}) {
  return apiFetch(`${POS_BASE}/quick-picks`, {
    method: "GET",
    query: cleanObject({
      periodDays: params.periodDays,
      limit: params.limit,
      branchId: cleanString(params.branchId),
      allBranches: params.allBranches,
    }),
    ...withBranchOptions(options),
  });
}

/**
 * Create sale.
 *
 * CASH sale:
 * {
 *   saleType: "CASH",
 *   paymentMethod: "CASH" | "MOMO" | "CARD" | "BANK" | "OTHER",
 *   paymentReference: "...",
 *   items: [{ productId, quantity }]
 * }
 *
 * CREDIT sale:
 * {
 *   saleType: "CREDIT",
 *   amountPaid: 0,
 *   dueDate: "2026-05-30",
 *   paymentMethod: "MOMO",
 *   customer: { name, phone },
 *   items: [{ productId, quantity }]
 * }
 */
export function createSale(payload = {}, options = {}) {
  const body = normalizeCreateSalePayload(payload);

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return Promise.reject(new Error("Sale items are required"));
  }

  return apiFetch(`${POS_BASE}/sales`, {
    method: "POST",
    body,
    ...withBranchOptions(options),
  });
}

/**
 * List sales for active branch by default.
 *
 * Use { allBranches: true } for owner consolidated view.
 */
export function getSales(params = {}, options = {}) {
  return apiFetch(`${POS_BASE}/sales`, {
    method: "GET",
    query: buildSalesQuery(params),
    ...withBranchOptions(options),
  });
}

export function listSales(params = {}, options = {}) {
  return getSales(params, options);
}

/**
 * Get sale detail / receipt payload.
 */
export function getSaleReceipt(saleId, options = {}) {
  const id = cleanString(saleId);

  if (!id) {
    return Promise.reject(new Error("Sale id is required"));
  }

  return apiFetch(`${POS_BASE}/sales/${encodeURIComponent(id)}/receipt`, {
    method: "GET",
    ...withBranchOptions(options),
  });
}

export function getSaleById(saleId, options = {}) {
  return getSaleReceipt(saleId, options);
}

export function getSale(saleId, options = {}) {
  return getSaleById(saleId, options);
}

/**
 * Create warranty for sale.
 */
export function createSaleWarranty(saleId, payload = {}, options = {}) {
  const id = cleanString(saleId);

  if (!id) {
    return Promise.reject(new Error("Sale id is required"));
  }

  const body = normalizeWarrantyPayload(payload);

  if (!Array.isArray(body.units) || body.units.length === 0) {
    return Promise.reject(new Error("Warranty units are required"));
  }

  return apiFetch(`${POS_BASE}/sales/${encodeURIComponent(id)}/warranty`, {
    method: "POST",
    body,
    ...withBranchOptions(options),
  });
}

/**
 * Add payment to CREDIT sale.
 */
export function addSalePayment(saleId, payload = {}, options = {}) {
  const id = cleanString(saleId);

  if (!id) {
    return Promise.reject(new Error("Sale id is required"));
  }

  const body = normalizePaymentPayload(payload);

  if (!Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) {
    return Promise.reject(new Error("Payment amount must be greater than 0"));
  }

  return apiFetch(`${POS_BASE}/sales/${encodeURIComponent(id)}/payments`, {
    method: "POST",
    body,
    ...withBranchOptions(options),
  });
}

/**
 * Outstanding credit sales.
 */
export function getOutstandingCredit(params = {}, options = {}) {
  return apiFetch(`${POS_BASE}/credit/outstanding`, {
    method: "GET",
    query: buildSalesQuery(params),
    ...withBranchOptions(options),
  });
}

export function listOutstandingCredit(params = {}, options = {}) {
  return getOutstandingCredit(params, options);
}

export function listOverdueCredit(params = {}, options = {}) {
  return getOverdueCredit(params, options);
}

/**
 * Overdue credit sales.
 */
export function getOverdueCredit(params = {}, options = {}) {
  return apiFetch(`${POS_BASE}/credit/overdue`, {
    method: "GET",
    query: buildSalesQuery(params),
    ...withBranchOptions(options),
  });
}

/**
 * Cancel sale.
 */
export function cancelSale(saleId, payload = {}, options = {}) {
  const id = cleanString(saleId);

  if (!id) {
    return Promise.reject(new Error("Sale id is required"));
  }

  return apiFetch(`${POS_BASE}/sales/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: cleanObject({
      note: cleanString(payload.note),
    }),
    ...withBranchOptions(options),
  });
}

/**
 * Create refund.
 */
export function createSaleRefund(saleId, payload = {}, options = {}) {
  const id = cleanString(saleId);

  if (!id) {
    return Promise.reject(new Error("Sale id is required"));
  }

  const body = normalizeRefundPayload(payload);

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return Promise.reject(new Error("Refund items are required"));
  }

  return apiFetch(`${POS_BASE}/sales/${encodeURIComponent(id)}/refunds`, {
    method: "POST",
    body,
    ...withBranchOptions(options),
  });
}

export function paymentMethodTouchesCashDrawer(method) {
  return normalizePaymentMethod(method) === SALE_PAYMENT_METHODS.CASH;
}

export function getPaymentMethodLabel(method) {
  const normalized = normalizePaymentMethod(method, "");
  const found = PAYMENT_METHOD_OPTIONS.find((option) => option.value === normalized);
  return found?.label || cleanString(method) || "Unknown";
}

export function getPaymentMethodOption(method) {
  const normalized = normalizePaymentMethod(method, "");
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === normalized) || null;
}

export function createRefund(saleId, payload = {}, options = {}) {
  return createSaleRefund(saleId, payload, options);
}

export function getReceipt(saleId, options = {}) {
  return getSaleReceipt(saleId, options);
}

export const posApi = {
  SALE_TYPES,
  SALE_PAYMENT_METHODS,
  PAYMENT_METHOD_OPTIONS,

  getQuickPicks,

  createSale,
  getSales,
  listSales,
  getSaleReceipt,
  getReceipt,
  getSaleById,
  getSale,
  createSaleWarranty,

  addSalePayment,
  getOutstandingCredit,
  listOutstandingCredit,
  getOverdueCredit,
  listOverdueCredit,

  cancelSale,
  createSaleRefund,
  createRefund,

  paymentMethodTouchesCashDrawer,
  getPaymentMethodLabel,
  getPaymentMethodOption,
};

export default posApi;

