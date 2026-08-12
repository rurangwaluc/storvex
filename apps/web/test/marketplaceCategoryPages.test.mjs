import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getMarketplaceCategoryPage,
  marketplaceCategoryPages,
} from "../src/lib/seo/marketplaceCategoryPages.js";
import {
  approvedMarketplaceCategorySlugs,
  isMarketplaceCategorySeoApproved,
  isMarketplaceCategoryIndexable,
} from "../src/lib/seo/marketplaceSeoApprovals.js";
import {
  findMarketplaceCataloguePath,
  marketplaceFetch,
  validateMarketplaceCatalogue,
} from "../src/lib/marketplaceServerApi.js";
import {
  marketplaceCategoryProductParams,
  marketplaceCategoryQueryString,
  normalizeMarketplaceCategoryQuery,
} from "../src/lib/marketplaceCategoryQuery.js";
import { marketplaceQueryKeys } from "../src/lib/marketplaceQueryKeys.js";
import { createQueryClient } from "../src/lib/queryClient.js";

const expectedSlugs = [
  "electronics",
  "hardware",
  "home-and-kitchen",
  "lighting",
  "spare-parts",
];

test("defines exactly five complete Marketplace category SEO records", () => {
  assert.deepEqual(marketplaceCategoryPages.map((page) => page.slug), expectedSlugs);

  for (const field of ["title", "description", "h1", "introduction", "guidance", "canonical"]) {
    const values = marketplaceCategoryPages.map((page) => page[field]);
    assert.equal(values.every(Boolean), true, `${field} must be present`);
    assert.equal(new Set(values).size, 5, `${field} must be unique`);
  }

  for (const page of marketplaceCategoryPages) {
    assert.equal(page.groups.length >= 4, true);
    assert.equal(page.canonical, `https://www.storvex.rw/marketplace/category/${page.slug}`);
    assert.equal(getMarketplaceCategoryPage(page.slug), page);
  }
});

test("keeps every Marketplace category outside the SEO approval gate", () => {
  assert.equal(approvedMarketplaceCategorySlugs.size, 0);
  assert.equal(expectedSlugs.every((slug) => !isMarketplaceCategorySeoApproved(slug)), true);
  const sitemapSource = readFileSync(new URL("../src/app/sitemap.js", import.meta.url), "utf8");
  assert.match(sitemapSource, /approvedMarketplaceCategorySlugs\.has\(page\.slug\)/);
});

test("distinguishes top-level, subcategory, leaf and invalid catalogue slugs", () => {
  const catalogue = [{
    slug: "electronics",
    children: [{
      slug: "phones",
      children: [{ slug: "smartphones", children: [] }],
    }],
  }];

  assert.equal(findMarketplaceCataloguePath(catalogue, "electronics")?.category.slug, "electronics");
  assert.equal(findMarketplaceCataloguePath(catalogue, "phones")?.subcategory.slug, "phones");
  assert.equal(findMarketplaceCataloguePath(catalogue, "smartphones")?.leafCategory.slug, "smartphones");
  assert.equal(findMarketplaceCataloguePath(catalogue, "bad-slug"), null);
});

test("mobile and desktop category navigation use public slugs", () => {
  const headerSource = readFileSync(
    new URL("../src/legacy-pages/marketplace/MarketplaceHeader.jsx", import.meta.url),
    "utf8",
  );

  assert.equal((headerSource.match(/chooseCategory\(\s*category\.slug,?\s*\)/g) || []).length, 2);
  assert.doesNotMatch(headerSource, /chooseCategory\(\s*category\.value\s*\)/);
});

test("creates isolated QueryClient state for each category request", () => {
  const requestA = createQueryClient();
  const requestB = createQueryClient();
  const key = marketplaceQueryKeys.products({ category: "electronics" });

  requestA.setQueryData(key, { products: [{ slug: "request-a" }] });

  assert.notEqual(requestA, requestB);
  assert.equal(requestB.getQueryData(key), undefined);
  requestA.clear();
  requestB.clear();
});

test("normalizes clean and query-variant product keys consistently", () => {
  const path = {
    category: { slug: "electronics" },
    subcategory: null,
    leafCategory: null,
  };
  const cases = [
    [{}, ""],
    [{ search: "phone" }, "search=phone"],
    [{ sort: "price" }, "sort=price"],
    [{ page: "2" }, "page=2"],
    [{ search: "phone", fulfilment: "delivery", minPrice: "100", maxPrice: "500", onSale: "true", store: "demo", limit: "12", page: "2" }, "search=phone&fulfilment=delivery&minPrice=100&maxPrice=500&onSale=true&store=demo&limit=12&page=2"],
  ];

  for (const [source, expectedSearch] of cases) {
    const normalized = normalizeMarketplaceCategoryQuery(source);
    const serverParams = marketplaceCategoryProductParams(normalized, path);
    const routerParams = marketplaceCategoryProductParams(
      new URLSearchParams(marketplaceCategoryQueryString(normalized)),
      path,
    );

    assert.equal(marketplaceCategoryQueryString(normalized), expectedSearch);
    assert.deepEqual(
      marketplaceQueryKeys.products(serverParams),
      marketplaceQueryKeys.products(routerParams),
    );
  }
});

test("only a future-approved clean curated URL can be indexable", () => {
  const approvedSlugs = new Set(["electronics"]);
  const base = { slug: "electronics", curated: getMarketplaceCategoryPage("electronics"), approvedSlugs };

  assert.equal(isMarketplaceCategoryIndexable({ ...base, hasQueryVariant: false }), true);
  assert.equal(isMarketplaceCategoryIndexable({ ...base, hasQueryVariant: true }), false);
  assert.equal(isMarketplaceCategoryIndexable({ ...base, slug: "hardware", hasQueryVariant: false }), false);
});

test("catalogue upstream failures remain errors while a real unknown slug remains null", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://public.example";

  try {
    globalThis.fetch = async () => {
      throw new DOMException("Timed out", "TimeoutError");
    };
    await assert.rejects(
      marketplaceFetch("/marketplace/catalogue"),
      (error) => error.code === "MARKETPLACE_UPSTREAM_TIMEOUT",
    );

    globalThis.fetch = async () => ({ ok: false, status: 500 });
    await assert.rejects(
      marketplaceFetch("/marketplace/catalogue"),
      (error) => error.code === "MARKETPLACE_UPSTREAM_HTTP_ERROR" && error.status === 500,
    );

    assert.throws(
      () => validateMarketplaceCatalogue({ message: "not a catalogue" }),
      (error) => error.code === "MARKETPLACE_UPSTREAM_INVALID_DATA",
    );

    const validCatalogue = validateMarketplaceCatalogue({ categories: [{ slug: "electronics", children: [] }] });
    assert.equal(findMarketplaceCataloguePath(validCatalogue.categories, "bad-slug"), null);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = originalBaseUrl;
  }
});
