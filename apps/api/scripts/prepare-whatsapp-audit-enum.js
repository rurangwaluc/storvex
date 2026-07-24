const {
  PrismaClient,
} = require("@prisma/client");

const prisma =
  new PrismaClient();

const values = [
  "MARK_RECEIVED",
  "ADD_PAYMENT",
  "EXPENSE_CREATED",
  "EXPENSE_APPROVED",
  "EXPENSE_DELETED",
];

async function main() {
  for (const value of values) {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS '${value}'`,
    );

    console.log(
      `AuditAction value ready: ${value}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "Failed to prepare AuditAction enum:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
