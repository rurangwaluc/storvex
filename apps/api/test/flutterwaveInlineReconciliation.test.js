"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/flutterwaveInlineReconciliation.js"
  ),
  "utf8"
);

const context = {
  module: { exports: {} },
  Map,
  Date,
  Number,
  String,
  Error,
};

vm.runInNewContext(
  source.replace(
    "export function createFlutterwaveInlineReconciler",
    "function createFlutterwaveInlineReconciler"
  ) +
  "\nmodule.exports = { createFlutterwaveInlineReconciler };",
  context
);

const { createFlutterwaveInlineReconciler } =
  context.module.exports;

const reference = "RENEW_TEST_12345678";

test("rejects an invalid reference without any network call", async () => {
  let calls = 0;
  const helper = createFlutterwaveInlineReconciler({
    verifyPayment: async () => { calls++; },
    fetchStatus: async () => { calls++; },
  });

  await assert.rejects(helper.reconcile("bad"));
  assert.equal(calls, 0);
});

test("successful status requires authoritative server confirmation", async () => {
  const calls = [];
  const events = [];

  const helper = createFlutterwaveInlineReconciler({
    verifyPayment: async ref => calls.push(["verify", ref]),
    fetchStatus: async ref => {
      calls.push(["status", ref]);
      return { payment: { status: "SUCCESS" } };
    },
    onStatus: event => events.push(event.status),
  });

  const result = await helper.reconcile(reference);

  assert.equal(result.status, "SUCCESS");
  assert.deepEqual(calls, [
    ["verify", reference],
    ["status", reference],
  ]);
  assert.deepEqual(events, ["SUCCESS"]);
});

test("failed verification and pending status cannot claim success", async () => {
  const helper = createFlutterwaveInlineReconciler({
    verifyPayment: async () => {
      throw new Error("Provider unavailable");
    },
    fetchStatus: async () => ({
      payment: { status: "PENDING" },
    }),
  });

  assert.equal(
    (await helper.reconcile(reference)).status,
    "PENDING"
  );
});

test("status lookup failure remains pending", async () => {
  const helper = createFlutterwaveInlineReconciler({
    verifyPayment: async () => {},
    fetchStatus: async () => {
      throw new Error("Network unavailable");
    },
  });

  assert.equal(
    (await helper.reconcile(reference)).status,
    "PENDING"
  );
});

test("server-reported failure is not changed into success", async () => {
  const helper = createFlutterwaveInlineReconciler({
    verifyPayment: async () => {},
    fetchStatus: async () => ({
      payment: { status: "FAILED" },
    }),
  });

  assert.equal(
    (await helper.reconcile(reference)).status,
    "FAILED"
  );
});

test("simultaneous checks share one verification request", async () => {
  let release;
  let verifications = 0;

  const pending = new Promise(resolve => {
    release = resolve;
  });

  const helper = createFlutterwaveInlineReconciler({
    verifyPayment: async () => {
      verifications++;
      await pending;
    },
    fetchStatus: async () => ({
      payment: { status: "PENDING" },
    }),
  });

  const first = helper.reconcile(reference);
  const second = helper.reconcile(reference);

  release();

  const results = await Promise.all([first, second]);

  assert.equal(verifications, 1);
  assert.equal(results[0].status, "PENDING");
  assert.equal(results[1].status, "PENDING");
});

test("rapid repeated focus checks are throttled", async () => {
  let clock = 10000;
  let verifications = 0;

  const helper = createFlutterwaveInlineReconciler({
    now: () => clock,
    minIntervalMs: 5000,
    verifyPayment: async () => { verifications++; },
    fetchStatus: async () => ({
      payment: { status: "PENDING" },
    }),
  });

  await helper.reconcile(reference);
  clock += 1000;

  assert.equal(
    (await helper.reconcile(reference)).status,
    "SKIPPED"
  );
  assert.equal(verifications, 1);

  clock += 5000;
  await helper.reconcile(reference);
  assert.equal(verifications, 2);
});

test("does not create a payment or trust provider callback fields", () => {
  assert.doesNotMatch(source, /reservePayment|checkoutMethod|transaction_id/);
  assert.doesNotMatch(source, /window\.location|window\.open/);
});
