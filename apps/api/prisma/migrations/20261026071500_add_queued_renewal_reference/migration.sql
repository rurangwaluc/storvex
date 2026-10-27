-- STORVEX / STEP 342CN-Z
-- Bind queued trial purchases to their exact successful payment.
-- Nullable to preserve existing subscriptions and legacy trial queues.
-- Apply separately after explicit database review.

ALTER TABLE "Subscription"
ADD COLUMN "queuedRenewalReference" TEXT;
