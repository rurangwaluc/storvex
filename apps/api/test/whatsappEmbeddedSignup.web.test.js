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

async function createAttemptHarness() {
  const { isEmbeddedSignupHandoffReady, stopEmbeddedSignupPopupWatcher } = await import(
    "../../web/src/services/embeddedSignupPopupWatcher.js"
  );
  const timerRef = { current: 42 };
  const popupRef = { current: { closed: false } };
  const clearedTimers = [];
  const completions = [];
  const state = {
    active: true,
    code: "",
    session: null,
    completing: false,
    terminal: null,
  };

  function clearAttempt(terminal) {
    state.active = false;
    state.code = "";
    state.session = null;
    state.completing = false;
    state.terminal = terminal;
    stopEmbeddedSignupPopupWatcher({
      timerRef,
      popupRef,
      clearInterval: (timer) => clearedTimers.push(timer),
    });
  }

  function finishWhenReady() {
    if (!isEmbeddedSignupHandoffReady({
      active: state.active,
      completing: state.completing,
      code: state.code,
      session: state.session,
    })) return;
    state.completing = true;
    completions.push({ code: state.code, sessionInfo: state.session });
  }

  return {
    state,
    timerRef,
    popupRef,
    clearedTimers,
    completions,
    popupClosed() {
      if (state.active && popupRef.current?.closed) clearAttempt("cancelled");
    },
    loginCallback(code) {
      stopEmbeddedSignupPopupWatcher({
        timerRef,
        popupRef,
        clearInterval: (timer) => clearedTimers.push(timer),
      });
      if (!code) return clearAttempt("cancelled");
      state.code = code;
      finishWhenReady();
    },
    sessionEvent(event, data = {}) {
      if (event === "CANCEL") return clearAttempt("cancelled");
      if (event === "ERROR") return clearAttempt("error");
      state.session = data;
      finishWhenReady();
    },
  };
}

test("popup closure before the FB callback remains a genuine cancellation", async () => {
  const attempt = await createAttemptHarness();
  attempt.popupRef.current.closed = true;
  attempt.popupClosed();
  assert.equal(attempt.state.terminal, "cancelled");
  assert.equal(attempt.completions.length, 0);
});

test("code before session stops popup cancellation and completes exactly once", async () => {
  const attempt = await createAttemptHarness();
  attempt.loginCallback("short-code");
  assert.equal(attempt.completions.length, 0, "code alone must not call completion");
  assert.equal(attempt.timerRef.current, null);
  assert.equal(attempt.popupRef.current, null);

  attempt.popupClosed();
  attempt.popupClosed();
  assert.equal(attempt.state.active, true, "late polling must not cancel the handoff");

  attempt.sessionEvent("FINISH", { wabaId: "111", phoneNumberId: "222" });
  attempt.sessionEvent("FINISH", { wabaId: "111", phoneNumberId: "222" });
  assert.equal(attempt.completions.length, 1);
});

test("session before code waits and then completes exactly once", async () => {
  const attempt = await createAttemptHarness();
  attempt.sessionEvent("FINISH", { wabaId: "111", phoneNumberId: "222" });
  assert.equal(attempt.completions.length, 0, "session alone must not call completion");
  attempt.loginCallback("short-code");
  attempt.loginCallback("short-code");
  assert.equal(attempt.completions.length, 1);
});

test("callback without code, Meta CANCEL, and Meta ERROR remain terminal", async () => {
  const noCode = await createAttemptHarness();
  noCode.loginCallback("");
  assert.equal(noCode.state.terminal, "cancelled");
  assert.equal(noCode.completions.length, 0);

  const cancelled = await createAttemptHarness();
  cancelled.sessionEvent("CANCEL");
  assert.equal(cancelled.state.terminal, "cancelled");
  assert.equal(cancelled.completions.length, 0);

  const failed = await createAttemptHarness();
  failed.sessionEvent("ERROR");
  assert.equal(failed.state.terminal, "error");
  assert.equal(failed.completions.length, 0);
});
