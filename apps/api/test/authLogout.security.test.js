"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  afterEach,
  test,
} = require("node:test");

const prisma = require(
  "../src/config/database",
);

const {
  logout,
} = require(
  "../src/modules/auth/logout.controller",
);

const originalTransaction =
  prisma.$transaction;

afterEach(() => {
  prisma.$transaction =
    originalTransaction;
});

function response() {
  return {
    statusCode: undefined,
    body: undefined,

    status(value) {
      this.statusCode = value;
      return this;
    },

    json(value) {
      this.body = value;
      return this;
    },
  };
}

function authenticatedRequest() {
  return {
    user: {
      userId: "user-1",
      tenantId: "tenant-1",
      sessionId: "session-1",
      email: "owner@example.com",
      role: "OWNER",
    },

    headers: {
      "user-agent":
        "Storvex logout security test",
    },

    socket: {
      remoteAddress:
        "192.0.2.50",
    },

    ip: "192.0.2.50",
  };
}

test(
  "logout revokes exactly the authenticated current session",
  async () => {
    let updateArgs = null;
    let eventArgs = null;

    prisma.$transaction =
      async (callback) =>
        callback({
          userSession: {
            updateMany:
              async (args) => {
                updateArgs = args;

                return {
                  count: 1,
                };
              },
          },

          loginEvent: {
            create:
              async (args) => {
                eventArgs = args;

                return {
                  id: "event-1",
                };
              },
          },
        });

    const res = response();

    await logout(
      authenticatedRequest(),
      res,
    );

    assert.equal(
      res.statusCode,
      undefined,
    );

    assert.deepEqual(
      res.body,
      {
        ok: true,
        message: "Signed out",
      },
    );

    assert.deepEqual(
      updateArgs.where,
      {
        id: "session-1",
        tenantId: "tenant-1",
        userId: "user-1",
        isRevoked: false,
      },
    );

    assert.equal(
      updateArgs.data.isRevoked,
      true,
    );

    assert.ok(
      updateArgs.data.revokedAt
      instanceof Date,
    );

    assert.equal(
      eventArgs.data.tenantId,
      "tenant-1",
    );

    assert.equal(
      eventArgs.data.userId,
      "user-1",
    );

    assert.equal(
      eventArgs.data.status,
      "SIGNED_OUT",
    );

    assert.equal(
      eventArgs.data.method,
      "LOGOUT",
    );
  },
);

test(
  "logout is idempotent when the session was already revoked concurrently",
  async () => {
    let events = 0;

    prisma.$transaction =
      async (callback) =>
        callback({
          userSession: {
            updateMany:
              async () => ({
                count: 0,
              }),
          },

          loginEvent: {
            create:
              async () => {
                events += 1;
              },
          },
        });

    const res = response();

    await logout(
      authenticatedRequest(),
      res,
    );

    assert.deepEqual(
      res.body,
      {
        ok: true,
        message: "Signed out",
      },
    );

    assert.equal(
      events,
      0,
    );
  },
);

test(
  "logout refuses requests without an authenticated server session",
  async () => {
    let transactionCalled = false;

    prisma.$transaction =
      async () => {
        transactionCalled = true;
      };

    const req =
      authenticatedRequest();

    delete req.user.sessionId;

    const res = response();

    await logout(req, res);

    assert.equal(
      res.statusCode,
      401,
    );

    assert.equal(
      res.body.code,
      "AUTH_SESSION_REQUIRED",
    );

    assert.equal(
      transactionCalled,
      false,
    );
  },
);

test(
  "logout route is protected by tenant authenticate middleware",
  () => {
    const routePath =
      path.join(
        __dirname,
        "../src/modules/auth/auth.routes.js",
      );

    const source =
      fs.readFileSync(
        routePath,
        "utf8",
      );

    assert.match(
      source,
      /router\.post\(\s*["']\/logout["']\s*,\s*authenticate\s*,\s*logoutController\.logout\s*,?\s*\)/s,
    );
  },
);
