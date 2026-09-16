const assert = require(
  "node:assert/strict",
);

const crypto = require(
  "node:crypto",
);

const test = require(
  "node:test",
);

const {
  getClientIp,
  verifyProxyClientIp,
  PROXY_ASSERTION_VERSION,
  PROXY_ASSERTION_MAX_AGE_SECONDS,
  PROXY_ASSERTION_MAX_FUTURE_SKEW_SECONDS,
} = require(
  "../src/lib/security/clientIp",
);

const SHARED_SECRET =
  "storvex-test-proxy-secret-0123456789abcdef";

const RAILWAY_ENV = {
  NODE_ENV: "production",
  RAILWAY_ENVIRONMENT:
    "production",
  STORVEX_PROXY_SHARED_SECRET:
    SHARED_SECRET,
};

const NOW_SECONDS =
  1_800_000_000;

const NOW_MS =
  NOW_SECONDS * 1000;

function signature({
  ip,
  timestamp,
  method,
  target,
  secret =
    SHARED_SECRET,
}) {
  const payload = [
    PROXY_ASSERTION_VERSION,
    String(timestamp),
    method.toUpperCase(),
    target,
    ip,
  ].join("\n");

  return crypto
    .createHmac(
      "sha256",
      secret,
    )
    .update(payload)
    .digest("hex");
}

function proxyRequest({
  ip =
    "198.51.100.24",
  timestamp =
    NOW_SECONDS,
  method =
    "POST",
  target =
    "/api/auth/login",
  railwayIp =
    "203.0.113.8",
  secret =
    SHARED_SECRET,
  includeIp = true,
  includeTimestamp = true,
  includeSignature = true,
} = {}) {
  const headers = {
    "x-real-ip":
      railwayIp,
  };

  if (includeIp) {
    headers[
      "x-storvex-proxy-client-ip"
    ] = ip;
  }

  if (includeTimestamp) {
    headers[
      "x-storvex-proxy-timestamp"
    ] = String(timestamp);
  }

  if (includeSignature) {
    headers[
      "x-storvex-proxy-signature"
    ] = signature({
      ip,
      timestamp,
      method,
      target,
      secret,
    });
  }

  return {
    method,
    originalUrl: target,
    headers,
    socket: {
      remoteAddress:
        "10.0.0.20",
    },
    ip: "10.0.0.20",
  };
}

test(
  "valid signed proxy assertion resolves the original client IP",
  () => {
    assert.equal(
      verifyProxyClientIp(
        proxyRequest(),
        RAILWAY_ENV,
        NOW_MS,
      ),
      "198.51.100.24",
    );
  },
);

test(
  "Railway getClientIp accepts a valid signed proxy assertion",
  () => {
    assert.equal(
      getClientIp(
        proxyRequest(),
        RAILWAY_ENV,
        NOW_MS,
      ),
      "198.51.100.24",
    );
  },
);

test(
  "signed proxy assertion binds client IP method and request target",
  () => {
    const base =
      proxyRequest();

    assert.equal(
      verifyProxyClientIp(
        {
          ...base,
          headers: {
            ...base.headers,
            "x-storvex-proxy-client-ip":
              "198.51.100.25",
          },
        },
        RAILWAY_ENV,
        NOW_MS,
      ),
      null,
    );

    assert.equal(
      verifyProxyClientIp(
        {
          ...base,
          method: "GET",
        },
        RAILWAY_ENV,
        NOW_MS,
      ),
      null,
    );

    assert.equal(
      verifyProxyClientIp(
        {
          ...base,
          originalUrl:
            "/api/auth/me",
        },
        RAILWAY_ENV,
        NOW_MS,
      ),
      null,
    );
  },
);

test(
  "expired and excessively future proxy assertions are rejected",
  () => {
    const expiredTimestamp =
      NOW_SECONDS -
      PROXY_ASSERTION_MAX_AGE_SECONDS -
      1;

    assert.equal(
      verifyProxyClientIp(
        proxyRequest({
          timestamp:
            expiredTimestamp,
        }),
        RAILWAY_ENV,
        NOW_MS,
      ),
      null,
    );

    const futureTimestamp =
      NOW_SECONDS +
      PROXY_ASSERTION_MAX_FUTURE_SKEW_SECONDS +
      1;

    assert.equal(
      verifyProxyClientIp(
        proxyRequest({
          timestamp:
            futureTimestamp,
        }),
        RAILWAY_ENV,
        NOW_MS,
      ),
      null,
    );
  },
);

test(
  "proxy assertion rejects malformed IP timestamp signature and duplicate-style values",
  () => {
    const malformedIp =
      proxyRequest();

    malformedIp.headers[
      "x-storvex-proxy-client-ip"
    ] =
      "198.51.100.24, 198.51.100.25";

    assert.equal(
      verifyProxyClientIp(
        malformedIp,
        RAILWAY_ENV,
        NOW_MS,
      ),
      null,
    );

    const malformedTimestamp =
      proxyRequest();

    malformedTimestamp.headers[
      "x-storvex-proxy-timestamp"
    ] = "not-a-time";

    assert.equal(
      verifyProxyClientIp(
        malformedTimestamp,
        RAILWAY_ENV,
        NOW_MS,
      ),
      null,
    );

    const malformedSignature =
      proxyRequest();

    malformedSignature.headers[
      "x-storvex-proxy-signature"
    ] = "not-a-signature";

    assert.equal(
      verifyProxyClientIp(
        malformedSignature,
        RAILWAY_ENV,
        NOW_MS,
      ),
      null,
    );
  },
);

test(
  "proxy assertion requires a strong configured shared secret",
  () => {
    const request =
      proxyRequest();

    assert.equal(
      verifyProxyClientIp(
        request,
        {
          ...RAILWAY_ENV,
          STORVEX_PROXY_SHARED_SECRET:
            "",
        },
        NOW_MS,
      ),
      null,
    );

    assert.equal(
      verifyProxyClientIp(
        request,
        {
          ...RAILWAY_ENV,
          STORVEX_PROXY_SHARED_SECRET:
            "too-short",
        },
        NOW_MS,
      ),
      null,
    );
  },
);

test(
  "Railway request with any incomplete proxy assertion fails closed",
  () => {
    const cases = [
      proxyRequest({
        includeIp: false,
      }),
      proxyRequest({
        includeTimestamp:
          false,
      }),
      proxyRequest({
        includeSignature:
          false,
      }),
    ];

    for (
      const request of cases
    ) {
      assert.equal(
        getClientIp(
          request,
          RAILWAY_ENV,
        ),
        null,
      );
    }
  },
);

test(
  "Railway request with an invalid complete proxy assertion never falls back to X-Real-IP",
  () => {
    const request =
      proxyRequest();

    request.headers[
      "x-storvex-proxy-signature"
    ] = "0".repeat(64);

    assert.equal(
      getClientIp(
        request,
        RAILWAY_ENV,
      ),
      null,
    );
  },
);

test(
  "Railway request without proxy assertion preserves canonical X-Real-IP behavior",
  () => {
    assert.equal(
      getClientIp(
        {
          headers: {
            "x-real-ip":
              "203.0.113.19",
            "x-forwarded-for":
              "198.51.100.99",
          },
          socket: {
            remoteAddress:
              "10.0.0.9",
          },
          ip: "10.0.0.9",
        },
        RAILWAY_ENV,
      ),
      "203.0.113.19",
    );
  },
);
