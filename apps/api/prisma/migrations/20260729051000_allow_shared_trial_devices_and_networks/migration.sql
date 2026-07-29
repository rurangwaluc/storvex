-- A device, browser, or public network may be shared by multiple legitimate businesses.
-- Free-trial reuse is enforced only by verified email and phone identity.

DROP INDEX IF EXISTS "TrialGuard_deviceId_key";
DROP INDEX IF EXISTS "TrialGuard_browserFingerprint_key";

CREATE INDEX IF NOT EXISTS "TrialGuard_deviceId_idx"
ON "TrialGuard"("deviceId");

CREATE INDEX IF NOT EXISTS "TrialGuard_browserFingerprint_idx"
ON "TrialGuard"("browserFingerprint");
