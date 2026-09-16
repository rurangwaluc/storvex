import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(
    new URL(
      `../${relativePath}`,
      import.meta.url,
    ),
    "utf8",
  );
}

test(
  "production browser API traffic is pinned to same-origin /api",
  () => {
    const apiClient = source(
      "src/services/apiClient.js",
    );

    assert.match(
      apiClient,
      /const DEFAULT_API_BASE_URL = "\/api"/,
    );

    assert.match(
      apiClient,
      /process\.env\.NODE_ENV === "development"/,
    );

    assert.match(
      apiClient,
      /\? process\.env\.NEXT_PUBLIC_API_BASE_URL/,
    );

    assert.match(
      apiClient,
      /developmentApiBaseUrl \|\| DEFAULT_API_BASE_URL/,
    );
  },
);

test(
  "Marketplace SSR uses only the server-side API origin",
  () => {
    const serverApi = source(
      "src/lib/marketplaceServerApi.js",
    );

    assert.match(
      serverApi,
      /process\.env\.STORVEX_API_ORIGIN/,
    );

    assert.doesNotMatch(
      serverApi,
      /NEXT_PUBLIC_API_BASE_URL/,
    );
  },
);

test(
  "production CSP no longer depends on the public API base",
  () => {
    const config = source(
      "next.config.mjs",
    );

    assert.doesNotMatch(
      config,
      /NEXT_PUBLIC_API_BASE_URL/,
    );
  },
);
