import { Link, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, clearActiveBranchId } from "../../services/apiClient";
import "./AppSidebar.css";

const LOGO_FOR_LIGHT_THEME_SRC = "/storvex-header-tricolor.png";
const LOGO_FOR_DARK_THEME_SRC = "/storvex-header-tricolor.png";
const LOGO_ICON_SRC = "/storvex-menu-tricolor-v319.png";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function normalizeCompare(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[#,|,]/g, " ")
    .replace(/\s+/g, " ");
}

function getThemeLogoSrc() {
  if (typeof document === "undefined") return LOGO_FOR_LIGHT_THEME_SRC;

  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "dark" ? LOGO_FOR_DARK_THEME_SRC : LOGO_FOR_LIGHT_THEME_SRC;
}

function useThemeLogoSrc() {
  const [logoSrc, setLogoSrc] = useState(() => getThemeLogoSrc());

  useEffect(() => {
    const root = document.documentElement;

    function syncLogo() {
      setLogoSrc(getThemeLogoSrc());
    }

    syncLogo();

    const observer = new MutationObserver(syncLogo);

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("storage", syncLogo);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", syncLogo);
    };
  }, []);

  return logoSrc;
}

function getDecodedRoles(token) {
  if (!token) return [];

  try {
    const decoded = jwtDecode(token);

    if (decoded?.role) return [normalizeRole(decoded.role)];

    if (Array.isArray(decoded?.roles)) {
      return decoded.roles.map(normalizeRole).filter(Boolean);
    }

    return [];
  } catch {
    return [];
  }
}

function roleLabel(role) {
  const r = normalizeRole(role);

  if (r === "OWNER") return "Owner";
  if (r === "MANAGER") return "Manager";
  if (r === "CASHIER") return "Cashier";
  if (r === "SELLER") return "Seller";
  if (r === "STOREKEEPER") return "Storekeeper";
  if (r === "TECHNICIAN") return "Technician";

  return "Staff";
}

function Icon({ type }) {
  const common = "h-[18px] w-[18px]";

  switch (type) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" />
        </svg>
      );

    case "pos":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <rect x="4" y="3" width="16" height="18" rx="3" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      );

    case "inventory":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M21 8.5 12 3 3 8.5l9 5.5 9-5.5Z" strokeLinejoin="round" />
          <path d="M3 8.5v7L12 21l9-5.5v-7" strokeLinejoin="round" />
          <path d="M12 14v7" />
        </svg>
      );

    case "reorder":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M7 7h11l-3-3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 17H6l3 3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 11h8M8 14h5" strokeLinecap="round" />
        </svg>
      );

    case "stock-history":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7" strokeLinecap="round" />
          <path d="M4 4v4.7h4.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "customers":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <circle cx="9" cy="8" r="3" />
          <path d="M4 18a5 5 0 0 1 10 0" />
          <path d="M17 11a2.5 2.5 0 1 0 0-5M19.5 18a4 4 0 0 0-3.5-3.96" />
        </svg>
      );

    case "suppliers":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M4 10h16v9H4z" />
          <path d="M7 10V7h10v3" />
        </svg>
      );

    case "repairs":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M14 7l3-3 3 3-3 3zM3 21l7-7" />
          <path d="m11 13-4-4 2-2 4 4" />
        </svg>
      );

    case "documents":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M7 3h7l5 5v13H7z" />
          <path d="M14 3v5h5" />
        </svg>
      );

    case "transfer":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M7 7h11l-3-3M17 17H6l3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "marketplace":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M4 9h16l-1.5-5h-13L4 9Z" strokeLinejoin="round" />
          <path d="M5 9v11h14V9" />
          <path d="M9 20v-6h6v6" />
          <path d="M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0" strokeLinecap="round" />
        </svg>
      );

    case "reports":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M5 19V9M12 19V5M19 19v-8" strokeLinecap="round" />
        </svg>
      );

    case "money":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <rect x="3" y="6" width="18" height="12" rx="2.5" />
          <path d="M7 10h10M7 14h5" strokeLinecap="round" />
          <path d="M16 14h1.5" strokeLinecap="round" />
        </svg>
      );

    case "expenses":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <rect x="3" y="6" width="18" height="12" rx="2.5" />
          <path d="M7 12h4M15 12h2M12 9v6" strokeLinecap="round" />
        </svg>
      );

    case "settings":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.8a2 2 0 1 1 0-4H2.9a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.8a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.1.4 1.7 1.7 0 0 0-.6 1Z" />
        </svg>
      );

    case "billing":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M3 10h18M7 15h4" strokeLinecap="round" />
        </svg>
      );

 

    case "employees":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <circle cx="8" cy="8" r="3" />
          <path d="M3.5 19a4.5 4.5 0 0 1 9 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M14.5 19a3.7 3.7 0 0 1 6.8-2" />
        </svg>
      );

    case "collapse-left":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "collapse-right":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "close":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      );

    case "logout":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );

      case "support":
        return (
          <svg
            viewBox="0 0 24 24"
            className={common}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
          >
            <path d="M4 12a8 8 0 0 1 16 0v4a3 3 0 0 1-3 3h-2" />
            <path d="M7 13v-2a5 5 0 0 1 10 0v2" />
            <path d="M7 13h2v5H7a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2Z" />
            <path d="M17 13h-2v5h2a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2Z" />
            <path d="M13 19h2" strokeLinecap="round" />
          </svg>
        );

    default:
      return null;
  }
}

