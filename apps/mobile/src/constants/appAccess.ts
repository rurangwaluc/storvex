import { routes } from "./routes";

export type StaffRole =
  | "OWNER"
  | "MANAGER"
  | "CASHIER"
  | "SELLER"
  | "STOREKEEPER"
  | "TECHNICIAN";

export type AppArea =
  | "dashboard"
  | "sales"
  | "pos"
  | "cashDrawer"
  | "stock"
  | "inventory"
  | "people"
  | "customers"
  | "documents"
  | "repairs"
  | "reports"
  | "expenses"
  | "suppliers"
  | "support"
  | "settings"
  | "interstore"
  | "whatsapp"
  | "more";

const OWNER_AREAS: AppArea[] = [
  "dashboard",
  "sales",
  "pos",
  "cashDrawer",
  "stock",
  "inventory",
  "people",
  "customers",
  "documents",
  "repairs",
  "reports",
  "expenses",
  "suppliers",
  "support",
  "settings",
  "interstore",
  "whatsapp",
  "more",
];

const ROLE_AREAS: Record<StaffRole, AppArea[]> = {
  OWNER: OWNER_AREAS,

  MANAGER: [
    "dashboard",
    "sales",
    "pos",
    "cashDrawer",
    "stock",
    "inventory",
    "people",
    "customers",
    "documents",
    "repairs",
    "reports",
    "expenses",
    "suppliers",
    "support",
    "interstore",
    "whatsapp",
    "more",
  ],

  CASHIER: [
    "dashboard",
    "sales",
    "pos",
    "cashDrawer",
    "people",
    "customers",
    "documents",
    "repairs",
    "support",
    "whatsapp",
    "more",
  ],

  SELLER: [
    "dashboard",
    "sales",
    "pos",
    "people",
    "customers",
    "documents",
    "support",
    "whatsapp",
    "more",
  ],

  STOREKEEPER: [
    "dashboard",
    "stock",
    "inventory",
    "suppliers",
    "support",
    "interstore",
    "more",
  ],

  TECHNICIAN: [
    "dashboard",
    "people",
    "customers",
    "repairs",
    "support",
    "whatsapp",
    "more",
  ],
};

const ROUTE_AREA_MAP: Array<[string, AppArea]> = [
  [routes.dashboard, "dashboard"],
  [routes.sales, "sales"],
  [routes.salesList, "sales"],
  [routes.salesCredit, "sales"],
  [routes.pos, "pos"],
  [routes.cashDrawer, "cashDrawer"],
  [routes.stock, "stock"],
  [routes.inventory, "inventory"],
  [routes.people, "people"],
  [routes.customers, "customers"],
  [routes.documents, "documents"],
  [routes.repairs, "repairs"],
  [routes.reports, "reports"],
  [routes.expenses, "expenses"],
  [routes.suppliers, "suppliers"],
  [routes.support, "support"],
  [routes.settings, "settings"],
  [routes.settingsBusiness, "settings"],
  [routes.settingsDocuments, "settings"],
  [routes.settingsTaxDisplay, "settings"],
  [routes.settingsLocations, "settings"],
  [routes.settingsSecurity, "settings"],
  [routes.settingsAccess, "settings"],
  [routes.interstore, "interstore"],
  [routes.whatsapp, "whatsapp"],
  [routes.whatsappBroadcasts, "whatsapp"],
  [routes.whatsappPromotions, "whatsapp"],
  [routes.more, "more"],
];

export function normalizeStaffRole(role?: string | null): StaffRole | "UNKNOWN" {
  const normalized = String(role || "").trim().toUpperCase();

  if (
    normalized === "OWNER" ||
    normalized === "MANAGER" ||
    normalized === "CASHIER" ||
    normalized === "SELLER" ||
    normalized === "STOREKEEPER" ||
    normalized === "TECHNICIAN"
  ) {
    return normalized;
  }

  return "UNKNOWN";
}

export function roleLabel(role?: string | null) {
  const normalized = normalizeStaffRole(role);

  if (normalized === "OWNER") return "Owner";
  if (normalized === "MANAGER") return "Manager";
  if (normalized === "CASHIER") return "Cashier";
  if (normalized === "SELLER") return "Seller";
  if (normalized === "STOREKEEPER") return "Storekeeper";
  if (normalized === "TECHNICIAN") return "Technician";

  return "Staff";
}

export function getAllowedAreasForRole(role?: string | null): AppArea[] {
  const normalized = normalizeStaffRole(role);

  if (normalized === "UNKNOWN") return ["dashboard", "support"];

  return ROLE_AREAS[normalized];
}

export function roleCanAccessArea(role: string | null | undefined, area: AppArea) {
  return getAllowedAreasForRole(role).includes(area);
}

function stripRouteGroups(value: string) {
  return value.replace(/\/\([^/]+\)/g, "").replace(/\/+/g, "/") || "/";
}

function normalizePath(value?: string | null) {
  const clean = stripRouteGroups(String(value || "").split("?")[0] || "/");
  return clean.endsWith("/") && clean !== "/" ? clean.slice(0, -1) : clean;
}

export function getAreaForPath(pathname?: string | null): AppArea | null {
  const current = normalizePath(pathname);

  const direct = ROUTE_AREA_MAP.find(([href]) => normalizePath(href) === current);
  if (direct) return direct[1];

  const nested = ROUTE_AREA_MAP
    .map(([href, area]) => [normalizePath(href), area] as const)
    .filter(([href]) => href !== "/")
    .sort((a, b) => b[0].length - a[0].length)
    .find(([href]) => current.startsWith(`${href}/`));

  return nested?.[1] || null;
}

export function roleCanAccessPath(role: string | null | undefined, pathname?: string | null) {
  const area = getAreaForPath(pathname);

  if (!area) return true;

  return roleCanAccessArea(role, area);
}

export function getFallbackPathForRole(role?: string | null) {
  if (roleCanAccessArea(role, "dashboard")) return routes.dashboard;
  return routes.support;
}
