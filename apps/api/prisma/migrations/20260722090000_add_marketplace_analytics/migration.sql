DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'MarketplaceAnalyticsEventType'
  ) THEN
    CREATE TYPE "MarketplaceAnalyticsEventType" AS ENUM (
      'STORE_VIEW',
      'PRODUCT_VIEW',
      'PRODUCT_CARD_OPEN',
      'ADD_TO_CART',
      'SAVE_PRODUCT',
      'ADD_TO_COMPARE',
      'SEARCH',
      'SEARCH_NO_RESULTS'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "MarketplaceAnalyticsEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT,
  "marketplaceCustomerId" TEXT,
  "visitorId" VARCHAR(80),
  "eventType" "MarketplaceAnalyticsEventType" NOT NULL,
  "searchTerm" TEXT,
  "source" VARCHAR(80),
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceAnalyticsEvent_pkey"
    PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS
  "MarketplaceAnalyticsEvent_tenantId_occurredAt_idx"
ON "MarketplaceAnalyticsEvent"(
  "tenantId",
  "occurredAt"
);

CREATE INDEX IF NOT EXISTS
  "MarketplaceAnalyticsEvent_tenantId_eventType_occurredAt_idx"
ON "MarketplaceAnalyticsEvent"(
  "tenantId",
  "eventType",
  "occurredAt"
);

CREATE INDEX IF NOT EXISTS
  "MarketplaceAnalyticsEvent_tenantId_productId_occurredAt_idx"
ON "MarketplaceAnalyticsEvent"(
  "tenantId",
  "productId",
  "occurredAt"
);

CREATE INDEX IF NOT EXISTS
  "MarketplaceAnalyticsEvent_tenantId_searchTerm_occurredAt_idx"
ON "MarketplaceAnalyticsEvent"(
  "tenantId",
  "searchTerm",
  "occurredAt"
);

CREATE INDEX IF NOT EXISTS
  "MarketplaceAnalyticsEvent_visitorId_eventType_occurredAt_idx"
ON "MarketplaceAnalyticsEvent"(
  "visitorId",
  "eventType",
  "occurredAt"
);

CREATE INDEX IF NOT EXISTS
  "MarketplaceAnalyticsEvent_marketplaceCustomerId_eventType_occurredAt_idx"
ON "MarketplaceAnalyticsEvent"(
  "marketplaceCustomerId",
  "eventType",
  "occurredAt"
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'MarketplaceAnalyticsEvent_tenantId_fkey'
  ) THEN
    ALTER TABLE "MarketplaceAnalyticsEvent"
    ADD CONSTRAINT
      "MarketplaceAnalyticsEvent_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'MarketplaceAnalyticsEvent_productId_fkey'
  ) THEN
    ALTER TABLE "MarketplaceAnalyticsEvent"
    ADD CONSTRAINT
      "MarketplaceAnalyticsEvent_productId_fkey"
    FOREIGN KEY ("productId")
    REFERENCES "Product"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'MarketplaceAnalyticsEvent_marketplaceCustomerId_fkey'
  ) THEN
    ALTER TABLE "MarketplaceAnalyticsEvent"
    ADD CONSTRAINT
      "MarketplaceAnalyticsEvent_marketplaceCustomerId_fkey"
    FOREIGN KEY ("marketplaceCustomerId")
    REFERENCES "MarketplaceCustomer"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;
