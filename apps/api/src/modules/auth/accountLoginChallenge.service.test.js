"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");

const {
  createAccountLoginChallengeService
} = require("./accountLoginChallenge.service");

const PEPPER = "test-only-strong-secret-not-for-production-123456";
const ACCOUNT_ID = "account-test-123";

function createFixture() {
  let currentTime = new Date("2026-10-20T10:00:00Z");

  const account = {
    id: ACCOUNT_ID,
    email: "test@example.invalid",
    fullName: "Test Account",
    status: "ACTIVE",
    emailVerifiedAt: new Date("2026-10-19T10:00:00Z")
  };

  const challenges = new Map();
  const issued = [];
  const calls = [];

  const model = {
    async updateMany({ where, data }) {
      let count = 0;

      for (const row of challenges.values()) {
        if (
          where.id !== undefined &&
          row.id !== where.id
        ) continue;

        if (
          where.accountId !== undefined &&
          row.accountId !== where.accountId
        ) continue;

        if (
          where.purpose !== undefined &&
          row.purpose !== where.purpose
        ) continue;

        if (
          where.consumedAt === null &&
          row.consumedAt !== null
        ) continue;

        if (
          where.expiresAt?.gt &&
          row.expiresAt <= where.expiresAt.gt
        ) continue;

        if (
          where.attempts?.lt !== undefined &&
          row.attempts >= where.attempts.lt
        ) continue;

        if (data.consumedAt !== undefined) {
          row.consumedAt = data.consumedAt;
        }

        if (data.attempts?.increment) {
          row.attempts += data.attempts.increment;
        }

        count++;
      }

      calls.push({ operation: "updateMany", where, data });
      return { count };
    },

    async create({ data }) {
      const row = {
        ...data,
        attempts: 0,
        consumedAt: null
      };

      challenges.set(row.id, row);
      issued.push(row);

      return row;
    },

    async findUnique({ where }) {
      const row = challenges.get(where.id);
      return row ? { ...row, account: { ...account } } : null;
    }
  };

  const prisma = {
    storvexAccount: {},
    storvexAccountOtpChallenge: model,

    async $transaction(fn) {
      return fn({
        storvexAccountOtpChallenge: model,
        async $queryRaw() {
          return [];
        }
      });
    }
  };

  const service = createAccountLoginChallengeService({
    prisma,
    pepper: PEPPER,
    now: () => currentTime
  });

  return {
    account,
    challenges,
    issued,
    calls,
    service,
    advance(minutes) {
      currentTime = new Date(
        currentTime.getTime() + minutes * 60000
      );
    }
  };
}

test("issues a LOGIN challenge for a verified active account", async () => {
  const fixture = createFixture();
  const challenge = await fixture.service.issue({
    account: fixture.account
  });

  assert.match(challenge.code, /^\d{6}$/);
  assert.equal(fixture.issued.length, 1);
  assert.equal(fixture.issued[0].purpose, "LOGIN");
  assert.notEqual(fixture.issued[0].codeHash, challenge.code);
});

test("rejects pending and unverified accounts", async () => {
  const fixture = createFixture();

  await assert.rejects(
    fixture.service.issue({
      account: { ...fixture.account, status: "PENDING" }
    }),
    /Verified active account required/
  );

  await assert.rejects(
    fixture.service.issue({
      account: { ...fixture.account, emailVerifiedAt: null }
    }),
    /Verified active account required/
  );

  assert.equal(fixture.issued.length, 0);
});

test("valid login OTP succeeds only once", async () => {
  const fixture = createFixture();
  const challenge = await fixture.service.issue({
    account: fixture.account
  });

  const input = {
    accountId: fixture.account.id,
    challengeId: challenge.challengeId,
    code: challenge.code
  };

  assert.deepEqual(
    await fixture.service.consume(input),
    { verified: true, accountId: ACCOUNT_ID }
  );

  assert.deepEqual(
    await fixture.service.consume(input),
    { verified: false }
  );
});

