import { create } from "zustand";
import type { AuthTenant, AuthUser } from "../types/auth";
import type { Branch } from "../types/branch";
import type { SubscriptionSummary } from "../types/subscription";
import {
  getSecureItem,
  removeSecureItem,
  setSecureItem,
} from "../lib/storage/secureStorage";
import { queryClient } from "../lib/api/queryClient";
import { useBranchStore } from "./branchStore";

const TOKEN_KEY = "storvex_mobile_token";
const WORKSPACE_KEY = "storvex_mobile_workspace_v1";

type WorkspaceCache = {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  subscription: SubscriptionSummary | null;
  activeBranch: Branch | null;
  allowedBranches: Branch[];
};

type AuthStore = {
  token: string | null;
  user: AuthUser | null;
  tenant: AuthTenant | null;
  subscription: SubscriptionSummary | null;
  isHydrating: boolean;
  isAuthenticated: boolean;

  hydrateToken: () => Promise<void>;

  setSession: (payload: {
    token: string;
    user?: AuthUser | null;
    tenant?: AuthTenant | null;
    subscription?: SubscriptionSummary | null;
    activeBranch?: Branch | null;
    allowedBranches?: Branch[];
  }) => Promise<void>;

  setMe: (payload: {
    user?: AuthUser | null;
    tenant?: AuthTenant | null;
    subscription?: SubscriptionSummary | null;
    activeBranch?: Branch | null;
    allowedBranches?: Branch[];
  }) => Promise<void>;

  resetSessionState: () => Promise<void>;
  logout: () => Promise<void>;
};

function safeJsonParse(value: string | null): WorkspaceCache | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as WorkspaceCache;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeBranches(payload: {
  activeBranch?: Branch | null;
  allowedBranches?: Branch[];
}) {
  const activeBranch = payload.activeBranch ?? null;
  const allowedBranches = Array.isArray(payload.allowedBranches)
    ? payload.allowedBranches.filter(Boolean)
    : [];

  if (allowedBranches.length > 0) {
    return {
      activeBranch:
        activeBranch ||
        allowedBranches.find((branch) => branch.isMain) ||
        allowedBranches[0] ||
        null,
      allowedBranches,
    };
  }

  if (activeBranch) {
    return {
      activeBranch,
      allowedBranches: [activeBranch],
    };
  }

  return {
    activeBranch: null,
    allowedBranches: [],
  };
}

function syncBranches(payload: {
  activeBranch?: Branch | null;
  allowedBranches?: Branch[];
}) {
  const normalized = normalizeBranches(payload);

  if (normalized.allowedBranches.length > 0) {
    useBranchStore.getState().replaceBranches(normalized.allowedBranches);

    if (normalized.activeBranch) {
      useBranchStore.getState().setActiveBranch(normalized.activeBranch);
    }

    return;
  }

  useBranchStore.getState().resetBranches();
}

async function persistWorkspace(payload: WorkspaceCache) {
  await setSecureItem(WORKSPACE_KEY, JSON.stringify(payload));
}

async function clearWorkspaceCache() {
  await removeSecureItem(WORKSPACE_KEY);
  useBranchStore.getState().resetBranches();
  queryClient.clear();
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: null,
  user: null,
  tenant: null,
  subscription: null,
  isHydrating: true,
  isAuthenticated: false,

  hydrateToken: async () => {
    const [token, cachedWorkspaceRaw] = await Promise.all([
      getSecureItem(TOKEN_KEY),
      getSecureItem(WORKSPACE_KEY),
    ]);

    if (!token) {
      await clearWorkspaceCache();

      set({
        token: null,
        user: null,
        tenant: null,
        subscription: null,
        isAuthenticated: false,
        isHydrating: false,
      });

      return;
    }

    const cachedWorkspace = safeJsonParse(cachedWorkspaceRaw);

    if (cachedWorkspace) {
      syncBranches({
        activeBranch: cachedWorkspace.activeBranch,
        allowedBranches: cachedWorkspace.allowedBranches,
      });
    } else {
      useBranchStore.getState().resetBranches();
    }

    set({
      token,
      user: cachedWorkspace?.user ?? null,
      tenant: cachedWorkspace?.tenant ?? null,
      subscription: cachedWorkspace?.subscription ?? null,
      isAuthenticated: true,
      isHydrating: false,
    });
  },

  setSession: async ({
    token,
    user = null,
    tenant = null,
    subscription = null,
    activeBranch = null,
    allowedBranches = [],
  }) => {
    await clearWorkspaceCache();

    set({
      token: null,
      user: null,
      tenant: null,
      subscription: null,
      isAuthenticated: false,
      isHydrating: true,
    });

    await setSecureItem(TOKEN_KEY, token);

    const normalized = normalizeBranches({
      activeBranch,
      allowedBranches,
    });

    syncBranches(normalized);

    const workspace: WorkspaceCache = {
      user,
      tenant,
      subscription,
      activeBranch: normalized.activeBranch,
      allowedBranches: normalized.allowedBranches,
    };

    if (user || tenant || normalized.activeBranch) {
      await persistWorkspace(workspace);
    }

    set({
      token,
      user,
      tenant,
      subscription,
      isAuthenticated: true,
      isHydrating: false,
    });
  },

  setMe: async ({
    user = null,
    tenant = null,
    subscription = null,
    activeBranch = null,
    allowedBranches = [],
  }) => {
    const current = get();

    const nextUser = user ?? null;
    const nextTenant = tenant ?? null;
    const nextSubscription = subscription ?? null;

    if (!nextUser || !nextTenant) {
      await removeSecureItem(WORKSPACE_KEY);
      useBranchStore.getState().resetBranches();

      set({
        user: nextUser,
        tenant: nextTenant,
        subscription: nextSubscription,
        isAuthenticated: Boolean(current.token),
        isHydrating: false,
      });

      return;
    }

    const normalized = normalizeBranches({
      activeBranch,
      allowedBranches,
    });

    syncBranches(normalized);

    const nextWorkspace: WorkspaceCache = {
      user: nextUser,
      tenant: nextTenant,
      subscription: nextSubscription,
      activeBranch: normalized.activeBranch,
      allowedBranches: normalized.allowedBranches,
    };

    await persistWorkspace(nextWorkspace);

    set({
      user: nextWorkspace.user,
      tenant: nextWorkspace.tenant,
      subscription: nextWorkspace.subscription,
      isAuthenticated: Boolean(current.token),
      isHydrating: false,
    });
  },

  resetSessionState: async () => {
    await clearWorkspaceCache();

    set({
      user: null,
      tenant: null,
      subscription: null,
      isHydrating: true,
    });
  },

  logout: async () => {
    await Promise.all([
      removeSecureItem(TOKEN_KEY),
      removeSecureItem(WORKSPACE_KEY),
    ]);

    useBranchStore.getState().resetBranches();
    queryClient.clear();

    set({
      token: null,
      user: null,
      tenant: null,
      subscription: null,
      isAuthenticated: false,
      isHydrating: false,
    });
  },
}));
