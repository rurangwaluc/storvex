#!/usr/bin/env bash

set -euo pipefail

cd /app

BASELINE_DIR="apps/api/prisma/migrations/0_baseline"
FAILED_MIGRATION="20260214143250_whatsapp_growth_engine"

if test -d "$BASELINE_DIR"; then
  mv \
    "$BASELINE_DIR" \
    "/tmp/storvex-0-baseline"
fi

run_migrations() {
  pnpm \
    --filter @storvex/api \
    exec prisma migrate deploy
}

echo "Running Storvex database migrations..."

set +e
MIGRATION_OUTPUT="$(
  run_migrations 2>&1
)"
MIGRATION_STATUS=$?
set -e

printf '%s\n' \
  "$MIGRATION_OUTPUT"

if test "$MIGRATION_STATUS" -eq 0; then
  echo "Storvex database migrations completed."
  exit 0
fi

KNOWN_ENUM_FAILURE=false

if printf '%s\n' "$MIGRATION_OUTPUT" \
  | grep -q "$FAILED_MIGRATION"; then
  if printf '%s\n' "$MIGRATION_OUTPUT" \
    | grep -Eq \
      'unsafe use of new value|P3009|P3018'; then
    KNOWN_ENUM_FAILURE=true
  fi
fi

if test "$KNOWN_ENUM_FAILURE" != "true"; then
  echo "Migration failed for an unexpected reason."
  exit "$MIGRATION_STATUS"
fi

echo
echo "Recovering known WhatsApp AuditAction enum migration..."

pnpm \
  --filter @storvex/api \
  exec prisma migrate resolve \
  --rolled-back "$FAILED_MIGRATION"

node \
  apps/api/scripts/prepare-whatsapp-audit-enum.js

echo
echo "Retrying remaining Storvex migrations..."

run_migrations

echo "Storvex database migrations completed after enum recovery."
