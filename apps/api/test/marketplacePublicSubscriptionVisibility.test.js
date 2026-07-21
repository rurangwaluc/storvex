"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isPublicMarketplaceSubscriptionVisible,
} = require(
  "../src/modules/marketplace/marketplace.public.service",
);

const now = new Date(
  "2026-07-21T12:00:00.000Z",
);

test(
  "hides Marketplace access without a subscription",
  () => {
    assert.equal(
      isPublicMarketplaceSubscriptionVisible(
        null,
        now,
      ),
      false,
    );
  },
);

test(
  "shows Marketplace access during an active trial",
  () => {
    assert.equal(
      isPublicMarketplaceSubscriptionVisible(
        {
          status: "ACTIVE",
          accessMode: "TRIAL",
          endDate:
            "2026-07-25T12:00:00.000Z",
          graceEndDate:
            "2026-07-28T12:00:00.000Z",
        },
        now,
      ),
      true,
    );
  },
);

test(
  "shows Marketplace access during an active paid plan",
  () => {
    assert.equal(
      isPublicMarketplaceSubscriptionVisible(
        {
          status: "ACTIVE",
          accessMode: "ACTIVE",
          endDate:
            "2026-08-21T12:00:00.000Z",
          graceEndDate:
            "2026-08-24T12:00:00.000Z",
        },
        now,
      ),
      true,
    );
  },
);

test(
  "shows Marketplace access during grace",
  () => {
    assert.equal(
      isPublicMarketplaceSubscriptionVisible(
        {
          status: "EXPIRED",
          accessMode: "READ_ONLY",
          endDate:
            "2026-07-20T12:00:00.000Z",
          graceEndDate:
            "2026-07-23T12:00:00.000Z",
        },
        now,
      ),
      true,
    );
  },
);

test(
  "hides Marketplace access after grace expires",
  () => {
    assert.equal(
      isPublicMarketplaceSubscriptionVisible(
        {
          status: "EXPIRED",
          accessMode: "READ_ONLY",
          endDate:
            "2026-07-15T12:00:00.000Z",
          graceEndDate:
            "2026-07-18T12:00:00.000Z",
        },
        now,
      ),
      false,
    );
  },
);

test(
  "hides suspended Marketplace access",
  () => {
    assert.equal(
      isPublicMarketplaceSubscriptionVisible(
        {
          status: "SUSPENDED",
          accessMode: "SUSPENDED",
          endDate:
            "2026-08-21T12:00:00.000Z",
          graceEndDate:
            "2026-08-24T12:00:00.000Z",
        },
        now,
      ),
      false,
    );
  },
);

test(
  "restores Marketplace visibility after renewal",
  () => {
    const expired = {
      status: "EXPIRED",
      accessMode: "READ_ONLY",
      endDate:
        "2026-07-15T12:00:00.000Z",
      graceEndDate:
        "2026-07-18T12:00:00.000Z",
    };

    const renewed = {
      status: "ACTIVE",
      accessMode: "ACTIVE",
      endDate:
        "2026-08-21T12:00:00.000Z",
      graceEndDate:
        "2026-08-24T12:00:00.000Z",
    };

    assert.equal(
      isPublicMarketplaceSubscriptionVisible(
        expired,
        now,
      ),
      false,
    );

    assert.equal(
      isPublicMarketplaceSubscriptionVisible(
        renewed,
        now,
      ),
      true,
    );
  },
);
