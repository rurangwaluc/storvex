const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const dotenv = require("dotenv");

dotenv.config({ path: require("node:path").join(__dirname, "../.env"), quiet: true });

const base = new URL(process.env.DATABASE_URL || "");

if (
  !["localhost", "127.0.0.1", "::1"].includes(base.hostname) ||
  base.pathname !== "/storvex_local"
) {
  throw new Error("STOP: Unexpected development connection.");
}

base.pathname = "/storvex_branches_test";
base.search = "";

process.env.DATABASE_URL = base.toString();
delete process.env.DIRECT_URL;
delete process.env.SHADOW_DATABASE_URL;
delete global.__prisma__;

const prisma = require("../src/config/database");
const { createBranch } = require("../src/modules/branches/branches.service");

test("simultaneous branch requests respect subscription capacity", async () => {
  const marker = randomUUID();
  const tenantId = randomUUID();
  const ownerId = randomUUID();

  try {
    const identity = await prisma.$queryRaw`
      SELECT current_database() AS name
    `;

    assert.equal(identity[0].name, "storvex_branches_test");

    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: `Branch Test ${marker}`,
        email: `tenant-${marker}@example.test`,
        phone: "+250788000000",
        status: "ACTIVE",
        countryCode: "RW",
      },
    });

    await prisma.user.create({
      data: {
        id: ownerId,
        tenantId,
        name: "Branch Test Owner",
        email: `owner-${marker}@example.test`,
        phone: "+250788000001",
        password: "integration-test-not-a-real-password",
        role: "OWNER",
        isActive: true,
      },
    });

    const now = new Date();
    const future = new Date(now.getTime() + 86400000);

    await prisma.subscription.create({
      data: {
        tenantId,
        status: "ACTIVE",
        accessMode: "ACTIVE",
        branchLimit: 1,
        extraBranchCount: 0,
        startDate: now,
        endDate: future,
      },
    });

    const results = await Promise.allSettled([
      createBranch({
        tenantId,
        actorUserId: ownerId,
        actorRole: "OWNER",
        name: "Test Branch One",
        code: "TEST_ONE",
      }),
      createBranch({
        tenantId,
        actorUserId: ownerId,
        actorRole: "OWNER",
        name: "Test Branch Two",
        code: "TEST_TWO",
      }),
    ]);

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    );

    const rejected = results.filter(
      (result) => result.status === "rejected"
    );

    assert.equal(successful.length, 1);
    assert.equal(rejected.length, 1);

    const branches = await prisma.branch.findMany({
      where: { tenantId, status: "ACTIVE" },
    });

    assert.equal(branches.length, 1);

    console.log(
      "PASS: Only one branch created with one available slot."
    );
  } finally {
    // Only delete records belonging to this uniquely generated test tenant.
    await prisma.auditLog.deleteMany({
      where: { tenantId },
    });

    await prisma.userBranchAssignment.deleteMany({
      where: { tenantId },
    });

    await prisma.branch.deleteMany({
      where: { tenantId },
    });

    await prisma.subscription.deleteMany({
      where: { tenantId },
    });

    await prisma.user.deleteMany({
      where: { tenantId },
    });

    await prisma.tenant.deleteMany({
      where: { id: tenantId },
    });

    await prisma.$disconnect();
  }
});
