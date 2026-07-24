CREATE TABLE "MarketplaceCustomerPasswordReset" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "requestedIp" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceCustomerPasswordReset_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
  "MarketplaceCustomerPasswordReset_tokenHash_key"
ON "MarketplaceCustomerPasswordReset"("tokenHash");

CREATE INDEX
  "MarketplaceCustomerPasswordReset_customerId_createdAt_idx"
ON "MarketplaceCustomerPasswordReset"(
  "customerId",
  "createdAt"
);

CREATE INDEX
  "MarketplaceCustomerPasswordReset_customerId_usedAt_idx"
ON "MarketplaceCustomerPasswordReset"(
  "customerId",
  "usedAt"
);

CREATE INDEX
  "MarketplaceCustomerPasswordReset_expiresAt_idx"
ON "MarketplaceCustomerPasswordReset"(
  "expiresAt"
);

ALTER TABLE
  "MarketplaceCustomerPasswordReset"
ADD CONSTRAINT
  "MarketplaceCustomerPasswordReset_customerId_fkey"
FOREIGN KEY ("customerId")
REFERENCES "MarketplaceCustomer"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
