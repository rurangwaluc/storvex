import test from "node:test";
import assert from "node:assert/strict";

import { isKnownLegacyRoute } from "../src/lib/knownLegacyRoutes.js";

test("recognizes valid static and legacy route shapes", () => {
  assert.equal(isKnownLegacyRoute(["app"]), true);
  assert.equal(isKnownLegacyRoute(["login"]), true);
  assert.equal(
    isKnownLegacyRoute(["marketplace", "orders", "example-token"]),
    true,
  );
  assert.equal(
    isKnownLegacyRoute(["marketplace", "store", "product"]),
    true,
  );
});

test("rejects unknown static routes", () => {
  assert.equal(isKnownLegacyRoute(["does-not-exist"]), false);
  assert.equal(isKnownLegacyRoute(["pricing", "extra"]), false);
});
