-- Money accounts for non-cash payment methods.
-- Cash remains controlled by the cash drawer session.
-- MoMo, Bank, and Other are controlled here so loans cannot create invisible negative balances.

DO $$ BEGIN
  CREATE TYPE "MoneyAccountType" AS ENUM ('MOMO', 'BANK', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MoneyMovementDirection" AS ENUM ('IN', 'OUT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MoneyMovementReason" AS ENUM (
    'OPENING_BALANCE',
    'LOAN_GIVEN_OUT',
    'LOAN_RECEIVED',
    'LOAN_REPAYMENT',
    'OWNER_ADJUSTMENT',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MoneyAccount" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "accountType" "MoneyAccountType" NOT NULL,
  "label" TEXT NOT NULL,
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isSystem" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MoneyAccount_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "MoneyAccount_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MoneyAccountMovement" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "accountId" TEXT NOT NULL,
  "direction" "MoneyMovementDirection" NOT NULL,
  "reason" "MoneyMovementReason" NOT NULL DEFAULT 'OTHER',
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "balanceBefore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "balanceAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MoneyAccountMovement_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "MoneyAccountMovement_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT "MoneyAccountMovement_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MoneyAccount_tenantId_branchId_accountType_key"
  ON "MoneyAccount"("tenantId", "branchId", "accountType");

CREATE INDEX IF NOT EXISTS "MoneyAccount_tenantId_idx" ON "MoneyAccount"("tenantId");
CREATE INDEX IF NOT EXISTS "MoneyAccount_branchId_idx" ON "MoneyAccount"("branchId");
CREATE INDEX IF NOT EXISTS "MoneyAccount_tenantId_accountType_idx" ON "MoneyAccount"("tenantId", "accountType");

CREATE INDEX IF NOT EXISTS "MoneyAccountMovement_tenantId_idx" ON "MoneyAccountMovement"("tenantId");
CREATE INDEX IF NOT EXISTS "MoneyAccountMovement_branchId_idx" ON "MoneyAccountMovement"("branchId");
CREATE INDEX IF NOT EXISTS "MoneyAccountMovement_accountId_idx" ON "MoneyAccountMovement"("accountId");
CREATE INDEX IF NOT EXISTS "MoneyAccountMovement_tenantId_createdAt_idx" ON "MoneyAccountMovement"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "MoneyAccountMovement_source_idx" ON "MoneyAccountMovement"("sourceType", "sourceId");
