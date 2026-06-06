export type PlatformRole =
  | "PLATFORM_OWNER"
  | "PLATFORM_ADMIN"
  | "PLATFORM_SUPPORT";

export type PlatformPermission =
  | "viewDashboard"
  | "viewTenants"
  | "viewSupport"
  | "viewAudit"
  | "viewBilling"
  | "viewPlatformUsers"
  | "managePlatformUsers"
  | "manageTenants"
  | "manageBilling"
  | "repairTenantOwner";

export type PlatformUserLike = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  isActive?: boolean;
};

export type PlatformNavKey =
  | "dashboard"
  | "tenants"
  | "support"
  | "activity"
  | "billing"
  | "users";

export type PlatformNavItem = {
  key: PlatformNavKey;
  label: string;
  href: string;
  description: string;
  permission: PlatformPermission;
};

const PLATFORM_ROLES: PlatformRole[] = [
  "PLATFORM_OWNER",
  "PLATFORM_ADMIN",
  "PLATFORM_SUPPORT",
];

const ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  PLATFORM_OWNER: [
    "viewDashboard",
    "viewTenants",
    "viewSupport",
    "viewAudit",
    "viewBilling",
    "viewPlatformUsers",
    "managePlatformUsers",
    "manageTenants",
    "manageBilling",
    "repairTenantOwner",
  ],

  PLATFORM_ADMIN: [
    "viewDashboard",
    "viewTenants",
    "viewSupport",
    "viewAudit",
    "viewBilling",
    "viewPlatformUsers",
    "manageTenants",
    "manageBilling",
  ],

  PLATFORM_SUPPORT: ["viewDashboard", "viewTenants", "viewSupport", "viewAudit"],
};

const PLATFORM_NAV_ITEMS: PlatformNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    description: "Business health and support risk.",
    permission: "viewDashboard",
  },
  {
    key: "tenants",
    label: "Businesses",
    href: "/tenants",
    description: "Stores using Storvex.",
    permission: "viewTenants",
  },
  {
    key: "support",
    label: "Support",
    href: "/support",
    description: "Issues that need attention.",
    permission: "viewSupport",
  },
  {
    key: "activity",
    label: "Activity",
    href: "/activity",
    description: "Business activity trail.",
    permission: "viewAudit",
  },
  {
    key: "billing",
    label: "Billing",
    href: "/billing",
    description: "Subscriptions and payments.",
    permission: "viewBilling",
  },
  {
    key: "users",
    label: "Platform users",
    href: "/users",
    description: "Internal platform team.",
    permission: "viewPlatformUsers",
  },
];

export function normalizePlatformRole(role: unknown): PlatformRole | null {
  const value = String(role || "").trim().toUpperCase();

  if (PLATFORM_ROLES.includes(value as PlatformRole)) {
    return value as PlatformRole;
  }

  return null;
}

export function getPlatformUserRole(
  user: PlatformUserLike | null | undefined
): PlatformRole | null {
  return normalizePlatformRole(user?.role);
}

export function isPlatformOwner(user: PlatformUserLike | null | undefined) {
  return getPlatformUserRole(user) === "PLATFORM_OWNER";
}

export function isPlatformAdmin(user: PlatformUserLike | null | undefined) {
  return getPlatformUserRole(user) === "PLATFORM_ADMIN";
}

export function isPlatformSupport(user: PlatformUserLike | null | undefined) {
  return getPlatformUserRole(user) === "PLATFORM_SUPPORT";
}

export function getPlatformRoleLabel(
  userOrRole: PlatformUserLike | PlatformRole | string | null | undefined
) {
  const role =
    typeof userOrRole === "string"
      ? normalizePlatformRole(userOrRole)
      : getPlatformUserRole(userOrRole);

  if (role === "PLATFORM_OWNER") return "Owner";
  if (role === "PLATFORM_ADMIN") return "Admin";
  if (role === "PLATFORM_SUPPORT") return "Support";

  return "Platform user";
}

export function canPlatformUser(
  user: PlatformUserLike | null | undefined,
  permission: PlatformPermission
) {
  const role = getPlatformUserRole(user);

  if (!role) return false;

  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canViewDashboard(user: PlatformUserLike | null | undefined) {
  return canPlatformUser(user, "viewDashboard");
}

export function canViewTenants(user: PlatformUserLike | null | undefined) {
  return canPlatformUser(user, "viewTenants");
}

export function canViewSupport(user: PlatformUserLike | null | undefined) {
  return canPlatformUser(user, "viewSupport");
}

export function canViewAudit(user: PlatformUserLike | null | undefined) {
  return canPlatformUser(user, "viewAudit");
}

export function canViewBilling(user: PlatformUserLike | null | undefined) {
  return canPlatformUser(user, "viewBilling");
}

export function canViewPlatformUsers(
  user: PlatformUserLike | null | undefined
) {
  return canPlatformUser(user, "viewPlatformUsers");
}

export function canManagePlatformUsers(
  user: PlatformUserLike | null | undefined
) {
  return canPlatformUser(user, "managePlatformUsers");
}

export function canManageTenants(user: PlatformUserLike | null | undefined) {
  return canPlatformUser(user, "manageTenants");
}

export function canManageBilling(user: PlatformUserLike | null | undefined) {
  return canPlatformUser(user, "manageBilling");
}

export function canRepairTenantOwner(
  user: PlatformUserLike | null | undefined
) {
  return canPlatformUser(user, "repairTenantOwner");
}

export function getVisiblePlatformNavItems(
  user: PlatformUserLike | null | undefined
) {
  return PLATFORM_NAV_ITEMS.filter((item) =>
    canPlatformUser(user, item.permission)
  );
}