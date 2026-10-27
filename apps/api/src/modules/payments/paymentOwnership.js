"use strict";

function fail(message) {
  const error = new Error(message);
  error.status = 403;
  error.code = "PAYMENT_OWNERSHIP_INVALID";
  throw error;
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function assertPaymentOwnership({
  payment,
  purpose,
  intentId,
  tenantId,
  planKey,
  amount,
  currency,
}) {
  if (!payment || typeof payment !== "object") {
    fail("Payment record is required");
  }

  if (
    payment.status !== "PENDING" ||
    !clean(payment.reference) ||
    payment.purpose !== purpose
  ) {
    fail("Payment is not eligible for checkout");
  }

  if (
    !clean(planKey) ||
    payment.planKey !== planKey ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    payment.amount !== amount ||
    payment.currency !== currency
  ) {
    fail("Payment plan or amount mismatch");
  }

  if (purpose === "OWNER_SIGNUP") {
    if (
      !clean(intentId) ||
      payment.intentId !== intentId ||
      payment.tenantId
    ) {
      fail("Signup payment ownership mismatch");
    }
  } else if (purpose === "SUBSCRIPTION_RENEWAL") {
    if (
      !clean(tenantId) ||
      payment.tenantId !== tenantId ||
      payment.intentId
    ) {
      fail("Renewal payment ownership mismatch");
    }
  } else {
    fail("Unsupported payment purpose");
  }

  return {
    reference: payment.reference,
    purpose: payment.purpose,
    planKey: payment.planKey,
    amount: payment.amount,
    currency: payment.currency,
    intentId: payment.intentId || null,
    tenantId: payment.tenantId || null,
  };
}

module.exports = {
  assertPaymentOwnership,
};
