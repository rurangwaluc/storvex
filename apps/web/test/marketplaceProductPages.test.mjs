import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  MarketplaceServerApiError,
  getServerMarketplaceProduct,
} from "../src/lib/marketplaceServerApi.js";
import {
  isMarketplaceProductRoute,
} from "../src/lib/knownLegacyRoutes.js";
import {
  approvedMarketplaceCategorySlugs,
  isMarketplaceCategoryIndexable,
} from "../src/lib/seo/marketplaceSeoApprovals.js";
import {
  getMarketplaceCategoryPage,
} from "../src/lib/seo/marketplaceCategoryPages.js";

const storeSlug = "dunamis-electronics-ltd";
const productSlug = "iphone-11-pro-ae750b";

const publicProductData = {
  store: {
    slug: storeSlug,
    name: "DUNAMIS ELECTRONICS LTD",
    customerPhone: "+250700000000",
    whatsappPhone: "+250700000000",
    temporarilyClosed: false,
    pickupEnabled: true,
    deliveryEnabled: true,
  },
  product: {
    slug: productSlug,
    seller: {
      slug: storeSlug,
      name: "DUNAMIS ELECTRONICS LTD",
      temporarilyClosed: false,
    },
    title: "IPHONE 11 PRO",
    description: "Public product description",
    price: 370000,
    currency: "RWF",
    availability: "in_stock",
    image: {
      url: "https://images.example/product.webp",
      altText: "IPHONE 11 PRO",
    },
    images: [{
      url: "https://images.example/product.webp",
      altText: "IPHONE 11 PRO",
    }],
  },
};

function response({ status = 200, json = publicProductData } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
  };
}

async function withProductFetch(fetchImplementation, action) {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://public.example/api";
  globalThis.fetch = fetchImplementation;

  try {
    return await action();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl;
  }
}

test("classifies only genuine non-reserved product pairs as product routes", () => {
  assert.equal(
    isMarketplaceProductRoute(["marketplace", storeSlug, productSlug]),
    true,
  );

  for (const family of [
    "category",
    "categories",
    "stores",
    "orders",
    "account",
    "shop",
    "cart",
    "checkout",
    "offline",
  ]) {
    assert.equal(
      isMarketplaceProductRoute(["marketplace", family, "example"]),
      false,
      family,
    );
  }

  for (const segments of [
    ["marketplace"],
    ["marketplace", "store-only"],
    ["marketplace", "store", "product", "extra"],
  ]) {
    assert.equal(isMarketplaceProductRoute(segments), false);
  }
});

