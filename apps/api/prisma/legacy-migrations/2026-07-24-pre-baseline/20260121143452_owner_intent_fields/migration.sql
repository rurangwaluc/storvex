/*
  Warnings:

  - Added the required column `ownerName` to the `OwnerIntent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `OwnerIntent` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "OwnerIntent_email_idx";

-- AlterTable
ALTER TABLE "OwnerIntent" ADD COLUMN     "address" TEXT,
ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "district" TEXT,
ADD COLUMN     "ownerName" TEXT NOT NULL,
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "shopType" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
