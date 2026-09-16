import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  createRequire,
} from "node:module";
import test from "node:test";

import {
  proxyApiRequest,
  proxyContract,
} from "../src/lib/server/apiProxy.js";

const require =
  createRequire(
    import.meta.url,
  );

const {
  verifyProxyClientIp,
} = require(
  "../../api/src/lib/security/clientIp.js",
);

const SECRET =
  "storvex-test-bff-secret-0123456789abcdef";

const NOW_SECONDS =
  1_800_000_000;

const NOW_MS =
  NOW_SECONDS * 1000;

const ENV = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "production",
  STORVEX_API_ORIGIN:
    "https://api.example.test",
  STORVEX_PROXY_SHARED_SECRET:
    SECRET,
};

function makeRequest(
  path,
  options = {},
) {
  return new Request(
    `https://www.storvex.rw${path}`,
    {
      ...options,
      headers: {
        "x-forwarded-for":
          "198.51.100.24",
        ...(options.headers ||
          {}),
      },
      ...(options.body
        ? {
            duplex: "half",
          }
        : {}),
    },
  );
}

test(
  "BFF strips spoofable proxy headers and produces an API-verifiable assertion",
  async () => {
    let captured = null;

    const response =
      await proxyApiRequest(
        makeRequest(
          "/api/auth/me?view=full",
          {
            headers: {
              Authorization:
                "Bearer tenant-token",
              "x-branch-id":
                "branch-1",
              Cookie:
                "should-not-forward=yes",
              "x-real-ip":
                "203.0.113.99",
              "x-storvex-proxy-client-ip":
                "192.0.2.99",
              "x-storvex-proxy-timestamp":
                "1234567890",
              "x-storvex-proxy-signature":
                "0".repeat(64),
            },
          },
        ),
        {
          env: ENV,
          nowMs: NOW_MS,
          fetchImpl:
            async (
              url,
              init,
            ) => {
              captured = {
                url:
                  String(url),
                method:
                  init.method,
                headers:
                  new Headers(
                    init.headers,
                  ),
              };

              return new Response(
                JSON.stringify({
                  ok: true,
                }),
                {
                  status: 200,
                  headers: {
                    "Content-Type":
                      "application/json",
                    "Cache-Control":
                      "public, max-age=300",
                    Server:
                      "should-not-forward",
                  },
                },
              );
            },
        },
      );

    assert.equal(
      response.status,
      200,
    );

    assert.equal(
      captured.url,
      "https://api.example.test/api/auth/me?view=full",
    );

    assert.equal(
      captured.method,
      "GET",
    );

    assert.equal(
      captured.headers.get(
        "authorization",
      ),
      "Bearer tenant-token",
    );

    assert.equal(
      captured.headers.get(
        "x-branch-id",
      ),
      "branch-1",
    );

    assert.equal(
      captured.headers.get(
        "cookie",
      ),
      null,
    );

    assert.equal(
      captured.headers.get(
        "x-real-ip",
      ),
      null,
    );

    assert.equal(
      captured.headers.get(
        "x-forwarded-for",
      ),
      null,
    );

    assert.equal(
      captured.headers.get(
        proxyContract.clientIpHeader,
      ),
      "198.51.100.24",
    );

    assert.equal(
      captured.headers.get(
        proxyContract.timestampHeader,
      ),
      String(
        NOW_SECONDS,
      ),
    );

    const apiHeaders =
      Object.fromEntries(
        captured.headers.entries(),
      );

    const verifiedIp =
      verifyProxyClientIp(
        {
          method: "GET",
          originalUrl:
            "/api/auth/me?view=full",
          headers:
            apiHeaders,
        },
        {
          STORVEX_PROXY_SHARED_SECRET:
            SECRET,
        },
        NOW_MS,
      );

    assert.equal(
      verifiedIp,
      "198.51.100.24",
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "private, no-store",
    );

    assert.equal(
      response.headers.get(
        "server",
      ),
      null,
    );
  },
);