test("the explicit route delegates reserved families and 404s only confirmed absence", () => {
  const routeSource = readFileSync(
    new URL("../src/app/marketplace/[storeSlug]/[productSlug]/page.jsx", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /isMarketplaceProductRoute\(segments\)/);
  assert.match(routeSource, /return <LegacyClientApp \/>/);
  assert.match(routeSource, /await getServerMarketplaceProduct\(storeSlug, productSlug\)/);
  assert.match(routeSource, /if \(data === null\)/);
  assert.match(routeSource, /notFound\(\)/);
  assert.doesNotMatch(routeSource, /catch\s*\(/);
});

test("returns and seeds a valid public product response", async () => {
  let requestedUrl = "";
  const data = await withProductFetch(
    async (url) => {
      requestedUrl = String(url);
      return response();
    },
    () => getServerMarketplaceProduct(storeSlug, productSlug),
  );

  assert.deepEqual(data, publicProductData);
  assert.equal(
    requestedUrl,
    `https://public.example/api/marketplace/stores/${storeSlug}/products/${productSlug}`,
  );

  const bridgeSource = readFileSync(
    new URL("../src/components/marketplace/MarketplaceProductClient.jsx", import.meta.url),
    "utf8",
  );
  assert.match(bridgeSource, /createQueryClient\(\)/);
  assert.match(bridgeSource, /marketplaceQueryKeys\.product\(\{ storeSlug, productSlug \}\)/);
  assert.match(bridgeSource, /client\.setQueryData\(/);
});

test("returns null only for a confirmed product API 404", async () => {
  const data = await withProductFetch(
    async () => response({ status: 404 }),
    () => getServerMarketplaceProduct("example-store", "missing-product"),
  );

  assert.equal(data, null);
});

test("propagates timeout and network failures instead of returning not found", async () => {
  await withProductFetch(
    async () => {
      throw new DOMException("Timed out", "TimeoutError");
    },
    async () => {
      await assert.rejects(
        getServerMarketplaceProduct(storeSlug, productSlug),
        (error) => error instanceof MarketplaceServerApiError &&
          error.code === "MARKETPLACE_UPSTREAM_TIMEOUT" &&
          error.status === null,
      );
    },
  );

  await withProductFetch(
    async () => {
      throw new TypeError("network unavailable");
    },
    async () => {
      await assert.rejects(
        getServerMarketplaceProduct(storeSlug, productSlug),
        (error) => error instanceof MarketplaceServerApiError &&
          error.code === "MARKETPLACE_UPSTREAM_NETWORK_ERROR" &&
          error.status === null,
      );
    },
  );
});

test("propagates upstream 500, invalid JSON and malformed 200 responses", async () => {
  await withProductFetch(
    async () => response({ status: 500 }),
    async () => {
      await assert.rejects(
        getServerMarketplaceProduct(storeSlug, productSlug),
        (error) => error.code === "MARKETPLACE_UPSTREAM_HTTP_ERROR" && error.status === 500,
      );
    },
  );

  await withProductFetch(
    async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("invalid JSON");
      },
    }),
    async () => {
      await assert.rejects(
        getServerMarketplaceProduct(storeSlug, productSlug),
        (error) => error.code === "MARKETPLACE_UPSTREAM_INVALID_DATA" && error.status === null,
      );
    },
  );

  await withProductFetch(
    async () => response({ json: { product: { slug: productSlug } } }),
    async () => {
      await assert.rejects(
        getServerMarketplaceProduct(storeSlug, productSlug),
        (error) => error.code === "MARKETPLACE_UPSTREAM_INVALID_DATA" && error.status === null,
      );
    },
  );
});

test("rejects private fields before product data can be seeded", async () => {
  const privateFields = [
    "id",
    "tenantId",
    "qtyOnHand",
    "qtyReserved",
    "costPrice",
    "margin",
    "sku",
    "supplier",
    "staff",
    "branchInventory",
    "location",
    "address",
    "internalNotes",
  ];

  for (const field of privateFields) {
    await withProductFetch(
      async () => response({
        json: {
          ...publicProductData,
          product: { ...publicProductData.product, [field]: "private" },
        },
      }),
      async () => {
        await assert.rejects(
          getServerMarketplaceProduct(storeSlug, productSlug),
          (error) => error.code === "MARKETPLACE_UPSTREAM_INVALID_DATA",
          field,
        );
      },
    );
  }

  const serializedPublicData = JSON.stringify(publicProductData);
  for (const field of privateFields) {
    assert.equal(serializedPublicData.includes(`"${field}"`), false, field);
  }
});

test("keeps product noindex safety and Electronics category indexing", () => {
  const proxySource = readFileSync(new URL("../src/proxy.js", import.meta.url), "utf8");
  assert.match(proxySource, /isMarketplaceProductRoute\(segments\)/);
  assert.match(proxySource, /"X-Robots-Tag", "noindex, follow"/);

  assert.deepEqual([...approvedMarketplaceCategorySlugs], ["electronics"]);
  assert.equal(isMarketplaceCategoryIndexable({
    slug: "electronics",
    curated: getMarketplaceCategoryPage("electronics"),
    hasQueryVariant: false,
  }), true);
  assert.equal(isMarketplaceCategoryIndexable({
    slug: "electronics",
    curated: getMarketplaceCategoryPage("electronics"),
    hasQueryVariant: true,
  }), false);
});
