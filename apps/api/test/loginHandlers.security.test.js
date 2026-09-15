process.env.JWT_SECRET ||= "test-login-security-secret";

const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");

const bcrypt = require("bcryptjs");
const prisma = require("../src/config/database");
const {
  loginProtection,
} = require("../src/lib/security/loginProtection");
const { login } = require("../src/modules/auth/auth.controller");
const { platformLogin } = require("../src/modules/platform/platform.auth.controller");
const { loginCustomer } = require("../src/modules/marketplace/marketplace.customer.auth");

const originals = {
  begin: loginProtection.begin,
  failed: loginProtection.failed,
  succeeded: loginProtection.succeeded,
  cancelled: loginProtection.cancelled,
  compare: bcrypt.compare,
  userFindUnique: prisma.user.findUnique,
  userSessionCreate: prisma.userSession.create,
  loginEventCreate: prisma.loginEvent.create,
  platformFindUnique: prisma.platformUser.findUnique,
  platformUpdate: prisma.platformUser.update,
  customerFindUnique: prisma.marketplaceCustomer.findUnique,
  customerUpdate: prisma.marketplaceCustomer.update,
  customerSessionCreate: prisma.marketplaceCustomerSession.create,
};

afterEach(() => {
  loginProtection.begin = originals.begin;
  loginProtection.failed = originals.failed;
  loginProtection.succeeded = originals.succeeded;
  loginProtection.cancelled = originals.cancelled;
  bcrypt.compare = originals.compare;
  prisma.user.findUnique = originals.userFindUnique;
  prisma.userSession.create = originals.userSessionCreate;
  prisma.loginEvent.create = originals.loginEventCreate;
  prisma.platformUser.findUnique = originals.platformFindUnique;
  prisma.platformUser.update = originals.platformUpdate;
  prisma.marketplaceCustomer.findUnique = originals.customerFindUnique;
  prisma.marketplaceCustomer.update = originals.customerUpdate;
  prisma.marketplaceCustomerSession.create = originals.customerSessionCreate;
});

function request(body = {}) {
  return {
    body,
    headers: { "user-agent": "security-test" },
    socket: { remoteAddress: "192.0.2.50" },
    ip: "192.0.2.50",
  };
}

function response() {
  return {
    headers: {},
    set(name, value) { this.headers[name] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

function installProtectionDouble(calls) {
  loginProtection.begin = async (context) => {
    calls.push(["begin", context]);
    return { ...context, accountIp: `reserved:${context.namespace}`, accountReserved: true };
  };
  loginProtection.failed = async (reservation) => calls.push(["failed", reservation]);
  loginProtection.succeeded = async (reservation) => calls.push(["succeeded", reservation]);
  loginProtection.cancelled = async (reservation) => calls.push(["cancelled", reservation]);
}

test("tenant nonexistent, wrong-password, and inactive accounts are publicly indistinguishable", async () => {
  const calls = [];
  installProtectionDouble(calls);
  prisma.loginEvent.create = async () => ({});

  prisma.user.findUnique = async () => null;
  const missing = response();
  await login(request({ email: "owner@example.com", password: "bad" }), missing);

  prisma.user.findUnique = async () => ({
    id: "user-1", tenantId: "tenant-1", role: "OWNER", name: "Owner",
    email: "owner@example.com", phone: null, password: "hash", isActive: true,
  });
  bcrypt.compare = async () => false;
  const wrong = response();
  await login(request({ email: "owner@example.com", password: "bad" }), wrong);

  prisma.user.findUnique = async () => ({
    id: "user-1", tenantId: "tenant-1", role: "OWNER", name: "Owner",
    email: "owner@example.com", phone: null, password: "hash", isActive: false,
  });
  const inactive = response();
  await login(request({ email: "owner@example.com", password: "bad" }), inactive);

  assert.deepEqual(
    [missing, wrong, inactive].map((item) => [item.statusCode, item.body]),
    Array(3).fill([401, { message: "Invalid credentials" }]),
  );
  assert.equal(calls.filter(([name]) => name === "failed").length, 3);
});

test("successful tenant authentication clears its reservation", async () => {
  const calls = [];
  installProtectionDouble(calls);
  prisma.user.findUnique = async () => ({
    id: "user-1", tenantId: "tenant-1", role: "OWNER", name: "Owner",
    email: "owner@example.com", phone: null, password: "hash", isActive: true,
  });
  prisma.userSession.create = async () => ({});
  prisma.loginEvent.create = async () => ({});
  bcrypt.compare = async () => true;

  const res = response();
  await login(request({ email: "owner@example.com", password: "correct" }), res);

  assert.equal(res.statusCode, undefined);
  assert.ok(res.body.token);
  assert.equal(calls.filter(([name]) => name === "succeeded").length, 1);
  assert.equal(calls.filter(([name]) => name === "failed").length, 0);
});

test("security-layer failure prevents tenant authentication with controlled 503", async () => {
  let queried = false;
  loginProtection.begin = async () => {
    const error = new Error("Login protection is temporarily unavailable. Please try again later.");
    error.code = "LOGIN_PROTECTION_UNAVAILABLE";
    error.status = 503;
    throw error;
  };
  prisma.user.findUnique = async () => { queried = true; return null; };
  const res = response();
  await login(request({ email: "owner@example.com", password: "bad" }), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, "LOGIN_PROTECTION_UNAVAILABLE");
  assert.equal(queried, false);
});

test("tenant, platform, and marketplace login handlers use isolated namespaces", async () => {
  const calls = [];
  installProtectionDouble(calls);
  prisma.user.findUnique = async () => null;
  prisma.platformUser.findUnique = async () => null;
  prisma.marketplaceCustomer.findUnique = async () => null;

  await login(request({ email: "same@example.com", password: "bad" }), response());
  await platformLogin(request({ email: "same@example.com", password: "bad" }), response());
  await loginCustomer(request({ email: "same@example.com", password: "bad" }), response());

  assert.deepEqual(
    calls.filter(([name]) => name === "begin").map(([, context]) => context.namespace),
    ["tenant", "platform", "marketplace-customer"],
  );
});

test("platform and marketplace disabled accounts use generic credential failures", async () => {
  const calls = [];
  installProtectionDouble(calls);
  prisma.platformUser.findUnique = async () => ({
    id: "platform-1", email: "admin@example.com", passwordHash: "hash", isActive: false,
  });
  prisma.marketplaceCustomer.findUnique = async () => ({
    id: "customer-1", email: "buyer@example.com", passwordHash: "hash", status: "DISABLED",
  });

  const platformResponse = response();
  await platformLogin(request({ email: "admin@example.com", password: "bad" }), platformResponse);
  const customerResponse = response();
  await loginCustomer(request({ email: "buyer@example.com", password: "bad" }), customerResponse);

  assert.deepEqual(
    [platformResponse.statusCode, platformResponse.body],
    [401, { message: "Invalid platform login details", code: "PLATFORM_INVALID_CREDENTIALS" }],
  );
  assert.deepEqual(
    [customerResponse.statusCode, customerResponse.body],
    [401, {
      message: "The email or password is incorrect.",
      code: "MARKETPLACE_CUSTOMER_CREDENTIALS_INVALID",
    }],
  );
});