test(
  "BFF streams request bodies and preserves content type",
  async () => {
    const body =
      JSON.stringify({
        email:
          "owner@example.com",
      });

    let capturedBody = "";
    let capturedHeaders;

    const response =
      await proxyApiRequest(
        makeRequest(
          "/api/auth/login",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body,
          },
        ),
        {
          env: ENV,
          nowMs: NOW_MS,
          fetchImpl:
            async (
              url,
              init,
            ) => {
              const forwarded =
                new Request(
                  url,
                  init,
                );

              capturedBody =
                await forwarded.text();

              capturedHeaders =
                forwarded.headers;

              return new Response(
                JSON.stringify({
                  ok: true,
                }),
                {
                  status: 200,
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                },
              );
            },
        },
      );

    assert.equal(
      response.status,
      200,
    );

    assert.equal(
      capturedBody,
      body,
    );

    assert.equal(
      capturedHeaders.get(
        "content-type",
      ),
      "application/json",
    );
  },
);

test(
  "BFF fails closed when configuration or trusted Vercel IP is unavailable",
  async () => {
    let fetchCalls = 0;

    const fetchImpl =
      async () => {
        fetchCalls += 1;

        return new Response(
          "{}",
        );
      };

    const missingSecret =
      await proxyApiRequest(
        makeRequest(
          "/api/auth/me",
        ),
        {
          env: {
            ...ENV,
            STORVEX_PROXY_SHARED_SECRET:
              "",
          },
          nowMs: NOW_MS,
          fetchImpl,
        },
      );

    assert.equal(
      missingSecret.status,
      503,
    );

    const notVercel =
      await proxyApiRequest(
        makeRequest(
          "/api/auth/me",
        ),
        {
          env: {
            ...ENV,
            VERCEL: "",
          },
          nowMs: NOW_MS,
          fetchImpl,
        },
      );

    assert.equal(
      notVercel.status,
      503,
    );

    const invalidIp =
      await proxyApiRequest(
        makeRequest(
          "/api/auth/me",
          {
            headers: {
              "x-forwarded-for":
                "198.51.100.24, 203.0.113.8",
            },
          },
        ),
        {
          env: ENV,
          nowMs: NOW_MS,
          fetchImpl,
        },
      );

    assert.equal(
      invalidIp.status,
      503,
    );

    assert.equal(
      fetchCalls,
      0,
    );
  },
);

test(
  "BFF refuses to proxy the WhatsApp webhook",
  async () => {
    let fetchCalls = 0;

    const response =
      await proxyApiRequest(
        makeRequest(
          "/api/whatsapp/webhook",
          {
            method: "POST",
            body: "{}",
          },
        ),
        {
          env: ENV,
          nowMs: NOW_MS,
          fetchImpl:
            async () => {
              fetchCalls += 1;

              return new Response(
                "{}",
              );
            },
        },
      );

    assert.equal(
      response.status,
      404,
    );

    assert.equal(
      fetchCalls,
      0,
    );
  },
);

test(
  "BFF rejects an upstream origin that points back to the web application",
  async () => {
    const response =
      await proxyApiRequest(
        makeRequest(
          "/api/auth/me",
        ),
        {
          env: {
            ...ENV,
            STORVEX_API_ORIGIN:
              "https://www.storvex.rw",
          },
          nowMs: NOW_MS,
          fetchImpl:
            async () => {
              throw new Error(
                "must not run",
              );
            },
        },
      );

    assert.equal(
      response.status,
      503,
    );
  },
);

test(
  "BFF signature uses the exact deployed v1 contract",
  () => {
    const payload = [
      "v1",
      String(
        NOW_SECONDS,
      ),
      "POST",
      "/api/auth/login",
      "198.51.100.24",
    ].join("\n");

    const expected =
      crypto
        .createHmac(
          "sha256",
          SECRET,
        )
        .update(payload)
        .digest("hex");

    assert.equal(
      expected.length,
      64,
    );

    assert.equal(
      proxyContract.version,
      "v1",
    );
  },
);

test(
  "BFF never caches public API responses at the browser boundary",
  async () => {
    const response =
      await proxyApiRequest(
        makeRequest(
          "/api/marketplace/catalogue",
        ),
        {
          env: ENV,
          nowMs: NOW_MS,
          fetchImpl:
            async () =>
              new Response(
                JSON.stringify({
                  categories: [],
                }),
                {
                  status: 200,
                  headers: {
                    "Content-Type":
                      "application/json",
                    "Cache-Control":
                      "public, max-age=600",
                    "Vercel-CDN-Cache-Control":
                      "public, s-maxage=3600",
                  },
                },
              ),
        },
      );

    assert.equal(
      response.status,
      200,
    );

    assert.equal(
      response.headers.get(
        "cache-control",
      ),
      "private, no-store",
    );

    assert.equal(
      response.headers.get(
        "vercel-cdn-cache-control",
      ),
      null,
    );
  },
);
