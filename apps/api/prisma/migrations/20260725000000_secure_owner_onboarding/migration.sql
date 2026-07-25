ALTER TABLE "OwnerIntent"
ADD COLUMN "onboardingTokenHash" TEXT,
ADD COLUMN "onboardingTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "onboardingTokenRevokedAt" TIMESTAMP(3),
ADD COLUMN "lastAccessedAt" TIMESTAMP(3);

CREATE INDEX "OwnerIntent_onboardingTokenExpiresAt_idx"
ON "OwnerIntent"("onboardingTokenExpiresAt");
