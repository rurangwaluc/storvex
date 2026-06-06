import { api } from "../../lib/api/client";
import type {
  CashDrawerMovementsResponse,
  CashDrawerSessionResponse,
  CashDrawerStatus,
  CloseCashDrawerPayload,
  OpenCashDrawerPayload,
} from "./types";

function normalizeAmount(value: number) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount);
}

export async function getCashDrawerStatus() {
  return api.get<CashDrawerStatus>("/cash-drawer/status");
}

export async function getCashDrawerMovements(limit = 20) {
  return api.get<CashDrawerMovementsResponse>(
    `/cash-drawer/movements?limit=${Math.min(Math.max(limit, 1), 50)}`,
  );
}

export async function openCashDrawer(payload: OpenCashDrawerPayload) {
  return api.post<CashDrawerSessionResponse>("/cash-drawer/open", {
    openingCash: normalizeAmount(payload.openingCash),
  });
}

export async function closeCashDrawer(payload: CloseCashDrawerPayload) {
  return api.post<CashDrawerSessionResponse>("/cash-drawer/close", {
    countedCash: normalizeAmount(payload.countedCash),
    note: String(payload.note || "").trim() || null,
  });
}