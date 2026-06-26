-- WhatsApp broadcast delivery/read analytics query indexes
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_broadcastId_status_idx"
  ON "WhatsAppMessage"("broadcastId", "status");

CREATE INDEX IF NOT EXISTS "WhatsAppMessage_tenantId_status_idx"
  ON "WhatsAppMessage"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "WhatsAppMessage_messageId_idx"
  ON "WhatsAppMessage"("messageId");
