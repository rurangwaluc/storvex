import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  isKnownLegacyRoute,
  isMarketplaceProductRoute,
} from "../src/lib/knownLegacyRoutes.js";

function pathnameSegments(value) {
  return new URL(value, "https://www.storvex.rw").pathname
    .split("/")
    .filter(Boolean);
}

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

test("recognizes only the public Marketplace product route shape", () => {
  assert.equal(
    isMarketplaceProductRoute(["marketplace", "store-a", "product-a"]),
    true,
  );
  assert.equal(
    isMarketplaceProductRoute(
      pathnameSegments("/marketplace/store-a/product-a?ref=test"),
    ),
    true,
  );

  for (const route of [
    "/marketplace/category/electronics",
    "/marketplace/category/phones",
    "/marketplace/categories/electronics",
    "/marketplace/stores",
    "/marketplace/stores/store-a",
    "/marketplace/shop",
    "/marketplace/orders/example-token",
    "/marketplace/account/sign-in",
    "/marketplace/offline/example",
    "/marketplace/cart/example",
    "/marketplace/checkout/example",
  ]) {
    assert.equal(
      isMarketplaceProductRoute(pathnameSegments(route)),
      false,
      route,
    );
  }
});

test("rejects malformed Marketplace product paths", () => {
  for (const route of [
    "/marketplace",
    "/marketplace/store-a",
    "/marketplace/store-a/product-a/extra",
    "/other/store-a/product-a",
  ]) {
    assert.equal(
      isMarketplaceProductRoute(pathnameSegments(route)),
      false,
      route,
    );
  }
});

test("proxy applies the safe robots header to product routes", () => {
  const proxySource = readFileSync(
    new URL("../src/proxy.js", import.meta.url),
    "utf8",
  );

  assert.match(proxySource, /isMarketplaceProductRoute\(segments\)/);
  assert.match(
    proxySource,
    /response\.headers\.set\("X-Robots-Tag", "noindex, follow"\)/,
  );
});
