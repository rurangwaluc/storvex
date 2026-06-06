import { useQuery } from "@tanstack/react-query";
import { getDocumentDetail, listDocuments } from "./api";
import type {
  DocumentDetail,
  DocumentDetailResponse,
  DocumentLineItem,
  DocumentListResponse,
  DocumentRecord,
  DocumentSection,
  DocumentStatus,
  DocumentType,
} from "./types";

export const DOCUMENT_SECTIONS: DocumentSection[] = [
  {
    type: "receipts",
    title: "Receipts",
    label: "Receipts",
    helper: "Customer payment proof and sale records.",
    badge: "Payments",
    icon: "receipt-outline",
    canCreate: false,
  },
  {
    type: "invoices",
    title: "Invoices",
    label: "Invoices",
    helper: "Customer billing records and payment tracking.",
    badge: "Billing",
    icon: "document-text-outline",
    canCreate: false,
  },
  {
    type: "delivery-notes",
    title: "Delivery notes",
    label: "Delivery",
    helper: "Proof that goods were handed to the customer.",
    badge: "Handover",
    icon: "cube-outline",
    canCreate: true,
  },
  {
    type: "proformas",
    title: "Proformas",
    label: "Proformas",
    helper: "Customer quotations before final sale.",
    badge: "Quotation",
    icon: "reader-outline",
    canCreate: true,
  },
  {
    type: "warranties",
    title: "Warranties",
    label: "Warranties",
    helper: "After-sale protection and support records.",
    badge: "Support",
    icon: "shield-checkmark-outline",
    canCreate: true,
  },
];

export const documentKeys = {
  all: ["documents"] as const,
  list: (type: DocumentType, q?: string | null) =>
    ["documents", type, q || ""] as const,
  detail: (type?: DocumentType | null, id?: string | null) =>
    ["documents", "detail", type || "missing", id || "missing"] as const,
};

function safeArray(value?: DocumentListResponse, type?: DocumentType) {
  if (Array.isArray(value)) return value as unknown[];

  if (type === "receipts" && Array.isArray(value?.receipts)) {
    return value.receipts;
  }

  if (type === "invoices" && Array.isArray(value?.invoices)) {
    return value.invoices;
  }

  if (type === "delivery-notes" && Array.isArray(value?.deliveryNotes)) {
    return value.deliveryNotes;
  }

  if (type === "proformas" && Array.isArray(value?.proformas)) {
    return value.proformas;
  }

  if (type === "warranties" && Array.isArray(value?.warranties)) {
    return value.warranties;
  }

  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;

  return [];
}

function getText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function getNumber(value: unknown) {
  if (typeof value === "bigint") return Number(value);

  const cleaned =
    typeof value === "string" ? value.replace(/[^\d.-]/g, "") : value;

  const amount = Number(cleaned || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function getOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return getNumber(value);
}

function getBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }

  return fallback;
}

function getPrimitive(value: unknown, fallback: string | number | null = null) {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    value === null ||
    value === undefined
  ) {
    return value ?? fallback;
  }

  return fallback;
}

function asObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getNestedText(
  value: Record<string, unknown>,
  path: string[],
  fallback = "",
) {
  let current: unknown = value;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return fallback;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return getText(current, fallback);
}

function getNestedNumber(value: Record<string, unknown>, path: string[]) {
  let current: unknown = value;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return getOptionalNumber(current);
}

function unwrapDetail(type: DocumentType, response?: DocumentDetailResponse) {
  const value = asObject(response);

  if (type === "receipts" && value.receipt) return value.receipt;
  if (type === "invoices" && value.invoice) return value.invoice;
  if (type === "delivery-notes" && value.deliveryNote) return value.deliveryNote;
  if (type === "proformas" && value.proforma) return value.proforma;
  if (type === "warranties" && value.warranty) return value.warranty;

  if (value.document) return value.document;
  if (value.data) return value.data;

  return response;
}

