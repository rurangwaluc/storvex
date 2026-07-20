-- Add dedicated audit values for Marketplace delivery outcomes.
-- PostgreSQL keeps enum values after deployment, so these additions
-- are intentionally forward-only and guarded against duplicate runs.

ALTER TYPE "AuditEntity"
ADD VALUE IF NOT EXISTS 'MARKETPLACE_ORDER';

ALTER TYPE "AuditAction"
ADD VALUE IF NOT EXISTS 'MARKETPLACE_DELIVERY_FAILED';
