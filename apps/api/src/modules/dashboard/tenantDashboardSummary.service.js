function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function withBranch(where, activeBranchId, field = "branchId") {
  return activeBranchId
    ? {
        ...where,
        [field]: activeBranchId,
      }
    : where;
}

function completedSaleWhere({
  tenantId,
  activeBranchId,
  from,
  to,
}) {
  return withBranch(
    {
      tenantId,
      createdAt: {
        gte: from,
        lte: to,
      },
      isDraft: false,
      isCancelled: false,
    },
    activeBranchId,
  );
}

async function loadCostOfGoodsSold({
  database,
  tenantId,
  activeBranchId,
  todayStart,
  todayEnd,
}) {
  const rows = activeBranchId
    ? await database.$queryRaw`
        SELECT
          COALESCE(
            SUM(si.quantity * COALESCE(p."costPrice", 0)),
            0
          )::float8 AS "costOfGoodsSold"
        FROM "SaleItem" si
        JOIN "Sale" s
          ON s.id = si."saleId"
        JOIN "Product" p
          ON p.id = si."productId"
        WHERE s."tenantId" = ${tenantId}
          AND s."branchId" = ${activeBranchId}
          AND s."createdAt" >= ${todayStart}
          AND s."createdAt" <= ${todayEnd}
          AND COALESCE(s."isDraft", false) = false
          AND COALESCE(s."isCancelled", false) = false
          AND p."tenantId" = ${tenantId}
      `
    : await database.$queryRaw`
        SELECT
          COALESCE(
            SUM(si.quantity * COALESCE(p."costPrice", 0)),
            0
          )::float8 AS "costOfGoodsSold"
        FROM "SaleItem" si
        JOIN "Sale" s
          ON s.id = si."saleId"
        JOIN "Product" p
          ON p.id = si."productId"
        WHERE s."tenantId" = ${tenantId}
          AND s."createdAt" >= ${todayStart}
          AND s."createdAt" <= ${todayEnd}
          AND COALESCE(s."isDraft", false) = false
          AND COALESCE(s."isCancelled", false) = false
          AND p."tenantId" = ${tenantId}
      `;

  return money(rows?.[0]?.costOfGoodsSold);
}

async function loadTenantDashboardOwnerSummary({
  database,
  tenantId,
  activeBranchId = null,
  todayStart,
  todayEnd,
  now = new Date(),
}) {
  if (!database) {
    throw new Error("Dashboard database is required");
  }

  if (!tenantId) {
    throw new Error("Dashboard tenant is required");
  }

  const todaySaleWhere = completedSaleWhere({
    tenantId,
    activeBranchId,
    from: todayStart,
    to: todayEnd,
  });

  const unpaidCustomerWhere = withBranch(
    {
      tenantId,
      saleType: "CREDIT",
      balanceDue: {
        gt: 0,
      },
      isDraft: false,
      isCancelled: false,
    },
    activeBranchId,
  );

  const overdueCustomerWhere = {
    ...unpaidCustomerWhere,
    dueDate: {
      lt: now,
    },
  };

  const supplierBillWhere = withBranch(
    {
      tenantId,
      status: {
        not: "CANCELLED",
      },
      balanceDue: {
        gt: 0,
      },
    },
    activeBranchId,
  );

  const [
    todaySales,
    approvedExpenses,
    productCost,
    customersOwe,
    overdueCustomers,
    supplierBills,
  ] = await Promise.all([
    database.sale.aggregate({
      where: todaySaleWhere,
      _sum: {
        total: true,
      },
      _count: {
        _all: true,
      },
    }),

    database.expense.aggregate({
      where: withBranch(
        {
          tenantId,
          status: "APPROVED",
          approvedAt: {
            not: null,
          },
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        activeBranchId,
      ),
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),

    loadCostOfGoodsSold({
      database,
      tenantId,
      activeBranchId,
      todayStart,
      todayEnd,
    }),

    database.sale.aggregate({
      where: unpaidCustomerWhere,
      _sum: {
        balanceDue: true,
      },
      _count: {
        _all: true,
      },
    }),

    database.sale.aggregate({
      where: overdueCustomerWhere,
      _sum: {
        balanceDue: true,
      },
      _count: {
        _all: true,
      },
    }),

    database.supplierBill.aggregate({
      where: supplierBillWhere,
      _sum: {
        balanceDue: true,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const sales = money(todaySales?._sum?.total);
  const expenses = money(
    approvedExpenses?._sum?.amount,
  );
  const cost = money(productCost);

  return {
    ownerToday: {
      sales,
      expenses,
      productCost: cost,
      profitEstimate:
        sales - expenses - cost,
      salesCount: Number(
        todaySales?._count?._all || 0,
      ),
    },

    customersOweMe: {
      total: money(
        customersOwe?._sum?.balanceDue,
      ),
      count: Number(
        customersOwe?._count?._all || 0,
      ),
    },

    overdueCustomerMoney: {
      total: money(
        overdueCustomers?._sum?.balanceDue,
      ),
      count: Number(
        overdueCustomers?._count?._all || 0,
      ),
    },

    iOweSuppliers: {
      total: money(
        supplierBills?._sum?.balanceDue,
      ),
      count: Number(
        supplierBills?._count?._all || 0,
      ),
    },
  };
}

module.exports = {
  completedSaleWhere,
  loadTenantDashboardOwnerSummary,
  withBranch,
};
