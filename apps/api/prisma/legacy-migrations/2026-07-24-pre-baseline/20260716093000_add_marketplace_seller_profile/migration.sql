CREATE TABLE IF NOT EXISTS "MarketplaceSellerProfile" (
  "tenantId" TEXT NOT NULL,
  "publicSlug" TEXT,
  "displayName" TEXT,
  "description" TEXT,
  "customerPhone" TEXT,
  "whatsappPhone" TEXT,
  "marketplaceEnabled" BOOLEAN NOT NULL DEFAULT false,
  "temporarilyClosed" BOOLEAN NOT NULL DEFAULT false,
  "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
  "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
  "defaultDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deliveryAreas" JSONB,
  "paymentMethods" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceSellerProfile_pkey"
    PRIMARY KEY ("tenantId")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MarketplaceSellerProfile_tenantId_fkey'
  ) THEN
    ALTER TABLE "MarketplaceSellerProfile"
      ADD CONSTRAINT "MarketplaceSellerProfile_tenantId_fkey"
      FOREIGN KEY ("tenantId")
      REFERENCES "Tenant"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS
  "MarketplaceSellerProfile_publicSlug_key"
  ON "MarketplaceSellerProfile"("publicSlug");

CREATE INDEX IF NOT EXISTS
  "MarketplaceSellerProfile_marketplaceEnabled_idx"
  ON "MarketplaceSellerProfile"("marketplaceEnabled");

CREATE INDEX IF NOT EXISTS
  "MarketplaceSellerProfile_temporarilyClosed_idx"
  ON "MarketplaceSellerProfile"("temporarilyClosed");
