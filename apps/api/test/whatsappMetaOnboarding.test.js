"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const meta = require("../src/modules/whatsapp/whatsapp.meta.onboarding");

test("resolves WABA and phone identity from authenticated Graph responses", async () => {
  const requests = [];
  const http = {
    async get(url, config) {
      requests.push({ url, config });
      if (url.endsWith("/111")) {
        return { data: { id: "111", name: "Store WABA", phone_numbers: { data: [{ id: "222" }] } } };
      }
      return { data: { id: "222", display_phone_number: "+250 788 123 456", verified_name: "Store" } };
    },
  };
  const result = await meta.resolveAuthorizedAssets({
    accessToken: "provider-token", wabaHint: "111", phoneHint: "222", http,
  });
  assert.deepEqual(result, {
    wabaId: "111", wabaName: "Store WABA", phoneNumberId: "222",
    phoneNumber: "250788123456", businessName: "Store",
  });
  assert.equal(requests.every((request) => request.config.headers.Authorization === "Bearer provider-token"), true);
});

test("rejects a phone hint not present in the authorized WABA", async () => {
  const http = {
    get: async () => ({ data: { id: "111", phone_numbers: { data: [{ id: "444" }] } } }),
  };
  await assert.rejects(
    meta.resolveAuthorizedAssets({ accessToken: "provider-token", wabaHint: "111", phoneHint: "222", http }),
    { code: "WHATSAPP_META_PHONE_NOT_FOUND" },
  );
});

test("normalizes exchange failures without leaking provider response data", async () => {
  const previous = {
    appId: process.env.WHATSAPP_META_APP_ID,
    secret: process.env.WHATSAPP_APP_SECRET,
    redirect: process.env.WHATSAPP_META_REDIRECT_URI,
  };
  process.env.WHATSAPP_META_APP_ID = "123";
  process.env.WHATSAPP_APP_SECRET = "test-secret";
  process.env.WHATSAPP_META_REDIRECT_URI = "https://example.test/app/whatsapp";
  try {
    await assert.rejects(
      meta.exchangeCode("short-code", {
        get: async () => { throw { response: { status: 400, data: { access_token: "must-not-escape" } } }; },
      }),
      (error) => {
        assert.equal(error.code, "WHATSAPP_META_EXCHANGE_FAILED");
        assert.equal(JSON.stringify(error).includes("must-not-escape"), false);
        return true;
      },
    );
  } finally {
    if (previous.appId === undefined) delete process.env.WHATSAPP_META_APP_ID;
    else process.env.WHATSAPP_META_APP_ID = previous.appId;
    if (previous.secret === undefined) delete process.env.WHATSAPP_APP_SECRET;
    else process.env.WHATSAPP_APP_SECRET = previous.secret;
    if (previous.redirect === undefined) delete process.env.WHATSAPP_META_REDIRECT_URI;
    else process.env.WHATSAPP_META_REDIRECT_URI = previous.redirect;
  }
});

test("registers the phone and subscribes the WABA using official endpoints", async () => {
  const previousPin = process.env.WHATSAPP_REGISTRATION_PIN;
  process.env.WHATSAPP_REGISTRATION_PIN = "123456";
  const posts = [];
  const http = { post: async (...args) => { posts.push(args); return { data: { success: true } }; } };
  try {
    await meta.registerPhone({ accessToken: "token", phoneNumberId: "222", http });
    await meta.subscribeWaba({ accessToken: "token", wabaId: "111", http });
  } finally {
    if (previousPin === undefined) delete process.env.WHATSAPP_REGISTRATION_PIN;
    else process.env.WHATSAPP_REGISTRATION_PIN = previousPin;
  }
  assert.equal(posts[0][0].endsWith("/222/register"), true);
  assert.deepEqual(posts[0][1], { messaging_product: "whatsapp", pin: "123456" });
  assert.equal(posts[1][0].endsWith("/111/subscribed_apps"), true);
});
