"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const requireRole = require("../src/middlewares/requireRole");
const controller = require("../src/modules/whatsapp/whatsapp.accounts.controller");
const service = require("../src/modules/whatsapp/whatsapp.accounts.service");

function roleResult(role) {
  let nextCalled = false;
  let response = null;
  requireRole("OWNER", "MANAGER")(
    role ? { user: { role } } : {},
    { status(code) { response = { code }; return { json(body) { response.body = body; return response; } }; } },
    () => { nextCalled = true; },
  );
  return { nextCalled, response };
}

test("Embedded Signup authorization allows OWNER and MANAGER only", () => {
  assert.equal(roleResult("OWNER").nextCalled, true);
  assert.equal(roleResult("MANAGER").nextCalled, true);
  assert.equal(roleResult("CASHIER").response.code, 403);
  assert.equal(roleResult(null).response.code, 401);
});

test("tenant authority comes from the authenticated user, never the browser body", () => {
  const req = { user: { tenantId: "tenant-auth" }, body: { tenantId: "tenant-attacker" } };
  assert.equal(controller.__private.getTenantId(req), "tenant-auth");
});

function setup({ existing = null, foreign = null, subscriptionFails = false } = {}) {
  const writes = [];
  const db = {
    tenant: { findUnique: async ({ where }) => ({ id: where.id, name: "Tenant", status: "ACTIVE" }) },
    whatsAppAccount: {
      findFirst: async ({ where }) => {
        if (where.phoneNumberId) return foreign;
        return existing;
      },
      create: async ({ data }) => {
        const row = { id: "account-new", createdAt: new Date(), updatedAt: new Date(), ...data };
        writes.push({ type: "create", row });
        return row;
      },
      update: async ({ where, data }) => {
        const base = writes.at(-1)?.row || existing || { id: where.id, tenantId: "tenant-a" };
        const row = { ...base, ...data, id: where.id, updatedAt: new Date() };
        writes.push({ type: "update", row });
        return row;
      },
    },
  };
  const calls = [];
  const meta = {
    exchangeCode: async (code) => { calls.push(["exchange", code]); return "provider-token"; },
    resolveAuthorizedAssets: async () => ({
      wabaId: "111", phoneNumberId: "222", phoneNumber: "250788123456",
      businessName: "Verified Store", wabaName: "Verified Store",
    }),
    registerPhone: async () => { calls.push(["register"]); },
    subscribeWaba: async () => {
      calls.push(["subscribe"]);
      if (subscriptionFails) throw Object.assign(new Error("failed"), { code: "WHATSAPP_META_SUBSCRIPTION_FAILED" });
    },
  };
  return { db, meta, writes, calls };
}

const INPUT = {
  code: "short-lived-code",
  tenantId: "browser-tenant",
  sessionInfo: { wabaId: "111", phoneNumberId: "222", businessId: "333" },
};

test("authoritatively connects and redacts the encrypted credential", async () => {
  const ctx = setup();
  const account = await service.completeEmbeddedSignup("tenant-a", INPUT, {
    prisma: ctx.db,
    meta: ctx.meta,
    encryptCredential: (token) => `encrypted:${token}`,
  });
  assert.equal(ctx.writes[0].row.tenantId, "tenant-a");
  assert.equal(ctx.writes[0].row.accessToken, "encrypted:provider-token");
  assert.equal(ctx.writes[0].row.isActive, false);
  assert.equal(ctx.writes.at(-1).row.isActive, true);
  assert.equal(account.connectionState, "connected");
  assert.equal(account.hasAccessToken, true);
  assert.equal(Object.hasOwn(account, "accessToken"), false);
  assert.deepEqual(ctx.calls.map((call) => call[0]), ["exchange", "register", "subscribe"]);
});

test("retries idempotently by updating the same tenant account", async () => {
  const existing = { id: "account-existing", tenantId: "tenant-a", phoneNumber: "old", createdAt: new Date() };
  const ctx = setup({ existing });
  await service.completeEmbeddedSignup("tenant-a", INPUT, {
    prisma: ctx.db, meta: ctx.meta, encryptCredential: () => "encrypted",
  });
  assert.equal(ctx.writes[0].type, "update");
  assert.equal(ctx.writes[0].row.id, "account-existing");
});

test("rejects a phone already owned by another tenant", async () => {
  const ctx = setup({ foreign: { id: "foreign-account" } });
  await assert.rejects(
    service.completeEmbeddedSignup("tenant-a", INPUT, {
      prisma: ctx.db, meta: ctx.meta, encryptCredential: () => "encrypted",
    }),
    { code: "WHATSAPP_PHONE_OWNED_BY_ANOTHER_TENANT" },
  );
  assert.equal(ctx.writes.length, 0);
});

test("leaves the persisted account inactive after subscription failure", async () => {
  const ctx = setup({ subscriptionFails: true });
  await assert.rejects(
    service.completeEmbeddedSignup("tenant-a", INPUT, {
      prisma: ctx.db, meta: ctx.meta, encryptCredential: () => "encrypted",
    }),
    { code: "WHATSAPP_META_SUBSCRIPTION_FAILED" },
  );
  assert.equal(ctx.writes.at(-1).row.isActive, false);
  assert.equal(ctx.writes.at(-1).row.accessToken, null);
});

test("restores an existing connection when reconnect provider setup fails", async () => {
  const existing = {
    id: "account-existing",
    tenantId: "tenant-a",
    phoneNumber: "250700000000",
    businessName: "Existing Store",
    phoneNumberId: "777",
    wabaId: "888",
    accessToken: "existing-encrypted-token",
    isActive: true,
    createdAt: new Date(),
  };
  const ctx = setup({ existing, subscriptionFails: true });
  await assert.rejects(
    service.completeEmbeddedSignup("tenant-a", INPUT, {
      prisma: ctx.db, meta: ctx.meta, encryptCredential: () => "replacement-encrypted-token",
    }),
    { code: "WHATSAPP_META_SUBSCRIPTION_FAILED" },
  );
  assert.equal(ctx.writes.at(-1).row.phoneNumberId, "777");
  assert.equal(ctx.writes.at(-1).row.accessToken, "existing-encrypted-token");
  assert.equal(ctx.writes.at(-1).row.isActive, true);
});

test("rejects browser session IDs that disagree with Meta-resolved assets", async () => {
  const ctx = setup();
  await assert.rejects(
    service.completeEmbeddedSignup("tenant-a", { ...INPUT, sessionInfo: { wabaId: "999", phoneNumberId: "222" } }, {
      prisma: ctx.db, meta: ctx.meta, encryptCredential: () => "encrypted",
    }),
    { code: "WHATSAPP_META_WABA_MISMATCH" },
  );
  assert.equal(ctx.writes.length, 0);
});
