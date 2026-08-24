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
import {
  marketplaceProductBreadcrumbJsonLd,
  marketplaceProductBreadcrumbs,
  marketplaceProductCanonical,
  marketplaceProductDescription,
  marketplaceProductJsonLd,
  marketplaceProductLeadImage,
  marketplaceProductSeo,
  serializeMarketplaceJsonLd,
} from "../src/lib/seo/marketplaceProductSeo.js";
import {
  approvedMarketplaceProductKeys,
  hasMarketplaceProductQueryVariant,
  isMarketplaceProductIndexable,
  isMarketplaceProductSeoApproved,
  marketplaceProductSeoKey,
  marketplaceProductSeoPair,
} from "../src/lib/seo/marketplaceProductSeoApprovals.js";
import sitemap, {
  approvedMarketplaceProductSitemapEntries,
} from "../src/app/sitemap.js";

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
    regularPrice: 370000,
    salePrice: null,
    onSale: false,
    currency: "RWF",
    availability: "in_stock",
    categoryBreadcrumbs: [
      { slug: "electronics", label: "Electronics" },
      { slug: "phones", label: "Phones" },
      { slug: "smartphones", label: "Smartphones" },
    ],
    attributes: {},
    image: {
      url: "https://images.example/product.webp",
      altText: "IPHONE 11 PRO",
      width: 1600,
      height: 1600,
    },
    images: [{
      url: "https://images.example/product.webp",
      altText: "IPHONE 11 PRO",
      isPrimary: true,
      width: 1600,
      height: 1600,
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
  assert.match(routeSource, /await getCachedServerMarketplaceProduct\(storeSlug, productSlug\)/);
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
  assert.match(bridgeSource, /<MarketplaceProductDetails \/>/);
  assert.match(bridgeSource, /<StaticRouter/);
  assert.doesNotMatch(bridgeSource, /LegacyClientApp/);
});

test("builds unique product metadata with a clean query-independent canonical", () => {
  const seo = marketplaceProductSeo(publicProductData, storeSlug, productSlug);

  assert.equal(
    seo.title,
    "IPHONE 11 PRO from DUNAMIS ELECTRONICS LTD | Storvex Marketplace",
  );
  assert.equal(seo.description, "Public product description");
  assert.equal(
    seo.canonical,
    "https://www.storvex.rw/marketplace/dunamis-electronics-ltd/iphone-11-pro-ae750b",
  );
  assert.equal(
    marketplaceProductCanonical(storeSlug, productSlug),
    marketplaceProductCanonical(storeSlug, productSlug, { anything: "ignored" }),
  );
  assert.deepEqual(seo.leadImage, {
    url: "https://images.example/product.webp",
    alt: "IPHONE 11 PRO",
    width: 1600,
    height: 1600,
  });

  const routeSource = readFileSync(
    new URL("../src/app/marketplace/[storeSlug]/[productSlug]/page.jsx", import.meta.url),
    "utf8",
  );
  assert.match(routeSource, /export async function generateMetadata/);
  assert.match(routeSource, /robots: \{ index: indexable, follow: true \}/);
  assert.match(routeSource, /type: "website"/);
  assert.match(routeSource, /siteName: "Storvex Marketplace"/);
  assert.match(routeSource, /card: "summary_large_image"/);
  assert.match(routeSource, /searchParams: await searchParams/);
});

test("normalizes strict exact seller/product approval keys", () => {
  assert.equal(marketplaceProductSeoKey("Store-One", "Product-One"), "store-one/product-one");
  assert.equal(marketplaceProductSeoKey(" store-one ", " product-one "), "store-one/product-one");
  assert.deepEqual(marketplaceProductSeoPair("store-one/product-one"), {
    storeSlug: "store-one",
    productSlug: "product-one",
    key: "store-one/product-one",
  });

  for (const [store, product] of [
    ["", "product-one"],
    ["store one", "product-one"],
    ["store/one", "product-one"],
    ["store-one", "product/one"],
    ["store-one?x=1", "product-one"],
    ["store-one", "product-one#fragment"],
    ["støre-one", "product-one"],
    ["store-one", ""],
  ]) {
    assert.equal(marketplaceProductSeoKey(store, product), null, `${store}/${product}`);
  }

  assert.equal(marketplaceProductSeoPair("product-one"), null);
  assert.equal(marketplaceProductSeoPair("store/one/product"), null);
  assert.equal(marketplaceProductSeoKey("123456", "987654"), "123456/987654");
});

