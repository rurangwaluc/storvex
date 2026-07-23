const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createResetToken,
  hashResetToken,
  isUsableResetRecord,
  normalizeEmail,
  passwordProblems,
  resetExpiry,
} = require(
  "../src/modules/marketplace/marketplace.customer.passwordReset.helpers",
);

test(
  "normalizes Marketplace reset emails",
  () => {
    assert.equal(
      normalizeEmail(
        "  CUSTOMER@Example.COM ",
      ),
      "customer@example.com",
    );
  },
);

test(
  "creates opaque password reset tokens",
  () => {
    const first =
      createResetToken();

    const second =
      createResetToken();

    assert.notEqual(
      first,
      second,
    );

    assert.ok(
      first.length >= 40,
    );

    assert.equal(
      first.includes("="),
      false,
    );
  },
);

test(
  "hashes reset tokens deterministically",
  () => {
    const first =
      hashResetToken(
        "reset-token",
      );

    const second =
      hashResetToken(
        "reset-token",
      );

    assert.equal(
      first,
      second,
    );

    assert.equal(
      first.length,
      64,
    );

    assert.notEqual(
      first,
      "reset-token",
    );
  },
);

test(
  "requires the Marketplace password policy",
  () => {
    assert.deepEqual(
      passwordProblems(
        "weak",
      ),
      [
        "Use at least 8 characters.",
        "Add an uppercase letter.",
        "Add a number.",
        "Add a symbol.",
      ],
    );

    assert.deepEqual(
      passwordProblems(
        "Strong#2026",
      ),
      [],
    );
  },
);

test(
  "sets reset expiry in the future",
  () => {
    const now =
      new Date(
        "2026-07-22T10:00:00.000Z",
      );

    const expiry =
      resetExpiry(now);

    assert.equal(
      expiry.toISOString(),
      "2026-07-22T10:20:00.000Z",
    );
  },
);

test(
  "accepts only unused unexpired reset records",
  () => {
    const now =
      new Date(
        "2026-07-22T10:00:00.000Z",
      );

    assert.equal(
      isUsableResetRecord(
        {
          usedAt: null,
          expiresAt:
            "2026-07-22T10:10:00.000Z",
        },
        now,
      ),
      true,
    );

    assert.equal(
      isUsableResetRecord(
        {
          usedAt:
            "2026-07-22T09:55:00.000Z",
          expiresAt:
            "2026-07-22T10:10:00.000Z",
        },
        now,
      ),
      false,
    );

    assert.equal(
      isUsableResetRecord(
        {
          usedAt: null,
          expiresAt:
            "2026-07-22T09:59:59.000Z",
        },
        now,
      ),
      false,
    );
  },
);
