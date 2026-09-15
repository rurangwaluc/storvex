-- OwnerLoan is the first Storvex tenant-isolation RLS pilot.
--
-- Application requests establish app.tenant_id with transaction-local
-- set_config(..., true) before accessing this table.
--
-- The table owner / migration administrator remains able to administer the
-- table. Runtime application roles that neither own the table nor have
-- BYPASSRLS are constrained by this policy.

ALTER TABLE public."OwnerLoan"
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OwnerLoan_tenant_isolation"
ON public."OwnerLoan"
AS PERMISSIVE
FOR ALL
TO PUBLIC
USING (
  "tenantId" =
  NULLIF(
    current_setting('app.tenant_id', true),
    ''
  )
)
WITH CHECK (
  "tenantId" =
  NULLIF(
    current_setting('app.tenant_id', true),
    ''
  )
);
