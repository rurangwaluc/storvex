CREATE TABLE IF NOT EXISTS "MarketplaceRequestReservation" (
  "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "tenantId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "requestItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "MarketplaceRequestReservation_pkey"
    PRIMARY KEY ("id"),

  CONSTRAINT "MarketplaceRequestReservation_requestId_fkey"
    FOREIGN KEY ("requestId")
    REFERENCES "MarketplaceRequest"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "MarketplaceRequestReservation_requestItemId_fkey"
    FOREIGN KEY ("requestItemId")
    REFERENCES "MarketplaceRequestItem"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "MarketplaceRequestReservation_productId_fkey"
    FOREIGN KEY ("productId")
    REFERENCES "Product"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT "MarketplaceRequestReservation_branchId_fkey"
    FOREIGN KEY ("branchId")
    REFERENCES "Branch"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS
  "MarketplaceRequestReservation_requestItemId_branchId_key"
ON "MarketplaceRequestReservation"(
  "requestItemId",
  "branchId"
);

CREATE INDEX IF NOT EXISTS
  "MarketplaceRequestReservation_tenantId_requestId_idx"
ON "MarketplaceRequestReservation"(
  "tenantId",
  "requestId"
);

CREATE INDEX IF NOT EXISTS
  "MarketplaceRequestReservation_tenantId_productId_idx"
ON "MarketplaceRequestReservation"(
  "tenantId",
  "productId"
);

CREATE INDEX IF NOT EXISTS
  "MarketplaceRequestReservation_tenantId_branchId_idx"
ON "MarketplaceRequestReservation"(
  "tenantId",
  "branchId"
);

CREATE INDEX IF NOT EXISTS
  "MarketplaceRequestReservation_requestId_idx"
ON "MarketplaceRequestReservation"("requestId");

CREATE INDEX IF NOT EXISTS
  "MarketplaceRequestReservation_requestItemId_idx"
ON "MarketplaceRequestReservation"("requestItemId");
