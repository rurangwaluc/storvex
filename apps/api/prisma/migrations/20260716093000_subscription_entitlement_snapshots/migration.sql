ALTER TABLE "OwnerIntent"
ADD COLUMN "requestedEntitlements" JSONB;

ALTER TABLE "Payment"
ADD COLUMN "entitlementSnapshot" JSONB;

ALTER TABLE "Subscription"
ADD COLUMN "entitlementSnapshot" JSONB;
