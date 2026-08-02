const test = require("node:test");
const assert = require("node:assert/strict");

const {
  completedSaleWhere,
  loadTenantDashboardOwnerSummary,
  withBranch,
} = require(
  "../src/modules/dashboard/tenantDashboardSummary.service",
);

function operation(result) {
  const calls = [];

  return {
    calls,
    fn: async (...args) => {
      calls.push(args);
      return result;
    },
  };
}

function databaseFixture() {
  const saleAggregate = operation();
  let saleCall = 0;

  saleAggregate.fn = async (args) => {
    saleAggregate.calls.push([args]);
    saleCall += 1;

    if (saleCall === 1) {
      return {
        _sum: {
          total: 100000,
        },
        _count: {
          _all: 4,
        },
      };
    }

    if (saleCall === 2) {
      return {
        _sum: {
          balanceDue: 30000,
        },
        _count: {
          _all: 2,
        },
      };
    }

    return {
      _sum: {
        balanceDue: 10000,
      },
      _count: {
        _all: 1,
      },
    };
  };

  const expenseAggregate = operation({
    _sum: {
      amount: 5000,
    },
    _count: {
      _all: 1,
    },
  });

  const supplierBillAggregate = operation({
    _sum: {
      balanceDue: 20000,
    },
    _count: {
      _all: 2,
    },
  });

  const queryRaw = operation([
    {
      costOfGoodsSold: 40000,
    },
  ]);

  return {
    calls: {
      saleAggregate: saleAggregate.calls,
      expenseAggregate:
        expenseAggregate.calls,
      supplierBillAggregate:
        supplierBillAggregate.calls,
      queryRaw: queryRaw.calls,
    },

    database: {
      sale: {
        aggregate: saleAggregate.fn,
      },
      expense: {
        aggregate: expenseAggregate.fn,
      },
      supplierBill: {
        aggregate:
          supplierBillAggregate.fn,
      },
      $queryRaw: queryRaw.fn,
    },
  };
}

test(
  "adds the selected store location to a filter",
  () => {
    assert.deepEqual(
      withBranch(
        {
          tenantId: "tenant-1",
        },
        "branch-1",
      ),
      {
        tenantId: "tenant-1",
        branchId: "branch-1",
      },
    );
  },
);

test(
  "keeps the whole-business filter when no location is selected",
  () => {
    assert.deepEqual(
      withBranch(
        {
          tenantId: "tenant-1",
        },
        null,
      ),
      {
        tenantId: "tenant-1",
      },
    );
  },
);

test(
  "only counts completed sales",
  () => {
    const from = new Date(
      "2026-08-02T00:00:00Z",
    );
    const to = new Date(
      "2026-08-02T23:59:59Z",
    );

    assert.deepEqual(
      completedSaleWhere({
        tenantId: "tenant-1",
        activeBranchId: "branch-1",
        from,
        to,
      }),
      {
        tenantId: "tenant-1",
        branchId: "branch-1",
        createdAt: {
          gte: from,
          lte: to,
        },
        isDraft: false,
        isCancelled: false,
      },
    );
  },
);

test(
  "uses the selected location for every owner number",
  async () => {
    const fixture = databaseFixture();

    const todayStart = new Date(
      "2026-08-02T00:00:00Z",
    );
    const todayEnd = new Date(
      "2026-08-02T23:59:59Z",
    );

    await loadTenantDashboardOwnerSummary({
      database: fixture.database,
      tenantId: "tenant-1",
      activeBranchId: "branch-1",
      todayStart,
      todayEnd,
      now: new Date(
        "2026-08-02T12:00:00Z",
      ),
    });

    assert.equal(
      fixture.calls.saleAggregate.length,
      3,
    );
    assert.equal(
      fixture.calls.expenseAggregate.length,
      1,
    );
    assert.equal(
      fixture.calls.supplierBillAggregate
        .length,
      1,
    );
    assert.equal(
      fixture.calls.queryRaw.length,
      1,
    );

    for (
      const [call] of
      fixture.calls.saleAggregate
    ) {
      assert.equal(
        call.where.tenantId,
        "tenant-1",
      );
      assert.equal(
        call.where.branchId,
        "branch-1",
      );
    }

    assert.equal(
      fixture.calls.expenseAggregate[0][0]
        .where.branchId,
      "branch-1",
    );

    assert.equal(
      fixture.calls
        .supplierBillAggregate[0][0]
        .where.branchId,
      "branch-1",
    );
  },
);

test(
  "returns the owner numbers needed at first glance",
  async () => {
    const fixture = databaseFixture();

    const result =
      await loadTenantDashboardOwnerSummary({
        database: fixture.database,
        tenantId: "tenant-1",
        activeBranchId: "branch-1",
        todayStart: new Date(
          "2026-08-02T00:00:00Z",
        ),
        todayEnd: new Date(
          "2026-08-02T23:59:59Z",
        ),
        now: new Date(
          "2026-08-02T12:00:00Z",
        ),
      });

    assert.deepEqual(result, {
      ownerToday: {
        sales: 100000,
        expenses: 5000,
        productCost: 40000,
        profitEstimate: 55000,
        salesCount: 4,
      },
      customersOweMe: {
        total: 30000,
        count: 2,
      },
      overdueCustomerMoney: {
        total: 10000,
        count: 1,
      },
      iOweSuppliers: {
        total: 20000,
        count: 2,
      },
    });
  },
);
