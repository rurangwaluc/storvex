-- Marketplace customer accounts existed before Storvex Marketplace became
-- Africa-market aware. Marketplace was only enabled for Rwanda at that time,
-- so RW is the correct historical backfill value.
ALTER TABLE "MarketplaceCustomer"
ADD COLUMN "countryCode" TEXT;

UPDATE "MarketplaceCustomer"
SET "countryCode" = 'RW'
WHERE "countryCode" IS NULL;

ALTER TABLE "MarketplaceCustomer"
ALTER COLUMN "countryCode" SET NOT NULL;

CREATE INDEX "MarketplaceCustomer_countryCode_idx"
ON "MarketplaceCustomer"("countryCode");
