import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { internalWorkspaceQueryOptions } from "../lib/internalWorkspaceQuery";
import { tenantMarketFromWorkspace } from "../lib/tenantMarket";

export default function useTenantMarket() {
  const query = useQuery(internalWorkspaceQueryOptions);

  const market = useMemo(
    () => tenantMarketFromWorkspace(query.data),
    [query.data],
  );

  return {
    market,
    isLoading: query.isLoading,
    error: query.error || null,
  };
}
