const test = require("node:test");
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");

function requiredEnvironment(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(
      `${name} is required for the OwnerLoanPayment RLS integration test.`,
    );
  }

  return value;
}

const databaseUrl = requiredEnvironment(
  "RLS_TEST_DATABASE_URL",
);

const tenantA = requiredEnvironment(
  "RLS_TEST_TENANT_A",
);

const tenantB = requiredEnvironment(
  "RLS_TEST_TENANT_B",
);

const runId = requiredEnvironment(
  "RLS_TEST_RUN_ID",
);

if (tenantA === tenantB) {
  throw new Error(
    "RLS test tenants must be different.",
  );
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

const loanA = `rls-loan-a-${runId}`;
const loanB = `rls-loan-b-${runId}`;

const paymentA = `rls-payment-a-${runId}`;
const paymentB = `rls-payment-b-${runId}`;
const wrongTenantPayment =
  `rls-payment-wrong-tenant-${runId}`;
const wrongParentPayment =
  `rls-payment-wrong-parent-${runId}`;
const missingContextPayment =
  `rls-payment-no-context-${runId}`;

function loanData(id, tenantId, partyName) {
  return {
    id,
    tenantId,
    type: "GIVEN_OUT",
    partyName,
    originalAmount: 1000,
    paidAmount: 0,
    balanceDue: 1000,
    status: "OPEN",
    paymentMethod: "CASH",
  };
}

function paymentData(
  id,
  tenantId,
  loanId,
  amount = 100,
) {
  return {
    id,
    tenantId,
    loanId,
    amount,
    method: "CASH",
  };
}

async function withTenant(tenantId, callback) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT set_config(
        'app.tenant_id',
        ${tenantId},
        true
      )
    `;

    return callback(tx);
  });
}

async function visiblePayments(db) {
  return db.ownerLoanPayment.findMany({
    where: {
      id: {
        in: [
          paymentA,
          paymentB,
          wrongTenantPayment,
          wrongParentPayment,
          missingContextPayment,
        ],
      },
    },
    select: {
      id: true,
      tenantId: true,
      loanId: true,
    },
    orderBy: {
      id: "asc",
    },
  });
}

test(
  "OwnerLoanPayment RLS enforces tenant and parent-loan isolation",
  async () => {
    try {
      const roleRows =
        await prisma.$queryRawUnsafe(`
          SELECT
            current_user,
            session_user,
            row_security_active(
              'public."OwnerLoan"'::regclass
            ) AS loan_rls_active,
            row_security_active(
              'public."OwnerLoanPayment"'::regclass
            ) AS payment_rls_active
        `);

      assert.equal(
        roleRows[0]?.current_user,
        "storvex_rls_test",
      );

      assert.equal(
        roleRows[0]?.loan_rls_active,
        true,
      );

      assert.equal(
        roleRows[0]?.payment_rls_active,
        true,
      );

      await withTenant(
        tenantA,
        (tx) =>
          tx.ownerLoan.create({
            data: loanData(
              loanA,
              tenantA,
              "Tenant A payment RLS test",
            ),
          }),
      );

      await withTenant(
        tenantB,
        (tx) =>
          tx.ownerLoan.create({
            data: loanData(
              loanB,
              tenantB,
              "Tenant B payment RLS test",
            ),
          }),
      );

      assert.deepEqual(
        await visiblePayments(prisma),
        [],
      );

      await assert.rejects(
        prisma.ownerLoanPayment.create({
          data: paymentData(
            missingContextPayment,
            tenantA,
            loanA,
          ),
        }),
      );

      await withTenant(
        tenantA,
        (tx) =>
          tx.ownerLoanPayment.create({
            data: paymentData(
              paymentA,
              tenantA,
              loanA,
            ),
          }),
      );

      await withTenant(
        tenantB,
        (tx) =>
          tx.ownerLoanPayment.create({
            data: paymentData(
              paymentB,
              tenantB,
              loanB,
            ),
          }),
      );

      const tenantARows =
        await withTenant(
          tenantA,
          visiblePayments,
        );

      assert.deepEqual(
        tenantARows.map((row) => row.id),
        [paymentA],
      );

      const tenantBRows =
        await withTenant(
          tenantB,
          visiblePayments,
        );

      assert.deepEqual(
        tenantBRows.map((row) => row.id),
        [paymentB],
      );

      const loanWithPayments =
        await withTenant(
          tenantA,
          (tx) =>
            tx.ownerLoan.findFirst({
              where: {
                id: loanA,
              },
              include: {
                payments: {
                  orderBy: {
                    id: "asc",
                  },
                },
              },
            }),
        );

      assert.equal(
        loanWithPayments?.id,
        loanA,
      );

      assert.deepEqual(
        loanWithPayments?.payments.map(
          (payment) => payment.id,
        ),
        [paymentA],
      );

      const crossTenantUpdate =
        await withTenant(
          tenantA,
          (tx) =>
            tx.ownerLoanPayment.updateMany({
              where: {
                id: paymentB,
              },
              data: {
                note: "cross-tenant update",
              },
            }),
        );

      assert.equal(
        crossTenantUpdate.count,
        0,
      );

      const crossTenantDelete =
        await withTenant(
          tenantA,
          (tx) =>
            tx.ownerLoanPayment.deleteMany({
              where: {
                id: paymentB,
              },
            }),
        );

      assert.equal(
        crossTenantDelete.count,
        0,
      );

      await assert.rejects(
        withTenant(
          tenantA,
          (tx) =>
            tx.ownerLoanPayment.create({
              data: paymentData(
                wrongTenantPayment,
                tenantB,
                loanB,
              ),
            }),
        ),
      );

      await assert.rejects(
        withTenant(
          tenantA,
          (tx) =>
            tx.ownerLoanPayment.create({
              data: paymentData(
                wrongParentPayment,
                tenantA,
                loanB,
              ),
            }),
        ),
      );

      const rawRows =
        await withTenant(
          tenantA,
          (tx) =>
            tx.$queryRawUnsafe(
              `
                SELECT
                  id,
                  "tenantId",
                  "loanId"
                FROM public."OwnerLoanPayment"
                WHERE id IN ($1, $2)
                ORDER BY id
              `,
              paymentA,
              paymentB,
            ),
        );

      assert.deepEqual(
        rawRows.map((row) => row.id),
        [paymentA],
      );

      const rawCrossTenantUpdate =
        await withTenant(
          tenantA,
          (tx) =>
            tx.$executeRawUnsafe(
              `
                UPDATE public."OwnerLoanPayment"
                SET note = $1
                WHERE id = $2
              `,
              "raw cross-tenant update",
              paymentB,
            ),
        );

      assert.equal(
        rawCrossTenantUpdate,
        0,
      );

      const [
        concurrentA,
        concurrentB,
      ] = await Promise.all([
        withTenant(
          tenantA,
          visiblePayments,
        ),
        withTenant(
          tenantB,
          visiblePayments,
        ),
      ]);

      assert.deepEqual(
        concurrentA.map((row) => row.id),
        [paymentA],
      );

      assert.deepEqual(
        concurrentB.map((row) => row.id),
        [paymentB],
      );

      assert.deepEqual(
        await visiblePayments(prisma),
        [],
      );
    } finally {
      await prisma.$disconnect();
    }
  },
);
