import type { TenantRole } from "../types/auth";

export const TENANT_ROLES = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  SELLER: "SELLER",
  STOREKEEPER: "STOREKEEPER",
  TECHNICIAN: "TECHNICIAN",
} as const satisfies Record<TenantRole, TenantRole>;

export const OWNER_ONLY_ROLES: TenantRole[] = ["OWNER"];

export const DAILY_OPERATOR_ROLES: TenantRole[] = [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "SELLER",
  "STOREKEEPER",
  "TECHNICIAN",
];

export const POS_ROLES: TenantRole[] = ["OWNER", "MANAGER", "CASHIER", "SELLER"];

export const INVENTORY_ROLES: TenantRole[] = [
  "OWNER",
  "MANAGER",
  "STOREKEEPER",
];

export const REPAIR_ROLES: TenantRole[] = ["OWNER", "MANAGER", "TECHNICIAN"];