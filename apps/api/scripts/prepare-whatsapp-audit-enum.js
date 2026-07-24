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
      ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "takenAt" TIMESTAMP(3)
  `);

  console.log(
    "InterStoreDeal dueDate column ready.",
  );

  console.log(
    "InterStoreDeal takenAt column ready.",
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
