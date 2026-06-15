DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductMarketplaceStatus') THEN
    CREATE TYPE "ProductMarketplaceStatus" AS ENUM ('INTERNAL', 'DRAFT', 'PUBLISHED', 'UNPUBLISHED');
  END IF;
END $$;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "categoryAttributes" JSONB,
  ADD COLUMN IF NOT EXISTS "marketplaceStatus" "ProductMarketplaceStatus" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS "marketplaceTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "marketplaceDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "marketplacePrice" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "marketplaceCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "marketplaceAttributes" JSONB,
  ADD COLUMN IF NOT EXISTS "marketplaceSlug" TEXT,
  ADD COLUMN IF NOT EXISTS "marketplacePublishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "marketplaceUnpublishedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ProductImage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "key" TEXT,
  "altText" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductImage_tenantId_fkey'
  ) THEN
    ALTER TABLE "ProductImage"
      ADD CONSTRAINT "ProductImage_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductImage_productId_fkey'
  ) THEN
    ALTER TABLE "ProductImage"
      ADD CONSTRAINT "ProductImage_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Product_tenantId_marketplaceSlug_key"
  ON "Product"("tenantId", "marketplaceSlug");

CREATE INDEX IF NOT EXISTS "Product_tenantId_marketplaceStatus_idx"
  ON "Product"("tenantId", "marketplaceStatus");

CREATE INDEX IF NOT EXISTS "Product_tenantId_marketplaceCategory_idx"
  ON "Product"("tenantId", "marketplaceCategory");

CREATE INDEX IF NOT EXISTS "ProductImage_tenantId_idx"
  ON "ProductImage"("tenantId");

CREATE INDEX IF NOT EXISTS "ProductImage_tenantId_productId_idx"
  ON "ProductImage"("tenantId", "productId");

CREATE INDEX IF NOT EXISTS "ProductImage_tenantId_productId_isPrimary_idx"
  ON "ProductImage"("tenantId", "productId", "isPrimary");
