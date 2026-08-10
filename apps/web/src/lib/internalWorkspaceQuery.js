import apiClient from "../services/apiClient";

export const internalWorkspaceQueryKey = [
  "internal-session",
  "workspace",
];

export async function fetchInternalWorkspace() {
  const response = await apiClient.get("/auth/me");

  return response?.data || null;
}

export const internalWorkspaceQueryOptions = {
  queryKey: internalWorkspaceQueryKey,
  queryFn: fetchInternalWorkspace,

  /*
   * Workspace, branch access and subscription state are shared
   * server state. TanStack Query deduplicates /auth/me requests
   * across AppShell and SubscriptionGate.
   */
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};
