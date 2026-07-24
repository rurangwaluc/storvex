CREATE TYPE "MarketplaceDeliveryCoverage" AS ENUM (
  'KIGALI',
  'OUTSIDE_KIGALI'
);

ALTER TABLE "MarketplaceRequest"
ADD COLUMN "deliveryCoverage" "MarketplaceDeliveryCoverage";
