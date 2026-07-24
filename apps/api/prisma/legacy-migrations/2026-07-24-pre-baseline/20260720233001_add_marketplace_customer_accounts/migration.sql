CREATE TYPE "MarketplaceCustomerStatus" AS ENUM (
  'ACTIVE',
  'DISABLED'
);

CREATE TYPE "MarketplaceCustomerVerificationChannel" AS ENUM (
  'EMAIL',
  'PHONE'
);

CREATE TABLE "MarketplaceCustomer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "passwordHash" TEXT NOT NULL,
  "status" "MarketplaceCustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  "emailVerifiedAt" TIMESTAMP(3),
  "phoneVerifiedAt" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MarketplaceCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceCustomerSession" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "isRevoked" BOOLEAN NOT NULL DEFAULT false,
  "revokedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceCustomerSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceCustomerVerification" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "channel" "MarketplaceCustomerVerificationChannel" NOT NULL,
  "target" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceCustomerVerification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MarketplaceRequest"
ADD COLUMN "marketplaceCustomerId" TEXT;

CREATE UNIQUE INDEX "MarketplaceCustomer_email_key"
ON "MarketplaceCustomer"("email");

CREATE UNIQUE INDEX "MarketplaceCustomer_phone_key"
ON "MarketplaceCustomer"("phone");

CREATE INDEX "MarketplaceCustomer_status_idx"
ON "MarketplaceCustomer"("status");

CREATE INDEX "MarketplaceCustomer_createdAt_idx"
ON "MarketplaceCustomer"("createdAt");

CREATE UNIQUE INDEX "MarketplaceCustomerSession_tokenId_key"
ON "MarketplaceCustomerSession"("tokenId");

CREATE INDEX "MarketplaceCustomerSession_customerId_idx"
ON "MarketplaceCustomerSession"("customerId");

CREATE INDEX "MarketplaceCustomerSession_customerId_isRevoked_idx"
ON "MarketplaceCustomerSession"("customerId", "isRevoked");

CREATE INDEX "MarketplaceCustomerSession_expiresAt_idx"
ON "MarketplaceCustomerSession"("expiresAt");

CREATE INDEX "MarketplaceCustomerVerification_customerId_channel_idx"
ON "MarketplaceCustomerVerification"("customerId", "channel");

CREATE INDEX "MarketplaceCustomerVerification_target_idx"
ON "MarketplaceCustomerVerification"("target");

CREATE INDEX "MarketplaceCustomerVerification_expiresAt_idx"
ON "MarketplaceCustomerVerification"("expiresAt");

CREATE INDEX "MarketplaceRequest_marketplaceCustomerId_idx"
ON "MarketplaceRequest"("marketplaceCustomerId");

CREATE INDEX "MarketplaceRequest_marketplaceCustomerId_createdAt_idx"
ON "MarketplaceRequest"("marketplaceCustomerId", "createdAt");

ALTER TABLE "MarketplaceCustomerSession"
ADD CONSTRAINT "MarketplaceCustomerSession_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "MarketplaceCustomer"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "MarketplaceCustomerVerification"
ADD CONSTRAINT "MarketplaceCustomerVerification_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "MarketplaceCustomer"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "MarketplaceRequest"
ADD CONSTRAINT "MarketplaceRequest_marketplaceCustomerId_fkey"
FOREIGN KEY ("marketplaceCustomerId")
REFERENCES "MarketplaceCustomer"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
