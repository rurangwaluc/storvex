"use strict";

// STEP 342CN-L / RENEWAL PERIOD CALCULATION
// Pure date calculations. No database or provider effects.

const ALLOWED_MONTHS = new Set([1, 3, 6, 12]);

function validDate(value) {
  return value instanceof Date &&
    Number.isFinite(value.getTime());
}

function requireDate(value, label) {
  if (!validDate(value)) {
    throw new TypeError(`Valid ${label} date required`);
  }
  return new Date(value.getTime());
}

/**
 * Add calendar months using UTC and clamp to the last valid day.
 * Avoid Date.setMonth overflow (Jan 31 -> March).
 */
function addCalendarMonths(date, months) {
  const start = requireDate(date, "starting");

  if (!ALLOWED_MONTHS.has(months)) {
    throw new RangeError("Unsupported renewal duration");
  }

  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();

  const first = new Date(Date.UTC(
    year, month + months, 1,
    start.getUTCHours(),
    start.getUTCMinutes(),
    start.getUTCSeconds(),
    start.getUTCMilliseconds()
  ));

  if (!validDate(first)) {
    throw new RangeError("Date exceeds supported range");
  }

  const lastDay = new Date(Date.UTC(
    first.getUTCFullYear(),
    first.getUTCMonth() + 1,
    0
  )).getUTCDate();

  first.setUTCDate(Math.min(day, lastDay));

  if (!validDate(first) || first <= start) {
    throw new RangeError("Invalid renewal end date");
  }

  return first;
}

function calculateRenewalPeriod({
  now,
  currentEndDate,
  durationMonths,
  graceDays,
}) {
  const currentTime = requireDate(now, "current");

  if (
    !ALLOWED_MONTHS.has(durationMonths) ||
    !Number.isSafeInteger(graceDays) ||
    graceDays < 0 ||
    graceDays > 365
  ) {
    throw new RangeError("Invalid renewal duration or grace days");
  }

  const existingEnd =
    currentEndDate == null
      ? null
      : requireDate(currentEndDate, "subscription end");

  // Keep unused paid time; never start a new paid period earlier.
  const start =
    existingEnd && existingEnd > currentTime
      ? existingEnd
      : currentTime;

  const end = addCalendarMonths(start, durationMonths);
  const graceEnd = new Date(
    end.getTime() + graceDays * 86400000
  );

  if (!validDate(graceEnd)) {
    throw new RangeError("Invalid grace end date");
  }

  return Object.freeze({
    start,
    end,
    graceEnd,
    durationMonths,
  });
}

module.exports = {
  addCalendarMonths,
  calculateRenewalPeriod,
};
