"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRetailEmailLoginProtectionAdapter,
  NAMESPACE
} = require("../src/modules/auth/retailEmailLoginProtection.adapter");

function setup(overrides = {}) {
  const calls = {
    begin: 0,
    failed: 0,
    succeeded: 0,
    cancelled: 0
  };

  let args = null;

  const loginProtection = {
    async begin(input) {
      calls.begin++;
      args = input;

      return {
        accountReserved: true,
        id: "mock-reservation"
      };
    },

    async failed() {
      calls.failed++;
    },

    async succeeded() {
      calls.succeeded++;
    },

    async cancelled() {
      calls.cancelled++;
    },

    ...overrides
  };

  const adapter =
    createRetailEmailLoginProtectionAdapter({
      loginProtection
    });

  return {
    adapter,
    calls,
    get arguments() {
      return args;
    }
  };
}

async function begin(adapter) {
  return adapter.begin({
    identifier: " MERCHANT@EXAMPLE.TEST ",
    ip: "127.0.0.1"
  });
}

test("uses the existing login-protection namespace", async () => {
  const app = setup();
  const reservation = await begin(app.adapter);

  assert.equal(app.calls.begin, 1);
  assert.equal(app.arguments.namespace, NAMESPACE);
  assert.equal(
    app.arguments.identifier,
    "merchant@example.test"
  );
  assert.equal(app.arguments.ip, "127.0.0.1");
  assert.equal(reservation.state, "open");
});

test("failed verification finalizes as failed", async () => {
  const app = setup();
  const reservation = await begin(app.adapter);

  assert.equal(await reservation.failed(), true);
  assert.equal(reservation.state, "failed");
  assert.equal(app.calls.failed, 1);

  assert.equal(await reservation.failed(), false);
  assert.equal(await reservation.succeeded(), false);
  assert.equal(app.calls.succeeded, 0);
});

test("successful authentication finalizes once", async () => {
  const app = setup();
  const reservation = await begin(app.adapter);

  assert.equal(await reservation.succeeded(), true);
  assert.equal(reservation.state, "succeeded");
  assert.equal(app.calls.succeeded, 1);

  assert.equal(await reservation.cancelled(), false);
  assert.equal(app.calls.cancelled, 0);
});

test("cancelled attempt releases reservation", async () => {
  const app = setup();
  const reservation = await begin(app.adapter);

  assert.equal(await reservation.cancelled(), true);
  assert.equal(reservation.state, "cancelled");
  assert.equal(app.calls.cancelled, 1);
  assert.equal(await reservation.failed(), false);
});

test("begin failures fail closed", async () => {
  const app = setup({
    async begin() {
      throw new Error("Private protection outage");
    }
  });

  await assert.rejects(
    begin(app.adapter),
    /Private protection outage/
  );
});

test("completion failures cannot be retried as success", async () => {
  const app = setup({
    async cancelled() {
      throw new Error("Private Redis failure");
    }
  });

  const reservation = await begin(app.adapter);

  await assert.rejects(
    reservation.cancelled(),
    /Private Redis failure/
  );

  assert.equal(reservation.state, "error");
  assert.equal(await reservation.succeeded(), false);
  assert.equal(app.calls.succeeded, 0);
});

test("concurrent finalizations allow one winner", async () => {
  const app = setup();
  const reservation = await begin(app.adapter);

  const outcomes = await Promise.all([
    reservation.succeeded(),
    reservation.failed(),
    reservation.cancelled()
  ]);

  assert.equal(
    outcomes.filter(Boolean).length,
    1
  );

  assert.equal(
    app.calls.succeeded +
    app.calls.failed +
    app.calls.cancelled,
    1
  );
});

test("email delivery alone never finalizes login", async () => {
  const app = setup();
  const reservation = await begin(app.adapter);

  // No success call is made for email delivery.
  assert.equal(reservation.state, "open");
  assert.equal(app.calls.succeeded, 0);

  await reservation.cancelled();
  assert.equal(app.calls.succeeded, 0);
});

test("requires complete existing security methods", () => {
  assert.throws(
    () => createRetailEmailLoginProtectionAdapter({
      loginProtection: {
        begin: async () => ({})
      }
    }),
    TypeError
  );
});

test("rejects invalid login identifiers", async () => {
  const app = setup();

  await assert.rejects(
    app.adapter.begin({
      identifier: "",
      ip: "127.0.0.1"
    }),
    TypeError
  );

  assert.equal(app.calls.begin, 0);
});
