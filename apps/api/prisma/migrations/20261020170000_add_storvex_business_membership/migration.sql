-- STORVEX AUTHORIZATION FOUNDATION
-- Isolated membership migration proposal
-- REVIEW ONLY: NOT APPLIED

CREATE TYPE "StorvexMembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

CREATE TYPE "StorvexBusinessRole" AS ENUM ('OWNER', 'MANAGER', 'CASHIER', 'SELLER', 'STOREKEEPER', 'TECHNICIAN');

CREATE TABLE "StorvexBusinessMembership" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "StorvexBusinessRole" NOT NULL,
    "status" "StorvexMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorvexBusinessMembership_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StorvexBusinessMembership_tenantId_status_idx" ON "StorvexBusinessMembership"("tenantId", "status");

CREATE INDEX "StorvexBusinessMembership_accountId_status_idx" ON "StorvexBusinessMembership"("accountId", "status");

CREATE UNIQUE INDEX "StorvexBusinessMembership_accountId_tenantId_key" ON "StorvexBusinessMembership"("accountId", "tenantId");

ALTER TABLE "StorvexBusinessMembership" ADD CONSTRAINT "StorvexBusinessMembership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StorvexAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StorvexBusinessMembership" ADD CONSTRAINT "StorvexBusinessMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
