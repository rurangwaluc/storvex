"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createAccountSignupChallengeService } =
  require("./accountSignupChallenge.service");

const pepper = "a".repeat(64);

function fixture() {
  const account = {
    id: "account-1", email: "owner@example.com",
    emailVerifiedAt: null, status: "PENDING"
  };
  const challenges = new Map();
  const tx = {
    storvexAccountOtpChallenge: {
      async create({ data }) {
        challenges.set(data.id, { ...data, attempts: 0, consumedAt: null });
      },
      async findUnique({ where }) {
        const c = challenges.get(where.id);
        return c ? { ...c, account: { ...account } } : null;
      },
      async updateMany({ where, data }) {
        let count = 0;
        for (const c of challenges.values()) {
          if (where.id && c.id !== where.id) continue;
          if (where.accountId && c.accountId !== where.accountId) continue;
          if (where.consumedAt === null && c.consumedAt !== null) continue;
          if (where.expiresAt?.gt && c.expiresAt <= where.expiresAt.gt) continue;
          if (where.attempts?.lt !== undefined && c.attempts >= where.attempts.lt) continue;
          if (data.consumedAt !== undefined) c.consumedAt = data.consumedAt;
          if (data.attempts?.increment) c.attempts += data.attempts.increment;
          count++;
        }
        return { count };
      }
    },
    storvexAccount: {
      async updateMany({ where, data }) {
        if (where.id !== account.id || account.emailVerifiedAt ||
            account.status !== where.status) return { count: 0 };
        Object.assign(account, data);
        return { count: 1 };
      }
    }
  };
  return {
    account, challenges,
    service: createAccountSignupChallengeService({
      prisma: {
        ...tx,
        $transaction: async fn => fn({
          ...tx,
          $queryRaw: async () => []
        })
      },
      pepper, now: () => new Date("2026-10-20T10:00:00Z")
    })
  };
}

test("valid OTP activates account once", async () => {
  const f = fixture();
  const c = await f.service.issue({ account: f.account });
  assert.equal((await f.service.consume({
    accountId: f.account.id, challengeId: c.challengeId, code: c.code
  })).verified, true);
  assert.equal(f.account.status, "ACTIVE");
  assert.ok(f.account.emailVerifiedAt);
  assert.equal((await f.service.consume({
    accountId: f.account.id, challengeId: c.challengeId, code: c.code
  })).verified, false);
});

test("incorrect code fails and increments attempts", async () => {
  const f = fixture();
  const c = await f.service.issue({ account: f.account });
  const result = await f.service.consume({
    accountId: f.account.id, challengeId: c.challengeId, code: "invalid"
  });
  assert.equal(result.verified, false);
  assert.equal(f.challenges.get(c.challengeId).attempts, 1);
});

test("fifth incorrect attempt locks challenge", async () => {
  const f = fixture();
  const c = await f.service.issue({ account: f.account });
  for (let i = 0; i < 5; i++) {
    await f.service.consume({
      accountId: f.account.id, challengeId: c.challengeId, code: "invalid"
    });
  }
  assert.equal((await f.service.consume({
    accountId: f.account.id, challengeId: c.challengeId, code: c.code
  })).verified, false);
});

test("new OTP invalidates previous challenge", async () => {
  const f = fixture();
  const first = await f.service.issue({ account: f.account });
  await f.service.issue({ account: f.account });
  assert.ok(f.challenges.get(first.challengeId).consumedAt);
});
