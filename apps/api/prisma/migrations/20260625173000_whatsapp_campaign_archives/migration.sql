-- Preserve WhatsApp campaign history while allowing cleanup from active lists.

ALTER TABLE "Promotion"
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedById" TEXT,
  ADD COLUMN IF NOT EXISTS "archiveReason" TEXT;

ALTER TABLE "WhatsAppBroadcast"
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedById" TEXT,
  ADD COLUMN IF NOT EXISTS "archiveReason" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;

CREATE INDEX IF NOT EXISTS "Promotion_archivedAt_idx" ON "Promotion"("archivedAt");
CREATE INDEX IF NOT EXISTS "WhatsAppBroadcast_archivedAt_idx" ON "WhatsAppBroadcast"("archivedAt");
