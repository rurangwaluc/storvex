export type SalesPaymentMethod = "CASH" | "MOMO" | "CARD" | "BANK" | "OTHER";
export type SalesSaleType = "CASH" | "CREDIT";

export type SaleListItem = {
  id: string;
  receiptNumber?: string | null;
  saleNumber?: string | null;
  reference?: string | null;

  customerName?: string | null;
  customerPhone?: string | null;
  customer?: {
    id?: string | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;

  totalAmount?: number | string | null;
  total?: number | string | null;
  amount?: number | string | null;
  grandTotal?: number | string | null;
  finalTotal?: number | string | null;
  saleTotal?: number | string | null;
  netTotal?: number | string | null;

  amountPaid?: number | string | null;
  paidAmount?: number | string | null;
  balanceDue?: number | string | null;
  remainingBalance?: number | string | null;

  paymentMethod?: SalesPaymentMethod | string | null;
  saleType?: SalesSaleType | string | null;
  status?: string | null;
  paymentStatus?: string | null;

  dueDate?: string | null;
  paymentDueDate?: string | null;

  createdAt?: string | null;
  soldAt?: string | null;
  date?: string | null;

  items?: SaleReceiptItem[];
  payments?: SaleReceiptPayment[];
};

export type SaleReceiptItem = {
  id?: string | null;
  productId?: string | null;
  name?: string | null;
  productName?: string | null;
  sku?: string | null;
  serialNumber?: string | null;
  imei?: string | null;
  quantity?: number | string | null;
  qty?: number | string | null;
  unitPrice?: number | string | null;
  price?: number | string | null;
  total?: number | string | null;
  totalAmount?: number | string | null;
  lineTotal?: number | string | null;
  product?: {
    name?: string | null;
    sku?: string | null;
    serialNumber?: string | null;
    imei?: string | null;
  } | null;
};

export type SaleReceiptPayment = {
  id?: string | null;
  method?: string | null;
  paymentMethod?: string | null;
  amount?: number | string | null;
  reference?: string | null;
  note?: string | null;
  createdAt?: string | null;
  paidAt?: string | null;
};

export type SaleReceiptResponse = {
  id?: string | null;
  receiptNumber?: string | null;
  saleNumber?: string | null;
  reference?: string | null;

  sale?: SaleListItem | null;
  items?: SaleReceiptItem[];
  saleItems?: SaleReceiptItem[];
  payments?: SaleReceiptPayment[];

  tenant?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;

  business?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;

  branch?: {
    name?: string | null;
  } | null;
};

export type SalesListResponse =
  | SaleListItem[]
  | {
      sales?: SaleListItem[];
      items?: SaleListItem[];
      data?: SaleListItem[];
      results?: SaleListItem[];
      nextCursor?: string | null;
      cursor?: string | null;
      total?: number;
    };

export type CreditSalesResponse =
  | SaleListItem[]
  | {
      sales?: SaleListItem[];
      items?: SaleListItem[];
      data?: SaleListItem[];
      results?: SaleListItem[];
      total?: number;
    };

export type DashboardSalesSummary = {
  todayTotal: number;
  todayCount: number;
  latestSale?: SaleListItem | null;
};

export type AddSalePaymentPayload = {
  saleId: string;
  branchId?: string | null;
  amount: number;
  paymentMethod: SalesPaymentMethod;
  paymentReference?: string | null;
  note?: string | null;
};

export type AddSalePaymentResponse = {
  ok?: boolean;
  sale?: SaleListItem;
  payment?: SaleReceiptPayment;
  receipt?: SaleReceiptResponse;
};