test("keeps the production approval set empty and applies clean-query robots policy", () => {
  const isolatedApproval = new Set([`${storeSlug}/${productSlug}`]);

  assert.equal(approvedMarketplaceProductKeys.size, 0);
  assert.equal(isMarketplaceProductSeoApproved({ storeSlug, productSlug }), false);
  assert.equal(isMarketplaceProductIndexable({ storeSlug, productSlug }), false);
  assert.equal(isMarketplaceProductIndexable({
    storeSlug,
    productSlug,
    approvedKeys: isolatedApproval,
  }), true);

  for (const searchParams of [
    { utm_source: "" },
    { anything: "test" },
    new URLSearchParams("page=2"),
  ]) {
    assert.equal(hasMarketplaceProductQueryVariant(searchParams), true);
    assert.equal(isMarketplaceProductIndexable({
      storeSlug,
      productSlug,
      searchParams,
      approvedKeys: isolatedApproval,
    }), false);
  }

  assert.equal(isMarketplaceProductIndexable({
    storeSlug: "another-store",
    productSlug,
    approvedKeys: isolatedApproval,
  }), false);
});

test("proxy shares the product approval policy and preserves reserved routes", () => {
  const proxySource = readFileSync(new URL("../src/proxy.js", import.meta.url), "utf8");

  assert.match(proxySource, /isMarketplaceProductIndexable/);
  assert.match(proxySource, /searchParams: request\.nextUrl\.searchParams/);
  assert.match(proxySource, /isProductRoute && !productIndexable/);

  for (const family of ["category", "categories", "stores", "orders", "account", "shop"] ) {
    assert.equal(isMarketplaceProductRoute(["marketplace", family, "example"]), false);
  }
});

test("sitemap uses only validated approved exact pairs", async () => {
  const isolatedApproval = new Set([
    `${storeSlug}/${productSlug}`,
    `${storeSlug.toUpperCase()}/${productSlug.toUpperCase()}`,
    "missing-store/missing-product",
    "malformed/query?value",
  ]);
  const requested = [];
  const entries = await approvedMarketplaceProductSitemapEntries({
    approvedKeys: isolatedApproval,
    getProduct: async (candidateStore, candidateProduct) => {
      requested.push(`${candidateStore}/${candidateProduct}`);
      return candidateStore === storeSlug && candidateProduct === productSlug
        ? publicProductData
        : null;
    },
    lastModified: new Date("2026-08-24T00:00:00.000Z"),
  });

  assert.deepEqual(requested, [
    `${storeSlug}/${productSlug}`,
    "missing-store/missing-product",
  ]);
  assert.deepEqual(entries.map((entry) => entry.url), [
    `https://www.storvex.rw/marketplace/${storeSlug}/${productSlug}`,
  ]);
  assert.equal(entries.some((entry) => entry.url.includes("?")), false);
  assert.deepEqual(await approvedMarketplaceProductSitemapEntries(), []);
});

test("default sitemap keeps Electronics once and contains no Marketplace products", async () => {
  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);
  const electronicsUrl = "https://www.storvex.rw/marketplace/category/electronics";
  const marketplaceProductUrls = urls.filter((url) => (
    /^https:\/\/www\.storvex\.rw\/marketplace\/[^/]+\/[^/]+$/.test(url) &&
    !url.includes("/marketplace/category/")
  ));

  assert.equal(urls.filter((url) => url === electronicsUrl).length, 1);
  assert.deepEqual(
    urls.filter((url) => url.includes("/marketplace/category/")),
    [electronicsUrl],
  );
  assert.deepEqual(marketplaceProductUrls, []);
});

test("sitemap propagates temporary approved-product validation failures", async () => {
  await assert.rejects(
    approvedMarketplaceProductSitemapEntries({
      approvedKeys: new Set([`${storeSlug}/${productSlug}`]),
      getProduct: async () => {
        throw new MarketplaceServerApiError("upstream failed", { status: 500 });
      },
    }),
    (error) => error instanceof MarketplaceServerApiError && error.status === 500,
  );
});

test("normalizes and safely limits product descriptions", () => {
  assert.equal(
    marketplaceProductDescription(
      { title: "Phone", description: "  A useful\n product   description.  " },
      { name: "Store" },
    ),
    "A useful product description.",
  );
  assert.equal(
    marketplaceProductDescription({ title: "Phone", description: "" }, { name: "Store" }),
    "Phone is available from Store on Storvex Marketplace.",
  );
  assert.equal(
    marketplaceProductDescription(
      { title: "Phone", description: "word ".repeat(100) },
      { name: "Store" },
    ).length <= 160,
    true,
  );
});

