export type InterStoreDealStatus = "BORROWED" | "RECEIVED" | "SOLD" | "PAID" | "RETURNED";
export type InterStoreSupplierFilter = "ALL" | "INTERNAL" | "EXTERNAL";
export type InterStoreScopeMode = "CURRENT" | "ALL";
export type InterStorePaymentMethod = "CASH" | "MOMO" | "BANK" | "OTHER";

export type InterStoreBranch = {
  id: string;
  tenantId?: string | null;
  name?: string | null;
  code?: string | null;
  type?: string | null;
  status?: string | null;
  phone?: string | null;
  email?: string | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;
  isMain?: boolean;
};

export type InterStoreBranchScope = {
  mode?: "ALL_BRANCHES" | "SINGLE_BRANCH" | string | null;
  branchId?: string | null;
  allowedBranchIds?: string[];
  canViewAllBranches?: boolean;
};

export type InterStoreDeal = {
  id: string;
  supplierTenantId?: string | null;
  borrowerTenantId?: string | null;
  borrowerBranchId?: string | null;
  branchId?: string | null;
  branch?: InterStoreBranch | null;
  borrowerBranch?: InterStoreBranch | null;
  productId?: string | null;
  receivedProductId?: string | null;
  productName?: string | null;
  productCategory?: string | null;
  productColor?: string | null;
  serial?: string | null;
  quantity?: number | string | null;
  soldQuantity?: number | string | null;
  returnedQuantity?: number | string | null;
  agreedPrice?: number | string | null;
  soldPrice?: number | string | null;
  paidAmount?: number | string | null;
  paymentMethod?: InterStorePaymentMethod | string | null;
  status?: InterStoreDealStatus | string | null;
  externalSupplierName?: string | null;
  externalSupplierPhone?: string | null;
  resellerName?: string | null;
  resellerPhone?: string | null;
  resellerStore?: string | null;
  resellerWorkplace?: string | null;
  resellerDistrict?: string | null;
  resellerSector?: string | null;
  resellerAddress?: string | null;
  resellerNationalId?: string | null;
  notes?: string | null;
  dueDate?: string | null;
  takenAt?: string | null;
  borrowedAt?: string | null;
  receivedAt?: string | null;
  soldAt?: string | null;
  returnedAt?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type InterStoreDealsResponse = {
  ok?: boolean;
  deals?: InterStoreDeal[];
  count?: number;
  branchScope?: InterStoreBranchScope | null;
  raw?: unknown;
};

export type InterStoreDealResponse = {
  ok?: boolean;
  message?: string;
  deal?: InterStoreDeal | null;
};

export type InterStorePayment = {
  id: string;
  dealId?: string | null;
  amount?: number | string | null;
  method?: InterStorePaymentMethod | string | null;
  note?: string | null;
  createdAt?: string | null;
  recordedBy?: string | null;
};

export type InterStorePaymentSummary = {
  owed: number;
  totalPaid: number;
  balanceDue: number;
  count: number;
};

export type InterStorePaymentsResponse = {
  ok?: boolean;
  payments?: InterStorePayment[];
  count?: number;
  summary?: Partial<InterStorePaymentSummary> | null;
  raw?: unknown;
};

export type InterStoreSupplier = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type InterStoreSupplierProduct = {
  id: string;
  tenantId?: string | null;
  branchId?: string | null;
  branch?: InterStoreBranch | null;
  name?: string | null;
  serial?: string | null;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  category?: string | null;
  stockQty?: number | string | null;
  suggestedPrice?: number | string | null;
  sellPrice?: number | string | null;
  costPrice?: number | string | null;
};

export type InterStoreSuppliersResponse = {
  ok?: boolean;
  suppliers?: InterStoreSupplier[];
  count?: number;
};

export type InterStoreSupplierProductsResponse = {
  ok?: boolean;
  products?: InterStoreSupplierProduct[];
  count?: number;
};

export type InterStoreDealsParams = {
  branchId?: string | null;
  allBranches?: boolean;
};

export type CreateInterStoreDealPayload = {
  supplierTenantId?: string | null;
  externalSupplierName?: string | null;
  externalSupplierPhone?: string | null;
  resellerName: string;
  resellerPhone: string;
  resellerStore?: string | null;
  productId?: string | null;
  productName: string;
  productCategory?: string | null;
  productColor?: string | null;
  serial: string;
  quantity?: number;
  agreedPrice: string | number;
  dueDate?: string | null;
  takenAt?: string | null;
  notes?: string | null;
};

export type MarkInterStoreSoldPayload = {
  soldQuantity?: string | number;
  soldPrice?: string | number | null;
};

export type MarkInterStoreReturnedPayload = {
  returnedQuantity?: string | number;
};

export type AddInterStorePaymentPayload = {
  amount: string | number;
  method: InterStorePaymentMethod | string;
  note?: string | null;
};

export type MarkInterStorePaidPayload = {
  paidAmount: string | number;
  paymentMethod: InterStorePaymentMethod | string;
};
