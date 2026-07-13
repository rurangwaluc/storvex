DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ProductImageType'
  ) THEN
    CREATE TYPE "ProductImageType" AS ENUM (
      'ORIGINAL',
      'CLEANED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ProductImageStudioStatus'
  ) THEN
    CREATE TYPE "ProductImageStudioStatus" AS ENUM (
      'PENDING',
      'PROCESSING',
      'REVIEW',
      'READY',
      'FAILED'
    );
  END IF;
END $$;

ALTER TABLE "ProductImage"
  ADD COLUMN IF NOT EXISTS "imageType"
    "ProductImageType" NOT NULL DEFAULT 'ORIGINAL',
  ADD COLUMN IF NOT EXISTS "sourceImageId" TEXT,
  ADD COLUMN IF NOT EXISTS "isMarketplaceApproved"
    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedById" TEXT,
  ADD COLUMN IF NOT EXISTS "studioVersion"
    INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "ProductImageStudioRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sourceImageId" TEXT NOT NULL,
  "resultImageId" TEXT,
  "status" "ProductImageStudioStatus" NOT NULL DEFAULT 'PENDING',
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "requestedById" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductImageStudioRun_pkey"
    PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ProductImage_sourceImageId_fkey'
  ) THEN
    ALTER TABLE "ProductImage"
      ADD CONSTRAINT "ProductImage_sourceImageId_fkey"
      FOREIGN KEY ("sourceImageId")
      REFERENCES "ProductImage"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ProductImageStudioRun_tenantId_fkey'
  ) THEN
    ALTER TABLE "ProductImageStudioRun"
      ADD CONSTRAINT "ProductImageStudioRun_tenantId_fkey"
      FOREIGN KEY ("tenantId")
      REFERENCES "Tenant"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ProductImageStudioRun_productId_fkey'
  ) THEN
    ALTER TABLE "ProductImageStudioRun"
      ADD CONSTRAINT "ProductImageStudioRun_productId_fkey"
      FOREIGN KEY ("productId")
      REFERENCES "Product"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ProductImageStudioRun_sourceImageId_fkey'
  ) THEN
    ALTER TABLE "ProductImageStudioRun"
      ADD CONSTRAINT "ProductImageStudioRun_sourceImageId_fkey"
      FOREIGN KEY ("sourceImageId")
      REFERENCES "ProductImage"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ProductImageStudioRun_resultImageId_fkey'
  ) THEN
    ALTER TABLE "ProductImageStudioRun"
      ADD CONSTRAINT "ProductImageStudioRun_resultImageId_fkey"
      FOREIGN KEY ("resultImageId")
      REFERENCES "ProductImage"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS
  "ProductImage_tenantId_productId_imageType_idx"
  ON "ProductImage"(
    "tenantId",
    "productId",
    "imageType"
  );

CREATE INDEX IF NOT EXISTS
  "ProductImage_tenantId_sourceImageId_idx"
  ON "ProductImage"(
    "tenantId",
    "sourceImageId"
  );

CREATE INDEX IF NOT EXISTS
  "ProductImage_tenantId_productId_isMarketplaceApproved_idx"
  ON "ProductImage"(
    "tenantId",
    "productId",
    "isMarketplaceApproved"
  );

CREATE INDEX IF NOT EXISTS
  "ProductImageStudioRun_tenantId_idx"
  ON "ProductImageStudioRun"("tenantId");

CREATE INDEX IF NOT EXISTS
  "ProductImageStudioRun_tenantId_productId_idx"
  ON "ProductImageStudioRun"(
    "tenantId",
    "productId"
  );

CREATE INDEX IF NOT EXISTS
  "ProductImageStudioRun_tenantId_sourceImageId_idx"
  ON "ProductImageStudioRun"(
    "tenantId",
    "sourceImageId"
  );

CREATE INDEX IF NOT EXISTS
  "ProductImageStudioRun_tenantId_productId_status_idx"
  ON "ProductImageStudioRun"(
    "tenantId",
    "productId",
    "status"
  );

CREATE INDEX IF NOT EXISTS
  "ProductImageStudioRun_resultImageId_idx"
  ON "ProductImageStudioRun"("resultImageId");
