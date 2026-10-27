-- Marketplace requests historically existed only in the Rwanda Marketplace.
-- New columns preserve explicit seller/customer market snapshots while legacy
-- Rwanda-specific delivery fields remain temporarily for frontend compatibility.

ALTER TABLE "MarketplaceRequest"
ADD COLUMN "customerCountryCode" TEXT,
ADD COLUMN "sellerCountryCode" TEXT,
ADD COLUMN "sellerTimezone" TEXT,
ADD COLUMN "deliveryArea" TEXT,
ADD COLUMN "deliveryLocality" TEXT;

UPDATE "MarketplaceRequest" AS request
SET
  "sellerCountryCode" = COALESCE(tenant."countryCode", 'RW'),
  "customerCountryCode" = COALESCE(tenant."countryCode", 'RW'),
  "sellerTimezone" = COALESCE(tenant."timezone", 'Africa/Kigali'),
  "deliveryArea" =
    CASE
      WHEN request."fulfilmentMethod"::text <> 'DELIVERY' THEN NULL
      WHEN request."deliveryCoverage"::text = 'KIGALI' THEN 'Kigali City'
      ELSE request."deliveryDistrict"
    END,
  "deliveryLocality" =
    CASE
      WHEN request."fulfilmentMethod"::text = 'DELIVERY'
        THEN request."deliverySector"
      ELSE NULL
    END
FROM "Tenant" AS tenant
WHERE tenant.id = request."tenantId";

-- Currency is always supplied explicitly from the seller tenant for new
-- Marketplace requests. Existing rows already contain their historical value.
ALTER TABLE "MarketplaceRequest"
ALTER COLUMN "currency" DROP DEFAULT;
