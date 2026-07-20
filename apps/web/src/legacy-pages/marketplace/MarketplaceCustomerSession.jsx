import {
  useEffect,
  useState,
} from "react";

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

  const [checking, setChecking] =
    useState(
      Boolean(
        verify &&
          session.token,
      ),
    );

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

  useEffect(() => {
    if (
      !verify ||
      !session.token
    ) {
      setChecking(false);
      return undefined;
    }

    let active = true;

    setChecking(true);

    loadMarketplaceCustomer()
      .catch(() => null)
      .finally(() => {
        if (active) {
          setSession(readSession());
          setChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    verify,
    session.token,
  ]);

  return {
    ...session,
    checking,
    signedIn: Boolean(
      session.token &&
        session.customer?.id,
    ),
  };
}
