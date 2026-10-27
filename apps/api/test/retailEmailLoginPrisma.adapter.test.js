"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRetailEmailLoginPrismaAdapter
} = require("../src/modules/auth/retailEmailLoginPrisma.adapter");

const pepper =
  "storvex-isolated-test-secret-32-bytes-minimum";

const fixedNow = new Date("2026-10-19T12:00:00.000Z");

function fakePrisma() {
  const records = new Map();
  const calls = {
    created: 0,
    updated: 0
  };

  const prisma = {
    retailEmailLoginChallenge: {
      async create({ data }) {
        calls.created++;
        records.set(data.id, { ...data });
        return { ...data };
      },

      async findUnique({ where }) {
        const row = records.get(where.id);
        return row ? { ...row } : null;
      },

      async updateMany({ where, data }) {
        calls.updated++;

        const row = records.get(where.id);

        if (!row) return { count: 0 };

        if (
          Object.prototype.hasOwnProperty.call(
            where, "consumedAt"
          ) &&
          row.consumedAt !== where.consumedAt
        ) {
          return { count: 0 };
        }

        if (where.userId && row.userId !== where.userId) {
          return { count: 0 };
        }

        if (where.email && row.email !== where.email) {
          return { count: 0 };
        }

        if (where.codeHash && row.codeHash !== where.codeHash) {
          return { count: 0 };
        }

        if (
          where.expiresAt &&
          row.expiresAt.getTime() <=
            where.expiresAt.gt.getTime()
        ) {
          return { count: 0 };
        }

        if (
          where.attempts &&
          row.attempts >= where.attempts.lt
        ) {
          return { count: 0 };
        }

        if (data.attempts) {
          row.attempts += data.attempts.increment;
        }

        if (data.consumedAt) {
          row.consumedAt = data.consumedAt;
        }

        return { count: 1 };
      }
    }
  };

  return { prisma, records, calls };
}

function makeAdapter(prisma, clock = () => fixedNow) {
  return createRetailEmailLoginPrismaAdapter({
    prisma,
    pepper,
    now: clock
  });
}

async function issue(adapter) {
  return adapter.issueChallenge({
    userId: "retail-user-1",
    email: "merchant@example.test"
  });
}

test("creates challenge through Prisma delegate", async () => {
  const db = fakePrisma();
  const adapter = makeAdapter(db.prisma);
  const result = await issue(adapter);

  assert.equal(db.calls.created, 1);
  assert.match(result.code, /^\d{6}$/);
  assert.equal(db.records.has(result.challengeId), true);
  assert.equal(
    "code" in db.records.get(result.challengeId),
    false
  );
});

test("consumes correct OTP exactly once", async () => {
  const db = fakePrisma();
  const adapter = makeAdapter(db.prisma);
  const challenge = await issue(adapter);

  const first = await adapter.consumeChallenge({
    challengeId: challenge.challengeId,
    code: challenge.code
  });

  const second = await adapter.consumeChallenge({
    challengeId: challenge.challengeId,
    code: challenge.code
  });

  assert.equal(first.userId, "retail-user-1");
  assert.equal(second, null);
});

test("invalidates challenge after delivery failure", async () => {
  const db = fakePrisma();
  const adapter = makeAdapter(db.prisma);
  const challenge = await issue(adapter);

  const invalidated = await adapter.invalidateChallenge({
    challengeId: challenge.challengeId
  });

  assert.equal(invalidated, true);

  const result = await adapter.consumeChallenge({
    challengeId: challenge.challengeId,
    code: challenge.code
  });

  assert.equal(result, null);
});

test("invalidation is idempotent", async () => {
  const db = fakePrisma();
  const adapter = makeAdapter(db.prisma);
  const challenge = await issue(adapter);

  const first = await adapter.invalidateChallenge({
    challengeId: challenge.challengeId
  });

  const second = await adapter.invalidateChallenge({
    challengeId: challenge.challengeId
  });

  assert.equal(first, true);
  assert.equal(second, false);
});

test("expired challenge cannot authenticate", async () => {
  const db = fakePrisma();

  let currentTime = fixedNow;
  const adapter = makeAdapter(
    db.prisma,
    () => currentTime
  );

  const challenge = await issue(adapter);

  currentTime = new Date(
    fixedNow.getTime() + 11 * 60000
  );

  const result = await adapter.consumeChallenge({
    challengeId: challenge.challengeId,
    code: challenge.code
  });

  assert.equal(result, null);
});

test("invalid code increments attempts", async () => {
  const db = fakePrisma();
  const adapter = makeAdapter(db.prisma);
  const challenge = await issue(adapter);

  const invalidCode = challenge.code === "000000"
    ? "000001"
    : "000000";

  const result = await adapter.consumeChallenge({
    challengeId: challenge.challengeId,
    code: invalidCode
  });

  assert.equal(result, null);
  assert.equal(
    db.records.get(challenge.challengeId).attempts,
    1
  );
});

test("rejects weak hashing secret", () => {
  const db = fakePrisma();

  assert.throws(
    () => createRetailEmailLoginPrismaAdapter({
      prisma: db.prisma,
      pepper: "short"
    }),
    TypeError
  );
});

test("requires Prisma challenge delegate", () => {
  assert.throws(
    () => createRetailEmailLoginPrismaAdapter({
      prisma: {},
      pepper
    }),
    TypeError
  );
});

test("competing invalidations have one winner", async () => {
  const db = fakePrisma();
  const adapter = makeAdapter(db.prisma);
  const challenge = await issue(adapter);

  const results = await Promise.all([
    adapter.invalidateChallenge({
      challengeId: challenge.challengeId
    }),
    adapter.invalidateChallenge({
      challengeId: challenge.challengeId
    })
  ]);

  assert.equal(results.filter(Boolean).length, 1);
});
