const { AsyncLocalStorage } = require("node:async_hooks");
const { performance } = require("node:perf_hooks");

const requestPrismaMetricsStorage =
  new AsyncLocalStorage();

function createRequestPrismaMetrics() {
  return {
    prismaOperationCount: 0,
    prismaOperationDurationMs: 0,
  };
}

function runWithRequestPrismaMetrics(
  metrics,
  callback,
) {
  return requestPrismaMetricsStorage.run(
    metrics,
    callback,
  );
}

function getRequestPrismaMetrics() {
  return (
    requestPrismaMetricsStorage.getStore() ||
    null
  );
}

function recordPrismaOperation(durationMs) {
  const metrics =
    getRequestPrismaMetrics();

  if (!metrics) {
    return;
  }

  const duration = Number(durationMs);

  if (
    !Number.isFinite(duration) ||
    duration < 0
  ) {
    return;
  }

  metrics.prismaOperationCount += 1;
  metrics.prismaOperationDurationMs +=
    duration;
}

async function measurePrismaOperation({
  args,
  query,
  now,
}) {
  const metrics =
    getRequestPrismaMetrics();

  if (!metrics) {
    return query(args);
  }

  const startedAt = now();

  try {
    return await query(args);
  } finally {
    recordPrismaOperation(
      now() - startedAt,
    );
  }
}

function createPrismaMetricsExtension({
  now = () => performance.now(),
} = {}) {
  const measure = ({
    args,
    query,
  }) =>
    measurePrismaOperation({
      args,
      query,
      now,
    });

  return {
    name: "storvex-request-prisma-metrics",

    query: {
      $allModels: {
        $allOperations: measure,
      },

      $queryRaw: measure,
      $queryRawUnsafe: measure,
      $executeRaw: measure,
      $executeRawUnsafe: measure,
    },
  };
}

module.exports = {
  createPrismaMetricsExtension,
  createRequestPrismaMetrics,
  getRequestPrismaMetrics,
  recordPrismaOperation,
  runWithRequestPrismaMetrics,
};
