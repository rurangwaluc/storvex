#!/usr/bin/env bash

set -euo pipefail

cd /app

BASELINE_DIR="apps/api/prisma/migrations/0_baseline"

WHATSAPP_MIGRATION="20260214143250_whatsapp_growth_engine"
SUPPORT_MIGRATION="20260517170000_support_tickets"
DOCUMENT_SETTINGS_MIGRATION="202605250001_document_header_tax_settings"

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

extract_failed_migration() {
  local migration_name

  migration_name="$(
    printf '%s\n' "$MIGRATION_OUTPUT" \
      | sed -n \
        's/^Migration name: \(.*\)$/\1/p' \
      | tail -n 1
  )"

  if test -z "$migration_name"; then
    migration_name="$(
      printf '%s\n' "$MIGRATION_OUTPUT" \
        | sed -n \
          's/^The `\([^`]*\)` migration started.*$/\1/p' \
        | tail -n 1
    )"
  fi

  printf '%s' "$migration_name"
}

echo "Running Storvex database migrations..."

for attempt in 1 2 3 4 5 6; do
  run_and_capture

  if test "$MIGRATION_STATUS" -eq 0; then
    echo \
      "Storvex database migrations completed."

    exit 0
  fi

  FAILED_MIGRATION="$(
    extract_failed_migration
  )"

  if test -z "$FAILED_MIGRATION"; then
    echo
    echo \
      "Could not identify the failed migration."

    exit "$MIGRATION_STATUS"
  fi

  echo
  echo \
    "Current failed migration: $FAILED_MIGRATION"

  case "$FAILED_MIGRATION" in
    "$WHATSAPP_MIGRATION")
      echo \
        "Recovering known WhatsApp migration..."

      resolve_rolled_back \
        "$WHATSAPP_MIGRATION"

      node \
        apps/api/scripts/prepare-whatsapp-audit-enum.js
      ;;

    "$SUPPORT_MIGRATION")
      echo \
        "Recovering platform support migration..."

      resolve_rolled_back \
        "$SUPPORT_MIGRATION"

      node \
        apps/api/scripts/prepare-platform-user-table.js
      ;;

    "$DOCUMENT_SETTINGS_MIGRATION")
      echo \
        "Recovering document settings migration..."

      resolve_rolled_back \
        "$DOCUMENT_SETTINGS_MIGRATION"

      node \
        apps/api/scripts/prepare-document-settings.js
      ;;

    *)
      echo \
        "Migration failed for an unexpected reason."

      exit "$MIGRATION_STATUS"
      ;;
  esac

  echo
  echo \
    "Retrying remaining Storvex migrations..."
done

echo
echo \
  "Migration recovery exceeded the supported attempts."

exit 1
