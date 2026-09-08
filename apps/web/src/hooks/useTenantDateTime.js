import { useCallback } from "react";

import useTenantMarket from "./useTenantMarket";
import {
  formatTenantDate,
  formatTenantDateTime,
  tenantDateInput,
  tenantDaysUntil,
  tenantTimezone,
} from "../lib/tenantDateTime";

export default function useTenantDateTime() {
  const {
    market,
    isLoading,
    error,
  } = useTenantMarket();

  const formatDate = useCallback(
    (value, fallback = "—") => {
      if (!market) return fallback;

      return formatTenantDate(
        value,
        market,
        fallback,
      );
    },
    [market],
  );

  const formatDateTime = useCallback(
    (value) => {
      if (!market) return "—";

      return formatTenantDateTime(
        value,
        market,
      );
    },
    [market],
  );

  const dateInput = useCallback(
    (value) => {
      if (!market) return "";

      return tenantDateInput(
        value,
        market,
      );
    },
    [market],
  );

  const daysUntil = useCallback(
    (value) => {
      if (!market) return null;

      return tenantDaysUntil(
        value,
        market,
      );
    },
    [market],
  );

  return {
    market,
    timezone: market ? tenantTimezone(market) : "",
    formatDate,
    formatDateTime,
    dateInput,
    daysUntil,
    isLoading,
    error,
  };
}
