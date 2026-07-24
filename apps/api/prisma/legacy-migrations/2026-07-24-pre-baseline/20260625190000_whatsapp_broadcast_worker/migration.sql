-- WhatsApp broadcast worker persistence and safe queue processing metadata
ALTER TABLE "WhatsAppBroadcast"
  ADD COLUMN IF NOT EXISTS "targetMode" TEXT,
  ADD COLUMN IF NOT EXISTS "targetBranchId" TEXT,
  ADD COLUMN IF NOT EXISTS "targetProductId" TEXT,
  ADD COLUMN IF NOT EXISTS "targetCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "targetCustomerIds" JSONB,
  ADD COLUMN IF NOT EXISTS "processingLockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "processingLockedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "processingAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "processingLastError" TEXT,
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "WhatsAppBroadcast_tenantId_status_nextAttemptAt_idx"
  ON "WhatsAppBroadcast"("tenantId", "status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "WhatsAppBroadcast_processingLockedAt_idx"
  ON "WhatsAppBroadcast"("processingLockedAt");
