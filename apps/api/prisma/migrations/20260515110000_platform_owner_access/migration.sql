-- Platform owner access hardening

ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'PLATFORM_SUPPORT';

ALTER TABLE "PlatformUser"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PlatformUser_role_idx" ON "PlatformUser" ("role");
CREATE INDEX IF NOT EXISTS "PlatformUser_isActive_idx" ON "PlatformUser" ("isActive");