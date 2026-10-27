"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/Renew.jsx"
  ),
  "utf8"
);

const recovery = source.split(
  "// STEP 342CN-GF / AUTHENTICATED REFRESH RECOVERY"
)[1]?.split(
  "// STEP 342CN-FF / RETURN-TO-STORVEX RECONCILIATION"
)[0];

test("refresh resumes the original payment verification", () => {
  assert.ok(recovery);
  assert.match(
    recovery,
    /await inlineSharedVerifier\.current\.verify\(reference\)/
  );
});

test("refresh verifies before reading authoritative status", () => {
  assert.ok(
    recovery.indexOf(
      "await inlineSharedVerifier.current.verify(reference)"
    ) <
    recovery.indexOf("await apiClient.get(")
  );
});

test("verification failure cannot create false payment failure", () => {
  assert.match(
    recovery,
    /catch \{\s*\/\/ Failed verification is not proof of failed payment/
  );
});

test("superseded recovery stops before status lookup", () => {
  assert.match(recovery, /if \(cancelled\) return/);
  assert.match(
    recovery,
    /paymentAttemptOwner\.current !== owner/
  );
  assert.match(
    recovery,
    /inlinePaymentToRecheck\.current\?\.reference !== reference/
  );
});

test("refresh cannot initiate another checkout", () => {
  assert.doesNotMatch(
    recovery,
    /reservePayment|openSandboxInlinePopup|\/billing\/renew/
  );
});

test("backend payment identity remains mandatory", () => {
  assert.match(
    recovery,
    /payment\?\.reference !== reference/
  );
  assert.match(
    recovery,
    /payment\?\.purpose !== "SUBSCRIPTION_RENEWAL"/
  );
});
