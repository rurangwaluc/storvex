import test from "node:test";
import assert from "node:assert/strict";

import {
  compareMarketplaceSeoAuditSnapshots,
  createMarketplaceSeoAuditSnapshot,
  marketplaceSeoPublicProductFields,
} from "../src/lib/seo/marketplaceSeoAuditComparison.js";

function result(key, overrides = {}) {
  const [storeSlug, productSlug] = key.split("/");
  return {
    key,
    storeSlug,
    productSlug,
    category: "ELECTRONICS",
    qualityLevel: "GOOD",
    candidate: false,
    alreadyApproved: false,
    publiclyAccessible: true,
    concerns: ["Add useful product details."],
    publicSeo: {
      title: "Useful product",
      description: "A useful public product description for customers.",
      price: 10000,
      availability: "in_stock",
      attributes: { color: "Black" },
      imageUrls: ["https://images.example/product.webp"],
    },
    ...overrides,
  };
}

function snapshot(results, overrides = {}) {
  return createMarketplaceSeoAuditSnapshot(
    { results, unknown: [], approvedProductIssues: [], ...overrides },
    {
      generatedAt: "2026-08-24T00:00:00.000Z",
      approvedCategorySlugs: new Set(["electronics"]),
    },
  );
}

test("detects new and removed public products", () => {
  const comparison = compareMarketplaceSeoAuditSnapshots(
    snapshot([result("store/removed")]),
    snapshot([result("store/new")]),
  );

  assert.deepEqual(comparison.newProducts, ["store/new"]);
  assert.deepEqual(comparison.removedProducts, ["store/removed"]);
});

test("detects new and lost candidates", () => {
  const comparison = compareMarketplaceSeoAuditSnapshots(
    snapshot([
      result("store/new-candidate"),
      result("store/lost-candidate", { candidate: true, qualityLevel: "STRONG" }),
    ]),
    snapshot([
      result("store/new-candidate", { candidate: true, qualityLevel: "STRONG" }),
      result("store/lost-candidate"),
    ]),
  );

  assert.deepEqual(comparison.newCandidates, ["store/new-candidate"]);
  assert.deepEqual(comparison.lostCandidates, ["store/lost-candidate"]);
});

test("detects quality and concern changes while preserving unchanged products", () => {
  const previous = snapshot([
    result("store/quality"),
    result("store/concern"),
    result("store/unchanged"),
  ]);
  const current = snapshot([
    result("store/quality", { qualityLevel: "STRONG", candidate: true }),
    result("store/concern", { concerns: ["Add a clearer description."] }),
    result("store/unchanged"),
  ]);
  const comparison = compareMarketplaceSeoAuditSnapshots(previous, current);

  assert.deepEqual(comparison.changedQuality, ["store/quality"]);
  assert.deepEqual(comparison.changedConcerns, ["store/concern"]);
  assert.deepEqual(comparison.unchangedProducts, ["store/unchanged"]);
});

test("HOLD title change triggers manual review", () => {
  const key = "prime-core-electronics/surface-laptop-732a67";
  const previous = snapshot([result(key)]);
  const current = snapshot([result(key, {
    publicSeo: { ...result(key).publicSeo, title: "Microsoft Surface Laptop 4" },
  })]);

  assert.deepEqual(
    compareMarketplaceSeoAuditSnapshots(previous, current).reviewAgain,
    [key],
  );
});

test("HOLD description change triggers manual review", () => {
  const key = "prime-core-electronics/surface-laptop-732a67";
  const previous = snapshot([result(key)]);
  const current = snapshot([result(key, {
    publicSeo: { ...result(key).publicSeo, description: "A newly improved public description." },
  })]);

  assert.deepEqual(compareMarketplaceSeoAuditSnapshots(previous, current).reviewAgain, [key]);
});

test("HOLD public attributes change triggers manual review", () => {
  const key = "prime-core-electronics/surface-laptop-732a67";
  const previous = snapshot([result(key)]);
  const current = snapshot([result(key, {
    publicSeo: { ...result(key).publicSeo, attributes: { color: "Silver", ram: "8GB" } },
  })]);

  assert.deepEqual(compareMarketplaceSeoAuditSnapshots(previous, current).reviewAgain, [key]);
});

test("HOLD image order or image change triggers manual review", () => {
  const key = "prime-core-electronics/surface-laptop-732a67";
  const images = [
    "https://images.example/primary.webp",
    "https://images.example/secondary.webp",
  ];
  const previous = snapshot([result(key, {
    publicSeo: { ...result(key).publicSeo, imageUrls: images },
  })]);
  const current = snapshot([result(key, {
    publicSeo: { ...result(key).publicSeo, imageUrls: [...images].reverse() },
  })]);

  assert.deepEqual(compareMarketplaceSeoAuditSnapshots(previous, current).reviewAgain, [key]);
});

