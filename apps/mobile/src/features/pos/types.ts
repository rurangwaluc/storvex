export type SaleType = "CASH" | "CREDIT";

export type SalePaymentMethod = "CASH" | "MOMO" | "CARD" | "BANK" | "OTHER";

export type PosProduct = {
  id: string;
  name: string;
  sku?: string | null;
  brand?: string | null;
  category?: string | null;
  serial?: string | null;
  sellPrice?: number | string | null;
  price?: number | string | null;
  effectiveStockQty?: number | string | null;
  branchStockQty?: number | string | null;
  stockQty?: number | string | null;
};

export type PosCustomer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tinNumber?: string | null;
  idNumber?: string | null;
  notes?: string | null;
};

export type PosCartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stockQty: number;
};

export type PosCustomerPayload = {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  tinNumber?: string | null;
  idNumber?: string | null;
  notes?: string | null;
};

export type CreateSaleItemPayload = {
  productId: string;
  quantity: number;
};

export type CreateSalePayload = {
  branchId?: string | null;
  saleType: SaleType;
  paymentMethod: SalePaymentMethod;
  paymentReference?: string | null;
  amountPaid?: number;
  dueDate?: string;
  customerId?: string;
  customer?: PosCustomerPayload;
  customerName?: string;
  customerPhone?: string;
  items: CreateSaleItemPayload[];
};

export type CreateSaleResponse = {
  message?: string;
  saleId?: string;
  sale?: {
    id: string;
    receiptNumber?: string | null;
    totalAmount?: number | string | null;
  };
};

export type PosQuickPicksResponse = {
  bestSellers?: PosProduct[];
  latest?: PosProduct[];
};

export type PosProductSearchResponse =
  | PosProduct[]
  | {
      products?: PosProduct[];
      items?: PosProduct[];
      data?: PosProduct[];
    };

export type PosCustomerListResponse =
  | PosCustomer[]
  | {
      customers?: PosCustomer[];
      items?: PosCustomer[];
      data?: PosCustomer[];
    };

export type CashDrawerStatus = {
  openSession?: {
    id?: string;
    openedAt?: string | null;
    openingCash?: number | string | null;
    openingAmount?: number | string | null;
    openingBalance?: number | string | null;
  } | null;
  settings?: {
    blockCashSales?: boolean | null;
  } | null;
  branch?: {
    id?: string;
    name?: string | null;
    code?: string | null;
  } | null;
};

export type SaleReceiptResponse = Record<string, unknown>;

export const SALE_TYPES = {
  CASH: "CASH",
  CREDIT: "CREDIT",
} as const;

export const SALE_PAYMENT_METHODS = {
  CASH: "CASH",
  MOMO: "MOMO",
  CARD: "CARD",
  BANK: "BANK",
  OTHER: "OTHER",
} as const;

export const PAYMENT_METHOD_OPTIONS: {
  value: SalePaymentMethod;
  label: string;
  helper: string;
  touchesCashDrawer: boolean;
}[] = [
  {
    value: "CASH",
    label: "Cash",
    helper: "Customer gives physical cash.",
    touchesCashDrawer: true,
  },
  {
    value: "MOMO",
    label: "MoMo",
    helper: "Customer pays by mobile money.",
    touchesCashDrawer: false,
  },
  {
    value: "CARD",
    label: "Card",
    helper: "Customer pays by card.",
    touchesCashDrawer: false,
  },
  {
    value: "BANK",
    label: "Bank",
    helper: "Customer pays by bank transfer or deposit.",
    touchesCashDrawer: false,
  },
  {
    value: "OTHER",
    label: "Other",
    helper: "Use for another non-cash payment.",
    touchesCashDrawer: false,
  },
];