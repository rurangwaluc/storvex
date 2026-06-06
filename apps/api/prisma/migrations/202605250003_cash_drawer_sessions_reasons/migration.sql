
ALTER TABLE public.cash_sessions
  ADD COLUMN IF NOT EXISTS opening_reason TEXT,
  ADD COLUMN IF NOT EXISTS opening_note TEXT,
  ADD COLUMN IF NOT EXISTS closing_reason TEXT,
  ADD COLUMN IF NOT EXISTS closing_explanation TEXT,
  ADD COLUMN IF NOT EXISTS expected_cash_at_close BIGINT,
  ADD COLUMN IF NOT EXISTS cash_difference BIGINT;

CREATE INDEX IF NOT EXISTS cash_sessions_tenant_branch_opened_at_idx
  ON public.cash_sessions (tenant_id, branch_id, opened_at DESC);

CREATE INDEX IF NOT EXISTS cash_sessions_tenant_branch_closed_at_idx
  ON public.cash_sessions (tenant_id, branch_id, closed_at DESC);

CREATE INDEX IF NOT EXISTS cash_movements_session_created_at_idx
  ON public.cash_movements (session_id, created_at DESC);