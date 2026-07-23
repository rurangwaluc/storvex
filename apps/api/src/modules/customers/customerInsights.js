function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function safeDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function marketplaceSale(sale) {
  return (
    String(sale?.draftSource || "")
      .trim()
      .toUpperCase() === "MARKETPLACE" ||
    Boolean(sale?.marketplaceRequest)
  );
}

function customerSource({
  marketplaceSales = 0,
  storeSales = 0,
} = {}) {
  const hasMarketplace =
    safeNumber(marketplaceSales) > 0;

  const hasStore =
    safeNumber(storeSales) > 0;

  if (hasMarketplace && hasStore) {
    return "BOTH";
  }

  if (hasMarketplace) {
    return "MARKETPLACE";
  }

  return "STORE";
}

function createEmptyActivity() {
  return {
    totalSales: 0,
    storeSales: 0,
    marketplaceSales: 0,
    totalBusiness: 0,
    totalPaid: 0,
    outstanding: 0,
    lastActivityAt: null,
  };
}

function aggregateCustomerActivity(sales = []) {
  const byCustomerId = new Map();

  for (const sale of sales) {
    const customerId =
      String(sale?.customerId || "").trim();

    if (!customerId) continue;

    const current =
      byCustomerId.get(customerId) ||
      createEmptyActivity();

    current.totalSales += 1;
    current.totalBusiness +=
      safeNumber(sale?.total);
    current.totalPaid +=
      safeNumber(sale?.amountPaid);
    current.outstanding +=
      safeNumber(sale?.balanceDue);

    if (marketplaceSale(sale)) {
      current.marketplaceSales += 1;
    } else {
      current.storeSales += 1;
    }

    const saleDate =
      safeDate(sale?.createdAt);

    const previousDate =
      safeDate(current.lastActivityAt);

    if (
      saleDate &&
      (
        !previousDate ||
        saleDate > previousDate
      )
    ) {
      current.lastActivityAt =
        saleDate.toISOString();
    }

    byCustomerId.set(
      customerId,
      current,
    );
  }

  return byCustomerId;
}

function enrichCustomer(
  customer,
  activity,
) {
  const totals = activity || createEmptyActivity();

  return {
    ...customer,
    totalSales:
      safeNumber(totals.totalSales),
    storeSales:
      safeNumber(totals.storeSales),
    marketplaceSales:
      safeNumber(totals.marketplaceSales),
    marketplaceOrders:
      safeNumber(totals.marketplaceSales),
    totalBusiness:
      safeNumber(totals.totalBusiness),
    totalPaid:
      safeNumber(totals.totalPaid),
    outstanding:
      safeNumber(totals.outstanding),
    lastActivityAt:
      totals.lastActivityAt ||
      customer?.updatedAt ||
      customer?.createdAt ||
      null,
    source: customerSource(totals),
    marketplaceLinked:
      Boolean(
        customer?.marketplaceCustomerId,
      ),
  };
}

function normalizeSourceFilter(value) {
  const source =
    String(value || "ALL")
      .trim()
      .toUpperCase();

  return [
    "ALL",
    "STORE",
    "MARKETPLACE",
    "BOTH",
  ].includes(source)
    ? source
    : "ALL";
}

function matchesCustomerFilters(
  customer,
  {
    source = "ALL",
    withOutstanding = false,
  } = {},
) {
  const normalizedSource =
    normalizeSourceFilter(source);

  if (
    normalizedSource !== "ALL" &&
    customer?.source !== normalizedSource
  ) {
    return false;
  }

  if (
    withOutstanding &&
    safeNumber(customer?.outstanding) <= 0
  ) {
    return false;
  }

  return true;
}

function customerActivityTime(customer) {
  const date =
    safeDate(customer?.lastActivityAt);

  return date
    ? date.getTime()
    : 0;
}

function sortCustomersByActivity(customers = []) {
  return [...customers].sort(
    (left, right) => {
      const activityDifference =
        customerActivityTime(right) -
        customerActivityTime(left);

      if (activityDifference !== 0) {
        return activityDifference;
      }

      return String(left?.name || "")
        .localeCompare(
          String(right?.name || ""),
        );
    },
  );
}

module.exports = {
  aggregateCustomerActivity,
  customerSource,
  enrichCustomer,
  marketplaceSale,
  matchesCustomerFilters,
  normalizeSourceFilter,
  sortCustomersByActivity,
};
