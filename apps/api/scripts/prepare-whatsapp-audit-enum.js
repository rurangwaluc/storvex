const {
  PrismaClient,
} = require("@prisma/client");

const prisma =
  new PrismaClient();

const auditActionValues = [
  "MARK_RECEIVED",
  "ADD_PAYMENT",
  "EXPENSE_CREATED",
  "EXPENSE_APPROVED",
  "EXPENSE_DELETED",
];

async function prepareAuditActionEnum() {
  for (
    const value
    of auditActionValues
  ) {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS '${value}'`,
    );

    console.log(
      `AuditAction value ready: ${value}`,
    );
  }
}

async function prepareInterStoreDealColumns() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "InterStoreDeal"
      ADD COLUMN IF NOT EXISTS "resellerName" TEXT,
      ADD COLUMN IF NOT EXISTS "resellerPhone" TEXT,
      ADD COLUMN IF NOT EXISTS "resellerStore" TEXT,
      ADD COLUMN IF NOT EXISTS "resellerWorkplace" TEXT,
      ADD COLUMN IF NOT EXISTS "resellerDistrict" TEXT,
      ADD COLUMN IF NOT EXISTS "resellerSector" TEXT,
      ADD COLUMN IF NOT EXISTS "resellerAddress" TEXT,
      ADD COLUMN IF NOT EXISTS "resellerNationalId" TEXT,
      ADD COLUMN IF NOT EXISTS "productCategory" TEXT,
      ADD COLUMN IF NOT EXISTS "productColor" TEXT,
      ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "soldQuantity" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "soldPrice" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "paidAmount" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
      ADD COLUMN IF NOT EXISTS "saleId" TEXT,
      ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "takenAt" TIMESTAMP(3)
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "InterStoreDeal"
    SET
      "resellerName" = COALESCE(
        "resellerName",
        "externalSupplierName",
        'Unknown'
      ),
      "resellerPhone" = COALESCE(
        "resellerPhone",
        "externalSupplierPhone",
        'Unknown'
      ),
      "serial" = COALESCE(
        "serial",
        'Unknown'
      )
    WHERE
      "resellerName" IS NULL
      OR "resellerPhone" IS NULL
      OR "serial" IS NULL
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "InterStoreDeal"
      ALTER COLUMN "resellerName" SET NOT NULL,
      ALTER COLUMN "resellerPhone" SET NOT NULL,
      ALTER COLUMN "serial" SET NOT NULL
  `);

  console.log(
    "InterStoreDeal reseller columns ready.",
  );

  console.log(
    "InterStoreDeal quantity and sale columns ready.",
  );

  console.log(
    "InterStoreDeal date columns ready.",
  );
}

async function main() {
  await prepareAuditActionEnum();
  await prepareInterStoreDealColumns();
}

main()
  .catch((error) => {
    console.error(
      "Failed to prepare WhatsApp migration dependencies:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
