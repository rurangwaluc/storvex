const { PrismaClient } = require("@prisma/client");
const {
  normalizeMoneyAccountType,
  recordMoneyAccountMovement,
} = require("../src/modules/money/moneyAccount.service");

const prisma = new PrismaClient();

async function main() {
  const payments = await prisma.salePayment.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      tenantId: true,
      branchId: true,
      saleId: true,
      amount: true,
      method: true,
      note: true,
      receivedById: true,
      createdAt: true,
    },
  });

  let checked = 0;
  let skippedCash = 0;
  let skippedExisting = 0;
  let created = 0;

  for (const payment of payments) {
    checked += 1;

    const accountType = normalizeMoneyAccountType(payment.method);

    if (!accountType) {
      skippedCash += 1;
      continue;
    }

    const existing = await prisma.moneyAccountMovement.findFirst({
      where: {
        sourceType: "SalePayment",
        sourceId: payment.id,
      },
      select: { id: true },
    });

    if (existing) {
      skippedExisting += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await recordMoneyAccountMovement(tx, {
        tenantId: payment.tenantId,
        branchId: payment.branchId || null,
        method: payment.method,
        direction: "IN",
        reason: "OTHER",
        amount: Number(payment.amount || 0),
        sourceType: "SalePayment",
        sourceId: payment.id,
        note: `Backfilled sale payment ${payment.saleId}`,
        createdById: payment.receivedById || null,
      });
    });

    created += 1;
  }

  console.log({
    checked,
    skippedCash,
    skippedExisting,
    created,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
