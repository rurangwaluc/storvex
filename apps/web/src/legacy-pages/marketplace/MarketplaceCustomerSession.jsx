import {
  useQuery,
} from "@tanstack/react-query";
import {
  useEffect,
  useState,
} from "react";

import marketplaceQueryKeys from "../../lib/marketplaceQueryKeys";
import {
  getMarketplaceCustomerSession,
  loadMarketplaceCustomer,
  MARKETPLACE_CUSTOMER_SESSION_EVENT,
} from "../../services/marketplaceCustomerAuth";

function readSession() {
  const session =
    getMarketplaceCustomerSession();

  return {
    token: session.token || "",
    customer:
      session.customer || null,
    expiresAt:
      session.expiresAt || null,
  };
}

export function useMarketplaceCustomerSession({
  verify = false,
} = {}) {
  const [session, setSession] =
    useState(readSession);

  useEffect(() => {
    function refreshSession() {
      setSession(readSession());
    }

    window.addEventListener(
      MARKETPLACE_CUSTOMER_SESSION_EVENT,
      refreshSession,
    );

    window.addEventListener(
      "storage",
      refreshSession,
    );

    return () => {
      window.removeEventListener(
        MARKETPLACE_CUSTOMER_SESSION_EVENT,
        refreshSession,
      );

      window.removeEventListener(
        "storage",
        refreshSession,
      );
    };
  }, []);

  const customerQuery = useQuery({
    queryKey:
      marketplaceQueryKeys.customerSession(),
    queryFn:
      loadMarketplaceCustomer,
    enabled:
      Boolean(
        verify &&
          session.token,
      ),
    initialData:
      session.customer || undefined,
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const verifiedCustomer =
    verify &&
    customerQuery.data?.id
      ? customerQuery.data
      : session.customer;

  return {
    ...session,
    customer: verifiedCustomer || null,
    checking: Boolean(
      verify &&
        session.token &&
        customerQuery.isFetching &&
        customerQuery.dataUpdatedAt === 0,
    ),
    signedIn: Boolean(
      session.token &&
        verifiedCustomer?.id,
    ),
  };
}
