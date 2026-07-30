-- Add explicit second-level and third-level Marketplace categories.
--
-- This migration is intentionally idempotent because some Storvex
-- environments have an older Prisma migration history.
--
-- Existing Marketplace attributes are preserved. Known legacy laptop
-- listings are normalized into the controlled Marketplace catalogue.

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS
    "marketplaceSubcategory" TEXT,
  ADD COLUMN IF NOT EXISTS
    "marketplaceLeafCategory" TEXT;

-- Backfill legacy laptop listings:
--
-- Electronics
--   Computers
--     Laptops
UPDATE "Product"
SET
  "marketplaceCategory" = 'electronics',
  "marketplaceSubcategory" = 'computers',
  "marketplaceLeafCategory" = 'laptops',
  "marketplaceAttributes" =
    COALESCE(
      "marketplaceAttributes",
      '{}'::jsonb
    ) ||
    jsonb_build_object(
      'category',
      'Electronics',
      'categorySlug',
      'electronics',
      'subcategory',
      'Computers',
      'subcategorySlug',
      'computers',
      'leafCategory',
      'Laptops',
      'leafCategorySlug',
      'laptops',
      'subSubcategory',
      'Laptops'
    )
WHERE
  lower(
    regexp_replace(
      COALESCE(
        "marketplaceCategory",
        "category",
        ''
      ),
      '[^a-zA-Z0-9]+',
      '',
      'g'
    )
  ) IN (
    'laptop',
    'laptops'
  );

CREATE INDEX IF NOT EXISTS
  "Product_tenantId_marketplaceSubcategory_idx"
  ON "Product"(
    "tenantId",
    "marketplaceSubcategory"
  );

CREATE INDEX IF NOT EXISTS
  "Product_tenantId_marketplaceLeafCategory_idx"
  ON "Product"(
    "tenantId",
    "marketplaceLeafCategory"
  );
