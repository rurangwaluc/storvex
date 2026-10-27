"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../web/src/legacy-pages/Billing/flutterwaveInlinePaymentFlow.js"
  ),
  "utf8"
);

const context = {
  module: { exports: {} },
  Promise,
  Error,
};

vm.runInNewContext(
  source.replace(
    "export async function runFlutterwaveInlinePaymentFlow",
    "async function runFlutterwaveInlinePaymentFlow"
  ) +
  "\nmodule.exports = { runFlutterwaveInlinePaymentFlow };",
  context
);

const { runFlutterwaveInlinePaymentFlow } =
  context.module.exports;

function fixture({
  verifiedStatus = "SUCCESS",
  rejectVerification = false,
} = {}) {
  const reference = "RENEW_TEST_12345678";
  const events = [];
  const calls = [];
  let popupHandlers = null;

  const services = {
    selection: {
      planKey: "LAUNCH_GROWTH",
      durationMonths: 3,
      expectedTotal: 71250,
      expectedCurrency: "RWF",
    },
    reservePayment: async () => {
      calls.push("reserve");
      return {
        paymentReference: reference,
        paymentStatus: "PENDING",
      };
    },
    loadCheckout: async () => {
      calls.push("load");
      return () => {};
    },
    openPopup: handlers => {
      calls.push("open");
      popupHandlers = handlers;
      return { reference };
    },
    verifyPayment: async ref => {
      assert.equal(ref, reference);
      calls.push("verify");
      if (rejectVerification) {
        throw new Error("Provider verification unavailable");
      }
    },
    fetchStatus: async ref => {
      assert.equal(ref, reference);
      calls.push("status");
      return {
        payment: { status: verifiedStatus },
      };
    },
    onStatus: event => {
      events.push({
        status: event.status,
        reference: event.reference,
      });
    },
  };

  return {
    services,
    events,
    calls,
    reference,
    get handlers() {
      return popupHandlers;
    },
  };
}

test("reserves payment before opening Inline", async () => {
  const f = fixture();

  const result = await runFlutterwaveInlinePaymentFlow(
    f.services
  );

  assert.equal(result.reference, f.reference);
  assert.deepEqual(f.calls, ["reserve", "load", "open"]);
  assert.deepEqual(
    f.events.map(event => event.status),
    ["OPENING"]
  );
});

test("callback requires server verification and status lookup", async () => {
  const f = fixture();

  await runFlutterwaveInlinePaymentFlow(f.services);

  await f.handlers.onPaymentNotification(f.reference);

  assert.deepEqual(
    f.calls,
    ["reserve", "load", "open", "verify", "status"]
  );

  assert.deepEqual(
    f.events.map(event => event.status),
    ["OPENING", "VERIFYING", "SUCCESS"]
  );
});

test("forged reference cannot start verification", async () => {
  const f = fixture();

  await runFlutterwaveInlinePaymentFlow(f.services);

  await f.handlers.onPaymentNotification("FORGED_REFERENCE");

  assert.deepEqual(f.calls, ["reserve", "load", "open"]);
  assert.deepEqual(
    f.events.map(event => event.status),
    ["OPENING"]
  );
});

test("duplicate callbacks verify only once", async () => {
  const f = fixture();

  await runFlutterwaveInlinePaymentFlow(f.services);

  await Promise.all([
    f.handlers.onPaymentNotification(f.reference),
    f.handlers.onPaymentNotification(f.reference),
  ]);

  assert.equal(
    f.calls.filter(call => call === "verify").length,
    1
  );
});

test("pending status is never represented as success", async () => {
  const f = fixture({ verifiedStatus: "PENDING" });

  await runFlutterwaveInlinePaymentFlow(f.services);

  await f.handlers.onPaymentNotification(f.reference);

  assert.equal(f.events.at(-1).status, "PENDING");
});

test("failed server status is reported as failed", async () => {
  const f = fixture({ verifiedStatus: "FAILED" });

  await runFlutterwaveInlinePaymentFlow(f.services);

  await f.handlers.onPaymentNotification(f.reference);

  assert.equal(f.events.at(-1).status, "FAILED");
});

test("verification error cannot create false success", async () => {
  const f = fixture({
    verifiedStatus: "PENDING",
    rejectVerification: true,
  });

  await runFlutterwaveInlinePaymentFlow(f.services);

  await f.handlers.onPaymentNotification(f.reference);

  assert.equal(f.events.at(-1).status, "PENDING");
});

test("closing an unfinished popup never reports success", async () => {
  const f = fixture();

  await runFlutterwaveInlinePaymentFlow(f.services);

  f.handlers.onClose({
    reference: f.reference,
    incomplete: true,
  });

  assert.deepEqual(
    f.events.map(event => event.status),
    ["OPENING", "PENDING"]
  );

  assert.ok(!f.calls.includes("verify"));
});

