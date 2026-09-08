import assert from "node:assert/strict";
import test from "node:test";

import {
  formatMoneyWithCurrency,
  formatTenantMoney,
  tenantCurrencyCode,
} from "../src/lib/tenantMoney.js";

const RW = {
  countryCode: "RW",
  currencyCode: "RWF",
  timezone: "Africa/Kigali",
};

const UG = {
  countryCode: "UG",
  currencyCode: "UGX",
  timezone: "Africa/Kampala",
};

const KE = {
  countryCode: "KE",
  currencyCode: "KES",
  timezone: "Africa/Nairobi",
};

test("formats Rwanda tenant money as RWF", () => {
  assert.equal(formatTenantMoney(25000, RW), "RWF 25,000");
});

test("formats Uganda tenant money as UGX", () => {
  assert.equal(formatTenantMoney(25000, UG), "UGX 25,000");
});

test("formats Kenya tenant money as KES", () => {
  assert.equal(formatTenantMoney(25000, KE), "KES 25,000");
});

test("formats zero safely", () => {
  assert.equal(formatTenantMoney(0, RW), "RWF 0");
});

test("formats negative amounts", () => {
  assert.equal(formatTenantMoney(-25000, UG), "UGX -25,000");
});

test("formats large amounts", () => {
  assert.equal(formatTenantMoney(120000000, KE), "KES 120,000,000");
});

test("uses Rwanda only as the historical missing-market fallback", () => {
  assert.equal(formatTenantMoney(25000, null), "RWF 25,000");
  assert.equal(tenantCurrencyCode(null), "RWF");
});

test("valid Uganda market never falls back to RWF", () => {
  assert.equal(formatTenantMoney(25000, UG).startsWith("UGX "), true);
  assert.equal(formatTenantMoney(25000, UG).includes("RWF"), false);
});

test("valid Kenya market never falls back to RWF", () => {
  assert.equal(formatTenantMoney(25000, KE).startsWith("KES "), true);
  assert.equal(formatTenantMoney(25000, KE).includes("RWF"), false);
});

test("formats explicit document currency independently of current tenant market", () => {
  assert.equal(formatMoneyWithCurrency(25000, "UGX"), "UGX 25,000");
});
