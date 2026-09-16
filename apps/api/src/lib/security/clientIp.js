const crypto = require("node:crypto");
const net = require("node:net");

const MAX_IP_LENGTH = 64;

const PROXY_ASSERTION_VERSION = "v1";
const PROXY_ASSERTION_MAX_AGE_SECONDS = 120;
const PROXY_ASSERTION_MAX_FUTURE_SKEW_SECONDS = 10;
const PROXY_SHARED_SECRET_MIN_LENGTH = 32;

const PROXY_IP_HEADER =
  "x-storvex-proxy-client-ip";

const PROXY_TIMESTAMP_HEADER =
  "x-storvex-proxy-timestamp";

const PROXY_SIGNATURE_HEADER =
  "x-storvex-proxy-signature";

const PROXY_ASSERTION_HEADERS = [
  PROXY_IP_HEADER,
  PROXY_TIMESTAMP_HEADER,
  PROXY_SIGNATURE_HEADER,
];

function normalizeClientIp(value) {
  if (Array.isArray(value)) return null;

  let candidate = value;

  candidate = String(
    candidate || "",
  ).trim();

  if (
    !candidate ||
    candidate.includes(",")
  ) {
    return null;
  }

  if (
    candidate.startsWith("::ffff:")
  ) {
    candidate = candidate.slice(7);
  }

  if (
    candidate.length > MAX_IP_LENGTH ||
    !net.isIP(candidate)
  ) {
    return null;
  }

  return candidate;
}

function isRailwayProduction(
  env = process.env,
) {
  return (
    env.NODE_ENV === "production" &&
    Boolean(
      env.RAILWAY_ENVIRONMENT ||
        env.RAILWAY_PROJECT_ID ||
        env.RAILWAY_SERVICE_ID,
    )
  );
}

function hasOwnHeader(req, name) {
  return Boolean(
    req?.headers &&
      Object.prototype.hasOwnProperty.call(
        req.headers,
        name,
      ),
  );
}

function hasProxyAssertionHeaders(req) {
  return PROXY_ASSERTION_HEADERS.some(
    (name) => hasOwnHeader(req, name),
  );
}

function singleHeaderValue(
  req,
  name,
) {
  const value =
    req?.headers?.[name];

  if (
    value === undefined ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  if (
    !normalized ||
    normalized.includes(",") ||
    normalized.includes("\r") ||
    normalized.includes("\n")
  ) {
    return null;
  }

  return normalized;
}

function requestMethod(req) {
  const method =
    String(req?.method || "")
      .trim()
      .toUpperCase();

  if (
    !method ||
    !/^[A-Z]+$/.test(method)
  ) {
    return null;
  }

  return method;
}

function requestTarget(req) {
  const target =
    String(
      req?.originalUrl ||
        req?.url ||
        "",
    ).trim();

  if (
    !target ||
    !target.startsWith("/") ||
    target.length > 8192 ||
    target.includes("\r") ||
    target.includes("\n")
  ) {
    return null;
  }

  return target;
}

function proxySharedSecret(
  env = process.env,
) {
  const secret =
    String(
      env.STORVEX_PROXY_SHARED_SECRET ||
        "",
    );

  if (
    secret.length <
    PROXY_SHARED_SECRET_MIN_LENGTH
  ) {
    return null;
  }

  return secret;
}

function buildProxyAssertionPayload({
  timestamp,
  method,
  target,
  ip,
}) {
  return [
    PROXY_ASSERTION_VERSION,
    String(timestamp),
    method,
    target,
    ip,
  ].join("\n");
}

function secureHexEqual(
  expectedHex,
  suppliedHex,
) {
  if (
    !/^[a-f0-9]{64}$/i.test(
      suppliedHex || "",
    )
  ) {
    return false;
  }

  const expected =
    Buffer.from(
      expectedHex,
      "hex",
    );

  const supplied =
    Buffer.from(
      suppliedHex,
      "hex",
    );

  if (
    expected.length !==
    supplied.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expected,
    supplied,
  );
}

function verifyProxyClientIp(
  req,
  env = process.env,
  nowMs = Date.now(),
) {
  const secret =
    proxySharedSecret(env);

  if (!secret) {
    return null;
  }

  const ip =
    normalizeClientIp(
      singleHeaderValue(
        req,
        PROXY_IP_HEADER,
      ),
    );

  const rawTimestamp =
    singleHeaderValue(
      req,
      PROXY_TIMESTAMP_HEADER,
    );

  const suppliedSignature =
    singleHeaderValue(
      req,
      PROXY_SIGNATURE_HEADER,
    );

  if (
    !ip ||
    !rawTimestamp ||
    !suppliedSignature ||
    !/^\d{10}$/.test(
      rawTimestamp,
    )
  ) {
    return null;
  }

  const timestamp =
    Number(rawTimestamp);

  if (
    !Number.isSafeInteger(
      timestamp,
    )
  ) {
    return null;
  }

  const nowSeconds =
    Math.floor(
      Number(nowMs) / 1000,
    );

  if (
    !Number.isSafeInteger(
      nowSeconds,
    )
  ) {
    return null;
  }

  const ageSeconds =
    nowSeconds - timestamp;

  if (
    ageSeconds >
      PROXY_ASSERTION_MAX_AGE_SECONDS ||
    ageSeconds <
      -PROXY_ASSERTION_MAX_FUTURE_SKEW_SECONDS
  ) {
    return null;
  }

  const method =
    requestMethod(req);

  const target =
    requestTarget(req);

  if (
    !method ||
    !target
  ) {
    return null;
  }

  const payload =
    buildProxyAssertionPayload({
      timestamp:
        rawTimestamp,
      method,
      target,
      ip,
    });

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret,
      )
      .update(payload)
      .digest("hex");

  if (
    !secureHexEqual(
      expectedSignature,
      suppliedSignature,
    )
  ) {
    return null;
  }

  return ip;
}

function getClientIp(
  req,
  env = process.env,
  nowMs = Date.now(),
) {
  if (
    isRailwayProduction(env)
  ) {
    /*
     * A Storvex proxy assertion is optional.
     *
     * When any assertion header is present,
     * validation is fail-closed. We must not
     * silently fall back to Railway X-Real-IP
     * because that would collapse many proxied
     * users onto the proxy's egress IP.
     */
    if (
      hasProxyAssertionHeaders(
        req,
      )
    ) {
      return verifyProxyClientIp(
        req,
        env,
        nowMs,
      );
    }

    const railwayIp =
      normalizeClientIp(
        req?.headers?.[
          "x-real-ip"
        ],
      );

    return railwayIp || null;
  }

  return (
    normalizeClientIp(
      req?.socket
        ?.remoteAddress,
    ) ||
    normalizeClientIp(
      req?.ip,
    ) ||
    null
  );
}

module.exports = {
  MAX_IP_LENGTH,
  PROXY_ASSERTION_VERSION,
  PROXY_ASSERTION_MAX_AGE_SECONDS,
  PROXY_ASSERTION_MAX_FUTURE_SKEW_SECONDS,
  PROXY_IP_HEADER,
  PROXY_TIMESTAMP_HEADER,
  PROXY_SIGNATURE_HEADER,
  normalizeClientIp,
  isRailwayProduction,
  buildProxyAssertionPayload,
  verifyProxyClientIp,
  getClientIp,
};
