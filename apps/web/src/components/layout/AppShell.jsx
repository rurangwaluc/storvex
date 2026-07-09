import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useTheme } from "../../hooks/useTheme";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import apiClient, {
  clearActiveBranchId,
  getActiveBranchId,
  setActiveBranchId,
} from "../../services/apiClient";

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
    countryCode: cleanString(branch.countryCode) || "RW",
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
    cleanString(localStorage.getItem("storvex_active_branch_id")) ||
    cleanString(localStorage.getItem("storvex_activeBranchId")) ||
    cleanString(localStorage.getItem("activeBranchId")) ||
    cleanString(localStorage.getItem("branchId")) ||
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

  localStorage.setItem("branchId", activeBranch.id);
  localStorage.setItem("activeBranchId", activeBranch.id);
  localStorage.setItem("storvex_activeBranchId", activeBranch.id);
  localStorage.setItem("storvex_active_branch_id", activeBranch.id);

  if (activeBranch.name) {
    localStorage.setItem("activeBranchName", activeBranch.name);
    localStorage.setItem("storvex_activeBranchName", activeBranch.name);
  }

  if (activeBranch.code) {
    localStorage.setItem("activeBranchCode", activeBranch.code);
    localStorage.setItem("storvex_activeBranchCode", activeBranch.code);
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

  if (path === "/app/reports") return "Business reports";
  if (path.startsWith("/app/reports/cash-flow")) return "Money report";
  if (path.startsWith("/app/reports/income-statement")) return "Sales and profit report";
  if (path.startsWith("/app/reports/trial-balance")) return "Owner checks";
  if (path.startsWith("/app/reports/profit-table")) return "Best selling products";

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

  const cachedWorkspace = useMemo(() => {
    return normalizeWorkspacePayload(readCachedWorkspace());
  }, []);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspace, setWorkspace] = useState(cachedWorkspace);

  const workspaceName = useMemo(() => pickWorkspaceName(workspace), [workspace]);

  const pageTitle = useMemo(() => pickPageTitle(location.pathname), [location.pathname]);

  const headerTitle = pageTitle || workspaceName || "Workspace";

  const refreshWorkspace = useCallback(async () => {
    try {
      const res = await apiClient.get("/auth/me");
      const payload = res?.data || null;

      if (!payload) return null;

      const nextWorkspace = persistWorkspace(payload);
      setWorkspace(nextWorkspace);

      window.dispatchEvent(
        new CustomEvent("storvex:workspace-refreshed", {
          detail: {
            workspace: nextWorkspace,
            branchId: pickBranchIdFromWorkspace(nextWorkspace),
          },
        }),
      );

      return nextWorkspace;
    } catch (err) {
      if (err?.response?.status === 401) {
        clearWorkspaceStorage();
        navigate("/login", { replace: true });
      }

      return null;
    }
  }, [navigate]);

  useEffect(() => {
    let alive = true;

    async function bootWorkspace() {
      const payload = await refreshWorkspace();
      if (!alive || !payload) return;

      setWorkspace(payload);
    }

    bootWorkspace();

    return () => {
      alive = false;
    };
  }, [refreshWorkspace]);

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
        event.key === "storvex_activeBranchId" ||
        event.key === "activeBranchId" ||
        event.key === "branchId" ||
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

  function handleLogout() {
    clearWorkspaceStorage();
    navigate("/login", { replace: true });
  }

  return (
    <div className="svx-shell-frame min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <AppSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      <div className={collapsed ? "svx-shell-content md:pl-[94px]" : "svx-shell-content md:pl-[230px]"}>
        <AppHeader
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
          onToggleMobileSidebar={() => setMobileOpen(true)}
          collapsed={collapsed}
          workspaceName={headerTitle}
        />

        <main
          className="svx-shell-main mx-auto min-h-[calc(100vh-78px)] w-full max-w-[1880px] px-4 pb-8 pt-5 text-[var(--color-text)] sm:px-6 sm:pb-10 lg:px-8 xl:px-10 2xl:px-12"
          style={{
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}