export type DocumentType =
  | "receipts"
  | "invoices"
  | "delivery-notes"
  | "proformas"
  | "warranties";

export type DocumentStatus =
  | "PAID"
  | "PARTIAL"
  | "PENDING"
  | "DRAFT"
  | "SENT"
  | "DELIVERED"
  | "ACTIVE"
  | "COMPLETED"
  | "CONVERTED"
  | "OVERDUE"
  | "EXPIRED"
  | "CANCELLED"
  | string;

export type DocumentTaxMode =
  | "NONE"
  | "VAT_18"
  | "TURNOVER_3_INTERNAL"
  | "VAT_18_PLUS_TURNOVER_3"
  | "CUSTOM"
  | string;

export type DocumentTaxDisplayMode =
  | "HIDDEN"
  | "CUSTOMER_FACING"
  | "INTERNAL_ONLY"
  | string;

export type DocumentRecord = {
  id: string;
  type: DocumentType;
  number: string;
  customerName: string;
  customerPhone?: string | null;
  status?: DocumentStatus | null;
  amount?: number | string | null;
  totalAmount?: number | string | null;
  amountPaid?: number | string | null;
  balanceDue?: number | string | null;
  date?: string | null;
  note?: string | null;
  raw?: unknown;
};

export type DocumentLineItem = {
  id?: string | null;
  name?: string | null;
  productName?: string | null;
  description?: string | null;
  serial?: string | null;
  serialNumber?: string | null;
  imei?: string | null;
  quantity?: number | string | null;
  qty?: number | string | null;
  unitPrice?: number | string | null;
  price?: number | string | null;
  total?: number | string | null;
  totalAmount?: number | string | null;
  lineTotal?: number | string | null;
  raw?: unknown;
};

export type DocumentTaxSnapshot = {
  taxName?: string | null;
  taxMode?: DocumentTaxMode | null;
  taxDisplayMode?: DocumentTaxDisplayMode | null;
  taxRateBps?: number | string | null;
  taxRatePercent?: number | string | null;
  taxAmount?: number | string | null;
  taxableAmount?: number | string | null;
  subtotalAmount?: number | string | null;
  pricesIncludeTax?: boolean | null;
  showTaxOnCustomerDocuments?: boolean | null;
  taxSummaryLabel?: string | null;
};

export type DocumentTotals = {
  subtotalAmount?: number | string | null;
  taxableAmount?: number | string | null;
  taxAmount?: number | string | null;
  totalAmount?: number | string | null;
  amountPaid?: number | string | null;
  balanceDue?: number | string | null;
  finalTotal?: number | string | null;
};

export type DocumentDetail = DocumentRecord &
  DocumentTaxSnapshot &
  DocumentTotals & {
    businessName?: string | null;
    businessPhone?: string | null;
    businessEmail?: string | null;

    customerAddress?: string | null;

    issuedBy?: string | null;
    deliveredBy?: string | null;
    receivedBy?: string | null;
    receivedByPhone?: string | null;

    dueDate?: string | null;
    expiryDate?: string | null;

    notes?: string | null;
    items: DocumentLineItem[];
  };

export type DocumentListResponse =
  | DocumentRecord[]
  | {
      receipts?: unknown[];
      invoices?: unknown[];
      deliveryNotes?: unknown[];
      proformas?: unknown[];
      warranties?: unknown[];
      items?: unknown[];
      data?: unknown[];
      results?: unknown[];
    };

export type DocumentDetailResponse =
  | unknown
  | {
      receipt?: unknown;
      invoice?: unknown;
      deliveryNote?: unknown;
      proforma?: unknown;
      warranty?: unknown;
      document?: unknown;
      data?: unknown;
    };

export type DocumentSection = {
  type: DocumentType;
  title: string;
  label: string;
  helper: string;
  badge: string;
  icon: string;
  canCreate: boolean;
};