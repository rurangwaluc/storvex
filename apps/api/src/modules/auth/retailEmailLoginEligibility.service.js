"use strict";

const RETAIL_ROLES = Object.freeze([
  "OWNER",
  "MANAGER",
  "CASHIER",
  "SELLER",
  "STOREKEEPER",
  "TECHNICIAN"
]);

const RETAIL_ROLE_SET = new Set(RETAIL_ROLES);

function normalizeEmail(value) {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();

  if (
    email.length < 3 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  return email;
}

function createRetailEmailLoginEligibilityService({ prisma }) {
  if (
    !prisma ||
    typeof prisma.user?.findUnique !== "function" ||
    typeof prisma.tenant?.findUnique !== "function"
  ) {
    throw new TypeError(
      "Prisma User and Tenant lookup methods required."
    );
  }

  async function findRetailUser({ email } = {}) {
    const normalized = normalizeEmail(email);

    if (!normalized) return null;

    return prisma.user.findUnique({
      where: { email: normalized },
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        isActive: true
      }
    });
  }

  async function findRetailUserById({ userId } = {}) {
    if (
      typeof userId !== "string" ||
      !userId.trim()
    ) {
      return null;
    }

    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        isActive: true
      }
    });
  }

  async function isRetailUserEligible({ user } = {}) {
    if (
      !user ||
      typeof user.id !== "string" ||
      !user.id ||
      typeof user.tenantId !== "string" ||
      !user.tenantId ||
      user.isActive !== true ||
      !RETAIL_ROLE_SET.has(user.role)
    ) {
      return false;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        status: true
      }
    });

    return (
      tenant?.id === user.tenantId &&
      tenant?.status === "ACTIVE"
    );
  }

  return Object.freeze({
    findRetailUser,
    findRetailUserById,
    isRetailUserEligible
  });
}

module.exports = {
  RETAIL_ROLES,
  createRetailEmailLoginEligibilityService
};
