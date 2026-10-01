"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const meta = require("../src/modules/whatsapp/whatsapp.meta.onboarding");

test("resolves WABA and phone identity from Meta-authorized assets", async () => {
  const previousSystemToken = process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
  process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = "system-user-token";
  const requests = [];

  const http = {
    async get(url, config) {
      requests.push({ url, config });

      if (url.endsWith("/debug_token")) {
        return {
          data: {
            data: {
              is_valid: true,
              granular_scopes: [{
                scope: "whatsapp_business_management",
                target_ids: ["111"],
              }],
            },
          },
        };
      }

      if (url.endsWith("/111")) {
        return {
          data: {
            id: "111",
            name: "Store WABA",
          },
        };
      }

      if (url.endsWith("/111/phone_numbers")) {
        return {
          data: {
            data: [{
              id: "222",
              display_phone_number: "+250 788 123 456",
              verified_name: "Store",
            }],
          },
        };
      }

      if (url.endsWith("/222")) {
        return {
          data: {
            id: "222",
            display_phone_number: "+250 788 123 456",
            verified_name: "Store",
            status: "CONNECTED",
          },
        };
      }

      throw new Error(`Unexpected Graph request: ${url}`);
    },
  };

  try {
    const result = await meta.resolveAuthorizedAssets({
      accessToken: "provider-token",
      wabaHint: "111",
      phoneHint: "222",
      http,
    });

    assert.deepEqual(result, {
      wabaId: "111",
      wabaName: "Store WABA",
      phoneNumberId: "222",
      phoneNumber: "250788123456",
      businessName: "Store",
    });

    assert.equal(
      requests[0].config.headers.Authorization,
      "Bearer system-user-token",
    );
    assert.equal(requests[0].config.params.input_token, "provider-token");
    assert.equal(
      requests.slice(1).every(
        (request) =>
          request.config.headers.Authorization === "Bearer provider-token",
      ),
      true,
    );
  } finally {
    if (previousSystemToken === undefined) {
      delete process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
    } else {
      process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = previousSystemToken;
    }
  }
});

test("rejects a phone hint not present in the authorized WABA", async () => {
  const previousSystemToken = process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
  process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = "system-user-token";

  const http = {
    async get(url) {
      if (url.endsWith("/debug_token")) {
        return {
          data: {
            data: {
              is_valid: true,
              granular_scopes: [{
                scope: "whatsapp_business_management",
                target_ids: ["111"],
              }],
            },
          },
        };
      }

      if (url.endsWith("/111")) {
        return {
          data: {
            id: "111",
            name: "Store WABA",
          },
        };
      }

      if (url.endsWith("/111/phone_numbers")) {
        return {
          data: {
            data: [{
              id: "444",
              display_phone_number: "+250 788 000 444",
              verified_name: "Other Store",
            }],
          },
        };
      }

      throw new Error(`Unexpected Graph request: ${url}`);
    },
  };

  try {
    await assert.rejects(
      meta.resolveAuthorizedAssets({
        accessToken: "provider-token",
        wabaHint: "111",
        phoneHint: "222",
        http,
      }),
      { code: "WHATSAPP_META_PHONE_NOT_FOUND" },
    );
  } finally {
    if (previousSystemToken === undefined) {
      delete process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
    } else {
      process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = previousSystemToken;
    }
  }
});

const VALID_EMBEDDED_SIGNUP_REDIRECT = "https://staticxx.facebook.com/x/connect/xd_arbiter/?version=46#cb=test-callback&domain=www.storvex.rw&is_canvas=false&origin=https%3A%2F%2Fwww.storvex.rw%2Ftest-origin&relation=opener&frame=test-frame";

test("exchanges Embedded Signup code with the exact validated SDK redirect URI", async () => {
  const previous = {
    appId: process.env.WHATSAPP_META_APP_ID,
    secret: process.env.WHATSAPP_APP_SECRET,
  };

  process.env.WHATSAPP_META_APP_ID = "123";
  process.env.WHATSAPP_APP_SECRET = "test-secret";

  let request;
  try {
    const token = await meta.exchangeCode(
      "short-code",
      VALID_EMBEDDED_SIGNUP_REDIRECT,
      {
        async get(url, config) {
          request = { url, config };
          return { data: { access_token: "provider-token" } };
        },
      },
    );

    assert.equal(token, "provider-token");
    assert.equal(request.config.params.client_id, "123");
    assert.equal(request.config.params.client_secret, "test-secret");
    assert.equal(request.config.params.code, "short-code");
    assert.equal(
      request.config.params.redirect_uri,
      VALID_EMBEDDED_SIGNUP_REDIRECT,
      "the SDK redirect URI must be forwarded without reconstruction",
    );
  } finally {
    if (previous.appId === undefined) delete process.env.WHATSAPP_META_APP_ID;
    else process.env.WHATSAPP_META_APP_ID = previous.appId;

    if (previous.secret === undefined) delete process.env.WHATSAPP_APP_SECRET;
    else process.env.WHATSAPP_APP_SECRET = previous.secret;
  }
});

