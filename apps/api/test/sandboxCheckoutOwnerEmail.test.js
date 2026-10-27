"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(
    __dirname,
    "../src/modules/billing/billing.controller.js"
  ),
  "utf8"
);

const start = source.indexOf(
  "async function initiateRenewalPayment(req, res) {"
);
const end = source.indexOf(
  "async function devMarkRenewalPaymentSuccessful(req, res) {",
  start
);

assert.ok(start >= 0 && end > start);

const section = source.slice(start, end);

const match = section.match(
  /!\s*(\/\^\[\^[^\n]+?\$\/)\.test\(user\.email\)/
);

assert.ok(match, "Owner email validation regex must exist");

const sourceRegex = match[1];

assert.equal(
  sourceRegex,
  String.raw`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
);

const regex = new RegExp(sourceRegex.slice(1, -1));

test("accepts valid owner email addresses", () => {
  for (const email of [
    "owner@example.invalid",
    "owner.test@example.com",
    "owner+test@example.com",
    "owner@storvex.rw",
  ]) {
    assert.equal(regex.test(email), true, email);
  }
});

test("rejects invalid owner email addresses", () => {
  for (const email of [
    "not-an-email",
    "owner@",
    "@example.com",
    "owner@example",
    "owner example@example.com",
    "owner@example.com ",
    "owner@@example.com",
    "",
  ]) {
    assert.equal(regex.test(email), false, email);
  }
});

test("owner identity remains tenant-scoped", () => {
  assert.match(
    section,
    /prisma\.user\.findFirst\(\{\s*where: \{ id: userId, tenantId \}/
  );
});

test("sandbox checkout remains owner-only", () => {
  assert.match(
    section,
    /String\(req\.user\?\.role \|\| ""\)\.toUpperCase\(\) !== "OWNER"/
  );
});

test("checkout still requires validated customer email", () => {
  assert.match(section, /!user\?\.email/);
  assert.match(section, /email: user\.email/);
  assert.match(section, /sandboxCustomer = \{/);
});
