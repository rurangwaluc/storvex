const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createPrismaMetricsExtension,
  createRequestPrismaMetrics,
  getRequestPrismaMetrics,
  recordPrismaOperation,
  runWithRequestPrismaMetrics,
} = require(
  "../src/lib/metrics/requestPrismaMetrics",
);

test(
  "has no Prisma metrics outside a request context",
  () => {
    assert.equal(
      getRequestPrismaMetrics(),
      null,
    );

    assert.doesNotThrow(() => {
      recordPrismaOperation(10);
    });
  },
);

test(
  "records operations inside one request context",
  async () => {
    const metrics =
      createRequestPrismaMetrics();

    await runWithRequestPrismaMetrics(
      metrics,
      async () => {
        recordPrismaOperation(10.25);
        await Promise.resolve();
        recordPrismaOperation(4.5);
      },
    );

    assert.deepEqual(metrics, {
      prismaOperationCount: 2,
      prismaOperationDurationMs: 14.75,
    });
  },
);

test(
  "keeps concurrent request metrics isolated",
  async () => {
    const first =
      createRequestPrismaMetrics();
    const second =
      createRequestPrismaMetrics();

    await Promise.all([
      runWithRequestPrismaMetrics(
        first,
        async () => {
          await Promise.resolve();
          recordPrismaOperation(10);
        },
      ),

      runWithRequestPrismaMetrics(
        second,
        async () => {
          recordPrismaOperation(20);
          recordPrismaOperation(30);
        },
      ),
    ]);

    assert.deepEqual(first, {
      prismaOperationCount: 1,
      prismaOperationDurationMs: 10,
    });

    assert.deepEqual(second, {
      prismaOperationCount: 2,
      prismaOperationDurationMs: 50,
    });
  },
);

test(
  "measures model and raw operations without storing query input",
  async () => {
    const times = [
      100,
      112.5,
      200,
      207.25,
    ];

    const extension =
      createPrismaMetricsExtension({
        now: () => times.shift(),
      });

    const modelOperation =
      extension.query.$allModels
        .$allOperations;

    const rawOperation =
      extension.query.$queryRaw;

    const metrics =
      createRequestPrismaMetrics();

    await runWithRequestPrismaMetrics(
      metrics,
      async () => {
        const modelResult =
          await modelOperation({
            args: {
              where: {
                privateValue:
                  "must-not-be-recorded",
              },
            },
            query: async () => ({
              ok: true,
            }),
          });

        assert.deepEqual(modelResult, {
          ok: true,
        });

        await rawOperation({
          args: [
            "private raw query input",
          ],
          query: async () => [1],
        });
      },
    );

    assert.deepEqual(metrics, {
      prismaOperationCount: 2,
      prismaOperationDurationMs: 19.75,
    });

    const serialized =
      JSON.stringify(metrics);

    assert.equal(
      serialized.includes(
        "must-not-be-recorded",
      ),
      false,
    );

    assert.equal(
      serialized.includes(
        "private raw query input",
      ),
      false,
    );
  },
);

test(
  "records failed Prisma operations",
  async () => {
    const times = [100, 105];

    const extension =
      createPrismaMetricsExtension({
        now: () => times.shift(),
      });

    const operation =
      extension.query.$allModels
        .$allOperations;

    const metrics =
      createRequestPrismaMetrics();

    await runWithRequestPrismaMetrics(
      metrics,
      async () => {
        await assert.rejects(
          operation({
            args: {},
            query: async () => {
              throw new Error(
                "database failure",
              );
            },
          }),
          /database failure/,
        );
      },
    );

    assert.deepEqual(metrics, {
      prismaOperationCount: 1,
      prismaOperationDurationMs: 5,
    });
  },
);
