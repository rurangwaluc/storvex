/*
  Warnings:

  - Added the required column `userId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "meta" JSONB,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "entityId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
