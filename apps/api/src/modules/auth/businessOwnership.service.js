"use strict";

/**
 * Establish ownership of a newly created business within
 * the SAME database transaction that creates that business.
 *
 * The account identity must come from an authenticated
 * server-side session, never from a client-supplied account ID.
 */

class BusinessOwnershipError extends Error {
  constructor(code) {
    super("Business ownership could not be established.");
    this.name = "BusinessOwnershipError";
    this.code = code;
    this.status = 403;
  }
}

async function createBusinessOwnerMembership({
  tx,
  authenticatedAccountId,
  newlyCreatedTenantId,
  newlyCreatedRetailUserId,
}) {
  if (
    !tx?.storvexAccount?.findUnique ||
    !tx?.user?.findUnique ||
    !tx?.storvexBusinessMembership?.create
  ) {
    throw new TypeError(
      "Business ownership transaction dependencies unavailable."
    );
  }

  if (
    typeof authenticatedAccountId !== "string" ||
    !authenticatedAccountId.trim()
  ) {
    throw new BusinessOwnershipError(
      "VERIFIED_ACCOUNT_REQUIRED"
    );
  }

  if (
    typeof newlyCreatedTenantId !== "string" ||
    !newlyCreatedTenantId.trim()
  ) {
    throw new BusinessOwnershipError(
      "NEW_BUSINESS_REQUIRED"
    );
  }

  const account = await tx.storvexAccount.findUnique({
    where: {
      id: authenticatedAccountId,
    },
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
    throw new BusinessOwnershipError(
      "ACCOUNT_NOT_ELIGIBLE"
    );
  }

  if (
    typeof newlyCreatedRetailUserId !== "string" ||
    !newlyCreatedRetailUserId.trim()
  ) {
    throw new BusinessOwnershipError("RETAIL_OWNER_REQUIRED");
  }

  const owner = await tx.user.findUnique({
    where: { id: newlyCreatedRetailUserId },
    select: {
      id: true,
      tenantId: true,
      role: true,
      isActive: true,
    },
  });

  if (
    !owner ||
    owner.tenantId !== newlyCreatedTenantId ||
    owner.role !== "OWNER" ||
    owner.isActive !== true
  ) {
    throw new BusinessOwnershipError("RETAIL_OWNER_MISMATCH");
  }

  return tx.storvexBusinessMembership.create({
    data: {
      accountId: account.id,
      tenantId: newlyCreatedTenantId,
      retailUserId: owner.id,
      role: "OWNER",
      status: "ACTIVE",
    },
    select: {
      id: true,
      accountId: true,
      tenantId: true,
      retailUserId: true,
      role: true,
      status: true,
    },
  });
}

module.exports = {
  createBusinessOwnerMembership,
  BusinessOwnershipError,
};
