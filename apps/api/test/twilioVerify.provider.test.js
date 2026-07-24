const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  __private,
} = require(
  "../src/modules/notifications/sms.provider",
);

test(
  "normalizes supported Rwanda phone numbers to E.164",
  () => {
    assert.equal(
      __private.normalizeRwToE164(
        "0788 123 456",
      ),
      "+250788123456",
    );

    assert.equal(
      __private.normalizeRwToE164(
        "250788123456",
      ),
      "+250788123456",
    );

    assert.equal(
      __private.normalizeRwToE164(
        "+250 788 123 456",
      ),
      "+250788123456",
    );
  },
);

test(
  "rejects unsupported phone formats",
  () => {
    assert.equal(
      __private.normalizeRwToE164(
        "12345",
      ),
      null,
    );

    assert.equal(
      __private.normalizeRwToE164(
        "",
      ),
      null,
    );

    assert.equal(
      __private.normalizeRwToE164(
        "+254712345678",
      ),
      null,
    );
  },
);

test(
  "maps a pending Twilio Verify send as accepted",
  () => {
    assert.deepEqual(
      __private.mapVerificationSendResult({
        sid:
          "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        status:
          "pending",
      }),
      {
        sent: true,
        provider:
          "TWILIO_VERIFY",
        messageId:
          "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        status:
          "pending",
        reason: null,
      },
    );
  },
);

test(
  "maps an approved Twilio Verify check as verified",
  () => {
    assert.deepEqual(
      __private.mapVerificationCheckResult({
        sid:
          "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        status:
          "approved",
      }),
      {
        verified: true,
        provider:
          "TWILIO_VERIFY",
        messageId:
          "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        status:
          "approved",
        reason: null,
      },
    );
  },
);

test(
  "does not approve a pending verification check",
  () => {
    assert.deepEqual(
      __private.mapVerificationCheckResult({
        sid:
          "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        status:
          "pending",
      }),
      {
        verified: false,
        provider:
          "TWILIO_VERIFY",
        messageId:
          "VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        status:
          "pending",
        reason:
          "TWILIO_VERIFY_CODE_NOT_APPROVED",
      },
    );
  },
);

test(
  "maps known Twilio Verify failures safely",
  () => {
    assert.equal(
      __private.twilioFailureReason(
        "TWILIO_VERIFY_CHECK",
        {
          code: 60202,
        },
      ),
      "TWILIO_VERIFY_CHECK_MAX_ATTEMPTS_REACHED",
    );

    assert.equal(
      __private.twilioFailureReason(
        "TWILIO_VERIFY_SEND",
        {
          code: 60203,
        },
      ),
      "TWILIO_VERIFY_SEND_MAX_SEND_ATTEMPTS_REACHED",
    );

    assert.equal(
      __private.twilioFailureReason(
        "TWILIO_VERIFY_SEND",
        {
          code: 99999,
        },
      ),
      "TWILIO_VERIFY_SEND_FAILED_99999",
    );
  },
);
