export type CashDrawerSession = {
  id: string;
  tenantId?: string;
  branchId?: string;
  openedAt?: string | null;
  openedBy?: string | null;
  openingCash?: string | number | null;
  closedAt?: string | null;
  closedBy?: string | null;
  countedCash?: string | number | null;
  closeNote?: string | null;
  createdAt?: string | null;
};

export type CashDrawerMovement = {
  id: string;
  tenantId?: string;
  branchId?: string;
  sessionId?: string;
  type: "IN" | "OUT";
  reason?: string | null;
  amount: string | number;
  note?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
};

export type CashDrawerStatus = {
  branch?: {
    id: string;
    tenantId?: string;
    name?: string | null;
    code?: string | null;
    type?: string | null;
    status?: string | null;
    isMain?: boolean;
  } | null;
  settings?: {
    blockCashSales?: boolean | null;
  } | null;
  openSession?: CashDrawerSession | null;
};

export type CashDrawerMovementsResponse = {
  branchId?: string | null;
  sessionId?: string | null;
  movements?: CashDrawerMovement[];
};

export type OpenCashDrawerPayload = {
  openingCash: number;
};

export type CloseCashDrawerPayload = {
  countedCash: number;
  note?: string | null;
};

export type CashDrawerSessionResponse = {
  session: CashDrawerSession;
};