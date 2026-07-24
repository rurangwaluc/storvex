-- Supplier money layer: bills, payments, balances, documents

DO $$ BEGIN
  CREATE TYPE "SupplierBillStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupplierPaymentMethod" AS ENUM ('CASH', 'MOMO', 'BANK', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupplierDocumentType" AS ENUM ('BILL', 'RECEIPT', 'DELIVERY_NOTE', 'PURCHASE_ORDER', 'PHOTO', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "SupplierBill" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "supplierId" TEXT NOT NULL,
  "supplyId" TEXT,
  "purchaseOrderId" TEXT,
  "billNumber" TEXT,
  "status" "SupplierBillStatus" NOT NULL DEFAULT 'UNPAID',
  "billDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" DATE,
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "documentRef" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupplierBill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupplierBillItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "billId" TEXT NOT NULL,
  "productId" TEXT,
  "productName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupplierBillItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupplierPayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "supplierId" TEXT NOT NULL,
  "billId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "method" "SupplierPaymentMethod" NOT NULL DEFAULT 'CASH',
  "reference" TEXT,
  "note" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "cashMovementId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupplierDocument" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "supplierId" TEXT NOT NULL,
  "billId" TEXT,
  "supplyId" TEXT,
  "purchaseOrderId" TEXT,
  "type" "SupplierDocumentType" NOT NULL DEFAULT 'OTHER',
  "title" TEXT NOT NULL,
  "documentRef" TEXT,
  "url" TEXT,
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupplierDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SupplierBill_tenantId_billNumber_key"
  ON "SupplierBill"("tenantId", "billNumber");

CREATE INDEX IF NOT EXISTS "SupplierBill_tenantId_idx" ON "SupplierBill"("tenantId");
CREATE INDEX IF NOT EXISTS "SupplierBill_tenantId_supplierId_idx" ON "SupplierBill"("tenantId", "supplierId");
CREATE INDEX IF NOT EXISTS "SupplierBill_tenantId_branchId_idx" ON "SupplierBill"("tenantId", "branchId");
CREATE INDEX IF NOT EXISTS "SupplierBill_tenantId_status_idx" ON "SupplierBill"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "SupplierBill_tenantId_dueDate_idx" ON "SupplierBill"("tenantId", "dueDate");
CREATE INDEX IF NOT EXISTS "SupplierBill_supplierId_idx" ON "SupplierBill"("supplierId");
CREATE INDEX IF NOT EXISTS "SupplierBill_supplyId_idx" ON "SupplierBill"("supplyId");
CREATE INDEX IF NOT EXISTS "SupplierBill_purchaseOrderId_idx" ON "SupplierBill"("purchaseOrderId");

CREATE INDEX IF NOT EXISTS "SupplierBillItem_tenantId_idx" ON "SupplierBillItem"("tenantId");
CREATE INDEX IF NOT EXISTS "SupplierBillItem_billId_idx" ON "SupplierBillItem"("billId");
CREATE INDEX IF NOT EXISTS "SupplierBillItem_productId_idx" ON "SupplierBillItem"("productId");

CREATE INDEX IF NOT EXISTS "SupplierPayment_tenantId_idx" ON "SupplierPayment"("tenantId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_tenantId_supplierId_idx" ON "SupplierPayment"("tenantId", "supplierId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_tenantId_branchId_idx" ON "SupplierPayment"("tenantId", "branchId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_billId_idx" ON "SupplierPayment"("billId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_paidAt_idx" ON "SupplierPayment"("paidAt");

CREATE INDEX IF NOT EXISTS "SupplierDocument_tenantId_idx" ON "SupplierDocument"("tenantId");
CREATE INDEX IF NOT EXISTS "SupplierDocument_tenantId_supplierId_idx" ON "SupplierDocument"("tenantId", "supplierId");
CREATE INDEX IF NOT EXISTS "SupplierDocument_supplierId_idx" ON "SupplierDocument"("supplierId");
CREATE INDEX IF NOT EXISTS "SupplierDocument_billId_idx" ON "SupplierDocument"("billId");
CREATE INDEX IF NOT EXISTS "SupplierDocument_supplyId_idx" ON "SupplierDocument"("supplyId");
CREATE INDEX IF NOT EXISTS "SupplierDocument_purchaseOrderId_idx" ON "SupplierDocument"("purchaseOrderId");

DO $$ BEGIN
  ALTER TABLE "SupplierBill"
    ADD CONSTRAINT "SupplierBill_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierBill"
    ADD CONSTRAINT "SupplierBill_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierBill"
    ADD CONSTRAINT "SupplierBill_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierBill"
    ADD CONSTRAINT "SupplierBill_supplyId_fkey"
    FOREIGN KEY ("supplyId") REFERENCES "SupplierSupply"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierBill"
    ADD CONSTRAINT "SupplierBill_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierBill"
    ADD CONSTRAINT "SupplierBill_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierBillItem"
    ADD CONSTRAINT "SupplierBillItem_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierBillItem"
    ADD CONSTRAINT "SupplierBillItem_billId_fkey"
    FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierBillItem"
    ADD CONSTRAINT "SupplierBillItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierPayment"
    ADD CONSTRAINT "SupplierPayment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierPayment"
    ADD CONSTRAINT "SupplierPayment_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierPayment"
    ADD CONSTRAINT "SupplierPayment_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierPayment"
    ADD CONSTRAINT "SupplierPayment_billId_fkey"
    FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierPayment"
    ADD CONSTRAINT "SupplierPayment_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierDocument"
    ADD CONSTRAINT "SupplierDocument_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierDocument"
    ADD CONSTRAINT "SupplierDocument_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierDocument"
    ADD CONSTRAINT "SupplierDocument_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierDocument"
    ADD CONSTRAINT "SupplierDocument_billId_fkey"
    FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierDocument"
    ADD CONSTRAINT "SupplierDocument_supplyId_fkey"
    FOREIGN KEY ("supplyId") REFERENCES "SupplierSupply"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierDocument"
    ADD CONSTRAINT "SupplierDocument_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupplierDocument"
    ADD CONSTRAINT "SupplierDocument_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
