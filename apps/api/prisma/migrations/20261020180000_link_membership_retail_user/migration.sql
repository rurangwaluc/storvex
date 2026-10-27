-- Link an authenticated business membership to its retail user.
-- Nullable for compatibility with existing membership records.

ALTER TABLE "StorvexBusinessMembership"
  ADD COLUMN "retailUserId" TEXT;

-- A retail user can have at most one linked membership.

CREATE UNIQUE INDEX
  "StorvexBusinessMembership_retailUserId_key"
ON "StorvexBusinessMembership"("retailUserId");

-- Support a composite foreign key that verifies business ownership.

CREATE UNIQUE INDEX IF NOT EXISTS
  "User_id_tenantId_storvex_membership_key"
ON "User"("id", "tenantId");

ALTER TABLE "StorvexBusinessMembership"
  ADD CONSTRAINT
  "StorvexBusinessMembership_retailUser_tenant_fkey"
  FOREIGN KEY ("retailUserId", "tenantId")
  REFERENCES "User"("id", "tenantId")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
