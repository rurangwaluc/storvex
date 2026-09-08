import assert from "node:assert/strict";
import test from "node:test";

import {
  formatTenantDate,
  formatTenantDateTime,
  tenantDaysUntil,
  tenantTimezone,
} from "../src/lib/tenantDateTime.js";

const RW = {
  countryCode: "RW",
  currencyCode: "RWF",
  timezone: "Africa/Kigali",
};

const KE = {
  countryCode: "KE",
  currencyCode: "KES",
  timezone: "Africa/Nairobi",
};

const GH = {
  countryCode: "GH",
  currencyCode: "GHS",
  timezone: "Africa/Accra",
};

test("uses tenant timezone instead of browser timezone", () => {
  assert.equal(tenantTimezone(RW), "Africa/Kigali");
  assert.equal(tenantTimezone(KE), "Africa/Nairobi");
  assert.equal(tenantTimezone(GH), "Africa/Accra");
});

test("preserves Kigali only as historical missing-market fallback", () => {
  assert.equal(tenantTimezone(null), "Africa/Kigali");
});

test("formats tenant dates without throwing for representative African markets", () => {
  const value = "2026-09-03T12:00:00Z";

  for (const market of [RW, KE, GH]) {
    const date = formatTenantDate(value, market);
    const dateTime = formatTenantDateTime(value, market);

    assert.equal(typeof date, "string");
    assert.equal(typeof dateTime, "string");
    assert.notEqual(date, "—");
    assert.notEqual(dateTime, "—");
  }
});

test("tenant day arithmetic follows tenant calendar day", () => {
  const now = new Date("2026-09-03T20:00:00Z");

  assert.equal(
    tenantDaysUntil("2026-09-04T12:00:00Z", KE, now),
    1,
  );

  assert.equal(
    tenantDaysUntil("2026-09-03T12:00:00Z", KE, now),
    0,
  );

  assert.equal(
    tenantDaysUntil("2026-09-02T12:00:00Z", KE, now),
    -1,
  );
});
