const { PrismaClient } = require("@prisma/client");
const {
  recordMoneyAccountMovement,
} = require("../src/modules/money/moneyAccount.service");

const prisma = new PrismaClient();

function moneyMethodFromExpensePaidFrom(paidFrom) {
  const value = String(paidFrom || "").trim().toUpperCase();

  if (value === "BANK") return "BANK";
  if (value === "MOMO") return "MOMO";
  if (value === "OWNER_MONEY") return "OTHER";
  if (value === "OTHER") return "OTHER";

  return null;
}

async function main() {
  const expenses = await prisma.expense.findMany({
    where: {
      status: "APPROVED",
    },
    orderBy: { approvedAt: "asc" },
    select: {
      id: true,
      tenantId: true,
      branchId: true,
      title: true,
      category: true,
      amount: true,
      paidFrom: true,
      approvedById: true,
      cashDrawerMovementId: true,
    },
  });

  let checked = 0;
  let skippedCashDrawer = 0;
  let skippedExisting = 0;
  let skippedMissingMethod = 0;
  let created = 0;

  for (const expense of expenses) {
    checked += 1;

    if (expense.paidFrom === "CASH_DRAWER") {
      skippedCashDrawer += 1;
      continue;
    }

    const method = moneyMethodFromExpensePaidFrom(expense.paidFrom);

    if (!method) {
      skippedMissingMethod += 1;
      continue;
    }

    const existing = await prisma.moneyAccountMovement.findFirst({
      where: {
        sourceType: "Expense",
        sourceId: expense.id,
      },
      select: { id: true },
    });

    if (existing) {
      skippedExisting += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await recordMoneyAccountMovement(tx, {
        tenantId: expense.tenantId,
        branchId: expense.branchId,
        method,
        direction: "OUT",
        reason: "OTHER",
        amount: Number(expense.amount || 0),
        sourceType: "Expense",
        sourceId: expense.id,
        note: `Backfilled approved expense: ${expense.title || expense.category || expense.id}`,
        createdById: expense.approvedById || null,
      });
    });

    created += 1;
  }

  console.log({
    checked,
    skippedCashDrawer,
    skippedExisting,
    skippedMissingMethod,
    created,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
