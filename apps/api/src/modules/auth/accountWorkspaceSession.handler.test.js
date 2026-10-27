"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createAccountWorkspaceSessionHandler } = require("./accountWorkspaceSession.handler");
const TOKEN = "a".repeat(64);
function run({ session = true, memberships = 1, active = true, matching = true } = {}) {
  let issued = 0;
  const prisma = {
    storvexBusinessMembership: { findMany: async () => Array.from({ length: memberships }, (_, i) => ({ accountId: "a1", tenantId: `t${i}`, retailUserId: "u1", role: "OWNER" })) },
    user: { findUnique: async () => ({ id: "u1", tenantId: matching ? "t0" : "wrong", role: "OWNER", email: "owner@example.com", isActive: active }) },
    userSession: { create: async ({ data }) => { issued++; return { id: "s1", ...data }; }, updateMany: async () => ({ count: 1 }) },
  };
  const handler = createAccountWorkspaceSessionHandler({
    prisma, accountSessions: { authenticate: async () => session ? { accountId: "a1", email: "owner@example.com", emailVerified: true } : null },
    membershipResolver: async ({accountId, tenantId}) => ({ accountId, tenantId, role: "OWNER" }),
    signAuthToken: async () => "signed-token", getClientIp: () => "127.0.0.1", getUserAgent: () => "test",
  });
  const req = { headers: { cookie: `storvex_account_session=${TOKEN}` }, protocol: "http", get: n => n === "host" ? "localhost:3000" : undefined };
  const res = { statusCode: 200, set() { return this; }, status(n) { this.statusCode=n; return this; }, json(body) { this.body=body; return this; } };
  return handler(req,res).then(() => ({ status:res.statusCode, body:res.body, issued }));
}
test("valid membership establishes workspace session", async () => { const r=await run(); assert.equal(r.status,200); assert.equal(r.issued,1); assert.equal(r.body.user.tenantId,"t0"); });
test("no business returns setup destination without session", async () => { const r=await run({ memberships:0 }); assert.equal(r.status,404); assert.equal(r.issued,0); });
test("multiple businesses cannot silently select one", async () => { const r=await run({ memberships:2 }); assert.equal(r.status,409); assert.equal(r.issued,0); });
test("inactive user cannot enter workspace", async () => { const r=await run({ active:false }); assert.equal(r.status,403); assert.equal(r.issued,0); });
test("retail user must belong to membership tenant", async () => { const r=await run({ matching:false }); assert.equal(r.status,403); assert.equal(r.issued,0); });
test("unauthenticated account cannot enter workspace", async () => { const r=await run({ session:false }); assert.equal(r.status,401); assert.equal(r.issued,0); });
