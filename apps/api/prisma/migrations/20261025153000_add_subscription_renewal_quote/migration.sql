-- STEP 342CN-E / SUBSCRIPTION RENEWAL QUOTE
-- Nullable for compatibility with existing payments.
-- Migration created only; application is a separate reviewed step.
ALTER TABLE "Payment"
ADD COLUMN "renewalQuote" JSONB;
