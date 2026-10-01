"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  detectIntent,
  INTENTS,
} = require("../src/modules/whatsapp/whatsapp.intent.service");

test("non-commerce short messages are not invented as product searches", () => {
  for (const message of [
    "Latency test 1",
    "Latency test",
    "Testing webhook",
    "Random message",
  ]) {
    const intent = detectIntent(message);

    assert.equal(
      intent.type,
      INTENTS.UNKNOWN,
      `${message} should be UNKNOWN, got ${intent.type}`,
    );
  }
});

test("greetings remain greetings", () => {
  assert.equal(detectIntent("Hello").type, INTENTS.GREETING);
  assert.equal(detectIntent("Hi").type, INTENTS.GREETING);
  assert.equal(detectIntent("Muraho").type, INTENTS.GREETING);
});

test("real product searches remain product searches", () => {
  const samsung = detectIntent("Samsung A16");
  assert.equal(samsung.type, INTENTS.PRODUCT_SEARCH);
  assert.equal(samsung.payload.category, "ELECTRONICS");

  const laptop = detectIntent("Laptop under 500000");
  assert.equal(laptop.type, INTENTS.PRODUCT_SEARCH);
  assert.equal(laptop.payload.category, "ELECTRONICS");
});

test("explicit business categories remain category searches", () => {
  const cases = [
    ["Electronics", "ELECTRONICS"],
    ["Hardware", "HARDWARE"],
    ["Home kitchen", "HOME_KITCHEN"],
    ["Lighting", "LIGHTING"],
    ["Spare parts", "SPARE_PARTS"],
  ];

  for (const [message, category] of cases) {
    const intent = detectIntent(message);

    assert.equal(
      intent.type,
      INTENTS.PRODUCT_SEARCH,
      `${message} should remain a product/category search`,
    );

    assert.equal(intent.payload.category, category);
  }
});
