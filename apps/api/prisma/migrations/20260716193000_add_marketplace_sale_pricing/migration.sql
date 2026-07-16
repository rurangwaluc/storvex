ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "marketplaceSalePrice"
  DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "marketplaceSaleStartsAt"
  TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "marketplaceSaleEndsAt"
  TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'Product_marketplaceSalePrice_nonnegative'
  ) THEN
    ALTER TABLE "Product"
    ADD CONSTRAINT
      "Product_marketplaceSalePrice_nonnegative"
    CHECK (
      "marketplaceSalePrice" IS NULL
      OR "marketplaceSalePrice" >= 0
    );
  END IF;
END
$$;