test("validates the Facebook SDK XD Arbiter redirect boundary", () => {
  const validate = meta.__private.validateEmbeddedSignupRedirectUri;

  assert.equal(
    validate(VALID_EMBEDDED_SIGNUP_REDIRECT),
    VALID_EMBEDDED_SIGNUP_REDIRECT,
  );

  const invalidRedirects = [
    "",
    "not-a-url",
    "http://staticxx.facebook.com/x/connect/xd_arbiter/#domain=www.storvex.rw&origin=https%3A%2F%2Fwww.storvex.rw%2Fx",
    "https://evil.example/x/connect/xd_arbiter/#domain=www.storvex.rw&origin=https%3A%2F%2Fwww.storvex.rw%2Fx",
    "https://staticxx.facebook.com/not-xd-arbiter/#domain=www.storvex.rw&origin=https%3A%2F%2Fwww.storvex.rw%2Fx",
    "https://staticxx.facebook.com/x/connect/xd_arbiter/#domain=evil.example&origin=https%3A%2F%2Fwww.storvex.rw%2Fx",
    "https://staticxx.facebook.com/x/connect/xd_arbiter/#domain=www.storvex.rw&origin=https%3A%2F%2Fevil.example%2Fx",
  ];

  for (const redirectUri of invalidRedirects) {
    assert.throws(
      () => validate(redirectUri),
      { code: "WHATSAPP_META_REDIRECT_URI_INVALID" },
      redirectUri,
    );
  }
});

test("normalizes exchange failures without leaking provider response data", async () => {
  const previous = {
    appId: process.env.WHATSAPP_META_APP_ID,
    secret: process.env.WHATSAPP_APP_SECRET,
  };
  process.env.WHATSAPP_META_APP_ID = "123";
  process.env.WHATSAPP_APP_SECRET = "test-secret";

  try {
    await assert.rejects(
      meta.exchangeCode(
        "short-code",
        VALID_EMBEDDED_SIGNUP_REDIRECT,
        {
          get: async () => {
            throw {
              response: {
                status: 400,
                data: { access_token: "must-not-escape" },
              },
            };
          },
        },
      ),
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
  }
});

test("discovers one authorized WABA and one phone without browser hints", async () => {
  const previousSystemToken = process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
  process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = "system-user-token";

  const requests = [];
  const http = {
    async get(url, options = {}) {
      requests.push({
        url,
        fields: options?.params?.fields || null,
      });

      if (url.endsWith("/debug_token")) {
        return {
          data: {
            data: {
              is_valid: true,
              granular_scopes: [{
                scope: "whatsapp_business_management",
                target_ids: ["111"],
              }],
            },
          },
        };
      }

      if (url.endsWith("/111")) {
        return {
          data: {
            id: "111",
            name: "Store WABA",
          },
        };
      }

      if (url.endsWith("/111/phone_numbers")) {
        return {
          data: {
            data: [{
              id: "222",
              display_phone_number: "+250 788 123 456",
              verified_name: "Store",
            }],
          },
        };
      }

      if (url.endsWith("/222")) {
        return {
          data: {
            id: "222",
            display_phone_number: "+250 788 123 456",
            verified_name: "Store",
            status: "CONNECTED",
          },
        };
      }

      throw new Error(`Unexpected Graph request: ${url}`);
    },
  };

  try {
    const result = await meta.resolveAuthorizedAssets({
      accessToken: "provider-token",
      http,
    });

    assert.equal(result.wabaId, "111");
    assert.equal(result.phoneNumberId, "222");

    assert.deepEqual(
      requests.map((request) => ({
        path: new URL(request.url).pathname,
        fields: request.fields,
      })),
      [
        {
          path: "/v24.0/debug_token",
          fields: null,
        },
        {
          path: "/v24.0/111",
          fields: "id,name",
        },
        {
          path: "/v24.0/111/phone_numbers",
          fields: "id,display_phone_number,verified_name",
        },
        {
          path: "/v24.0/222",
          fields: "id,display_phone_number,verified_name,status",
        },
      ],
    );
  } finally {
    if (previousSystemToken === undefined) {
      delete process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
    } else {
      process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = previousSystemToken;
    }
  }
});

test("rejects a browser WABA hint outside the token-authorized assets", async () => {
  const previousSystemToken = process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
  process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = "system-user-token";

  try {
    await assert.rejects(
      meta.resolveAuthorizedAssets({
        accessToken: "provider-token",
        wabaHint: "999",
        http: {
          async get(url) {
            if (!url.endsWith("/debug_token")) {
              throw new Error("Unexpected Graph request");
            }
            return {
              data: {
                data: {
                  is_valid: true,
                  granular_scopes: [{
                    scope: "whatsapp_business_management",
                    target_ids: ["111"],
                  }],
                },
              },
            };
          },
        },
      }),
      { code: "WHATSAPP_META_WABA_MISMATCH" },
    );
  } finally {
    if (previousSystemToken === undefined) {
      delete process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
    } else {
      process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = previousSystemToken;
    }
  }
});

test("fails closed when no authorized WABA is returned", async () => {
  const previousSystemToken = process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
  process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = "system-user-token";

  try {
    await assert.rejects(
      meta.resolveAuthorizedAssets({
        accessToken: "provider-token",
        http: {
          get: async () => ({
            data: {
              data: {
                is_valid: true,
                granular_scopes: [],
              },
            },
          }),
        },
      }),
      { code: "WHATSAPP_META_WABA_NOT_FOUND" },
    );
  } finally {
    if (previousSystemToken === undefined) {
      delete process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
    } else {
      process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = previousSystemToken;
    }
  }
});

test("fails closed when several authorized WABAs exist without a browser hint", async () => {
  const previousSystemToken = process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
  process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = "system-user-token";

  try {
    await assert.rejects(
      meta.resolveAuthorizedAssets({
        accessToken: "provider-token",
        http: {
          get: async () => ({
            data: {
              data: {
                is_valid: true,
                granular_scopes: [{
                  scope: "whatsapp_business_management",
                  target_ids: ["111", "333"],
                }],
              },
            },
          }),
        },
      }),
      { code: "WHATSAPP_META_WABA_AMBIGUOUS" },
    );
  } finally {
    if (previousSystemToken === undefined) {
      delete process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN;
    } else {
      process.env.WHATSAPP_SYSTEM_USER_ACCESS_TOKEN = previousSystemToken;
    }
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
