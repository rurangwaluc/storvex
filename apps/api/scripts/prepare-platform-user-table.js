const {
  PrismaClient,
} = require("@prisma/client");

const prisma = new PrismaClient();

async function tableExists(tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT to_regclass($1) IS NOT NULL AS "exists"
    `,
    `public.${tableName}`,
  );

  return rows[0]?.exists === true;
}

async function columnExists(
  tableName,
  columnName,
) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS "exists"
    `,
    tableName,
    columnName,
  );

  return rows[0]?.exists === true;
}

async function preparePlatformUserTable() {
  const lowercaseExists =
    await tableExists("platform_users");

  const legacyExists =
    await tableExists('"PlatformUser"');

  if (
    !lowercaseExists
    && legacyExists
  ) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "PlatformUser"
      RENAME TO "platform_users"
    `);

    console.log(
      "Renamed PlatformUser to platform_users.",
    );
  }

  const normalizedExists =
    await tableExists("platform_users");

  if (!normalizedExists) {
    throw new Error(
      "Neither PlatformUser nor platform_users exists.",
    );
  }

  const passwordExists =
    await columnExists(
      "platform_users",
      "password",
    );

  const passwordHashExists =
    await columnExists(
      "platform_users",
      "passwordHash",
    );

  if (
    passwordExists
    && !passwordHashExists
  ) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "platform_users"
      RENAME COLUMN "password"
      TO "passwordHash"
    `);

    console.log(
      "Renamed platform user password to passwordHash.",
    );
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "platform_users"
      ADD COLUMN IF NOT EXISTS "name" TEXT,
      ADD COLUMN IF NOT EXISTS "isActive"
        BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "updatedAt"
        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "lastLoginAt"
        TIMESTAMP(3)
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "platform_users"
    SET "name" = COALESCE(
      NULLIF(BTRIM("name"), ''),
      NULLIF(
        SPLIT_PART("email", '@', 1),
        ''
      ),
      'Platform user'
    )
    WHERE
      "name" IS NULL
      OR BTRIM("name") = ''
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "platform_users"
      ALTER COLUMN "name" SET NOT NULL
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS
      "platform_users_email_key"
    ON "platform_users" ("email")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS
      "platform_users_role_idx"
    ON "platform_users" ("role")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS
      "platform_users_isActive_idx"
    ON "platform_users" ("isActive")
  `);

  console.log(
    "Platform user table is ready.",
  );
}

preparePlatformUserTable()
  .catch((error) => {
    console.error(
      "Failed to prepare platform user table:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
