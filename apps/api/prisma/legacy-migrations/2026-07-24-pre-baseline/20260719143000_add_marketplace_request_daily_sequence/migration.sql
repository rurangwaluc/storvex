CREATE TABLE "MarketplaceRequestDailySequence" (
  "dateKey" TEXT NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceRequestDailySequence_pkey"
    PRIMARY KEY ("dateKey")
);
