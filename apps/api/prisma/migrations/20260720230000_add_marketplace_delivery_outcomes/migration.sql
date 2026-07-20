DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    INNER JOIN pg_type t
      ON t.oid = e.enumtypid
    WHERE
      t.typname = 'MarketplaceRequestStatus'
      AND e.enumlabel = 'DELIVERY_FAILED'
  ) THEN
    ALTER TYPE "MarketplaceRequestStatus"
      ADD VALUE 'DELIVERY_FAILED'
      BEFORE 'COMPLETED';
  END IF;
END
$$;

ALTER TABLE "MarketplaceRequest"
  ADD COLUMN IF NOT EXISTS "deliveryFailedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveryFailureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryFailureNote" TEXT;

ALTER TABLE "Sale"
  ADD COLUMN IF NOT EXISTS "deliveryFee"
  DOUBLE PRECISION NOT NULL DEFAULT 0;
