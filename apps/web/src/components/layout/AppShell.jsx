import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import { useTheme } from "../../hooks/useTheme";
import AppHeader from "./AppHeader";
import "./StorvexWorkspaceShell.css";
import AppSidebar from "./AppSidebar";
import {
  clearActiveBranchId,
  getActiveBranchId,
  setActiveBranchId,
} from "../../services/apiClient";
import {
  internalWorkspaceQueryOptions,
} from "../../lib/internalWorkspaceQuery";

const WORKSPACE_CACHE_KEY = "storvex_me_cache_v2";

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function safeJsonParse(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readCachedWorkspace() {
  return (
    safeJsonParse(sessionStorage.getItem(WORKSPACE_CACHE_KEY)) ||
    safeJsonParse(localStorage.getItem(WORKSPACE_CACHE_KEY))
  );
}

function writeCachedWorkspace(workspace) {
  if (!workspace) return;

  try {
    sessionStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(workspace));
  } catch {}

  try {
    localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(workspace));
  } catch {}
}

function normalizeBranch(branch) {
  if (!branch?.id) return null;

  return {
    id: cleanString(branch.id),
    tenantId: cleanString(branch.tenantId),
    name: cleanString(branch.name) || "Branch",
    code: cleanString(branch.code),
    type: cleanString(branch.type),
    status: cleanString(branch.status) || "ACTIVE",
    phone: cleanString(branch.phone),
    email: cleanString(branch.email),
    countryCode: cleanString(branch.countryCode),
    district: cleanString(branch.district),
    sector: cleanString(branch.sector),
    address: cleanString(branch.address),
    isMain: Boolean(branch.isMain),
    isDefault: Boolean(branch.isDefault),
    canOperate: branch.canOperate !== false,
    canViewReports: Boolean(branch.canViewReports),
  };
}

function uniqueBranches(...groups) {
  const seen = new Set();
  const branches = [];

  for (const group of groups) {
    const list = Array.isArray(group) ? group : [];

    for (const raw of list) {
      const branch = normalizeBranch(raw);
      if (!branch?.id || seen.has(branch.id)) continue;

      seen.add(branch.id);
      branches.push(branch);
    }
  }

  return branches;
}

function pickWorkspaceBranches(workspace) {
  return uniqueBranches(
    workspace?.allowedBranches,
    workspace?.branches,
    workspace?.branchAccess?.allowedBranches,
    workspace?.user?.allowedBranches,
    workspace?.tenant?.branches,
    workspace?.activeBranch ? [workspace.activeBranch] : [],
    workspace?.defaultBranch ? [workspace.defaultBranch] : [],
    workspace?.mainBranch ? [workspace.mainBranch] : [],
  );
}

function pickWorkspaceName(workspace) {
  return (
    cleanString(workspace?.tenant?.name) ||
    cleanString(workspace?.user?.tenant?.name) ||
    cleanString(localStorage.getItem("tenantName")) ||
    cleanString(localStorage.getItem("storeName")) ||
    cleanString(localStorage.getItem("businessName")) ||
    ""
  );
}

function pickActiveBranch(workspace) {
  const branches = pickWorkspaceBranches(workspace);

  const activeBranchId =
    cleanString(getActiveBranchId()) ||
    cleanString(workspace?.user?.activeBranchId) ||
    cleanString(workspace?.user?.branchId) ||
    cleanString(workspace?.branchAccess?.activeBranchId) ||
    cleanString(workspace?.activeBranch?.id) ||
    cleanString(workspace?.defaultBranch?.id) ||
    cleanString(workspace?.mainBranch?.id);

  const matched = branches.find((branch) => branch.id === activeBranchId);

  return (
    matched ||
    branches.find((branch) => branch.isDefault) ||
    branches.find((branch) => branch.isMain) ||
    normalizeBranch(workspace?.activeBranch) ||
    normalizeBranch(workspace?.defaultBranch) ||
    normalizeBranch(workspace?.mainBranch) ||
    branches[0] ||
    null
  );
}

function uniqueLocationParts(...values) {
  const seen = new Set();
  const parts = [];

  for (const value of values) {
    const clean = cleanString(value);
    if (!clean) continue;

    const key = clean.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    parts.push(clean);
  }

  return parts;
}