test("uses only real breadcrumb links and keeps JSON-LD aligned", () => {
  const canonical = marketplaceProductCanonical(storeSlug, productSlug);
  const breadcrumbs = marketplaceProductBreadcrumbs({
    ...publicProductData,
    canonical,
  });

  assert.deepEqual(breadcrumbs, [
    { name: "Marketplace", url: "https://www.storvex.rw/marketplace" },
    { name: "Electronics", url: "https://www.storvex.rw/marketplace/category/electronics" },
    { name: "Phones" },
    { name: "Smartphones" },
    { name: "IPHONE 11 PRO", url: canonical },
  ]);
  assert.equal(breadcrumbs.some((item) => item.url?.includes("/category/phones")), false);
  assert.equal(breadcrumbs.some((item) => item.url?.includes("/category/smartphones")), false);

  const jsonLd = marketplaceProductBreadcrumbJsonLd(breadcrumbs);
  assert.deepEqual(
    jsonLd.itemListElement.map(({ position, name, item }) => ({ position, name, item })),
    breadcrumbs.map((item, index) => ({
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  );
});

test("falls back to the real public store breadcrumb when taxonomy is absent", () => {
  const product = { ...publicProductData.product, categoryBreadcrumbs: [] };
  const canonical = marketplaceProductCanonical(storeSlug, productSlug);
  assert.deepEqual(
    marketplaceProductBreadcrumbs({ product, store: publicProductData.store, canonical }),
    [
      { name: "Marketplace", url: "https://www.storvex.rw/marketplace" },
      {
        name: "DUNAMIS ELECTRONICS LTD",
        url: "https://www.storvex.rw/marketplace/stores/dunamis-electronics-ltd",
      },
      { name: "IPHONE 11 PRO", url: canonical },
    ],
  );
});

test("builds safe Product and Offer JSON-LD from the active public price", () => {
  const canonical = marketplaceProductCanonical(storeSlug, productSlug);
  const description = marketplaceProductDescription(
    publicProductData.product,
    publicProductData.store,
  );
  const data = marketplaceProductJsonLd({
    ...publicProductData,
    canonical,
    description,
  });

  assert.equal(data["@type"], "Product");
  assert.equal(data.name, "IPHONE 11 PRO");
  assert.equal(data.description, description);
  assert.deepEqual(data.image, ["https://images.example/product.webp"]);
  assert.equal(data.url, canonical);
  assert.equal(data.offers.price, 370000);
  assert.equal(data.offers.priceCurrency, "RWF");
  assert.equal(data.offers.availability, "https://schema.org/InStock");
  assert.deepEqual(data.offers.seller, {
    "@type": "Organization",
    name: "DUNAMIS ELECTRONICS LTD",
    url: "https://www.storvex.rw/marketplace/stores/dunamis-electronics-ltd",
  });

  for (const forbidden of ["aggregateRating", "review", "gtin", "mpn", "sku"]) {
    assert.equal(JSON.stringify(data).includes(`"${forbidden}"`), false, forbidden);
  }
});

test("uses sale price, maps OutOfStock and omits unsafe Offers", () => {
  const canonical = marketplaceProductCanonical(storeSlug, productSlug);
  const build = (product, store = publicProductData.store) => marketplaceProductJsonLd({
    product,
    store,
    canonical,
    description: "Description",
  });

  assert.equal(build({
    ...publicProductData.product,
    price: 320000,
    regularPrice: 370000,
    salePrice: 320000,
    onSale: true,
  }).offers.price, 320000);
  assert.equal(build({
    ...publicProductData.product,
    availability: "out_of_stock",
  }).offers.availability, "https://schema.org/OutOfStock");

  for (const product of [
    { ...publicProductData.product, availability: "unavailable" },
    { ...publicProductData.product, price: 0 },
    { ...publicProductData.product, price: null },
    { ...publicProductData.product, currency: "" },
  ]) {
    assert.equal("offers" in build(product), false);
  }
  assert.equal(
    "offers" in build(publicProductData.product, {
      ...publicProductData.store,
      temporarilyClosed: true,
    }),
    false,
  );
});

test("selects a deterministic public lead image and safely escapes JSON-LD", () => {
  const product = {
    ...publicProductData.product,
    title: "Unsafe </script> title",
    image: { url: "https://images.example/fallback.webp" },
    images: [
      { url: "https://images.example/first.webp" },
      { url: "https://images.example/primary.webp", isPrimary: true, altText: "Primary" },
    ],
  };

  assert.deepEqual(marketplaceProductLeadImage(product), {
    url: "https://images.example/primary.webp",
    alt: "Primary",
    width: undefined,
    height: undefined,
  });
  const serialized = serializeMarketplaceJsonLd({ name: product.title });
  assert.equal(serialized.includes("</script>"), false);
  assert.match(serialized, /\\u003c\/script>/);
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
