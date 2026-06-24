-- Link WhatsApp conversations and sale drafts to existing Proforma documents.
ALTER TABLE "Proforma"
  ADD COLUMN IF NOT EXISTS "source" TEXT,
  ADD COLUMN IF NOT EXISTS "conversationId" TEXT,
  ADD COLUMN IF NOT EXISTS "draftSaleId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Proforma_conversationId_fkey'
  ) THEN
    ALTER TABLE "Proforma"
      ADD CONSTRAINT "Proforma_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Proforma_draftSaleId_fkey'
  ) THEN
    ALTER TABLE "Proforma"
      ADD CONSTRAINT "Proforma_draftSaleId_fkey"
      FOREIGN KEY ("draftSaleId") REFERENCES "Sale"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Proforma_tenantId_source_createdAt_idx"
  ON "Proforma"("tenantId", "source", "createdAt");

CREATE INDEX IF NOT EXISTS "Proforma_tenantId_conversationId_createdAt_idx"
  ON "Proforma"("tenantId", "conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS "Proforma_tenantId_draftSaleId_idx"
  ON "Proforma"("tenantId", "draftSaleId");
