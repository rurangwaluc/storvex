-- CreateEnum
CREATE TYPE "InterStoreDealStatus" AS ENUM ('BORROWED', 'SOLD', 'RETURNED', 'PAID');

-- CreateTable
CREATE TABLE "InterStoreDeal" (
    "id" TEXT NOT NULL,
    "supplierTenantId" TEXT NOT NULL,
    "borrowerTenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serial" TEXT,
    "agreedPrice" DOUBLE PRECISION NOT NULL,
    "takenByName" TEXT NOT NULL,
    "takenByPhone" TEXT NOT NULL,
    "status" "InterStoreDealStatus" NOT NULL DEFAULT 'BORROWED',
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterStoreDeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterStoreDeal_supplierTenantId_idx" ON "InterStoreDeal"("supplierTenantId");

-- CreateIndex
CREATE INDEX "InterStoreDeal_borrowerTenantId_idx" ON "InterStoreDeal"("borrowerTenantId");

-- CreateIndex
CREATE INDEX "InterStoreDeal_status_idx" ON "InterStoreDeal"("status");

-- AddForeignKey
ALTER TABLE "InterStoreDeal" ADD CONSTRAINT "InterStoreDeal_supplierTenantId_fkey" FOREIGN KEY ("supplierTenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStoreDeal" ADD CONSTRAINT "InterStoreDeal_borrowerTenantId_fkey" FOREIGN KEY ("borrowerTenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStoreDeal" ADD CONSTRAINT "InterStoreDeal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
