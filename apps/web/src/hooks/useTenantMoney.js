import { useCallback } from "react";

import useTenantMarket from "./useTenantMarket";
import {
  formatTenantMoney,
  tenantCurrencyCode,
} from "../lib/tenantMoney";

export default function useTenantMoney() {
  const {
    market,
    isLoading,
    error,
  } = useTenantMarket();

  const formatMoney = useCallback(
    (value) => {
      // Never flash the wrong historical currency while the
      // authenticated tenant market is still loading.
      if (!market) return "—";

      return formatTenantMoney(value, market);
    },
    [market],
  );

  return {
    market,
    currencyCode: market ? tenantCurrencyCode(market) : "",
    formatMoney,
    isLoading,
    error,
  };
}
