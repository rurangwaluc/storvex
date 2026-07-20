ALTER TABLE "MarketplaceRequest"
ADD COLUMN IF NOT EXISTS "saleId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS
"MarketplaceRequest_saleId_key"
ON "MarketplaceRequest"("saleId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MarketplaceRequest_saleId_fkey'
  ) THEN
    ALTER TABLE "MarketplaceRequest"
    ADD CONSTRAINT "MarketplaceRequest_saleId_fkey"
    FOREIGN KEY ("saleId")
    REFERENCES "Sale"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;
