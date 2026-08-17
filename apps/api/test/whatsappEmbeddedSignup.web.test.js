"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

test("Embedded Signup browser boundary validates Facebook hostnames and payloads", async () => {
  const module = await import("../../web/src/services/metaEmbeddedSignup.js");
  assert.equal(module.isAllowedMetaMessageOrigin("https://www.facebook.com"), true);
  assert.equal(module.isAllowedMetaMessageOrigin("https://business.facebook.com"), true);
  assert.equal(module.isAllowedMetaMessageOrigin("https://evilfacebook.com"), false);
  assert.equal(module.isAllowedMetaMessageOrigin("http://www.facebook.com"), false);

  const parsed = module.parseEmbeddedSignupMessage({
    origin: "https://www.facebook.com",
    data: JSON.stringify({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: { waba_id: "111", phone_number_id: "222", business_id: "333" },
    }),
  });
  assert.deepEqual(parsed, {
    event: "FINISH",
    data: { wabaId: "111", phoneNumberId: "222", businessId: "333", currentStep: null },
  });
  assert.equal(module.parseEmbeddedSignupMessage({ origin: "https://www.facebook.com", data: "{}" }), null);
});

test("launches the official code response contract without optional features", async () => {
  const module = await import("../../web/src/services/metaEmbeddedSignup.js");
  let options;
  const FB = { login(callback, value) { options = value; callback({}); } };
  module.launchEmbeddedSignup(FB, "config-public", () => {});
  assert.deepEqual(options, {
    config_id: "config-public",
    response_type: "code",
    override_default_response_type: true,
    extras: { sessionInfoVersion: "3" },
  });
  assert.equal(JSON.stringify(options).includes("solutionID"), false);
  assert.equal(JSON.stringify(options).includes("featureType"), false);
});
