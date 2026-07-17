CREATE TYPE "MarketplaceRequestStatus" AS ENUM (
  'REQUESTED',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'COMPLETED'
);

CREATE TYPE "MarketplaceContactChannel" AS ENUM (
  'WHATSAPP',
  'EMAIL'
);

CREATE TYPE "MarketplaceFulfilmentMethod" AS ENUM (
  'PICKUP',
  'DELIVERY'
);

CREATE TYPE "MarketplaceRequestPaymentMethod" AS ENUM (
  'CASH_ON_DELIVERY',
  'MOMO_ON_DELIVERY',
  'PAY_ON_PICKUP',
  'SELLER_APPROVED_OTHER'
);

CREATE TABLE "MarketplaceRequest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "trackingToken" TEXT NOT NULL,
  "clientRequestId" TEXT NOT NULL,

  "status" "MarketplaceRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "preferredContact" "MarketplaceContactChannel" NOT NULL,
  "fulfilmentMethod" "MarketplaceFulfilmentMethod" NOT NULL,
  "paymentMethod" "MarketplaceRequestPaymentMethod" NOT NULL,

  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "customerEmail" TEXT,

  "deliveryAddress" TEXT,
  "deliveryDistrict" TEXT,
  "deliverySector" TEXT,
  "customerNote" TEXT,

  "currency" TEXT NOT NULL DEFAULT 'RWF',
  "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,

  "sellerNameSnapshot" TEXT NOT NULL,
  "sellerPhoneSnapshot" TEXT,
  "sellerEmailSnapshot" TEXT,

  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceRequest_pkey"
    PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceRequestItem" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,

  "productSlugSnapshot" TEXT NOT NULL,
  "productTitleSnapshot" TEXT NOT NULL,
  "productCategorySnapshot" TEXT,
  "productImageSnapshot" TEXT,

  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "lineTotal" DOUBLE PRECISION NOT NULL,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceRequestItem_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
  "MarketplaceRequest_requestNumber_key"
  ON "MarketplaceRequest"("requestNumber");

CREATE UNIQUE INDEX
  "MarketplaceRequest_trackingToken_key"
  ON "MarketplaceRequest"("trackingToken");

CREATE UNIQUE INDEX
  "MarketplaceRequest_clientRequestId_key"
  ON "MarketplaceRequest"("clientRequestId");

CREATE INDEX
  "MarketplaceRequest_tenantId_idx"
  ON "MarketplaceRequest"("tenantId");

CREATE INDEX
  "MarketplaceRequest_tenantId_status_idx"
  ON "MarketplaceRequest"("tenantId", "status");

CREATE INDEX
  "MarketplaceRequest_tenantId_createdAt_idx"
  ON "MarketplaceRequest"("tenantId", "createdAt");

CREATE INDEX
  "MarketplaceRequest_customerPhone_idx"
  ON "MarketplaceRequest"("customerPhone");

CREATE INDEX
  "MarketplaceRequest_customerEmail_idx"
  ON "MarketplaceRequest"("customerEmail");

CREATE INDEX
  "MarketplaceRequestItem_requestId_idx"
  ON "MarketplaceRequestItem"("requestId");

CREATE INDEX
  "MarketplaceRequestItem_productId_idx"
  ON "MarketplaceRequestItem"("productId");

CREATE INDEX
  "MarketplaceRequestItem_requestId_productId_idx"
  ON "MarketplaceRequestItem"("requestId", "productId");

ALTER TABLE "MarketplaceRequest"
  ADD CONSTRAINT "MarketplaceRequest_tenantId_fkey"
  FOREIGN KEY ("tenantId")
  REFERENCES "Tenant"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "MarketplaceRequestItem"
  ADD CONSTRAINT "MarketplaceRequestItem_requestId_fkey"
  FOREIGN KEY ("requestId")
  REFERENCES "MarketplaceRequest"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "MarketplaceRequestItem"
  ADD CONSTRAINT "MarketplaceRequestItem_productId_fkey"
  FOREIGN KEY ("productId")
  REFERENCES "Product"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "MarketplaceRequestItem"
  ADD CONSTRAINT "MarketplaceRequestItem_quantity_check"
  CHECK ("quantity" > 0);

ALTER TABLE "MarketplaceRequestItem"
  ADD CONSTRAINT "MarketplaceRequestItem_unitPrice_check"
  CHECK ("unitPrice" >= 0);

ALTER TABLE "MarketplaceRequestItem"
  ADD CONSTRAINT "MarketplaceRequestItem_lineTotal_check"
  CHECK ("lineTotal" >= 0);

ALTER TABLE "MarketplaceRequest"
  ADD CONSTRAINT "MarketplaceRequest_subtotal_check"
  CHECK ("subtotal" >= 0);

ALTER TABLE "MarketplaceRequest"
  ADD CONSTRAINT "MarketplaceRequest_deliveryFee_check"
  CHECK ("deliveryFee" >= 0);

ALTER TABLE "MarketplaceRequest"
  ADD CONSTRAINT "MarketplaceRequest_total_check"
  CHECK ("total" >= 0);
