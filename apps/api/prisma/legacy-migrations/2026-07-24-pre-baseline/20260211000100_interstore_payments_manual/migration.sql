CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterStorePaymentMethod') THEN
    CREATE TYPE "InterStorePaymentMethod" AS ENUM ('CASH', 'MOMO', 'BANK', 'OTHER');
  END IF;
END $$;

-- 2) Table
CREATE TABLE IF NOT EXISTS "InterStorePayment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "dealId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "receivedById" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "method" "InterStorePaymentMethod" NOT NULL DEFAULT 'CASH',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterStorePayment_pkey" PRIMARY KEY ("id")
);

-- 3) Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InterStorePayment_dealId_fkey') THEN
    ALTER TABLE "InterStorePayment"
      ADD CONSTRAINT "InterStorePayment_dealId_fkey"
      FOREIGN KEY ("dealId") REFERENCES "InterStoreDeal"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InterStorePayment_tenantId_fkey') THEN
    ALTER TABLE "InterStorePayment"
      ADD CONSTRAINT "InterStorePayment_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InterStorePayment_receivedById_fkey') THEN
    ALTER TABLE "InterStorePayment"
      ADD CONSTRAINT "InterStorePayment_receivedById_fkey"
      FOREIGN KEY ("receivedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) Indexes
CREATE INDEX IF NOT EXISTS "InterStorePayment_dealId_idx" ON "InterStorePayment" ("dealId");
CREATE INDEX IF NOT EXISTS "InterStorePayment_tenantId_idx" ON "InterStorePayment" ("tenantId");
CREATE INDEX IF NOT EXISTS "InterStorePayment_receivedById_idx" ON "InterStorePayment" ("receivedById");
