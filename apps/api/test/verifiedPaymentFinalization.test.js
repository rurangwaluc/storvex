"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  finalizeVerifiedPayment,
} = require("../src/modules/payments/verifiedPaymentFinalization");

const payment = {
  id: "payment-step223",
  reference: "SVX_STEP223_REF",
  provider: "FLUTTERWAVE",
  amount: 10000,
  currency: "RWF",
  planKey: "STARTER_MONTHLY",
  purpose: "OWNER_SIGNUP",
  status: "PENDING",
};

const attempt = {
  id: "attempt-step223",
  paymentId: payment.id,
  provider: "FLUTTERWAVE",
  checkoutReference: "SVX_STEP223_CHECKOUT",
  providerTransactionId: "123456789",
  amount: 10000,
  currency: "RWF",
  status: "VERIFIED",
  verifiedAt: new Date("2026-10-21T12:00:00Z"),
  appliedAt: null,
  verificationDetails: {
    verificationSource: "FLUTTERWAVE_TRANSACTION_VERIFY",
    transactionId: 123456789,
    reference: "SVX_STEP223_CHECKOUT",
    amount: 10000,
    currency: "RWF",
  },
};

// Return only fields explicitly selected by Prisma.
function selectedRecord(record, select) {
  if (!select || typeof select !== "object") {
    return { ...record };
  }

  const result = {};

  for (const [field, included] of Object.entries(select)) {
    if (included !== true) {
      throw new Error("Unsupported Prisma mock selection");
    }
    if (!(field in record)) {
      throw new Error(`Missing mock record field: ${field}`);
    }
    result[field] = record[field];
  }

  return result;
}

function fixture({
  paymentOverride = {},
  attemptOverride = {},
  failActivation = false,
} = {}) {
  const storedPayment = {
    ...payment,
    ...paymentOverride,
  };

  const storedAttempt = {
    ...attempt,
    ...attemptOverride,
  };

  let activations = 0;

  const prisma = {
    async $transaction(callback) {
      // Simulates transaction rollback for unit testing.
      const originalPayment = { ...storedPayment };
      const originalAttempt = { ...storedAttempt };
      const previousActivations = activations;

      const tx = {
        payment: {
          async findUnique({ where, select }) {
            return storedPayment.id === where.id
              ? selectedRecord(storedPayment, select)
              : null;
          },
          async updateMany({ where, data }) {
            const matches = Object.entries(where).every(
              ([key, value]) => storedPayment[key] === value
            );

            if (!matches) return { count: 0 };

            Object.assign(storedPayment, data);
            return { count: 1 };
          },
        },
        paymentAttempt: {
          async findUnique({ where, select }) {
            return storedAttempt.id === where.id
              ? selectedRecord(storedAttempt, select)
              : null;
          },
          async updateMany({ where, data }) {
            const matches = Object.entries(where).every(
              ([key, value]) => {
                if (key === "verifiedAt") {
                  return value.not === null &&
                    storedAttempt.verifiedAt != null;
                }

                return storedAttempt[key] === value;
              }
            );

            if (!matches) return { count: 0 };

            Object.assign(storedAttempt, data);
            return { count: 1 };
          },
        },
      };

      try {
        return await callback(tx);
      } catch (error) {
        Object.assign(storedPayment, originalPayment);
        Object.assign(storedAttempt, originalAttempt);
        activations = previousActivations;
        throw error;
      }
    },
  };

  const applyActivation = async ({ tx }) => {
    assert.ok(tx.payment);
    activations++;

    if (failActivation) {
      throw new Error("SIMULATED_ACTIVATION_FAILURE");
    }

    return { activated: true };
  };

  return {
    prisma,
    storedPayment,
    storedAttempt,
    applyActivation,
    get activations() {
      return activations;
    },
  };
}

test("1. Verified attempt applies once", async () => {
  const f = fixture();

  const result = await finalizeVerifiedPayment({
    prisma: f.prisma,
    payment,
    attempt,
    applyActivation: f.applyActivation,
  });

  assert.equal(result.applied, true);
  assert.equal(f.storedPayment.status, "SUCCESS");
  assert.equal(f.storedAttempt.status, "APPLIED");
  assert.equal(f.activations, 1);
});

