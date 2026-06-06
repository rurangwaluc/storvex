import type { TenantRole } from "../../types/auth";

export function normalizeRole(role?: string | null) {
  return String(role || "").trim().toUpperCase() as TenantRole;
}

export function roleLabel(role?: string | null) {
  const normalized = normalizeRole(role);

  if (normalized === "OWNER") return "Owner";
  if (normalized === "MANAGER") return "Manager";
  if (normalized === "CASHIER") return "Cashier";
  if (normalized === "SELLER") return "Seller";
  if (normalized === "STOREKEEPER") return "Storekeeper";
  if (normalized === "TECHNICIAN") return "Technician";

  return "Staff";
}

export function roleAccessLabel(role?: string | null) {
  const normalized = normalizeRole(role);

  if (normalized === "OWNER") return "Owner access";
  if (normalized === "MANAGER") return "Manager access";
  if (normalized === "CASHIER") return "Cashier access";
  if (normalized === "SELLER") return "Sales access";
  if (normalized === "STOREKEEPER") return "Stock access";
  if (normalized === "TECHNICIAN") return "Repair access";

  return "Business access";
}

export function canRoleAccess(
  role: string | null | undefined,
  allowedRoles: string[],
) {
  const normalized = normalizeRole(role);

  return allowedRoles.map(normalizeRole).includes(normalized);
}