function documentNumber(type: DocumentType, item: Record<string, unknown>) {
  if (type === "receipts") {
    return getText(
      item.receiptNumber || item.number || item.reference || item.id,
      "Receipt",
    );
  }

  if (type === "invoices") {
    return getText(
      item.invoiceNumber || item.number || item.reference || item.id,
      "Invoice",
    );
  }

  if (type === "delivery-notes") {
    return getText(
      item.deliveryNumber || item.deliveryNoteNumber || item.number || item.reference || item.id,
      "Delivery note",
    );
  }

  if (type === "proformas") {
    return getText(
      item.proformaNumber || item.number || item.reference || item.id,
      "Proforma",
    );
  }

  return getText(
    item.warrantyNumber || item.number || item.reference || item.id,
    "Warranty",
  );
}

function customerName(item: Record<string, unknown>) {
  return (
    getNestedText(item, ["customer", "name"]) ||
    getText(item.customerName) ||
    getText(item.name) ||
    "Walk-in customer"
  );
}

function customerPhone(item: Record<string, unknown>) {
  return (
    getNestedText(item, ["customer", "phone"]) ||
    getText(item.customerPhone) ||
    getText(item.phone)
  );
}

function amountPaid(item: Record<string, unknown>) {
  return (
    getOptionalNumber(item.amountPaid) ??
    getOptionalNumber(item.paidAmount) ??
    getOptionalNumber(item.receivedAmount) ??
    getNestedNumber(item, ["sale", "amountPaid"]) ??
    0
  );
}

function balanceDue(item: Record<string, unknown>) {
  return (
    getOptionalNumber(item.balanceDue) ??
    getOptionalNumber(item.balance) ??
    getNestedNumber(item, ["sale", "balanceDue"]) ??
    0
  );
}

function subtotalAmount(item: Record<string, unknown>) {
  return (
    getOptionalNumber(item.subtotalAmount) ??
    getOptionalNumber(item.subtotal) ??
    getNestedNumber(item, ["sale", "subtotalAmount"]) ??
    getNestedNumber(item, ["sale", "subtotal"]) ??
    0
  );
}

function taxableAmount(item: Record<string, unknown>) {
  return (
    getOptionalNumber(item.taxableAmount) ??
    getNestedNumber(item, ["sale", "taxableAmount"]) ??
    0
  );
}

function taxAmount(item: Record<string, unknown>) {
  return (
    getOptionalNumber(item.taxAmount) ??
    getNestedNumber(item, ["sale", "taxAmount"]) ??
    0
  );
}

function totalAmount(type: DocumentType, item: Record<string, unknown>) {
  const direct =
    getOptionalNumber(item.totalAmount) ??
    getOptionalNumber(item.total) ??
    getOptionalNumber(item.amount) ??
    getNestedNumber(item, ["sale", "totalAmount"]) ??
    getNestedNumber(item, ["sale", "total"]);

  if (direct != null) return direct;

  if (type === "receipts") {
    return amountPaid(item) + balanceDue(item);
  }

  return subtotalAmount(item);
}

function documentAmount(type: DocumentType, item: Record<string, unknown>) {
  if (type === "receipts") return totalAmount(type, item);
  if (type === "invoices") return totalAmount(type, item);
  if (type === "proformas") return totalAmount(type, item);

  return null;
}

function documentDate(item: Record<string, unknown>) {
  return getText(
    item.createdAt ||
      item.date ||
      item.issuedAt ||
      item.startsAt ||
      item.openedAt,
  );
}

function documentStatus(type: DocumentType, item: Record<string, unknown>) {
  if (type === "receipts") {
    const remaining = balanceDue(item);

    if (remaining > 0) return "PARTIAL";

    return getText(item.status || item.saleType || item.paymentStatus, "PAID");
  }

  if (type === "delivery-notes") {
    return getText(item.status, "DELIVERED");
  }

  if (type === "warranties") {
    return getText(item.status, "ACTIVE");
  }

  return getText(item.status, "DRAFT");
}

function taxMode(item: Record<string, unknown>) {
  return getText(item.taxMode || getNestedText(item, ["sale", "taxMode"]), "NONE");
}

function taxDisplayMode(item: Record<string, unknown>) {
  return getText(
    item.taxDisplayMode || getNestedText(item, ["sale", "taxDisplayMode"]),
    "HIDDEN",
  );
}

function taxRateBps(item: Record<string, unknown>) {
  return (
    getOptionalNumber(item.taxRateBps) ??
    getNestedNumber(item, ["sale", "taxRateBps"]) ??
    0
  );
}

