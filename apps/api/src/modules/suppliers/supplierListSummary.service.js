function cleanIds(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

function emptySupplierFinancialSummary() {
  return {
    totals: {
      totalBilled: 0,
      totalPaid: 0,
      balanceDue: 0,
      openBills: 0,
      paymentsCount: 0,
    },
    lastPayment: null,
    lastSupply: null,
  };
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createSummaryMap(supplierIds) {
  return Object.fromEntries(
    supplierIds.map((supplierId) => [
      supplierId,
      emptySupplierFinancialSummary(),
    ]),
  );
}

async function loadSupplierListSummaries({
  database,
  tenantId,
  supplierIds,
}) {
  const cleanTenantId =
    String(tenantId || "").trim();
  const ids = cleanIds(supplierIds);

  if (!cleanTenantId) {
    throw new Error(
      "tenantId is required for supplier summaries",
    );
  }

  if (!database) {
    throw new Error(
      "database is required for supplier summaries",
    );
  }

  if (ids.length === 0) {
    return {};
  }

  const supplierScope = {
    tenantId: cleanTenantId,
    supplierId: {
      in: ids,
    },
  };

  const [
    billTotals,
    openBillCounts,
    paymentCounts,
    latestPayments,
    latestSupplies,
  ] = await Promise.all([
    database.supplierBill.groupBy({
      by: ["supplierId"],
      where: {
        ...supplierScope,
        status: {
          not: "CANCELLED",
        },
      },
      _sum: {
        totalAmount: true,
        paidAmount: true,
        balanceDue: true,
      },
    }),

    database.supplierBill.groupBy({
      by: ["supplierId"],
      where: {
        ...supplierScope,
        status: {
          in: [
            "UNPAID",
            "PARTIAL",
            "OVERDUE",
          ],
        },
        balanceDue: {
          gt: 0,
        },
      },
      _count: {
        _all: true,
      },
    }),

    database.supplierPayment.groupBy({
      by: ["supplierId"],
      where: supplierScope,
      _count: {
        _all: true,
      },
    }),

    database.supplierPayment.findMany({
      where: supplierScope,
      orderBy: [
        {
          supplierId: "asc",
        },
        {
          paidAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      distinct: ["supplierId"],
      select: {
        supplierId: true,
        amount: true,
        method: true,
        paidAt: true,
      },
    }),

    database.supplierSupply.findMany({
      where: supplierScope,
      orderBy: [
        {
          supplierId: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      distinct: ["supplierId"],
      select: {
        id: true,
        supplierId: true,
        createdAt: true,
        documentRef: true,
      },
    }),
  ]);

  const summaries = createSummaryMap(ids);

  for (const row of billTotals) {
    const summary = summaries[row.supplierId];
    if (!summary) continue;

    summary.totals.totalBilled =
      numeric(row?._sum?.totalAmount);
    summary.totals.totalPaid =
      numeric(row?._sum?.paidAmount);
    summary.totals.balanceDue =
      numeric(row?._sum?.balanceDue);
  }

  for (const row of openBillCounts) {
    const summary = summaries[row.supplierId];
    if (!summary) continue;

    summary.totals.openBills =
      numeric(row?._count?._all);
  }

  for (const row of paymentCounts) {
    const summary = summaries[row.supplierId];
    if (!summary) continue;

    summary.totals.paymentsCount =
      numeric(row?._count?._all);
  }

  for (const row of latestPayments) {
    const summary = summaries[row.supplierId];
    if (!summary) continue;

    summary.lastPayment = {
      amount: numeric(row.amount),
      method: row.method || "CASH",
      paidAt: row.paidAt || null,
    };
  }

  for (const row of latestSupplies) {
    const summary = summaries[row.supplierId];
    if (!summary) continue;

    summary.lastSupply = {
      id: row.id,
      createdAt: row.createdAt || null,
      documentRef: row.documentRef || null,
    };
  }

  return summaries;
}

module.exports = {
  emptySupplierFinancialSummary,
  loadSupplierListSummaries,
};
