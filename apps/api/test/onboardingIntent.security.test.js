const assert = require("node:assert/strict");
const test = require("node:test");

const {
  assertOnboardingAccess,
  generateOnboardingAccess,
  hashOnboardingToken,
  maskEmail,
  maskPhone,
  safeHashesEqual,
} = require("../src/modules/auth/onboardingIntent.security");

function buildIntent(access, overrides = {}) {
  return {
    status: "PENDING",
    expiresAt: new Date(
      Date.now() + 60_000,
    ),
    onboardingTokenHash:
      access.tokenHash,
    onboardingTokenExpiresAt:
      access.expiresAt,
    onboardingTokenRevokedAt:
      null,
    ...overrides,
  };
}

function buildRequest(token) {
  return {
    headers: {
      "x-storvex-onboarding-token":
        token,
    },
  };
}

test(
  "creates a strong opaque onboarding token",
  () => {
    const access =
      generateOnboardingAccess();

    assert.equal(
      typeof access.token,
      "string",
    );

    assert.ok(
      access.token.length >= 40,
    );

    assert.equal(
      access.tokenHash,
      hashOnboardingToken(
        access.token,
      ),
    );

    assert.notEqual(
      access.token,
      access.tokenHash,
    );

    assert.ok(
      access.expiresAt >
        new Date(),
    );
  },
);

test(
  "hashes onboarding tokens deterministically",
  () => {
    const first =
      hashOnboardingToken(
        "secure-token",
      );

    const second =
      hashOnboardingToken(
        "secure-token",
      );

    assert.equal(first, second);
    assert.equal(first.length, 64);
  },
);

test(
  "compares equal hashes safely",
  () => {
    const hash =
      hashOnboardingToken(
        "secure-token",
      );

    assert.equal(
      safeHashesEqual(hash, hash),
      true,
    );

    assert.equal(
      safeHashesEqual(
        hash,
        hashOnboardingToken(
          "different-token",
        ),
      ),
      false,
    );
  },
);

test(
  "accepts the correct onboarding token",
  () => {
    const access =
      generateOnboardingAccess();

    assert.equal(
      assertOnboardingAccess(
        buildRequest(access.token),
        buildIntent(access),
      ),
      true,
    );
  },
);

test(
  "rejects an incorrect onboarding token",
  () => {
    const access =
      generateOnboardingAccess();

    assert.throws(
      () =>
        assertOnboardingAccess(
          buildRequest(
            "incorrect-token",
          ),
          buildIntent(access),
        ),
      (error) =>
        error.status === 401 &&
        error.reason ===
          "ONBOARDING_ACCESS_INVALID",
    );
  },
);

test(
  "rejects an expired onboarding session",
  () => {
    const access =
      generateOnboardingAccess();

    assert.throws(
      () =>
        assertOnboardingAccess(
          buildRequest(access.token),
          buildIntent(access, {
            onboardingTokenExpiresAt:
              new Date(
                Date.now() - 1_000,
              ),
          }),
        ),
      (error) =>
        error.status === 403 &&
        error.reason ===
          "ONBOARDING_EXPIRED",
    );
  },
);

test(
  "rejects a consumed onboarding session",
  () => {
    const access =
      generateOnboardingAccess();

    assert.throws(
      () =>
        assertOnboardingAccess(
          buildRequest(access.token),
          buildIntent(access, {
            status: "CONSUMED",
          }),
        ),
      (error) =>
        error.status === 403 &&
        error.reason ===
          "ONBOARDING_COMPLETED",
    );
  },
);

test(
  "masks owner email safely",
  () => {
    assert.equal(
      maskEmail(
        "ruraxis@gmail.com",
      ),
      "ru•••••@gmail.com",
    );
  },
);

test(
  "masks Rwanda phone safely",
  () => {
    assert.equal(
      maskPhone(
        "250783344482",
      ),
      "+250 783 ••• 482",
    );
  },
);