test("HOLD price-only change is general history but not manual SEO review", () => {
  const key = "prime-core-electronics/surface-laptop-732a67";
  const previous = snapshot([result(key)]);
  const current = snapshot([result(key, {
    publicSeo: { ...result(key).publicSeo, price: 12000 },
  })]);
  const comparison = compareMarketplaceSeoAuditSnapshots(previous, current);

  assert.deepEqual(comparison.changedPublicContent, [key]);
  assert.deepEqual(comparison.reviewAgain, []);
});

test("HOLD availability-only change is general history but not manual SEO review", () => {
  const key = "prime-core-electronics/surface-laptop-732a67";
  const previous = snapshot([result(key)]);
  const current = snapshot([result(key, {
    publicSeo: { ...result(key).publicSeo, availability: "out_of_stock" },
  })]);
  const comparison = compareMarketplaceSeoAuditSnapshots(previous, current);

  assert.deepEqual(comparison.changedPublicContent, [key]);
  assert.deepEqual(comparison.reviewAgain, []);
});

test("detects category supply and indexing eligibility changes", () => {
  const previous = snapshot([]);
  const current = createMarketplaceSeoAuditSnapshot(
    { results: [result("hardware-store/hammer", { category: "HARDWARE" })] },
    {
      generatedAt: "2026-08-24T00:00:00.000Z",
      approvedCategorySlugs: new Set(["electronics", "hardware"]),
    },
  );
  const comparison = compareMarketplaceSeoAuditSnapshots(previous, current);

  assert.deepEqual(comparison.categorySupplyChanges, [{
    category: "HARDWARE",
    label: "Hardware",
    previous: 0,
    current: 1,
  }]);
  assert.equal(
    comparison.categoryIndexingChanges.some((item) => item.category === "HARDWARE"),
    true,
  );
  assert.deepEqual(comparison.categoryCandidateChanges, []);
});

test("flags approved product degradation without changing its approval state", () => {
  const key = "store/approved-product";
  const current = snapshot([result(key, {
    alreadyApproved: true,
    publiclyAccessible: false,
  })]);
  const comparison = compareMarketplaceSeoAuditSnapshots(snapshot([]), current);

  assert.equal(current.products[key].alreadyApproved, true);
  assert.deepEqual(comparison.approvedProductProblems, [{
    key,
    issue: "Exact public product route is unavailable.",
  }]);
});

test("approved product becoming unavailable remains an approved-product problem", () => {
  const key = "store/approved-product";
  const previous = snapshot([result(key, {
    alreadyApproved: true,
    qualityLevel: "STRONG",
    candidate: true,
  })]);
  const current = snapshot([result(key, {
    alreadyApproved: true,
    qualityLevel: "STRONG",
    candidate: false,
    publicSeo: { ...result(key).publicSeo, availability: "out_of_stock" },
  })]);
  const comparison = compareMarketplaceSeoAuditSnapshots(previous, current);

  assert.deepEqual(comparison.approvedProductProblems, [{
    key,
    issue: "Product is not currently available.",
  }]);
});

test("availability-driven candidacy loss remains visible", () => {
  const key = "store/candidate";
  const previous = snapshot([result(key, {
    candidate: true,
    qualityLevel: "STRONG",
  })]);
  const current = snapshot([result(key, {
    candidate: false,
    qualityLevel: "STRONG",
    publicSeo: { ...result(key).publicSeo, availability: "out_of_stock" },
  })]);

  assert.deepEqual(
    compareMarketplaceSeoAuditSnapshots(previous, current).lostCandidates,
    [key],
  );
});

test("public projection excludes private fields and does not mutate input", () => {
  const input = {
    tenantId: "private-tenant",
    product: {
      title: "Public title",
      description: "Public description",
      price: 100,
      availability: "in_stock",
      costPrice: 1,
      sku: "PRIVATE-SKU",
      attributes: {
        color: "Blue",
        internalNotes: "private",
        nested: { margin: 20, material: "Steel" },
      },
      images: [{ url: "https://images.example/public.webp", id: "private-id" }],
    },
  };
  const before = JSON.stringify(input);
  const projected = marketplaceSeoPublicProductFields(input);
  const serialized = JSON.stringify(projected);

  assert.equal(serialized.includes("private"), false);
  assert.equal(serialized.includes("PRIVATE-SKU"), false);
  assert.deepEqual(projected.attributes, {
    color: "Blue",
    nested: { material: "Steel" },
  });
  assert.equal(JSON.stringify(input), before);
});

test("snapshot and comparison output are deterministic", () => {
  const left = result("store/z-product", { concerns: ["B", "A", "B"] });
  const right = result("store/a-product");
  const first = snapshot([left, right]);
  const second = snapshot([right, left]);

  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(Object.keys(first.products), ["store/a-product", "store/z-product"]);
  assert.deepEqual(first.products["store/z-product"].concerns, ["A", "B"]);
});
