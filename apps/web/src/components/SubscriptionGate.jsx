import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  clearActiveBranchId,
  getActiveBranchId,
  setActiveBranchId,
} from "../services/apiClient";
import {
  internalWorkspaceQueryOptions,
} from "../lib/internalWorkspaceQuery";

const CACHE_KEY = "storvex_me_cache_v2";
const ACTIVE_BRANCH_KEY = "storvex_active_branch_id";

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function normalizeRole(value) {
  return cleanString(value).toUpperCase();
}

function getToken() {
  return localStorage.getItem("tenantToken") || localStorage.getItem("token") || "";
}

function safeJsonParse(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRenewPath(pathname) {
  return String(pathname || "") === "/renew";
}

function isBillingPath(pathname) {
  return String(pathname || "") === "/app/billing";
}

function pickUserRole(data) {
  return normalizeRole(data?.user?.role || data?.role || localStorage.getItem("userRole"));
}

function canAccessRenewPage(data) {
  return pickUserRole(data) === "OWNER";
}

function pickBranchIdFromWorkspace(data) {
  return (
    cleanString(data?.user?.activeBranchId) ||
    cleanString(data?.user?.branchId) ||
    cleanString(data?.branchAccess?.activeBranchId) ||
    cleanString(data?.activeBranch?.id) ||
    cleanString(data?.defaultBranch?.id) ||
    cleanString(data?.mainBranch?.id) ||
    ""
  );
}

function branchExistsInWorkspace(data, branchId) {
  const cleanBranchId = cleanString(branchId);
  if (!cleanBranchId) return false;

  const visibleBranchIds = Array.isArray(data?.branchAccess?.visibleBranchIds)
    ? data.branchAccess.visibleBranchIds
    : Array.isArray(data?.user?.visibleBranchIds)
      ? data.user.visibleBranchIds
      : [];

  const allowedBranchIds = Array.isArray(data?.branchAccess?.allowedBranchIds)
    ? data.branchAccess.allowedBranchIds
    : Array.isArray(data?.user?.allowedBranchIds)
      ? data.user.allowedBranchIds
      : [];

  const branches = Array.isArray(data?.branches) ? data.branches : [];

  return (
    visibleBranchIds.includes(cleanBranchId) ||
    allowedBranchIds.includes(cleanBranchId) ||
    branches.some((branch) => branch?.id === cleanBranchId)
  );
}

function resolveActiveBranchId(data) {
  const storedBranchId = getActiveBranchId();

  if (storedBranchId && branchExistsInWorkspace(data, storedBranchId)) {
    return storedBranchId;
  }

  return pickBranchIdFromWorkspace(data);
}

function persistWorkspace(data) {
  if (!data) return;

  const activeBranchId = resolveActiveBranchId(data);

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}

  if (activeBranchId) {
    setActiveBranchId(activeBranchId);
  } else {
    clearActiveBranchId();
  }

  const tenant = data?.tenant || null;
  const user = data?.user || null;
  const activeBranch = data?.activeBranch || data?.defaultBranch || data?.mainBranch || null;

  try {
    if (tenant?.id) localStorage.setItem("tenantId", tenant.id);
    if (tenant?.name) localStorage.setItem("tenantName", tenant.name);

    if (user?.id) localStorage.setItem("userId", user.id);
    if (user?.name) localStorage.setItem("userName", user.name);
    if (user?.email) localStorage.setItem("userEmail", user.email);
    if (user?.role) localStorage.setItem("userRole", user.role);

    if (activeBranch?.name) localStorage.setItem("activeBranchName", activeBranch.name);
    if (activeBranch?.code) localStorage.setItem("activeBranchCode", activeBranch.code);
    if (activeBranchId) localStorage.setItem(ACTIVE_BRANCH_KEY, activeBranchId);

    const district = cleanString(activeBranch?.district || tenant?.district);
    const sector = cleanString(activeBranch?.sector || tenant?.sector);
    const address = cleanString(activeBranch?.address || tenant?.address);
    const location = [district, sector, address].filter(Boolean).join(", ");

    if (location) localStorage.setItem("workspaceLocation", location);
  } catch {}
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
  localStorage.removeItem("workspaceLocation");
  localStorage.removeItem(CACHE_KEY);

  sessionStorage.removeItem(CACHE_KEY);

  clearActiveBranchId();
}