function pickWorkspaceLocation(workspace) {
  const activeBranch = pickActiveBranch(workspace);
  const tenant = workspace?.tenant || workspace?.user?.tenant || null;

  const branchLocation = uniqueLocationParts(
    activeBranch?.sector,
    activeBranch?.district,
    activeBranch?.address,
  ).join(" • ");

  const tenantLocation = uniqueLocationParts(
    tenant?.sector,
    tenant?.district,
    tenant?.address,
  ).join(" • ");

  return (
    branchLocation ||
    tenantLocation ||
    cleanString(localStorage.getItem("workspaceLocation")) ||
    ""
  );
}

function pickBranchIdFromWorkspace(workspace) {
  const activeBranch = pickActiveBranch(workspace);

  return (
    cleanString(activeBranch?.id) ||
    cleanString(workspace?.user?.activeBranchId) ||
    cleanString(workspace?.user?.branchId) ||
    cleanString(workspace?.branchAccess?.activeBranchId) ||
    ""
  );
}

function persistActiveBranch(branch) {
  const activeBranch = normalizeBranch(branch);

  if (!activeBranch?.id) return;

  setActiveBranchId(activeBranch.id);

  if (activeBranch.name) {
    localStorage.setItem("activeBranchName", activeBranch.name);
  }

  if (activeBranch.code) {
    localStorage.setItem("activeBranchCode", activeBranch.code);
  }

  localStorage.setItem("activeBranchIsMain", String(Boolean(activeBranch.isMain)));

  const location = uniqueLocationParts(
    activeBranch.sector,
    activeBranch.district,
    activeBranch.address,
  ).join(" • ");

  if (location) {
    localStorage.setItem("workspaceLocation", location);
  }
}

function normalizeWorkspacePayload(workspace) {
  if (!workspace) return null;

  const branches = pickWorkspaceBranches(workspace);
  const activeBranch = pickActiveBranch(workspace);

  return {
    ...workspace,

    // AppHeader currently reads workspace.branches.
    // Keep both names so old and new components stay compatible.
    branches,
    allowedBranches: branches,

    activeBranch,
  };
}

function persistWorkspace(workspace) {
  const normalizedWorkspace = normalizeWorkspacePayload(workspace);
  if (!normalizedWorkspace) return null;

  const tenant = normalizedWorkspace?.tenant || normalizedWorkspace?.user?.tenant || null;
  const user = normalizedWorkspace?.user || null;
  const activeBranch = normalizedWorkspace.activeBranch;
  const workspaceLocation = pickWorkspaceLocation(normalizedWorkspace);

  writeCachedWorkspace(normalizedWorkspace);

  if (activeBranch?.id) {
    persistActiveBranch(activeBranch);
  }

  if (tenant?.id) localStorage.setItem("tenantId", tenant.id);
  if (tenant?.name) localStorage.setItem("tenantName", tenant.name);

  if (user?.id) localStorage.setItem("userId", user.id);
  if (user?.name) localStorage.setItem("userName", user.name);
  if (user?.email) localStorage.setItem("userEmail", user.email);
  if (user?.role) localStorage.setItem("userRole", user.role);

  if (workspaceLocation) {
    localStorage.setItem("workspaceLocation", workspaceLocation);
  }

  return normalizedWorkspace;
}

function clearWorkspaceStorage() {
  localStorage.removeItem("tenantToken");
  localStorage.removeItem("token");

  localStorage.removeItem("userRole");
  localStorage.removeItem("tenantId");
  localStorage.removeItem("userId");
  localStorage.removeItem("tenantName");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");

  localStorage.removeItem("activeBranchName");
  localStorage.removeItem("activeBranchCode");
  localStorage.removeItem("activeBranchIsMain");
  localStorage.removeItem("branchId");
  localStorage.removeItem("activeBranchId");
  localStorage.removeItem("storvex_activeBranchId");
  localStorage.removeItem("storvex_activeBranchName");
  localStorage.removeItem("storvex_activeBranchCode");
  localStorage.removeItem("storvex_active_branch_id");

  localStorage.removeItem("workspaceLocation");
  localStorage.removeItem(WORKSPACE_CACHE_KEY);

  sessionStorage.removeItem(WORKSPACE_CACHE_KEY);

  clearActiveBranchId();
}

