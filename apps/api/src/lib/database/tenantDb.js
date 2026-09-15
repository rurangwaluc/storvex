const prisma = require("../../config/database");

function normalizeTenantId(tenantId) {
  if (typeof tenantId !== "string") {
    const error = new TypeError(
      "Tenant database context requires a tenantId.",
    );
    error.code = "TENANT_CONTEXT_REQUIRED";
    throw error;
  }

  const normalized = tenantId.trim();

  if (!normalized) {
    const error = new TypeError(
      "Tenant database context requires a tenantId.",
    );
    error.code = "TENANT_CONTEXT_REQUIRED";
    throw error;
  }

  return normalized;
}

async function withTenantDb(tenantId, callback) {
  const authoritativeTenantId =
    normalizeTenantId(tenantId);

  if (typeof callback !== "function") {
    throw new TypeError(
      "Tenant database context requires a callback.",
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT set_config(
        'app.tenant_id',
        ${authoritativeTenantId},
        true
      )
    `;

    return callback(tx);
  });
}

module.exports = {
  withTenantDb,
};
