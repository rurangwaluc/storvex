const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const {
  enforceTrialGuardOrThrowTx: enforce,
} = require("../src/modules/auth/auth.controller");

const hash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

function fixture() {
  const records = [];
  const updates = [];

  const tx = {
    ownerIntent: {
      async update(args) {
        updates.push(args);
      },
    },
    trialGuard: {
      async findFirst({ where }) {
        const clauses = where.OR;
        return records.find((record) =>
          clauses.some((clause) =>
            Object.entries(clause).every(
              ([key, value]) => record[key] === value
            )
          )
        ) || null;
      },
      async create({ data }) {
        if (
          data.accountId &&
          records.some((r) => r.accountId === data.accountId)
        ) {
          const error = new Error("Unique constraint");
          error.code = "P2002";
          throw error;
        }
        records.push({ ...data });
        return { id: String(records.length) };
      },
    },
  };

  return { tx, records, updates };
}

function details(overrides = {}) {
  return {
    intentId: "intent-1",
    accountId: "verified-account-1",
    email: "first@example.com",
    phone: "0788111222",
    countryCode: "RW",
    deviceId: "device-1",
    browserFingerprint: "fingerprint-1",
    ip: "127.0.0.1",
    userAgent: "test",
    ...overrides,
  };
}

test("1. First eligible account receives one trial record", async () => {
  const { tx, records } = fixture();

  await enforce(tx, details());

  assert.equal(records.length, 1);
  assert.equal(records[0].accountId, "verified-account-1");
  assert.ok(records[0].consumedAt instanceof Date);
});

test("2. Same account cannot restart trial with new details", async () => {
  const { tx, records } = fixture();

  await enforce(tx, details());

  await assert.rejects(
    enforce(tx, details({
      intentId: "intent-2",
      email: "second@example.com",
      phone: "0788999000",
      deviceId: "device-2",
      browserFingerprint: "fingerprint-2",
    })),
    /Free trial already used/i
  );

  assert.equal(records.length, 1);
});

test("3. Historical email protection remains active", async () => {
  const { tx, records } = fixture();

  records.push({
    accountId: null,
    email: "first@example.com",
    normalizedEmail: "first@example.com",
  });

  await assert.rejects(
    enforce(tx, details()),
    /Free trial already used/i
  );

  assert.equal(records.length, 1);
});

test("4. Existing phone protection remains active", async () => {
  const { tx, records } = fixture();

  await enforce(tx, details());

  await assert.rejects(
    enforce(tx, details({
      accountId: "verified-account-2",
      email: "different@example.com",
      deviceId: "other-device",
      browserFingerprint: "other-fingerprint",
    })),
    /Free trial already used/i
  );

  assert.equal(records.length, 1);
});

test("5. Existing device protection remains active", async () => {
  const { tx, records } = fixture();

  await enforce(tx, details());

  await assert.rejects(
    enforce(tx, details({
      accountId: "verified-account-2",
      email: "different@example.com",
      phone: "0788999000",
      browserFingerprint: "other-fingerprint",
    })),
    /Free trial already used/i
  );

  assert.equal(records.length, 1);
});

test("6. Account identity blocks trial across different stores", async () => {
  const { tx, records } = fixture();

  await enforce(tx, details());

  await assert.rejects(
    enforce(tx, details({
      intentId: "another-business",
      email: "another@example.com",
      phone: "0788555666",
      deviceId: "another-device",
      browserFingerprint: "another-browser",
    })),
    /Free trial already used/i
  );

  assert.equal(records.length, 1);
});
