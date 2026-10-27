"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/Renew.jsx"
  ),
  "utf8"
);

const match = source.match(
  /  function closeVerifiedInlineCheckout\(reference, owner\) \{([\s\S]*?)\n  \}\n/
);

assert.ok(match, "Verified close helper must exist");

const helperSource =
  "function closeVerifiedInlineCheckout(reference, owner) {" +
  match[1] + "\n}";

function fixture({
  status = "SUCCESS",
  reference = "RENEW_TEST_12345678",
  owner = 7,
} = {}) {
  const context = {
    inlineCheckoutHandle: {
      current: {
        reference,
        owner,
        modal: {
          close() {
            context.closeCount++;
          },
        },
      },
    },
    inlineTerminalResult: {
      current: { owner, status },
    },
    closeCount: 0,
    result: null,
  };

  vm.runInNewContext(
    helperSource +
      "\nresult = closeVerifiedInlineCheckout;",
    context
  );

  return context;
}

test("matching verified success closes once", () => {
  const f = fixture();
  f.result("RENEW_TEST_12345678", 7);
  f.result("RENEW_TEST_12345678", 7);
  assert.equal(f.closeCount, 1);
});

test("pending does not close", () => {
  const f = fixture({ status: "PENDING" });
  f.result("RENEW_TEST_12345678", 7);
  assert.equal(f.closeCount, 0);
});

test("failed payment does not close as success", () => {
  const f = fixture({ status: "FAILED" });
  f.result("RENEW_TEST_12345678", 7);
  assert.equal(f.closeCount, 0);
});

test("another payment reference cannot close", () => {
  const f = fixture();
  f.result("RENEW_OTHER_12345678", 7);
  assert.equal(f.closeCount, 0);
});

test("stale attempt cannot close newer checkout", () => {
  const f = fixture();
  f.result("RENEW_TEST_12345678", 6);
  assert.equal(f.closeCount, 0);
});

test("verified close tolerates provider close errors", () => {
  const f = fixture();
  f.inlineCheckoutHandle.current.modal.close = () => {
    throw new Error("Provider UI error");
  };

  assert.doesNotThrow(() =>
    f.result("RENEW_TEST_12345678", 7)
  );
});

test("existing attempt-reset contract remains unchanged", () => {
  assert.match(
    source,
    /inlinePaymentToRecheck\.current = null;\s*inlineTerminalResult\.current = null;\s*setSubmitting\(true\)/
  );
});

test("both success paths call the close helper", () => {
  assert.match(
    source,
    /closeVerifiedInlineCheckout\(reference, current\.owner\)/
  );
  assert.match(
    source,
    /closeVerifiedInlineCheckout\(\s*current\.reference,\s*attemptOwner/
  );
});

test("provider modal handle is retained", () => {
  assert.match(
    source,
    /const opened = openSandboxInlinePopup\(options\)/
  );
  assert.match(
    source,
    /reference: opened\.reference,\s*owner: attemptOwner,\s*modal: opened\.modal/
  );
});

test("hosted checkout and payment lock remain", () => {
  assert.match(
    source,
    /if \(paymentAttemptLock\.current \|\| submitting\) return/
  );
  assert.match(
    source,
    /await startFlutterwaveSandboxCheckout\(\{/
  );
});
