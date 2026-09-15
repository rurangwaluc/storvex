const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

function requiredEnvironment(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(
      `${name} is required for the OwnerLoan PostgreSQL RLS integration test.`,
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

if (tenantA === tenantB) {
  throw new Error(
    "RLS_TEST_TENANT_A and RLS_TEST_TENANT_B must be different tenants.",
  );
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

const loanA = `rls-a-${randomUUID()}`;
const loanB = `rls-b-${randomUUID()}`;
const forbiddenInsert = `rls-forbidden-${randomUUID()}`;
const missingContextInsert = `rls-missing-${randomUUID()}`;

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

async function visibleTestRows(db) {
  return db.ownerLoan.findMany({
    where: {
      id: {
        in: [
          loanA,
          loanB,
          forbiddenInsert,
          missingContextInsert,
        ],
      },
    },
    select: {
      id: true,
      tenantId: true,
    },
    orderBy: {
      id: "asc",
    },
  });
}

async function cleanup() {
  await withTenant(
    tenantA,
    async (tx) => {
      await tx.ownerLoan.deleteMany({
        where: {
          id: {
            in: [
              loanA,
              forbiddenInsert,
              missingContextInsert,
            ],
          },
        },
      });
    },
  ).catch(() => {});

  await withTenant(
    tenantB,
    async (tx) => {
      await tx.ownerLoan.deleteMany({
        where: {
          id: {
            in: [
              loanB,
              forbiddenInsert,
              missingContextInsert,
            ],
          },
        },
      });
    },
  ).catch(() => {});
}

test(
  "OwnerLoan RLS enforces tenant isolation in PostgreSQL",
  async () => {
    try {
      const roleRows =
        await prisma.$queryRawUnsafe(`
          SELECT
            current_user,
            session_user,
            row_security_active(
              'public."OwnerLoan"'::regclass
            ) AS rls_active
        `);

      assert.equal(
        roleRows[0]?.current_user,
        "storvex_rls_test",
      );

      assert.equal(
        roleRows[0]?.rls_active,
        true,
      );

      /*
       * No app.tenant_id:
       * reads must fail closed by returning no tenant rows.
       */
      const withoutContext =
        await visibleTestRows(prisma);

      assert.deepEqual(
        withoutContext,
        [],
      );

      /*
       * No app.tenant_id:
       * writes must fail closed as well.
       */
      await assert.rejects(
        prisma.ownerLoan.create({
          data: loanData(
            missingContextInsert,
            tenantA,
            "Missing context test",
          ),
        }),
      );

      /*
       * Seed tenant A through tenant A's own RLS context.
       */
      await withTenant(
        tenantA,
        async (tx) => {
          await tx.ownerLoan.create({
            data: loanData(
              loanA,
              tenantA,
              "Tenant A RLS test",
            ),
          });
        },
      );

      /*
       * Seed tenant B through tenant B's own RLS context.
       */
      await withTenant(
        tenantB,
        async (tx) => {
          await tx.ownerLoan.create({
            data: loanData(
              loanB,
              tenantB,
              "Tenant B RLS test",
            ),
          });
        },
      );

      /*
       * Tenant A can see only A.
       */
      const tenantARows =
        await withTenant(
          tenantA,
          visibleTestRows,
        );

      assert.deepEqual(
        tenantARows.map((row) => row.id),
        [loanA],
      );

      /*
       * Tenant B can see only B.
       */
      const tenantBRows =
        await withTenant(
          tenantB,
          visibleTestRows,
        );

      assert.deepEqual(
        tenantBRows.map((row) => row.id),
        [loanB],
      );

      /*
       * Application filters are intentionally omitted here.
       * PostgreSQL alone must prevent tenant A from updating B.
       */
      const crossTenantUpdate =
        await withTenant(
          tenantA,
          (tx) =>
            tx.ownerLoan.updateMany({
              where: {
                id: loanB,
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

      /*
       * PostgreSQL alone must prevent tenant A from deleting B.
       */
      const crossTenantDelete =
        await withTenant(
          tenantA,
          (tx) =>
            tx.ownerLoan.deleteMany({
              where: {
                id: loanB,
              },
            }),
        );

      assert.equal(
        crossTenantDelete.count,
        0,
      );

      /*
       * WITH CHECK must prevent tenant A from inserting a B row.
       */
      await assert.rejects(
        withTenant(
          tenantA,
          (tx) =>
            tx.ownerLoan.create({
              data: loanData(
                forbiddenInsert,
                tenantB,
                "Forbidden tenant insert",
              ),
            }),
        ),
      );

      /*
       * Raw SQL must be constrained by exactly the same RLS policy.
       */
      const rawRows =
        await withTenant(
          tenantA,
          (tx) =>
            tx.$queryRawUnsafe(
              `
                SELECT
                  id,
                  "tenantId"
                FROM public."OwnerLoan"
                WHERE id IN ($1, $2)
                ORDER BY id
              `,
              loanA,
              loanB,
            ),
        );

      assert.deepEqual(
        rawRows.map((row) => row.id),
        [loanA],
      );

      const rawCrossTenantUpdate =
        await withTenant(
          tenantA,
          (tx) =>
            tx.$executeRawUnsafe(
              `
                UPDATE public."OwnerLoan"
                SET note = $1
                WHERE id = $2
              `,
              "raw cross-tenant update",
              loanB,
            ),
        );

      assert.equal(
        rawCrossTenantUpdate,
        0,
      );

      /*
       * Two simultaneous tenant transactions must remain isolated.
       */
      const [
        concurrentA,
        concurrentB,
      ] = await Promise.all([
        withTenant(
          tenantA,
          visibleTestRows,
        ),
        withTenant(
          tenantB,
          visibleTestRows,
        ),
      ]);

      assert.deepEqual(
        concurrentA.map((row) => row.id),
        [loanA],
      );

      assert.deepEqual(
        concurrentB.map((row) => row.id),
        [loanB],
      );

      /*
       * Transaction-local tenant context must not leak into a later
       * non-tenant query.
       */
      const afterTransactions =
        await visibleTestRows(prisma);

      assert.deepEqual(
        afterTransactions,
        [],
      );
    } finally {
      await cleanup();
      await prisma.$disconnect();
    }
  },
);
