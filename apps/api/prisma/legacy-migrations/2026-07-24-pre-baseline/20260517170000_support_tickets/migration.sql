CREATE TYPE "SupportTicketCategory" AS ENUM (
  'ACCOUNT_ACCESS',
  'BILLING_PAYMENT',
  'ONBOARDING_SETUP',
  'POS_SALES',
  'INVENTORY_STOCK',
  'RECEIPTS_INVOICES',
  'WHATSAPP',
  'STAFF_USERS',
  'BUG_REPORT',
  'OTHER'
);

CREATE TYPE "SupportTicketPriority" AS ENUM (
  'NORMAL',
  'URGENT',
  'BUSINESS_BLOCKED'
);

CREATE TYPE "SupportTicketStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_TENANT',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE "SupportMessageSenderType" AS ENUM (
  'TENANT_USER',
  'PLATFORM_USER',
  'SYSTEM'
);

CREATE TABLE "SupportTicket" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "tenantId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "assignedToPlatformUserId" TEXT,
  "title" TEXT NOT NULL,
  "category" "SupportTicketCategory" NOT NULL DEFAULT 'OTHER',
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "lastMessageAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  "resolvedAt" TIMESTAMP(6),
  "closedAt" TIMESTAMP(6),
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT "SupportTicket_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "SupportTicket_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT "SupportTicket_assignedToPlatformUserId_fkey"
    FOREIGN KEY ("assignedToPlatformUserId") REFERENCES "platform_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "SupportMessage" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "ticketId" TEXT NOT NULL,
  "senderType" "SupportMessageSenderType" NOT NULL,
  "tenantUserId" TEXT,
  "platformUserId" TEXT,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT "SupportMessage_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "SupportMessage_tenantUserId_fkey"
    FOREIGN KEY ("tenantUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT "SupportMessage_platformUserId_fkey"
    FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "SupportAttachment" (
  "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "ticketId" TEXT NOT NULL,
  "messageId" TEXT,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT,
  "fileType" TEXT,
  "fileSize" INTEGER,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT "SupportAttachment_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "SupportAttachment_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "SupportMessage"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SupportTicket_tenant_status_created_idx"
  ON "SupportTicket" ("tenantId", "status", "createdAt" DESC);

CREATE INDEX "SupportTicket_status_priority_created_idx"
  ON "SupportTicket" ("status", "priority", "createdAt" DESC);

CREATE INDEX "SupportTicket_assigned_created_idx"
  ON "SupportTicket" ("assignedToPlatformUserId", "createdAt" DESC);

CREATE INDEX "SupportMessage_ticket_created_idx"
  ON "SupportMessage" ("ticketId", "createdAt" ASC);

CREATE INDEX "SupportAttachment_ticket_created_idx"
  ON "SupportAttachment" ("ticketId", "createdAt" DESC);