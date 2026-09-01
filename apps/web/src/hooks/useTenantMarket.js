import { useQuery } from "@tanstack/react-query";

import { internalWorkspaceQueryOptions } from "../lib/internalWorkspaceQuery";
import { tenantMarketFromWorkspace } from "../lib/tenantMarket";

export default function useTenantMarket() {
  const query = useQuery(internalWorkspaceQueryOptions);

  return {
    market: tenantMarketFromWorkspace(query.data),
    isLoading: query.isLoading,
    error: query.error || null,
  };
}
