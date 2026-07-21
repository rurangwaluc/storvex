ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "marketplaceCustomerId" TEXT;

-- Link historical records only when both directions are unambiguous:
-- one Marketplace account maps to one internal customer, and that
-- internal customer maps to one Marketplace account in the business.
WITH candidate_pairs AS (
  SELECT DISTINCT
    request."tenantId",
    request."marketplaceCustomerId",
    sale."customerId"
  FROM "MarketplaceRequest" AS request
  INNER JOIN "Sale" AS sale
    ON sale."id" = request."saleId"
  WHERE
    request."status" = 'COMPLETED'
    AND request."marketplaceCustomerId" IS NOT NULL
    AND sale."customerId" IS NOT NULL
    AND sale."tenantId" = request."tenantId"
),
unique_marketplace_links AS (
  SELECT
    "tenantId",
    "marketplaceCustomerId",
    MIN("customerId") AS "customerId"
  FROM candidate_pairs
  GROUP BY
    "tenantId",
    "marketplaceCustomerId"
  HAVING COUNT(DISTINCT "customerId") = 1
),
safe_links AS (
  SELECT
    link."tenantId",
    link."marketplaceCustomerId",
    link."customerId"
  FROM unique_marketplace_links AS link
  INNER JOIN candidate_pairs AS candidate
    ON candidate."tenantId" = link."tenantId"
    AND candidate."customerId" = link."customerId"
  GROUP BY
    link."tenantId",
    link."marketplaceCustomerId",
    link."customerId"
  HAVING COUNT(
    DISTINCT candidate."marketplaceCustomerId"
  ) = 1
)
UPDATE "Customer" AS customer
SET "marketplaceCustomerId" =
  link."marketplaceCustomerId"
FROM safe_links AS link
WHERE
  customer."id" = link."customerId"
  AND customer."tenantId" = link."tenantId"
  AND customer."marketplaceCustomerId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
  "Customer_tenantId_marketplaceCustomerId_key"
ON "Customer"(
  "tenantId",
  "marketplaceCustomerId"
);

CREATE INDEX IF NOT EXISTS
  "Customer_marketplaceCustomerId_idx"
ON "Customer"(
  "marketplaceCustomerId"
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'Customer_marketplaceCustomerId_fkey'
  ) THEN
    ALTER TABLE "Customer"
    ADD CONSTRAINT
      "Customer_marketplaceCustomerId_fkey"
    FOREIGN KEY (
      "marketplaceCustomerId"
    )
    REFERENCES "MarketplaceCustomer"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;
