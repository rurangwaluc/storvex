import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getActiveBranchId, setActiveBranchId } from "../../services/apiClient";

const WORKSPACE_CACHE_KEY = "storvex_me_cache_v2";

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CollapseLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[17px] w-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CollapseRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[17px] w-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <path
        d="M6.5 20V8.2c0-.7.4-1.3 1-1.6l4-2a2 2 0 0 1 1.8 0l4 2c.7.3 1.1 1 1.1 1.7V20"
        strokeLinejoin="round"
      />
      <path d="M4 20h16M10 20v-5h4v5M9.5 10h.01M14.5 10h.01" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 11V8a5 5 0 0 1 10 0v3" strokeLinecap="round" />
      <rect x="5" y="11" width="14" height="10" rx="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function routeLabel(pathname) {
  const path = String(pathname || "");

  if (path === "/app") return "Business dashboard";

  if (path === "/app/reports") return "Business reports";
  if (path.startsWith("/app/reports/cash-flow")) return "Cash flow";
  if (path.startsWith("/app/reports/income-statement")) return "Income statement";
  if (path.startsWith("/app/reports/trial-balance")) return "Trial balance";
  if (path.startsWith("/app/reports/profit-table")) return "Profit view";

  if (path.startsWith("/app/whatsapp")) return "WhatsApp sales";

  if (path.startsWith("/app/pos/drawer")) return "Cash drawer";
  if (path.startsWith("/app/pos/credit")) return "Customer balances";
  if (path.startsWith("/app/pos/sales")) return "Sales records";
  if (path.startsWith("/app/pos")) return "Sales desk";

  if (path.startsWith("/app/interstore")) return "Store transfers";

  if (path.startsWith("/app/inventory/reorder")) return "Restock list";
  if (path.startsWith("/app/inventory/stock-history")) return "Stock activity";
  if (path.startsWith("/app/inventory")) return "Stock control";

  if (path.startsWith("/app/suppliers")) return "Suppliers";
  if (path.startsWith("/app/customers")) return "Customers";

  if (path.startsWith("/app/documents/warranties")) return "Warranties";
  if (path.startsWith("/app/documents/receipts")) return "Receipts";
  if (path.startsWith("/app/documents/invoices")) return "Invoices";
  if (path.startsWith("/app/documents/proformas")) return "Proformas";
  if (path.startsWith("/app/documents/delivery-notes")) return "Delivery notes";
  if (path.startsWith("/app/documents")) return "Document center";

  if (path.startsWith("/app/repairs")) return "Repair jobs";
  if (path.startsWith("/app/settings")) return "Business settings";
  if (path.startsWith("/app/billing")) return "Plan and payments";
  if (path.startsWith("/app/audit")) return "Activity history";
  if (path.startsWith("/app/employees")) return "Team";
  if (path.startsWith("/app/expenses")) return "Business expenses";

  return "Business dashboard";
}

function safeReadJsonFromStorage(key) {
  try {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeReadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    const clean = String(value || "").trim();
    if (clean) return clean;
  }

  return "";
}

function normalizeCompare(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[#,|,]/g, " ")
    .replace(/\s+/g, " ");
}

function cleanLocationPart(value) {
  return String(value || "").trim();
}

function uniqueLocationParts(...values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const clean = cleanLocationPart(value);
    if (!clean) continue;

    const key = normalizeCompare(clean);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(clean);
  }

  return result;
}

function formatBranchLocation(branch, fallbackLocation = "") {
  const parts = uniqueLocationParts(branch?.sector, branch?.district, branch?.address);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return cleanLocationPart(fallbackLocation);
}

function isRepeatedBranchText(value, branch) {
  const text = normalizeCompare(value);
  const branchName = normalizeCompare(branch?.name);
  const branchCode = normalizeCompare(branch?.code);

  if (!text) return true;
  if (branchName && text === branchName) return true;
  if (branchCode && text === branchCode) return true;
  if (branchName && text.includes(branchName)) return true;

  return false;
}

function formatBranchDisplay(branch, fallbackLocation = "") {
  const branchName = cleanLocationPart(branch?.name) || "Current selling location";
  const branchLocation = formatBranchLocation(branch, fallbackLocation);

  return {
    nameLine: branchName,
    metaLine: branchLocation && !isRepeatedBranchText(branchLocation, branch) ? branchLocation : "",
  };
}

