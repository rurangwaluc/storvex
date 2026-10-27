import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { jwtDecode } from "jwt-decode";

import "./AppHeader.css";

const WORKSPACE_CACHE_KEY = "storvex_me_cache_v2";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="svx-header-icon" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="svx-header-icon-sm" fill="none" stroke="currentColor" strokeWidth="2.1">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="svx-header-chevron" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="svx-header-icon-sm" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="svx-header-icon-sm" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="svx-header-icon-sm" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.8a2 2 0 1 1 0-4H2.9a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.8a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.1.4 1.7 1.7 0 0 0-.6 1Z" />
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="svx-header-icon-sm" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18M7 15h4" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="svx-header-icon-sm" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function pageTitle(pathname) {
  const path = String(pathname || "");

  if (path === "/app") return "Dashboard";
  if (path.startsWith("/app/pos/drawer")) return "Cash drawer";
  if (path.startsWith("/app/pos/credit")) return "Customer credit";
  if (path.startsWith("/app/pos/sales")) return "Sales records";
  if (path.startsWith("/app/pos")) return "Sales desk";
  if (path.startsWith("/app/interstore")) return "Store transfers";
  if (path.startsWith("/app/inventory/reorder")) return "Restock list";
  if (path.startsWith("/app/inventory/stock-history")) return "Stock activity";
  if (/^\/app\/inventory\/[^/]+\/images/.test(path)) return "Product images";
  if (/^\/app\/inventory\/[^/]+\/edit/.test(path)) return "Edit product";
  if (/^\/app\/inventory\/[^/]+$/.test(path)) return "Product details";
  if (path.startsWith("/app/inventory")) return "Stock overview";
  if (path.startsWith("/app/suppliers")) return "Suppliers";
  if (path.startsWith("/app/customers")) return "Customers";
  if (path.startsWith("/app/documents/warranties")) return "Warranties";
  if (path.startsWith("/app/documents/receipts")) return "Receipts";
  if (path.startsWith("/app/documents/invoices")) return "Invoices";
  if (path.startsWith("/app/documents/proformas")) return "Proformas";
  if (path.startsWith("/app/documents/delivery-notes")) return "Delivery notes";
  if (path.startsWith("/app/documents")) return "Document center";
  if (path.startsWith("/app/whatsapp")) return "WhatsApp sales";
  if (path.startsWith("/app/reports/cash-flow")) return "Money";
  if (path.startsWith("/app/reports/profit-table")) return "Profit & sales";
  if (path.startsWith("/app/reports/products")) return "Products";
  if (path.startsWith("/app/reports/owner-checks")) return "Attention";
  if (path.startsWith("/app/reports")) return "Business overview";
  if (path.startsWith("/app/money")) return "Money";
  if (path.startsWith("/app/expenses")) return "Expenses";
  if (path.startsWith("/app/repairs")) return "Repair jobs";
  if (path.startsWith("/app/support")) return "Support";
  if (path.startsWith("/app/employees")) return "Team";
  if (path.startsWith("/app/settings")) return "Settings";
  if (path.startsWith("/app/billing")) return "Billing";
  if (path.startsWith("/app/audit")) return "Activity history";

  return "Dashboard";
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    const clean = String(value || "").trim();
    if (clean) return clean;
  }

  return "";
}