const WHATSAPP_ROLES = ["OWNER", "MANAGER", "CASHIER", "SELLER", "STOREKEEPER", "TECHNICIAN"];

const NAV_ITEMS = [
  {
    section: "Overview",
    items: [
      {
        to: "/app",
        label: "Dashboard",
        icon: "dashboard",
        roles: ["OWNER", "MANAGER", "CASHIER", "SELLER", "STOREKEEPER", "TECHNICIAN"],
        end: true,
      },
    ],
  },
  {
    section: "Sales",
    items: [
      {
        to: "/app/pos",
        label: "Sales",
        icon: "pos",
        roles: ["OWNER", "MANAGER", "CASHIER", "SELLER"],
      },
      {
        to: "/app/interstore",
        label: "Store transfers",
        icon: "transfer",
        roles: ["OWNER", "MANAGER", "CASHIER"],
      },
    ],
  },
  {
    section: "Stock",
    items: [
      {
        to: "/app/inventory",
        label: "Products",
        icon: "inventory",
        roles: ["OWNER", "MANAGER", "STOREKEEPER"],
      },
      {
        to: "/app/inventory/reorder",
        label: "Restock",
        icon: "reorder",
        roles: ["OWNER", "MANAGER", "STOREKEEPER"],
      },
      {
        to: "/app/suppliers",
        label: "Suppliers",
        icon: "suppliers",
        roles: ["OWNER", "MANAGER", "STOREKEEPER"],
      },
    ],
  },
  {
    section: "Customers",
    items: [
      {
        to: "/app/customers",
        label: "Customers",
        icon: "customers",
        roles: ["OWNER", "MANAGER", "CASHIER", "SELLER", "TECHNICIAN"],
      },
      {
        to: "/app/whatsapp",
        label: "WhatsApp",
        icon: "whatsapp",
        roles: WHATSAPP_ROLES,
      },
    ],
  },
  {
    section: "Online",
    items: [
      {
        to: "/app/marketplace",
        label: "Marketplace",
        icon: "marketplace",
        roles: ["OWNER"],
      },
    ],
  },
  {
    section: "Business",
    items: [
      {
        to: "/app/documents",
        label: "Documents",
        icon: "documents",
        roles: ["OWNER", "MANAGER", "STOREKEEPER", "SELLER", "CASHIER", "TECHNICIAN"],
      },
      {
        to: "/app/repairs",
        label: "Repairs",
        icon: "repairs",
        roles: ["OWNER", "CASHIER", "TECHNICIAN"],
      },
      {
        to: "/app/reports",
        label: "Reports",
        icon: "reports",
        roles: ["OWNER", "MANAGER"],
      },
      {
        to: "/app/money",
        label: "Money",
        icon: "money",
        roles: ["OWNER", "MANAGER"],
      },
      {
        to: "/app/expenses",
        label: "Expenses",
        icon: "expenses",
        roles: ["OWNER"],
      },
    ],
  },
];

