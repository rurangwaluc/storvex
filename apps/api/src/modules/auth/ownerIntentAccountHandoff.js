"use strict";

/**
 * Only the server-authenticated, verified Storvex account can
 * establish email verification for a new business intent.
 */
function verifiedEmailForOwnerIntent(account, submittedEmail) {
  const accountEmail = String(account?.email || "")
    .trim()
    .toLowerCase();

  const requestedEmail = String(submittedEmail || "")
    .trim()
    .toLowerCase();

  if (
    !account?.accountId ||
    account.emailVerified !== true ||
    !accountEmail
  ) {
    const error = new Error(
      "Sign in with a verified Storvex account to continue."
    );
    error.status = 401;
    throw error;
  }

  if (!requestedEmail || requestedEmail !== accountEmail) {
    const error = new Error(
      "The business owner email must match your verified Storvex account."
    );
    error.status = 403;
    throw error;
  }

  return true;
}

module.exports = { verifiedEmailForOwnerIntent };
