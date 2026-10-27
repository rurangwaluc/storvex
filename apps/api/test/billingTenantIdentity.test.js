"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../src/modules/billing/billing.controller.js"),
  "utf8"
);

const start = source.indexOf("function normalizeTenantId(req) {");
const end = source.indexOf("\nfunction resolveProvider(", start);

assert.ok(start >= 0 && end > start);

const helperSource = source.slice(start, end);

test("Billing identity comes only from authenticated user", () => {
  assert.doesNotMatch(helperSource, /req\.params/);
  assert.doesNotMatch(helperSource, /req\.body/);
  assert.doesNotMatch(helperSource, /req\.query/);

  const resolve = vm.runInNewContext(
    "function cleanString(v) { return typeof v === 'string' ? (v.trim() || null) : null; }\n" +
    helperSource +
    "\nnormalizeTenantId"
  );

  assert.equal(
    resolve({
      user: { tenantId: "tenant-A" },
      params: { tenantId: "tenant-B" },
      body: { tenantId: "tenant-C" },
      query: { tenantId: "tenant-D" },
    }),
    "tenant-A"
  );

  assert.equal(
    resolve({
      params: { tenantId: "tenant-B" },
      body: { tenantId: "tenant-C" },
      query: { tenantId: "tenant-D" },
    }),
    null
  );
});
