-- Preserve existing trial history.
-- NULL accountId is permitted for historical and legacy signups.
ALTER TABLE "TrialGuard"
  ADD COLUMN "accountId" TEXT;

-- Each verified Storvex account may consume only one trial.
CREATE UNIQUE INDEX "TrialGuard_accountId_key"
  ON "TrialGuard"("accountId");
