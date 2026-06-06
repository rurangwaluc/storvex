export type SupplierIdType = "NATIONAL_ID" | "PASSPORT" | "OTHER" | string;

export type SupplierSourceType =
  | "BOUGHT"
  | "GIFT"
  | "TRADE_IN"
  | "CONSIGNMENT"
  | "OTHER"
  | string;

export type SupplierPerson = {
  id?: string | null;
  name?: string | null;
  role?: string | null;
};

export type SupplierStoreLocation = {
  id?: string | null;
  name?: string | null;
  code?: string | null;
  isMain?: boolean | null;
};

export type SupplierRecord = {
  id: string;
  name: string;
  idType?: SupplierIdType | null;
  idNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  companyName?: string | null;
  taxId?: string | null;
  sourceType?: SupplierSourceType | null;
  sourceDetails?: string | null;
  isActive?: boolean | null;
  verifiedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: SupplierPerson | null;
};

export type SupplierSupplyItem = {
  id?: string | null;
  productId?: string | null;
  productName?: string | null;
  category?: string | null;
  subcategory?: string | null;
  subcategoryOther?: string | null;
  brand?: string | null;
  serial?: string | null;
  quantity?: number | string | null;
  buyPrice?: number | string | null;
  sellPrice?: number | string | null;
  notes?: string | null;
};

export type SupplierSupplyRecord = {
  id: string;
  supplierId?: string | null;
  sourceType?: SupplierSourceType | null;
  sourceDetails?: string | null;
  documentRef?: string | null;
  notes?: string | null;
  totalCost?: number | string | null;
  totalSell?: number | string | null;
  itemsCount?: number | string | null;
  createdAt?: string | null;
  branch?: SupplierStoreLocation | null;
  storeLocation?: SupplierStoreLocation | null;
  items?: SupplierSupplyItem[] | null;
  SupplierSupplyItem?: SupplierSupplyItem[] | null;
};

export type SuppliersResponse = {
  suppliers?: SupplierRecord[];
  count?: number;
};

export type SupplierSuppliesResponse = {
  supplies?: SupplierSupplyRecord[];
  count?: number;
};

export type SupplierPayload = {
  name: string;
  idType: SupplierIdType;
  idNumber: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  companyName?: string | null;
  taxId?: string | null;
  sourceType?: SupplierSourceType | null;
  sourceDetails?: string | null;
};

export type SupplierSupplyPayloadItem = {
  productId?: string | null;
  productName: string;
  category?: string | null;
  subcategory?: string | null;
  subcategoryOther?: string | null;
  brand?: string | null;
  serial?: string | null;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  notes?: string | null;
};

export type SupplierSupplyPayload = {
  sourceType: SupplierSourceType;
  sourceDetails?: string | null;
  documentRef?: string | null;
  notes?: string | null;
  alsoUpdateStock: boolean;
  items: SupplierSupplyPayloadItem[];
};
