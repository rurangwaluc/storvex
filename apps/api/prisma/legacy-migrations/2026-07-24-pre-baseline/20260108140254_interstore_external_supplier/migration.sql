/*
  Warnings:

  - You are about to drop the column `takenByName` on the `InterStoreDeal` table. All the data in the column will be lost.
  - You are about to drop the column `takenByPhone` on the `InterStoreDeal` table. All the data in the column will be lost.
  - Added the required column `productName` to the `InterStoreDeal` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InterStoreDeal" DROP CONSTRAINT "InterStoreDeal_productId_fkey";

-- DropForeignKey
ALTER TABLE "InterStoreDeal" DROP CONSTRAINT "InterStoreDeal_supplierTenantId_fkey";

-- AlterTable
ALTER TABLE "InterStoreDeal" DROP COLUMN "takenByName",
DROP COLUMN "takenByPhone",
ADD COLUMN     "externalSupplierName" TEXT,
ADD COLUMN     "externalSupplierPhone" TEXT,
ADD COLUMN     "productName" TEXT NOT NULL,
ALTER COLUMN "supplierTenantId" DROP NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "InterStoreDeal" ADD CONSTRAINT "InterStoreDeal_supplierTenantId_fkey" FOREIGN KEY ("supplierTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterStoreDeal" ADD CONSTRAINT "InterStoreDeal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
