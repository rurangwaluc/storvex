-- AlterTable
ALTER TABLE "InterStoreDeal" ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "receivedProductId" TEXT;

-- CreateIndex
CREATE INDEX "InterStoreDeal_receivedProductId_idx" ON "InterStoreDeal"("receivedProductId");

-- AddForeignKey
ALTER TABLE "InterStoreDeal" ADD CONSTRAINT "InterStoreDeal_receivedProductId_fkey" FOREIGN KEY ("receivedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
