/* =========================
   ENUMS
========================= */

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

CREATE TYPE "WhatsAppMessageType" AS ENUM (
  'TEXT',
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'DOCUMENT',
  'LOCATION',
  'UNKNOWN'
);

CREATE TYPE "WhatsAppDirection" AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'FAILED');

CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'ACTION_REQUIRED');


/* =========================
   ALTER EXISTING ENUM
========================= */

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MARK_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADD_PAYMENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXPENSE_DELETED';


/* =========================
   AUDITLOG (CRITICAL FIX)
========================= */

/* Drop old columns */
ALTER TABLE "AuditLog"
  DROP COLUMN "action",
  DROP COLUMN "entity";

/* Re-add with SAFE defaults */
ALTER TABLE "AuditLog"
  ADD COLUMN "action" "AuditAction" DEFAULT 'EXPENSE_CREATED',
  ADD COLUMN "entity" "AuditEntity" DEFAULT 'EXPENSE';

/* Enforce NOT NULL AFTER defaults exist */
ALTER TABLE "AuditLog"
  ALTER COLUMN "action" SET NOT NULL,
  ALTER COLUMN "entity" SET NOT NULL;


/* =========================
   OTHER TABLE UPDATES
========================= */

ALTER TABLE "Customer"
  ADD COLUMN "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Expense"
  ALTER COLUMN "amount" DROP DEFAULT;

ALTER TABLE "InterStoreDeal"
  ALTER COLUMN "dueDate" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "takenAt" SET DATA TYPE TIMESTAMP(3);

ALTER TABLE "InterStorePayment"
  ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "Product"
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "category" TEXT;


/* =========================
   WHATSAPP TABLES
========================= */

CREATE TABLE "WhatsAppAccount" (
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

CREATE TABLE "WhatsAppConversation" (
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

CREATE TABLE "WhatsAppMessage" (
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

CREATE TABLE "Promotion" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "productId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3)
);

CREATE TABLE "WhatsAppBroadcast" (
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

CREATE TABLE "Notification" (
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

-- CreateIndex
CREATE INDEX "WhatsAppAccount_tenantId_idx" ON "WhatsAppAccount"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAccount_tenantId_phoneNumber_key" ON "WhatsAppAccount"("tenantId", "phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAccount_phoneNumberId_key" ON "WhatsAppAccount"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_tenantId_idx" ON "WhatsAppConversation"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_phone_idx" ON "WhatsAppConversation"("phone");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_accountId_idx" ON "WhatsAppConversation"("accountId");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_tenantId_status_idx" ON "WhatsAppConversation"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_messageId_key" ON "WhatsAppMessage"("messageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_conversationId_idx" ON "WhatsAppMessage"("conversationId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_idx" ON "WhatsAppMessage"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_accountId_idx" ON "WhatsAppMessage"("accountId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_broadcastId_idx" ON "WhatsAppMessage"("broadcastId");

-- CreateIndex
CREATE INDEX "Promotion_tenantId_idx" ON "Promotion"("tenantId");

-- CreateIndex
CREATE INDEX "Promotion_productId_idx" ON "Promotion"("productId");

-- CreateIndex
CREATE INDEX "Promotion_createdAt_idx" ON "Promotion"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_tenantId_idx" ON "WhatsAppBroadcast"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_accountId_idx" ON "WhatsAppBroadcast"("accountId");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_status_idx" ON "WhatsAppBroadcast"("status");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_createdAt_idx" ON "WhatsAppBroadcast"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_idx" ON "Notification"("recipientUserId");

-- CreateIndex
CREATE INDEX "Notification_recipientRole_idx" ON "Notification"("recipientRole");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entity_createdAt_idx" ON "AuditLog"("tenantId", "entity", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_createdAt_idx" ON "AuditLog"("tenantId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "InterStoreDeal_resellerPhone_idx" ON "InterStoreDeal"("resellerPhone");

-- CreateIndex
CREATE INDEX "InterStoreDeal_serial_idx" ON "InterStoreDeal"("serial");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");

-- CreateIndex
CREATE INDEX "Product_tenantId_category_idx" ON "Product"("tenantId", "category");

-- CreateIndex
CREATE INDEX "Product_tenantId_name_idx" ON "Product"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "WhatsAppAccount" ADD CONSTRAINT "WhatsAppAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WhatsAppAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WhatsAppAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "WhatsAppBroadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBroadcast" ADD CONSTRAINT "WhatsAppBroadcast_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBroadcast" ADD CONSTRAINT "WhatsAppBroadcast_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WhatsAppAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBroadcast" ADD CONSTRAINT "WhatsAppBroadcast_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBroadcast" ADD CONSTRAINT "WhatsAppBroadcast_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

