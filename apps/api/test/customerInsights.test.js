const test = require("node:test");
const assert = require("node:assert/strict");

const {
  aggregateCustomerActivity,
  customerSource,
  enrichCustomer,
  marketplaceSale,
  matchesCustomerFilters,
  normalizeSourceFilter,
  sortCustomersByActivity,
} = require(
  "../src/modules/customers/customerInsights",
);

test(
  "detects Marketplace sales from their source",
  () => {
    assert.equal(
      marketplaceSale({
        draftSource: "MARKETPLACE",
      }),
      true,
    );

    assert.equal(
      marketplaceSale({
        draftSource: null,
        marketplaceRequest: {
          id: "request-1",
        },
      }),
      true,
    );

    assert.equal(
      marketplaceSale({
        draftSource: "POS",
      }),
      false,
    );
  },
);

test(
  "aggregates Store and Marketplace customer activity",
  () => {
    const activity =
      aggregateCustomerActivity([
        {
          customerId: "customer-1",
          total: 10000,
          amountPaid: 10000,
          balanceDue: 0,
          createdAt:
            "2026-07-20T10:00:00.000Z",
          draftSource: "POS",
          marketplaceRequest: null,
        },
        {
          customerId: "customer-1",
          total: 25000,
          amountPaid: 15000,
          balanceDue: 10000,
          createdAt:
            "2026-07-22T10:00:00.000Z",
          draftSource:
            "MARKETPLACE",
          marketplaceRequest: {
            id: "request-1",
          },
        },
      ]);

    assert.deepEqual(
      activity.get("customer-1"),
      {
        totalSales: 2,
        storeSales: 1,
        marketplaceSales: 1,
        totalBusiness: 35000,
        totalPaid: 25000,
        outstanding: 10000,
        lastActivityAt:
          "2026-07-22T10:00:00.000Z",
      },
    );
  },
);

test(
  "classifies customer activity sources",
  () => {
    assert.equal(
      customerSource({
        storeSales: 2,
        marketplaceSales: 0,
      }),
      "STORE",
    );

    assert.equal(
      customerSource({
        storeSales: 0,
        marketplaceSales: 2,
      }),
      "MARKETPLACE",
    );

    assert.equal(
      customerSource({
        storeSales: 1,
        marketplaceSales: 1,
      }),
      "BOTH",
    );
  },
);

test(
  "keeps a Marketplace account link visible without sales",
  () => {
    const customer =
      enrichCustomer(
        {
          id: "customer-1",
          name: "Luc",
          marketplaceCustomerId:
            "marketplace-1",
          createdAt:
            "2026-07-20T10:00:00.000Z",
        },
        null,
      );

    assert.equal(
      customer.marketplaceLinked,
      true,
    );

    assert.equal(
      customer.source,
      "STORE",
    );

    assert.equal(
      customer.totalBusiness,
      0,
    );
  },
);

test(
  "supports customer source and outstanding filters",
  () => {
    const customer = {
      source: "BOTH",
      outstanding: 5000,
    };

    assert.equal(
      matchesCustomerFilters(
        customer,
        {
          source: "BOTH",
          withOutstanding: true,
        },
      ),
      true,
    );

    assert.equal(
      matchesCustomerFilters(
        customer,
        {
          source: "MARKETPLACE",
        },
      ),
      false,
    );
  },
);

test(
  "normalizes unsupported source filters",
  () => {
    assert.equal(
      normalizeSourceFilter(
        "marketplace",
      ),
      "MARKETPLACE",
    );

    assert.equal(
      normalizeSourceFilter(
        "unknown",
      ),
      "ALL",
    );
  },
);

test(
  "sorts customers by their latest activity",
  () => {
    const sorted =
      sortCustomersByActivity([
        {
          id: "older",
          name: "Older",
          lastActivityAt:
            "2026-07-20T10:00:00.000Z",
        },
        {
          id: "newer",
          name: "Newer",
          lastActivityAt:
            "2026-07-22T10:00:00.000Z",
        },
      ]);

    assert.equal(
      sorted[0].id,
      "newer",
    );

    assert.equal(
      sorted[1].id,
      "older",
    );
  },
);
