"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const {
  claimPendingPaymentInTransaction,
} = require("../../src/modules/payments/atomicPaymentClaim");

const raw = process.env.PAYMENT_CONCURRENCY_TEST_DATABASE_URL;

if (!raw) {
  throw new Error("STOP: Isolated test database URL required");
}

const url = new URL(raw);

if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "5432" ||
  url.pathname !== "/storvex_payment_test"
) {
  throw new Error("STOP: Refusing non-test database");
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: raw },
  },
});

const ownedIds = new Set();

async function makePayment(overrides = {}) {
  const id = crypto.randomUUID();
  const reference = `SVX_TEST_${crypto.randomBytes(10).toString("hex")}`;

  const expected = {
    id,
    reference,
    provider: "FLUTTERWAVE",
    amount: 10000,
    currency: "RWF",
    planKey: "STARTER_MONTHLY",
    purpose: "OWNER_SIGNUP",
    ...overrides,
  };

  await prisma.$executeRaw`
    INSERT INTO "Payment" (
      "id",
      "reference",
      "provider",
      "amount",
      "currency",
      "planKey",
      "purpose",
      "status"
    )
    VALUES (
      ${expected.id},
      ${expected.reference},
      ${expected.provider},
      ${expected.amount},
      ${expected.currency},
      ${expected.planKey},
      ${expected.purpose},
      'PENDING'::"PaymentStatus"
    )
  `;

  ownedIds.add(id);

  return expected;
}

async function statusOf(id) {
  const rows = await prisma.$queryRaw`
    SELECT "status"::text AS status
    FROM "Payment"
    WHERE "id" = ${id}
  `;

  return rows[0]?.status;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test.after(async () => {
  try {
    if (ownedIds.size) {
      const ids = [...ownedIds];

      await prisma.$executeRaw`
        DELETE FROM "PaymentAttempt"
        WHERE "paymentId" IN (${Prisma.join(ids)})
      `;

      await prisma.$executeRaw`
        DELETE FROM "Payment"
        WHERE "id" IN (${Prisma.join(ids)})
      `;
    }
  } finally {
    await prisma.$disconnect();
  }
});

// Prisma.join is used only for cleanup of test-owned UUIDs.
const { Prisma } = require("@prisma/client");

test(
  "1. Concurrent claims allow only one winner",
  { timeout: 30000 },
  async () => {
    const expected = await makePayment();

    let signalClaimed;
    const claimed = new Promise(resolve => {
      signalClaimed = resolve;
    });

    let releaseFirst;
    const holdFirst = new Promise(resolve => {
      releaseFirst = resolve;
    });

    const first = prisma.$transaction(
      async tx => {
        const result =
          await claimPendingPaymentInTransaction({
            tx,
            expected,
          });

        signalClaimed();

        // Keep the first transaction open while
        // the second request attempts to claim.
        await holdFirst;

        return result;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    let second;

    try {
      await claimed;

      second = prisma.$transaction(
        async tx =>
          claimPendingPaymentInTransaction({
            tx,
            expected,
          }),
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

      // Allow the competing claim to begin.
      await sleep(200);
    } finally {
      releaseFirst();
    }

    const [a, b] = await Promise.all([first, second]);

    assert.equal(a.claimed, true);
    assert.equal(b.claimed, false);
    assert.equal(await statusOf(expected.id), "SUCCESS");
  }
);

test(
  "2. Failed transaction rolls back payment claim",
  async () => {
    const expected = await makePayment();

    await assert.rejects(
      prisma.$transaction(async tx => {
        const result =
          await claimPendingPaymentInTransaction({
            tx,
            expected,
          });

        assert.equal(result.claimed, true);

        // Simulates a failure in later subscription work.
        throw new Error("SIMULATED_ACTIVATION_FAILURE");
      }),
      /SIMULATED_ACTIVATION_FAILURE/
    );

    assert.equal(await statusOf(expected.id), "PENDING");

    const recovered = await prisma.$transaction(
      async tx =>
        claimPendingPaymentInTransaction({
          tx,
          expected,
        })
    );

    assert.equal(recovered.claimed, true);
    assert.equal(await statusOf(expected.id), "SUCCESS");
  }
);

test(
  "3. Mismatched financial details cannot claim payment",
  async () => {
    const expected = await makePayment();

    for (const mismatch of [
      { amount: 5000 },
      { currency: "USD" },
      { provider: "MOMO" },
      { planKey: "GROWTH_MONTHLY" },
      { reference: "SVX_TEST_WRONG_REFERENCE" },
    ]) {
      try {
        const result = await prisma.$transaction(
          async tx =>
            claimPendingPaymentInTransaction({
              tx,
              expected: {
                ...expected,
                ...mismatch,
              },
            })
        );

        assert.equal(result.claimed, false);
      } catch (error) {
        assert.equal(error.code, "PAYMENT_CLAIM_INVALID");
      }

      assert.equal(await statusOf(expected.id), "PENDING");
    }
  }
);
