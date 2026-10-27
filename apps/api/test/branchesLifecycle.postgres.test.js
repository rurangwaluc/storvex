const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, "../.env"),
  quiet: true,
});

const base = new URL(process.env.DATABASE_URL || "");

if (
  !["localhost", "127.0.0.1", "::1"].includes(base.hostname) ||
  base.pathname !== "/storvex_local"
) {
  throw new Error("STOP: Unexpected development database.");
}

base.pathname = "/storvex_branches_test";
base.search = "";

process.env.DATABASE_URL = base.toString();
delete process.env.DIRECT_URL;
delete process.env.SHADOW_DATABASE_URL;
delete global.__prisma__;

const prisma = require("../src/config/database");

const {
  createBranch,
  updateBranch,
  setMainBranch,
  archiveBranch,
  reactivateBranch,
} = require("../src/modules/branches/branches.service");

test("branch lifecycle and tenant isolation", async () => {
  const marker = randomUUID();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const ownerA = randomUUID();
  const ownerB = randomUUID();

  const ids = [tenantA, tenantB];

  try {
    const identity = await prisma.$queryRaw`
      SELECT current_database() AS name
    `;

    assert.equal(
      identity[0].name,
      "storvex_branches_test"
    );

    for (const [index, tenantId, ownerId] of [
      [1, tenantA, ownerA],
      [2, tenantB, ownerB],
    ]) {
      await prisma.tenant.create({
        data: {
          id: tenantId,
          name: `Branches Test Business ${index}`,
          email: `business-${index}-${marker}@example.test`,
          phone: "+250788000000",
          status: "ACTIVE",
          countryCode: "RW",
        },
      });

      await prisma.user.create({
        data: {
          id: ownerId,
          tenantId,
          name: `Test Owner ${index}`,
          email: `owner-${index}-${marker}@example.test`,
          phone: "+250788000001",
          password: "test-only-placeholder",
          role: "OWNER",
        },
      });

      await prisma.subscription.create({
        data: {
          tenantId,
          status: "ACTIVE",
          accessMode: "ACTIVE",
          branchLimit: 2,
          extraBranchCount: 0,
          startDate: new Date(),
          endDate: new Date(
            Date.now() + 86400000
          ),
        },
      });
    }

    const main = await createBranch({
      tenantId: tenantA,
      actorUserId: ownerA,
      actorRole: "OWNER",
      name: "Main Location",
      code: "MAIN",
    });

    const second = await createBranch({
      tenantId: tenantA,
      actorUserId: ownerA,
      actorRole: "OWNER",
      name: "Second Location",
      code: "SECOND",
    });

    assert.ok(main.branch.id);
    assert.ok(second.branch.id);

    console.log("PASS: Create two branches.");

    const updated = await updateBranch({
      tenantId: tenantA,
      branchId: second.branch.id,
      actorUserId: ownerA,
      actorRole: "OWNER",
      name: "Updated Location",
    });

    assert.equal(
      updated.name,
      "Updated Location"
    );

    console.log("PASS: Edit branch.");

    await setMainBranch({
      tenantId: tenantA,
      branchId: main.branch.id,
      actorUserId: ownerA,
      actorRole: "OWNER",
    });

    const savedTenant = await prisma.tenant.findUnique({
      where: { id: tenantA },
    });

    assert.equal(
      savedTenant.mainBranchId,
      main.branch.id
    );

    console.log("PASS: Set main branch.");

    await assert.rejects(
      archiveBranch({
        tenantId: tenantA,
        branchId: main.branch.id,
        actorUserId: ownerA,
        actorRole: "OWNER",
      }),
      { code: "MAIN_BRANCH_CANNOT_BE_ARCHIVED" }
    );

    console.log("PASS: Main branch protected.");

    await assert.rejects(
      updateBranch({
        tenantId: tenantB,
        branchId: second.branch.id,
        actorUserId: ownerB,
        actorRole: "OWNER",
        name: "Unauthorized Change",
      }),
      { status: 404 }
    );

    console.log("PASS: Cross-tenant update rejected.");

    await archiveBranch({
      tenantId: tenantA,
      branchId: second.branch.id,
      actorUserId: ownerA,
      actorRole: "OWNER",
    });

    let stored = await prisma.branch.findUnique({
      where: { id: second.branch.id },
    });

    assert.equal(stored.status, "ARCHIVED");

    console.log("PASS: Archive without deleting branch.");

    await reactivateBranch({
      tenantId: tenantA,
      branchId: second.branch.id,
      actorUserId: ownerA,
      actorRole: "OWNER",
    });

    stored = await prisma.branch.findUnique({
      where: { id: second.branch.id },
    });

    assert.equal(stored.status, "ACTIVE");

    console.log("PASS: Reactivate branch.");

    await archiveBranch({
      tenantId: tenantA,
      branchId: second.branch.id,
      actorUserId: ownerA,
      actorRole: "OWNER",
    });

    await prisma.subscription.update({
      where: { tenantId: tenantA },
      data: { branchLimit: 1 },
    });

    await assert.rejects(
      reactivateBranch({
        tenantId: tenantA,
        branchId: second.branch.id,
        actorUserId: ownerA,
        actorRole: "OWNER",
      }),
      { code: "BRANCH_LIMIT_REACHED" }
    );

    console.log("PASS: Reactivation respects plan limit.");

  } finally {
    // Cleanup targets only the generated test tenants.
    // The connection identity was verified before setup.
    for (const tenantId of ids) {
      await prisma.auditLog.deleteMany({
        where: { tenantId },
      });

      await prisma.userBranchAssignment.deleteMany({
        where: { tenantId },
      });

      await prisma.tenant.updateMany({
        where: { id: tenantId },
        data: { mainBranchId: null },
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
    }

    await prisma.$disconnect();
  }
});
