"use strict";

const BUSINESS_ROLES = new Set([
  "OWNER",
  "MANAGER",
  "CASHIER",
  "SELLER",
  "STOREKEEPER",
  "TECHNICIAN",
]);

class MembershipAccessError extends Error {
  constructor(code, status = 403) {
    super("Business access denied");
    this.name = "MembershipAccessError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Internal authorization resolver.
 *
 * accountId must come from a validated, non-revoked
 * StorvexAccountSession — never directly from req.body,
 * query parameters, or an unverified JWT claim.
 *
 * This service alone is not an authentication middleware.
 */
async function resolveBusinessMembership({
  prisma,
  accountId,
  tenantId,
}) {
  if (
    !prisma?.storvexAccount?.findUnique ||
    !prisma?.storvexBusinessMembership?.findUnique
  ) {
    throw new Error("Membership database dependencies unavailable");
  }

  if (
    typeof accountId !== "string" ||
    !accountId.trim() ||
    typeof tenantId !== "string" ||
    !tenantId.trim()
  ) {
    throw new MembershipAccessError("MEMBERSHIP_REQUIRED");
  }

  const account = await prisma.storvexAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      status: true,
      emailVerifiedAt: true,
    },
  });

  if (
    !account ||
    account.status !== "ACTIVE" ||
    !account.emailVerifiedAt
  ) {
    throw new MembershipAccessError("ACCOUNT_NOT_ELIGIBLE");
  }

  const membership =
    await prisma.storvexBusinessMembership.findUnique({
      where: {
        accountId_tenantId: {
          accountId,
          tenantId,
        },
      },
      select: {
        id: true,
        accountId: true,
        tenantId: true,
        role: true,
        status: true,
        tenant: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

  if (
    !membership ||
    membership.accountId !== accountId ||
    membership.tenantId !== tenantId
  ) {
    throw new MembershipAccessError("MEMBERSHIP_REQUIRED");
  }

  if (membership.status !== "ACTIVE") {
    throw new MembershipAccessError("MEMBERSHIP_INACTIVE");
  }

  if (membership.tenant?.id !== tenantId ||
      membership.tenant?.status !== "ACTIVE") {
    throw new MembershipAccessError("BUSINESS_INACTIVE");
  }

  if (!BUSINESS_ROLES.has(membership.role)) {
    throw new MembershipAccessError("INVALID_BUSINESS_ROLE");
  }

  return Object.freeze({
    accountId,
    tenantId,
    membershipId: membership.id,
    role: membership.role,
  });
}

module.exports = {
  resolveBusinessMembership,
  MembershipAccessError,
};
