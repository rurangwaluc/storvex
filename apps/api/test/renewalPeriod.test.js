"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  addCalendarMonths,
  calculateRenewalPeriod,
} = require("../src/modules/billing/renewalPeriod");

test("January 31 clamps correctly in a non-leap year", () => {
  const end = addCalendarMonths(
    new Date("2027-01-31T12:30:00.000Z"), 1
  );
  assert.equal(end.toISOString(), "2027-02-28T12:30:00.000Z");
});

test("January 31 clamps correctly in a leap year", () => {
  const end = addCalendarMonths(
    new Date("2028-01-31T12:30:00.000Z"), 1
  );
  assert.equal(end.toISOString(), "2028-02-29T12:30:00.000Z");
});

test("supports all approved subscription durations", () => {
  const expected = [
    [1, "2027-02-15T10:00:00.000Z"],
    [3, "2027-04-15T10:00:00.000Z"],
    [6, "2027-07-15T10:00:00.000Z"],
    [12, "2028-01-15T10:00:00.000Z"],
  ];

  for (const [months, iso] of expected) {
    assert.equal(
      addCalendarMonths(
        new Date("2027-01-15T10:00:00.000Z"),
        months
      ).toISOString(),
      iso
    );
  }
});

test("preserves remaining subscription time", () => {
  const result = calculateRenewalPeriod({
    now: new Date("2027-01-01T00:00:00Z"),
    currentEndDate: new Date("2027-01-20T00:00:00Z"),
    durationMonths: 3,
    graceDays: 7,
  });

  assert.equal(
    result.start.toISOString(), "2027-01-20T00:00:00.000Z"
  );
  assert.equal(
    result.end.toISOString(), "2027-04-20T00:00:00.000Z"
  );
  assert.equal(
    result.graceEnd.toISOString(), "2027-04-27T00:00:00.000Z"
  );
});

test("expired subscription starts at verified activation time", () => {
  const result = calculateRenewalPeriod({
    now: new Date("2027-02-10T09:00:00Z"),
    currentEndDate: new Date("2027-01-05T00:00:00Z"),
    durationMonths: 6,
    graceDays: 0,
  });

  assert.equal(
    result.start.toISOString(), "2027-02-10T09:00:00.000Z"
  );
  assert.equal(
    result.end.toISOString(), "2027-08-10T09:00:00.000Z"
  );
});

test("rejects unsupported periods, invalid dates and grace", () => {
  const base = {
    now: new Date("2027-01-01T00:00:00Z"),
    currentEndDate: null,
    durationMonths: 1,
    graceDays: 7,
  };

  for (const durationMonths of [0, 2, 13, "3", null]) {
    assert.throws(() => calculateRenewalPeriod({
      ...base, durationMonths,
    }));
  }

  for (const graceDays of [-1, 1.5, "7", 366]) {
    assert.throws(() => calculateRenewalPeriod({
      ...base, graceDays,
    }));
  }

  assert.throws(() => calculateRenewalPeriod({
    ...base, now: new Date("invalid"),
  }));
});
