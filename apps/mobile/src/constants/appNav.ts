import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import { routes } from "./routes";
import { type StaffRole, roleCanAccessArea, type AppArea } from "./appAccess";

export type AppNavRole = StaffRole;
export type AppNavIcon = ComponentProps<typeof Ionicons>["name"];

export type AppNavItem = {
  key: string;
  label: string;
  helper: string;
  href: string;
  icon: AppNavIcon;
  /**
   * The access area used by role protection.
   * Optional so older local More-page groups do not break TypeScript,
   * but every shared navigation item should still provide it.
   */
  area?: AppArea;
  roles?: AppNavRole[];
};

export type AppNavGroup = {
  section: string;
  items: AppNavItem[];
};

const ALL_ROLES: AppNavRole[] = [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "SELLER",
  "STOREKEEPER",
  "TECHNICIAN",
];

export const bottomNavItems: AppNavItem[] = [
  {
    key: "home",
    label: "Home",
    helper: "Business overview",
    href: routes.dashboard,
    icon: "grid-outline",
    area: "dashboard",
    roles: ALL_ROLES,
  },
  {
    key: "sales",
    label: "Sales",
    helper: "POS and checkout",
    href: routes.sales,
    icon: "receipt-outline",
    area: "sales",
    roles: ["OWNER", "MANAGER", "CASHIER", "SELLER"],
  },
  {
    key: "stock",
    label: "Stock",
    helper: "Inventory control",
    href: routes.stock,
    icon: "cube-outline",
    area: "stock",
    roles: ["OWNER", "MANAGER", "STOREKEEPER"],
  },
  {
    key: "people",
    label: "People",
    helper: "Customers and staff",
    href: routes.people,
    icon: "people-outline",
    area: "people",
    roles: ["OWNER", "MANAGER", "CASHIER", "SELLER", "TECHNICIAN"],
  },
  {
    key: "more",
    label: "More",
    helper: "Other tools",
    href: routes.more,
    icon: "menu-outline",
    area: "more",
    roles: ALL_ROLES,
  },
];

export const appNavGroups: AppNavGroup[] = [
  {
    section: "Core",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        helper: "Business overview",
        href: routes.dashboard,
        icon: "grid-outline",
        area: "dashboard",
        roles: ALL_ROLES,
      },
      {
        key: "pos",
        label: "POS",
        helper: "Sell items and create receipts",
        href: routes.sales,
        icon: "receipt-outline",
        area: "sales",
        roles: ["OWNER", "MANAGER", "CASHIER", "SELLER"],
      },
      {
        key: "cash-drawer",
        label: "Cash drawer",
        helper: "Cash control and daily money movement",
        href: routes.cashDrawer,
        icon: "wallet-outline",
        area: "cashDrawer",
        roles: ["OWNER", "MANAGER", "CASHIER"],
      },
      {
        key: "interstore",
        label: "Inter-store",
        helper: "Move stock between selling locations",
        href: routes.interstore,
        icon: "swap-horizontal-outline",
        area: "interstore",
        roles: ["OWNER", "MANAGER", "STOREKEEPER"],
      },
    ],
  },
  {
    section: "Stock",
    items: [
      {
        key: "inventory",
        label: "Inventory",
        helper: "Manage stock and item availability",
        href: routes.inventory,
        icon: "cube-outline",
        area: "inventory",
        roles: ["OWNER", "MANAGER", "STOREKEEPER"],
      },
      {
        key: "stock",
        label: "Stock overview",
        helper: "Current availability and stock value",
        href: routes.stock,
        icon: "layers-outline",
        area: "stock",
        roles: ["OWNER", "MANAGER", "STOREKEEPER"],
      },
      {
        key: "suppliers",
        label: "Suppliers",
        helper: "Supplier records and stock receiving",
        href: routes.suppliers,
        icon: "briefcase-outline",
        area: "suppliers",
        roles: ["OWNER", "MANAGER", "STOREKEEPER"],
      },
    ],
  },
  {
    section: "Customers",
    items: [
      {
        key: "customers",
        label: "Customers",
        helper: "Customer records and activity",
        href: routes.people,
        icon: "person-outline",
        area: "people",
        roles: ["OWNER", "MANAGER", "CASHIER", "SELLER", "TECHNICIAN"],
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        helper: "Customer conversations and follow-up",
        href: routes.whatsapp,
        icon: "logo-whatsapp",
        area: "whatsapp",
        roles: ["OWNER", "MANAGER", "CASHIER", "SELLER", "TECHNICIAN"],
      },
    ],
  },
  {
    section: "Operations",
    items: [
      {
        key: "documents",
        label: "Documents",
        helper: "Receipts, proofs, and business files",
        href: routes.documents,
        icon: "document-text-outline",
        area: "documents",
        roles: ["OWNER", "MANAGER", "CASHIER", "SELLER"],
      },
      {
        key: "repairs",
        label: "Repairs",
        helper: "Repair jobs and technician work",
        href: routes.repairs,
        icon: "construct-outline",
        area: "repairs",
        roles: ["OWNER", "MANAGER", "CASHIER", "TECHNICIAN"],
      },
      {
        key: "reports",
        label: "Reports",
        helper: "Business performance and activity",
        href: routes.reports,
        icon: "bar-chart-outline",
        area: "reports",
        roles: ["OWNER", "MANAGER"],
      },
      {
        key: "expenses",
        label: "Expenses",
        helper: "Track business spending",
        href: routes.expenses,
        icon: "wallet-outline",
        area: "expenses",
        roles: ["OWNER", "MANAGER"],
      },
      {
        key: "support",
        label: "Support",
        helper: "Get help when something is blocked",
        href: routes.support,
        icon: "headset-outline",
        area: "support",
        roles: ALL_ROLES,
      },
    ],
  },
  {
    section: "Control",
    items: [
      {
        key: "employees",
        label: "Employees",
        helper: "Add staff and set responsibilities",
        href: routes.people,
        icon: "people-circle-outline",
        area: "people",
        roles: ["OWNER", "MANAGER"],
      },
      {
        key: "settings",
        label: "Settings",
        helper: "Owner controls and business preferences",
        href: routes.settings,
        icon: "settings-outline",
        area: "settings",
        roles: ["OWNER"],
      },
    ],
  },
];

export function filterNavItemsByRole<T extends { area?: AppArea; roles?: string[] }>(
  items: T[],
  role?: string | null,
) {
  return items.filter((item) => {
    if (item.area) return roleCanAccessArea(role, item.area);

    const normalized = String(role || "").trim().toUpperCase();
    return item.roles?.map((r) => String(r).toUpperCase()).includes(normalized) ?? false;
  });
}

export function filterNavGroupsByRole(groups: AppNavGroup[], role?: string | null) {
  return groups
    .map((group) => ({
      ...group,
      items: filterNavItemsByRole(group.items, role),
    }))
    .filter((group) => group.items.length > 0);
}
