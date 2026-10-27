"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  verifiedEmailForOwnerIntent,
} = require("./ownerIntentAccountHandoff");

const verifiedAccount = {
  accountId: "account-1",
  email: "owner@example.com",
  emailVerified: true,
};

test("accepts the authenticated verified email", () => {
  assert.equal(
    verifiedEmailForOwnerIntent(
      verifiedAccount,
      "owner@example.com"
    ),
    true
  );
});

test("normalizes email case and whitespace", () => {
  assert.equal(
    verifiedEmailForOwnerIntent(
      verifiedAccount,
      " OWNER@EXAMPLE.COM "
    ),
    true
  );
});

test("rejects a different business owner email", () => {
  assert.throws(
    () => verifiedEmailForOwnerIntent(
      verifiedAccount,
      "another@example.com"
    ),
    { status: 403 }
  );
});

test("rejects an unverified account", () => {
  assert.throws(
    () => verifiedEmailForOwnerIntent(
      { ...verifiedAccount, emailVerified: false },
      "owner@example.com"
    ),
    { status: 401 }
  );
});

test("rejects missing account identity", () => {
  assert.throws(
    () => verifiedEmailForOwnerIntent(
      { email: "owner@example.com", emailVerified: true },
      "owner@example.com"
    ),
    { status: 401 }
  );
});

test("rejects a missing authenticated account", () => {
  assert.throws(
    () => verifiedEmailForOwnerIntent(
      null,
      "owner@example.com"
    ),
    { status: 401 }
  );
});