function decodeTokenUser(token) {
  if (!token) return {};

  try {
    const decoded = jwtDecode(token);

    return {
      userName: pickFirstNonEmpty(
        decoded?.name,
        decoded?.fullName,
        decoded?.username,
        decoded?.userName
      ),
      userEmail: pickFirstNonEmpty(decoded?.email),
      userRole: pickFirstNonEmpty(decoded?.role),
      workspaceName: pickFirstNonEmpty(
        decoded?.tenantName,
        decoded?.storeName,
        decoded?.businessName,
        decoded?.shopName
      ),
      workspaceLocation: pickFirstNonEmpty(
        decoded?.workspaceLocation,
        decoded?.locationName
      ),
    };
  } catch {
    return {};
  }
}

function normalizeBranch(branch) {
  if (!branch?.id) return null;

  return {
    id: branch.id,
    name: branch.name || "Unnamed branch",
    code: branch.code || "",
    status: branch.status || "ACTIVE",
    isMain: Boolean(branch.isMain),
    district: branch.district || "",
    sector: branch.sector || "",
    address: branch.address || "",
    canOperate: branch.canOperate !== false,
    canViewReports: branch.canViewReports !== false,
  };
}

function getWorkspaceBranches(workspace) {
  const candidates = [
    workspace?.branches,
    workspace?.allowedBranches,
    workspace?.branchAccess?.branches,
    workspace?.user?.branches,
    workspace?.user?.allowedBranches,
  ];

  const merged = [];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;

    for (const rawBranch of candidate) {
      const branch = normalizeBranch(rawBranch);
      if (!branch?.id) continue;

      if (!merged.some((item) => item.id === branch.id)) {
        merged.push(branch);
      }
    }
  }

  const activeBranch = normalizeBranch(workspace?.activeBranch);
  const defaultBranch = normalizeBranch(workspace?.defaultBranch);
  const mainBranch = normalizeBranch(workspace?.mainBranch);

  for (const branch of [activeBranch, defaultBranch, mainBranch]) {
    if (branch?.id && !merged.some((item) => item.id === branch.id)) {
      merged.push(branch);
    }
  }

  return merged;
}

function resolveActiveBranch(workspace, branches) {
  const activeBranchId = pickFirstNonEmpty(
    getActiveBranchId(),
    workspace?.user?.activeBranchId,
    workspace?.user?.branchId,
    workspace?.branchAccess?.activeBranchId,
    workspace?.activeBranch?.id,
    workspace?.defaultBranch?.id,
    workspace?.mainBranch?.id,
    localStorage.getItem("storvex_active_branch_id"),
    localStorage.getItem("activeBranchId"),
    localStorage.getItem("branchId")
  );

  const fromBranches = branches.find((branch) => branch.id === activeBranchId);
  if (fromBranches) return fromBranches;

  return (
    normalizeBranch(workspace?.activeBranch) ||
    normalizeBranch(workspace?.defaultBranch) ||
    normalizeBranch(workspace?.mainBranch) ||
    branches[0] ||
    null
  );
}

function getSessionSnapshot() {
  if (typeof window === "undefined") {
    return {
      userName: "",
      userEmail: "",
      userRole: "",
      workspaceName: "",
      workspaceLocation: "",
      branches: [],
      activeBranch: null,
      canViewAllBranches: false,
    };
  }

  const token = localStorage.getItem("tenantToken") || localStorage.getItem("token") || "";
  const decoded = decodeTokenUser(token);
  const workspace = safeReadJsonFromStorage(WORKSPACE_CACHE_KEY) || {};

  const userObj =
    workspace?.user ||
    safeReadJson("user") ||
    safeReadJson("tenantUser") ||
    safeReadJson("authUser") ||
    safeReadJson("me") ||
    safeReadJson("profile") ||
    {};

  const tenant = workspace?.tenant || userObj?.tenant || null;

  const branches = getWorkspaceBranches(workspace);
  const activeBranch = resolveActiveBranch(workspace, branches);

  const userName = pickFirstNonEmpty(
    localStorage.getItem("userName"),
    localStorage.getItem("name"),
    userObj?.name,
    userObj?.fullName,
    userObj?.username,
    decoded.userName
  );

  const userEmail = pickFirstNonEmpty(
    localStorage.getItem("userEmail"),
    localStorage.getItem("email"),
    userObj?.email,
    decoded.userEmail
  );

  const userRole = pickFirstNonEmpty(
    localStorage.getItem("userRole"),
    userObj?.role,
    decoded.userRole
  );

  const workspaceName = pickFirstNonEmpty(
    localStorage.getItem("tenantName"),
    localStorage.getItem("storeName"),
    localStorage.getItem("businessName"),
    tenant?.name,
    userObj?.tenantName,
    userObj?.storeName,
    userObj?.businessName,
    decoded.workspaceName
  );

  const branchLocation = formatBranchLocation(activeBranch, "");

  const tenantLocation = uniqueLocationParts(
    tenant?.sector,
    tenant?.district,
    tenant?.address
  ).join(", ");

  const storedWorkspaceLocation = localStorage.getItem("workspaceLocation");

  const workspaceLocation = pickFirstNonEmpty(
    branchLocation,
    tenantLocation,
    storedWorkspaceLocation,
    localStorage.getItem("locationName"),
    userObj?.workspaceLocation,
    userObj?.locationName,
    decoded.workspaceLocation
  );

  const normalizedRole = String(userRole || "").toUpperCase();

  const canViewAllBranches = Boolean(
    workspace?.branchAccess?.canViewAllBranches ||
      workspace?.user?.canViewAllBranches ||
      normalizedRole === "OWNER" ||
      normalizedRole === "MANAGER"
  );

  return {
    userName,
    userEmail,
    userRole,
    workspaceName,
    workspaceLocation,
    branches,
    activeBranch,
    canViewAllBranches,
  };
}

