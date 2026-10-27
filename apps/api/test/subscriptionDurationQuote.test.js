"use strict";

// STEP 342CN-C / MULTI-MONTH QUOTE TESTS

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DURATION_DISCOUNTS,
  quoteSubscriptionDuration,
} = require("../src/modules/billing/subscriptionDurationQuote");

test("approved discount schedule is exact", () => {
  assert.deepEqual({ ...DURATION_DISCOUNTS }, {
    1: 0, 3: 5, 6: 10, 12: 15,
  });
});

test("Rwanda Growth duration quotes", () => {
  const cases = [
    [1, 25000, 0, 25000],
    [3, 75000, 3750, 71250],
    [6, 150000, 15000, 135000],
    [12, 300000, 45000, 255000],
  ];

  for (const [
    durationMonths,
    regularAmount,
    discountAmount,
    totalAmount,
  ] of cases) {
    const quote = quoteSubscriptionDuration({
      countryCode: "RW",
      planKey: "LAUNCH_GROWTH",
      durationMonths,
    });

    assert.equal(quote.currency, "RWF");
    assert.equal(quote.durationMonths, durationMonths);
    assert.equal(quote.regularAmount, regularAmount);
    assert.equal(quote.discountAmount, discountAmount);
    assert.equal(quote.totalAmount, totalAmount);
  }
});

test("Rwanda Business annual quote", () => {
  const quote = quoteSubscriptionDuration({
    countryCode: "RW",
    planKey: "LAUNCH_BUSINESS",
    durationMonths: 12,
  });
  assert.equal(quote.regularAmount, 540000);
  assert.equal(quote.discountPercent, 15);
  assert.equal(quote.discountAmount, 81000);
  assert.equal(quote.totalAmount, 459000);
});

test("rejects unsupported durations and type coercion", () => {
  for (const durationMonths of [
    0, -1, 2, 4, 13, 3.5, "3", null, undefined,
  ]) {
    assert.throws(() =>
      quoteSubscriptionDuration({
        countryCode: "RW",
        planKey: "LAUNCH_GROWTH",
        durationMonths,
      }),
    );
  }
});

test("rejects missing, unknown and trial plans", () => {
  for (const planKey of [
    "", "NOT_A_PLAN", "TRIAL", "LAUNCH_TRIAL",
  ]) {
    assert.throws(() =>
      quoteSubscriptionDuration({
        countryCode: "RW",
        planKey,
        durationMonths: 1,
      }),
    );
  }
});

test("rejects unsupported markets", () => {
  assert.throws(() =>
    quoteSubscriptionDuration({
      countryCode: "XX",
      planKey: "LAUNCH_GROWTH",
      durationMonths: 3,
    }),
  );
});

test("does not accept client-submitted price or discount", () => {
  const quote = quoteSubscriptionDuration({
    countryCode: "RW",
    planKey: "LAUNCH_GROWTH",
    durationMonths: 3,
    monthlyAmount: 1,
    discountPercent: 99,
    totalAmount: 1,
  });

  assert.equal(quote.totalAmount, 71250);
  assert.equal(quote.discountPercent, 5);
  assert.equal(Object.isFrozen(quote), true);
});
