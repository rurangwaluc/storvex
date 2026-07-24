ALTER TABLE "MarketplaceRequest"
ADD COLUMN IF NOT EXISTS "fulfilmentBranchId" TEXT;

UPDATE "MarketplaceRequest" AS request
SET "fulfilmentBranchId" = reservation."branchId"
FROM (
  SELECT
    "requestId",
    MIN("branchId") AS "branchId"
  FROM "MarketplaceRequestReservation"
  WHERE
    "releasedAt" IS NULL
    AND "completedAt" IS NULL
  GROUP BY "requestId"
  HAVING COUNT(DISTINCT "branchId") = 1
) AS reservation
WHERE
  request."id" = reservation."requestId"
  AND request."fulfilmentBranchId" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'MarketplaceRequest_fulfilmentBranchId_fkey'
  ) THEN
    ALTER TABLE "MarketplaceRequest"
    ADD CONSTRAINT
      "MarketplaceRequest_fulfilmentBranchId_fkey"
    FOREIGN KEY ("fulfilmentBranchId")
    REFERENCES "Branch"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS
  "MarketplaceRequest_tenantId_fulfilmentBranchId_idx"
ON "MarketplaceRequest"(
  "tenantId",
  "fulfilmentBranchId"
);