test("2. Duplicate finalization cannot activate twice", async () => {
  const f = fixture();

  const args = {
    prisma: f.prisma,
    payment,
    attempt,
    applyActivation: f.applyActivation,
  };

  await finalizeVerifiedPayment(args);

  await assert.rejects(
    finalizeVerifiedPayment(args),
    /Authoritative payment verification mismatch/
  );

  assert.equal(f.activations, 1);
});

test("3. Activation failure rolls back payment and attempt", async () => {
  const f = fixture({ failActivation: true });

  await assert.rejects(
    finalizeVerifiedPayment({
      prisma: f.prisma,
      payment,
      attempt,
      applyActivation: f.applyActivation,
    }),
    /SIMULATED_ACTIVATION_FAILURE/
  );

  assert.equal(f.storedPayment.status, "PENDING");
  assert.equal(f.storedAttempt.status, "VERIFIED");
  assert.equal(f.activations, 0);
});

test("4. Unverified attempt is rejected", async () => {
  const f = fixture();

  await assert.rejects(
    finalizeVerifiedPayment({
      prisma: f.prisma,
      payment,
      attempt: { ...attempt, status: "CREATED" },
      applyActivation: f.applyActivation,
    }),
    /Verified payment attempt mismatch/
  );

  assert.equal(f.activations, 0);
});

test("5. Mismatched amount cannot activate", async () => {
  const f = fixture();

  await assert.rejects(
    finalizeVerifiedPayment({
      prisma: f.prisma,
      payment,
      attempt: { ...attempt, amount: 5000 },
      applyActivation: f.applyActivation,
    }),
    /Verified payment attempt mismatch/
  );

  assert.equal(f.activations, 0);
});

test("6. Already successful payment cannot activate again", async () => {
  const f = fixture({
    paymentOverride: { status: "SUCCESS" },
  });

  await assert.rejects(
    finalizeVerifiedPayment({
      prisma: f.prisma,
      payment,
      attempt,
      applyActivation: f.applyActivation,
    }),
    /Persisted provider verification evidence mismatch/
  );

  assert.equal(f.activations, 0);
});

test("7. Another payment's attempt cannot activate", async () => {
  const f = fixture();

  await assert.rejects(
    finalizeVerifiedPayment({
      prisma: f.prisma,
      payment,
      attempt: {
        ...attempt,
        paymentId: "another-payment",
      },
      applyActivation: f.applyActivation,
    }),
    /Verified payment attempt mismatch/
  );

  assert.equal(f.activations, 0);
});


test("8. Inconsistent persisted evidence is rejected", async () => {
  const f = fixture({
    attemptOverride: {
      verificationDetails: {
        verificationSource: "FLUTTERWAVE_TRANSACTION_VERIFY",
        transactionId: 999999999,
        reference: "SVX_STEP223_CHECKOUT",
        amount: 10000,
        currency: "RWF",
      },
    },
  });

  await assert.rejects(
    finalizeVerifiedPayment({
      prisma: f.prisma,
      payment,
      attempt,
      applyActivation: f.applyActivation,
    }),
    /Persisted provider verification evidence mismatch/
  );

  assert.equal(f.storedPayment.status, "PENDING");
  assert.equal(f.storedAttempt.status, "VERIFIED");
  assert.equal(f.activations, 0);
});


test("9. Prisma mock excludes unselected fields", async () => {
  const f = fixture();

  await f.prisma.$transaction(async tx => {
    const storedPayment = await tx.payment.findUnique({
      where: { id: payment.id },
      select: { id: true, status: true },
    });

    assert.deepEqual(storedPayment, {
      id: payment.id,
      status: "PENDING",
    });

    assert.equal("amount" in storedPayment, false);

    const storedAttempt = await tx.paymentAttempt.findUnique({
      where: { id: attempt.id },
      select: { id: true, status: true },
    });

    assert.deepEqual(storedAttempt, {
      id: attempt.id,
      status: "VERIFIED",
    });

    assert.equal("verificationDetails" in storedAttempt, false);

    const withEvidence = await tx.paymentAttempt.findUnique({
      where: { id: attempt.id },
      select: {
        id: true,
        verificationDetails: true,
      },
    });

    assert.deepEqual(
      withEvidence.verificationDetails,
      attempt.verificationDetails
    );
  });
});
