const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isMarketplaceSlugUniqueConflict,
  resolveMarketplaceListingSlug,
} = require("../src/modules/inventory/inventory.controller");

const surfaceProduct = {
  id: "732a67aa-1111-2222-3333-444444444444",
  marketplaceTitle: "Surface laptop",
  marketplaceSlug: "surface-laptop-732a67",
};

test("preserves an existing Marketplace slug when the title changes", () => {
  assert.equal(
    resolveMarketplaceListingSlug({
      body: { marketplaceTitle: "Microsoft Surface Laptop 4" },
      product: surfaceProduct,
      title: "Microsoft Surface Laptop 4",
    }),
    "surface-laptop-732a67",
  );
});

test("preserves an existing slug for every implicit listing content edit", () => {
  for (const body of [
    { listingDescription: "Updated description" },
    { listingPrice: 525000 },
    { listingCategory: "electronics" },
    { listingAttributes: { model: "Surface Laptop 4" } },
    { listingTitle: "Microsoft Surface Laptop 4" },
  ]) {
    assert.equal(
      resolveMarketplaceListingSlug({
        body,
        product: surfaceProduct,
        title: body.listingTitle || surfaceProduct.marketplaceTitle,
      }),
      "surface-laptop-732a67",
    );
  }
});

test("generates a deterministic initial slug for a first-time listing", () => {
  assert.equal(
    resolveMarketplaceListingSlug({
      body: { listingTitle: "Microsoft Surface Laptop 4" },
      product: { ...surfaceProduct, marketplaceSlug: null },
      title: "Microsoft Surface Laptop 4",
    }),
    "microsoft-surface-laptop-4-732a67",
  );
});

test("preserves a draft slug when the listing is published or republished", () => {
  assert.equal(
    resolveMarketplaceListingSlug({
      body: { listingTitle: "Microsoft Surface Laptop 4" },
      product: {
        ...surfaceProduct,
        marketplaceTitle: "Microsoft Surface Laptop 4",
      },
      title: "Microsoft Surface Laptop 4",
    }),
    "surface-laptop-732a67",
  );
});

test("uses an explicit listingSlug as a public slug base", () => {
  assert.equal(
    resolveMarketplaceListingSlug({
      body: { listingSlug: "microsoft-surface-laptop-4" },
      product: surfaceProduct,
      title: "Microsoft Surface Laptop 4",
    }),
    "microsoft-surface-laptop-4-732a67",
  );
});

test("keeps legacy explicit slug field aliases compatible", () => {
  for (const field of ["marketplaceSlug", "slug"]) {
    assert.equal(
      resolveMarketplaceListingSlug({
        body: { [field]: "intentional-new-link" },
        product: surfaceProduct,
        title: surfaceProduct.marketplaceTitle,
      }),
      "intentional-new-link-732a67",
      field,
    );
  }
});

test("does not append the current product suffix twice", () => {
  assert.equal(
    resolveMarketplaceListingSlug({
      body: { listingSlug: "surface-laptop-732a67" },
      product: surfaceProduct,
      title: surfaceProduct.marketplaceTitle,
    }),
    "surface-laptop-732a67",
  );
});

test("does not strip a different product suffix", () => {
  assert.equal(
    resolveMarketplaceListingSlug({
      body: { listingSlug: "some-product-abcdef" },
      product: surfaceProduct,
      title: surfaceProduct.marketplaceTitle,
    }),
    "some-product-abcdef-732a67",
  );
});

test("preserves the HP EliteBook slug while cleaning its Unicode title", () => {
  assert.equal(
    resolveMarketplaceListingSlug({
      body: { listingTitle: "HP EliteBook 1030 G2" },
      product: {
        id: "fda9a0bb-1111-2222-3333-444444444444",
        marketplaceTitle: "HP E\u2060liteBo\u200cok 1030 G2",
        marketplaceSlug: "hp-e-litebo-ok-1030-g2-fda9a0",
      },
      title: "HP EliteBook 1030 G2",
    }),
    "hp-e-litebo-ok-1030-g2-fda9a0",
  );
});

test("rejects an explicit slug with no usable letters or numbers", () => {
  assert.throws(
    () => resolveMarketplaceListingSlug({
      body: { listingSlug: "---" },
      product: surfaceProduct,
      title: surfaceProduct.marketplaceTitle,
    }),
    (error) => error.code === "INVALID_MARKETPLACE_SLUG",
  );
});

test("rejects an explicitly empty listingSlug instead of preserving the stored slug", () => {
  assert.throws(
    () => resolveMarketplaceListingSlug({
      body: { listingSlug: "" },
      product: surfaceProduct,
      title: surfaceProduct.marketplaceTitle,
    }),
    (error) => error.code === "INVALID_MARKETPLACE_SLUG",
  );
});

test("rejects an explicitly null listingSlug instead of preserving the stored slug", () => {
  assert.throws(
    () => resolveMarketplaceListingSlug({
      body: { listingSlug: null },
      product: surfaceProduct,
      title: surfaceProduct.marketplaceTitle,
    }),
    (error) => error.code === "INVALID_MARKETPLACE_SLUG",
  );
});

test("recognizes the tenant-scoped Marketplace product slug P2002 target", () => {
  assert.equal(
    isMarketplaceSlugUniqueConflict({
      code: "P2002",
      meta: { target: ["tenantId", "marketplaceSlug"] },
    }),
    true,
  );

  assert.equal(
    isMarketplaceSlugUniqueConflict({
      code: "P2002",
      meta: { target: "Product_tenantId_marketplaceSlug_key" },
    }),
    true,
  );
});

test("does not classify an unrelated Product P2002 as a slug conflict", () => {
  for (const error of [
    { code: "P2002", meta: { target: ["id"] } },
    { code: "P2002", meta: { target: ["publicSlug"] } },
    { code: "P2002", meta: {} },
    { code: "P2025", meta: { target: ["tenantId", "marketplaceSlug"] } },
  ]) {
    assert.equal(isMarketplaceSlugUniqueConflict(error), false);
  }
});
