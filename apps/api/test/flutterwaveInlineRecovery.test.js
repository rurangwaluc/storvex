"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/flutterwaveInlineRecovery.js"
  ),
  "utf8"
);

const helperPromise = import(
  "data:text/javascript;base64," +
  Buffer.from(source).toString("base64")
);

function storage() {
  const values = new Map();

  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

const reference = "STORVEX_RENEW_12345678";

test("saves only reference and timestamp", async () => {
  const h = await helperPromise;
  const s = storage();

  assert.equal(
    h.saveInlineRecoveryReference(s, reference, 1000),
    true
  );

  const stored = JSON.parse(
    s.getItem("storvex_inline_renewal_reference_v1")
  );

  assert.deepEqual(stored, {
    reference,
    savedAt: 1000,
  });
});

test("recovers a current reference", async () => {
  const h = await helperPromise;
  const s = storage();

  h.saveInlineRecoveryReference(s, reference, 1000);

  assert.equal(
    h.readInlineRecoveryReference(s, 2000),
    reference
  );
});

test("rejects expired references", async () => {
  const h = await helperPromise;
  const s = storage();

  h.saveInlineRecoveryReference(s, reference, 1000);

  assert.equal(
    h.readInlineRecoveryReference(
      s,
      1000 + 31 * 60 * 1000
    ),
    null
  );
});

test("rejects future timestamps", async () => {
  const h = await helperPromise;
  const s = storage();

  h.saveInlineRecoveryReference(s, reference, 2000);

  assert.equal(
    h.readInlineRecoveryReference(s, 1000),
    null
  );
});

test("rejects malformed references", async () => {
  const h = await helperPromise;

  assert.equal(
    h.saveInlineRecoveryReference(
      storage(),
      "../../unsafe",
      1000
    ),
    false
  );
});

test("a stale callback cannot clear a newer payment", async () => {
  const h = await helperPromise;
  const s = storage();
  const newer = "STORVEX_RENEW_87654321";

  h.saveInlineRecoveryReference(s, newer, 1000);

  assert.equal(
    h.clearInlineRecoveryReference(s, reference),
    false
  );

  assert.equal(
    h.readInlineRecoveryReference(s, 2000),
    newer
  );
});

test("a matching reference can be cleared regardless of age", async () => {
  const h = await helperPromise;
  const s = storage();

  h.saveInlineRecoveryReference(s, reference, 1000);

  assert.equal(
    h.clearInlineRecoveryReference(s, reference),
    true
  );

  assert.equal(
    h.readInlineRecoveryReference(s, 2000),
    null
  );
});

test("clearing an absent reference does not claim success", async () => {
  const h = await helperPromise;

  assert.equal(
    h.clearInlineRecoveryReference(storage(), reference),
    false
  );
});

test("unavailable browser storage fails safely", async () => {
  const h = await helperPromise;

  const blocked = {
    getItem() { throw Error("blocked"); },
    setItem() { throw Error("blocked"); },
    removeItem() { throw Error("blocked"); },
  };

  assert.equal(
    h.saveInlineRecoveryReference(
      blocked, reference, 1000
    ),
    false
  );

  assert.equal(
    h.readInlineRecoveryReference(blocked, 1000),
    null
  );

  assert.equal(
    h.clearInlineRecoveryReference(blocked, reference),
    false
  );
});

test("helper cannot verify or create payments", () => {
  assert.doesNotMatch(
    source,
    /setInlinePaymentStatus|complete-sandbox|billing\/renew|FlutterwaveCheckout/
  );
});
