import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateMarketplaceProductSeoCandidate,
} from "../src/lib/seo/marketplaceProductSeoCandidate.js";
import {
  isMarketplaceProductIndexable,
} from "../src/lib/seo/marketplaceProductSeoApprovals.js";
import {
  approvedMarketplaceProductSitemapEntries,
} from "../src/app/sitemap.js";

function strongProduct(category, overrides = {}) {
  const fixtures = {
    electronics: {
      title: "Microsoft Surface Laptop 4",
      description: "Used like new with Intel Core i5, 8GB RAM, 256GB SSD and a 14 inch screen.",
      attributes: { model: "Surface Laptop 4", ram: "8GB", storage: "256GB", condition: "Used" },
    },
    hardware: {
      title: "Steel claw hammer 450g",
      description: "Steel claw hammer with a 450g head and non-slip handle for carpentry work.",
      attributes: { productType: "Claw hammer", size: "450g", material: "Steel", use: "Carpentry" },
    },
    "home-and-kitchen": {
      title: "Stainless steel cooking pot 5L",
      description: "Five litre stainless steel cooking pot with a fitted glass lid for everyday cooking.",
      attributes: { productType: "Cooking pot", material: "Stainless steel", capacity: "5L", size: "28cm" },
    },
    lighting: {
      title: "Solar flood light 100W",
      description: "Outdoor 100 watt solar flood light with battery power and bright 6000K light.",
      attributes: { lightType: "Flood light", wattage: "100W", powerSource: "Solar", colorTemperature: "6000K" },
    },
    "spare-parts": {
      title: "Toyota Corolla front brake pads",
      description: "Front brake pad set compatible with Toyota Corolla models from 2014 to 2018.",
      attributes: { partType: "Brake pads", compatibleMake: "Toyota", compatibleModel: "Corolla", partNumber: "04465", material: "Ceramic" },
    },
  };
  const fixture = fixtures[category];

  return {
    store: { slug: "example-store", name: "Example Store" },
    product: {
      slug: "example-product-a1b2c3",
      seller: { slug: "example-store", name: "Example Store" },
      price: 10000,
      availability: "in_stock",
      categoryBreadcrumbs: [{ slug: category, label: category }],
      images: [{ url: "https://images.example/product.webp" }],
      ...fixture,
      ...overrides,
    },
  };
}

for (const category of [
  "electronics",
  "hardware",
  "home-and-kitchen",
  "lighting",
  "spare-parts",
]) {
  test(`strong ${category} public listing is a candidate`, () => {
    const result = evaluateMarketplaceProductSeoCandidate(strongProduct(category));
    assert.equal(result.qualityLevel, "STRONG");
    assert.equal(result.candidate, true);
    assert.equal(
      result.category,
      category === "home-and-kitchen"
        ? "HOME_KITCHEN"
        : category.toUpperCase().replaceAll("-", "_"),
    );
  });
}

test("generic Electronics listing is not a candidate", () => {
  const result = evaluateMarketplaceProductSeoCandidate(strongProduct("electronics", {
    title: "Phone",
    description: "good product",
    attributes: {},
  }));
  assert.equal(result.candidate, false);
  assert.equal(result.qualityLevel, "NEEDS WORK");
});

for (const [name, overrides, concern] of [
  ["no approved public image", { images: [] }, "image"],
  ["thin description", { description: "Good product" }, "description"],
  ["invalid price", { price: 0 }, "price"],
]) {
  test(`${name} is not a candidate`, () => {
    const result = evaluateMarketplaceProductSeoCandidate(strongProduct("electronics", overrides));
    assert.equal(result.candidate, false);
    assert.equal(result.concerns.some((item) => item.toLowerCase().includes(concern)), true);
  });
}

test("malformed store/product key is not a candidate", () => {
  const data = strongProduct("electronics");
  data.store.slug = "bad/store";
  data.product.seller.slug = "bad/store";
  const result = evaluateMarketplaceProductSeoCandidate(data);
  assert.equal(result.key, null);
  assert.equal(result.candidate, false);
});

test("unknown category and mismatched public seller pair are not candidates", () => {
  const unknownCategory = strongProduct("electronics", {
    categoryBreadcrumbs: [{ slug: "unknown-category" }],
  });
  const mismatchedSeller = strongProduct("electronics");
  mismatchedSeller.product.seller.slug = "another-store";

  assert.equal(evaluateMarketplaceProductSeoCandidate(unknownCategory).candidate, false);
  assert.equal(evaluateMarketplaceProductSeoCandidate(mismatchedSeller).candidate, false);
});

test("already approved strong listing stays a candidate and is marked", () => {
  const result = evaluateMarketplaceProductSeoCandidate(strongProduct("electronics"), {
    approvedKeys: new Set(["example-store/example-product-a1b2c3"]),
  });
  assert.equal(result.candidate, true);
  assert.equal(result.alreadyApproved, true);
});

test("candidate status alone changes neither robots nor sitemap eligibility", async () => {
  const result = evaluateMarketplaceProductSeoCandidate(strongProduct("electronics"));
  assert.equal(result.candidate, true);
  assert.equal(isMarketplaceProductIndexable({
    storeSlug: result.storeSlug,
    productSlug: result.productSlug,
  }), false);
  assert.deepEqual(await approvedMarketplaceProductSitemapEntries(), []);
});

test("inaccessible and unavailable products are not candidates", () => {
  const inaccessible = evaluateMarketplaceProductSeoCandidate(strongProduct("electronics"), {
    publiclyAccessible: false,
  });
  const unavailable = evaluateMarketplaceProductSeoCandidate(strongProduct("electronics", {
    availability: "unavailable",
  }));
  assert.equal(inaccessible.candidate, false);
  assert.equal(unavailable.candidate, false);
});

test("ignores private properties, exposes none, and does not mutate input", () => {
  const input = strongProduct("electronics");
  input.tenantId = "private-tenant";
  input.product.costPrice = 1;
  input.product.qtyOnHand = 99;
  input.product.sku = "PRIVATE-SKU";
  const snapshot = JSON.stringify(input);
  const result = evaluateMarketplaceProductSeoCandidate(input);
  const serialized = JSON.stringify(result);

  assert.equal(result.candidate, true);
  assert.equal(serialized.includes("private-tenant"), false);
  assert.equal(serialized.includes("PRIVATE-SKU"), false);
  assert.equal(serialized.includes("qtyOnHand"), false);
  assert.equal(JSON.stringify(input), snapshot);
});