function isItemActive(pathname, to, end) {
  if (end) return pathname === to;

  if (to === "/app/whatsapp") {
    return pathname === to || pathname.startsWith("/app/whatsapp/");
  }

  if (to === "/app/inventory") {
    return pathname === to;
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}

function filterNavByRoles(groups, roles) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.some((role) => roles.includes(role))),
    }))
    .filter((group) => group.items.length > 0);
}

function readWorkspaceCache() {
  try {
    const raw =
      sessionStorage.getItem("storvex_me_cache_v2") ||
      localStorage.getItem("storvex_me_cache_v2");

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cleanString(value) {
  return String(value || "").trim();
}

function getWorkspaceName() {
  const workspace = readWorkspaceCache();

  return (
    cleanString(workspace?.tenant?.name) ||
    cleanString(localStorage.getItem("tenantName")) ||
    "Storvex"
  );
}

function getActiveBranch() {
  const workspace = readWorkspaceCache();

  return (
    workspace?.activeBranch ||
    workspace?.defaultBranch ||
    workspace?.mainBranch ||
    null
  );
}

function getActiveBranchLabel(workspaceName) {
  const activeBranch = getActiveBranch();

  const branchName =
    cleanString(activeBranch?.name) ||
    cleanString(localStorage.getItem("activeBranchName")) ||
    "";

  const normalizedWorkspaceName = normalizeCompare(workspaceName);
  const normalizedBranchName = normalizeCompare(branchName);

  if (!branchName) {
    return activeBranch?.isMain ? "Main selling location" : "Current selling location";
  }

  const branchAlreadyRepeatsStore =
    normalizedWorkspaceName &&
    normalizedBranchName &&
    (normalizedBranchName === normalizedWorkspaceName ||
      normalizedBranchName.includes(normalizedWorkspaceName));

  if (branchAlreadyRepeatsStore) {
    return activeBranch?.isMain ? "Main selling location" : "Current selling location";
  }

  return branchName;
}

function clearAuthStorage() {
  try {
    [
      "tenantToken",
      "token",
      "userRole",
      "tenantId",
      "userId",
      "tenantName",
      "userName",
      "userEmail",
      "activeBranchName",
      "activeBranchCode",
      "workspaceLocation",
      "storvex_me_cache_v2",
    ].forEach((key) => localStorage.removeItem(key));

    sessionStorage.removeItem("storvex_me_cache_v2");
    clearActiveBranchId();
  } catch {}
}

function LogoBlock({ collapsed, onClose, logoSrc }) {
  return (
    <Link to="/app" onClick={onClose} className={collapsed ? "svx-logo-link is-compact" : "svx-logo-link"} aria-label="Storvex dashboard">
      <img src={collapsed ? LOGO_ICON_SRC : logoSrc} alt="Storvex" draggable="false" />
    </Link>
  );
}

function WorkspaceCard({ collapsed, primaryRole }) {
  const workspaceName = getWorkspaceName();
  const branchLabel = getActiveBranchLabel(workspaceName);

  if (collapsed) {
    return (
      <div className="px-3 pb-3">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] shadow-[var(--shadow-soft)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <div className="relative overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Business workspace
            </div>

            <div className="mt-1 truncate text-[14px] font-black tracking-[-0.01em] text-[var(--color-text)]">
              {workspaceName}
            </div>

            <div className="mt-1 truncate text-[11px] font-semibold text-[var(--color-text-muted)]">
              {branchLabel}
            </div>
          </div>

          <div className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-text)]">
            Current
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] bg-[var(--color-surface-2)] px-3 py-2">
          <span className="text-[11px] font-bold text-[var(--color-text-muted)]">
            Access level
          </span>
          <span className="truncate text-[12px] font-black text-[var(--color-text)]">
            {roleLabel(primaryRole)}
          </span>
        </div>
      </div>
    </div>
  );
}

