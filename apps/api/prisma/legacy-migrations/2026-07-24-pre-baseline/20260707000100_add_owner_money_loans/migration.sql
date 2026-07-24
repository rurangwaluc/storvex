-- Owner money loans for Storvex Money control room.
-- Loans are separate from expenses, sales, and supplier bills because loans must be paid back.

DO $$ BEGIN
  CREATE TYPE "OwnerLoanType" AS ENUM ('GIVEN_OUT', 'RECEIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OwnerLoanStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OwnerLoanPaymentMethod" AS ENUM ('CASH', 'MOMO', 'BANK', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "OwnerLoan" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "type" "OwnerLoanType" NOT NULL,
  "partyName" TEXT NOT NULL,
  "partyPhone" TEXT,
  "originalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" "OwnerLoanStatus" NOT NULL DEFAULT 'OPEN',
  "paymentMethod" "OwnerLoanPaymentMethod" NOT NULL DEFAULT 'CASH',
  "reference" TEXT,
  "note" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),

  CONSTRAINT "OwnerLoan_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "OwnerLoan_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "OwnerLoanPayment" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "loanId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "method" "OwnerLoanPaymentMethod" NOT NULL DEFAULT 'CASH',
  "reference" TEXT,
  "note" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OwnerLoanPayment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "OwnerLoanPayment_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT "OwnerLoanPayment_loanId_fkey"
    FOREIGN KEY ("loanId") REFERENCES "OwnerLoan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OwnerLoan_tenantId_idx" ON "OwnerLoan"("tenantId");
CREATE INDEX IF NOT EXISTS "OwnerLoan_branchId_idx" ON "OwnerLoan"("branchId");
CREATE INDEX IF NOT EXISTS "OwnerLoan_tenantId_type_status_idx" ON "OwnerLoan"("tenantId", "type", "status");
CREATE INDEX IF NOT EXISTS "OwnerLoan_tenantId_startedAt_idx" ON "OwnerLoan"("tenantId", "startedAt");
CREATE INDEX IF NOT EXISTS "OwnerLoan_tenantId_archivedAt_idx" ON "OwnerLoan"("tenantId", "archivedAt");

CREATE INDEX IF NOT EXISTS "OwnerLoanPayment_tenantId_idx" ON "OwnerLoanPayment"("tenantId");
CREATE INDEX IF NOT EXISTS "OwnerLoanPayment_branchId_idx" ON "OwnerLoanPayment"("branchId");
CREATE INDEX IF NOT EXISTS "OwnerLoanPayment_loanId_idx" ON "OwnerLoanPayment"("loanId");
CREATE INDEX IF NOT EXISTS "OwnerLoanPayment_tenantId_paidAt_idx" ON "OwnerLoanPayment"("tenantId", "paidAt");
