"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const helperSource = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/flutterwaveInlineSharedVerification.js"
  ),
  "utf8"
);

const renew = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/Renew.jsx"
  ),
  "utf8"
);

const context = { module: { exports: {} }, Map, Promise, Error };

vm.runInNewContext(
  helperSource.replace(
    "export function createSharedInlinePaymentVerifier",
    "function createSharedInlinePaymentVerifier"
  ) + "\nmodule.exports = createSharedInlinePaymentVerifier;",
  context
);

const createVerifier = context.module.exports;
const reference = "RENEW_TEST_12345678";

test("callback and return handler share one verification request", async () => {
  let count = 0;
  let release;

  const gate = new Promise(resolve => {
    release = resolve;
  });

  const verifier = createVerifier(async () => {
    count++;
    await gate;
    return { paymentStatus: "PENDING" };
  });

  const callback = verifier.verify(reference);
  const returnToTab = verifier.verify(reference);

  assert.equal(callback, returnToTab);

  release();
  await Promise.all([callback, returnToTab]);

  assert.equal(count, 1);
});

test("completed pending verification can be checked again", async () => {
  let count = 0;

  const verifier = createVerifier(async () => {
    count++;
    return { paymentStatus: "PENDING" };
  });

  await verifier.verify(reference);
  await verifier.verify(reference);

  assert.equal(count, 2);
});

test("failed verification can be retried", async () => {
  let count = 0;

  const verifier = createVerifier(async () => {
    count++;
    if (count === 1) throw new Error("Temporary failure");
    return { paymentStatus: "PENDING" };
  });

  await assert.rejects(verifier.verify(reference));
  await verifier.verify(reference);

  assert.equal(count, 2);
});

test("invalid reference cannot trigger verification", async () => {
  let calls = 0;

  const verifier = createVerifier(async () => {
    calls++;
  });

  await assert.rejects(verifier.verify("invalid ref"));
  assert.equal(calls, 0);
});

test("different references are independently verified", async () => {
  const calls = [];

  const verifier = createVerifier(async ref => {
    calls.push(ref);
  });

  await Promise.all([
    verifier.verify("RENEW_TEST_12345678"),
    verifier.verify("RENEW_TEST_87654321"),
  ]);

  assert.equal(calls.length, 2);
});

test("all three renewal paths use the same shared verifier", () => {
  assert.match(
    renew,
    /import \{ createSharedInlinePaymentVerifier \} from "\.\/flutterwaveInlineSharedVerification"/
  );

  assert.match(
    renew,
    /const inlineSharedVerifier = useRef\([\s\S]*?createSharedInlinePaymentVerifier\([\s\S]*?apiClient\.post\([\s\S]*?complete-sandbox/
  );

  const uses = renew.match(
    /inlineSharedVerifier\.current\.verify\(reference\)/g
  ) || [];

  assert.equal(uses.length, 3);
});

test("helper cannot create reservations or redirect customers", () => {
  assert.doesNotMatch(
    helperSource,
    /reservePayment|window\.open|window\.location|FlutterwaveCheckout/
  );
});