function GroupLabel({ label, collapsed }) {
  if (collapsed) {
    return (
      <div className="svx-nav-group-separator" title={label}>
        <div className="mx-auto h-px w-10 rounded-full bg-[var(--color-border)]" />
      </div>
    );
  }

  return (
    <div className="svx-nav-group-label">
      {label}
    </div>
  );
}

function NavItemButton({ item, active, collapsed, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "svx-nav-entry group relative flex w-full items-center gap-3 rounded-[20px] text-left transition duration-200",
        collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5",
        active
          ? "border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] text-[var(--color-text)] shadow-[var(--shadow-soft)]"
          : "border border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
      )}
      title={collapsed ? item.label : undefined}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[var(--color-primary)]" />
      ) : null}

      <span
        className={cn(
          "svx-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl transition",
          active
            ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-sm"
            : "bg-transparent text-current group-hover:bg-[var(--color-card)]"
        )}
      >
        <Icon type={item.icon} />
      </span>

      {!collapsed ? (
        <span className="min-w-0 flex flex-1 items-center gap-2 text-[14px] font-bold">
          <span className="svx-nav-label min-w-0 truncate">{item.label}</span>
          {item.badge ? (
            <span className="svx-sidebar-badge" aria-label={`${item.badge} support updates`}>
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}

export default function AppSidebar({
  collapsed = false,
  mobileOpen = false,
  onClose,
  onLogout,
  onToggleCollapse,
}) {
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const navigate = useNavigate();
  const [supportSummary, setSupportSummary] = useState(null);
  const supportBadgeCount = Number(supportSummary?.badgeCount || 0);
  const logoSrc = useThemeLogoSrc();
  useEffect(() => {
    const focusSearch = () => {
      const input = document.querySelector('.svx-sidebar .svx-nav-search input');
      input?.focus();
    };
    window.addEventListener('storvex:focus-nav-search', focusSearch);
    return () => window.removeEventListener('storvex:focus-nav-search', focusSearch);
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadSupportSummary() {
      try {
        const summary = await apiFetch("/support/tickets/summary");
        if (alive) setSupportSummary(summary);
      } catch {
        if (alive) setSupportSummary(null);
      }
    }

    loadSupportSummary();

    const interval = window.setInterval(loadSupportSummary, 60000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, []);



  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("tenantToken") || localStorage.getItem("token")
      : null;

  const roles = useMemo(() => getDecodedRoles(token), [token]);
  const primaryRole = roles[0] || null;
  const filteredNav = useMemo(() => {
    return filterNavByRoles(NAV_ITEMS, roles);
  }, [roles]);

  const bottomItems = useMemo(
    () =>
      [
        {
          to: "/app/support",
          label: "Support",
          icon: "support",
          roles: ["OWNER", "MANAGER", "CASHIER", "SELLER", "STOREKEEPER", "TECHNICIAN"],
          badge: supportBadgeCount > 0 ? supportBadgeCount : null,
        },
        {
          to: "/app/settings",
          label: "Settings",
          icon: "settings",
          roles: ["OWNER", "MANAGER"],
        },
      ].filter((item) => item.roles.some((role) => roles.includes(role))),
    [roles, supportBadgeCount],
  );

  const visibleNav = useMemo(() => {
    const term = navSearch.trim().toLowerCase();
    if (!term) return filteredNav;
    return filteredNav.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(term)),
    })).filter((group) => group.items.length);
  }, [filteredNav, navSearch]);

  const navigationRef = useRef(null);
  const drawerWasOpen = useRef(false);

  // svx-step302-nav-scroll: initial top + fresh mobile drawer, never on every render.
  useEffect(() => {
    const nav = navigationRef.current;
    if (nav) nav.scrollTop = 0;
  }, []);

  useEffect(() => {
    if (mobileOpen && !drawerWasOpen.current && navigationRef.current) {
      navigationRef.current.scrollTop = 0;
    }
    drawerWasOpen.current = Boolean(mobileOpen);
  }, [mobileOpen]);

  const searchInputRef = useRef(null);
  useEffect(() => {
    function handleShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("storvex:open-navigation-search"));
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setNavSearch("");
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  const firstSearchItem = visibleNav.flatMap(group => group.items)[0] || null;
  const allowedSearchItems = useMemo(() =>
    visibleNav.flatMap((group) => group.items.map((item) => ({
      to: item.to, label: item.label
    }))), [visibleNav]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("storvex:navigation-search-results", { detail: allowedSearchItems }));
  }, [allowedSearchItems]);
  useEffect(() => {
    const publish = () => window.dispatchEvent(new CustomEvent("storvex:navigation-search-results", { detail: allowedSearchItems }));
    window.addEventListener("storvex:request-navigation-search-results", publish);
    return () => window.removeEventListener("storvex:request-navigation-search-results", publish);
  }, [allowedSearchItems]);
  useEffect(() => {
    const search = (event) => setNavSearch(String(event.detail || ""));
    const navigateResult = (event) => {
      const target = String(event.detail || "");
      if (target && allowedSearchItems.some((item) => item.to === target)) handleNavigate(target);
    };
    window.addEventListener("storvex:header-search-query", search);
    window.addEventListener("storvex:header-search-navigate", navigateResult);
    return () => {
      window.removeEventListener("storvex:header-search-query", search);
      window.removeEventListener("storvex:header-search-navigate", navigateResult);
    };
  }, [allowedSearchItems]);


  const effectiveCollapsed = collapsed && !mobileOpen;

  function handleNavigate(to) {
    setNavSearch("");
    navigate(to);
    onClose?.();
  }

  const dockBusinessName = (typeof window !== "undefined"
    ? localStorage.getItem("activeTenantName") || localStorage.getItem("tenantName") || localStorage.getItem("businessName")
    : null) || "Your business";
  const dockRole = roles.includes("OWNER") ? "Owner" : (roles[0] || "Member");
  // svx-step304-business-logo: use business Settings data, never the owner's avatar.
  const [businessLogo, setBusinessLogo] = useState(() =>
    readWorkspaceCache()?.tenant?.logoUrl || null
  );
  useEffect(() => {
    const refresh = () => setBusinessLogo(readWorkspaceCache()?.tenant?.logoUrl || null);
    refresh();
    window.addEventListener("storvex:workspace-refreshed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("storvex:workspace-refreshed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => setLogoFailed(false), [businessLogo]);

  function handleLogout() {
    // AppShell owns revocation, browser cleanup and the final redirect.
    onLogout?.();
    onClose?.();
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition md:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "svx-sidebar fixed left-0 top-0 z-50 flex h-[100dvh] flex-col transition-all duration-300",
          effectiveCollapsed && "is-collapsed",
          effectiveCollapsed ? "w-[80px]" : "w-[264px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        <div className="svx-sidebar-top">
          <LogoBlock collapsed={effectiveCollapsed} onClose={onClose} logoSrc={logoSrc} />

          {!effectiveCollapsed ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="svx-nav-collapse hidden md:inline-grid"
                aria-label="Collapse sidebar"
              >
                <Icon type="collapse-left" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="svx-mobile-close md:hidden"
                aria-label="Close sidebar"
              >
                <Icon type="close" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="svx-nav-collapse hidden md:inline-grid"
              aria-label="Expand sidebar"
            >
              <Icon type="collapse-right" />
            </button>
          )}
        </div>


        <nav ref={navigationRef} className="svx-sidebar-navigation relative min-h-0 flex-1 overflow-y-auto px-4 pb-4 [scrollbar-width:thin]">
          {!effectiveCollapsed && (
            <label className="svx-nav-search">
              <span aria-hidden="true">⌕</span>
              <input type="search" placeholder="Find a page..." aria-label="Find a navigation page"
                ref={searchInputRef}
                value={navSearch}
                onChange={(event) => setNavSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && firstSearchItem) {
                    event.preventDefault();
                    handleNavigate(firstSearchItem.to);
                    setNavSearch("");
                  }
                }} />
            </label>
          )}
          {navSearch.trim() && !visibleNav.length ? (
            <p className="svx-nav-no-results" role="status">No matching pages. Try another search.</p>
          ) : null}
          {visibleNav.map((group) => (
            <div key={group.section} className="mb-4">
              <GroupLabel label={group.section} collapsed={effectiveCollapsed} />

              <ul className="space-y-1.5">
                {group.items.map((item) => {
                  const active = isItemActive(location.pathname, item.to, item.end);

                  return (
                    <li key={item.to}>
                      <NavItemButton
                        item={item}
                        active={active}
                        collapsed={effectiveCollapsed}
                        onClick={() => handleNavigate(item.to)}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="svx-sidebar-bottom relative border-t border-[var(--color-border)]/70 p-4">
          <div className="svx-sidebar-bottom-links">
            {bottomItems.map((item) => {
              const active = isItemActive(location.pathname, item.to);

              return (
                <NavItemButton
                  key={item.to}
                  item={item}
                  active={active}
                  collapsed={effectiveCollapsed}
                  onClick={() => handleNavigate(item.to)}
                />
              );
            })}
          </div>
          <div className="svx-account-dock">
            {accountOpen && !effectiveCollapsed ? (
              <div className="svx-account-dock-menu" role="group" aria-label="Business account">
                <button type="button" onClick={() => { setAccountOpen(false); handleNavigate("/app/settings"); }}>
                  <Icon type="settings" /> <span>Business settings</span>
                </button>
                <button type="button" onClick={() => { setAccountOpen(false); handleNavigate("/app/settings/security"); }}>
                  <Icon type="settings" /> <span>Account &amp; security</span>
                </button>
                <button type="button" className="is-signout" onClick={() => { setAccountOpen(false); handleLogout(); }}>
                  <Icon type="logout" /> <span>Sign out</span>
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="svx-account-dock-trigger"
              aria-label={effectiveCollapsed ? "Business account and sign out" : "Business account menu"}
              title={effectiveCollapsed ? "Business account" : undefined}
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen(value => !value)}
            >
              <span className="svx-account-avatar" aria-hidden="true">
                {businessLogo && !logoFailed ? (
                  <img className="svx-business-logo" src={businessLogo} alt="" onError={() => setLogoFailed(true)} />
                ) : dockBusinessName.slice(0, 1).toUpperCase()}
              </span>
              {!effectiveCollapsed && (
                <span className="svx-account-dock-copy">
                  <strong>{dockBusinessName}</strong>
                  <small>{dockRole}</small>
                </span>
              )}
              {!effectiveCollapsed && <span className="svx-account-chevron" aria-hidden="true">⌄</span>}
            </button>
            {effectiveCollapsed && accountOpen && (
              <div className="svx-account-dock-menu svx-account-dock-menu--compact" role="group" aria-label="Business account">
                <button type="button" onClick={() => { setAccountOpen(false); handleNavigate("/app/settings"); }}>Settings</button>
                <button type="button" className="is-signout" onClick={() => { setAccountOpen(false); handleLogout(); }}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
