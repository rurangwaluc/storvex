-- 1) Add new columns to OwnerIntent
ALTER TABLE "OwnerIntent"
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deviceId" TEXT,
  ADD COLUMN IF NOT EXISTS "trialGrantedAt" TIMESTAMP(3);

-- 2) Enum for OTP channel (safe create)
DO $$
BEGIN
  CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'PHONE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) OTP codes table
CREATE TABLE IF NOT EXISTS "OtpCode" (
  "id"         TEXT NOT NULL,
  "intentId"   TEXT NOT NULL,
  "channel"    "OtpChannel" NOT NULL,
  "target"     TEXT NOT NULL,
  "codeHash"   TEXT NOT NULL,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "attempts"   INTEGER NOT NULL DEFAULT 0,
  "verifiedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- 4) FK to OwnerIntent
DO $$
BEGIN
  ALTER TABLE "OtpCode"
    ADD CONSTRAINT "OtpCode_intentId_fkey"
    FOREIGN KEY ("intentId") REFERENCES "OwnerIntent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5) Indexes for OTP table
CREATE INDEX IF NOT EXISTS "OtpCode_intentId_channel_idx" ON "OtpCode" ("intentId", "channel");
CREATE INDEX IF NOT EXISTS "OtpCode_target_idx"           ON "OtpCode" ("target");
CREATE INDEX IF NOT EXISTS "OtpCode_expiresAt_idx"        ON "OtpCode" ("expiresAt");

-- 6) TrialGuard table
CREATE TABLE IF NOT EXISTS "TrialGuard" (
  "id"        TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "phone"     TEXT NOT NULL,
  "deviceId"  TEXT NOT NULL,
  "ip"        TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrialGuard_pkey" PRIMARY KEY ("id")
);

-- 7) Unique constraints for anti-abuse
DO $$
BEGIN
  ALTER TABLE "TrialGuard" ADD CONSTRAINT "TrialGuard_email_key" UNIQUE ("email");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "TrialGuard" ADD CONSTRAINT "TrialGuard_phone_key" UNIQUE ("phone");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "TrialGuard" ADD CONSTRAINT "TrialGuard_deviceId_key" UNIQUE ("deviceId");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;