function readCachedWorkspace() {
  return (
    safeJsonParse(sessionStorage.getItem(CACHE_KEY)) ||
    safeJsonParse(localStorage.getItem(CACHE_KEY))
  );
}

function handleSubscriptionState({ data, pathname, nav }) {
  const sub = data?.subscription || null;
  const onRenew = isRenewPath(pathname);
  const onBilling = isBillingPath(pathname);
  const ownerCanRenew = canAccessRenewPage(data);

  if (!sub) {
    if (ownerCanRenew) {
      nav("/renew", { replace: true });
    } else {
      toast.error("Subscription is missing. Ask the store owner to renew access.");
      nav("/app", { replace: true });
    }
    return;
  }

  const accessMode = cleanString(sub?.accessMode).toUpperCase();
  const status = cleanString(sub?.status).toUpperCase();

  if (accessMode === "SUSPENDED" || status === "SUSPENDED") {
    toast.error("Account suspended. Contact support.");

    if (ownerCanRenew) {
      nav("/renew", { replace: true });
    } else {
      nav("/app", { replace: true });
    }

    return;
  }

  if (status === "EXPIRED") {
    if (!onRenew && !onBilling) {
      toast(
        ownerCanRenew
          ? "Subscription expired. Renew to continue operations."
          : "Subscription expired. Ask the store owner to renew access."
      );
    }

    if (ownerCanRenew && !onRenew && !onBilling) {
      nav("/renew", { replace: true });
    }

    return;
  }

  if (accessMode === "READ_ONLY") {
    if (!onRenew && !onBilling) {
      toast(
        ownerCanRenew
          ? "Subscription is in read-only mode. Renew to restore full access."
          : "Subscription is in read-only mode. Ask the store owner to renew access."
      );
    }

    if (ownerCanRenew && !onRenew && !onBilling) {
      nav("/renew", { replace: true });
    }

    return;
  }

  if (onRenew && status !== "EXPIRED" && accessMode !== "READ_ONLY") {
    toast.success("Subscription is active.");
    nav("/app/billing", { replace: true });
  }
}

export default function SubscriptionGate({ children }) {
  const nav = useNavigate();
  const loc = useLocation();
  const queryClient = useQueryClient();

  /*
   * Keep the existing fast workspace bootstrap but treat browser
   * storage only as placeholder data. Access decisions always use
   * the verified /auth/me response.
   */
  const [cachedWorkspace] =
    useState(() => readCachedWorkspace());

  const token = getToken();

  const workspaceQuery = useQuery({
    ...internalWorkspaceQueryOptions,
    enabled: Boolean(token),
    placeholderData:
      cachedWorkspace || undefined,
  });

  useEffect(() => {
    if (!token) {
      clearWorkspaceStorage();
      queryClient.clear();

      nav("/login", {
        replace: true,
        state: {
          from: loc.pathname,
        },
      });

      return;
    }

    const data =
      workspaceQuery.data || null;

    if (
      data &&
      !workspaceQuery.isPlaceholderData
    ) {
      persistWorkspace(data);

      const ownerCanRenew =
        canAccessRenewPage(data);

      if (
        isRenewPath(loc.pathname) &&
        !ownerCanRenew
      ) {
        toast.error(
          "Only the store owner can renew the subscription.",
        );

        nav("/app", {
          replace: true,
        });

        return;
      }

      handleSubscriptionState({
        data,
        pathname: loc.pathname,
        nav,
      });
    }

    const error =
      workspaceQuery.error;

    if (!error) return;

    const status = Number(
      error?.response?.status ||
        error?.status ||
        0,
    );

    if (status === 401) {
      clearWorkspaceStorage();
      queryClient.clear();

      nav("/login", {
        replace: true,
        state: {
          from: loc.pathname,
        },
      });

      return;
    }

    if (
      !data &&
      !cachedWorkspace
    ) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Workspace is still loading. You can continue while Storvex refreshes access.",
      );
    }
  }, [
    cachedWorkspace,
    loc.pathname,
    nav,
    queryClient,
    token,
    workspaceQuery.data,
    workspaceQuery.error,
    workspaceQuery.isPlaceholderData,
  ]);

  return <>{children}</>;
}
