import { NavLink, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useMemo, useState } from "react";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function getDecodedRoles(token) {
  if (!token) return [];

  try {
    const decoded = jwtDecode(token);

    if (decoded?.role) return [normalizeRole(decoded.role)];
    if (Array.isArray(decoded?.roles)) return decoded.roles.map(normalizeRole).filter(Boolean);

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

function initials(text) {
  const value = String(text || "Storvex").trim();
  if (!value) return "S";
  const parts = value.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "S";
}

function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <path
            d="M4 13h7V4H4v9zm9 7h7V11h-7v9zM4 20h7v-5H4v5zm9-9h7V4h-7v7z"
            fill="currentColor"
          />
        </svg>
      );

    case "pos":
      return (
        <svg {...common}>
          <path d="M7 4h10v3H7V4zm-2 5h14v11H5V9zm3 2v2h8v-2H8zm0 4v2h5v-2H8z" fill="currentColor" />
        </svg>
      );

    case "interstore":
      return (
        <svg {...common}>
          <path
            d="M7 7h10v10H7V7zm-3 5h2m14 0h2M12 4v2m0 14v2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "inventory":
      return (
        <svg {...common}>
          <path
            d="M21 8l-9-5-9 5 9 5 9-5zm-18 3v8l9 5 9-5v-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "reorder":
      return (
        <svg {...common}>
          <path
            d="M4 7h16M4 12h10M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "history":
      return (
        <svg {...common}>
          <path
            d="M12 8v5l3 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21 12a9 9 0 11-3.3-6.9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M21 3v6h-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "suppliers":
      return (
        <svg {...common}>
          <path
            d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 12a4 4 0 100-8 4 4 0 000 8z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "documents":
      return (
        <svg {...common}>
          <path
            d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M15 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "customers":
      return (
        <svg {...common}>
          <path
            d="M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 20a8 8 0 0116 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "whatsapp-inbox":
      return (
        <svg {...common}>
          <path
            d="M12 3a9 9 0 00-7.8 13.5L3 21l4.7-1.2A9 9 0 1012 3z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M8 10.5h8M8 13.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "whatsapp-drafts":
      return (
        <svg {...common}>
          <path
            d="M12 3a9 9 0 00-7.8 13.5L3 21l4.7-1.2A9 9 0 1012 3z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 15l5.8-5.8a1.4 1.4 0 0 1 2 2L11 17l-3 .8z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "whatsapp-accounts":
      return (
        <svg {...common}>
          <path
            d="M12 3a9 9 0 00-7.8 13.5L3 21l4.7-1.2A9 9 0 1012 3z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "whatsapp-activity":
      return (
        <svg {...common}>
          <path
            d="M12 3a9 9 0 00-7.8 13.5L3 21l4.7-1.2A9 9 0 1012 3z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 14l2-2 2 1 3-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "repairs":
      return (
        <svg {...common}>
          <path
            d="M14 7l3 3-9 9H5v-3l9-9zM16 5l3 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "reports":
      return (
        <svg {...common}>
          <path
            d="M6 20V4h12v16H6zm3-3h6m-6-4h6m-6-4h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "chev":
      return (
        <svg {...common}>
          <path
            d="M14 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <path d="M12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" stroke="currentColor" strokeWidth="2" />
          <path
            d="M19.4 15a7.9 7.9 0 000-6l-2.1.7a6.4 6.4 0 00-1.2-1.2l.7-2.1a7.9 7.9 0 00-6 0l.7 2.1a6.4 6.4 0 00-1.2 1.2L6.6 9a7.9 7.9 0 000 6l2.1-.7a6.4 6.4 0 001.2 1.2l-.7 2.1a7.9 7.9 0 006 0l-.7-2.1a6.4 6.4 0 001.2-1.2l2.1.7z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    default:
      return <span className="inline-block w-[18px]" />;
  }
}

function HoverLabel({ show, text }) {
  if (!show) return null;

  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-[rgb(var(--text))] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--bg-elevated))] shadow-lg">
      {text}
    </span>
  );
}

function MobileSectionTitle({ children }) {
  return (
    <div className="px-1 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--text-soft))]">
      {children}
    </div>
  );
}

const NAV_ITEMS = [
  {
    key: "dashboard",
    to: "/app",
    end: true,
    icon: "dashboard",
    label: "Dashboard",
    section: "primary",
    roles: ["OWNER", "MANAGER", "CASHIER", "SELLER", "STOREKEEPER", "TECHNICIAN"],
  },
  {
    key: "pos",
    to: "/app/pos",
    icon: "pos",
    label: "POS",
    section: "sell",
    roles: ["OWNER", "MANAGER", "CASHIER", "SELLER"],
  },
  {
    key: "interstore",
    to: "/app/interstore",
    icon: "interstore",
    label: "Inter-Store",
    section: "sell",
    roles: ["OWNER", "MANAGER", "CASHIER"],
  },
  {
    key: "inventory",
    to: "/app/inventory",
    icon: "inventory",
    label: "Inventory",
    section: "stock",
    roles: ["OWNER", "MANAGER", "STOREKEEPER"],
  },
  {
    key: "reorder",
    to: "/app/inventory/reorder",
    icon: "reorder",
    label: "Reorder list",
    section: "stock",
    roles: ["OWNER", "MANAGER", "STOREKEEPER"],
  },
  {
    key: "history",
    to: "/app/inventory/stock-history",
    icon: "history",
    label: "Stock history",
    section: "stock",
    roles: ["OWNER", "MANAGER", "STOREKEEPER"],
  },
  {
    key: "suppliers",
    to: "/app/suppliers",
    icon: "suppliers",
    label: "Suppliers",
    section: "stock",
    roles: ["OWNER", "MANAGER", "STOREKEEPER"],
  },
  {
    key: "customers",
    to: "/app/customers",
    icon: "customers",
    label: "Customers",
    section: "customers",
    roles: ["OWNER", "MANAGER", "CASHIER", "SELLER", "TECHNICIAN"],
  },
  {
    key: "whatsapp-inbox",
    to: "/app/whatsapp/inbox",
    icon: "whatsapp-inbox",
    label: "WhatsApp inbox",
    section: "customers",
    roles: ["OWNER", "MANAGER", "CASHIER"],
  },
  {
    key: "whatsapp-drafts",
    to: "/app/whatsapp/drafts",
    icon: "whatsapp-drafts",
    label: "WhatsApp drafts",
    section: "customers",
    roles: ["OWNER", "MANAGER", "CASHIER"],
  },
  {
    key: "whatsapp-accounts",
    to: "/app/whatsapp/accounts",
    icon: "whatsapp-accounts",
    label: "WhatsApp accounts",
    section: "customers",
    roles: ["OWNER", "MANAGER", "CASHIER"],
  },
  {
    key: "whatsapp-activity",
    to: "/app/whatsapp/activity",
    icon: "whatsapp-activity",
    label: "WhatsApp activity",
    section: "customers",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "documents",
    to: "/app/documents",
    icon: "documents",
    label: "Document Center",
    section: "documents",
    roles: ["OWNER", "MANAGER", "STOREKEEPER", "SELLER", "CASHIER", "TECHNICIAN"],
  },
  {
    key: "repairs",
    to: "/app/repairs",
    icon: "repairs",
    label: "Repairs",
    section: "operations",
    roles: ["OWNER", "CASHIER", "TECHNICIAN"],
  },
  {
    key: "reports",
    to: "/app/reports",
    icon: "reports",
    label: "Reports",
    section: "operations",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "settings",
    to: "/app/settings",
    icon: "settings",
    label: "Settings",
    section: "admin",
    roles: ["OWNER", "MANAGER"],
  },
];

const SECTION_ORDER = [
  { key: "sell", label: "Sell" },
  { key: "stock", label: "Stock" },
  { key: "customers", label: "Customers" },
  { key: "documents", label: "Documents" },
  { key: "operations", label: "Operations" },
  { key: "admin", label: "Admin" },
];

export default function StoreSidebar({
  variant = "desktop",
  collapsed = false,
  onToggleCollapse,
  onClose,
}) {
  const navigate = useNavigate();

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("tenantToken") || localStorage.getItem("token")
      : null;

  const roles = useMemo(() => getDecodedRoles(token), [token]);
  const primaryRole = roles[0] || null;

  const [hoverOpen, setHoverOpen] = useState(false);

  const isMobile = variant === "mobile";
  const effectiveCollapsed = collapsed && !hoverOpen && !isMobile;

  function logout() {
    try {
      localStorage.removeItem("tenantToken");
      localStorage.removeItem("token");
    } catch {}

    if (onClose) onClose();
    navigate("/login", { replace: true });
  }

  function navClose() {
    if (isMobile && onClose) onClose();
  }

  const shellWidth = effectiveCollapsed ? "w-20" : "w-72";

  const asideClass = isMobile
    ? "flex h-full w-full flex-col bg-[rgb(var(--bg-elevated))]"
    : cx(
        shellWidth,
        "flex min-h-screen flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] transition-[width] duration-300 ease-out"
      );

  const desktopLink = ({ isActive }) =>
    cx(
      "group relative flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
      isActive
        ? "bg-[rgb(var(--bg-muted))] text-[rgb(var(--text))] shadow-sm"
        : "text-[rgb(var(--text-soft))] hover:bg-[rgb(var(--bg-muted))] hover:text-[rgb(var(--text-muted))]"
    );

  const mobileLink = ({ isActive }) =>
    cx(
      "group relative flex min-h-[48px] min-w-0 items-center gap-3 rounded-2xl border px-4 py-3 text-[15px] font-medium transition-all duration-200",
      isActive
        ? "border-[rgb(var(--border-strong))] bg-[rgb(var(--bg-muted))] text-[rgb(var(--text))] shadow-sm"
        : "border-transparent text-[rgb(var(--text-soft))] hover:bg-[rgb(var(--bg-muted))] hover:text-[rgb(var(--text-muted))]"
    );

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => item.roles.some((r) => roles.includes(r)));
  }, [roles]);

  const groupedItems = useMemo(() => {
    const map = new Map();
    SECTION_ORDER.forEach((section) => map.set(section.key, []));

    visibleItems.forEach((item) => {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section).push(item);
    });

    return SECTION_ORDER.map((section) => ({
      ...section,
      items: map.get(section.key) || [],
    })).filter((section) => section.items.length > 0);
  }, [visibleItems]);

  function sectionTitle(title) {
    if (effectiveCollapsed) return null;

    return (
      <div className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-soft))]">
        {title}
      </div>
    );
  }

  function NavItem({ item }) {
    return (
      <NavLink
        to={item.to}
        end={item.end}
        className={isMobile ? mobileLink : desktopLink}
        onClick={navClose}
      >
        {({ isActive }) => (
          <>
            <span
              className={cx(
                "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                isActive
                  ? "bg-[rgba(255,255,255,0.06)] text-[rgb(var(--text))]"
                  : "bg-transparent text-current group-hover:bg-[rgba(255,255,255,0.04)]"
              )}
            >
              <Icon name={item.icon} />
              {!isMobile && effectiveCollapsed ? (
                <span className="hidden group-hover:block">
                  <HoverLabel show={effectiveCollapsed} text={item.label} />
                </span>
              ) : null}
            </span>

            {!effectiveCollapsed || isMobile ? (
              <span className="truncate">{item.label}</span>
            ) : null}
          </>
        )}
      </NavLink>
    );
  }

  return (
    <aside
      className={asideClass}
      onMouseEnter={() => {
        if (!isMobile && collapsed) setHoverOpen(true);
      }}
      onMouseLeave={() => {
        if (!isMobile && collapsed) setHoverOpen(false);
      }}
    >
      <div
        className={cx(
          "border-b border-[rgb(var(--border))]",
          isMobile ? "px-4 pb-4 pt-5" : "p-4"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={cx(
              "flex items-center gap-3",
              !isMobile && effectiveCollapsed ? "w-full justify-center" : ""
            )}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(15,23,42,0.10))] font-semibold text-[rgb(var(--text))] shadow-sm">
              {initials("Storvex")}
            </div>

            {!(!isMobile && effectiveCollapsed) ? (
              <div className="min-w-0">
                <div className="truncate font-semibold leading-tight text-[rgb(var(--text))]">
                  Storvex
                </div>
                <div className="mt-0.5 truncate text-xs text-[rgb(var(--text-soft))]">
                  Store Console {primaryRole ? `• ${roleLabel(primaryRole)}` : ""}
                </div>
              </div>
            ) : null}
          </div>

          {!isMobile ? (
            <button
              type="button"
              onClick={() => onToggleCollapse && onToggleCollapse()}
              className="btn-secondary h-9 w-9 shrink-0 px-0 transition-transform duration-200 hover:scale-[1.03]"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <span
                className={cx(
                  collapsed ? "rotate-180" : "",
                  "transition-transform duration-200"
                )}
              >
                <Icon name="chev" />
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary h-10 w-10 shrink-0 px-0"
              aria-label="Close menu"
            >
              <Icon name="close" />
            </button>
          )}
        </div>

        {isMobile ? (
          <div className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-muted))] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-[rgb(var(--text-soft))]">
                  Workspace
                </div>
                <div className="mt-1 text-sm font-medium text-[rgb(var(--text))]">
                  Active session
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] px-3 py-1.5 text-xs text-[rgb(var(--text))]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {roleLabel(primaryRole)}
              </div>
            </div>
          </div>
        ) : (
          <div className={cx("mt-3", effectiveCollapsed ? "flex justify-center" : "")}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg-muted))] px-3 py-1.5 text-xs text-[rgb(var(--text))]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {effectiveCollapsed ? "OK" : roleLabel(primaryRole)}
            </div>
          </div>
        )}
      </div>

      <nav className={cx("app-scrollbar flex-1 overflow-y-auto", isMobile ? "px-4 py-3" : "p-3")}>
        {isMobile ? (
          <>
            {visibleItems.some((item) => item.key === "dashboard") ? (
              <div className="space-y-1.5">
                {visibleItems
                  .filter((item) => item.key === "dashboard")
                  .map((item) => (
                    <NavItem key={item.key} item={item} />
                  ))}
              </div>
            ) : null}

            {groupedItems
              .filter((section) => section.key !== "primary")
              .map((section) => (
                <div key={section.key}>
                  <MobileSectionTitle>{section.label}</MobileSectionTitle>
                  <div className="space-y-1.5">
                    {section.items.map((item) => (
                      <NavItem key={item.key} item={item} />
                    ))}
                  </div>
                </div>
              ))}
          </>
        ) : (
          <>
            {visibleItems
              .filter((item) => item.key === "dashboard")
              .map((item) => (
                <NavItem key={item.key} item={item} />
              ))}

            {groupedItems
              .filter((section) => section.key !== "primary")
              .map((section) => (
                <div key={section.key}>
                  {sectionTitle(section.label)}
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <NavItem key={item.key} item={item} />
                    ))}
                  </div>
                </div>
              ))}
          </>
        )}
      </nav>

      <div className={cx("border-t border-[rgb(var(--border))]", isMobile ? "p-4 pb-5" : "p-4")}>
        <button
          onClick={logout}
          className={cx("w-full btn-secondary", !isMobile && effectiveCollapsed ? "px-0" : "")}
        >
          {!isMobile && effectiveCollapsed ? "↩" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
