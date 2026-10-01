"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("WhatsApp welcome uses the tenant business category instead of listing every business category", () => {
  const source = fs.readFileSync(
    path.join(root, "src/modules/whatsapp/whatsapp.service.js"),
    "utf8",
  );

  assert.match(
    source,
    /select:\s*\{\s*name:\s*true,\s*shopType:\s*true,/,
  );

  assert.match(
    source,
    /buildWelcomeReply\(\{\s*businessName,\s*businessCategory\s*\}\)/,
  );

  assert.doesNotMatch(source, /1️⃣ Electronics/);
  assert.doesNotMatch(source, /2️⃣ Hardware/);
  assert.doesNotMatch(source, /3️⃣ Home & Kitchen/);
  assert.doesNotMatch(source, /4️⃣ Lighting/);
  assert.doesNotMatch(source, /5️⃣ Spare Parts/);
});

test("WhatsApp inbox message API returns provider delivery state", () => {
  const source = fs.readFileSync(
    path.join(root, "src/modules/whatsapp/whatsapp.inbox.service.js"),
    "utf8",
  );

  for (const field of [
    "status: true",
    "deliveredAt: true",
    "readAt: true",
    "failedAt: true",
    "failureReason: true",
  ]) {
    assert.match(source, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
