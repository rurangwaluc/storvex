ALTER TABLE "MarketplaceSellerProfile"
ADD COLUMN "marketplaceCode" CHAR(3);

DO $$
DECLARE
  seller RECORD;
  normalized_name TEXT;
  base_code TEXT;
  candidate TEXT;
  attempt INTEGER;
  first_value INTEGER;
  second_value INTEGER;
  third_value INTEGER;
BEGIN
  FOR seller IN
    SELECT
      profile."tenantId",
      tenant."name"
    FROM "MarketplaceSellerProfile" profile
    JOIN "Tenant" tenant
      ON tenant."id" = profile."tenantId"
    ORDER BY
      profile."createdAt" ASC,
      profile."tenantId" ASC
  LOOP
    normalized_name :=
      regexp_replace(
        upper(seller."name"),
        '[^A-Z]',
        '',
        'g'
      );

    base_code :=
      substring(
        normalized_name || 'XXX'
        FROM 1 FOR 3
      );

    candidate := base_code;
    attempt := 0;

    WHILE EXISTS (
      SELECT 1
      FROM "MarketplaceSellerProfile"
      WHERE "marketplaceCode" = candidate
    )
    LOOP
      first_value :=
        (attempt / 676) % 26;
      second_value :=
        (attempt / 26) % 26;
      third_value :=
        attempt % 26;

      candidate :=
        chr(65 + first_value) ||
        chr(65 + second_value) ||
        chr(65 + third_value);

      attempt := attempt + 1;

      IF attempt > 17576 THEN
        RAISE EXCEPTION
          'No Marketplace business codes are available';
      END IF;
    END LOOP;

    UPDATE "MarketplaceSellerProfile"
    SET "marketplaceCode" = candidate
    WHERE "tenantId" = seller."tenantId";
  END LOOP;
END
$$;

ALTER TABLE "MarketplaceSellerProfile"
ALTER COLUMN "marketplaceCode" SET NOT NULL;

CREATE UNIQUE INDEX
  "MarketplaceSellerProfile_marketplaceCode_key"
ON
  "MarketplaceSellerProfile"("marketplaceCode");