function pickPageTitle(pathname) {
  const path = String(pathname || "");

  if (path === "/app") return "Dashboard";

  if (path === "/app/reports") return "Business overview";
  if (path.startsWith("/app/reports/cash-flow")) return "Money";
  if (path.startsWith("/app/reports/income-statement")) return "Profit & sales";
  if (path.startsWith("/app/reports/trial-balance")) return "Attention";
  if (path.startsWith("/app/reports/profit-table")) return "Profit & sales";

  if (path.startsWith("/app/whatsapp")) return "WhatsApp";

  if (path.startsWith("/app/pos/drawer")) return "Cash drawer";
  if (path.startsWith("/app/pos/credit")) return "Customer credit";
  if (path.startsWith("/app/pos/sales")) return "Sales";
  if (path.startsWith("/app/pos")) return "Point of sale";

  if (path.startsWith("/app/interstore")) return "Inter-store deals";

  if (path.startsWith("/app/inventory/reorder")) return "Reorder list";
  if (path.startsWith("/app/inventory/stock-history")) return "Stock history";
  if (path.startsWith("/app/inventory")) return "Inventory";

  if (path.startsWith("/app/suppliers")) return "Suppliers";
  if (path.startsWith("/app/customers")) return "Customers";

  if (path.startsWith("/app/documents/warranties")) return "Warranties";
  if (path.startsWith("/app/documents/receipts")) return "Receipts";
  if (path.startsWith("/app/documents/invoices")) return "Invoices";
  if (path.startsWith("/app/documents/proformas")) return "Proformas";
  if (path.startsWith("/app/documents/delivery-notes")) return "Delivery notes";
  if (path.startsWith("/app/documents")) return "Document center";

  if (path.startsWith("/app/repairs")) return "Repairs";

  if (path.startsWith("/app/settings/branches")) return "Branches";
  if (path.startsWith("/app/settings/members")) return "Members";
  if (path.startsWith("/app/settings/roles")) return "User roles";
  if (path.startsWith("/app/settings/security")) return "Security";
  if (path.startsWith("/app/settings/audit")) return "Settings audit";
  if (path.startsWith("/app/settings")) return "Settings";

  if (path.startsWith("/app/billing")) return "Billing";
  if (path.startsWith("/app/audit")) return "Audit logs";
  if (path.startsWith("/app/employees")) return "Employees";
  if (path.startsWith("/app/money")) return "Money";
  if (path.startsWith("/app/expenses")) return "Expenses";

  return "";
}

