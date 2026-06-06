ALTER TABLE "Sale"
  ADD COLUMN IF NOT EXISTS "subtotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxableAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxName" TEXT,
  ADD COLUMN IF NOT EXISTS "taxMode" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "taxDisplayMode" TEXT NOT NULL DEFAULT 'HIDDEN',
  ADD COLUMN IF NOT EXISTS "taxRateBps" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "showTaxOnCustomerDocuments" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Sale"
SET
  "subtotalAmount" = COALESCE("total", 0),
  "taxableAmount" = COALESCE("total", 0),
  "taxMode" = 'NONE',
  "taxDisplayMode" = 'HIDDEN',
  "taxRateBps" = 0,
  "taxAmount" = 0,
  "pricesIncludeTax" = false,
  "showTaxOnCustomerDocuments" = false
WHERE "subtotalAmount" = 0
  AND "taxableAmount" = 0
  AND "taxAmount" = 0;

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_taxMode_check"
  CHECK ("taxMode" IN ('NONE', 'VAT_18', 'TURNOVER_3_INTERNAL', 'VAT_18_PLUS_TURNOVER_3', 'CUSTOM'));

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_taxDisplayMode_check"
  CHECK ("taxDisplayMode" IN ('HIDDEN', 'CUSTOMER_FACING', 'INTERNAL_ONLY'));

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_taxRateBps_check"
  CHECK ("taxRateBps" >= 0 AND "taxRateBps" <= 10000);

CREATE INDEX IF NOT EXISTS "Sale_tenantId_taxMode_idx"
  ON "Sale" ("tenantId", "taxMode");

CREATE INDEX IF NOT EXISTS "Sale_tenantId_createdAt_taxMode_idx"
  ON "Sale" ("tenantId", "createdAt", "taxMode");