"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const targets = [
  [
    "../src/modules/payments/payments.webhook.js",
    "async function momoWebhook(req, res) {",
  ],
  [
    "../src/modules/payments/momo.controller.js",
    "async function momoWebhook(req, res) {",
  ],
  [
    "../src/modules/billing/billing.controller.js",
    "async function devMarkRenewalPaymentSuccessful(req, res) {",
  ],
];

for (const [filename, signature] of targets) {
  test(`Retired handler guarded: ${filename}`, () => {
    const source = fs.readFileSync(
      path.join(__dirname, filename),
      "utf8"
    );

    assert.equal(source.split(signature).length - 1, 1);

    const entry = source.slice(
      source.indexOf(signature) + signature.length,
      source.indexOf(signature) + signature.length + 350
    );

    assert.match(entry, /return res.status\(503\)/);
    assert.match(entry, /RETIRED_PAYMENT_SUCCESS_DISABLED/);
  });
}