function safeReadWorkspace() {
  try {
    const raw = sessionStorage.getItem(WORKSPACE_CACHE_KEY) || localStorage.getItem(WORKSPACE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function decodeTokenUser() {
  const token = localStorage.getItem("tenantToken") || localStorage.getItem("token") || "";

  if (!token) return {};

  try {
    const decoded = jwtDecode(token);

    return {
      name: pickFirstNonEmpty(decoded?.name, decoded?.fullName, decoded?.username, decoded?.userName),
      email: pickFirstNonEmpty(decoded?.email),
      role: pickFirstNonEmpty(decoded?.role),
    };
  } catch {
    return {};
  }
}

function roleLabel(role) {
  const value = String(role || "").trim().toUpperCase();

  if (value === "OWNER") return "Owner";
  if (value === "MANAGER") return "Manager";
  if (value === "CASHIER") return "Cashier";
  if (value === "SELLER") return "Seller";
  if (value === "STOREKEEPER") return "Storekeeper";
  if (value === "TECHNICIAN") return "Technician";

  return "Staff";
}

function getSessionUser() {
  const decoded = decodeTokenUser();
  const workspace = safeReadWorkspace() || {};
  const user = workspace?.user || {};

  return {
    name: pickFirstNonEmpty(localStorage.getItem("userName"), user?.name, decoded.name),
    email: pickFirstNonEmpty(localStorage.getItem("userEmail"), user?.email, decoded.email),
    role: pickFirstNonEmpty(localStorage.getItem("userRole"), user?.role, decoded.role),
  };
}

function initials(value) {
  const text = String(value || "").trim();

  if (!text) return "SO";

  const parts = text.split(/\s+/).filter(Boolean).slice(0, 2);
  const built = parts.map((part) => part[0]?.toUpperCase() || "").join("");

  return built || "SO";
}

function ActionMenu({ open, onClose }) {
  if (!open) return null;

  const actions = [
    { to: "/app/pos", label: "New sale" },
    { to: "/app/inventory/new", label: "Add product" },
    { to: "/app/customers/new", label: "Add customer" },
    { to: "/app/expenses", label: "Record expense" },
  ];

  return (
    <div className="svx-header-action-menu">
      {actions.map((item) => (
        <Link key={item.to} to={item.to} onClick={onClose} className="svx-header-action-item">
          <span>{item.label}</span>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  );
}

function AccountMenu({ open, user, onClose, onLogout }) {
  if (!open) return null;

  const displayName = pickFirstNonEmpty(user.name, user.email, "Store owner");
  const displayEmail = pickFirstNonEmpty(user.email, "Signed in");

  return (
    <div className="svx-header-account-menu">
      <div className="svx-header-account-head">
        <div className="svx-header-account-avatar">{initials(displayName)}</div>

        <div className="svx-header-account-copy">
          <p>{displayName}</p>
          <span>{roleLabel(user.role)}</span>
          <small>{displayEmail}</small>
        </div>
      </div>

      <div className="svx-header-account-list">
        <Link to="/app/settings/security" onClick={onClose} className="svx-header-account-item">
          <SettingsIcon />
          <span>Account settings</span>
        </Link>

        <Link to="/app/settings" onClick={onClose} className="svx-header-account-item">
          <SettingsIcon />
          <span>Business settings</span>
        </Link>

        <Link to="/app/settings/billing" onClick={onClose} className="svx-header-account-item">
          <BillingIcon />
          <span>Billing</span>
        </Link>

        <button type="button" onClick={onLogout} className="svx-header-account-item is-danger">
          <LogoutIcon />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

export default function AppHeader({
  isDark,
  onToggleTheme,
  onToggleMobileSidebar,
  onLogout,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const actionMenuRef = useRef(null);
  const accountMenuRef = useRef(null);

  const [user, setUser] = useState(() => getSessionUser());
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [permittedPages, setPermittedPages] = useState([]);
  const searchInputRef = useRef(null);
  const searchWrapRef = useRef(null);
  const [searchBounds, setSearchBounds] = useState(null);
  // svx-step314-results-portal: avoid clipping by the sticky app shell.
  useEffect(() => {
    if (!searchFocused) return;
    const update = () => {
      const bounds = searchWrapRef.current?.getBoundingClientRect();
      if (bounds) setSearchBounds({ left: bounds.left, top: bounds.bottom + 8, width: bounds.width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [searchFocused]);
  // Search includes route-guarded Settings destinations that do not appear in
  // the sidebar's top-level menu. Never expose owner-only routes to other roles.
  const settingsSearchPages = String(user.role || "").toUpperCase() === "OWNER"
    ? [{ to: "/app/settings/billing", label: "Billing" }]
    : [];
  const searchablePages = [...permittedPages, ...settingsSearchPages].filter(
    (item, index, all) => all.findIndex((candidate) => candidate.to === item.to) === index
  );
  const matchingPages = searchablePages.filter((item) =>
    item.label.toLowerCase().includes(workspaceSearch.trim().toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const updatePages = (event) => {
      if (Array.isArray(event.detail)) setPermittedPages(event.detail);
    };
    window.addEventListener("storvex:navigation-search-results", updatePages);
    window.dispatchEvent(new CustomEvent("storvex:request-navigation-search-results"));
    return () => window.removeEventListener("storvex:navigation-search-results", updatePages);
  }, []);

  useEffect(() => {
    const keyboard = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.matchMedia("(max-width: 767px)").matches) {
          window.dispatchEvent(new CustomEvent("storvex:open-navigation-search"));
        } else {
          searchInputRef.current?.focus();
        }
      }
      if (event.key === "Escape") {
        setSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);

  function openSearchResult(item) {
    if (!item?.to || !searchablePages.some((allowed) => allowed.to === item.to)) return;
    navigate(item.to);
    setWorkspaceSearch("");
    setSearchFocused(false);
    searchInputRef.current?.blur();
  }


  useEffect(() => {
    const refresh = () => setUser(getSessionUser());

    refresh();

    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storvex:workspace-refreshed", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storvex:workspace-refreshed", refresh);
    };
  }, []);

  useEffect(() => {
    function closeMenus(event) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(false);
      }

      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setActionMenuOpen(false);
        setAccountMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", closeMenus);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeMenus);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function handleLogout() {
    setAccountMenuOpen(false);

    /*
     * AppShell owns the internal-session boundary so every sign-out
     * path clears auth storage and TanStack server state consistently.
     */
    onLogout?.();
  }

  const finalUserName = pickFirstNonEmpty(user.name, user.email, "Store owner");
  const activePage = pageTitle(location.pathname);

  return (
    <header className="svx-app-header">
      <div className="svx-header-inner">
        <div className="svx-header-left">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="svx-header-menu-button"
            aria-label="Open navigation"
          >
            <MenuIcon />
          </button>

          <Link to="/app" className="svx-header-mobile-brand" aria-label="Storvex dashboard">
            <img src="/storvex-header-tricolor.png" alt="Storvex" />
          </Link>
          <h1>{activePage}</h1>
        </div>

        <div className="svx-header-search-wrap" ref={searchWrapRef}>
          <label className="svx-header-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
            <input ref={searchInputRef} type="search" value={workspaceSearch}
              placeholder="Search workspace..." aria-label="Search workspace pages"
              onFocus={() => {
                setSearchFocused(true);
                window.dispatchEvent(new CustomEvent("storvex:request-navigation-search-results"));
              }}
              onChange={(event) => { setWorkspaceSearch(event.target.value); setActiveSearchIndex(0); }}
              onBlur={(event) => {
                if (!event.currentTarget.closest(".svx-header-search-wrap")?.contains(event.relatedTarget)) {
                  window.setTimeout(() => setSearchFocused(false), 160);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSearchFocused(true);
                  setActiveSearchIndex((index) => Math.min(index + 1, matchingPages.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveSearchIndex((index) => Math.max(index - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  if (matchingPages.length) openSearchResult(matchingPages[Math.min(activeSearchIndex, matchingPages.length - 1)]);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setSearchFocused(false);
                }
              }} />
          </label>
          {searchFocused && workspaceSearch.trim() && searchBounds && typeof document !== "undefined"
            ? createPortal(
                <div className="svx-header-search-results svx-header-search-portal"
                  role="listbox" aria-label="Matching workspace pages"
                  data-theme={isDark ? "dark" : "light"}
                  style={{ left: searchBounds.left, top: searchBounds.top, width: searchBounds.width }}>
                  {matchingPages.length ? matchingPages.map((item, index) => (
                    <button key={item.to} type="button" role="option"
                      aria-selected={index === activeSearchIndex}
                      className={index === activeSearchIndex ? "is-keyboard-selected" : ""}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveSearchIndex(index)}
                      onClick={() => openSearchResult(item)}>
                      <span>{item.label}</span><span aria-hidden="true">↗</span>
                    </button>
                  )) : <p>No matching accessible pages</p>}
                </div>,
                document.body
              ) : null}
        </div>
        <div className="svx-header-actions">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="svx-header-theme-toggle"
          >
            <span className={!isDark ? "is-active" : ""}>
              <SunIcon />
            </span>
            <span className={isDark ? "is-active" : ""}>
              <MoonIcon />
            </span>
          </button>

          <div className="svx-header-account-wrap" ref={accountMenuRef}>
            <button
              type="button"
              className="svx-header-profile"
              aria-label="Open profile menu"
              title={finalUserName}
              onClick={() => setAccountMenuOpen((prev) => !prev)}
            >
              {initials(finalUserName)}
            </button>

            <AccountMenu
              open={accountMenuOpen}
              user={user}
              onClose={() => setAccountMenuOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
