-- OwnerLoanPayment tenant isolation.
--
-- app.tenant_id is established transaction-locally by withTenantDb().
--
-- In addition to isolating the payment row itself, this policy requires
-- its parent OwnerLoan to belong to the same active tenant.

ALTER TABLE public."OwnerLoanPayment"
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OwnerLoanPayment_tenant_isolation"
ON public."OwnerLoanPayment"
AS PERMISSIVE
FOR ALL
TO PUBLIC
USING (
  "tenantId" =
    NULLIF(
      current_setting('app.tenant_id', true),
      ''
    )
  AND EXISTS (
    SELECT 1
    FROM public."OwnerLoan" AS parent_loan
    WHERE parent_loan.id =
      "OwnerLoanPayment"."loanId"
      AND parent_loan."tenantId" =
        "OwnerLoanPayment"."tenantId"
  )
)
WITH CHECK (
  "tenantId" =
    NULLIF(
      current_setting('app.tenant_id', true),
      ''
    )
  AND EXISTS (
    SELECT 1
    FROM public."OwnerLoan" AS parent_loan
    WHERE parent_loan.id =
      "OwnerLoanPayment"."loanId"
      AND parent_loan."tenantId" =
        "OwnerLoanPayment"."tenantId"
  )
);
