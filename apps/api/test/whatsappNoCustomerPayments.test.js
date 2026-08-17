"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { detectIntent, INTENTS } = require("../src/modules/whatsapp/whatsapp.intent.service");
const { buildBuyCreatedReply } = require("../src/modules/whatsapp/whatsapp.catalog.service");

test("order preparation sends customers to staff without a PAY instruction", () => {
  const reply = buildBuyCreatedReply({
    businessName: "Demo Store",
    product: { name: "Hammer", sellPrice: 5000 },
    quantity: 2,
    draftId: "draft-ABC123",
  });

  assert.match(reply, /Our staff will review and finalize your order\./);
  assert.doesNotMatch(reply, /\bPAY\b/i);
  assert.doesNotMatch(reply, /record payment/i);
});

test("payment-looking customer messages have no financial intent", () => {
  assert.equal(INTENTS.PAY, undefined);

  for (const message of ["PAY 50000 MOMO ABC123", "I paid 50000"]) {
    const intent = detectIntent(message);
    assert.notEqual(intent.type, "PAY");
    assert.notEqual(intent.modernType, "PAY");
    assert.equal(Object.hasOwn(intent.payload || {}, "amount"), false);
    assert.equal(Object.hasOwn(intent.payload || {}, "reference"), false);
    assert.equal(Object.hasOwn(intent.payload || {}, "method"), false);
  }
});

test("normal BUY and human-help intent behavior remains available", () => {
  const buy = detectIntent("BUY Hammer x2");
  assert.equal(buy.type, INTENTS.ORDER_REQUEST);

  const help = detectIntent("help");
  assert.equal(help.type, INTENTS.HUMAN_HELP);
});

test("WhatsApp inbound service contains no customer payment mutation path", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/modules/whatsapp/whatsapp.service.js"),
    "utf8",
  );

  for (const forbidden of [
    "salePayment.create",
    "WHATSAPP_PAYMENT_RECORDED",
    "WA_PAY:",
    "SALE_FULLY_PAID",
    "handlePayIntent",
    "applyPaymentToSale",
  ]) {
    assert.equal(source.includes(forbidden), false, `${forbidden} must not exist in WhatsApp inbound processing`);
  }
});
