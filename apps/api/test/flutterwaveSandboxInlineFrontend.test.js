"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const helperPath = path.resolve(
  __dirname,
  "../../web/src/legacy-pages/Billing/flutterwaveSandboxInline.js"
);

const source = fs.readFileSync(helperPath, "utf8");

// Node's test process evaluates the browser-independent module
// without writing or modifying the Next.js application.
async function loadModule() {
  const code = source.replace(
    /\bexport function /g,
    "function "
  );

  const { Script } = require("node:vm");

  const sandbox = {
    Promise,
    Error,
    module: { exports: {} },
    process: { env: { NODE_ENV: "development" } },
  };

  const appended = `
    module.exports = {
      validateSandboxInlineResponse,
      loadFlutterwaveInlineScript,
      openSandboxInlinePopup
    };
  `;

  new Script(code + appended).runInNewContext(sandbox);

  return sandbox.module.exports;
}

function fixture() {
  const reference = "RENEW_TEST_12345678";

  return {
    data: {
      sandbox: true,
      checkoutMethod: "FLUTTERWAVE_SANDBOX_INLINE",
      provider: "FLUTTERWAVE",
      paymentStatus: "PENDING",
      merchantName: "RURAXIS LTD",
      paymentReference: reference,
      durationMonths: 3,
      totalAmount: 71250,
      monthlyAmount: 25000,
      discountPercent: 5,
      currency: "RWF",
      inlineConfig: {
        public_key: "FLWPUBK_TEST-FAKE",
        tx_ref: reference,
        amount: 71250,
        currency: "RWF",
        payment_options: "mobilemoneyrwanda,card",
        customer: {
          email: "owner@example.invalid",
        },
      },
    },
    selection: {
      durationMonths: 3,
      expectedTotal: 71250,
      expectedCurrency: "RWF",
    },
  };
}

test("builds only approved public payment properties", async () => {
  const { validateSandboxInlineResponse } = await loadModule();
  const { data, selection } = fixture();

  data.inlineConfig.serverSecret = "NEVER_EXPOSE_ME";

  const config = validateSandboxInlineResponse(data, selection);

  assert.equal(config.amount, 71250);
  assert.equal(config.tx_ref, data.paymentReference);
  assert.equal(config.currency, "RWF");
  assert.equal(config.public_key, "FLWPUBK_TEST-FAKE");
  assert.ok(!JSON.stringify(config).includes("NEVER_EXPOSE_ME"));
});

test("rejects altered amounts and transaction references", async () => {
  const { validateSandboxInlineResponse } = await loadModule();

  for (const mutation of [
    data => { data.totalAmount = 1; },
    data => { data.inlineConfig.amount = 1; },
    data => { data.inlineConfig.tx_ref = "OTHER_REFERENCE"; },
    data => { data.inlineConfig.public_key = "FLWPUBK_LIVE-FAKE"; },
    data => { data.checkoutMethod = "FLUTTERWAVE_SANDBOX"; },
    data => { data.paymentStatus = "SUCCESS"; },
  ]) {
    const { data, selection } = fixture();
    mutation(data);

    assert.throws(() =>
      validateSandboxInlineResponse(data, selection)
    );
  }
});

test("popup requires development and a checkout function", async () => {
  const { openSandboxInlinePopup } = await loadModule();
  const input = fixture();

  assert.throws(() =>
    openSandboxInlinePopup({
      ...input,
      checkout: () => {},
      development: false,
    })
  );

  assert.throws(() =>
    openSandboxInlinePopup({
      ...input,
      development: true,
    })
  );
});

test("callback never forwards untrusted payment proof", async () => {
  const { openSandboxInlinePopup } = await loadModule();
  const input = fixture();

  let providerConfig;
  let notification;

  openSandboxInlinePopup({
    ...input,
    development: true,
    checkout: config => {
      providerConfig = config;
      return { close() {} };
    },
    onPaymentNotification: reference => {
      notification = reference;
    },
  });

  providerConfig.callback({
    status: "successful",
    amount: 999999,
    tx_ref: "FORGED_REFERENCE",
    transaction_id: 123456,
  });

  assert.equal(notification, input.data.paymentReference);
  assert.equal(providerConfig.redirect_url, undefined);
});

test("closing popup does not claim successful payment", async () => {
  const { openSandboxInlinePopup } = await loadModule();
  const input = fixture();

  let providerConfig;
  let closeInfo;

  openSandboxInlinePopup({
    ...input,
    development: true,
    checkout: config => {
      providerConfig = config;
      return {};
    },
    onClose: info => {
      closeInfo = info;
    },
  });

  providerConfig.onclose(true);

  assert.equal(closeInfo.reference, input.data.paymentReference);
  assert.equal(closeInfo.incomplete, true);
  assert.equal(closeInfo.status, undefined);
});

test("official script source is fixed and no secrets are used", () => {
  assert.match(
    source,
    /https:\/\/checkout\.flutterwave\.com\/v3\.js/
  );
  assert.doesNotMatch(source, /FLWSECK/);
  assert.doesNotMatch(source, /window\.open\(/);
  assert.doesNotMatch(source, /window\.location\.assign/);
});