function initials(text) {
  const value = String(text || "").trim();
  if (!value) return "S";

  const parts = value.split(/\s+/).filter(Boolean).slice(0, 2);
  const built = parts.map((part) => part[0]?.toUpperCase() || "").join("");

  return built || value[0].toUpperCase() || "S";
}

function branchLabel(branch) {
  if (!branch) return "No selling location";

  return cleanLocationPart(branch.name) || "Current selling location";
}

function persistSelectedBranch(branch) {
  if (!branch?.id) return;

  setActiveBranchId(branch.id);

  localStorage.setItem("storvex_active_branch_id", branch.id);
  localStorage.setItem("activeBranchId", branch.id);
  localStorage.setItem("branchId", branch.id);

  if (branch.name) localStorage.setItem("activeBranchName", branch.name);
  if (branch.code) localStorage.setItem("activeBranchCode", branch.code);

  const location = formatBranchLocation(branch, "");
  if (location) localStorage.setItem("workspaceLocation", location);

  window.dispatchEvent(
    new CustomEvent("storvex:branch-changed", {
      detail: {
        branchId: branch.id,
        branch,
      },
    })
  );
}

function StatusPill({ children, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "border-[rgba(16,185,129,0.28)] bg-[rgba(16,185,129,0.12)] text-emerald-600 dark:text-emerald-200"
      : tone === "warning"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-200"
        : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)]";

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]",
        toneClass,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default function AppHeader({
  isDark,
  onToggleTheme,
  onToggleSidebar,
  onToggleMobileSidebar,
  collapsed,
  workspaceName,
}) {
  const location = useLocation();
  const activeLabel = routeLabel(location.pathname);
  const branchMenuRef = useRef(null);

  const [session, setSession] = useState(() => getSessionSnapshot());
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setSession(getSessionSnapshot());

    refresh();

    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storvex:branch-changed", refresh);
    window.addEventListener("storvex:workspace-refreshed", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storvex:branch-changed", refresh);
      window.removeEventListener("storvex:workspace-refreshed", refresh);
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event) {
      if (!branchMenuRef.current) return;

      if (!branchMenuRef.current.contains(event.target)) {
        setBranchMenuOpen(false);
      }
    }

    function onEscape(event) {
      if (event.key === "Escape") setBranchMenuOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  const finalUserName = useMemo(() => {
    return pickFirstNonEmpty(session.userName, session.userEmail, "Account");
  }, [session.userName, session.userEmail]);

  const finalWorkspaceName = useMemo(() => {
    const candidate = pickFirstNonEmpty(session.workspaceName, workspaceName, "Storvex workspace");

    if (isRepeatedBranchText(candidate, session.activeBranch)) {
      return "Storvex workspace";
    }

    return candidate;
  }, [session.workspaceName, workspaceName, session.activeBranch]);

  const activeBranch = session.activeBranch;
  const branches = Array.isArray(session.branches) ? session.branches : [];
  const canSwitchBranches = Boolean(session.canViewAllBranches && branches.length > 1);

  const activeBranchDisplay = useMemo(() => {
    return formatBranchDisplay(activeBranch, session.workspaceLocation);
  }, [activeBranch, session.workspaceLocation]);

  function handleBranchSelect(branch) {
    if (!branch?.id) return;

    persistSelectedBranch(branch);
    setSession(getSessionSnapshot());
    setBranchMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/96 backdrop-blur-xl">
      <div className="flex min-h-[78px] items-center gap-3 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] md:hidden"
          aria-label="Open navigation"
        >
          <MenuIcon />
        </button>


        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <div className="truncate text-[15px] font-black tracking-[-0.01em] text-[var(--color-text)] sm:text-[16px]">
              {activeLabel}
            </div>

            {activeBranch?.status && activeBranch.status !== "ACTIVE" ? (
              <StatusPill tone="warning">{activeBranch.status}</StatusPill>
            ) : null}
          </div>

          <div className="mt-1 hidden truncate text-[12px] font-semibold text-[var(--color-text-muted)] sm:block">
            {finalWorkspaceName}
          </div>

          <div className="mt-1.5 flex items-center gap-2 sm:hidden">
            <span className="inline-flex max-w-[230px] items-center gap-1.5 truncate rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-text)] shadow-[var(--shadow-soft)]">
              <BranchIcon />
              <span className="truncate">{activeBranchDisplay.nameLine}</span>
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="relative hidden sm:block" ref={branchMenuRef}>
            <button
              type="button"
              onClick={() => {
                if (canSwitchBranches) setBranchMenuOpen((prev) => !prev);
              }}
              className={[
                "group relative inline-flex min-h-[56px] max-w-[390px] items-center gap-3 overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2.5 text-left shadow-[var(--shadow-soft)] transition",
                "before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-[var(--color-primary)]",
                canSwitchBranches
                  ? "hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-card)]"
                  : "cursor-default",
              ].join(" ")}
              aria-label={canSwitchBranches ? "Switch selling location" : "Current selling location"}
              title={branchLabel(activeBranch)}
            >
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)]">
                <BranchIcon />
              </span>

              <span className="relative min-w-0">
                <span className="flex items-center gap-2">
                  <span className="block truncate text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Current selling location
                  </span>

                  {activeBranch?.isMain ? <StatusPill tone="success">Main</StatusPill> : null}
                </span>

                <span className="mt-0.5 block max-w-[210px] truncate text-[13px] font-black leading-tight text-[var(--color-text)] lg:max-w-[250px]">
                  {activeBranchDisplay.nameLine}
                </span>

                {activeBranchDisplay.metaLine ? (
                  <span className="mt-1 block max-w-[210px] truncate text-[11px] font-semibold leading-tight text-[var(--color-text-muted)] lg:max-w-[250px]">
                    {activeBranchDisplay.metaLine}
                  </span>
                ) : null}
              </span>

              {canSwitchBranches ? (
                <span className="relative ml-1 text-[var(--color-text-muted)] transition group-hover:text-[var(--color-text)]">
                  <ChevronDownIcon />
                </span>
              ) : (
                <span className="relative ml-1 text-[var(--color-text-muted)]">
                  <LockIcon />
                </span>
              )}
            </button>

            {branchMenuOpen && canSwitchBranches ? (
              <div className="absolute right-0 mt-2 w-[380px] overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-[var(--shadow-card)]">
                <div className="px-3 pb-2 pt-2">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    Switch selling location
                  </div>
                  <div className="mt-1 text-[12px] font-semibold leading-5 text-[var(--color-text-muted)]">
                    Choose the selling location used for sales, cash drawer, and stock activity.
                  </div>
                </div>

                <div className="max-h-[330px] overflow-y-auto p-1 [scrollbar-width:thin]">
                  {branches.map((branch) => {
                    const active = branch.id === activeBranch?.id;
                    const branchDisplay = formatBranchDisplay(branch, "");

                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => handleBranchSelect(branch)}
                        className={[
                          "flex w-full items-start gap-3 rounded-[22px] border px-3 py-3 text-left transition",
                          active
                            ? "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)]"
                            : "border-transparent hover:bg-[var(--color-surface-2)]",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border",
                            active
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                              : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)]",
                          ].join(" ")}
                        >
                          {active ? <CheckIcon /> : <BranchIcon />}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-[13px] font-black text-[var(--color-text)]">
                              {branchDisplay.nameLine}
                            </span>

                            {branch.isMain ? <StatusPill tone="success">Main</StatusPill> : null}
                          </span>

                          <span className="mt-0.5 block truncate text-[12px] font-semibold text-[var(--color-text-muted)]">
                            {branchDisplay.metaLine || "Selling location"}
                          </span>
                        </span>

                        <StatusPill tone={branch.status === "ACTIVE" ? "success" : "warning"}>
                          {branch.status}
                        </StatusPill>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="inline-flex h-10 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] p-1 text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]"
          >
            <span
              className={[
                "flex h-8 w-8 items-center justify-center rounded-full transition",
                !isDark
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-sm"
                  : "text-[var(--color-text-muted)]",
              ].join(" ")}
            >
              <SunIcon />
            </span>

            <span
              className={[
                "flex h-8 w-8 items-center justify-center rounded-full transition",
                isDark
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-sm"
                  : "text-[var(--color-text-muted)]",
              ].join(" ")}
            >
              <MoonIcon />
            </span>
          </button>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]"
            aria-label="Open profile"
            title={finalUserName}
          >
            {initials(finalUserName)}
          </button>
        </div>
      </div>
    </header>
  );
}

