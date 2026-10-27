"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  issueChallenge,
  consumeChallenge,
  MAX_ATTEMPTS,
  TTL_MS
} = require("../src/modules/auth/retailEmailLoginChallenge.service");

const pepper = "retail-login-test-key-with-more-than-32-bytes";
const now = new Date("2026-10-19T10:00:00.000Z");

function fakeDb() {
  const rows = new Map();

  const model = {
    async create({ data }) {
      if (rows.has(data.id)) throw new Error("Duplicate ID");
      rows.set(data.id, { ...data });
      return { ...data };
    },
    async findUnique({ where }) {
      const row = rows.get(where.id);
      return row ? { ...row } : null;
    },
    async updateMany({ where, data }) {
      const row = rows.get(where.id);

      if (
        !row ||
        row.userId !== where.userId ||
        row.email !== where.email ||
        row.codeHash !== where.codeHash ||
        row.consumedAt !== null ||
        row.expiresAt.getTime() <= where.expiresAt.gt.getTime() ||
        row.attempts >= where.attempts.lt
      ) {
        return { count: 0 };
      }

      if (data.consumedAt) {
        row.consumedAt = data.consumedAt;
      }

      if (data.attempts) {
        row.attempts += data.attempts.increment;
      }

      return { count: 1 };
    }
  };

  return {
    rows,
    retailEmailLoginChallenge: model
  };
}

async function issued(db) {
  return issueChallenge({
    db,
    userId: "retail-1",
    email: " Merchant@Example.Test ",
    pepper,
    now
  });
}

test("creates a hashed, expiring retail challenge", async () => {
  const db = fakeDb();
  const result = await issued(db);
  const row = db.rows.get(result.challengeId);

  assert.match(result.code, /^\d{6}$/);
  assert.equal(row.userId, "retail-1");
  assert.equal(row.email, "merchant@example.test");
  assert.notEqual(row.codeHash, result.code);
  assert.equal(row.codeHash.length, 64);
  assert.equal(row.expiresAt.getTime() - now.getTime(), TTL_MS);
  assert.equal(row.attempts, 0);
  assert.equal(row.consumedAt, null);
  assert.equal("code" in row, false);
});

test("consumes a valid challenge only once", async () => {
  const db = fakeDb();
  const input = await issued(db);

  const args = {
    db,
    challengeId: input.challengeId,
    code: input.code,
    pepper,
    now
  };

  const first = await consumeChallenge(args);
  const second = await consumeChallenge(args);

  assert.equal(first.userId, "retail-1");
  assert.equal(second, null);
});

test("rejects expired challenges", async () => {
  const db = fakeDb();
  const input = await issued(db);

  const result = await consumeChallenge({
    db,
    challengeId: input.challengeId,
    code: input.code,
    pepper,
    now: new Date(now.getTime() + TTL_MS)
  });

  assert.equal(result, null);
});

test("limits invalid attempts", async () => {
  const db = fakeDb();
  const input = await issued(db);

  const wrong = input.code === "000000"
    ? "000001" : "000000";

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const result = await consumeChallenge({
      db,
      challengeId: input.challengeId,
      code: wrong,
      pepper,
      now
    });

    assert.equal(result, null);
  }

  const row = db.rows.get(input.challengeId);
  assert.equal(row.attempts, MAX_ATTEMPTS);

  const result = await consumeChallenge({
    db,
    challengeId: input.challengeId,
    code: input.code,
    pepper,
    now
  });

  assert.equal(result, null);
});

test("rejects tampering with the stored identity", async () => {
  const db = fakeDb();
  const input = await issued(db);
  db.rows.get(input.challengeId).userId = "another-retail-user";

  const result = await consumeChallenge({
    db,
    challengeId: input.challengeId,
    code: input.code,
    pepper,
    now
  });

  assert.equal(result, null);
});

test("allows one winner for concurrent correct submissions", async () => {
  const db = fakeDb();
  const input = await issued(db);

  const args = {
    db,
    challengeId: input.challengeId,
    code: input.code,
    pepper,
    now
  };

  const results = await Promise.all([
    consumeChallenge(args),
    consumeChallenge(args)
  ]);

  assert.equal(
    results.filter(Boolean).length,
    1
  );
});

test("never returns a session or JWT", async () => {
  const db = fakeDb();
  const input = await issued(db);

  const result = await consumeChallenge({
    db,
    challengeId: input.challengeId,
    code: input.code,
    pepper,
    now
  });

  assert.deepEqual(
    Object.keys(result).sort(),
    ["challengeId", "email", "userId"]
  );
});
