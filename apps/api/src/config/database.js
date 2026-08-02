const { PrismaClient } = require("@prisma/client");

const {
  createPrismaMetricsExtension,
} = require(
  "../lib/metrics/requestPrismaMetrics",
);

function environmentFlag(value) {
  return String(value || "")
    .trim()
    .toLowerCase() === "true";
}

function createPrismaClient() {
  const baseClient =
    new PrismaClient();

  if (
    !environmentFlag(
      process.env.API_METRICS_ENABLED,
    )
  ) {
    return baseClient;
  }

  return baseClient.$extends(
    createPrismaMetricsExtension(),
  );
}

const prisma =
  global.__prisma__ ||
  createPrismaClient();

if (
  process.env.NODE_ENV !== "production"
) {
  global.__prisma__ = prisma;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Check your .env",
  );
}

module.exports = prisma;
