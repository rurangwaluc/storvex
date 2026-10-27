"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { config } = require("dotenv");
const { createAccountSignupChallengeService } =
  require("./accountSignupChallenge.service");

config({ path: require("node:path").resolve(__dirname, "../../../.env"), quiet: true });

const url = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
    url.pathname !== "/storvex_local") {
  throw new Error("STOP: PostgreSQL test requires local storvex_local.");
}

test("real PostgreSQL: OTP consumption is single-use under concurrency",
  { timeout: 30000 }, async () => {
  const prisma = new PrismaClient();
  const id = crypto.randomUUID();
  const account = {
    id,
    fullName: "Temporary Integration Test",
    email: `signup-test-${id}@example.invalid`,
    status: "PENDING"
  };

  try {
    await prisma.storvexAccount.create({ data: account });

    const service = createAccountSignupChallengeService({
      prisma,
      pepper: "test-only-strong-secret-".repeat(3)
    });

    const challenge = await service.issue({ account });

    const results = await Promise.all([
      service.consume({
        accountId: id,
        challengeId: challenge.challengeId,
        code: challenge.code
      }),
      service.consume({
        accountId: id,
        challengeId: challenge.challengeId,
        code: challenge.code
      })
    ]);

    assert.equal(
      results.filter(result => result.verified).length,
      1,
      "Exactly one concurrent verification may succeed"
    );

    const saved = await prisma.storvexAccount.findUnique({
      where: { id }
    });

    assert.equal(saved.status, "ACTIVE");
    assert.ok(saved.emailVerifiedAt);

    const replay = await service.consume({
      accountId: id,
      challengeId: challenge.challengeId,
      code: challenge.code
    });

    assert.equal(replay.verified, false);

    console.log("PostgreSQL concurrency: PASSED");
    console.log("Single-use verification: PASSED");
    console.log("Verified account activation: PASSED");
  } finally {
    await prisma.storvexAccount.deleteMany({
      where: { id }
    });
    await prisma.$disconnect();
  }
});
