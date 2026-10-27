"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  claimPendingPaymentInTransaction,
} = require("../src/modules/payments/atomicPaymentClaim");

const expected = Object.freeze({
  id: "payment-215",
  reference: "SVX_TEST_215_001",
  provider: "FLUTTERWAVE",
  amount: 10000,
  currency: "RWF",
  planKey: "STARTER_MONTHLY",
  purpose: "OWNER_SIGNUP",
});

function fixture(recordOverrides = {}) {
  const record = {
    ...expected,
    status: "PENDING",
    ...recordOverrides,
  };

  const calls = [];

  const tx = {
    payment: {
      updateMany: async ({ where, data }) => {
        calls.push({ where, data });

        const matches = Object.entries(where).every(
          ([key, value]) => record[key] === value
        );

        if (!matches) return { count: 0 };

        Object.assign(record, data);
        return { count: 1 };
      },
    },
  };

  return { tx, record, calls };
}

test("1. Claims matching pending payment", async () => {
  const { tx, record } = fixture();

  const result = await claimPendingPaymentInTransaction({
    tx,
    expected,
  });

  assert.equal(result.claimed, true);
  assert.equal(record.status, "SUCCESS");
});

test("2. Repeated claim does not succeed twice", async () => {
  const { tx } = fixture();

  const first = await claimPendingPaymentInTransaction({
    tx,
    expected,
  });

  const second = await claimPendingPaymentInTransaction({
    tx,
    expected,
  });

  assert.equal(first.claimed, true);
  assert.equal(second.claimed, false);
});

test("3. Rejects incorrect reference", async () => {
  const { tx } = fixture({ reference: "OTHER_REFERENCE" });
  const result = await claimPendingPaymentInTransaction({
    tx,
    expected,
  });

  assert.equal(result.claimed, false);
});

test("4. Rejects mismatched amount", async () => {
  const { tx } = fixture({ amount: 5000 });
  const result = await claimPendingPaymentInTransaction({
    tx,
    expected,
  });

  assert.equal(result.claimed, false);
});

test("5. Rejects mismatched currency", async () => {
  const { tx } = fixture({ currency: "USD" });
  const result = await claimPendingPaymentInTransaction({
    tx,
    expected,
  });

  assert.equal(result.claimed, false);
});

test("6. Rejects mismatched provider", async () => {
  const { tx } = fixture({ provider: "MOMO" });
  const result = await claimPendingPaymentInTransaction({
    tx,
    expected,
  });

  assert.equal(result.claimed, false);
});

test("7. Rejects changed plan", async () => {
  const { tx } = fixture({ planKey: "GROWTH_MONTHLY" });
  const result = await claimPendingPaymentInTransaction({
    tx,
    expected,
  });

  assert.equal(result.claimed, false);
});

test("8. Rejects failed payments", async () => {
  const { tx } = fixture({ status: "FAILED" });
  const result = await claimPendingPaymentInTransaction({
    tx,
    expected,
  });

  assert.equal(result.claimed, false);
});

test("9. Preserves financial fields", async () => {
  const { tx, record, calls } = fixture();

  await claimPendingPaymentInTransaction({ tx, expected });

  assert.deepEqual(calls[0].data, { status: "SUCCESS" });
  assert.equal(record.amount, 10000);
  assert.equal(record.currency, "RWF");
  assert.equal(record.planKey, "STARTER_MONTHLY");
});

test("10. Rejects missing transaction client", async () => {
  await assert.rejects(
    claimPendingPaymentInTransaction({
      tx: null,
      expected,
    }),
    /Prisma transaction client required/
  );
});

test("11. Rejects invalid expected amounts", async () => {
  const { tx } = fixture();

  await assert.rejects(
    claimPendingPaymentInTransaction({
      tx,
      expected: { ...expected, amount: -10 },
    }),
    /Invalid verified payment expectations/
  );
});

test("12. Supports renewal payment claims", async () => {
  const renewal = {
    ...expected,
    id: "renewal-215",
    reference: "SVX_TEST_215_RENEW",
    purpose: "SUBSCRIPTION_RENEWAL",
  };

  const { tx } = fixture(renewal);

  const result = await claimPendingPaymentInTransaction({
    tx,
    expected: renewal,
  });

  assert.equal(result.claimed, true);
});

test("13. Rejects unexpected affected-row counts", async () => {
  const tx = {
    payment: {
      updateMany: async () => ({ count: 2 }),
    },
  };

  await assert.rejects(
    claimPendingPaymentInTransaction({
      tx,
      expected,
    }),
    /Unexpected payment claim result/
  );
});
