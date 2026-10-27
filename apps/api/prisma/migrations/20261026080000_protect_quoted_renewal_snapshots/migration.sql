-- STORVEX / STEP 342CN-AI
-- Protect purchased terms for quoted Flutterwave renewals.
-- Preparation only: apply and test in separate reviewed steps.
--
-- Status updates and updatedAt remain permitted.
-- Other providers and legacy payments are not affected.
--
-- PostgreSQL superusers and table owners can alter triggers;
-- this protects ordinary application writes, not privileged DB access.

CREATE OR REPLACE FUNCTION "protectQuotedRenewalPaymentSnapshot"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- STEP 342CN-AJ2 / QUOTED PURCHASE IDENTITY PROTECTION
  -- Freeze purchased terms once a renewal quote exists.
  -- Changing provider or purpose cannot bypass the protection.
  IF OLD."provider" = 'FLUTTERWAVE'
     AND OLD."purpose" = 'SUBSCRIPTION_RENEWAL'
     AND OLD."renewalQuote" IS NOT NULL
  THEN
    IF ROW(
      OLD."tenantId",
      OLD."reference",
      OLD."provider",
      OLD."purpose",
      OLD."amount",
      OLD."currency",
      OLD."planKey",
      OLD."tierKey",
      OLD."cycleKey",
      OLD."staffLimit",
      OLD."branchLimit",
      OLD."priceAmount",
      OLD."renewalQuote",
      OLD."entitlementSnapshot"
    ) IS DISTINCT FROM ROW(
      NEW."tenantId",
      NEW."reference",
      NEW."provider",
      NEW."purpose",
      NEW."amount",
      NEW."currency",
      NEW."planKey",
      NEW."tierKey",
      NEW."cycleKey",
      NEW."staffLimit",
      NEW."branchLimit",
      NEW."priceAmount",
      NEW."renewalQuote",
      NEW."entitlementSnapshot"
    ) THEN
      RAISE EXCEPTION
        'Quoted renewal payment snapshot cannot be modified after quote creation'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- STEP 342CN-AP / QUOTE INTRODUCTION GUARD
  -- A quote can be introduced only on an existing pending
  -- Flutterwave renewal, without marking it successful
  -- in the same update. Once introduced, the OLD-row
  -- comparison above protects its purchased terms.
  IF NEW."provider" = 'FLUTTERWAVE'
     AND NEW."purpose" = 'SUBSCRIPTION_RENEWAL'
     AND NEW."renewalQuote" IS NOT NULL
     AND OLD."renewalQuote" IS NULL
  THEN
    IF OLD."provider" IS DISTINCT FROM 'FLUTTERWAVE'
       OR OLD."purpose" IS DISTINCT FROM 'SUBSCRIPTION_RENEWAL'
       OR OLD."status" IS DISTINCT FROM 'PENDING'
       OR NEW."status" IS DISTINCT FROM 'PENDING'
    THEN
      RAISE EXCEPTION
        'Renewal quote must be created on a pending Flutterwave renewal'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "protectQuotedRenewalPaymentSnapshotTrigger"
BEFORE UPDATE ON "Payment"
FOR EACH ROW
EXECUTE FUNCTION "protectQuotedRenewalPaymentSnapshot"();
