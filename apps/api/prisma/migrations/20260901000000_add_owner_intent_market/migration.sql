-- Historical owner intents predate market selection and were all created by
-- the Rwanda-only onboarding flow. RW is therefore the safe compatibility value.
ALTER TABLE "OwnerIntent"
ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'RW';
