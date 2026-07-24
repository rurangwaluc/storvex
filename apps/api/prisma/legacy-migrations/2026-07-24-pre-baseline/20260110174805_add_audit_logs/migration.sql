/*
  Warnings:

  - You are about to drop the column `meta` on the `AuditLog` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AuditLog_tenantId_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "meta",
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
