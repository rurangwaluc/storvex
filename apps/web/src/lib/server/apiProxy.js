import crypto from "node:crypto";
import net from "node:net";

const PROXY_ASSERTION_VERSION = "v1";
const PROXY_SECRET_MIN_LENGTH = 32;
const MAX_IP_LENGTH = 64;
const MAX_TARGET_LENGTH = 8192;

const PROXY_IP_HEADER =
  "x-storvex-proxy-client-ip";

const PROXY_TIMESTAMP_HEADER =
  "x-storvex-proxy-timestamp";

const PROXY_SIGNATURE_HEADER =
  "x-storvex-proxy-signature";

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "authorization",
  "content-type",
  "x-branch-id",
  "x-storvex-onboarding-token",
];

const FORWARDED_RESPONSE_HEADERS = [
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "content-language",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
  "location",
  "retry-after",
];

function errorResponse(
  status,
  code,
  message,
) {
  return new Response(
    JSON.stringify({
      message,
      code,
    }),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "private, no-store",
      },
    },
  );
}

function normalizeClientIp(value) {
  let candidate =
    String(value || "").trim();

  if (
    !candidate ||
    candidate.includes(",") ||
    candidate.includes("\r") ||
    candidate.includes("\n")
  ) {
    return null;
  }

  if (
    candidate.startsWith(
      "::ffff:",
    )
  ) {
    candidate =
      candidate.slice(7);
  }

  if (
    candidate.length >
      MAX_IP_LENGTH ||
    !net.isIP(candidate)
  ) {
    return null;
  }

  return candidate;
}

function trustedVercelClientIp(
  request,
  env,
) {
  /*
   * x-forwarded-for is trusted here only
   * because this code runs inside Vercel.
   *
   * Never enable this same trust model on
   * an arbitrary server.
   */
  if (env.VERCEL !== "1") {
    return null;
  }

  return normalizeClientIp(
    request.headers.get(
      "x-forwarded-for",
    ),
  );
}

function configuredUpstreamOrigin(
  env,
  requestUrl,
) {
  const configured =
    String(
      env.STORVEX_API_ORIGIN ||
        "",
    ).trim();

  if (!configured) {
    return null;
  }

  let upstream;

  try {
    upstream =
      new URL(configured);
  } catch {
    return null;
  }

  if (
    upstream.protocol !== "https:" ||
    upstream.username ||
    upstream.password ||
    upstream.pathname !== "/" ||
    upstream.search ||
    upstream.hash
  ) {
    return null;
  }

  const currentOrigin =
    new URL(requestUrl).origin;

  if (
    upstream.origin ===
    currentOrigin
  ) {
    return null;
  }

  return upstream.origin;
}

function sharedSecret(env) {
  const secret =
    String(
      env.STORVEX_PROXY_SHARED_SECRET ||
        "",
    );

  if (
    secret.length <
    PROXY_SECRET_MIN_LENGTH
  ) {
    return null;
  }

  return secret;
}

function requestTarget(request) {
  const url =
    new URL(request.url);

  const target =
    `${url.pathname}${url.search}`;

  if (
    !url.pathname.startsWith(
      "/api",
    ) ||
    target.length >
      MAX_TARGET_LENGTH ||
    target.includes("\r") ||
    target.includes("\n")
  ) {
    return null;
  }

  return target;
}

function isBlockedPath(
  request,
) {
  const pathname =
    new URL(
      request.url,
    ).pathname;

  return (
    pathname ===
      "/api/whatsapp/webhook" ||
    pathname.startsWith(
      "/api/whatsapp/webhook/",
    )
  );
}

export function buildProxyAssertionPayload({
  timestamp,
  method,
  target,
  ip,
}) {
  return [
    PROXY_ASSERTION_VERSION,
    String(timestamp),
    String(
      method || "",
    ).toUpperCase(),
    target,
    ip,
  ].join("\n");
}

function signProxyAssertion({
  secret,
  timestamp,
  method,
  target,
  ip,
}) {
  return crypto
    .createHmac(
      "sha256",
      secret,
    )
    .update(
      buildProxyAssertionPayload({
        timestamp,
        method,
        target,
        ip,
      }),
    )
    .digest("hex");
}

