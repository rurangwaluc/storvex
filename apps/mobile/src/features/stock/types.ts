export type StockSort = "newest" | "name" | "stock_low" | "stock_high";
export type StockFilter = "all" | "low" | "out";
export type StockAdjustmentType = "RESTOCK" | "LOSS" | "CORRECTION";
export type StockLossReason =
  | "STOLEN"
  | "DAMAGED"
  | "LOST"
  | "EXPIRED"
  | "INTERNAL_USE"
  | "COUNTING_ERROR"
  | "OTHER";

export type StockBranchScope = {
  mode?: "SINGLE_BRANCH" | "ALL_BRANCHES" | string | null;
  branchId?: string | null;
  allowedBranchIds?: string[];
};

export type StockProduct = {
  id: string;
  name: string;
  sku?: string | null;
  serial?: string | null;
  barcode?: string | null;
  category?: string | null;
  subcategory?: string | null;
  subcategoryOther?: string | null;
  brand?: string | null;
  minStockLevel?: number | string | null;
  costPrice?: number | string | null;
  sellPrice?: number | string | null;
  stockQty?: number | string | null;
  branchId?: string | null;
  branchStockQty?: number | string | null;
  branchReservedQty?: number | string | null;
  effectiveStockQty?: number | string | null;
  isActive?: boolean;
  createdAt?: string | null;
};

export type InventorySummary = {
  totalActiveProducts: number;
  totalStockUnits: number;
  outOfStockCount: number;
  lowStockCount: number;
  stockCostValue: number;
  stockSellValue: number;
};

export type InventorySummaryResponse = {
  summary?: Partial<InventorySummary> | null;
  branchScope?: StockBranchScope | null;
};

export type StockProductsResponse = {
  products?: StockProduct[];
  count?: number;
  nextCursor?: string | null;
  branchScope?: StockBranchScope | null;
};

export type CreateStockProductPayload = {
  name: string;
  sku?: string | null;
  serial?: string | null;
  barcode?: string | null;
  category?: string | null;
  subcategory?: string | null;
  subcategoryOther?: string | null;
  brand?: string | null;
  minStockLevel?: number | string | null;
  costPrice: number | string;
  sellPrice: number | string;
  stockQty: number | string;
};

export type UpdateStockProductPayload = Partial<Omit<CreateStockProductPayload, "stockQty">>;

export type StockAdjustmentPayload = {
  productId: string;
  type: StockAdjustmentType;
  quantity?: number | string | null;
  newStockQty?: number | string | null;
  lossReason?: StockLossReason | string | null;
  note?: string | null;
};

export type StockAdjustmentResponse = {
  message?: string;
  productId?: string;
  productName?: string;
  branchId?: string | null;
  branchCode?: string | null;
  beforeQty?: number;
  afterQty?: number;
  delta?: number;
  type?: StockAdjustmentType;
  adjustmentId?: string;
  lossReason?: string | null;
  globalAfterQty?: number | null;
};
