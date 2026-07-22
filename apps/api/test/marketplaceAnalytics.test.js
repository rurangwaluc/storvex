const test = require("node:test");
const assert = require("node:assert/strict");

const {
  EVENT_TYPES,
  __private,
} = require("../src/modules/marketplace/marketplace.analytics.service");

test(
  "normalizes a valid product analytics event",
  () => {
    const result =
      __private.normalizeEventPayload({
        eventType:
          "add_to_cart",
        storeSlug:
          "ruraxis-ltd",
        productSlug:
          "samsung-tv",
        visitorId:
          "visitor_1234567890",
        source:
          "Product Details",
      });

    assert.equal(
      result.eventType,
      EVENT_TYPES.ADD_TO_CART,
    );

    assert.equal(
      result.storeSlug,
      "ruraxis-ltd",
    );

    assert.equal(
      result.productSlug,
      "samsung-tv",
    );

    assert.equal(
      result.source,
      "product-details",
    );
  },
);

test(
  "rejects product actions without a product",
  () => {
    assert.throws(
      () =>
        __private.normalizeEventPayload({
          eventType:
            "PRODUCT_VIEW",
          storeSlug:
            "ruraxis-ltd",
          visitorId:
            "visitor_1234567890",
        }),
      (error) =>
        error.code ===
        "MARKETPLACE_ANALYTICS_PRODUCT_REQUIRED",
    );
  },
);

test(
  "normalizes Marketplace search terms",
  () => {
    const result =
      __private.normalizeEventPayload({
        eventType: "SEARCH",
        storeSlug:
          "ruraxis-ltd",
        visitorId:
          "visitor_1234567890",
        searchTerm:
          "  Samsung   Smart TV  ",
        metadata: {
          resultCount: 8,
          ignoredValue:
            "private",
        },
      });

    assert.equal(
      result.searchTerm,
      "samsung smart tv",
    );

    assert.deepEqual(
      result.metadata,
      {
        resultCount: 8,
      },
    );
  },
);

test(
  "rejects malformed visitor identifiers",
  () => {
    assert.throws(
      () =>
        __private.normalizeVisitorId(
          "short",
        ),
      (error) =>
        error.code ===
        "MARKETPLACE_VISITOR_ID_INVALID",
    );
  },
);

test(
  "uses a longer duplicate window for views",
  () => {
    assert.equal(
      __private.duplicateWindowMs(
        EVENT_TYPES.PRODUCT_VIEW,
      ),
      30 * 60 * 1000,
    );

    assert.equal(
      __private.duplicateWindowMs(
        EVENT_TYPES.ADD_TO_CART,
      ),
      10 * 1000,
    );
  },
);

test(
  "calculates safe conversion percentages",
  () => {
    assert.equal(
      __private.percentage(4, 20),
      20,
    );

    assert.equal(
      __private.percentage(4, 0),
      0,
    );
  },
);

test(
  "summarizes Marketplace request outcomes",
  () => {
    const summary =
      __private.buildRequestSummary([
        {
          status:
            "REQUESTED",
          total: 10000,
        },
        {
          status:
            "CONFIRMED",
          total: 12000,
        },
        {
          status:
            "COMPLETED",
          total: 25000,
        },
        {
          status:
            "CANCELLED",
          total: 9000,
        },
      ]);

    assert.equal(
      summary.total,
      4,
    );

    assert.equal(
      summary.confirmed,
      2,
    );

    assert.equal(
      summary.completed,
      1,
    );

    assert.equal(
      summary.cancelled,
      1,
    );

    assert.equal(
      summary.revenue,
      25000,
    );

    assert.equal(
      summary.averageOrderValue,
      25000,
    );
  },
);

test(
  "uses supported analytics date ranges",
  () => {
    assert.equal(
      __private.safeRangeDays(7),
      7,
    );

    assert.equal(
      __private.safeRangeDays(90),
      90,
    );

    assert.equal(
      __private.safeRangeDays(14),
      30,
    );
  },
);

test(
  "starts funnel reporting when tracking begins",
  () => {
    const rangeStart =
      new Date(
        "2026-07-01T00:00:00.000Z",
      );

    const firstEvent =
      new Date(
        "2026-07-22T08:00:00.000Z",
      );

    assert.equal(
      __private
        .effectiveTrackingStart(
          rangeStart,
          firstEvent,
        )
        .toISOString(),
      firstEvent.toISOString(),
    );
  },
);

test(
  "uses the selected range when tracking began earlier",
  () => {
    const rangeStart =
      new Date(
        "2026-07-01T00:00:00.000Z",
      );

    const firstEvent =
      new Date(
        "2026-06-01T00:00:00.000Z",
      );

    assert.equal(
      __private
        .effectiveTrackingStart(
          rangeStart,
          firstEvent,
        )
        .toISOString(),
      rangeStart.toISOString(),
    );
  },
);

test(
  "has no funnel start before activity is tracked",
  () => {
    assert.equal(
      __private.effectiveTrackingStart(
        new Date(),
        null,
      ),
      null,
    );
  },
);
