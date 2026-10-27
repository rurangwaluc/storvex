"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const renew = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/Renew.jsx"
  ),
  "utf8"
);

const recheck = renew.match(
  /\/\/ STEP 342CN-FF \/ RETURN-TO-STORVEX RECONCILIATION([\s\S]*?)const grouped = useMemo/
)?.[1];

const callback = renew.match(
  /onStatus: \(\{ status \}\) => \{([\s\S]*?)\n          \},/
)?.[1];

test("terminal result reference exists", () => {
  assert.match(
    renew,
    /const inlineTerminalResult = useRef\(null\)/
  );
});

test("each new payment attempt resets terminal state", () => {
  assert.match(
    renew,
    /inlinePaymentToRecheck\.current = null;\s*inlineTerminalResult\.current = null;\s*setSubmitting\(true\)/
  );
});

test("return reconciliation ignores results after terminal status", () => {
  assert.ok(recheck);
  assert.match(
    recheck,
    /inlineTerminalResult\.current\?\.owner === current\.owner/
  );
  assert.match(
    recheck,
    /inlineTerminalResult\.current = \{\s*owner: current\.owner,\s*status/
  );
});

test("popup callback ignores results after terminal status", () => {
  assert.ok(callback);
  assert.match(
    callback,
    /inlineTerminalResult\.current\?\.owner === attemptOwner/
  );
  assert.match(
    callback,
    /inlineTerminalResult\.current = \{\s*owner: attemptOwner,\s*status/
  );
});

test("both paths require backend terminal status", () => {
  assert.match(
    recheck,
    /status === "SUCCESS" \|\| status === "FAILED"/
  );
  assert.match(
    callback,
    /status === "SUCCESS" \|\| status === "FAILED"/
  );
});

test("existing payment lock and hosted fallback remain", () => {
  assert.match(
    renew,
    /if \(paymentAttemptLock\.current \|\| submitting\) return/
  );
  assert.match(
    renew,
    /await startFlutterwaveSandboxCheckout\(\{/
  );
});
