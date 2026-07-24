DROP TABLE IF EXISTS "MarketplaceRequestDailySequence";

CREATE TABLE "MarketplaceRequestDailySequence" (
  "tenantId" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceRequestDailySequence_pkey"
    PRIMARY KEY ("tenantId", "dateKey")
);

CREATE INDEX
  "MarketplaceRequestDailySequence_dateKey_idx"
ON
  "MarketplaceRequestDailySequence"("dateKey");