function taxRatePercent(item: Record<string, unknown>) {
  const explicit =
    getOptionalNumber(item.taxRatePercent) ??
    getNestedNumber(item, ["sale", "taxRatePercent"]);

  if (explicit != null) return explicit;

  return taxRateBps(item) / 100;
}

function pricesIncludeTax(item: Record<string, unknown>) {
  return getBoolean(
    item.pricesIncludeTax ??
      asObject(item.sale).pricesIncludeTax,
    false,
  );
}

function showTaxOnCustomerDocuments(item: Record<string, unknown>) {
  return getBoolean(
    item.showTaxOnCustomerDocuments ??
      asObject(item.sale).showTaxOnCustomerDocuments,
    false,
  );
}

export function taxLabelForDocument(item: Partial<DocumentDetail>) {
  const mode = String(item.taxMode || "NONE").toUpperCase();
  const name = getText(item.taxName);

  if (name) return name;

  if (mode === "VAT_18") return "VAT 18% included";
  if (mode === "TURNOVER_3_INTERNAL") return "Turnover tax estimate 3% included";
  if (mode === "VAT_18_PLUS_TURNOVER_3") return "Tax 21% included";
  if (mode === "CUSTOM") return "Tax included";

  return "No tax shown";
}

function taxName(item: Record<string, unknown>) {
  const explicit = getText(
    item.taxName ||
      item.taxLabel ||
      getNestedText(item, ["sale", "taxName"]) ||
      getNestedText(item, ["sale", "taxLabel"]),
  );

  if (explicit) return explicit;

  return taxLabelForDocument({
    taxMode: taxMode(item),
  });
}

function taxSummaryLabel(item: Record<string, unknown>) {
  const explicit = getText(item.taxSummaryLabel || item.taxSummary);

  if (explicit) return explicit;

  const mode = taxMode(item);
  const displayMode = taxDisplayMode(item);
  const tax = taxAmount(item);

  if (mode === "NONE" || displayMode === "HIDDEN" || tax <= 0) {
    return "No tax shown on customer document";
  }

  return taxName(item);
}

function documentNote(type: DocumentType, item: Record<string, unknown>) {
  if (type === "receipts") {
    const balance = balanceDue(item);
    return balance > 0 ? `Balance remaining: ${balance.toLocaleString()} RWF` : "Payment proof";
  }

  if (type === "delivery-notes") {
    return "Goods handover proof";
  }

  if (type === "warranties") {
    return "After-sale support record";
  }

  if (type === "invoices") {
    return "Customer billing record";
  }

  return "Customer quotation";
}

function rawItems(item: Record<string, unknown>) {
  if (Array.isArray(item.items)) return item.items;
  if (Array.isArray(item.saleItems)) return item.saleItems;
  if (Array.isArray(item.lines)) return item.lines;
  if (Array.isArray(item.DeliveryNoteItem)) return item.DeliveryNoteItem;
  if (Array.isArray(item.ProformaItem)) return item.ProformaItem;
  if (Array.isArray(item.InvoiceItem)) return item.InvoiceItem;
  if (Array.isArray(item.WarrantyItem)) return item.WarrantyItem;

  return [];
}

function normalizeLineItem(raw: unknown, index: number): DocumentLineItem {
  const item = asObject(raw);
  const product = asObject(item.product);

  const quantity = getPrimitive(item.quantity ?? item.qty, 1);
  const qty = getPrimitive(item.qty ?? item.quantity, 1);
  const unitPrice = getPrimitive(item.unitPrice ?? item.price, 0);
  const price = getPrimitive(item.price ?? item.unitPrice, 0);
  const total = getPrimitive(item.total ?? item.totalAmount ?? item.lineTotal, 0);
  const totalAmountValue = getPrimitive(
    item.totalAmount ?? item.total ?? item.lineTotal,
    0,
  );
  const lineTotal = getPrimitive(
    item.lineTotal ?? item.total ?? item.totalAmount,
    0,
  );

  return {
    id: getText(item.id, `item-${index}`),
    name: getText(item.name || item.productName || product.name, "Item"),
    productName: getText(item.productName || product.name || item.name, "Item"),
    description: getText(item.description),
    serial: getText(item.serial || item.serialNumber || item.imei),
    serialNumber: getText(item.serialNumber || product.serialNumber),
    imei: getText(item.imei || product.imei),
    quantity,
    qty,
    unitPrice,
    price,
    total,
    totalAmount: totalAmountValue,
    lineTotal,
    raw,
  };
}