test("closing during verification cannot replace its result", async () => {
  const f = fixture();

  await runFlutterwaveInlinePaymentFlow(f.services);

  const verification =
    f.handlers.onPaymentNotification(f.reference);

  f.handlers.onClose({
    reference: f.reference,
    incomplete: false,
  });

  await verification;

  assert.equal(f.events.at(-1).status, "SUCCESS");
});

test("invalid payment reference stops before loading provider", async () => {
  const f = fixture();

  f.services.reservePayment = async () => ({
    paymentReference: "INVALID",
  });

  await assert.rejects(
    runFlutterwaveInlinePaymentFlow(f.services)
  );

  assert.deepEqual(f.calls, []);
});

test("payment confirmation never uses browser callback fields", () => {
  assert.doesNotMatch(source, /transaction_id/);
  assert.doesNotMatch(source, /window\.location/);
  assert.doesNotMatch(source, /window\.open/);
});


test("closing an unfinished popup signals completion once", async () => {
  const f = fixture();
  const finishes = [];

  await runFlutterwaveInlinePaymentFlow({
    ...f.services,
    onFinished: reference => finishes.push(reference),
  });

  f.handlers.onClose({ reference: f.reference, incomplete: true });
  f.handlers.onClose({ reference: f.reference, incomplete: true });

  assert.deepEqual(finishes, [f.reference]);
  assert.equal(f.events.at(-1).status, "PENDING");
});

test("verification signals completion once despite close races", async () => {
  const f = fixture();
  const finishes = [];

  await runFlutterwaveInlinePaymentFlow({
    ...f.services,
    onFinished: reference => finishes.push(reference),
  });

  const verification =
    f.handlers.onPaymentNotification(f.reference);

  f.handlers.onClose({
    reference: f.reference,
    incomplete: false,
  });

  await verification;

  assert.deepEqual(finishes, [f.reference]);
  assert.equal(f.events.at(-1).status, "SUCCESS");
});

test("duplicate notifications never release lifecycle twice", async () => {
  const f = fixture({ verifiedStatus: "PENDING" });
  const finishes = [];

  await runFlutterwaveInlinePaymentFlow({
    ...f.services,
    onFinished: reference => finishes.push(reference),
  });

  await Promise.all([
    f.handlers.onPaymentNotification(f.reference),
    f.handlers.onPaymentNotification(f.reference),
  ]);

  assert.deepEqual(finishes, [f.reference]);
  assert.equal(f.events.at(-1).status, "PENDING");
});


// STEP 342CN-DT1 / CLOSED POPUP CALLBACK REGRESSIONS

test("late callback after closure cannot restart verification", async () => {
  const f = fixture();
  const finishes = [];

  await runFlutterwaveInlinePaymentFlow({
    ...f.services,
    onFinished: reference => finishes.push(reference),
  });

  f.handlers.onClose({
    reference: f.reference,
    incomplete: true,
  });

  await f.handlers.onPaymentNotification(f.reference);

  assert.deepEqual(
    f.calls,
    ["reserve", "load", "open"]
  );

  assert.deepEqual(
    f.events.map(event => event.status),
    ["OPENING", "PENDING"]
  );

  assert.deepEqual(finishes, [f.reference]);
});

test("synchronous close during popup opening finishes once", async () => {
  const f = fixture();
  const finishes = [];

  // The fixture exposes handlers through a read-only getter.
  // Invoke the supplied close callback directly without assigning
  // to that getter.
  f.services.openPopup = handlers => {
    handlers.onClose({
      reference: f.reference,
      incomplete: true,
    });

    return { reference: f.reference };
  };

  const result = await runFlutterwaveInlinePaymentFlow({
    ...f.services,
    onFinished: reference => finishes.push(reference),
  });

  assert.equal(result.reference, f.reference);
  assert.deepEqual(finishes, [f.reference]);

  assert.deepEqual(
    f.events.map(event => event.status),
    ["OPENING", "PENDING"]
  );
});

test("verification started before closure still completes", async () => {
  const f = fixture({ verifiedStatus: "SUCCESS" });
  const finishes = [];

  await runFlutterwaveInlinePaymentFlow({
    ...f.services,
    onFinished: reference => finishes.push(reference),
  });

  const verification =
    f.handlers.onPaymentNotification(f.reference);

  f.handlers.onClose({
    reference: f.reference,
    incomplete: false,
  });

  await verification;

  assert.equal(f.events.at(-1).status, "SUCCESS");
  assert.deepEqual(finishes, [f.reference]);

  assert.equal(
    f.calls.filter(call => call === "verify").length,
    1
  );
});
