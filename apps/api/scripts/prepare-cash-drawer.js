const {
  PrismaClient,
} = require("@prisma/client");

const prisma = new PrismaClient();

async function prepareCashEnums() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'cash_movement_type'
      ) THEN
        CREATE TYPE "cash_movement_type"
        AS ENUM (
          'IN',
          'OUT'
        );
      END IF;
    END
    $$
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'cash_movement_reason'
      ) THEN
        CREATE TYPE "cash_movement_reason"
        AS ENUM (
          'FLOAT',
          'WITHDRAWAL',
          'DEPOSIT',
          'EXPENSE',
          'OTHER'
        );
      END IF;
    END
    $$
  `);

  console.log(
    "Cash drawer enums are ready.",
  );
}

async function prepareCashSessions() {
  await prisma.$executeRawUnsafe(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.cash_sessions (
      id UUID NOT NULL DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      branch_id TEXT,
      opened_by UUID,
      opened_at TIMESTAMPTZ(6)
        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      opening_cash BIGINT NOT NULL DEFAULT 0,
      closed_by UUID,
      closed_at TIMESTAMPTZ(6),
      counted_cash BIGINT,
      close_note TEXT,
      created_at TIMESTAMPTZ(6)
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT cash_sessions_pkey
        PRIMARY KEY (id)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS
      cash_sessions_tenant_id_idx
    ON public.cash_sessions (tenant_id)
  `);

  console.log(
    "cash_sessions table is ready.",
  );
}

async function prepareCashMovements() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.cash_movements (
      id UUID NOT NULL DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      branch_id TEXT,
      session_id UUID NOT NULL,
      type "cash_movement_type" NOT NULL,
      reason "cash_movement_reason" NOT NULL,
      amount BIGINT NOT NULL,
      note TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ(6)
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT cash_movements_pkey
        PRIMARY KEY (id)
    )
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
          'cash_movements_session_id_fkey'
      ) THEN
        ALTER TABLE public.cash_movements
          ADD CONSTRAINT
            cash_movements_session_id_fkey
          FOREIGN KEY (session_id)
          REFERENCES public.cash_sessions(id)
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
      END IF;
    END
    $$
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS
      cash_movements_session_id_idx
    ON public.cash_movements (session_id)
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS
      cash_movements_tenant_id_idx
    ON public.cash_movements (tenant_id)
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS
      cash_movements_tenant_branch_created_at_idx
    ON public.cash_movements (
      tenant_id,
      branch_id,
      created_at DESC
    )
  `);

  console.log(
    "cash_movements table is ready.",
  );
}

async function main() {
  await prepareCashEnums();
  await prepareCashSessions();
  await prepareCashMovements();
}

main()
  .catch((error) => {
    console.error(
      "Failed to prepare cash drawer tables:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