export function normalizeDocuments(
  type: DocumentType,
  response?: DocumentListResponse,
): DocumentRecord[] {
  return safeArray(response, type)
    .map((raw) => {
      const item = asObject(raw);
      const id = getText(item.id);

      if (!id) return null;

      return {
        id,
        type,
        number: documentNumber(type, item),
        customerName: customerName(item),
        customerPhone: customerPhone(item),
        status: documentStatus(type, item) as DocumentStatus,
        amount: documentAmount(type, item),
        totalAmount: totalAmount(type, item),
        amountPaid: amountPaid(item),
        balanceDue: balanceDue(item),
        date: documentDate(item),
        note: documentNote(type, item),
        raw,
      };
    })
    .filter(Boolean) as DocumentRecord[];
}

export function normalizeDocumentDetail(
  type: DocumentType,
  response?: DocumentDetailResponse,
): DocumentDetail | null {
  const unwrapped = unwrapDetail(type, response);
  const item = asObject(unwrapped);
  const id = getText(item.id);

  if (!id) return null;

  const tenant = asObject(item.tenant || item.business);
  const branch = asObject(item.branch);
  const sale = asObject(item.sale);

  const normalizedSubtotal = subtotalAmount(item);
  const normalizedTaxable = taxableAmount(item);
  const normalizedTax = taxAmount(item);
  const normalizedTotal = totalAmount(type, item);
  const normalizedPaid = amountPaid(item);
  const normalizedBalance = balanceDue(item);

  return {
    id,
    type,
    number: documentNumber(type, item),
    customerName: customerName(item),
    customerPhone: customerPhone(item),
    customerAddress: getText(item.customerAddress || item.address),
    status: documentStatus(type, item) as DocumentStatus,
    amount: documentAmount(type, item),
    totalAmount: normalizedTotal,
    amountPaid: normalizedPaid,
    balanceDue: normalizedBalance,
    date: documentDate(item),
    note: documentNote(type, item),

    businessName: getText(tenant.name || branch.name),
    businessPhone: getText(tenant.phone || branch.phone),
    businessEmail: getText(tenant.email || branch.email),

    issuedBy: getText(item.issuedBy || item.createdByName || item.staffName),
    deliveredBy: getText(item.deliveredBy),
    receivedBy: getText(item.receivedBy),
    receivedByPhone: getText(item.receivedByPhone),

    dueDate: getText(item.dueDate || item.paymentDueDate),
    expiryDate: getText(item.expiryDate || item.endsAt),

    notes: getText(item.notes || item.note),

    subtotalAmount: normalizedSubtotal,
    taxableAmount: normalizedTaxable,
    taxAmount: normalizedTax,
    finalTotal: normalizedTotal,

    taxName: taxName(item),
    taxMode: taxMode(item),
    taxDisplayMode: taxDisplayMode(item),
    taxRateBps: taxRateBps(item),
    taxRatePercent: taxRatePercent(item),
    pricesIncludeTax: pricesIncludeTax(item),
    showTaxOnCustomerDocuments: showTaxOnCustomerDocuments(item),
    taxSummaryLabel: taxSummaryLabel(item),

    items: rawItems(item).map(normalizeLineItem),
    raw: {
      ...asObject(unwrapped),
      sale,
    },
  };
}

export function useDocumentsList(type: DocumentType, q?: string | null) {
  return useQuery({
    queryKey: documentKeys.list(type, q),
    queryFn: () =>
      listDocuments(type, {
        q,
        limit: 30,
      }),
    staleTime: 10_000,
    retry: 1,
  });
}

export function useDocumentDetail(type?: DocumentType | null, id?: string | null) {
  return useQuery({
    queryKey: documentKeys.detail(type, id),
    queryFn: () => getDocumentDetail(type as DocumentType, String(id)),
    enabled: Boolean(type && id),
    staleTime: 10_000,
    retry: 1,
  });
}