function buildUpstreamHeaders(
  request,
  {
    clientIp,
    timestamp,
    signature,
  },
) {
  const headers =
    new Headers();

  for (
    const name of
    FORWARDED_REQUEST_HEADERS
  ) {
    const value =
      request.headers.get(name);

    if (value) {
      headers.set(
        name,
        value,
      );
    }
  }

  headers.set(
    PROXY_IP_HEADER,
    clientIp,
  );

  headers.set(
    PROXY_TIMESTAMP_HEADER,
    String(timestamp),
  );

  headers.set(
    PROXY_SIGNATURE_HEADER,
    signature,
  );

  return headers;
}

function buildResponseHeaders(
  upstreamResponse,
) {
  const headers =
    new Headers();

  for (
    const name of
    FORWARDED_RESPONSE_HEADERS
  ) {
    const value =
      upstreamResponse.headers.get(
        name,
      );

    if (value) {
      headers.set(
        name,
        value,
      );
    }
  }

  /*
   * Browser-facing API responses are never
   * cached at the BFF boundary.
   *
   * Some existing Storvex document routes
   * still carry access tokens in the query
   * string, so Authorization headers alone
   * cannot identify every sensitive response.
   */
  headers.set(
    "Cache-Control",
    "private, no-store",
  );

  return headers;
}

export async function proxyApiRequest(
  request,
  {
    env = process.env,
    nowMs = Date.now(),
    fetchImpl =
      globalThis.fetch,
  } = {},
) {
  if (
    typeof fetchImpl !==
    "function"
  ) {
    return errorResponse(
      503,
      "API_PROXY_UNAVAILABLE",
      "The service is temporarily unavailable.",
    );
  }

  if (isBlockedPath(request)) {
    return errorResponse(
      404,
      "NOT_FOUND",
      "Not found.",
    );
  }

  const upstreamOrigin =
    configuredUpstreamOrigin(
      env,
      request.url,
    );

  const secret =
    sharedSecret(env);

  const clientIp =
    trustedVercelClientIp(
      request,
      env,
    );

  const target =
    requestTarget(request);

  const method =
    String(
      request.method || "",
    )
      .trim()
      .toUpperCase();

  if (
    !upstreamOrigin ||
    !secret
  ) {
    return errorResponse(
      503,
      "API_PROXY_NOT_CONFIGURED",
      "The service is temporarily unavailable.",
    );
  }

  if (!clientIp) {
    return errorResponse(
      503,
      "API_PROXY_CLIENT_IP_UNAVAILABLE",
      "The service is temporarily unavailable.",
    );
  }

  if (
    !target ||
    !/^[A-Z]+$/.test(
      method,
    )
  ) {
    return errorResponse(
      400,
      "API_PROXY_REQUEST_INVALID",
      "The request could not be processed.",
    );
  }

  const timestamp =
    Math.floor(
      Number(nowMs) / 1000,
    );

  if (
    !Number.isSafeInteger(
      timestamp,
    )
  ) {
    return errorResponse(
      503,
      "API_PROXY_CLOCK_INVALID",
      "The service is temporarily unavailable.",
    );
  }

  const signature =
    signProxyAssertion({
      secret,
      timestamp,
      method,
      target,
      ip: clientIp,
    });

  const headers =
    buildUpstreamHeaders(
      request,
      {
        clientIp,
        timestamp,
        signature,
      },
    );

  const init = {
    method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };

  if (
    method !== "GET" &&
    method !== "HEAD" &&
    request.body
  ) {
    init.body =
      request.body;

    /*
     * Required by Node fetch when
     * forwarding a ReadableStream body.
     */
    init.duplex = "half";
  }

  let upstreamResponse;

  try {
    upstreamResponse =
      await fetchImpl(
        `${upstreamOrigin}${target}`,
        init,
      );
  } catch {
    return errorResponse(
      502,
      "API_UPSTREAM_UNAVAILABLE",
      "The service is temporarily unavailable.",
    );
  }

  return new Response(
    upstreamResponse.body,
    {
      status:
        upstreamResponse.status,
      statusText:
        upstreamResponse.statusText,
      headers:
        buildResponseHeaders(
          upstreamResponse,
        ),
    },
  );
}

export const proxyContract = Object.freeze({
  version:
    PROXY_ASSERTION_VERSION,
  clientIpHeader:
    PROXY_IP_HEADER,
  timestampHeader:
    PROXY_TIMESTAMP_HEADER,
  signatureHeader:
    PROXY_SIGNATURE_HEADER,
});
