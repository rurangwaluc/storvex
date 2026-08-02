const test = require("node:test");
const assert = require("node:assert/strict");

const {
  emptySupplierFinancialSummary,
  loadSupplierListSummaries,
} = require(
  "../src/modules/suppliers/supplierListSummary.service",
);

function operation(result = []) {
  const calls = [];

  return {
    calls,
    fn: async (args) => {
      calls.push(args);
      return result;
    },
  };
}

function databaseFixture({
  billTotals = [],
  openBillCounts = [],
  paymentCounts = [],
  latestPayments = [],
  latestSupplies = [],
} = {}) {
  const billGroupBy = operation();
  let billCall = 0;

  billGroupBy.fn = async (args) => {
    billGroupBy.calls.push(args);
    billCall += 1;

    return billCall === 1
      ? billTotals
      : openBillCounts;
  };

  const paymentGroupBy =
    operation(paymentCounts);
  const paymentFindMany =
    operation(latestPayments);
  const supplyFindMany =
    operation(latestSupplies);

  return {
    calls: {
      billGroupBy: billGroupBy.calls,
      paymentGroupBy:
        paymentGroupBy.calls,
      paymentFindMany:
        paymentFindMany.calls,
      supplyFindMany:
        supplyFindMany.calls,
    },

    database: {
      supplierBill: {
        groupBy: billGroupBy.fn,
      },
      supplierPayment: {
        groupBy: paymentGroupBy.fn,
        findMany: paymentFindMany.fn,
      },
      supplierSupply: {
        findMany: supplyFindMany.fn,
      },
    },
  };
}

test(
  "returns no summaries and runs no queries for an empty supplier list",
  async () => {
    const fixture = databaseFixture();

    const result =
      await loadSupplierListSummaries({
        database: fixture.database,
        tenantId: "tenant-1",
        supplierIds: [],
      });

    assert.deepEqual(result, {});
    assert.equal(
      fixture.calls.billGroupBy.length,
      0,
    );
    assert.equal(
      fixture.calls.paymentGroupBy.length,
      0,
    );
    assert.equal(
      fixture.calls.paymentFindMany.length,
      0,
    );
    assert.equal(
      fixture.calls.supplyFindMany.length,
      0,
    );
  },
);

test(
  "uses one tenant-scoped supplier set for every summary query",
  async () => {
    const fixture = databaseFixture();

    await loadSupplierListSummaries({
      database: fixture.database,
      tenantId: "tenant-1",
      supplierIds: [
        "supplier-1",
        "supplier-2",
        "supplier-1",
      ],
    });

    const calls = [
      ...fixture.calls.billGroupBy,
      ...fixture.calls.paymentGroupBy,
      ...fixture.calls.paymentFindMany,
      ...fixture.calls.supplyFindMany,
    ];

    assert.equal(calls.length, 5);

    for (const call of calls) {
      assert.equal(
        call.where.tenantId,
        "tenant-1",
      );

      assert.deepEqual(
        call.where.supplierId,
        {
          in: [
            "supplier-1",
            "supplier-2",
          ],
        },
      );
    }
  },
);

test(
  "uses the correct bill filters",
  async () => {
    const fixture = databaseFixture();

    await loadSupplierListSummaries({
      database: fixture.database,
      tenantId: "tenant-1",
      supplierIds: ["supplier-1"],
    });

    assert.deepEqual(
      fixture.calls.billGroupBy[0]
        .where.status,
      {
        not: "CANCELLED",
      },
    );

    assert.deepEqual(
      fixture.calls.billGroupBy[1]
        .where.status,
      {
        in: [
          "UNPAID",
          "PARTIAL",
          "OVERDUE",
        ],
      },
    );

    assert.deepEqual(
      fixture.calls.billGroupBy[1]
        .where.balanceDue,
      {
        gt: 0,
      },
    );
  },
);

test(
  "maps financial activity to the correct supplier",
  async () => {
    const paidAt =
      new Date("2026-07-20T10:00:00Z");
    const suppliedAt =
      new Date("2026-07-19T09:00:00Z");

    const fixture = databaseFixture({
      billTotals: [
        {
          supplierId: "supplier-1",
          _sum: {
            totalAmount: 1200,
            paidAmount: 400,
            balanceDue: 800,
          },
        },
      ],
      openBillCounts: [
        {
          supplierId: "supplier-1",
          _count: {
            _all: 2,
          },
        },
      ],
      paymentCounts: [
        {
          supplierId: "supplier-1",
          _count: {
            _all: 3,
          },
        },
      ],
      latestPayments: [
        {
          supplierId: "supplier-1",
          amount: 400,
          method: "MOMO",
          paidAt,
        },
      ],
      latestSupplies: [
        {
          id: "supply-1",
          supplierId: "supplier-1",
          createdAt: suppliedAt,
          documentRef: "INV-100",
        },
      ],
    });

    const result =
      await loadSupplierListSummaries({
        database: fixture.database,
        tenantId: "tenant-1",
        supplierIds: [
          "supplier-1",
          "supplier-2",
        ],
      });

    assert.deepEqual(
      result["supplier-1"],
      {
        totals: {
          totalBilled: 1200,
          totalPaid: 400,
          balanceDue: 800,
          openBills: 2,
          paymentsCount: 3,
        },
        lastPayment: {
          amount: 400,
          method: "MOMO",
          paidAt,
        },
        lastSupply: {
          id: "supply-1",
          createdAt: suppliedAt,
          documentRef: "INV-100",
        },
      },
    );

    assert.deepEqual(
      result["supplier-2"],
      emptySupplierFinancialSummary(),
    );
  },
);

test(
  "does not map activity for an unrequested supplier",
  async () => {
    const fixture = databaseFixture({
      billTotals: [
        {
          supplierId: "other-supplier",
          _sum: {
            totalAmount: 100,
            paidAmount: 0,
            balanceDue: 100,
          },
        },
      ],
      paymentCounts: [
        {
          supplierId: "other-supplier",
          _count: {
            _all: 1,
          },
        },
      ],
    });

    const result =
      await loadSupplierListSummaries({
        database: fixture.database,
        tenantId: "tenant-1",
        supplierIds: ["supplier-1"],
      });

    assert.deepEqual(
      result,
      {
        "supplier-1":
          emptySupplierFinancialSummary(),
      },
    );
  },
);

test(
  "requires an explicit tenant and database",
  async () => {
    await assert.rejects(
      loadSupplierListSummaries({
        database: {},
        tenantId: "",
        supplierIds: ["supplier-1"],
      }),
      /tenantId is required/,
    );

    await assert.rejects(
      loadSupplierListSummaries({
        database: null,
        tenantId: "tenant-1",
        supplierIds: ["supplier-1"],
      }),
      /database is required/,
    );
  },
);