test("incorrect codes increment attempts and lock after five", async () => {
  const fixture = createFixture();
  const challenge = await fixture.service.issue({
    account: fixture.account
  });

  const wrongCode =
    challenge.code === "000000" ? "999999" : "000000";

  for (let i = 0; i < 5; i++) {
    assert.deepEqual(
      await fixture.service.consume({
        accountId: ACCOUNT_ID,
        challengeId: challenge.challengeId,
        code: wrongCode
      }),
      { verified: false }
    );
  }

  assert.equal(
    fixture.challenges.get(challenge.challengeId).attempts,
    5
  );

  assert.deepEqual(
    await fixture.service.consume({
      accountId: ACCOUNT_ID,
      challengeId: challenge.challengeId,
      code: challenge.code
    }),
    { verified: false }
  );
});

test("expired login OTP is rejected", async () => {
  const fixture = createFixture();
  const challenge = await fixture.service.issue({
    account: fixture.account
  });

  fixture.advance(11);

  assert.deepEqual(
    await fixture.service.consume({
      accountId: ACCOUNT_ID,
      challengeId: challenge.challengeId,
      code: challenge.code
    }),
    { verified: false }
  );
});

test("new login challenge invalidates the previous login challenge", async () => {
  const fixture = createFixture();

  const first = await fixture.service.issue({
    account: fixture.account
  });

  const second = await fixture.service.issue({
    account: fixture.account
  });

  assert.deepEqual(
    await fixture.service.consume({
      accountId: ACCOUNT_ID,
      challengeId: first.challengeId,
      code: first.code
    }),
    { verified: false }
  );

  assert.deepEqual(
    await fixture.service.consume({
      accountId: ACCOUNT_ID,
      challengeId: second.challengeId,
      code: second.code
    }),
    { verified: true, accountId: ACCOUNT_ID }
  );
});

test("LOGIN issuance leaves SIGNUP challenges untouched", async () => {
  const fixture = createFixture();

  fixture.challenges.set("signup-challenge", {
    id: "signup-challenge",
    accountId: ACCOUNT_ID,
    purpose: "SIGNUP",
    consumedAt: null,
    attempts: 0,
    expiresAt: new Date("2026-10-20T11:00:00Z"),
    codeHash: "test-hash"
  });

  await fixture.service.issue({
    account: fixture.account
  });

  assert.equal(
    fixture.challenges.get("signup-challenge").consumedAt,
    null
  );
});

test("SIGNUP challenge cannot be consumed as LOGIN", async () => {
  const fixture = createFixture();
  const challenge = await fixture.service.issue({
    account: fixture.account
  });

  fixture.challenges.get(challenge.challengeId).purpose =
    "SIGNUP";

  assert.deepEqual(
    await fixture.service.consume({
      accountId: ACCOUNT_ID,
      challengeId: challenge.challengeId,
      code: challenge.code
    }),
    { verified: false }
  );
});

test("suspended account cannot complete login", async () => {
  const fixture = createFixture();
  const challenge = await fixture.service.issue({
    account: fixture.account
  });

  fixture.account.status = "SUSPENDED";

  assert.deepEqual(
    await fixture.service.consume({
      accountId: ACCOUNT_ID,
      challengeId: challenge.challengeId,
      code: challenge.code
    }),
    { verified: false }
  );
});

test("invalidates only LOGIN challenges", async () => {
  const fixture = createFixture();
  const challenge = await fixture.service.issue({
    account: fixture.account
  });

  assert.equal(
    await fixture.service.invalidate(challenge.challengeId),
    true
  );

  assert.equal(
    await fixture.service.invalidate(challenge.challengeId),
    false
  );
});

test("rejects malformed verification codes", async () => {
  const fixture = createFixture();
  const challenge = await fixture.service.issue({
    account: fixture.account
  });

  assert.deepEqual(
    await fixture.service.consume({
      accountId: ACCOUNT_ID,
      challengeId: challenge.challengeId,
      code: "abc123"
    }),
    { verified: false }
  );
});

test("requires a sufficiently strong OTP secret", () => {
  const fixture = createFixture();

  assert.throws(
    () => createAccountLoginChallengeService({
      prisma: {
        storvexAccount: {},
        storvexAccountOtpChallenge: {},
        $transaction: async () => {}
      },
      pepper: "weak"
    }),
    /Strong OTP secret required/
  );

  assert.ok(fixture.service);
});
