/* ======================================================
   ENUMS — IDEMPOTENT (SAFE TO RE-RUN)
====================================================== */

DO $$ BEGIN
  CREATE TYPE "AuditEntity" AS ENUM (
    'INTERSTORE_DEAL',
    'EXPENSE',
    'SALE',
    'REPAIR',
    'PRODUCT',
    'CUSTOMER',
    'USER',
    'TENANT',
    'SUBSCRIPTION',
    'PAYMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WhatsAppMessageType" AS ENUM (
    'TEXT',
    'IMAGE',
    'AUDIO',
    'VIDEO',
    'DOCUMENT',
    'LOCATION',
    'UNKNOWN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WhatsAppDirection" AS ENUM ('INBOUND', 'OUTBOUND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'ACTION_REQUIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


/* ======================================================
   AUDIT ACTION ENUM — SAFE EXTENSION
====================================================== */

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MARK_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADD_PAYMENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_DELETED';


/* ======================================================
   AUDIT LOG — DROP / RE-ADD SAFELY (NO NULLS)
====================================================== */

ALTER TABLE "AuditLog"
  DROP COLUMN IF EXISTS "action",
  DROP COLUMN IF EXISTS "entity";

ALTER TABLE "AuditLog"
  ADD COLUMN "action" "AuditAction" DEFAULT 'EXPENSE_CREATED',
  ADD COLUMN "entity" "AuditEntity" DEFAULT 'EXPENSE';

ALTER TABLE "AuditLog"
  ALTER COLUMN "action" SET NOT NULL,
  ALTER COLUMN "entity" SET NOT NULL;


/* ======================================================
   OTHER TABLE ALTERATIONS
====================================================== */

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Expense"
  ALTER COLUMN "amount" DROP DEFAULT;

ALTER TABLE "InterStoreDeal"
  ALTER COLUMN "dueDate" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "takenAt" SET DATA TYPE TIMESTAMP(3);

ALTER TABLE "InterStorePayment"
  ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "brand" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT;


/* ======================================================
   WHATSAPP TABLES
====================================================== */

CREATE TABLE IF NOT EXISTS "WhatsAppAccount" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "businessName" TEXT,
  "phoneNumberId" TEXT,
  "wabaId" TEXT,
  "accessToken" TEXT,
  "webhookVerifyToken" TEXT,
  "appSecret" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "WhatsAppConversation" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "customerId" TEXT,
  "phone" TEXT NOT NULL,
  "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  "assignedToId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "WhatsAppMessage" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "accountId" TEXT,
  "broadcastId" TEXT,
  "direction" "WhatsAppDirection" NOT NULL,
  "type" "WhatsAppMessageType" NOT NULL,
  "textContent" TEXT,
  "mediaUrl" TEXT,
  "messageId" TEXT,
  "sentById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Promotion" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "productId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "WhatsAppBroadcast" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "promotionId" TEXT,
  "templateName" TEXT NOT NULL,
  "languageCode" TEXT NOT NULL DEFAULT 'en_US',
  "status" "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "queuedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'INFO',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdById" TEXT,
  "recipientUserId" TEXT,
  "recipientRole" "UserRole",
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


/* ======================================================
   INDEXES — SAFE
====================================================== */

CREATE INDEX IF NOT EXISTS "WhatsAppAccount_tenantId_idx" ON "WhatsAppAccount"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppAccount_tenantId_phoneNumber_key"
  ON "WhatsAppAccount"("tenantId", "phoneNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppAccount_phoneNumberId_key"
  ON "WhatsAppAccount"("phoneNumberId");

CREATE INDEX IF NOT EXISTS "WhatsAppConversation_tenantId_idx" ON "WhatsAppConversation"("tenantId");
CREATE INDEX IF NOT EXISTS "WhatsAppConversation_phone_idx" ON "WhatsAppConversation"("phone");
CREATE INDEX IF NOT EXISTS "WhatsAppConversation_accountId_idx" ON "WhatsAppConversation"("accountId");
CREATE INDEX IF NOT EXISTS "WhatsAppConversation_tenantId_status_idx"
  ON "WhatsAppConversation"("tenantId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppMessage_messageId_key"
  ON "WhatsAppMessage"("messageId");

CREATE INDEX IF NOT EXISTS "WhatsAppMessage_conversationId_idx"
  ON "WhatsAppMessage"("conversationId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_tenantId_idx"
  ON "WhatsAppMessage"("tenantId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_accountId_idx"
  ON "WhatsAppMessage"("accountId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_broadcastId_idx"
  ON "WhatsAppMessage"("broadcastId");

CREATE INDEX IF NOT EXISTS "Promotion_tenantId_idx" ON "Promotion"("tenantId");
CREATE INDEX IF NOT EXISTS "Promotion_productId_idx" ON "Promotion"("productId");
CREATE INDEX IF NOT EXISTS "Promotion_createdAt_idx" ON "Promotion"("createdAt");

CREATE INDEX IF NOT EXISTS "WhatsAppBroadcast_tenantId_idx" ON "WhatsAppBroadcast"("tenantId");
CREATE INDEX IF NOT EXISTS "WhatsAppBroadcast_accountId_idx" ON "WhatsAppBroadcast"("accountId");
CREATE INDEX IF NOT EXISTS "WhatsAppBroadcast_status_idx" ON "WhatsAppBroadcast"("status");
CREATE INDEX IF NOT EXISTS "WhatsAppBroadcast_createdAt_idx" ON "WhatsAppBroadcast"("createdAt");

CREATE INDEX IF NOT EXISTS "Notification_tenantId_idx" ON "Notification"("tenantId");
CREATE INDEX IF NOT EXISTS "Notification_tenantId_createdAt_idx"
  ON "Notification"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_recipientUserId_idx"
  ON "Notification"("recipientUserId");
CREATE INDEX IF NOT EXISTS "Notification_recipientRole_idx"
  ON "Notification"("recipientRole");
