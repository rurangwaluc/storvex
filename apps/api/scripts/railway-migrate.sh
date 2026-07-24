#!/usr/bin/env bash

set -euo pipefail

cd /app

BASELINE_DIR="apps/api/prisma/migrations/0_baseline"

WHATSAPP_MIGRATION="20260214143250_whatsapp_growth_engine"
SUPPORT_MIGRATION="20260517170000_support_tickets"

if test -d "$BASELINE_DIR"; then
  rm -rf /tmp/storvex-0-baseline

  mv \
    "$BASELINE_DIR" \
    /tmp/storvex-0-baseline
fi

run_migrations() {
  pnpm \
    --filter @storvex/api \
    exec prisma migrate deploy
}

resolve_rolled_back() {
  local migration_name="$1"

  pnpm \
    --filter @storvex/api \
    exec prisma migrate resolve \
    --rolled-back "$migration_name"
}

run_and_capture() {
  set +e

  MIGRATION_OUTPUT="$(
    run_migrations 2>&1
  )"

  MIGRATION_STATUS=$?

  set -e

  printf '%s\n' \
    "$MIGRATION_OUTPUT"
}

contains_migration() {
  local migration_name="$1"

  printf '%s\n' \
    "$MIGRATION_OUTPUT" \
    | grep -q "$migration_name"
}

echo "Running Storvex database migrations..."

for attempt in 1 2 3 4; do
  run_and_capture

  if test "$MIGRATION_STATUS" -eq 0; then
    echo \
      "Storvex database migrations completed."

    exit 0
  fi

  if contains_migration \
    "$WHATSAPP_MIGRATION"; then
    echo
    echo \
      "Recovering known WhatsApp migration..."

    resolve_rolled_back \
      "$WHATSAPP_MIGRATION"

    node \
      apps/api/scripts/prepare-whatsapp-audit-enum.js

    echo
    echo \
      "Retrying remaining Storvex migrations..."

    continue
  fi

  if contains_migration \
    "$SUPPORT_MIGRATION"; then
    echo
    echo \
      "Recovering platform support migration..."

    resolve_rolled_back \
      "$SUPPORT_MIGRATION"

    node \
      apps/api/scripts/prepare-platform-user-table.js

    echo
    echo \
      "Retrying remaining Storvex migrations..."

    continue
  fi

  echo
  echo \
    "Migration failed for an unexpected reason."

  exit "$MIGRATION_STATUS"
done

echo
echo \
  "Migration recovery exceeded the supported attempts."

exit 1