export default function AppShell({ children }) {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const cachedWorkspace = useMemo(() => {
    return normalizeWorkspacePayload(readCachedWorkspace());
  }, []);

  const workspaceQuery = useQuery({
    ...internalWorkspaceQueryOptions,
    placeholderData: cachedWorkspace || undefined,
  });

  const [collapsed, setCollapsed] = useState(() => {
    try { return window.localStorage.getItem("storvex_sidebar_collapsed_v1") === "true"; }
    catch { return false; }
  });

  function toggleSidebarCollapse() {
    setCollapsed((previous) => {
      const next = !previous;
      try { window.localStorage.setItem("storvex_sidebar_collapsed_v1", String(next)); }
      catch {}
      return next;
    });
  }
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const openForSearch = () => setMobileOpen(true);
    window.addEventListener("storvex:open-navigation-search", openForSearch);
    return () => window.removeEventListener("storvex:open-navigation-search", openForSearch);
  }, []);
  const [workspace, setWorkspace] = useState(cachedWorkspace);

  const workspaceName = useMemo(() => pickWorkspaceName(workspace), [workspace]);

  const pageTitle = useMemo(() => pickPageTitle(location.pathname), [location.pathname]);

  const headerTitle = pageTitle || workspaceName || "Workspace";
  // svx-step306-mobile-bottom-nav: same retail role limits as AppSidebar.
  const mobileRole = useMemo(() => {
    try {
      const raw = localStorage.getItem("tenantToken") || localStorage.getItem("token");
      if (!raw) return "";
      return String(jwtDecode(raw)?.role || "").toUpperCase();
    } catch { return ""; }
  }, []);
  const canSeeProducts = ["OWNER", "MANAGER", "STOREKEEPER"].includes(mobileRole);
  const canSeeSales = ["OWNER", "MANAGER", "CASHIER", "SELLER"].includes(mobileRole);

  useEffect(() => {
    const payload = workspaceQuery.data || null;

    /*
     * The cached workspace is placeholder data only. It gives an
     * instant shell while the shared /auth/me request verifies the
     * current session in the background.
     */
    if (
      !payload ||
      workspaceQuery.isPlaceholderData
    ) {
      return;
    }

    const nextWorkspace =
      persistWorkspace(payload);

    if (!nextWorkspace) return;

    setWorkspace(nextWorkspace);

    window.dispatchEvent(
      new CustomEvent(
        "storvex:workspace-refreshed",
        {
          detail: {
            workspace: nextWorkspace,
            branchId:
              pickBranchIdFromWorkspace(
                nextWorkspace,
              ),
          },
        },
      ),
    );
  }, [
    workspaceQuery.data,
    workspaceQuery.isPlaceholderData,
  ]);

  useEffect(() => {
    const error = workspaceQuery.error;

    if (!error) return;

    const status = Number(
      error?.response?.status ||
        error?.status ||
        0,
    );

    if (status !== 401) return;

    clearWorkspaceStorage();
    queryClient.clear();

    navigate("/login", {
      replace: true,
    });
  }, [
    navigate,
    queryClient,
    workspaceQuery.error,
  ]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    let timer = null;

    function handleBranchChanged(event) {
      window.clearTimeout(timer);

      timer = window.setTimeout(() => {
        const incomingBranch = normalizeBranch(event?.detail?.branch);

        setWorkspace((current) => {
          const latest = normalizeWorkspacePayload(readCachedWorkspace()) || current || {};

          if (!incomingBranch?.id) {
            return latest;
          }

          persistActiveBranch(incomingBranch);

          const branches = pickWorkspaceBranches(latest);
          const nextBranches = branches.length ? branches : [incomingBranch];

          const nextWorkspace = normalizeWorkspacePayload({
            ...latest,
            branches: nextBranches.map((branch) =>
              branch.id === incomingBranch.id ? { ...branch, ...incomingBranch } : branch,
            ),
            allowedBranches: nextBranches.map((branch) =>
              branch.id === incomingBranch.id ? { ...branch, ...incomingBranch } : branch,
            ),
            activeBranch: incomingBranch,
          });

          writeCachedWorkspace(nextWorkspace);

          return nextWorkspace;
        });
      }, 120);
    }

    window.addEventListener("storvex:branch-changed", handleBranchChanged);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storvex:branch-changed", handleBranchChanged);
    };
  }, []);

  useEffect(() => {
    function handleStorage(event) {
      if (
        event.key === "storvex_active_branch_id" ||
        event.key === WORKSPACE_CACHE_KEY
      ) {
        const latest = normalizeWorkspacePayload(readCachedWorkspace());
        if (latest) setWorkspace(latest);
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  async function handleLogout() {
    // Revoke BOTH server-side sessions before changing routes. A surviving
    // account cookie otherwise triggers the account-to-workspace auto-login.
    const retailToken = localStorage.getItem("tenantToken") || localStorage.getItem("token");
    const operations = [
      fetch("/api/auth/account/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      }),
    ];

    if (retailToken) {
      operations.push(fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Authorization: `Bearer ${retailToken}` },
      }));
    }

    const results = await Promise.allSettled(operations);
    const failures = results.filter((item) =>
      item.status !== "fulfilled" ||
      (item.value.status !== 200 && item.value.status !== 401)
    );

    if (failures.length) {
      // Do not claim logout succeeded while a valid session might remain.
      window.alert("Sign out could not be completed. Please try again.");
      return;
    }

    clearWorkspaceStorage();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div data-svx-theme={isDark ? "dark" : "light"} className="svx-shell-frame min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
        onToggleCollapse={toggleSidebarCollapse}
      />

      <div className={collapsed ? "svx-shell-content md:pl-[80px]" : "svx-shell-content md:pl-[264px]"}>
        <AppHeader
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
          onToggleMobileSidebar={() => setMobileOpen(true)}
          onLogout={handleLogout}
          collapsed={collapsed}
          workspaceName={headerTitle}
        />

        <main
          className="svx-shell-main mx-auto w-full max-w-[1880px] px-4 pb-8 pt-5 text-[var(--color-text)] sm:px-6 sm:pb-10 lg:px-8 xl:px-10 2xl:px-12"
          style={{
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </main>
        <nav className="svx-mobile-bottom-nav" aria-label="Mobile quick navigation">
          <Link to="/app" aria-current={location.pathname === "/app" ? "page" : undefined} onClick={() => setMobileOpen(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z"/></svg><span>Home</span>
          </Link>
          {canSeeProducts && <Link to="/app/inventory" aria-current={location.pathname.startsWith("/app/inventory") ? "page" : undefined} onClick={() => setMobileOpen(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10"/></svg><span>Products</span>
          </Link>}
          {canSeeSales && <Link to="/app/pos" aria-current={location.pathname.startsWith("/app/pos") ? "page" : undefined} onClick={() => setMobileOpen(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h4"/></svg><span>Sales</span>
          </Link>}
          <button type="button" aria-label="Open all navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}